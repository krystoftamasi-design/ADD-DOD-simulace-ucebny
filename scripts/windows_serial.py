"""Native Windows USB serial reader; no third-party packages required."""
import ctypes
from ctypes import wintypes
import winreg


def usb_ports():
    ports = []
    try:
        with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"HARDWARE\DEVICEMAP\SERIALCOMM") as key:
            for index in range(winreg.QueryInfoKey(key)[1]):
                name, value, _ = winreg.EnumValue(key, index)
                if "USBSER" in name.upper():
                    ports.append(value)
    except OSError:
        pass
    return sorted(set(ports), key=lambda port: int(port[3:]))


class DCB(ctypes.Structure):
    _fields_ = [
        ("length", wintypes.DWORD), ("baud", wintypes.DWORD), ("flags", wintypes.DWORD),
        ("reserved", wintypes.WORD), ("xon_limit", wintypes.WORD), ("xoff_limit", wintypes.WORD),
        ("byte_size", wintypes.BYTE), ("parity", wintypes.BYTE), ("stop_bits", wintypes.BYTE),
        ("xon", ctypes.c_char), ("xoff", ctypes.c_char), ("error", ctypes.c_char),
        ("eof", ctypes.c_char), ("event", ctypes.c_char), ("reserved1", wintypes.WORD),
    ]


class Timeouts(ctypes.Structure):
    _fields_ = [(name, wintypes.DWORD) for name in
                ("interval", "read_multiplier", "read_constant", "write_multiplier", "write_constant")]


class SerialPort:
    def __init__(self, port):
        self.api = api = ctypes.WinDLL("kernel32", use_last_error=True)
        api.CreateFileW.restype = wintypes.HANDLE
        api.CreateFileW.argtypes = [wintypes.LPCWSTR, wintypes.DWORD, wintypes.DWORD,
                                   wintypes.LPVOID, wintypes.DWORD, wintypes.DWORD, wintypes.HANDLE]
        api.CloseHandle.argtypes = [wintypes.HANDLE]
        api.ReadFile.argtypes = [wintypes.HANDLE, wintypes.LPVOID, wintypes.DWORD,
                                ctypes.POINTER(wintypes.DWORD), wintypes.LPVOID]
        api.GetCommState.argtypes = api.SetCommState.argtypes = [wintypes.HANDLE, ctypes.POINTER(DCB)]
        api.SetCommTimeouts.argtypes = [wintypes.HANDLE, ctypes.POINTER(Timeouts)]
        self.handle = api.CreateFileW("\\\\.\\" + port, 0xC0000000, 0, None, 3, 0, None)
        if self.handle == ctypes.c_void_p(-1).value:
            self.handle = None
            raise ctypes.WinError(ctypes.get_last_error())
        try:
            settings = DCB()
            settings.length = ctypes.sizeof(DCB)
            if not api.GetCommState(self.handle, ctypes.byref(settings)):
                raise ctypes.WinError(ctypes.get_last_error())
            # Do not inherit handshaking or filtering from another serial monitor.
            # fBinary=1, DTR_CONTROL_ENABLE=1, RTS_CONTROL_ENABLE=1; 115200 8N1.
            settings.baud, settings.flags = 115200, 0x1011
            settings.byte_size, settings.parity, settings.stop_bits = 8, 0, 0
            settings.xon, settings.xoff = b"\x11", b"\x13"
            if not api.SetCommState(self.handle, ctypes.byref(settings)):
                raise ctypes.WinError(ctypes.get_last_error())
            # Return buffered bytes immediately, otherwise wait at most 250 ms.
            timeouts = Timeouts(0xFFFFFFFF, 0xFFFFFFFF, 250, 0, 1000)
            if not api.SetCommTimeouts(self.handle, ctypes.byref(timeouts)):
                raise ctypes.WinError(ctypes.get_last_error())
        except BaseException:
            self.close()
            raise

    def read(self):
        chunk = ctypes.create_string_buffer(8192)
        count = wintypes.DWORD()
        if not self.api.ReadFile(self.handle, chunk, len(chunk), ctypes.byref(count), None):
            raise ctypes.WinError(ctypes.get_last_error())
        return chunk.raw[:count.value]

    def close(self):
        if self.handle is not None:
            self.api.CloseHandle(self.handle)
            self.handle = None
