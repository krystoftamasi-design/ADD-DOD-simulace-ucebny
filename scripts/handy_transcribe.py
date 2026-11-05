"""Transcribe a local Handy GGUF model using transcribe-cpp (16 kHz PCM WAV)."""
import array
import json
import os
import sys
import time
import wave
from pathlib import Path

import transcribe_cpp


def load_model(path):
    preference = os.environ.get('DOD_SPEECH_DEVICE', 'auto').lower()
    if preference == 'auto':
        return transcribe_cpp.Model(path)
    devices = transcribe_cpp.backends()
    matches = [device for device in devices if
               device.device_type == preference or
               preference in (device.name + ' ' + device.description).lower()]
    if not matches:
        raise RuntimeError('Whisper device not available: ' + preference)
    device = matches[0]
    print('Whisper device: ' + device.name + ' · ' + device.description,
          file=sys.stderr, flush=True)
    return transcribe_cpp.Model(path, device=device)


def transcribe(model, audio_path):
    started = time.perf_counter()
    with wave.open(audio_path, "rb") as audio:
        if (audio.getnchannels(), audio.getsampwidth(), audio.getframerate()) != (1, 2, 16000):
            raise ValueError("Expected mono 16-bit 16 kHz WAV")
        samples = array.array("h", audio.readframes(audio.getnframes()))
    if sys.byteorder == "big":
        samples.byteswap()
    pcm = array.array("f", (sample / 32768.0 for sample in samples))
    with model.session() as session:
        result = session.run(pcm, language="cs")
    return {"transcription": [{"text": result.text}],
            "timing": {"audioSeconds": len(pcm) / 16000,
                       "transcribeMs": round((time.perf_counter() - started) * 1000)}}


def main():
    if sys.argv[1] == "--worker":
        with load_model(sys.argv[2]) as model:
            print('DOD:' + json.dumps({"ready": True}), flush=True)
            for line in sys.stdin:
                request = json.loads(line)
                try:
                    result = transcribe(model, request["audio"])
                    reply = {"id": request["id"], "result": result}
                except Exception as error:
                    reply = {"id": request["id"], "error": str(error)}
                print('DOD:' + json.dumps(reply), flush=True)
    else:
        model_path, audio_path, output_path = sys.argv[1:]
        with load_model(model_path) as model:
            result = transcribe(model, audio_path)
        Path(output_path).write_text(json.dumps(result), encoding="utf-8")


if __name__ == "__main__":
    main()
