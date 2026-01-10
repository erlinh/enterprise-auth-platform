import { useNavigate } from 'react-router-dom';
import { Application } from '../api/client';
import styles from './AppCard.module.css';

interface AppCardProps {
  app: Application;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onLaunch: () => void;
  animationDelay?: number;
}

export default function AppCard({
  app,
  isFavorite,
  onToggleFavorite,
  onLaunch,
  animationDelay = 0,
}: AppCardProps) {
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate(`/app/${app.id}`);
  };

  const handleLaunch = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (app.accessLevel.canLaunch) {
      onLaunch();
    }
  };

  return (
    <article
      className={styles.card}
      style={{ animationDelay: `${animationDelay}ms` }}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleCardClick()}
    >
      <div className={styles.cardHeader}>
        <div className={styles.iconWrapper}>
          <AppIcon name={app.name} />
        </div>
        <button
          className={`${styles.favoriteBtn} ${isFavorite ? styles.isFavorite : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      </div>

      <div className={styles.cardBody}>
        <div className={styles.badges}>
          {app.isFeatured && <span className={styles.badgeFeatured}>Featured</span>}
          {app.isBeta && <span className={styles.badgeBeta}>Beta</span>}
          {!app.accessLevel.canLaunch && (
            <span className={styles.badgeNoAccess}>No Access</span>
          )}
        </div>
        <h3 className={styles.title}>{app.name}</h3>
        <p className={styles.description}>{app.description}</p>
        <span className={styles.category}>{app.category}</span>
      </div>

      <div className={styles.cardFooter}>
        <span className={styles.accessLevel}>
          {app.accessLevel.canAdmin ? '🔑 ' : ''}
          {app.accessLevel.permissionSummary}
        </span>
        <button 
          className={`${styles.launchBtn} ${!app.accessLevel.canLaunch ? styles.disabled : ''}`} 
          onClick={handleLaunch}
          disabled={!app.accessLevel.canLaunch}
          title={!app.accessLevel.canLaunch ? 'You do not have permission to launch this application' : 'Launch application'}
        >
          {app.accessLevel.canLaunch ? 'Launch' : 'Locked'}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            {app.accessLevel.canLaunch ? (
              <path d="M3 8h10M9 4l4 4-4 4" />
            ) : (
              <path d="M5 7V5a3 3 0 016 0v2M4 7h8a1 1 0 011 1v5a1 1 0 01-1 1H4a1 1 0 01-1-1V8a1 1 0 011-1z" />
            )}
          </svg>
        </button>
      </div>
    </article>
  );
}

function AppIcon({ name }: { name: string }) {
  // Generate a consistent color based on the app name
  const colors = [
    ['#6366f1', '#818cf8'],
    ['#22d3ee', '#67e8f9'],
    ['#10b981', '#34d399'],
    ['#f59e0b', '#fbbf24'],
    ['#ef4444', '#f87171'],
    ['#8b5cf6', '#a78bfa'],
  ];
  const colorIndex = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  const [color1, color2] = colors[colorIndex];

  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="12" fill={`url(#icon-${name.replace(/\s/g, '')})`} />
      <text
        x="24"
        y="28"
        textAnchor="middle"
        fill="white"
        fontSize="20"
        fontWeight="600"
        fontFamily="var(--font-sans)"
      >
        {name.charAt(0).toUpperCase()}
      </text>
      <defs>
        <linearGradient id={`icon-${name.replace(/\s/g, '')}`} x1="0" y1="0" x2="48" y2="48">
          <stop stopColor={color1} />
          <stop offset="1" stopColor={color2} />
        </linearGradient>
      </defs>
    </svg>
  );
}

