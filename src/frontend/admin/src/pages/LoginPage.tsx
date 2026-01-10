import { useAuth } from '../auth/useAuth';
import styles from './LoginPage.module.css';

export default function LoginPage() {
  const { login, isLoading } = useAuth();

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            <rect width="64" height="64" rx="16" fill="url(#admin-login-logo)" />
            <path d="M32 16L40 24L32 32L24 24L32 16Z" fill="white" />
            <path d="M20 28L28 36L20 44L12 36L20 28Z" fill="white" opacity="0.8" />
            <path d="M44 28L52 36L44 44L36 36L44 28Z" fill="white" opacity="0.8" />
            <path d="M32 32L40 40L32 48L24 40L32 32Z" fill="white" opacity="0.6" />
            <defs>
              <linearGradient id="admin-login-logo" x1="0" y1="0" x2="64" y2="64">
                <stop stopColor="#f59e0b" />
                <stop offset="1" stopColor="#ef4444" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <h1 className={styles.title}>Admin Portal</h1>
        <p className={styles.subtitle}>
          Manage permissions and authorization relationships
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

        <p className={styles.warning}>
          ⚠️ Admin access required. Only authorized administrators can sign in.
        </p>
      </div>
    </div>
  );
}

