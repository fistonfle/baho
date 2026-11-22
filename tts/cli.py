"""Read text on stdin, write a WAV on stdout. For TTS_COMMAND on a machine with no container."""
import sys

import voice

if __name__ == "__main__":
    try:
        audio = voice.speak(sys.stdin.read())
    except voice.VoiceError as error:
        sys.stderr.write(f"{error}\n")
        sys.exit(1)
    sys.stdout.buffer.write(audio)
    sys.stdout.buffer.flush()
