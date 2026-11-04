import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'firmware'))
from flick_protocol import decode_sensor


class FlickPacketTest(unittest.TestCase):
    def test_touch_only_packet_has_no_dsp_or_gesture_offsets(self):
        gesture, mask, position = decode_sensor(bytes([4, 1, 0, 0x81, 0x10, 0, 9, 0]))
        self.assertEqual(mask, 0x10)
        self.assertIsNone(position)
        self.assertEqual(gesture, 0)
        self.assertEqual(decode_sensor(bytes([4, 1, 0, 0x81, 0, 0, 0, 0]))[1], 0)

    def test_tap_does_not_imply_held_contact(self):
        mask = decode_sensor(bytes([4, 1, 0, 0x81, 0, 2, 0, 0]))[1]
        self.assertEqual(mask & 0x1F, 0)

    def test_xyz_without_touch_field_preserves_unknown_contact(self):
        _, mask, position = decode_sensor(bytes([16, 0, 0, 1, 0, 0, 0, 128, 255, 255]))
        self.assertIsNone(mask)
        self.assertEqual(position[0], 0)
        self.assertEqual(position[2], 100)
        with self.assertRaises(ValueError):
            decode_sensor(bytes([31, 0, 0, 1]))


class FirmwareHealthTest(unittest.TestCase):
    def test_idle_sensor_still_emits_heartbeats_and_feeds_watchdog(self):
        import json
        from types import SimpleNamespace
        from unittest.mock import patch
        class Finished(Exception):
            pass
        class Pin:
            OUT, IN, PULL_UP = 1, 2, 3
            def __init__(self, number, mode=None, value=1): self.level = value
            def value(self, value=None):
                if value is not None: self.level = value
                return self.level
        class I2C:
            def __init__(self, *args, **kwargs): pass
            def writeto(self, address, data): return len(data)
        feeds, messages = [], []
        class WDT:
            def __init__(self, timeout): self.timeout = timeout; feeds.append(timeout)
            def feed(self): feeds.append(True)
        clock = SimpleNamespace(ticks=0)
        def sleep(ms): clock.ticks += ms
        clock.sleep_ms = sleep
        clock.ticks_ms = lambda: clock.ticks
        clock.ticks_add = lambda a,b: a+b
        clock.ticks_diff = lambda a,b: a-b
        def emit(line):
            messages.append(json.loads(line))
            if sum(item['type']=='heartbeat' for item in messages) == 3: raise Finished()
        source = (Path(__file__).resolve().parents[1]/'firmware'/'flick-pico-main.py').read_text()
        with patch.dict(sys.modules, {'machine':SimpleNamespace(Pin=Pin,I2C=I2C,WDT=WDT),'time':clock,'ujson':json}):
            with self.assertRaises(Finished): exec(compile(source,'main.py','exec'),{'print':emit})
        self.assertEqual(feeds[0],8000)
        self.assertGreater(len(feeds),10)
        self.assertEqual([item['type'] for item in messages],['ready','heartbeat','heartbeat','heartbeat'])
