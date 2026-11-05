import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


class SpeechWorkerTest(unittest.TestCase):
    def test_model_is_reused_and_request_error_does_not_stop_worker(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'transcribe_cpp.py').write_text('''
class Model:
    def __init__(self, path, device=None):
        assert device.name == 'Vulkan1'
        with open(path, 'a') as f: f.write('loaded\\n')
    def __enter__(self): return self
    def __exit__(self, *args): pass
    def session(self): return self
    def run(self, pcm, language): return type('Result', (), {'text': 'Ahoj'})()
def backends():
    from types import SimpleNamespace
    return [SimpleNamespace(name='Vulkan0', description='Intel Graphics', device_type='igpu'),
            SimpleNamespace(name='Vulkan1', description='NVIDIA GeForce', device_type='gpu')]
''')
            import wave
            audio = root / 'test.wav'
            with wave.open(str(audio), 'wb') as wav:
                wav.setnchannels(1)
                wav.setsampwidth(2)
                wav.setframerate(16000)
                wav.writeframes(b'\0\0' * 160)
            count = root / 'loads.txt'
            requests = [{'id': 1, 'audio': str(audio)},
                        {'id': 2, 'audio': str(root / 'missing.wav')},
                        {'id': 3, 'audio': str(audio)}]
            process = subprocess.run([sys.executable, str(Path(__file__).with_name('handy_transcribe.py')),
                                      '--worker', str(count)],
                                     input=''.join(json.dumps(r) + '\n' for r in requests),
                                     text=True, capture_output=True, timeout=10,
                                     env={**os.environ, 'PYTHONPATH': str(root), 'DOD_SPEECH_DEVICE': 'NVIDIA'})
            self.assertEqual(process.returncode, 0, process.stderr)
            replies = [json.loads(line[4:]) for line in process.stdout.splitlines() if line.startswith('DOD:')]
            self.assertTrue(replies[0]['ready'])
            self.assertEqual(replies[1]['result']['transcription'][0]['text'], 'Ahoj')
            self.assertIn('error', replies[2])
            self.assertEqual(replies[3]['result']['transcription'], replies[1]['result']['transcription'])
            self.assertIn('transcribeMs', replies[1]['result']['timing'])
            self.assertEqual(count.read_text(), 'loaded\n')
