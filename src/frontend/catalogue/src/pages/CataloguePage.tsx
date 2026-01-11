import { useState, useEffect } from 'react';
import { catalogueApi, Application } from '../api/client';
import AppCard from '../components/AppCard';
import styles from './CataloguePage.module.css';

export default function CataloguePage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedCategory]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [appsResponse, favoritesResponse, categoriesResponse] = await Promise.all([
        catalogueApi.getApplications(selectedCategory || undefined),
        catalogueApi.getFavorites().catch(() => ({ applicationIds: [] })),
        catalogueApi.getCategories(),
      ]);

      setApplications(appsResponse.applications);
      setFavorites(favoritesResponse.applicationIds);
      setCategories(categoriesResponse);
    } catch (err) {
      console.error('Failed to load catalogue:', err);
      setError('Failed to load applications. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleFavorite = async (appId: string) => {
    const isFavorite = favorites.includes(appId);

    // Optimistic update
    setFavorites((prev) =>
      isFavorite ? prev.filter((id) => id !== appId) : [...prev, appId]
    );

    try {
      if (isFavorite) {
        await catalogueApi.removeFavorite(appId);
      } else {
        await catalogueApi.addFavorite(appId);
      }
    } catch (err) {
      // Revert on error
      setFavorites((prev) =>
        isFavorite ? [...prev, appId] : prev.filter((id) => id !== appId)
      );
    }
  };

  const handleLaunch = (app: Application) => {
    // Open app directly in new tab
    if (app.launchUrl.startsWith('http')) {
      window.open(app.launchUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const filteredApps = applications.filter((app) =>
    app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const favoriteApps = filteredApps.filter((app) => favorites.includes(app.id));
  const otherApps = filteredApps.filter((app) => !favorites.includes(app.id));

  if (error) {
    return (
      <div className={styles.error}>
        <p>{error}</p>
        <button onClick={loadData}>Retry</button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>
            <span className="text-gradient">Application Catalogue</span>
          </h1>
          <p className={styles.subtitle}>
            Discover and launch the applications you have access to
          </p>
        </div>

        <div className={styles.controls}>
          <div className={styles.searchWrapper}>
            <svg className={styles.searchIcon} width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="9" cy="9" r="6" />
              <path d="M13.5 13.5L18 18" />
            </svg>
            <input
              type="text"
              placeholder="Search applications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className={styles.categorySelect}
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </header>

      {isLoading ? (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Loading applications...</p>
        </div>
      ) : (
        <>
          {favoriteApps.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <span>⭐</span> Favorites
              </h2>
              <div className={styles.grid}>
                {favoriteApps.map((app, index) => (
                  <AppCard
                    key={app.id}
                    app={app}
                    isFavorite={true}
                    onToggleFavorite={() => handleToggleFavorite(app.id)}
                    onLaunch={() => handleLaunch(app)}
                    animationDelay={index * 50}
                  />
                ))}
              </div>
            </section>
          )}

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              {selectedCategory || 'All Applications'}
              <span className={styles.count}>{otherApps.length}</span>
            </h2>
            {otherApps.length === 0 ? (
              <div className={styles.empty}>
                <p>No applications found</p>
              </div>
            ) : (
              <div className={styles.grid}>
                {otherApps.map((app, index) => (
                  <AppCard
                    key={app.id}
                    app={app}
                    isFavorite={false}
                    onToggleFavorite={() => handleToggleFavorite(app.id)}
                    onLaunch={() => handleLaunch(app)}
                    animationDelay={(favoriteApps.length + index) * 50}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

