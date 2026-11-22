# The Kinyarwanda voice

Baho is audio-first because many of the adults it was written for cannot read a
screen of Kinyarwanda. Only three of the fourteen lessons carry a recording, so
the rest are silent for exactly the learners who need the sound most. A human
voice stays the goal. This is the floor underneath it: a lesson with no
recording can still be heard.

## How it is wired

`baho-tts` is its own container, because torch has no business in the API image.
It holds the model, exposes `POST /speak` on port 8080 inside the stack, and
answers with a WAV. The backend reaches it at `TTS_URL`, which the compose file
sets for you.

Nothing depends on it. If the container is absent, down, or still loading, the
generate endpoint answers 503 and the portal tells the writer to upload a
recording instead. Lessons, learners and the rest of the API are unaffected.

Generation happens once, in the staff portal. The bytes are stored by
`MediaStore` exactly like an uploaded recording, so the audio is a file on disk,
cached offline by the service worker, and costs nothing to play. The learner's
phone never meets a model, and never needs a connection to hear a lesson.

## Running it

In the stack, nothing to do: `docker compose up -d` starts it and the backend
finds it. To point the API at a voice somewhere else, set `TTS_URL` in
`/app/baho/.env`.

Without containers, `TTS_COMMAND` runs a local command that reads text on stdin
and writes audio on stdout:

```
python -m venv venv
./venv/bin/pip install --index-url https://download.pytorch.org/whl/cpu torch==2.15.0
./venv/bin/pip install -r requirements.txt
TTS_COMMAND="$PWD/venv/bin/python $PWD/cli.py"
```

The same file does both jobs: `server.py` and `cli.py` are two doors onto
`voice.py`.

## The model

**facebook/mms-tts-kin**, the Kinyarwanda checkpoint of Meta's Massively
Multilingual Speech project: a VITS model of 36.3M parameters that runs on CPU.
It is baked into the image at build time, so the running container never reaches
the internet.

**Licence, and what it means here.** The model is published under
**CC-BY-NC 4.0** — non-commercial. Baho's own source is MIT and the two do not
conflict, because the weights are not in this repository; they are pulled when
the image is built, and only the audio they produce is stored. That audio is a
derivative of a non-commercial model, so any commercial reuse of Baho would have
to re-voice the lessons or move to another model first. The IP table in the
ethics report records this, and so should any handover document.

Two Rwandan-built alternatives are worth preferring if the extra setup is
affordable, since both were trained on local speech:

| Model | Licence | Setup cost |
| --- | --- | --- |
| `mbazaNLP/kinyarwanda-tts-model` | Mozilla Public Licence 2.0 | No inference code published; FastSpeech + WaveGlow pipeline must be assembled |
| `DigitalUmuganda/KinyarwandaTTS_female_voice` | CC-BY-SA 4.0 | Coqui `TTS`, a downloaded checkpoint and a reference speaker clip |

Swapping means rewriting `voice.py` alone. The server, the portal and the
database do not change.

## What it costs the VM

The container is capped at 768 MB and holds the model in memory once loaded,
which is the largest single thing on a 1 GB machine. It speaks one lesson at a
time, under a lock, because a second pass would not fit. Watch `docker stats`
after the first deploy; if the box struggles, remove the service from the
compose file and generate audio on a laptop with `cli.py`, uploading the files
through the portal as recordings.

## What it does not fix

Kinyarwanda is tonal, and Digital Umuganda say plainly of their own model that
it "lacks in crispness and in some cases ignore[s] tonal information which is
indispensable in Kinyarwanda." A wrong tone can change a word, and these are
health lessons. Generated audio is not a shortcut past review:

- **Listen to every clip before publishing it.** The specialist who approves the
  lesson text approves its voice with it.
- **Learners are told.** A lesson whose audio was generated shows
  *"Ijwi ryakozwe na mudasobwa, si umuntu wasomye"* under the player, and the
  flag lives in `content.audio_is_synthetic`, not in the file name.
- **Replace it when a recording exists.** Uploading a recording clears the flag.
