import { CloudinaryService } from '../../cloudinary/cloudinary.service';
import { decodeImageDataUri } from './decode-image.util';

// Shared by any feature that stores an image where the input can be EITHER
// a base64 data URI (we own the upload — track the Cloudinary public_id so
// we can delete/replace it later) OR an already-hosted URL (we don't own
// it, so there's nothing to clean up on Cloudinary later).
export async function resolveImage(
  cloudinary: CloudinaryService,
  image: string,
): Promise<{ url: string; imageId: string | null }> {
  if (image.startsWith('data:image/')) {
    const { buffer } = decodeImageDataUri(image);
    const { url, publicId } = await cloudinary.uploadImage(buffer);
    return { url, imageId: publicId };
  }
  return { url: image, imageId: null };
}
