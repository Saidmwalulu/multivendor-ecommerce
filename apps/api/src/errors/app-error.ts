
import { Prisma } from '../generated/prisma/client';

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class BadRequestError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Not authorized') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests, please try again later') {
    super(message, 429);
  }
}

// Converts a Prisma error into a readable AppError.
// Call this in a catch block when you want a clean error response.
//
// Usage:
//   } catch (err) {
//     throw handlePrismaError(err);
//   }
export const handlePrismaError = (err: unknown): AppError => {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Duplicate unique field (e.g. email already taken)
    if (err.code === 'P2002') {
      const field = (err.meta?.target as string[])?.join(', ') ?? 'field';
      return new BadRequestError(`A record with this ${field} already exists`);
    }

    // Record not found (e.g. update/delete on something that doesn't exist)
    if (err.code === 'P2025') {
      return new NotFoundError('Record not found');
    }

    // Foreign key constraint failed
    if (err.code === 'P2003') {
      return new BadRequestError('Related record does not exist');
    }
  }

  // Bad data passed to a Prisma query — usually a bug in our code
  if (err instanceof Prisma.PrismaClientValidationError) {
    return new AppError('Invalid data sent to the database', 400);
  }

  // DB is down or can't connect
  if (
    err instanceof Prisma.PrismaClientInitializationError ||
    err instanceof Prisma.PrismaClientRustPanicError
  ) {
    return new AppError('Database is unavailable, please try again later', 503);
  }

  // Anything else — let the global error handler deal with it
  return new AppError('Something went wrong', 500);
};