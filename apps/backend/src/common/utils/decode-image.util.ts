import { BadRequestException } from '@nestjs/common';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

// dataUri looks like: "data:image/png;base64,iVBORw0KGgo..."
// Shared by any feature that accepts an image as a base64 string
// (profile pictures, category images) instead of multipart/form-data.
export function decodeImageDataUri(dataUri: string): { buffer: Buffer; mime: string } {
  const match = dataUri.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (!match) throw new BadRequestException('Invalid image data URI');

  const [, mime, base64] = match;
  const buffer = Buffer.from(base64, 'base64');

  if (!ALLOWED_MIME.includes(mime)) throw new BadRequestException('Unsupported image type');
  if (buffer.length > MAX_IMAGE_BYTES) throw new BadRequestException('Image must be under 5MB');

  return { buffer, mime };
}
