import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const MAX_BYTES = 300 * 1024;

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.slice(-500) || `${command} exited ${code}`));
    });
  });
}

export function jpegSize(buffer) {
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) throw new Error('not a jpeg');
  let offset = 2;
  while (offset + 8 < buffer.length) {
    if (buffer[offset] !== 0xff) break;
    const marker = buffer[offset + 1];
    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2;
      continue;
    }
    const length = buffer.readUInt16BE(offset + 2);
    if (marker >= 0xc0 && marker <= 0xc3) {
      return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
    }
    offset += 2 + length;
  }
  throw new Error('jpeg size was not found');
}

/**
 * Fit the picture inside 1280x720, pad to exactly that frame, and compress under 300 KB.
 * Padding keeps a centered subject instead of cropping it off.
 */
export async function toFeedJpeg(input) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'mnr-img-'));
  const source = path.join(dir, 'source');
  const output = path.join(dir, 'out.jpg');
  try {
    await writeFile(source, input);
    let last = null;
    for (const quality of [5, 8, 12, 16, 22, 28]) {
      await run('ffmpeg', [
        '-y',
        '-i',
        source,
        '-vf',
        'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=0xF4F1EA',
        '-frames:v',
        '1',
        '-q:v',
        String(quality),
        output,
      ]);
      last = await readFile(output);
      if (last.length <= MAX_BYTES) break;
    }
    if (!last || last.length > MAX_BYTES) throw new Error('jpeg is over 300 KB');
    const size = jpegSize(last);
    if (size.width !== 1280 || size.height !== 720) {
      throw new Error(`jpeg is ${size.width}x${size.height}`);
    }
    return last;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
