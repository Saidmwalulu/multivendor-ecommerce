import { env } from "./env"
import { Resend } from "resend";

const resend = new Resend(env.RESEND_API_KEY);

const verificationEmailTemplate = (name: string, url: string) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #111827;">
    <h2>Welcome, ${name}!</h2>
    <p>Thanks for signing up. Click the button below to verify your email address.</p>
    <p style="color: #6B7280; font-size: 14px;">This link expires in 24 hours.</p>
 
    <a href="${url}" style="
      display: inline-block;
      margin: 16px 0;
      padding: 12px 24px;
      background: #4F46E5;
      color: #fff;
      text-decoration: none;
      border-radius: 6px;
      font-weight: bold;
    ">
      Verify Email
    </a>
 
    <p style="font-size: 13px; color: #6B7280;">
      Or copy and paste this link into your browser:<br />
      <span style="word-break: break-all;">${url}</span>
    </p>
 
    <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;" />
    <p style="font-size: 12px; color: #9CA3AF;">
      If you didn't create an account, you can safely ignore this email.
    </p>
  </div>
`;

export const sendVerificationEmail = async(to: string, name: string, verificationUrl: string) => {
  const { data, error } = await resend.emails.send({
    from: `${env.APP_NAME} <${env.RESEND_FROM}>`,
    to,
    subject: 'Verify your email address',
    html: verificationEmailTemplate(name, verificationUrl),
  })
  
  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  } 
}

const resetPasswordEmailTemplate = (name: string, url: string) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #111827;">
    <h2>Hi ${name},</h2>
    <p>We received a request to reset your password. Click the button below to set a new one.</p>
    <p style="color: #6B7280; font-size: 14px;">This link expires in 1 hour.</p>
 
    <a href="${url}" style="
      display: inline-block;
      margin: 16px 0;
      padding: 12px 24px;
      background: #DC2626;
      color: #fff;
      text-decoration: none;
      border-radius: 6px;
      font-weight: bold;
    ">
      Reset Password
    </a>
 
    <p style="font-size: 13px; color: #6B7280;">
      Or copy and paste this link into your browser:<br />
      <span style="word-break: break-all;">${url}</span>
    </p>
 
    <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;" />
    <p style="font-size: 12px; color: #9CA3AF;">
      If you didn't request a password reset, you can safely ignore this email — your password will not be changed.
    </p>
  </div>
`;
 
export const sendResetPasswordEmail = async (
  to: string,
  name: string,
  resetUrl: string
) => {
  const { error } = await resend.emails.send({
    from: `${env.APP_NAME} <${env.RESEND_FROM}>`,
    to,
    subject: 'Reset your password',
    html: resetPasswordEmailTemplate(name, resetUrl),
  });
 
  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }
};
 