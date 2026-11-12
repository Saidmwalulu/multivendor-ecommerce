import { UploadApiOptions } from 'cloudinary';
import { cloudinary } from '../config/cloudinary';
import { InternalServerError } from '../errors';

export interface UploadedImage {
  secureUrl: string;
  publicId: string;
}

/**
 * Uploads an in-memory image buffer (from Multer's memoryStorage) to
 * Cloudinary and returns both the secure URL and the public_id (the
 * public_id must be kept — it's what lets us delete or replace the image
 * later without doing a reverse lookup by URL).
 */
export function uploadImageBuffer(buffer: Buffer, options: UploadApiOptions = {}): Promise<UploadedImage> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { resource_type: 'image', overwrite: true, ...options },
      (error, result) => {
        if (error || !result) {
          reject(new InternalServerError('Failed to upload image'));
          return;
        }
        resolve({ secureUrl: result.secure_url, publicId: result.public_id });
      }
    );

    uploadStream.end(buffer);
  });
}

/**
 * Uploads an image from a base64 data URI or a remote URL (the `image`
 * field on Category/SubCategory accepts either) to Cloudinary. Unlike
 * uploadImageBuffer, this doesn't need a stream — Cloudinary's `upload()`
 * accepts a data URI or URL directly as its source.
 */
export async function uploadImageFromSource(source: string, options: UploadApiOptions = {}): Promise<UploadedImage> {
  try {
    const result = await cloudinary.uploader.upload(source, { resource_type: 'image', ...options });
    return { secureUrl: result.secure_url, publicId: result.public_id };
  } catch {
    throw new InternalServerError('Failed to upload image');
  }
}

/**
 * Deletes a previously uploaded image from Cloudinary by its public_id.
 * Used when replacing an image (delete the old one) or deleting the
 * parent record entirely. Failures are logged but not thrown — a stray
 * orphaned Cloudinary asset shouldn't block the database operation.
 */
export async function deleteImage(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Failed to delete Cloudinary image ${publicId}:`, error);
  }
}

const AVATAR_FOLDER = 'auth-system/avatars';

/**
 * Convenience wrapper around uploadImageBuffer for the user-avatar use
 * case: fixed folder, public_id pinned to the user so re-uploading
 * overwrites the previous avatar, and a face-aware square crop.
 */
export async function uploadAvatarBuffer(buffer: Buffer, userId: string): Promise<string> {
  const { secureUrl } = await uploadImageBuffer(buffer, {
    folder: AVATAR_FOLDER,
    public_id: userId,
    transformation: [{ width: 512, height: 512, crop: 'fill', gravity: 'face' }],
  });
  return secureUrl;
}
