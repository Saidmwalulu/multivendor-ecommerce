import Cookies from "js-cookie";

const ACCESS_TOKEN_COOKIE = "accessToken";

// Session cookie (no explicit expiry) — the access token itself expires in
// 15 minutes server-side regardless of this cookie's lifetime; the actual
// "stay logged in" mechanism is the httpOnly refreshToken cookie and the
// startup refresh call, not this cookie's expiry setting.
export function setAccessToken(token: string | null) {
  if (token) {
    Cookies.set(ACCESS_TOKEN_COOKIE, token, { sameSite: "lax" });
  } else {
    Cookies.remove(ACCESS_TOKEN_COOKIE);
  }
}

export function getAccessToken(): string | null {
  return Cookies.get(ACCESS_TOKEN_COOKIE) ?? null;
}