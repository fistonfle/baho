// Speaks lesson text when no recording exists; TTS_COMMAND takes text in, returns audio.
import { spawn } from 'node:child_process';

export class TtsEngine {
  // Lessons are a few minutes of speech, so the command is given room to work.
  static timeoutMs = 180_000;
  static maxChars = 6000;
  static maxBytes = 20 * 1024 * 1024;

  constructor(command = null) {
    this.configured = command;
  }

  // Read at the moment of use, so the environment alone decides.
  get command() {
    return String(this.configured ?? process.env.TTS_COMMAND ?? '').trim();
  }

  // False when the deployment has named no voice command, which is the default.
  isConfigured() {
    return this.command.length > 0;
  }

  // Audio bytes for the text, in whatever format the command writes.
  async speak(text) {
    if (!this.isConfigured()) throw new Error('not-configured');
    const script = String(text || '').trim();
    if (!script) throw new Error('empty');
    if (script.length > TtsEngine.maxChars) throw new Error('too-long');

    return new Promise((resolve, reject) => {
      const child = spawn(this.command, { shell: true });
      const chunks = [];
      let size = 0;
      let settled = false;
      const stderr = [];

      const finish = (error, value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (error) child.kill('SIGKILL');
        error ? reject(error) : resolve(value);
      };

      const timer = setTimeout(() => finish(new Error('timeout')), TtsEngine.timeoutMs);

      child.stdout.on('data', (chunk) => {
        size += chunk.length;
        if (size > TtsEngine.maxBytes) return finish(new Error('too-large'));
        chunks.push(chunk);
      });
      child.stderr.on('data', (chunk) => stderr.push(chunk));
      child.on('error', () => finish(new Error('failed')));
      child.on('close', (code) => {
        if (code !== 0) {
          // The command's message is the only clue to a bad model path.
          console.error('TTS command failed:', Buffer.concat(stderr).toString().slice(0, 500));
          return finish(new Error('failed'));
        }
        if (!chunks.length) return finish(new Error('failed'));
        finish(null, Buffer.concat(chunks));
      });

      child.stdin.on('error', () => finish(new Error('failed')));
      child.stdin.end(script, 'utf8');
    });
  }
}

export const ttsEngine = new TtsEngine();
