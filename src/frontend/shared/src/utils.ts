// Global flag to prevent multiple redirects racing
let isRedirecting = false;

/**
 * Check if a redirect is in progress
 */
export function isRedirectInProgress(): boolean {
  return isRedirecting;
}

/**
 * Set redirect in progress flag
 */
export function setRedirectInProgress(value: boolean): void {
  isRedirecting = value;
}

/**
 * Clear all MSAL-related data from localStorage
 */
export function clearMsalCache(): void {
  const keys = Object.keys(localStorage).filter(k => k.startsWith('msal.'));
  keys.forEach(k => localStorage.removeItem(k));
  sessionStorage.clear();
  // Also clear any stale cookies
  clearStaleMsalCookies();
}

/**
 * Clear stale MSAL cookies that can cause authentication issues
 * These cookies are set during OAuth redirects but can become stale
 */
export function clearStaleMsalCookies(): void {
  // Get all cookies
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name] = cookie.split('=').map(c => c.trim());
    if (name.startsWith('msal.')) {
      // Delete the cookie by setting expiry to past
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    }
  }
}

/**
 * Redirect to the catalogue with an optional logout flag
 * Sets global flag to prevent other redirects from racing
 */
export function redirectToCatalogue(catalogueUrl: string, withLogout = false): void {
  if (isRedirecting) {
    console.log('[shared-auth] Redirect already in progress, skipping');
    return;
  }
  isRedirecting = true;
  const url = withLogout ? `${catalogueUrl}?logout=true` : catalogueUrl;
  console.log(`[shared-auth] Redirecting to catalogue: ${url}`);
  window.location.href = url;
}

/**
 * Check if the current URL has a logout query parameter
 */
export function hasLogoutParam(): boolean {
  const params = new URLSearchParams(window.location.search);
  return params.get('logout') === 'true';
}

/**
 * Clear the logout query parameter from the URL
 */
export function clearLogoutParam(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete('logout');
  window.history.replaceState({}, '', url.pathname + url.search);
}
