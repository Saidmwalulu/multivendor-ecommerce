import { resend } from '../lib/resend';
import { env } from '../config/env';
import { verificationEmailTemplate, passwordResetEmailTemplate } from '../emails/templates';
import { InternalServerError } from '../errors';

export async function sendVerificationEmail(to: string, name: string, rawToken: string): Promise<void> {
  const verifyUrl = `${env.CLIENT_URL}/verify-email?token=${rawToken}`;

  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to,
    subject: 'Verify your email address',
    html: verificationEmailTemplate(name, verifyUrl),
  });

  if (error) {
    throw new InternalServerError('Failed to send verification email');
  }
}

export async function sendPasswordResetEmail(to: string, name: string, rawToken: string): Promise<void> {
  const resetUrl = `${env.CLIENT_URL}/reset-password?token=${rawToken}`;

  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to,
    subject: 'Reset your password',
    html: passwordResetEmailTemplate(name, resetUrl),
  });

  if (error) {
    throw new InternalServerError('Failed to send password reset email');
  }
}
