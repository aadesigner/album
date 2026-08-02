const SITE_KEY = process.env.RECAPTCHA_SITE_KEY ?? "";
const SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY ?? "";
const LOGIN_ENABLED = process.env.RECAPTCHA_LOGIN_ENABLED === "true";
const REGISTER_ENABLED = process.env.RECAPTCHA_REGISTER_ENABLED === "true";

export const recaptchaConfig = {
  siteKey: SITE_KEY,
  loginEnabled: LOGIN_ENABLED && !!SITE_KEY,
  registerEnabled: REGISTER_ENABLED && !!SITE_KEY,
} as const;

/**
 * Verify a reCAPTCHA v3 token against Google's siteverify API.
 * Returns true when verification passes OR when the secret key is not configured
 * (so local dev works without credentials).
 */
export async function verifyRecaptchaToken(
  token: string,
  minScore = 0.5,
): Promise<boolean> {
  if (!SECRET_KEY) return true; // not configured — pass through

  try {
    const resp = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `secret=${encodeURIComponent(SECRET_KEY)}&response=${encodeURIComponent(token)}`,
      },
    );
    if (!resp.ok) return false;
    const data = (await resp.json()) as { success: boolean; score?: number };
    return data.success && (data.score ?? 0) >= minScore;
  } catch {
    // Network failure — fail open to avoid locking out legitimate users
    return true;
  }
}
