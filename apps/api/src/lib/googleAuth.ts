import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env';
import { UnauthorizedError } from '../errors';

const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);

export interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  picture?: string;
  emailVerified: boolean;
}

/**
 * Verifies a Google-issued ID token (obtained client-side via Google
 * Identity Services / One Tap) and extracts the user's profile.
 * Throws if the token is missing, expired, or was not issued for this app.
 */
export async function verifyGoogleIdToken(idToken: string): Promise<GoogleProfile> {
  let ticket;
  try {
    ticket = await client.verifyIdToken({ idToken, audience: env.GOOGLE_CLIENT_ID });
  } catch {
    throw new UnauthorizedError('Invalid or expired Google token');
  }

  const payload = ticket.getPayload();
  if (!payload || !payload.sub || !payload.email) {
    throw new UnauthorizedError('Invalid or expired Google token');
  }

  return {
    googleId: payload.sub,
    email: payload.email,
    name: payload.name ?? payload.email.split('@')[0],
    picture: payload.picture,
    emailVerified: payload.email_verified ?? false,
  };
}
