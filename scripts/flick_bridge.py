#!/usr/bin/env python3
"""Read the existing Pico JSON stream and serve it to the classroom simulator."""
import argparse
import glob
import json
import os
from pathlib import Path
import select
import signal
import termios
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit

ORIGINS = {"https://ucebna-dod-simulator.noobest.chatgpt.site"}


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
        self.state = {"connected": False, "position": None, "touchId": 0, "touchAt": 0, "samples": 0}
        self.updated = 0

    def publish(self, **values):
        with self.lock:
            self.state.update(values)

    def snapshot(self):
        with self.lock:
            current = dict(self.state)
            if time.monotonic() - self.updated > 1:
                current["position"] = None
            return current

    def accept(self, message):
        now = time.monotonic()
        kind = message.get("type")
        if kind not in ("sample", "ready", "event"):
            return
        self.updated = now
        values = {"connected": True}
        if kind == "sample":
            coords = [message.get(key) for key in ("x", "y", "z")]
            valid = all(type(v) in (int, float) and 0 <= v <= 100 for v in coords)
            values["position"] = dict(zip(("x", "y", "z"), coords)) if valid else None
            values["samples"] = self.state["samples"] + 1
        elif kind == "ready":
            values["sensorReady"] = message.get("gestic") is True
        elif str(message.get("name", "")).startswith(("Dotyk ", "Tap ", "Dvojitý tap ")):
            values.update(touchId=self.state["touchId"] + 1, touchAt=int(time.time() * 1000))
        self.publish(**values)

    def run(self):
        while not self.stop.is_set():
            paths = [self.port] if self.port else sorted(glob.glob("/dev/cu.usbmodem*"))
            if not paths:
                self.publish(connected=False, position=None)
                self.stop.wait(1)
                continue
            fd = None
            old = None
            try:
                fd = os.open(paths[0], os.O_RDONLY | os.O_NONBLOCK | os.O_NOCTTY)
                old = termios.tcgetattr(fd)
                attrs = termios.tcgetattr(fd)
                attrs[0] = attrs[1] = attrs[3] = 0
                attrs[6][termios.VMIN] = attrs[6][termios.VTIME] = 0
                termios.tcsetattr(fd, termios.TCSANOW, attrs)
                buffer = ""
                while not self.stop.is_set():
                    if not os.path.exists(paths[0]):
                        raise OSError("USB disconnected")
                    if not select.select([fd], [], [], .25)[0]:
                        continue
                    chunk = os.read(fd, 8192)
                    if not chunk:
                        raise OSError("USB disconnected")
                    buffer += chunk.decode("utf-8", "replace")
                    items, buffer = messages(buffer)
                    for item in items:
                        self.accept(item)
            except (OSError, termios.error):
                self.publish(connected=False, position=None)
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
            if path == "/state":
                payload = json.dumps(sensor.snapshot()).encode()
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
