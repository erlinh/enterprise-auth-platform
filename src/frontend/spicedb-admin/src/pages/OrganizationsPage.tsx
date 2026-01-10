import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Building2, Plus, Trash2, Crown, ShieldCheck, User, 
  RefreshCw, Search, X, Check, Users, UserPlus
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { readRelationships, writeRelationship, deleteRelationship } from '../api/client';
import './OrganizationsPage.css';

const ORG_ROLES = [
  { value: 'owner', label: 'Owner', icon: Crown, color: '#f59e0b', description: 'Full organization control' },
  { value: 'admin', label: 'Admin', icon: ShieldCheck, color: '#8b5cf6', description: 'Manage org settings and members' },
  { value: 'billing_admin', label: 'Billing Admin', icon: ShieldCheck, color: '#10b981', description: 'Manage billing' },
  { value: 'member', label: 'Member', icon: User, color: '#64748b', description: 'Basic member access' },
  { value: 'external_partner', label: 'External Partner', icon: Users, color: '#06b6d4', description: 'External collaboration' },
];

const KNOWN_APPS = [
  { id: 'analytics-dashboard', name: 'Analytics Dashboard', icon: '📊' },
  { id: 'document-manager', name: 'Document Manager', icon: '📁' },
  { id: 'reporting-api', name: 'Reporting API', icon: '📈' },
  { id: 'admin-portal', name: 'Admin Portal', icon: '⚙️' },
  { id: 'team-calendar', name: 'Team Calendar', icon: '📅' },
  { id: 'expense-tracker', name: 'Expense Tracker', icon: '💰' },
];

interface OrgMember {
  userId: string;
  role: string;
}

interface Organization {
  id: string;
  members: OrgMember[];
  apps: string[]; // App IDs this org has access to
}

export default function OrganizationsPage() {
  const queryClient = useQueryClient();
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddApp, setShowAddApp] = useState(false);
  const [newOrgId, setNewOrgId] = useState('');
  const [newOrgOwner, setNewOrgOwner] = useState('');
  const [newMemberData, setNewMemberData] = useState({ userId: '', role: 'member' });

  // Fetch all organization relationships
  const { data: orgRels = [], isLoading, refetch } = useQuery({
    queryKey: ['organization-relationships'],
    queryFn: () => readRelationships('organization'),
  });

  // Fetch application relationships to find org access
  const { data: appRels = [], refetch: refetchApps } = useQuery({
    queryKey: ['application-relationships'],
    queryFn: () => readRelationships('application'),
  });

  // Fetch platform users for quick selection
  const { data: platformRels = [] } = useQuery({
    queryKey: ['platform-relationships'],
    queryFn: () => readRelationships('platform', 'main'),
  });

  const knownUsers = [...new Set(
    platformRels
      .filter(r => r.subject.startsWith('user:'))
      .map(r => r.subject.replace('user:', ''))
  )];

  // Build map of org -> apps they have access to
  const orgAppsMap = new Map<string, string[]>();
  appRels.forEach(rel => {
    if (rel.relation === 'visible_to_org' && rel.subject.startsWith('organization:')) {
      const orgId = rel.subject.replace('organization:', '');
      const appId = rel.resource.replace('application:', '');
      if (!orgAppsMap.has(orgId)) {
        orgAppsMap.set(orgId, []);
      }
      orgAppsMap.get(orgId)!.push(appId);
    }
  });

  // Parse organizations and their members
  const organizations: Organization[] = [];
  const orgMap = new Map<string, OrgMember[]>();

  orgRels.forEach(rel => {
    const orgId = rel.resource.replace('organization:', '');
    if (!orgMap.has(orgId)) {
      orgMap.set(orgId, []);
    }
    
    if (rel.subject.startsWith('user:')) {
      orgMap.get(orgId)!.push({
        userId: rel.subject.replace('user:', ''),
        role: rel.relation,
      });
    }
  });

  orgMap.forEach((members, id) => {
    organizations.push({ id, members, apps: orgAppsMap.get(id) || [] });
  });

  // Also include orgs that only appear in app relationships
  orgAppsMap.forEach((apps, orgId) => {
    if (!organizations.find(o => o.id === orgId)) {
      organizations.push({ id: orgId, members: [], apps });
    }
  });

  // Filter organizations
  const filteredOrgs = organizations.filter(org =>
    org.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedOrgData = organizations.find(o => o.id === selectedOrg);

  // Create organization mutation
  const createOrgMutation = useMutation({
    mutationFn: async () => {
      // Link org to platform
      await writeRelationship('organization', newOrgId, 'platform', 'platform', 'main');
      // Add owner
      if (newOrgOwner) {
        await writeRelationship('organization', newOrgId, 'owner', 'user', newOrgOwner);
      }
    },
    onSuccess: () => {
      toast.success(`Organization "${newOrgId}" created`);
      queryClient.invalidateQueries({ queryKey: ['organization-relationships'] });
      setShowCreateOrg(false);
      setNewOrgId('');
      setNewOrgOwner('');
      setSelectedOrg(newOrgId);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Add member mutation
  const addMemberMutation = useMutation({
    mutationFn: async () => {
      return writeRelationship('organization', selectedOrg!, newMemberData.role, 'user', newMemberData.userId);
    },
    onSuccess: () => {
      toast.success('Member added');
      queryClient.invalidateQueries({ queryKey: ['organization-relationships'] });
      setShowAddMember(false);
      setNewMemberData({ userId: '', role: 'member' });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      return deleteRelationship('organization', selectedOrg!, role, 'user', userId);
    },
    onSuccess: () => {
      toast.success('Member removed');
      queryClient.invalidateQueries({ queryKey: ['organization-relationships'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Delete organization mutation
  const deleteOrgMutation = useMutation({
    mutationFn: async (orgId: string) => {
      const org = organizations.find(o => o.id === orgId);
      if (!org) return;
      
      // Delete all member relationships
      for (const member of org.members) {
        await deleteRelationship('organization', orgId, member.role, 'user', member.userId);
      }
      // Delete all app access
      for (const appId of org.apps) {
        await deleteRelationship('application', appId, 'visible_to_org', 'organization', orgId);
      }
      // Delete platform link
      await deleteRelationship('organization', orgId, 'platform', 'platform', 'main');
    },
    onSuccess: () => {
      toast.success('Organization deleted');
      queryClient.invalidateQueries({ queryKey: ['organization-relationships'] });
      queryClient.invalidateQueries({ queryKey: ['application-relationships'] });
      setSelectedOrg(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Grant app access to org
  const grantAppMutation = useMutation({
    mutationFn: async (appId: string) => {
      return writeRelationship('application', appId, 'visible_to_org', 'organization', selectedOrg!);
    },
    onSuccess: () => {
      toast.success('Application access granted');
      queryClient.invalidateQueries({ queryKey: ['application-relationships'] });
      refetchApps();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Revoke app access from org
  const revokeAppMutation = useMutation({
    mutationFn: async (appId: string) => {
      return deleteRelationship('application', appId, 'visible_to_org', 'organization', selectedOrg!);
    },
    onSuccess: () => {
      toast.success('Application access revoked');
      queryClient.invalidateQueries({ queryKey: ['application-relationships'] });
      refetchApps();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const getRoleInfo = (role: string) => ORG_ROLES.find(r => r.value === role) || ORG_ROLES[3];
  const getAppInfo = (appId: string) => KNOWN_APPS.find(a => a.id === appId) || { id: appId, name: appId, icon: '📦' };

  return (
    <div className="page organizations-page">
      <header className="page-header">
        <div>
          <h1>Organizations</h1>
          <p>Create and manage organizations and their members</p>
        </div>
        <div className="header-actions">
          <Button variant="secondary" onClick={() => refetch()}>
            <RefreshCw size={16} />
          </Button>
          <Button onClick={() => setShowCreateOrg(true)}>
            <Plus size={16} /> New Organization
          </Button>
        </div>
      </header>

      <div className="orgs-layout">
        {/* Organizations List */}
        <Card title="Organizations" className="orgs-list-card">
          <div className="search-box">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search organizations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')}>
                <X size={14} />
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="loading">Loading...</div>
          ) : filteredOrgs.length === 0 ? (
            <div className="empty-state small">
              <Building2 size={32} />
              <p>No organizations found</p>
              <Button size="sm" onClick={() => setShowCreateOrg(true)}>
                <Plus size={14} /> Create First Organization
              </Button>
            </div>
          ) : (
            <div className="orgs-list">
              {filteredOrgs.map(org => (
                <button
                  key={org.id}
                  className={`org-item ${selectedOrg === org.id ? 'selected' : ''}`}
                  onClick={() => setSelectedOrg(org.id)}
                >
                  <Building2 size={20} className="org-icon" />
                  <div className="org-info">
                    <span className="org-name">{org.id}</span>
                    <span className="org-members">{org.members.length} members</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>

        {/* Organization Details */}
        <div className="org-details">
          {!selectedOrg ? (
            <Card className="select-prompt">
              <div className="empty-state">
                <Building2 size={48} />
                <h3>Select an Organization</h3>
                <p>Click on an organization to view and manage its members</p>
              </div>
            </Card>
          ) : (
            <>
              <Card className="org-header-card">
                <div className="org-header">
                  <div className="org-title">
                    <Building2 size={32} className="org-icon" />
                    <div>
                      <h2>{selectedOrg}</h2>
                      <p>{selectedOrgData?.members.length || 0} members</p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    onClick={() => {
                      if (confirm(`Delete organization "${selectedOrg}"? This will remove all member relationships.`)) {
                        deleteOrgMutation.mutate(selectedOrg);
                      }
                    }}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </Card>

              <Card 
                title="Members" 
                className="members-card"
                actions={
                  <Button size="sm" onClick={() => setShowAddMember(true)}>
                    <UserPlus size={14} /> Add Member
                  </Button>
                }
              >
                {!selectedOrgData?.members.length ? (
                  <p className="no-members">No members in this organization</p>
                ) : (
                  <div className="members-list">
                    {selectedOrgData.members.map((member, i) => {
                      const roleInfo = getRoleInfo(member.role);
                      const RoleIcon = roleInfo.icon;
                      
                      return (
                        <div key={i} className="member-item">
                          <User size={18} className="member-icon" />
                          <div className="member-info">
                            <code className="member-id">{member.userId}</code>
                          </div>
                          <span 
                            className="role-badge"
                            style={{ 
                              backgroundColor: `${roleInfo.color}20`,
                              color: roleInfo.color 
                            }}
                          >
                            <RoleIcon size={12} />
                            {roleInfo.label}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeMemberMutation.mutate({ userId: member.userId, role: member.role })}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>

              <Card 
                title="Application Access" 
                className="apps-card"
                actions={
                  <Button size="sm" onClick={() => setShowAddApp(true)}>
                    <Plus size={14} /> Grant App Access
                  </Button>
                }
              >
                <p className="card-description">
                  All members of this organization can access these applications
                </p>
                {!selectedOrgData?.apps.length ? (
                  <p className="no-apps">No application access granted</p>
                ) : (
                  <div className="apps-list">
                    {selectedOrgData.apps.map(appId => {
                      const appInfo = getAppInfo(appId);
                      return (
                        <div key={appId} className="app-item">
                          <span className="app-icon">{appInfo.icon}</span>
                          <div className="app-info">
                            <span className="app-name">{appInfo.name}</span>
                            <code className="app-id">{appId}</code>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => revokeAppMutation.mutate(appId)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>

              <Card title="Role Legend" className="legend-card">
                <div className="roles-legend">
                  {ORG_ROLES.map(role => {
                    const Icon = role.icon;
                    return (
                      <div key={role.value} className="legend-item">
                        <span 
                          className="role-badge"
                          style={{ 
                            backgroundColor: `${role.color}20`,
                            color: role.color 
                          }}
                        >
                          <Icon size={12} />
                          {role.label}
                        </span>
                        <span className="role-desc">{role.description}</span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* Create Organization Modal */}
      {showCreateOrg && (
        <div className="modal-overlay" onClick={() => setShowCreateOrg(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create Organization</h3>
              <button className="close-btn" onClick={() => setShowCreateOrg(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Organization ID</label>
                <Input
                  placeholder="e.g., acme-corp, my-team"
                  value={newOrgId}
                  onChange={(e) => setNewOrgId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                />
                <p className="hint">Use lowercase letters, numbers, and hyphens</p>
              </div>

              <div className="form-group">
                <label>Owner (User ID)</label>
                <Input
                  placeholder="e.g., 7c459200-bd6a-45a8-a794-505a5ea2de38"
                  value={newOrgOwner}
                  onChange={(e) => setNewOrgOwner(e.target.value)}
                />
                
                {knownUsers.length > 0 && (
                  <div className="quick-select">
                    <p>Quick select:</p>
                    <div className="chips">
                      {knownUsers.slice(0, 3).map(id => (
                        <button
                          key={id}
                          className={`chip ${newOrgOwner === id ? 'selected' : ''}`}
                          onClick={() => setNewOrgOwner(id)}
                        >
                          {id.slice(0, 8)}...
                          {newOrgOwner === id && <Check size={12} />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <Button variant="secondary" onClick={() => setShowCreateOrg(false)}>
                  Cancel
                </Button>
                <Button
                  disabled={!newOrgId}
                  loading={createOrgMutation.isPending}
                  onClick={() => createOrgMutation.mutate()}
                >
                  <Check size={16} />
                  Create Organization
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMember && selectedOrg && (
        <div className="modal-overlay" onClick={() => setShowAddMember(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Member to {selectedOrg}</h3>
              <button className="close-btn" onClick={() => setShowAddMember(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>User ID</label>
                <Input
                  placeholder="e.g., 7c459200-bd6a-45a8-a794-505a5ea2de38"
                  value={newMemberData.userId}
                  onChange={(e) => setNewMemberData({ ...newMemberData, userId: e.target.value })}
                />
                
                {knownUsers.length > 0 && (
                  <div className="quick-select">
                    <p>Quick select:</p>
                    <div className="chips">
                      {knownUsers.slice(0, 3).map(id => (
                        <button
                          key={id}
                          className={`chip ${newMemberData.userId === id ? 'selected' : ''}`}
                          onClick={() => setNewMemberData({ ...newMemberData, userId: id })}
                        >
                          {id.slice(0, 8)}...
                          {newMemberData.userId === id && <Check size={12} />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Role</label>
                <div className="role-select-grid">
                  {ORG_ROLES.map(role => {
                    const Icon = role.icon;
                    return (
                      <button
                        key={role.value}
                        className={`role-select-item ${newMemberData.role === role.value ? 'selected' : ''}`}
                        onClick={() => setNewMemberData({ ...newMemberData, role: role.value })}
                      >
                        <Icon size={18} style={{ color: role.color }} />
                        <span className="role-name">{role.label}</span>
                        <span className="role-desc">{role.description}</span>
                        {newMemberData.role === role.value && <Check size={16} className="check" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="modal-actions">
                <Button variant="secondary" onClick={() => setShowAddMember(false)}>
                  Cancel
                </Button>
                <Button
                  disabled={!newMemberData.userId}
                  loading={addMemberMutation.isPending}
                  onClick={() => addMemberMutation.mutate()}
                >
                  <Check size={16} />
                  Add Member
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grant App Access Modal */}
      {showAddApp && selectedOrg && (
        <div className="modal-overlay" onClick={() => setShowAddApp(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Grant App Access to {selectedOrg}</h3>
              <button className="close-btn" onClick={() => setShowAddApp(false)}>×</button>
            </div>
            <div className="modal-body">
              <p className="modal-description">
                Select applications to grant access. All members of this organization will be able to view and launch these applications.
              </p>
              
              <div className="app-select-grid">
                {KNOWN_APPS.map(app => {
                  const hasAccess = selectedOrgData?.apps.includes(app.id);
                  return (
                    <button
                      key={app.id}
                      className={`app-select-item ${hasAccess ? 'has-access' : ''}`}
                      onClick={() => {
                        if (hasAccess) {
                          revokeAppMutation.mutate(app.id);
                        } else {
                          grantAppMutation.mutate(app.id);
                        }
                      }}
                      disabled={grantAppMutation.isPending || revokeAppMutation.isPending}
                    >
                      <span className="app-icon">{app.icon}</span>
                      <div className="app-details">
                        <span className="app-name">{app.name}</span>
                        <code className="app-id">{app.id}</code>
                      </div>
                      {hasAccess ? (
                        <span className="access-badge granted">
                          <Check size={12} /> Granted
                        </span>
                      ) : (
                        <span className="access-badge">
                          <Plus size={12} /> Grant
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="modal-actions">
                <Button onClick={() => setShowAddApp(false)}>
                  Done
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
