import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middlewares/authenticate';
import { validate } from '../middlewares/validate';
import { uploadAvatar } from '../middlewares/upload';
import { authRateLimiter, strictAuthRateLimiter } from '../middlewares/rateLimiter';
import {
  registerSchema,
  loginSchema,
  googleLoginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  resendVerificationSchema,
  updateProfileSchema,
  changePasswordSchema,
} from '@repo/shared';

const router = Router();

router.use(authRateLimiter);

router.post('/register', validate(registerSchema), authController.register);
router.get('/verify-email', authController.verifyEmail);
router.post('/resend-verification', validate(resendVerificationSchema), authController.resendVerification);

router.post('/login', strictAuthRateLimiter, validate(loginSchema), authController.login);
router.post('/google', strictAuthRateLimiter, validate(googleLoginSchema), authController.googleAuth);
router.post('/logout', authController.logout);

router.post('/forgot-password', strictAuthRateLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', strictAuthRateLimiter, validate(resetPasswordSchema), authController.resetPassword);

router.get('/me', authenticate, authController.getMe);
router.patch('/me', authenticate, validate(updateProfileSchema), authController.updateProfile);
router.post('/me/avatar', authenticate, uploadAvatar, authController.updateAvatar);
router.patch(
  '/me/password',
  authenticate,
  strictAuthRateLimiter,
  validate(changePasswordSchema),
  authController.changePassword
);

export default router;
