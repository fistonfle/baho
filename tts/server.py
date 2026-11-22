"""POST /speak with lesson text, get a WAV back. GET /health to check it is up."""
import os
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import voice

PORT = int(os.environ.get("PORT", "8080"))
MAX_BODY = 64 * 1024


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt, *args):
        sys.stderr.write("tts: " + (fmt % args) + "\n")

    def _send(self, code, body, content_type):
        self.send_response(code)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path != "/health":
            return self._send(404, b"not found", "text/plain")
        self._send(200, b"ok", "text/plain")

    def do_POST(self):
        if self.path != "/speak":
            return self._send(404, b"not found", "text/plain")
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0 or length > MAX_BODY:
            return self._send(400, b"send the text as the body", "text/plain")
        text = self.rfile.read(length).decode("utf-8", "replace")
        try:
            audio = voice.speak(text)
        except voice.VoiceError as error:
            return self._send(400, str(error).encode(), "text/plain")
        except Exception as error:
            self.log_message("synthesis failed: %s", error)
            return self._send(500, b"synthesis failed", "text/plain")
        self._send(200, audio, "audio/wav")


if __name__ == "__main__":
    # Load before answering, so the first lesson does not pay for the model.
    voice.load()
    sys.stderr.write(f"tts: ready on {PORT} with {voice.MODEL}\n")
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
