import crypto from 'crypto';

/**
 * Generates a cryptographically secure random token.
 * Returns both the raw token (sent to the user via email/link) and its
 * SHA-256 hash (what gets persisted in the database). Storing only the hash
 * means a database leak does not expose usable tokens.
 */
export function generateSecureToken(): { rawToken: string; hashedToken: string } {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = hashToken(rawToken);
  return { rawToken, hashedToken };
}

export function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}
