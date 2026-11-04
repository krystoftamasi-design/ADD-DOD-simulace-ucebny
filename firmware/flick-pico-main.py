from machine import Pin, I2C, WDT
import time
import ujson
from flick_protocol import decode_sensor

# Recover even if an I2C operation or USB write stops returning.
watchdog = WDT(timeout=8000)

ADDRESS = 0x42
reset = Pin(17, Pin.OUT, value=1)
ts = Pin(16, Pin.IN, Pin.PULL_UP)
i2c = I2C(0, sda=Pin(0), scl=Pin(1), freq=100000)

def emit(message):
    print(ujson.dumps(message))

# Reset MGC3130 and allow its GestIC library to start.
reset.value(0)
time.sleep_ms(40)
reset.value(1)
time.sleep_ms(220)

def read_message(count, timeout_ms=30):
    deadline = time.ticks_add(time.ticks_ms(), timeout_ms)
    while ts.value() and time.ticks_diff(deadline, time.ticks_ms()) > 0:
        time.sleep_ms(1)
    if ts.value():
        return None
    # Hold TS low while the host reads, then release it.
    ts.init(Pin.OUT, value=0)
    try:
        return i2c.readfrom(ADDRESS, count)
    finally:
        ts.init(Pin.IN, Pin.PULL_UP)

firmware = read_message(132, 1500)
firmware_valid = bool(firmware and firmware[3] == 0x83 and firmware[4] == 0xAA)

i2c.writeto(ADDRESS, bytes([0x10, 0, 0, 0xA2, 0xA1, 0, 0, 0, 0x1F, 0, 0, 0, 0xFF, 0xFF, 0xFF, 0xFF]))
time.sleep_ms(100)
i2c.writeto(ADDRESS, bytes([0x10, 0, 0, 0xA2, 0x80, 0, 0, 0, 0x3F, 0, 0, 0, 0x3F, 0, 0, 0]))
emit({"type": "ready", "gestic": firmware_valid, "watchdogMs": 8000})

gesture_names = {
    1: "Swipe west → east",
    2: "Swipe east → west",
    3: "Swipe south → north",
    4: "Swipe north → south",
    5: "Kruh po směru hodin",
    6: "Kruh proti směru hodin",
}
touch_names = ["Dotyk jih", "Dotyk západ", "Dotyk sever", "Dotyk východ", "Dotyk střed",
               "Tap jih", "Tap západ", "Tap sever", "Tap východ", "Tap střed",
               "Dvojitý tap jih", "Dvojitý tap západ", "Dvojitý tap sever", "Dvojitý tap východ", "Dvojitý tap střed"]
last_gesture = 0
last_touch = 0
last_contact = None
last_sample = time.ticks_ms()
last_heartbeat = last_sample

while True:
    watchdog.feed()
    now = time.ticks_ms()
    if time.ticks_diff(now, last_heartbeat) >= 1000:
        emit({"type": "heartbeat"})
        last_heartbeat = now
    message = read_message(26, 20)
    if message is None or message[0] == 0 or message[3] != 0x91:
        continue
    try:
        gesture_id, touch_mask, position = decode_sensor(message[4:message[0]])
    except ValueError:
        continue
    if touch_mask is not None:
        contact = touch_mask & 0x1F
        if contact != last_contact:
            emit({"type": "contact", "pressed": bool(contact), "electrodes": contact})
        last_contact = contact

    if gesture_id and gesture_id != last_gesture and gesture_id in gesture_names:
        emit({"type": "event", "name": gesture_names[gesture_id]})
    if touch_mask is not None and touch_mask != last_touch and touch_mask:
        for bit, name in enumerate(touch_names):
            if touch_mask & (1 << bit):
                emit({"type": "event", "name": name})
                break
    last_gesture = gesture_id
    if touch_mask is not None:
        last_touch = touch_mask

    now = time.ticks_ms()
    if time.ticks_diff(now, last_sample) >= 100:
        if position is not None:
            x, y, z = position
        else:
            x = y = z = None
        emit({"type": "sample", "x": x, "y": y, "z": z,
              "touching": None if last_contact is None else bool(last_contact)})
        last_sample = now
