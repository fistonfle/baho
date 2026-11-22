# The Kinyarwanda voice, kept out of the API image because torch is heavy.
FROM python:3.12-slim

WORKDIR /app
ENV PYTHONUNBUFFERED=1 HF_HOME=/models TTS_MODEL=facebook/mms-tts-kin

# The CPU wheel only: the PyPI build carries CUDA and is several times the size.
RUN pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu torch==2.15.0

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Baked in at build time, so the running server never reaches the internet.
RUN python -c "from transformers import AutoTokenizer, VitsModel; m='facebook/mms-tts-kin'; VitsModel.from_pretrained(m); AutoTokenizer.from_pretrained(m)"
ENV HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1

COPY voice.py server.py cli.py ./

# Named baho, not voice: Debian already ships a system group called voice.
RUN groupadd --system baho && useradd --system --gid baho --uid 10001 baho && chown -R baho:baho /models
USER baho
EXPOSE 8080
CMD ["python", "server.py"]
