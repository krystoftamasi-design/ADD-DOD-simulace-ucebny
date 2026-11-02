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

    def test_position_loss_and_idle_connection(self):
        sensor = Sensor(None)
        sensor.accept({'type':'sample','x':25,'y':70,'z':10})
        self.assertEqual(sensor.snapshot()['position']['x'], 25)
        sensor.updated -= 2
        self.assertTrue(sensor.snapshot()['connected'])
        self.assertIsNone(sensor.snapshot()['position'])
        sensor.accept({'type':'sample','x':None,'y':None,'z':None})
        self.assertIsNone(sensor.snapshot()['position'])
        sensor.accept({'type':'sample','x':500,'y':70,'z':10})
        self.assertIsNone(sensor.snapshot()['position'])

    def test_only_touch_events_activate_listening(self):
        sensor = Sensor(None)
        for name in ['Swipe west → east', 'Kruh po směru hodin']:
            sensor.accept({'type':'event','name':name})
        self.assertEqual(sensor.snapshot()['touchId'], 0)
        for name in ['Dotyk střed', 'Tap jih', 'Dvojitý tap sever']:
            sensor.accept({'type':'event','name':name})
        self.assertEqual(sensor.snapshot()['touchId'], 3)
        self.assertGreater(sensor.snapshot()['touchAt'], 0)


if __name__ == '__main__':
    unittest.main()
