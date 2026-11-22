"""Kinyarwanda speech for lesson text. Loads the model once, then speaks."""
import io
import os
import re
import threading
import wave

MODEL = os.environ.get("TTS_MODEL", "facebook/mms-tts-kin")
# The duration predictor is stochastic, so a fixed seed keeps audio reproducible.
SEED = int(os.environ.get("TTS_SEED", "1"))
PAUSE_SECONDS = float(os.environ.get("TTS_PAUSE", "0.35"))
MAX_CHARS = int(os.environ.get("TTS_MAX_CHARS", "6000"))
# One lesson at a time: this box has no memory to spare for a second model pass.
_lock = threading.Lock()
_loaded = None


class VoiceError(Exception):
    pass


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


def load():
    """The model and tokenizer, loaded on first use and kept."""
    global _loaded
    if _loaded is None:
        import torch
        from transformers import AutoTokenizer, VitsModel

        model = VitsModel.from_pretrained(MODEL)
        model.eval()
        _loaded = (model, AutoTokenizer.from_pretrained(MODEL), torch)
    return _loaded


def speak(text):
    """WAV bytes of the text read aloud."""
    import numpy as np

    script = (text or "").strip()
    if not script:
        raise VoiceError("no text")
    if len(script) > MAX_CHARS:
        raise VoiceError("text longer than TTS_MAX_CHARS")

    with _lock:
        model, tokenizer, torch = load()
        torch.manual_seed(SEED)
        rate = model.config.sampling_rate
        pause = np.zeros(int(rate * PAUSE_SECONDS), dtype=np.float32)

        pieces = []
        for sentence in sentences(script):
            inputs = tokenizer(sentence, return_tensors="pt")
            with torch.no_grad():
                wave_out = model(**inputs).waveform
            pieces.append(wave_out.squeeze().cpu().numpy().astype(np.float32))
            pieces.append(pause)

    if not pieces:
        raise VoiceError("nothing to say")

    audio = np.concatenate(pieces)
    peak = float(np.max(np.abs(audio))) or 1.0
    # A phone speaker outdoors has no headroom to spare; 0.95 leaves encoder room.
    audio = (audio / peak) * 0.95

    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as out:
        out.setnchannels(1)
        out.setsampwidth(2)
        out.setframerate(rate)
        out.writeframes((audio * 32767).astype("<i2").tobytes())
    return buffer.getvalue()
