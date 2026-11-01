// Stores uploaded lesson recordings on disk (a Docker volume in production) and
// recognises the audio format from the file's first bytes, not from the name or
// the type the browser claims.
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const formats = [
  { extension: 'mp3', type: 'audio/mpeg', matches: (b) => b.subarray(0, 3).toString('latin1') === 'ID3' || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0) },
  { extension: 'm4a', type: 'audio/mp4', matches: (b) => b.subarray(4, 8).toString('latin1') === 'ftyp' },
  { extension: 'ogg', type: 'audio/ogg', matches: (b) => b.subarray(0, 4).toString('latin1') === 'OggS' },
  { extension: 'wav', type: 'audio/wav', matches: (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WAVE' },
  { extension: 'webm', type: 'audio/webm', matches: (b) => b.length > 4 && b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3 }
];

export class MediaStore {
  static maxBytes = 20 * 1024 * 1024;

  static typeByExtension = Object.fromEntries(formats.map((format) => [format.extension, format.type]));

  constructor(directory) {
    this.directory = directory;
  }

  // The audio format of the bytes, or null if they are not a supported recording.
  static detect(buffer) {
    if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;
    return formats.find((format) => format.matches(buffer)) ?? null;
  }

  // Saves a recording under a random name and returns that name.
  async saveAudio(buffer) {
    const format = MediaStore.detect(buffer);
    if (!format) throw new Error('unsupported');
    if (buffer.length > MediaStore.maxBytes) throw new Error('too-large');
    await mkdir(this.directory, { recursive: true });
    const name = `${randomBytes(12).toString('hex')}.${format.extension}`;
    await writeFile(join(this.directory, name), buffer);
    return name;
  }
}

export const mediaStore = new MediaStore(process.env.MEDIA_DIR || join(process.cwd(), 'uploads'));
