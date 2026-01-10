import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { catalogueApi, Application } from '../api/client';
import styles from './ApplicationDetailPage.module.css';

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [app, setApp] = useState<Application | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const loadApp = async () => {
      setIsLoading(true);
      try {
        const application = await catalogueApi.getApplication(id);
        setApp(application);
      } catch (err) {
        setError('Application not found');
      } finally {
        setIsLoading(false);
      }
    };

    loadApp();
  }, [id]);

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <p>Loading application...</p>
      </div>
    );
  }

  if (error || !app) {
    return (
      <div className={styles.error}>
        <h2>Application Not Found</h2>
        <p>{error}</p>
        <button onClick={() => navigate('/')}>Back to Catalogue</button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <button className={styles.backBtn} onClick={() => navigate('/')}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 10H5M5 10L10 5M5 10L10 15" />
        </svg>
        Back to Catalogue
      </button>

      <div className={styles.header}>
        <div className={styles.icon}>
          {app.name.charAt(0).toUpperCase()}
        </div>
        <div className={styles.headerInfo}>
          <div className={styles.badges}>
            {app.isFeatured && <span className={styles.badgeFeatured}>Featured</span>}
            {app.isBeta && <span className={styles.badgeBeta}>Beta</span>}
            <span className={styles.badgeCategory}>{app.category}</span>
          </div>
          <h1 className={styles.title}>{app.name}</h1>
          <p className={styles.description}>{app.description}</p>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.infoCard}>
          <h3>Access Level</h3>
          <div className={styles.accessInfo}>
            <div className={styles.accessItem}>
              <span className={styles.accessLabel}>Permission</span>
              <span className={styles.accessValue}>{app.accessLevel.permissionSummary}</span>
            </div>
            <div className={styles.accessItem}>
              <span className={styles.accessLabel}>Can Launch</span>
              <span className={`${styles.accessValue} ${app.accessLevel.canLaunch ? styles.yes : styles.no}`}>
                {app.accessLevel.canLaunch ? 'Yes' : 'No'}
              </span>
            </div>
            <div className={styles.accessItem}>
              <span className={styles.accessLabel}>Admin Access</span>
              <span className={`${styles.accessValue} ${app.accessLevel.canAdmin ? styles.yes : styles.no}`}>
                {app.accessLevel.canAdmin ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.infoCard}>
          <h3>Status</h3>
          <div className={styles.statusInfo}>
            <span className={`${styles.statusBadge} ${styles[app.status.toLowerCase()]}`}>
              {app.status}
            </span>
          </div>
        </div>
      </div>

      {!app.accessLevel.canLaunch && (
        <div className={styles.accessDenied}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M7 11V7a5 5 0 0110 0v4M5 11h14a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2v-7a2 2 0 012-2z" />
          </svg>
          <div>
            <h4>Access Restricted</h4>
            <p>You can view this application but don't have permission to launch it. Contact your administrator to request access.</p>
          </div>
        </div>
      )}

      <div className={styles.actions}>
        {app.accessLevel.canLaunch ? (
          <button onClick={() => navigate(`/launch/${app.id}`)} className={styles.launchBtn}>
            Launch Application
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 10h10M11 6l4 4-4 4" />
            </svg>
          </button>
        ) : (
          <button className={`${styles.launchBtn} ${styles.disabled}`} disabled>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9V7a4 4 0 018 0v2M4 9h12a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2v-6a2 2 0 012-2z" />
            </svg>
            Request Access
          </button>
        )}
      </div>
    </div>
  );
}

