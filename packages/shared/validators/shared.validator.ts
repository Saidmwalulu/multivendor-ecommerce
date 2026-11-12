import { z } from 'zod';

/**
 * multipart/form-data always sends field values as strings, so a checkbox
 * or boolean flag arrives as "true"/"false" rather than a real boolean.
 * This coerces it back, defaulting to false when the field is omitted.
 */
export const formBoolean = z
  .union([z.boolean(), z.enum(['true', 'false'])])
  .optional()
  .transform((val) => val === true || val === 'true');
