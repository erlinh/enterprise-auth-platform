import React from 'react';
import ReactDOM from 'react-dom/client';
import { PublicClientApplication, EventType } from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
import App from './App';
import { msalConfig } from './authConfig';
import './index.css';

const APP_NAME = '⚙️ SETTINGS';

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
      justVerified = true;
    }
  } catch (error: any) {
    console.log(`${APP_NAME}: handleRedirectPromise error:`, error.errorCode);
    if (error.errorCode === 'login_required' || error.errorCode === 'interaction_required') {
      console.log(`${APP_NAME}: Microsoft session expired, clearing cache`);
      clearMsalCache();
    }
    justVerified = true;
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
          prompt: 'none',
        });
        return;
      } catch (e) {
        console.log(`${APP_NAME}: Verification redirect failed`);
      }
    } else {
      msalInstance.setActiveAccount(accounts[0]);
      console.log(`${APP_NAME}: Set active account:`, accounts[0].username);
    }
  } else if (!justVerified) {
    // No local accounts - try silent SSO
    console.log(`${APP_NAME}: No accounts, attempting silent SSO...`);
    try {
      await msalInstance.loginRedirect({
        scopes: ['User.Read', 'openid', 'profile', 'email'],
        prompt: 'none',
      });
      return;
    } catch (e) {
      console.log(`${APP_NAME}: Silent SSO redirect failed`);
    }
  } else {
    console.log(`${APP_NAME}: Not logged in, showing login page`);
  }

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
