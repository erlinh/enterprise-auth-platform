import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppWindow, Building2, User, Plus, Trash2, RefreshCw, Check, Eye, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { readRelationships, writeRelationship, deleteRelationship } from '../api/client';
import './ApplicationsPage.css';

// These match the application IDs in the Catalogue API repository
const KNOWN_APPS = [
  { id: 'analytics-dashboard', name: 'Analytics Dashboard', icon: '📊', category: 'Analytics' },
  { id: 'document-manager', name: 'Document Manager', icon: '📁', category: 'Productivity' },
  { id: 'reporting-api', name: 'Reporting API', icon: '📈', category: 'Developer Tools' },
  { id: 'admin-portal', name: 'Admin Portal', icon: '⚙️', category: 'Administration' },
  { id: 'team-calendar', name: 'Team Calendar', icon: '📅', category: 'Productivity' },
  { id: 'expense-tracker', name: 'Expense Tracker', icon: '💰', category: 'Finance' },
];

interface AppAccess {
  appId: string;
  subjectType: 'user' | 'organization';
  subjectId: string;
  relation: string;
}

export default function ApplicationsPage() {
  const queryClient = useQueryClient();
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [showGrantAccess, setShowGrantAccess] = useState(false);
  const [grantData, setGrantData] = useState({ subjectType: 'user' as 'user' | 'organization', subjectId: '', relation: 'visible_to_user' });

  // Get all application relationships
  const { data: appRels = [], isLoading, refetch } = useQuery({
    queryKey: ['application-relationships'],
    queryFn: () => readRelationships('application'),
  });

  // Get all organizations for the dropdown
  const { data: orgRels = [] } = useQuery({
    queryKey: ['all-org-relationships'],
    queryFn: () => readRelationships('organization'),
  });

  // Get org IDs from organization relationships (any org that has members/owners/etc)
  // Also include orgs that have visible_to_org access to apps (they exist even if no direct members)
  const orgIdsFromRels = orgRels.map(r => r.resource.replace('organization:', ''));
  const orgIdsFromApps = appRels
    .filter(r => r.subject.startsWith('organization:'))
    .map(r => r.subject.replace('organization:', ''));
  
  const orgIds = [...new Set([...orgIdsFromRels, ...orgIdsFromApps])];

  // Get all users
  const { data: platformRels = [] } = useQuery({
    queryKey: ['platform-relationships'],
    queryFn: () => readRelationships('platform', 'main'),
  });

  const userIds = [...new Set([
    ...platformRels.filter(r => r.subject.startsWith('user:')).map(r => r.subject.replace('user:', '')),
    ...orgRels.filter(r => r.subject.startsWith('user:')).map(r => r.subject.replace('user:', '')),
  ])];

  // Parse app access from relationships
  const appAccessMap = new Map<string, AppAccess[]>();
  
  appRels.forEach(rel => {
    const appId = rel.resource.replace('application:', '');
    if (!appAccessMap.has(appId)) {
      appAccessMap.set(appId, []);
    }
    
    // Parse subject
    if (rel.subject.startsWith('user:')) {
      appAccessMap.get(appId)!.push({
        appId,
        subjectType: 'user',
        subjectId: rel.subject.replace('user:', ''),
        relation: rel.relation,
      });
    } else if (rel.subject.startsWith('organization:')) {
      appAccessMap.get(appId)!.push({
        appId,
        subjectType: 'organization',
        subjectId: rel.subject.replace('organization:', ''),
        relation: rel.relation,
      });
    }
  });

  // Grant access mutation
  const grantMutation = useMutation({
    mutationFn: async () => {
      const subjectType = grantData.subjectType;
      let relation = grantData.relation;
      
      // If granting to org, use visible_to_org relation
      if (subjectType === 'organization') {
        relation = 'visible_to_org';
      }
      
      return writeRelationship('application', selectedApp!, relation, subjectType, grantData.subjectId);
    },
    onSuccess: () => {
      toast.success('Access granted');
      queryClient.invalidateQueries({ queryKey: ['application-relationships'] });
      setShowGrantAccess(false);
      setGrantData({ subjectType: 'user', subjectId: '', relation: 'visible_to_user' });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Revoke access mutation
  const revokeMutation = useMutation({
    mutationFn: async (access: AppAccess) => {
      return deleteRelationship('application', access.appId, access.relation, access.subjectType, access.subjectId);
    },
    onSuccess: () => {
      toast.success('Access revoked');
      queryClient.invalidateQueries({ queryKey: ['application-relationships'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const selectedAppInfo = KNOWN_APPS.find(a => a.id === selectedApp);
  const selectedAppAccess = selectedApp ? (appAccessMap.get(selectedApp) || []) : [];

  // Separate user access from org access
  const userAccess = selectedAppAccess.filter(a => a.subjectType === 'user' && a.relation !== 'platform');
  const orgAccess = selectedAppAccess.filter(a => a.subjectType === 'organization');

  return (
    <div className="page applications-page">
      <header className="page-header">
        <div>
          <h1>Application Access</h1>
          <p>Control which users and organizations can access each application</p>
        </div>
        <Button variant="secondary" onClick={() => refetch()}>
          <RefreshCw size={16} />
        </Button>
      </header>

      <div className="apps-layout">
        {/* Applications List */}
        <Card title="Applications" className="apps-list-card">
          {isLoading ? (
            <div className="loading">Loading...</div>
          ) : (
            <div className="apps-list">
              {KNOWN_APPS.map(app => {
                const accessCount = (appAccessMap.get(app.id) || []).filter(a => 
                  a.relation === 'visible_to_user' || a.relation === 'visible_to_org'
                ).length;
                
                return (
                  <button
                    key={app.id}
                    className={`app-item ${selectedApp === app.id ? 'selected' : ''}`}
                    onClick={() => setSelectedApp(app.id)}
                  >
                    <span className="app-icon">{app.icon}</span>
                    <div className="app-info">
                      <span className="app-name">{app.name}</span>
                      <span className="app-category">{app.category}</span>
                    </div>
                    {accessCount > 0 && (
                      <span className="access-count">{accessCount}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        {/* Access Management */}
        <div className="access-panel">
          {!selectedApp ? (
            <Card className="select-prompt">
              <div className="empty-state">
                <AppWindow size={48} />
                <h3>Select an Application</h3>
                <p>Click on an application to manage who can access it</p>
              </div>
            </Card>
          ) : (
            <>
              <Card className="app-header-card">
                <div className="app-header">
                  <span className="app-icon large">{selectedAppInfo?.icon}</span>
                  <div>
                    <h2>{selectedAppInfo?.name}</h2>
                    <p>{selectedAppInfo?.category}</p>
                  </div>
                </div>
              </Card>

              <Card 
                title="User Access" 
                className="access-card"
                actions={
                  <Button 
                    size="sm" 
                    onClick={() => {
                      setGrantData({ subjectType: 'user', subjectId: '', relation: 'visible_to_user' });
                      setShowGrantAccess(true);
                    }}
                  >
                    <Plus size={14} /> Grant User Access
                  </Button>
                }
              >
                {userAccess.length === 0 ? (
                  <p className="no-access">No individual users have access</p>
                ) : (
                  <div className="access-list">
                    {userAccess.map((access, i) => (
                      <div key={i} className="access-item">
                        <User size={16} className="access-icon user" />
                        <code className="subject-id">{access.subjectId.slice(0, 20)}...</code>
                        <span className="access-badge">
                          <Eye size={12} />
                          Can View
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => revokeMutation.mutate(access)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card 
                title="Organization Access" 
                className="access-card"
                actions={
                  <Button 
                    size="sm" 
                    onClick={() => {
                      setGrantData({ subjectType: 'organization', subjectId: '', relation: 'visible_to_org' });
                      setShowGrantAccess(true);
                    }}
                  >
                    <Plus size={14} /> Grant Org Access
                  </Button>
                }
              >
                {orgAccess.length === 0 ? (
                  <p className="no-access">No organizations have access</p>
                ) : (
                  <div className="access-list">
                    {orgAccess.map((access, i) => (
                      <div key={i} className="access-item">
                        <Building2 size={16} className="access-icon org" />
                        <span className="org-name">{access.subjectId}</span>
                        <span className="access-badge org">
                          <Building2 size={12} />
                          All Members
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => revokeMutation.mutate(access)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card title="How Access Works" className="info-card">
                <div className="info-content">
                  <div className="info-item">
                    <Eye size={16} />
                    <div>
                      <strong>User Access</strong>
                      <p>Grant access to individual users by their Entra ID Object ID</p>
                    </div>
                  </div>
                  <div className="info-item">
                    <Building2 size={16} />
                    <div>
                      <strong>Organization Access</strong>
                      <p>All members of the organization will automatically see the app</p>
                    </div>
                  </div>
                  <div className="info-item">
                    <Shield size={16} />
                    <div>
                      <strong>Platform Admins</strong>
                      <p>Users with platform admin roles can see all applications</p>
                    </div>
                  </div>
                </div>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* Grant Access Modal */}
      {showGrantAccess && selectedApp && (
        <div className="modal-overlay" onClick={() => setShowGrantAccess(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Grant Access to {selectedAppInfo?.name}</h3>
              <button className="close-btn" onClick={() => setShowGrantAccess(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="grant-type-toggle">
                <button
                  className={`toggle-btn ${grantData.subjectType === 'user' ? 'active' : ''}`}
                  onClick={() => setGrantData({ ...grantData, subjectType: 'user', subjectId: '' })}
                >
                  <User size={16} />
                  Individual User
                </button>
                <button
                  className={`toggle-btn ${grantData.subjectType === 'organization' ? 'active' : ''}`}
                  onClick={() => setGrantData({ ...grantData, subjectType: 'organization', subjectId: '' })}
                >
                  <Building2 size={16} />
                  Organization
                </button>
              </div>

              {grantData.subjectType === 'user' ? (
                <div className="grant-form">
                  <label>User ID (Entra Object ID)</label>
                  <Input
                    placeholder="e.g., 7c459200-bd6a-45a8-a794-505a5ea2de38"
                    value={grantData.subjectId}
                    onChange={(e) => setGrantData({ ...grantData, subjectId: e.target.value })}
                  />
                  
                  {userIds.length > 0 && (
                    <div className="quick-select">
                      <label>Quick select existing user:</label>
                      <div className="chips">
                        {userIds.slice(0, 5).map(id => (
                          <button
                            key={id}
                            className={`chip ${grantData.subjectId === id ? 'selected' : ''}`}
                            onClick={() => setGrantData({ ...grantData, subjectId: id })}
                          >
                            {id.slice(0, 8)}...
                            {grantData.subjectId === id && <Check size={12} />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grant-form">
                  <label>Organization ID</label>
                  <Input
                    placeholder="e.g., acme-corp or my-organization"
                    value={grantData.subjectId}
                    onChange={(e) => setGrantData({ ...grantData, subjectId: e.target.value })}
                  />
                  
                  {orgIds.length > 0 && (
                    <div className="quick-select">
                      <label>Quick select existing organization:</label>
                      <div className="org-select-grid">
                        {orgIds.map(id => (
                          <button
                            key={id}
                            className={`org-select-item ${grantData.subjectId === id ? 'selected' : ''}`}
                            onClick={() => setGrantData({ ...grantData, subjectId: id })}
                          >
                            <Building2 size={18} />
                            <span>{id}</span>
                            {grantData.subjectId === id && <Check size={16} />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="modal-actions">
                <Button variant="secondary" onClick={() => setShowGrantAccess(false)}>
                  Cancel
                </Button>
                <Button
                  disabled={!grantData.subjectId}
                  loading={grantMutation.isPending}
                  onClick={() => grantMutation.mutate()}
                >
                  <Check size={16} />
                  Grant Access
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
