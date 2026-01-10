import { useState } from 'react';
import { authzApi, CheckPermissionRequest, CheckPermissionResult } from '../api/client';
import styles from './PermissionCheckerPage.module.css';

const RESOURCE_TYPES = [
  'platform',
  'organization',
  'department',
  'application',
  'analytics_dashboard',
  'docmgr_document',
  'docmgr_folder',
  'reporting_endpoint',
];

const COMMON_PERMISSIONS: Record<string, string[]> = {
  platform: ['manage_all', 'manage_organizations', 'view_audit_logs'],
  organization: ['manage_org', 'admin_access', 'invite_members', 'view_members', 'is_member'],
  department: ['admin_access', 'view_members', 'is_member'],
  application: ['can_view_in_catalogue', 'can_launch', 'manage'],
  analytics_dashboard: ['view', 'edit', 'delete', 'share', 'export'],
  docmgr_document: ['view', 'edit', 'delete', 'comment', 'share'],
  docmgr_folder: ['view', 'edit', 'delete', 'create_document', 'manage'],
  reporting_endpoint: ['invoke', 'read_data', 'write_data', 'admin'],
};

export default function PermissionCheckerPage() {
  const [request, setRequest] = useState<CheckPermissionRequest>({
    resourceType: RESOURCE_TYPES[0],
    resourceId: '',
    permission: '',
    subjectType: 'user',
    subjectId: '',
  });

  const [result, setResult] = useState<CheckPermissionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const checkResult = await authzApi.checkPermission(request);
      setResult(checkResult);
    } catch (err) {
      setError('Failed to check permission');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const availablePermissions = COMMON_PERMISSIONS[request.resourceType] || [];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          <span className="text-gradient">Permission Checker</span>
        </h1>
        <p className={styles.subtitle}>
          Test authorization decisions by checking specific permissions
        </p>
      </header>

      <div className={styles.content}>
        <form onSubmit={handleCheck} className={styles.form}>
          <div className={styles.section}>
            <h3>Resource</h3>
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label>Type</label>
                <select
                  value={request.resourceType}
                  onChange={(e) =>
                    setRequest({
                      ...request,
                      resourceType: e.target.value,
                      permission: '',
                    })
                  }
                >
                  {RESOURCE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label>ID</label>
                <input
                  type="text"
                  placeholder="e.g., org-123, doc-456"
                  value={request.resourceId}
                  onChange={(e) =>
                    setRequest({ ...request, resourceId: e.target.value })
                  }
                  required
                />
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <h3>Permission</h3>
            <div className={styles.field}>
              <label>Permission to check</label>
              <select
                value={request.permission}
                onChange={(e) =>
                  setRequest({ ...request, permission: e.target.value })
                }
                required
              >
                <option value="">Select a permission...</option>
                {availablePermissions.map((perm) => (
                  <option key={perm} value={perm}>
                    {perm}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.section}>
            <h3>Subject</h3>
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label>Type</label>
                <select
                  value={request.subjectType}
                  onChange={(e) =>
                    setRequest({ ...request, subjectType: e.target.value })
                  }
                >
                  <option value="user">user</option>
                  <option value="service_account">service_account</option>
                </select>
              </div>
              <div className={styles.field}>
                <label>ID</label>
                <input
                  type="text"
                  placeholder="e.g., user-uuid"
                  value={request.subjectId}
                  onChange={(e) =>
                    setRequest({ ...request, subjectId: e.target.value })
                  }
                  required
                />
              </div>
            </div>
          </div>

          <button type="submit" className={styles.checkBtn} disabled={isLoading}>
            {isLoading ? 'Checking...' : 'Check Permission'}
          </button>
        </form>

        <div className={styles.resultPanel}>
          <h3>Result</h3>
          {error && <div className={styles.error}>{error}</div>}
          {result && (
            <div className={`${styles.result} ${result.allowed ? styles.allowed : styles.denied}`}>
              <div className={styles.resultIcon}>
                {result.allowed ? (
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="currentColor">
                    <path d="M24 4C12.96 4 4 12.96 4 24s8.96 20 20 20 20-8.96 20-20S35.04 4 24 4zm-4 30l-10-10 2.82-2.82L20 28.34l15.18-15.18L38 16 20 34z" />
                  </svg>
                ) : (
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="currentColor">
                    <path d="M24 4C12.96 4 4 12.96 4 24s8.96 20 20 20 20-8.96 20-20S35.04 4 24 4zm10 27.18L31.18 34 24 26.82 16.82 34 14 31.18 21.18 24 14 16.82 16.82 14 24 21.18 31.18 14 34 16.82 26.82 24 34 31.18z" />
                  </svg>
                )}
              </div>
              <div className={styles.resultText}>
                <span className={styles.resultStatus}>
                  {result.allowed ? 'ALLOWED' : 'DENIED'}
                </span>
                <p className={styles.resultDetails}>
                  {request.subjectType}:{request.subjectId}
                  <br />
                  {result.allowed ? 'has' : 'does not have'}
                  <br />
                  <strong>{request.permission}</strong>
                  <br />
                  on {request.resourceType}:{request.resourceId}
                </p>
                {result.cached && (
                  <span className={styles.cached}>Cached result</span>
                )}
              </div>
            </div>
          )}
          {!result && !error && (
            <div className={styles.placeholder}>
              Fill in the form and click "Check Permission" to test authorization.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

