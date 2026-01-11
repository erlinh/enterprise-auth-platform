import React from 'react';
import ReactDOM from 'react-dom/client';
import { PublicClientApplication, EventType } from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
import App from './App';
import { msalConfig } from './authConfig';
import './index.css';

const APP_NAME = '🏢 CATALOGUE';

console.log(`${APP_NAME}: Initializing MSAL...`);

const msalInstance = new PublicClientApplication(msalConfig);

// Clear all MSAL cache
function clearMsalCache() {
  console.log(`${APP_NAME}: Clearing MSAL cache...`);
  Object.keys(localStorage).filter(k => k.toLowerCase().includes('msal')).forEach(k => localStorage.removeItem(k));
  Object.keys(sessionStorage).filter(k => k.toLowerCase().includes('msal')).forEach(k => sessionStorage.removeItem(k));
}

msalInstance.initialize().then(async () => {
  console.log(`${APP_NAME}: MSAL initialized`);
  
  let justVerified = false;
  
  // Handle redirect response first
  try {
    const response = await msalInstance.handleRedirectPromise();
    if (response) {
      console.log(`${APP_NAME}: Handled redirect, account:`, response.account?.username);
      msalInstance.setActiveAccount(response.account);
      justVerified = true; // We just came back from Microsoft successfully
    }
  } catch (error: any) {
    console.log(`${APP_NAME}: handleRedirectPromise error:`, error.errorCode);
    // If login_required, the Microsoft session is gone - clear local cache
    if (error.errorCode === 'login_required' || error.errorCode === 'interaction_required') {
      console.log(`${APP_NAME}: Microsoft session expired, clearing cache`);
      clearMsalCache();
    }
    justVerified = true; // We just came back from Microsoft (even if failed)
  }
  
  const accounts = msalInstance.getAllAccounts();
  console.log(`${APP_NAME}: Found ${accounts.length} cached accounts`, accounts.map(a => a.username));
  
  if (accounts.length > 0) {
    if (!justVerified) {
      // Have cached accounts but didn't just come back from Microsoft - verify!
      console.log(`${APP_NAME}: Cached accounts exist, verifying with Microsoft...`);
      try {
        await msalInstance.loginRedirect({
          scopes: ['User.Read', 'openid', 'profile', 'email'],
          prompt: 'none', // Silent check - no UI if session is valid
        });
        return; // Redirecting
      } catch (e) {
        console.log(`${APP_NAME}: Verification redirect failed`);
      }
    } else {
      // Just came back from Microsoft successfully
      msalInstance.setActiveAccount(accounts[0]);
      console.log(`${APP_NAME}: Set active account:`, accounts[0].username);
    }
  }
  // Catalogue is the main entry - don't auto-SSO, show login button

  msalInstance.addEventCallback((event) => {
    console.log(`${APP_NAME}: MSAL Event:`, event.eventType);
    
    if (event.eventType === EventType.LOGIN_SUCCESS && event.payload) {
      const payload = event.payload as { account: any };
      msalInstance.setActiveAccount(payload.account);
    }
  });

  console.log(`${APP_NAME}: localStorage keys:`, Object.keys(localStorage).filter(k => k.includes('msal')));

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <MsalProvider instance={msalInstance}>
        <App />
      </MsalProvider>
    </React.StrictMode>
  );
});
