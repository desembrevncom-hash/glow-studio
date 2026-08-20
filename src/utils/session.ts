/**
 * Session ID utility for anonymous user render history
 */

const SESSION_STORAGE_KEY = 'studio_glow_session_id';

export function getSessionId(): string {
  try {
    let sessionId = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!sessionId) {
      sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
    }
    return sessionId;
  } catch (e) {
    // Fallback for SSR or disabled localStorage
    return 'default_anonymous_session';
  }
}
