import { useIsAuthenticated, useMsal } from '@azure/msal-react';
import { InteractionStatus } from '@azure/msal-browser';
import { loginRequest, appLinks } from './authConfig';

const APP_NAME = '🏢 CATALOGUE';

function App() {
  const { instance, accounts, inProgress } = useMsal();
  const isAuthenticated = useIsAuthenticated();

  console.log(`${APP_NAME}: Render - isAuthenticated:`, isAuthenticated, 'accounts:', accounts.length, 'inProgress:', inProgress);

  const handleLogin = () => {
    console.log(`${APP_NAME}: Login clicked`);
    // Use prompt: 'select_account' to show account picker, or 'none' for silent
    instance.loginRedirect({
      ...loginRequest,
      prompt: 'select_account', // Change to 'none' for silent SSO (will fail if not logged in)
    });
  };

  const handleLogout = async () => {
    console.log(`${APP_NAME}: Logout clicked`);
    await instance.logoutRedirect({
      postLogoutRedirectUri: 'http://localhost:3000',
    });
  };

  const user = accounts[0];

  if (inProgress === InteractionStatus.Login || inProgress === InteractionStatus.Logout) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Processing authentication...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-icon">🏢</span>
            <h1>Enterprise Hub</h1>
          </div>
          <div className="auth-section">
            {isAuthenticated ? (
              <div className="user-info">
                <div className="user-avatar">
                  {user?.name?.charAt(0) || user?.username?.charAt(0) || '?'}
                </div>
                <div className="user-details">
                  <span className="user-name">{user?.name || 'User'}</span>
                  <span className="user-email">{user?.username}</span>
                </div>
                <button onClick={handleLogout} className="btn btn-logout">
                  Sign Out
                </button>
              </div>
            ) : (
              <button onClick={handleLogin} className="btn btn-login">
                Sign In with Microsoft
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="main">
        {isAuthenticated ? (
          <>
            <section className="welcome-section">
              <h2>Welcome back, {user?.name?.split(' ')[0] || 'User'}!</h2>
              <p>Select an application to continue</p>
            </section>

            <section className="apps-grid">
              {appLinks.map((app) => (
                <a
                  key={app.name}
                  href={`http://localhost:${app.port}`}
                  className="app-card"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <div className="app-icon">{app.icon}</div>
                  <h3>{app.name}</h3>
                  <p>{app.description}</p>
                  <span className="app-link">Open →</span>
                </a>
              ))}
            </section>

            <section className="sso-info">
              <div className="info-card">
                <h3>🔐 Single Sign-On Active</h3>
                <p>You're signed in across all enterprise applications. Opening any app above will automatically authenticate you with the same session.</p>
              </div>
            </section>
          </>
        ) : (
          <section className="hero">
            <div className="hero-content">
              <h2>Enterprise Application Portal</h2>
              <p>Access all your enterprise applications with a single sign-on. Sign in once to access Dashboard, Reports, and Settings seamlessly.</p>
              <button onClick={handleLogin} className="btn btn-hero">
                Get Started
              </button>
            </div>
            <div className="hero-features">
              <div className="feature">
                <span>🔒</span>
                <h4>Secure Access</h4>
                <p>Microsoft Entra ID authentication</p>
              </div>
              <div className="feature">
                <span>🔄</span>
                <h4>Single Sign-On</h4>
                <p>One login for all applications</p>
              </div>
              <div className="feature">
                <span>⚡</span>
                <h4>Instant Access</h4>
                <p>Seamless app switching</p>
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="footer">
        <p>Enterprise SSO Demo • Powered by Microsoft Entra ID</p>
      </footer>
    </div>
  );
}

export default App;
