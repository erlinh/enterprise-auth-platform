import { Link } from 'react-router-dom';
import styles from './DashboardPage.module.css';

export default function DashboardPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          <span className="text-gradient">Admin Dashboard</span>
        </h1>
        <p className={styles.subtitle}>
          Manage authorization relationships and test permissions
        </p>
      </header>

      <div className={styles.grid}>
        <Link to="/relationships" className={styles.card}>
          <div className={styles.cardIcon}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="currentColor">
              <path d="M14 10a5 5 0 11-10 0 5 5 0 0110 0zM28 10a5 5 0 11-10 0 5 5 0 0110 0zM21.5 28c.08-.535.12-1.08.12-1.636A11.47 11.47 0 0019.12 20C21.6 18.4 25.2 18 28 20c2.4 1.6 4 4.8 4 8v2H21.5zM10 18a8 8 0 018 8v2H2v-2a8 8 0 018-8z" />
            </svg>
          </div>
          <h3 className={styles.cardTitle}>Manage Relationships</h3>
          <p className={styles.cardDescription}>
            View, create, and delete SpiceDB relationships between users, organizations, and resources.
          </p>
          <span className={styles.cardAction}>
            Open →
          </span>
        </Link>

        <Link to="/permissions" className={styles.card}>
          <div className={styles.cardIcon}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="currentColor">
              <path fillRule="evenodd" d="M3.5 8A16.73 16.73 0 0016 3.1 16.73 16.73 0 0028.5 8c.18 1.06.27 2.16.27 3.27 0 8.52-5.45 15.78-13.04 18.47C8.13 27.05 2.73 19.79 2.73 11.27c0-1.11.09-2.21.27-3.27h.5zm18.8 6.05a1.64 1.64 0 00-2.3-2.3L14.4 17.3l-2.1-2.1a1.64 1.64 0 00-2.3 2.3l3.25 3.26c.64.64 1.67.64 2.3 0l6.55-6.55-.5.25.7-.41z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className={styles.cardTitle}>Permission Checker</h3>
          <p className={styles.cardDescription}>
            Test and debug authorization decisions by checking specific permissions for users.
          </p>
          <span className={styles.cardAction}>
            Open →
          </span>
        </Link>

        <div className={styles.card}>
          <div className={styles.cardIcon}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="currentColor">
              <path fillRule="evenodd" d="M16 3.2a12.8 12.8 0 100 25.6 12.8 12.8 0 000-25.6zM17.6 8a1.6 1.6 0 10-3.2 0v8c0 .424.168.831.469 1.131l4.8 4.8a1.6 1.6 0 102.262-2.262L17.6 15.338V8z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className={styles.cardTitle}>Audit Logs</h3>
          <p className={styles.cardDescription}>
            Review authorization decisions and relationship changes over time.
          </p>
          <span className={styles.cardAction} style={{ opacity: 0.5 }}>
            Coming Soon
          </span>
        </div>

        <div className={styles.card}>
          <div className={styles.cardIcon}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="currentColor">
              <path d="M5.6 4.8A1.6 1.6 0 004 6.4v19.2a1.6 1.6 0 001.6 1.6h20.8a1.6 1.6 0 001.6-1.6V6.4a1.6 1.6 0 00-1.6-1.6H5.6zM8 11.2a1.6 1.6 0 011.6-1.6h12.8a1.6 1.6 0 010 3.2H9.6A1.6 1.6 0 018 11.2zm1.6 4.8a1.6 1.6 0 000 3.2h8a1.6 1.6 0 000-3.2h-8z" />
            </svg>
          </div>
          <h3 className={styles.cardTitle}>Schema Viewer</h3>
          <p className={styles.cardDescription}>
            View and understand the SpiceDB authorization schema definitions.
          </p>
          <span className={styles.cardAction} style={{ opacity: 0.5 }}>
            Coming Soon
          </span>
        </div>
      </div>

      <section className={styles.stats}>
        <h2 className={styles.sectionTitle}>Platform Overview</h2>
        <div className={styles.statsGrid}>
          <div className={styles.stat}>
            <span className={styles.statValue}>7</span>
            <span className={styles.statLabel}>Namespaces</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>6</span>
            <span className={styles.statLabel}>Applications</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>∞</span>
            <span className={styles.statLabel}>Relationships</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>✓</span>
            <span className={styles.statLabel}>SpiceDB Connected</span>
          </div>
        </div>
      </section>
    </div>
  );
}

