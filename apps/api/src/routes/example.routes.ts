import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { Role } from '../constants/roles';
import { sendSuccess } from '../utils/apiResponse';

// Demonstrates how to protect routes by authentication and role.
// Not part of the core auth API — safe to remove or extend.
const router = Router();

router.get(
  '/admin-only',
  authenticate,
  authorize(Role.ADMIN),
  async (_req, res) => {
    sendSuccess(res, { message: 'Welcome, admin' });
  }
);

router.get(
  '/admin-or-seller',
  authenticate,
  authorize(Role.ADMIN, Role.SELLER),
  async (_req, res) => {
    sendSuccess(res, { message: 'Welcome, admin or seller' });
  }
);

router.get(
  '/user-only',
  authenticate,
  authorize(Role.USER),
  async (_req, res) => {
    sendSuccess(res, { message: 'Welcome, user' });
  }
);

export default router;
