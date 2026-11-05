import ctypes
import os
import unittest
from unittest.mock import MagicMock, patch

from flick_bridge import Sensor

if os.name == "nt":
    from ctypes import wintypes
    from windows_serial import DCB, SerialPort, Timeouts, usb_ports


@unittest.skipUnless(os.name == "nt", "Native Windows serial API")
class WindowsSerialTest(unittest.TestCase):
    def kernel(self):
        api = MagicMock()
        api.CreateFileW.return_value = 0x100000001
        for name in ("GetCommState", "SetCommState", "SetCommTimeouts", "ReadFile"):
            getattr(api, name).return_value = 1
        return api

    def test_configures_8n1_without_inherited_flow_control_and_keeps_64_bit_handle(self):
        api = self.kernel()
        configured = {}

        def settings(handle, pointer):
            value = ctypes.cast(pointer, ctypes.POINTER(DCB)).contents
            configured.update(handle=handle, size=value.length, baud=value.baud, flags=value.flags,
                              bits=value.byte_size, parity=value.parity, stop=value.stop_bits,
                              xon=value.xon, xoff=value.xoff)
            return 1

        def timeouts(handle, pointer):
            value = ctypes.cast(pointer, ctypes.POINTER(Timeouts)).contents
            configured.update(interval=value.interval, multiplier=value.read_multiplier,
                              timeout=value.read_constant)
            return 1

        api.SetCommState.side_effect = settings
        api.SetCommTimeouts.side_effect = timeouts
        with patch("windows_serial.ctypes.WinDLL", return_value=api):
            port = SerialPort("COM12")
            port.close()
            port.close()
        self.assertEqual(ctypes.sizeof(DCB), 28)
        self.assertEqual(configured, dict(handle=0x100000001, size=28, baud=115200, flags=0x1011,
                                         bits=8, parity=0, stop=0, xon=b"\x11", xoff=b"\x13", interval=0xFFFFFFFF,
                                         multiplier=0xFFFFFFFF, timeout=250))
        self.assertEqual(api.CreateFileW.call_args.args[0], r"\\.\COM12")
        api.CloseHandle.assert_called_once_with(0x100000001)

    def test_configuration_failure_closes_handle_and_preserves_windows_error(self):
        api = self.kernel()
        api.SetCommState.return_value = 0
        with patch("windows_serial.ctypes.WinDLL", return_value=api), \
                patch("windows_serial.ctypes.get_last_error", return_value=87):
            with self.assertRaises(OSError) as caught:
                SerialPort("COM7")
        self.assertEqual(caught.exception.winerror, 87)
        api.CloseHandle.assert_called_once()

    def test_busy_or_denied_port_reports_error_without_closing_invalid_handle(self):
        api = self.kernel()
        api.CreateFileW.return_value = ctypes.c_void_p(-1).value
        with patch("windows_serial.ctypes.WinDLL", return_value=api), \
                patch("windows_serial.ctypes.get_last_error", return_value=5):
            with self.assertRaises(OSError) as caught:
                SerialPort("COM7")
        self.assertEqual(caught.exception.winerror, 5)
        api.CloseHandle.assert_not_called()

    def test_read_returns_only_received_bytes_and_accepts_empty_timeout(self):
        api = self.kernel()

        def read(handle, buffer, size, count, overlapped):
            ctypes.memmove(buffer, b"hello", 5)
            ctypes.cast(count, ctypes.POINTER(wintypes.DWORD)).contents.value = 5
            return 1

        with patch("windows_serial.ctypes.WinDLL", return_value=api):
            port = SerialPort("COM7")
            api.ReadFile.side_effect = read
            self.assertEqual(port.read(), b"hello")
            api.ReadFile.side_effect = None
            self.assertEqual(port.read(), b"")
            port.close()

    def test_detection_ignores_bluetooth_ports(self):
        values = [(r"\Device\BthModem0", "COM6", 1),
                  (r"\Device\USBSER000", "COM12", 1),
                  (r"\Device\USBSER001", "COM7", 1)]
        with patch("windows_serial.winreg.OpenKey"), \
                patch("windows_serial.winreg.QueryInfoKey", return_value=(0, len(values), 0)), \
                patch("windows_serial.winreg.EnumValue", side_effect=lambda key, i: values[i]):
            self.assertEqual(usb_ports(), ["COM7", "COM12"])

    def test_bridge_exposes_open_error_then_recovers_on_next_attempt(self):
        sensor = Sensor(None)
        serial = MagicMock()

        def open_port(path):
            if not sensor.transport["error"]:
                raise PermissionError("Access denied")
            self.assertIn("COM7", sensor.snapshot()["error"])
            return serial

        def read():
            sensor.stop.set()
            return b'{"type":"sample","x":25,"y":70,"z":10,"touching":true}\n'

        serial.read.side_effect = read
        # Retry immediately in this test instead of waiting a real second.
        with patch("windows_serial.usb_ports", return_value=["COM7"]), \
                patch("windows_serial.SerialPort", side_effect=open_port), \
                patch.object(sensor.stop, "wait", return_value=False):
            sensor.run_windows()
        self.assertEqual(sensor.state["samples"], 1)
        self.assertEqual(sensor.state["touchId"], 1)
        self.assertIsNone(sensor.transport["error"])
        self.assertGreater(sensor.transport["receivedBytes"], 0)
        serial.close.assert_called_once()
        self.assertFalse(sensor.snapshot()["connected"])


if __name__ == "__main__":
    unittest.main()
