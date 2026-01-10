import { useState } from 'react';
import { authzApi, Relationship, WriteRelationshipRequest } from '../api/client';
import styles from './RelationshipsPage.module.css';

const RESOURCE_TYPES = [
  'platform',
  'organization',
  'department',
  'team',
  'application',
  'license',
  'analytics_dashboard',
  'analytics_report',
  'docmgr_folder',
  'docmgr_document',
  'reporting_scope',
  'reporting_endpoint',
];

export default function RelationshipsPage() {
  const [selectedType, setSelectedType] = useState(RESOURCE_TYPES[0]);
  const [resourceId, setResourceId] = useState('');
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form for creating new relationship
  const [showForm, setShowForm] = useState(false);
  const [newRelation, setNewRelation] = useState<WriteRelationshipRequest>({
    resourceType: RESOURCE_TYPES[0],
    resourceId: '',
    relation: '',
    subjectType: 'user',
    subjectId: '',
  });

  const fetchRelationships = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const results = await authzApi.readRelationships(
        selectedType,
        resourceId || undefined
      );
      setRelationships(results);
    } catch (err) {
      setError('Failed to fetch relationships');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRelationship = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await authzApi.writeRelationship(newRelation);
      setShowForm(false);
      setNewRelation({
        resourceType: RESOURCE_TYPES[0],
        resourceId: '',
        relation: '',
        subjectType: 'user',
        subjectId: '',
      });
      // Refresh list if we're viewing the same type
      if (newRelation.resourceType === selectedType) {
        fetchRelationships();
      }
    } catch (err) {
      setError('Failed to create relationship');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRelationship = async (rel: Relationship) => {
    const [resourceType, resourceId] = rel.resource.split(':');
    const [subjectType, subjectIdPart] = rel.subject.split(':');
    const [subjectId] = subjectIdPart.split('#');

    if (!confirm(`Delete relationship: ${rel.resource} #${rel.relation} ${rel.subject}?`)) {
      return;
    }

    try {
      await authzApi.deleteRelationship({
        resourceType,
        resourceId,
        relation: rel.relation,
        subjectType,
        subjectId,
      });
      fetchRelationships();
    } catch (err) {
      setError('Failed to delete relationship');
      console.error(err);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>
            <span className="text-gradient">Relationships</span>
          </h1>
          <p className={styles.subtitle}>
            View and manage SpiceDB authorization relationships
          </p>
        </div>
        <button className={styles.createBtn} onClick={() => setShowForm(true)}>
          + Create Relationship
        </button>
      </header>

      {/* Search Controls */}
      <div className={styles.controls}>
        <div className={styles.field}>
          <label>Resource Type</label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            {RESOURCE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label>Resource ID (optional)</label>
          <input
            type="text"
            placeholder="e.g., org-123"
            value={resourceId}
            onChange={(e) => setResourceId(e.target.value)}
          />
        </div>
        <button className={styles.searchBtn} onClick={fetchRelationships}>
          Search
        </button>
      </div>

      {/* Error */}
      {error && <div className={styles.error}>{error}</div>}

      {/* Results */}
      <div className={styles.results}>
        {isLoading ? (
          <div className={styles.loading}>
            <div className={styles.spinner} />
            Loading...
          </div>
        ) : relationships.length === 0 ? (
          <div className={styles.empty}>
            No relationships found. Click "Search" to query SpiceDB.
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Resource</th>
                <th>Relation</th>
                <th>Subject</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {relationships.map((rel, i) => (
                <tr key={i}>
                  <td>
                    <code>{rel.resource}</code>
                  </td>
                  <td>
                    <span className={styles.relation}>{rel.relation}</span>
                  </td>
                  <td>
                    <code>{rel.subject}</code>
                  </td>
                  <td>
                    <button
                      className={styles.deleteBtn}
                      onClick={() => handleDeleteRelationship(rel)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Form Modal */}
      {showForm && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>Create Relationship</h2>
            <form onSubmit={handleCreateRelationship}>
              <div className={styles.formGrid}>
                <div className={styles.field}>
                  <label>Resource Type</label>
                  <select
                    value={newRelation.resourceType}
                    onChange={(e) =>
                      setNewRelation({ ...newRelation, resourceType: e.target.value })
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
                  <label>Resource ID</label>
                  <input
                    type="text"
                    placeholder="e.g., org-123"
                    value={newRelation.resourceId}
                    onChange={(e) =>
                      setNewRelation({ ...newRelation, resourceId: e.target.value })
                    }
                    required
                  />
                </div>
                <div className={styles.field}>
                  <label>Relation</label>
                  <input
                    type="text"
                    placeholder="e.g., owner, member, viewer"
                    value={newRelation.relation}
                    onChange={(e) =>
                      setNewRelation({ ...newRelation, relation: e.target.value })
                    }
                    required
                  />
                </div>
                <div className={styles.field}>
                  <label>Subject Type</label>
                  <select
                    value={newRelation.subjectType}
                    onChange={(e) =>
                      setNewRelation({ ...newRelation, subjectType: e.target.value })
                    }
                  >
                    <option value="user">user</option>
                    <option value="service_account">service_account</option>
                    <option value="organization">organization</option>
                    <option value="department">department</option>
                    <option value="team">team</option>
                  </select>
                </div>
                <div className={styles.field}>
                  <label>Subject ID</label>
                  <input
                    type="text"
                    placeholder="e.g., user-uuid"
                    value={newRelation.subjectId}
                    onChange={(e) =>
                      setNewRelation({ ...newRelation, subjectId: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div className={styles.formActions}>
                <button type="button" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button type="submit" className={styles.submitBtn}>
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

