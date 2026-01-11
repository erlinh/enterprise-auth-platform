import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MsalProvider } from '@azure/msal-react';
import { PublicClientApplication, EventType, EventMessage, AuthenticationResult } from '@azure/msal-browser';
import { msalConfig } from './auth/config';
import App from './App';
import './index.css';

console.log('[Catalogue main.tsx] Starting - URL:', window.location.href);
console.log('[Catalogue main.tsx] Query params:', window.location.search);
console.log('[Catalogue main.tsx] localStorage msal keys:', Object.keys(localStorage).filter(k => k.startsWith('msal.')));

// Clear stale MSAL cookies that can cause auth issues
function clearStaleMsalCookies(): void {
  const cookies = document.cookie.split(';');
  let cleared = 0;
  for (const cookie of cookies) {
    const [name] = cookie.split('=').map(c => c.trim());
    if (name.startsWith('msal.')) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      cleared++;
    }
  }
  if (cleared > 0) {
    console.log(`[Catalogue main.tsx] Cleared ${cleared} stale MSAL cookies`);
  }
}

// Check for logout parameter EARLY - BEFORE creating MSAL instance!
// This is critical because PublicClientApplication reads localStorage in its constructor
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('logout') === 'true') {
  console.log('[Catalogue main.tsx] *** LOGOUT PARAM DETECTED - CLEARING ALL STORAGE BEFORE MSAL INIT ***');
  console.log('[Catalogue main.tsx] ALL localStorage keys before clear:', Object.keys(localStorage));
  console.log('[Catalogue main.tsx] ALL sessionStorage keys before clear:', Object.keys(sessionStorage));
  
  // Clear ALL localStorage and sessionStorage - MSAL might use keys we don't know about
  localStorage.clear();
  sessionStorage.clear();
  clearStaleMsalCookies();
  
  console.log('[Catalogue main.tsx] ALL localStorage keys after clear:', Object.keys(localStorage));
  console.log('[Catalogue main.tsx] ALL sessionStorage keys after clear:', Object.keys(sessionStorage));
  
  // Clear the logout param from URL
  urlParams.delete('logout');
  const newUrl = urlParams.toString() ? `${window.location.pathname}?${urlParams}` : window.location.pathname;
  window.history.replaceState({}, '', newUrl);
  console.log('[Catalogue main.tsx] URL updated to:', window.location.href);
}

// Clear stale cookies on app start
clearStaleMsalCookies();

// NOW create the MSAL instance - it will read the (now cleared) localStorage
console.log('[Catalogue main.tsx] Creating MSAL instance...');
console.log('[Catalogue main.tsx] localStorage msal keys at MSAL creation:', Object.keys(localStorage).filter(k => k.startsWith('msal.')));
const msalInstance = new PublicClientApplication(msalConfig);

// Initialize MSAL and handle redirect before rendering
async function initializeMsal() {
  console.log('[Catalogue main.tsx] Initializing MSAL...');
  await msalInstance.initialize();
  console.log('[Catalogue main.tsx] MSAL initialized');
  
  // Handle redirect promise FIRST - this processes the OAuth response
  try {
    const response = await msalInstance.handleRedirectPromise();
    if (response) {
      console.log('[Catalogue main.tsx] Login redirect completed successfully for:', response.account?.username);
      msalInstance.setActiveAccount(response.account);
    } else {
      console.log('[Catalogue main.tsx] No redirect response (normal page load)');
    }
  } catch (error) {
    console.error('[Catalogue main.tsx] Error handling redirect:', error);
    // Clear cache on error and try again
    clearStaleMsalCookies();
  }

  // Set active account if one exists
  const accounts = msalInstance.getAllAccounts();
  console.log('[Catalogue main.tsx] Accounts found:', accounts.length, accounts.map(a => a.username));
  
  if (accounts.length > 0 && !msalInstance.getActiveAccount()) {
    console.log('[Catalogue main.tsx] Setting active account:', accounts[0].username);
    msalInstance.setActiveAccount(accounts[0]);
  }

  // Listen for login events
  msalInstance.addEventCallback((event: EventMessage) => {
    console.log('[Catalogue main.tsx] MSAL event:', event.eventType);
    if (event.eventType === EventType.LOGIN_SUCCESS && event.payload) {
      const payload = event.payload as AuthenticationResult;
      console.log('[Catalogue main.tsx] Login success for:', payload.account?.username);
      msalInstance.setActiveAccount(payload.account);
    }
  });

  console.log('[Catalogue main.tsx] Rendering app...');
  
  // Now render the app
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <MsalProvider instance={msalInstance}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </MsalProvider>
    </React.StrictMode>
  );
}

initializeMsal();