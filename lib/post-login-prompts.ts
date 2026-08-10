/** Odświeża prompty zależne od sesji (powiadomienia itd.) po logowaniu bez odmontowywania layoutu. */
export function notifyPostLoginPromptsUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("post-login-prompts-updated"));
  }
}
