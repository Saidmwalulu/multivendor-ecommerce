import { Request, Response, NextFunction } from 'express';
import { Role } from '../constants/roles';
import { ForbiddenError, UnauthorizedError } from '../errors';

/**
 * Restricts access to users whose role is included in `allowedRoles`.
 * Must run after `authenticate`. Supports one or more roles:
 *   authorize(Role.ADMIN)
 *   authorize(Role.ADMIN, Role.SELLER)
 */
export function authorize(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('You are not logged in');
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new ForbiddenError('You do not have permission to perform this action');
    }

    next();
  };
}
