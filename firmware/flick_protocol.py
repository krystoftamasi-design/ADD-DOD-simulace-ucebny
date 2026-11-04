"""Decode the optional fields of an MGC3130 Sensor Data Output payload."""
def decode_sensor(payload):
    if len(payload) < 4:
        raise ValueError('Short sensor header')
    config = payload[0] | (payload[1] << 8)
    offset = 4
    gesture = 0
    touch_mask = None
    position = None
    for bit, size in ((1, 2), (2, 4), (4, 4), (8, 2), (16, 6)):
        if not config & bit:
            continue
        if len(payload) < offset + size:
            raise ValueError('Short sensor field')
        if bit == 2:
            gesture = payload[offset]
        elif bit == 4:
            touch_mask = payload[offset] | (payload[offset + 1] << 8)
        elif bit == 16 and payload[3] & 1:
            position = tuple((payload[offset + i] | (payload[offset + i + 1] << 8)) * 100 / 65535 for i in (0, 2, 4))
        offset += size
    return gesture, touch_mask, position
