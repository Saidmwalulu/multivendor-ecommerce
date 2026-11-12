import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '../generated/prisma/client';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { AppError } from '../errors';
import { env } from '../config/env';

interface NormalizedError {
  statusCode: number;
  message: string;
  errors: unknown[];
}

function normalizeError(err: unknown): NormalizedError {
  // Zod validation errors
  if (err instanceof ZodError) {
    return {
      statusCode: 422,
      message: err.issues[0]?.message ?? "Validation failed",
      errors: [{
        path: err.issues[0]?.path.join("."),
        message: err.issues[0]?.message,
      }],
    };
  }

  // Known Prisma request errors (unique constraint, not found, etc.)
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = (err.meta?.target as string[] | undefined)?.join(', ') ?? 'field';
      return { statusCode: 409, message: `A record with this ${target} already exists`, errors: [] };
    }
    if (err.code === 'P2025') {
      return { statusCode: 404, message: 'Requested record was not found', errors: [] };
    }
    return { statusCode: 400, message: 'Invalid database request', errors: [] };
  }

  // Prisma validation errors (bad query shape) — never expose raw details
  if (err instanceof Prisma.PrismaClientValidationError) {
    return { statusCode: 400, message: 'Invalid data provided', errors: [] };
  }

  // Prisma failed to connect/initialize
  if (err instanceof Prisma.PrismaClientInitializationError) {
    return { statusCode: 500, message: 'Database connection error', errors: [] };
  }

  // JWT errors
  if (err instanceof jwt.TokenExpiredError) {
    return { statusCode: 401, message: 'Your session has expired, please log in again', errors: [] };
  }
  if (err instanceof jwt.JsonWebTokenError) {
    return { statusCode: 401, message: 'Invalid authentication token', errors: [] };
  }

  // Multer (file upload) errors
  if (err instanceof multer.MulterError) {
    return { statusCode: 400, message: err.message, errors: [] };
  }

  // Malformed JSON body
  if (err instanceof SyntaxError && 'body' in err) {
    return { statusCode: 400, message: 'Malformed JSON in request body', errors: [] };
  }

  // Our own operational errors
  if (err instanceof AppError) {
    return { statusCode: err.statusCode, message: err.message, errors: err.errors };
  }

  // Unknown / unexpected errors — never leak details in production
  return { statusCode: 500, message: 'Internal server error', errors: [] };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  const { statusCode, message, errors } = normalizeError(err);

  if (env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors,
    ...(env.NODE_ENV === 'development' && err instanceof Error ? { stack: err.stack } : {}),
  });
}

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(new AppError(`Route ${req.originalUrl} not found`, 404));
}
