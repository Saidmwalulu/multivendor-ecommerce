import multer from 'multer';
import { BadRequestError } from '../errors';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * Creates single-image-upload middleware for the given form field name.
 * Buffers the file in memory only — nothing touches disk. The controller
 * streams req.file.buffer straight to Cloudinary.
 */
function createSingleImageUpload(fieldName: string) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE_BYTES },
    fileFilter: (_req, file, cb) => {
      if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
        cb(new BadRequestError('Only JPEG, PNG, WEBP, or GIF images are allowed'));
        return;
      }
      cb(null, true);
    },
  }).single(fieldName);
}

export const uploadStoreImages = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new BadRequestError('Only JPEG, PNG, WEBP, or GIF images are allowed'));
      return;
    }
    cb(null, true);
  },
}).fields([
  { name: 'logo', maxCount: 1 },
  { name: 'cover', maxCount: 1 },
]);

export const uploadAvatar = createSingleImageUpload('image');
export const uploadCategoryImage = createSingleImageUpload('image');
export const uploadSubCategoryImage = createSingleImageUpload('image');
export const uploadStoreLogo = createSingleImageUpload('logo');
export const uploadStoreCover = createSingleImageUpload('cover');
