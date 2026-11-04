#!/usr/bin/env python3
"""Read the existing Pico JSON stream and serve it to the classroom simulator."""
import argparse
import array
import fcntl
import glob
import json
import os
from pathlib import Path
import select
import signal
import termios
import threading
import time
from collections import deque
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit

ORIGINS = {"https://ucebna-dod-simulator.noobest.chatgpt.site"}
SOURCE_ROOT = Path(__file__).resolve().parents[1]
ANIMATION_ASSETS = {
    **{f"/room/{name}": SOURCE_ROOT / "classroom" / name for name in
       ("mascot.js", "guide-renderer.js", "live-edit.js", "timeline.js")},
    **{f"/room/{name}": SOURCE_ROOT / "mascot" / name for name in
       ("mascot-canvas.js", "procedural-body.js", "cursor-follow.js", "spawn-model.js",
        "spawn-renderer.js", "bubble-flight.js", "reset-model.js", "work-presentation.js", "mascot.json", "native-body.json")},
    **{f"/room/fonts/PPNeueMachina-Plain{weight}.otf": SOURCE_ROOT / "pruvodce" / "fonts" / f"PPNeueMachina-Plain{weight}.otf"
       for weight in ("Regular", "Ultrabold")},
}


def messages(buffer):
    """Recover complete JSON objects even after a truncated USB write."""
    decoder = json.JSONDecoder()
    result = []
    while "{" in buffer:
        buffer = buffer[buffer.index("{"):]
        try:
            value, end = decoder.raw_decode(buffer)
        except ValueError:
            nested = buffer.find("{", 1)
            if nested >= 0:
                buffer = buffer[nested:]
                continue
            break
        if isinstance(value, dict):
            result.append(value)
        buffer = buffer[end:]
    return result, buffer[-8192:]


class Sensor:
    def __init__(self, port):
        self.port = port
        self.stop = threading.Event()
        self.lock = threading.Lock()
        self.state = {"connected": False, "position": None, "touching": None, "touchId": 0, "touchAt": 0, "samples": 0}
        self.updated = 0
        self.trace = deque(maxlen=256)
        self.events = deque(maxlen=32)

    def publish(self, **values):
        with self.lock:
            self.state.update(values)

    def snapshot(self):
        with self.lock:
            # Unchanged coordinates need not produce a new USB sample.
            # Only an explicit absence sample or disconnect clears contact.
            state = dict(self.state)
            if self.updated and time.monotonic() - self.updated > 3:
                state.update(connected=False, position=None, touching=False)
            return state

    def accept(self, message):
        now = time.monotonic()
        kind = message.get("type")
        if kind not in ("sample", "ready", "event", "contact", "heartbeat"):
            return
        record = {"at": int(time.time() * 1000), "message": message}
        with self.lock:
            self.trace.append(record)
            if kind == "event":
                self.events.append(record)
        self.updated = now
        values = {"connected": True}
        pressed = message.get("pressed") if kind == "contact" else message.get("touching")
        if type(pressed) is bool:
            values["touching"] = pressed
            if pressed and self.state["touching"] is not True:
                values.update(touchId=self.state["touchId"] + 1, touchAt=int(time.time() * 1000))
        if kind == "sample":
            coords = [message.get(key) for key in ("x", "y", "z")]
            valid = all(type(v) in (int, float) and 0 <= v <= 100 for v in coords)
            absent = all(key in message and message[key] is None for key in ("x", "y", "z"))
            if not valid and not absent:
                return
            values["position"] = dict(zip(("x", "y", "z"), coords)) if valid else None
            values["samples"] = self.state["samples"] + 1
        elif kind == "ready":
            values.update(sensorReady=message.get("gestic") is True, position=None, touching=False)
        elif self.state["touching"] is None and str(message.get("name", "")).startswith("Dotyk "):
            values.update(touchId=self.state["touchId"] + 1, touchAt=int(time.time() * 1000))
        self.publish(**values)

    def run(self):
        while not self.stop.is_set():
            paths = [self.port] if self.port else sorted(glob.glob("/dev/cu.usbmodem*"))
            if not paths:
                self.publish(connected=False, position=None, touching=False)
                self.stop.wait(1)
                continue
            fd = None
            old = None
            try:
                fd = os.open(paths[0], os.O_RDWR | os.O_NONBLOCK | os.O_NOCTTY)
                old = termios.tcgetattr(fd)
                attrs = termios.tcgetattr(fd)
                attrs[0] = attrs[1] = attrs[3] = 0
                attrs[2] = termios.CS8 | termios.CREAD | termios.CLOCAL
                attrs[4] = attrs[5] = termios.B115200
                attrs[6][termios.VMIN] = attrs[6][termios.VTIME] = 0
                termios.tcsetattr(fd, termios.TCSANOW, attrs)
                fcntl.ioctl(fd, termios.TIOCMBIS, array.array("i", [termios.TIOCM_DTR | termios.TIOCM_RTS]))
                buffer = ""
                last_bytes = time.monotonic()
                while not self.stop.is_set():
                    if not os.path.exists(paths[0]):
                        raise OSError("USB disconnected")
                    if not select.select([fd], [], [], .25)[0]:
                        if time.monotonic() - last_bytes > 5:
                            raise OSError("USB stream timed out")
                        continue
                    chunk = os.read(fd, 8192)
                    if not chunk:
                        raise OSError("USB disconnected")
                    last_bytes = time.monotonic()
                    buffer += chunk.decode("utf-8", "replace")
                    items, buffer = messages(buffer)
                    for item in items:
                        self.accept(item)
            except (OSError, termios.error):
                self.publish(connected=False, position=None, touching=False)
                self.stop.wait(1)
            finally:
                if fd is not None:
                    try:
                        if old is not None:
                            termios.tcsetattr(fd, termios.TCSANOW, old)
                    except (OSError, termios.error):
                        pass
                    os.close(fd)


def serve(sensor, root, port):
    local_origin = f"http://127.0.0.1:{port}"
    allowed = ORIGINS | {local_origin, f"http://localhost:{port}"}

    class Handler(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(root), **kwargs)

        def translate_path(self, path):
            # Serve shared animation sources directly, even when the scene uses dist/.
            source = ANIMATION_ASSETS.get(urlsplit(path).path)
            return str(source) if source else super().translate_path(path)

        def allowed_request(self):
            # Restrict both DNS rebinding and cross-origin reads of USB data.
            return self.headers.get("Host") in {f"127.0.0.1:{port}", f"localhost:{port}"} and self.headers.get("Origin", local_origin) in allowed

        def cors(self):
            origin = self.headers.get("Origin")
            if origin in allowed:
                self.send_header("Access-Control-Allow-Origin", origin)
                self.send_header("Vary", "Origin")
            self.send_header("Access-Control-Allow-Private-Network", "true")

        def do_OPTIONS(self):
            if not self.allowed_request():
                self.send_error(403)
                return
            self.send_response(204)
            self.cors()
            self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
            self.end_headers()

        def do_GET(self):
            if not self.allowed_request():
                self.send_error(403)
                return
            path = urlsplit(self.path).path
            if path in ("/state", "/diagnostics"):
                if path == "/diagnostics":
                    snapshot = sensor.snapshot()
                    with sensor.lock:
                        data = {"state": snapshot, "events": list(sensor.events), "trace": list(sensor.trace)}
                else:
                    data = sensor.snapshot()
                payload = json.dumps(data).encode()
                self.send_response(200)
                self.cors()
                self.send_header("Content-Type", "application/json")
                self.send_header("Cache-Control", "no-store")
                self.send_header("Content-Length", str(len(payload)))
                self.end_headers()
                self.wfile.write(payload)
            else:
                super().do_GET()

        def log_message(self, format, *args):
            pass

    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    worker = threading.Thread(target=sensor.run, daemon=True)
    worker.start()
    print(f"Flick bridge: {local_origin}", flush=True)
    try:
        server.serve_forever(poll_interval=.2)
    finally:
        sensor.stop.set()
        worker.join(timeout=2)
        server.server_close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--device", help="USB serial port; defaults to automatic detection")
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1] / "dist")
    args = parser.parse_args()
    def stop_signal(signum, frame):
        raise KeyboardInterrupt
    signal.signal(signal.SIGTERM, stop_signal)
    try:
        serve(Sensor(args.device), args.root.resolve(), args.port)
    except KeyboardInterrupt:
        pass
