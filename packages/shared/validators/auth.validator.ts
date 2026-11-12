import { z } from 'zod';

export const RegisterSchema = z
  .object({
    username: z.string().min(1, 'Username is required').min(3, 'Username must be at least 3 characters').max(30, 'Username must not exceed 30 characters'),
    email: z.email('Invalid email address'),
    password: z.string().min(1, 'Password is required').min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Confirm password is required').min(8, 'Confirm password must be at least 8 characters'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const LoginSchema = z.object({
  email: z.email('Email is required'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean(),
});

export const ForgotPasswordSchema = z.object({
  email: z.email('Email is required'),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  newPassword: z.string().min(1, 'New password is required').min(8, 'New password must be at least 8 characters'),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(1, 'New password is required').min(8, 'New password must be at least 8 characters'),
});

export const VerifyEmailSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

export const ResendVerificationSchema = z.object({
  email: z.email('Email is required'),
});

export const UpdateUsernameSchema = z.object({
  username: z.string().min(1, 'Username is required').min(3, 'Username must be at least 3 characters').max(30, 'Username must not exceed 30 characters'),
});

export const UploadProfilePictureSchema = z.object({
  image: z.string().min(1, 'Profile picture is required')
    .regex(
      /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/,
      'Image must be a base64 data URI (image/jpeg, image/png, or image/webp)',
    ),
});

// DTOs
export type UploadProfilePictureDto = z.infer<typeof UploadProfilePictureSchema>;
export type UpdateUsernameDto = z.infer<typeof UpdateUsernameSchema>;
export type ResendVerificationDto = z.infer<typeof ResendVerificationSchema>;
export type VerifyEmailDto = z.infer<typeof VerifyEmailSchema>;
export type ChangePasswordDto = z.infer<typeof ChangePasswordSchema>;
export type ResetPasswordDto = z.infer<typeof ResetPasswordSchema>;
export type ForgotPasswordDto = z.infer<typeof ForgotPasswordSchema>;
export type LoginDto = z.infer<typeof LoginSchema>;
export type RegisterDto = z.infer<typeof RegisterSchema>;