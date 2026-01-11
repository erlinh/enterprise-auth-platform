import React from 'react';
import ReactDOM from 'react-dom/client';
import { PublicClientApplication, EventType, EventMessage, AuthenticationResult } from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
import { msalConfig } from './auth/config';
import App from './App';
import './index.css';

const APP_NAME = 'Reporting';
const CATALOGUE_URL = 'http://localhost:3000';

console.log(`[${APP_NAME} main.tsx] Starting - URL:`, window.location.href);
console.log(`[${APP_NAME} main.tsx] Query params:`, window.location.search);
console.log(`[${APP_NAME} main.tsx] localStorage msal keys:`, Object.keys(localStorage).filter(k => k.startsWith('msal.')));

// Check for logout parameter EARLY - BEFORE creating MSAL instance!
// This handles the case where we navigate here after another app logged out
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('logout') === 'true') {
  console.log(`[${APP_NAME} main.tsx] *** LOGOUT PARAM DETECTED - CLEARING ALL STORAGE ***`);
  localStorage.clear();
  sessionStorage.clear();
  // Clear logout param from URL and redirect to catalogue
  window.location.href = `${CATALOGUE_URL}?logout=true`;
  // Stop execution - the redirect will happen
  throw new Error('Redirecting to catalogue for logout');
}

// Clear stale MSAL cookies that can cause auth issues
function clearStaleMsalCookies(): void {
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name] = cookie.split('=').map(c => c.trim());
    if (name.startsWith('msal.')) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    }
  }
}

// Clear stale cookies on app start
clearStaleMsalCookies();

console.log(`[${APP_NAME} main.tsx] Creating MSAL instance...`);
const msalInstance = new PublicClientApplication(msalConfig);

// Initialize MSAL and handle redirect before rendering
async function initializeMsal() {
  await msalInstance.initialize();
  
  // Handle redirect promise FIRST - this processes the OAuth response
  try {
    const response = await msalInstance.handleRedirectPromise();
    if (response) {
      console.log('[Reporting] Login redirect completed successfully');
      msalInstance.setActiveAccount(response.account);
    }
  } catch (error) {
    console.error('[Reporting] Error handling redirect:', error);
    // Clear cache on error and try again
    clearStaleMsalCookies();
  }

  // Set active account if one exists
  const accounts = msalInstance.getAllAccounts();
  if (accounts.length > 0 && !msalInstance.getActiveAccount()) {
    msalInstance.setActiveAccount(accounts[0]);
  }

  // Listen for login events
  msalInstance.addEventCallback((event: EventMessage) => {
    if (event.eventType === EventType.LOGIN_SUCCESS && event.payload) {
      const payload = event.payload as AuthenticationResult;
      msalInstance.setActiveAccount(payload.account);
    }
  });

  // Now render the app
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <MsalProvider instance={msalInstance}>
        <App />
      </MsalProvider>
    </React.StrictMode>
  );
}

initializeMsal();
