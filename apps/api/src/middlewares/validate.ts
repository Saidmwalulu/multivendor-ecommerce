import { Request, Response, NextFunction } from 'express';
import { ZodType } from 'zod';

type Schema = ZodType;

/**
 * Validates req.body against the given Zod schema and replaces req.body
 * with the parsed (and type-coerced) result. Validation errors are passed
 * to the centralized error handler, which knows how to format ZodErrors.
 */
export const validate =
  (schema: Schema) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      next(result.error);
      return;
    }

    req.body = result.data;
    next();
  };

/**
 * Same as validate(), but for req.query. Express's req.query is technically
 * read-only in newer versions, so we mutate keys in place rather than
 * reassigning the whole object.
 */
export const validateQuery =
  (schema: Schema) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      next(result.error);
      return;
    }

    Object.assign(req.query, result.data);
    next();
  };
