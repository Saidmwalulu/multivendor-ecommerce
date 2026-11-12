import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
    private resend: Resend;

  constructor(private config: ConfigService) {
    this.resend = new Resend(this.config.get('EMAIL_API_KEY'));
  }

  async sendVerificationEmail(to: string, link: string) {
    await this.resend.emails.send({
      from: this.config.get('EMAIL_FROM')!,
      to,
      subject: 'Verify your email',
      html: `<p>Click <a href="${link}">here</a> to verify your email. This link expires in 24 hours.</p>`,
    });
  }

  async sendPasswordResetEmail(to: string, link: string) {
    await this.resend.emails.send({
      from: this.config.get('EMAIL_FROM')!,
      to,
      subject: 'Reset your password',
      html: `<p>Click <a href="${link}">here</a> to reset your password. This link expires in 30 minutes.</p>`,
    });
  }
}
