// Cloudinary setup and helper functions for uploading and deleting images.

import { v2 as cloudinary } from 'cloudinary';
import { env } from './env';

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

// Uploads a base64 or URL string to Cloudinary under a given folder.
// Returns the secure URL and the public_id (needed to delete it later).
export const uploadImage = async (file: string, folder: string) => {
  const result = await cloudinary.uploader.upload(file, {
    folder,
    resource_type: 'image',
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
  };
};

// Deletes an image from Cloudinary using its public_id.
export const deleteImage = async (publicId: string) => {
  await cloudinary.uploader.destroy(publicId);
};

export default cloudinary;