import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { verifyAccessToken } from '../utils/jwt';
import { UnauthorizedError } from '../errors';

/**
 * Verifies the JWT stored in the auth cookie and attaches the decoded
 * user (id + role) to req.user. Rejects missing, malformed, or expired
 * tokens with a 401.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const token = req.cookies?.[env.COOKIE_NAME];

  if (!token) {
    throw new UnauthorizedError('You are not logged in');
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Your session has expired, please log in again');
    }
    throw new UnauthorizedError('Invalid authentication token');
  }
}
