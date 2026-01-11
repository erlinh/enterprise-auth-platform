import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { catalogueApi, Application } from '../api/client';
import styles from './LaunchPage.module.css';

export default function LaunchPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [app, setApp] = useState<Application | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!id) return;

    const loadApp = async () => {
      setIsLoading(true);
      try {
        const application = await catalogueApi.getApplication(id);
        if (!application) {
          setError('Application not found or you do not have access');
        } else if (!application.accessLevel.canLaunch) {
          setError('You do not have permission to launch this application');
        } else {
          setApp(application);
        }
      } catch (err) {
        setError('Application not found or you do not have access');
      } finally {
        setIsLoading(false);
      }
    };

    loadApp();
  }, [id]);

  // Countdown timer and open in new tab
  useEffect(() => {
    if (!app || error) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Open app in new tab and go back to catalogue
          if (app.launchUrl.startsWith('http')) {
            window.open(app.launchUrl, '_blank', 'noopener,noreferrer');
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [app, error]);

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.spinner} />
          <p>Verifying access...</p>
        </div>
      </div>
    );
  }

  if (error || !app) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.errorIcon}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
          </div>
          <h1 className={styles.errorTitle}>Access Denied</h1>
          <p className={styles.errorMessage}>{error}</p>
          <button className={styles.backBtn} onClick={() => navigate('/')}>
            Return to Catalogue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.appIcon}>
          {app.name.charAt(0).toUpperCase()}
        </div>
        
        <h1 className={styles.title}>Launching {app.name}</h1>
        
        <div className={styles.status}>
          {countdown > 0 ? (
            <>
              <div className={styles.loadingRing}>
                <div className={styles.ring} />
              </div>
              <p className={styles.statusText}>
                Initializing secure session...
              </p>
              <p className={styles.countdown}>
                Opening in new tab in {countdown}s
              </p>
            </>
          ) : (
            <>
              <div className={styles.checkmark}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <path d="M22 4L12 14.01l-3-3" />
                </svg>
              </div>
              <p className={styles.statusText}>App opened in new tab!</p>
            </>
          )}
        </div>

        <div className={styles.infoCard}>
          <h3>SSO Session Active</h3>
          <p>
            Your authenticated session is being transferred to:
          </p>
          <code className={styles.url}>{app.launchUrl}</code>
          <p className={styles.note}>
            You will be signed in automatically using your Microsoft Entra ID credentials.
          </p>
        </div>

        <div className={styles.accessInfo}>
          <div className={styles.accessBadge}>
            <span className={styles.accessIcon}>✓</span>
            <span>Access Level: {app.accessLevel.permissionSummary}</span>
          </div>
          {app.accessLevel.canAdmin && (
            <div className={styles.accessBadge}>
              <span className={styles.accessIcon}>🔑</span>
              <span>Admin Access Enabled</span>
            </div>
          )}
        </div>

        <div className={styles.actions}>
          <button className={styles.backBtn} onClick={() => navigate('/')}>
            Back to Catalogue
          </button>
          {app.launchUrl.startsWith('http') && (
            <button 
              className={styles.launchNowBtn} 
              onClick={() => window.open(app.launchUrl, '_blank', 'noopener,noreferrer')}
            >
              Open in New Tab →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
