import { Request, Response } from 'express';
import * as authService from '../services/auth.service';
import { sendSuccess } from '../utils/apiResponse';
import { setAuthCookie, clearAuthCookie } from '../utils/cookies';
import { UnauthorizedError, BadRequestError } from '../errors';
import { verifyGoogleIdToken } from '../lib/googleAuth';
import { uploadAvatarBuffer } from '../services/upload.service';

export const register = async (req: Request, res: Response) => {
  const user = await authService.registerUser(req.body);
  sendSuccess(res, {
    statusCode: 201,
    message: 'Account created. Please check your email to verify your account.',
    data: { user },
  });
};

export const verifyEmail = async (req: Request, res: Response) => {
  const { token } = req.query as { token?: string };
  if (!token) {
    throw new UnauthorizedError('Verification token is required');
  }

  const user = await authService.verifyEmail(token);
  sendSuccess(res, { message: 'Email verified successfully', data: { user } });
};

export const resendVerification = async (req: Request, res: Response) => {
  await authService.resendVerificationEmail(req.body.email);
  sendSuccess(res, {
    message: 'If an account exists and is unverified, a new verification email has been sent.',
  });
};

export const login = async (req: Request, res: Response) => {
  const { user, token } = await authService.loginUser(req.body);
  setAuthCookie(res, token, req.body.rememberMe);
  sendSuccess(res, { message: 'Logged in successfully', data: { user } });
};

export const googleAuth = async (req: Request, res: Response) => {
  const profile = await verifyGoogleIdToken(req.body.idToken);
  const { user, token } = await authService.googleLogin(profile, req.body.rememberMe);
  setAuthCookie(res, token, req.body.rememberMe);
  sendSuccess(res, { message: 'Logged in with Google successfully', data: { user } });
};

export const logout = async (_req: Request, res: Response) => {
  clearAuthCookie(res);
  sendSuccess(res, { message: 'Logged out successfully' });
};

export const forgotPassword = async (req: Request, res: Response) => {
  await authService.forgotPassword(req.body.email);
  sendSuccess(res, {
    message: 'If an account with that email exists, a password reset link has been sent.',
  });
};

export const resetPassword = async (req: Request, res: Response) => {
  await authService.resetPassword(req.body);
  sendSuccess(res, { message: 'Password reset successfully. You can now log in.' });
};

export const getMe = async (req: Request, res: Response) => {
  const user = await authService.getCurrentUser(req.user!.id);
  sendSuccess(res, { message: 'Current user fetched successfully', data: { user } });
};

export const updateAvatar = async (req: Request, res: Response) => {
  if (!req.file) {
    throw new BadRequestError('No image file provided');
  }

  const imageUrl = await uploadAvatarBuffer(req.file.buffer, req.user!.id);
  const user = await authService.updateUserAvatar(req.user!.id, imageUrl);

  sendSuccess(res, { message: 'Avatar updated successfully', data: { user } });
};

export const updateProfile = async (req: Request, res: Response) => {
  const user = await authService.updateProfile(req.user!.id, req.body);
  sendSuccess(res, { message: 'Profile updated successfully', data: { user } });
};

export const changePassword = async (req: Request, res: Response) => {
  await authService.changePassword(req.user!.id, req.body);
  sendSuccess(res, { message: 'Password changed successfully' });
};
