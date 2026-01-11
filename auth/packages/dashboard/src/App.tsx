import { useIsAuthenticated, useMsal } from '@azure/msal-react';
import { InteractionStatus } from '@azure/msal-browser';
import { loginRequest } from './authConfig';

const APP_NAME = '📊 DASHBOARD';

const metrics = [
  { label: 'Total Users', value: '12,847', change: '+12.5%', positive: true },
  { label: 'Active Sessions', value: '3,421', change: '+8.2%', positive: true },
  { label: 'API Calls', value: '847K', change: '+23.1%', positive: true },
  { label: 'Error Rate', value: '0.12%', change: '-2.4%', positive: true },
];

const recentActivity = [
  { action: 'User login', user: 'john.doe@contoso.com', time: '2 min ago' },
  { action: 'Report generated', user: 'jane.smith@contoso.com', time: '5 min ago' },
  { action: 'Settings updated', user: 'admin@contoso.com', time: '12 min ago' },
  { action: 'New user created', user: 'hr@contoso.com', time: '1 hour ago' },
];

function App() {
  const { instance, accounts, inProgress } = useMsal();
  const isAuthenticated = useIsAuthenticated();

  console.log(`${APP_NAME}: Render - isAuthenticated:`, isAuthenticated, 'accounts:', accounts.length, 'inProgress:', inProgress);

  const handleLogin = () => {
    console.log(`${APP_NAME}: Login clicked`);
    // Using 'none' for silent SSO - will auto-login if user has a session at Microsoft
    instance.loginRedirect({
      ...loginRequest,
      prompt: 'none', // Silent SSO - no UI if already logged in
    }).catch((error) => {
      console.log(`${APP_NAME}: Silent login failed, trying interactive:`, error.errorCode);
      if (error.errorCode === 'login_required' || error.errorCode === 'interaction_required') {
        instance.loginRedirect(loginRequest);
      }
    });
  };

  const handleLogout = async () => {
    console.log(`${APP_NAME}: Logout clicked`);
    
    // Clear SSO tried flag so other apps will re-check
    sessionStorage.removeItem('sso-tried');
    
    await instance.logoutRedirect({
      postLogoutRedirectUri: 'http://localhost:3001',
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

  if (!isAuthenticated) {
    return (
      <div className="login-page">
        <div className="login-card">
          <span className="app-icon">📊</span>
          <h1>Dashboard</h1>
          <p>Sign in to view your analytics dashboard</p>
          <button onClick={handleLogin} className="btn btn-login">
            Sign In with Microsoft
          </button>
          <a href="http://localhost:3000" className="back-link">← Back to Catalogue</a>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-icon">📊</span>
            <h1>Dashboard</h1>
          </div>
          <nav className="nav">
            <a href="http://localhost:3000" className="nav-link">Catalogue</a>
            <a href="http://localhost:3002" className="nav-link">Reports</a>
            <a href="http://localhost:3003" className="nav-link">Settings</a>
          </nav>
          <div className="auth-section">
            <div className="user-info">
              <div className="user-avatar">
                {user?.name?.charAt(0) || user?.username?.charAt(0) || '?'}
              </div>
              <span className="user-name">{user?.name || 'User'}</span>
              <button onClick={handleLogout} className="btn btn-logout">
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="main">
        <section className="page-header">
          <h2>Analytics Overview</h2>
          <p>Welcome back, {user?.name?.split(' ')[0]}! Here's what's happening today.</p>
        </section>

        <section className="metrics-grid">
          {metrics.map((metric) => (
            <div key={metric.label} className="metric-card">
              <span className="metric-label">{metric.label}</span>
              <span className="metric-value">{metric.value}</span>
              <span className={`metric-change ${metric.positive ? 'positive' : 'negative'}`}>
                {metric.change}
              </span>
            </div>
          ))}
        </section>

        <section className="content-grid">
          <div className="chart-card">
            <h3>Traffic Overview</h3>
            <div className="chart-placeholder">
              <div className="bar-chart">
                <div className="bar" style={{ height: '60%' }}><span>Mon</span></div>
                <div className="bar" style={{ height: '80%' }}><span>Tue</span></div>
                <div className="bar" style={{ height: '45%' }}><span>Wed</span></div>
                <div className="bar" style={{ height: '90%' }}><span>Thu</span></div>
                <div className="bar" style={{ height: '70%' }}><span>Fri</span></div>
                <div className="bar" style={{ height: '40%' }}><span>Sat</span></div>
                <div className="bar" style={{ height: '55%' }}><span>Sun</span></div>
              </div>
            </div>
          </div>

          <div className="activity-card">
            <h3>Recent Activity</h3>
            <ul className="activity-list">
              {recentActivity.map((item, idx) => (
                <li key={idx} className="activity-item">
                  <div className="activity-dot"></div>
                  <div className="activity-content">
                    <span className="activity-action">{item.action}</span>
                    <span className="activity-user">{item.user}</span>
                  </div>
                  <span className="activity-time">{item.time}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <div className="sso-badge">
          <span>🔐</span> SSO Active — Signed in across all enterprise apps
        </div>
      </main>
    </div>
  );
}

export default App;
