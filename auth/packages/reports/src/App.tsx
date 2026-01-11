import { useIsAuthenticated, useMsal } from '@azure/msal-react';
import { InteractionStatus } from '@azure/msal-browser';
import { loginRequest } from './authConfig';

const APP_NAME = '📋 REPORTS';

const reports = [
  { id: 1, name: 'Q4 Sales Report', type: 'Sales', date: '2024-01-15', status: 'completed' },
  { id: 2, name: 'Monthly Active Users', type: 'Analytics', date: '2024-01-14', status: 'completed' },
  { id: 3, name: 'Security Audit 2024', type: 'Security', date: '2024-01-12', status: 'completed' },
  { id: 4, name: 'API Performance Report', type: 'Technical', date: '2024-01-10', status: 'completed' },
  { id: 5, name: 'Customer Satisfaction Survey', type: 'Customer', date: '2024-01-08', status: 'pending' },
  { id: 6, name: 'Annual Revenue Summary', type: 'Finance', date: '2024-01-05', status: 'completed' },
];

const reportTypes = ['All', 'Sales', 'Analytics', 'Security', 'Technical', 'Customer', 'Finance'];

function App() {
  const { instance, accounts, inProgress } = useMsal();
  const isAuthenticated = useIsAuthenticated();

  console.log(`${APP_NAME}: Render - isAuthenticated:`, isAuthenticated, 'accounts:', accounts.length, 'inProgress:', inProgress);

  const handleLogin = () => {
    console.log(`${APP_NAME}: Login clicked`);
    instance.loginRedirect({
      ...loginRequest,
      prompt: 'none',
    }).catch((error) => {
      console.log(`${APP_NAME}: Silent login failed, trying interactive:`, error.errorCode);
      if (error.errorCode === 'login_required' || error.errorCode === 'interaction_required') {
        instance.loginRedirect(loginRequest);
      }
    });
  };

  const handleLogout = async () => {
    console.log(`${APP_NAME}: Logout clicked`);
    sessionStorage.removeItem('sso-tried');
    await instance.logoutRedirect({
      postLogoutRedirectUri: 'http://localhost:3002',
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
          <span className="app-icon">📋</span>
          <h1>Reports</h1>
          <p>Sign in to view and generate reports</p>
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
            <span className="logo-icon">📋</span>
            <h1>Reports</h1>
          </div>
          <nav className="nav">
            <a href="http://localhost:3000" className="nav-link">Catalogue</a>
            <a href="http://localhost:3001" className="nav-link">Dashboard</a>
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
          <div className="page-header-content">
            <div>
              <h2>Reports Center</h2>
              <p>View and generate reports for your organization</p>
            </div>
            <button className="btn btn-primary">+ New Report</button>
          </div>
        </section>

        <section className="filters">
          <div className="filter-tabs">
            {reportTypes.map((type) => (
              <button
                key={type}
                className={`filter-tab ${type === 'All' ? 'active' : ''}`}
              >
                {type}
              </button>
            ))}
          </div>
          <div className="search-box">
            <input type="text" placeholder="Search reports..." />
          </div>
        </section>

        <section className="reports-table">
          <table>
            <thead>
              <tr>
                <th>Report Name</th>
                <th>Type</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id}>
                  <td className="report-name">{report.name}</td>
                  <td>
                    <span className="type-badge">{report.type}</span>
                  </td>
                  <td className="report-date">{report.date}</td>
                  <td>
                    <span className={`status-badge ${report.status}`}>
                      {report.status}
                    </span>
                  </td>
                  <td className="actions">
                    <button className="action-btn">View</button>
                    <button className="action-btn">Download</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <div className="sso-badge">
          <span>🔐</span> SSO Active — Signed in across all enterprise apps
        </div>
      </main>
    </div>
  );
}

export default App;
