# Lesson audio without a recording

Baho is audio-first because many of the adults it was written for cannot read a
screen of Kinyarwanda. In the delivered system only three of the fourteen
lessons carry a recording, so the rest are silent for exactly the learners who
need the sound most. Recording a human voice stays the goal. This is the floor
underneath it: a lesson with no recording can still be heard.

## How it is wired

The server holds no model. `POST /api/v1/admin/media/audio/generate` hands the
lesson text to the command named in `TTS_COMMAND`, which reads text on stdin and
writes audio on stdout. The bytes are stored by `MediaStore` exactly like an
uploaded recording, so the audio is a file on disk, cached offline by the
service worker, and costs nothing to play. Generation happens once, in the staff
portal, not on the learner's phone and not at playback time — which is what
keeps the offline guarantee intact.

With `TTS_COMMAND` unset — the default — the endpoint answers 503 and the portal
says audio must be uploaded as a recording. Nothing else changes.

```
TTS_COMMAND="/srv/baho/tools/tts/venv/bin/python /srv/baho/tools/tts/synthesize.py"
```

## The voice

`synthesize.py` uses **facebook/mms-tts-kin**, the Kinyarwanda checkpoint of
Meta's Massively Multilingual Speech project: a VITS model of 36.3M parameters
that runs on CPU through `transformers`.

```
python -m venv venv
./venv/bin/pip install torch transformers scipy numpy
echo "Mwaramutse. Iri ni isomo ku ndwara z'umutima." | ./venv/bin/python synthesize.py > test.wav
```

**Licence, and what it means here.** The model is published under
**CC-BY-NC 4.0** — non-commercial. Baho's own source code is MIT, and the two do
not conflict, because the model weights are not part of this repository: they are
downloaded where the command runs, and only the audio they produce is stored.
That audio is a derivative of a non-commercial model, so any commercial reuse of
Baho would have to re-voice the lessons or move to another model first. The IP
table in the ethics report records this, and so should any handover document.

Two Rwandan-built alternatives are worth preferring if the extra setup is
affordable, since both come with a voice that was trained on local speech:

| Model | Licence | Setup cost |
| --- | --- | --- |
| `mbazaNLP/kinyarwanda-tts-model` | Mozilla Public Licence 2.0 | No inference code published; FastSpeech + WaveGlow pipeline must be assembled |
| `DigitalUmuganda/KinyarwandaTTS_female_voice` | CC-BY-SA 4.0 | Coqui `TTS`, downloaded checkpoint and a reference speaker clip |

Swapping to either means rewriting `synthesize.py` alone. The server, the portal
and the database do not change.

## What it does not fix

Kinyarwanda is tonal, and Digital Umuganda say plainly of their own model that
it "lacks in crispness and in some cases ignore[s] tonal information which is
indispensable in Kinyarwanda." A wrong tone can change a word, and these are
health lessons. So generated audio is not a shortcut past review:

- **Listen to every clip before publishing it.** The specialist who approves the
  lesson text approves its voice with it.
- **Learners are told.** A lesson whose audio was generated shows
  *"Ijwi ryakozwe na mudasobwa, si umuntu wasomye"* under the player, and the
  flag travels in the database column `content.audio_is_synthetic`, not in the
  file name.
- **Replace it when a recording exists.** Uploading a recording clears the flag.
