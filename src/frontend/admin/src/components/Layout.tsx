import { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import styles from './Layout.module.css';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="url(#admin-logo-gradient)" />
            <path d="M16 8L20 12L16 16L12 12L16 8Z" fill="white" />
            <path d="M10 14L14 18L10 22L6 18L10 14Z" fill="white" opacity="0.8" />
            <path d="M22 14L26 18L22 22L18 18L22 14Z" fill="white" opacity="0.8" />
            <path d="M16 16L20 20L16 24L12 20L16 16Z" fill="white" opacity="0.6" />
            <defs>
              <linearGradient id="admin-logo-gradient" x1="0" y1="0" x2="32" y2="32">
                <stop stopColor="#f59e0b" />
                <stop offset="1" stopColor="#ef4444" />
              </linearGradient>
            </defs>
          </svg>
          <span className={styles.logoText}>Admin Portal</span>
        </div>

        <nav className={styles.nav}>
          <NavLink to="/" className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`} end>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
            Dashboard
          </NavLink>
          <NavLink to="/relationships" className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
            </svg>
            Relationships
          </NavLink>
          <NavLink to="/permissions" className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Permission Checker
          </NavLink>
        </nav>

        <div className={styles.userSection}>
          {user && (
            <>
              <div className={styles.userInfo}>
                <div className={styles.avatar}>
                  {user.name?.charAt(0).toUpperCase() || 'A'}
                </div>
                <div className={styles.userDetails}>
                  <span className={styles.userName}>{user.name}</span>
                  <span className={styles.userEmail}>{user.email}</span>
                </div>
              </div>
              <button onClick={logout} className={styles.logoutBtn}>
                Sign out
              </button>
            </>
          )}
        </div>
      </aside>

      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
}

