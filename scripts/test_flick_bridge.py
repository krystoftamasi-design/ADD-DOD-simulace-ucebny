import unittest
from flick_bridge import Sensor, messages


class FlickProtocolTest(unittest.TestCase):
    def test_recovers_truncated_and_concatenated_usb_json(self):
        items, pending = messages('noise {"type":"sample","x": {"type":"sample","x":25,"y":70,"z":10}{"type":"event","name":"Dotyk střed"}\n')
        self.assertEqual([item['type'] for item in items], ['sample', 'event'])
        self.assertEqual(items[0]['x'], 25)
        self.assertFalse(pending.strip())

    def test_waits_for_remaining_bytes(self):
        items, pending = messages('{"type":"sample","x":')
        self.assertEqual(items, [])
        items, pending = messages(pending + '25,"y":70,"z":10}')
        self.assertEqual(items[0]['z'], 10)

    def test_unchanged_coordinates_remain_valid_until_explicit_absence(self):
        sensor = Sensor(None)
        sensor.accept({'type':'sample','x':25,'y':70,'z':10})
        self.assertEqual(sensor.snapshot()['position']['x'], 25)
        sensor.updated -= 2
        self.assertTrue(sensor.snapshot()['connected'])
        self.assertEqual(sensor.snapshot()['position']['x'], 25)
        sensor.accept({'type':'sample','x':None,'y':None,'z':None})
        self.assertIsNone(sensor.snapshot()['position'])
        sensor.accept({'type':'sample','x':25,'y':70,'z':10})
        sensor.accept({'type':'sample','x':500,'y':70,'z':10})
        self.assertEqual(sensor.snapshot()['position']['x'], 25)
        sensor.publish(connected=False, position=None)
        self.assertIsNone(sensor.snapshot()['position'])

    def test_stale_usb_data_is_not_reported_as_connected(self):
        sensor = Sensor(None)
        sensor.accept({'type':'sample','x':25,'y':70,'z':10,'touching':True})
        sensor.updated -= 4
        self.assertFalse(sensor.snapshot()['connected'])
        self.assertIsNone(sensor.snapshot()['position'])
        self.assertFalse(sensor.snapshot()['touching'])

    def test_heartbeat_preserves_stationary_position_without_creating_a_touch(self):
        sensor = Sensor(None)
        sensor.accept({'type':'sample','x':25,'y':70,'z':10,'touching':False})
        sensor.updated -= 4
        sensor.accept({'type':'heartbeat'})
        state = sensor.snapshot()
        self.assertTrue(state['connected'])
        self.assertEqual(state['position']['x'],25)
        self.assertEqual(state['touchId'],0)

    def test_only_touch_events_activate_listening(self):
        sensor = Sensor(None)
        for name in ['Swipe west → east', 'Kruh po směru hodin']:
            sensor.accept({'type':'event','name':name})
        self.assertEqual(sensor.snapshot()['touchId'], 0)
        for name in ['Dotyk střed', 'Tap jih', 'Dvojitý tap sever']:
            sensor.accept({'type':'event','name':name})
        self.assertEqual(sensor.snapshot()['touchId'], 1)
        self.assertGreater(sensor.snapshot()['touchAt'], 0)

    def test_hardware_contact_survives_missing_xyz_and_tap_does_not_retrigger(self):
        sensor = Sensor(None)
        sensor.accept({'type':'contact','pressed':False})
        sensor.accept({'type':'contact','pressed':True})
        touch = sensor.snapshot()['touchId']
        sensor.accept({'type':'sample','x':None,'y':None,'z':None,'touching':True})
        sensor.accept({'type':'event','name':'Tap střed'})
        self.assertTrue(sensor.snapshot()['touching'])
        self.assertEqual(sensor.snapshot()['touchId'], touch)
        sensor.accept({'type':'contact','pressed':False})
        self.assertFalse(sensor.snapshot()['touching'])
        self.assertEqual(sensor.snapshot()['touchId'], touch)
        sensor.accept({'type':'contact','pressed':True})
        self.assertEqual(sensor.snapshot()['touchId'], touch + 1)


if __name__ == '__main__':
    unittest.main()
