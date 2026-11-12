export function verificationEmailTemplate(name: string, verifyUrl: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
      <h2>Verify your email</h2>
      <p>Hi ${name},</p>
      <p>Thanks for signing up. Please confirm your email address by clicking the button below.</p>
      <p style="margin: 24px 0;">
        <a href="${verifyUrl}" style="background:#4f46e5;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;">
          Verify Email
        </a>
      </p>
      <p>This link expires in 24 hours. If you didn't create an account, you can ignore this email.</p>
    </div>
  `;
}

export function passwordResetEmailTemplate(name: string, resetUrl: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
      <h2>Reset your password</h2>
      <p>Hi ${name},</p>
      <p>We received a request to reset your password. Click the button below to choose a new one.</p>
      <p style="margin: 24px 0;">
        <a href="${resetUrl}" style="background:#4f46e5;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;">
          Reset Password
        </a>
      </p>
      <p>This link expires in 15 minutes. If you didn't request this, you can safely ignore this email.</p>
    </div>
  `;
}
