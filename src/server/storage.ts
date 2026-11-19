import 'server-only';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { PutObjectCommand, DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';

const ALLOWED = new Map([
  ['image/jpeg', 'jpg'], ['image/png', 'png'], ['image/webp', 'webp'], ['image/avif', 'avif'],
]);
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function sniff(buf: Buffer): string | null {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP') return 'image/webp';
  if (buf.subarray(4, 12).toString().startsWith('ftypavi')) return 'image/avif';
  return null;
}

let s3: S3Client | null = null;
function client() {
  if (!s3) {
    s3 = new S3Client({
      region: process.env.S3_REGION || 'auto',
      endpoint: process.env.S3_ENDPOINT || undefined,
      forcePathStyle: !!process.env.S3_ENDPOINT,
      // Firebase Storage / GCS interop rejects the SDK's default CRC32 checksum headers.
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
      credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID!, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY! },
    });
  }
  return s3;
}

/** Validates (by magic bytes, not just extension) and stores an uploaded image. Returns its public URL. */
export async function saveImage(file: File, folder: string, baseName: string): Promise<string> {
  if (file.size > MAX_IMAGE_BYTES) throw new Error(`${file.name}: images must be under 5 MB.`);
  const buf = Buffer.from(await file.arrayBuffer());
  const type = sniff(buf);
  if (!type || !ALLOWED.has(type)) throw new Error(`${file.name}: only JPG, PNG, WebP or AVIF images are allowed.`);
  const safeBase = baseName.replace(/[^a-z0-9_-]/gi, '_').toLowerCase().slice(0, 60) || 'image';
  const key = `${folder}/${safeBase}_${randomUUID().slice(0, 8)}.${ALLOWED.get(type)}`;

  if (process.env.STORAGE_DRIVER === 's3') {
    await client().send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET!, Key: key, Body: buf, ContentType: type, CacheControl: 'public, max-age=31536000, immutable',
    }));
    return `${process.env.STORAGE_PUBLIC_URL!.replace(/\/$/, '')}/${key}`;
  }
  const dest = path.join(process.cwd(), 'public', 'uploads', key);
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, buf);
  return `/uploads/${key}`;
}

export async function deleteImage(url: string) {
  try {
    if (url.startsWith('/uploads/')) {
      const p = path.join(process.cwd(), 'public', url);
      if (p.startsWith(path.join(process.cwd(), 'public', 'uploads'))) await unlink(p);
    } else if (process.env.STORAGE_DRIVER === 's3' && process.env.STORAGE_PUBLIC_URL && url.startsWith(process.env.STORAGE_PUBLIC_URL)) {
      const key = url.slice(process.env.STORAGE_PUBLIC_URL.replace(/\/$/, '').length + 1);
      await client().send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: key }));
    }
  } catch {
    /* file already gone — ignore */
  }
}
