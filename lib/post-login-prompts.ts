const EMAIL_AUTH_SETUP_PENDING_KEY = "awp-pending-email-auth-setup";

export function markPendingEmailAuthSetupFromLogin() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(EMAIL_AUTH_SETUP_PENDING_KEY, "1");
  } catch {
    /* private mode */
  }
}

export function peekPendingEmailAuthSetupFromLogin(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(EMAIL_AUTH_SETUP_PENDING_KEY) === "1";
  } catch {
    return false;
  }
}

export function clearPendingEmailAuthSetupFromLogin() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(EMAIL_AUTH_SETUP_PENDING_KEY);
  } catch {
    /* private mode */
  }
}

/** Odświeża prompty zależne od sesji (powiadomienia itd.) po logowaniu bez odmontowywania layoutu. */
export function notifyPostLoginPromptsUpdated(opts?: { needsEmailAuthSetup?: boolean }) {
  if (typeof window === "undefined") return;
  if (opts?.needsEmailAuthSetup) {
    markPendingEmailAuthSetupFromLogin();
  }
  window.dispatchEvent(new Event("post-login-prompts-updated"));
}
