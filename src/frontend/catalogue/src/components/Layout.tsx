import { ReactNode } from 'react';
import { useAuth } from '@platform/shared-auth';
import { loginRequest, apiRequest, CATALOGUE_URL, APP_NAME } from '../auth/config';
import styles from './Layout.module.css';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth({
    loginRequest,
    apiRequest,
    catalogueUrl: CATALOGUE_URL,
    appName: APP_NAME,
  });

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.logo}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="url(#logo-gradient)" />
              <path d="M10 16L14 20L22 12" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <defs>
                <linearGradient id="logo-gradient" x1="0" y1="0" x2="32" y2="32">
                  <stop stopColor="#6366f1" />
                  <stop offset="1" stopColor="#22d3ee" />
                </linearGradient>
              </defs>
            </svg>
            <span className={styles.logoText}>Enterprise Platform</span>
          </div>

          <nav className={styles.nav}>
            <a href="/" className={styles.navLink}>Catalogue</a>
          </nav>

          <div className={styles.userMenu}>
            {user && (
              <>
                <div className={styles.userInfo}>
                  <span className={styles.userName}>{user.name}</span>
                  <span className={styles.userEmail}>{user.email}</span>
                </div>
                <div className={styles.avatar}>
                  {user.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <button onClick={logout} className={styles.logoutBtn}>
                  Sign out
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className={styles.main}>
        {children}
      </main>

      <footer className={styles.footer}>
        <p>&copy; 2026 Enterprise Platform. Powered by Entra ID + SpiceDB.</p>
      </footer>
    </div>
  );
}

