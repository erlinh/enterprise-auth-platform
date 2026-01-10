import { useAuth } from '../auth/useAuth';
import styles from './LoginPage.module.css';

export default function LoginPage() {
  const { login, isLoading } = useAuth();

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            <rect width="64" height="64" rx="16" fill="url(#login-logo-gradient)" />
            <path
              d="M20 32L28 40L44 24"
              stroke="white"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <defs>
              <linearGradient id="login-logo-gradient" x1="0" y1="0" x2="64" y2="64">
                <stop stopColor="#6366f1" />
                <stop offset="1" stopColor="#22d3ee" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <h1 className={styles.title}>Enterprise Platform</h1>
        <p className={styles.subtitle}>
          Access your organization's applications with Single Sign-On
        </p>

        <button
          className={styles.loginBtn}
          onClick={login}
          disabled={isLoading}
        >
          {isLoading ? (
            <span className={styles.spinner} />
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 21 21" fill="currentColor">
                <path d="M0 0h10v10H0V0zm11 0h10v10H11V0zM0 11h10v10H0V11zm11 0h10v10H11V11z" />
              </svg>
              Sign in with Microsoft
            </>
          )}
        </button>

        <p className={styles.hint}>
          Use your organizational account to sign in
        </p>
      </div>

      <div className={styles.features}>
        <div className={styles.feature}>
          <div className={styles.featureIcon}>🔐</div>
          <h3>Secure SSO</h3>
          <p>Single Sign-On powered by Microsoft Entra ID</p>
        </div>
        <div className={styles.feature}>
          <div className={styles.featureIcon}>🛡️</div>
          <h3>Fine-Grained Access</h3>
          <p>SpiceDB-powered authorization for precise control</p>
        </div>
        <div className={styles.feature}>
          <div className={styles.featureIcon}>🌐</div>
          <h3>B2B Federation</h3>
          <p>Access for partners and external organizations</p>
        </div>
      </div>
    </div>
  );
}

