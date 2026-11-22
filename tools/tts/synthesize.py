#!/usr/bin/env python3
"""Read Kinyarwanda text on stdin, write a WAV of it on stdout. See README.md."""
import io
import os
import re
import sys

MODEL = os.environ.get("TTS_MODEL", "facebook/mms-tts-kin")
# The duration predictor is stochastic, so a fixed seed keeps audio reproducible.
SEED = int(os.environ.get("TTS_SEED", "1"))
PAUSE_SECONDS = float(os.environ.get("TTS_PAUSE", "0.35"))
MAX_CHARS = int(os.environ.get("TTS_MAX_CHARS", "6000"))


def sentences(text):
    """The text in speakable pieces, none longer than the model handles well."""
    parts = []
    for piece in re.split(r"(?<=[.!?;:])\s+|\n+", text):
        piece = piece.strip()
        while len(piece) > 200:
            cut = piece.rfind(" ", 0, 200)
            cut = cut if cut > 0 else 200
            parts.append(piece[:cut].strip())
            piece = piece[cut:].strip()
        if piece:
            parts.append(piece)
    return parts


def main():
    text = sys.stdin.read().strip()
    if not text:
        sys.stderr.write("no text on stdin\n")
        return 1
    if len(text) > MAX_CHARS:
        sys.stderr.write("text longer than TTS_MAX_CHARS\n")
        return 1

    import numpy as np
    import torch
    from scipy.io import wavfile
    from transformers import AutoTokenizer, VitsModel

    torch.manual_seed(SEED)
    model = VitsModel.from_pretrained(MODEL)
    tokenizer = AutoTokenizer.from_pretrained(MODEL)
    model.eval()
    rate = model.config.sampling_rate
    pause = np.zeros(int(rate * PAUSE_SECONDS), dtype=np.float32)

    pieces = []
    for sentence in sentences(text):
        inputs = tokenizer(sentence, return_tensors="pt")
        with torch.no_grad():
            wave = model(**inputs).waveform
        pieces.append(wave.squeeze().cpu().numpy().astype(np.float32))
        pieces.append(pause)

    if not pieces:
        sys.stderr.write("nothing to say\n")
        return 1

    audio = np.concatenate(pieces)
    peak = float(np.max(np.abs(audio))) or 1.0
    # A phone speaker outdoors has no headroom to spare; 0.95 leaves encoder room.
    audio = (audio / peak) * 0.95

    buffer = io.BytesIO()
    wavfile.write(buffer, rate, (audio * 32767).astype(np.int16))
    sys.stdout.buffer.write(buffer.getvalue())
    sys.stdout.buffer.flush()
    return 0


if __name__ == "__main__":
    sys.exit(main())
