import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Building2, Plus, Trash2, Crown, ShieldCheck, User, Eye, RefreshCw, Search, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { readRelationships, writeRelationship, deleteRelationship, checkPermission } from '../api/client';
import './UsersPage.css';

const PLATFORM_ROLES = [
  { value: 'super_admin', label: 'Super Admin', icon: Crown, color: '#ef4444', description: 'Full platform access' },
  { value: 'platform_admin', label: 'Platform Admin', icon: ShieldCheck, color: '#f59e0b', description: 'Manage organizations' },
  { value: 'support_agent', label: 'Support Agent', icon: User, color: '#06b6d4', description: 'View audit logs, assist users' },
];

const ORG_ROLES = [
  { value: 'owner', label: 'Owner', icon: Crown, color: '#f59e0b', description: 'Full organization control' },
  { value: 'admin', label: 'Admin', icon: ShieldCheck, color: '#8b5cf6', description: 'Manage org settings and members' },
  { value: 'billing_admin', label: 'Billing Admin', icon: ShieldCheck, color: '#10b981', description: 'Manage billing' },
  { value: 'member', label: 'Member', icon: User, color: '#06b6d4', description: 'Standard member access' },
  { value: 'external_partner', label: 'External Partner', icon: User, color: '#64748b', description: 'Limited external access' },
];

const KNOWN_APPS = [
  { id: 'analytics-dashboard', name: 'Analytics Dashboard', icon: '📊' },
  { id: 'document-manager', name: 'Document Manager', icon: '📁' },
  { id: 'reporting-api', name: 'Reporting API', icon: '📈' },
  { id: 'admin-portal', name: 'Admin Portal', icon: '⚙️' },
  { id: 'team-calendar', name: 'Team Calendar', icon: '📅' },
  { id: 'expense-tracker', name: 'Expense Tracker', icon: '💰' },
];

interface UserInfo {
  id: string;
  platformRoles: string[];
  orgMemberships: { orgId: string; role: string }[];
  appAccess: string[]; // App IDs this user has direct access to
}

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddStep, setQuickAddStep] = useState<'user' | 'type' | 'role'>('user');
  const [quickAddData, setQuickAddData] = useState({ userId: '', type: '', targetId: '', role: '' });
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<{ type: 'platform' | 'org'; orgId?: string; currentRole: string } | null>(null);
  const [showAddApp, setShowAddApp] = useState(false);

  // Get all platform users
  const { data: platformRels = [], refetch: refetchPlatform } = useQuery({
    queryKey: ['platform-relationships'],
    queryFn: () => readRelationships('platform', 'main'),
  });

  // Get all organizations
  const { data: orgRels = [], refetch: refetchOrgs } = useQuery({
    queryKey: ['all-org-relationships'],
    queryFn: () => readRelationships('organization'),
  });

  // Get all application relationships
  const { data: appRels = [], refetch: refetchApps } = useQuery({
    queryKey: ['application-relationships'],
    queryFn: () => readRelationships('application'),
  });

  // Build map of user -> apps they have direct access to
  const userAppsMap = new Map<string, string[]>();
  appRels.forEach(rel => {
    if (rel.relation === 'visible_to_user' && rel.subject.startsWith('user:')) {
      const userId = rel.subject.replace('user:', '');
      const appId = rel.resource.replace('application:', '');
      if (!userAppsMap.has(userId)) {
        userAppsMap.set(userId, []);
      }
      userAppsMap.get(userId)!.push(appId);
    }
  });

  // Build user list
  const allUsers: UserInfo[] = (() => {
    const userMap = new Map<string, UserInfo>();

    platformRels.forEach(rel => {
      if (rel.subject.startsWith('user:')) {
        const userId = rel.subject.replace('user:', '');
        if (!userMap.has(userId)) {
          userMap.set(userId, { id: userId, platformRoles: [], orgMemberships: [], appAccess: [] });
        }
        userMap.get(userId)!.platformRoles.push(rel.relation);
      }
    });

    orgRels.forEach(rel => {
      if (rel.subject.startsWith('user:') && ORG_ROLES.some(r => r.value === rel.relation)) {
        const userId = rel.subject.replace('user:', '');
        const orgId = rel.resource.replace('organization:', '');
        if (!userMap.has(userId)) {
          userMap.set(userId, { id: userId, platformRoles: [], orgMemberships: [], appAccess: [] });
        }
        userMap.get(userId)!.orgMemberships.push({ orgId, role: rel.relation });
      }
    });

    // Add app access
    userAppsMap.forEach((apps, userId) => {
      if (!userMap.has(userId)) {
        userMap.set(userId, { id: userId, platformRoles: [], orgMemberships: [], appAccess: apps });
      } else {
        userMap.get(userId)!.appAccess = apps;
      }
    });

    return Array.from(userMap.values());
  })();

  // Get org IDs
  const orgIds = [...new Set(orgRels.filter(r => r.subject.startsWith('platform:')).map(r => r.resource.replace('organization:', '')))];

  // Filter users
  const filteredUsers = allUsers.filter(u => 
    u.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Check permissions for selected user
  const { data: userPermissions = [] } = useQuery({
    queryKey: ['user-permissions', selectedUser],
    queryFn: async () => {
      if (!selectedUser) return [];
      const checks = [
        { resourceType: 'platform', resourceId: 'main', permission: 'manage_all', label: 'Platform: Manage All' },
        { resourceType: 'platform', resourceId: 'main', permission: 'manage_organizations', label: 'Platform: Manage Orgs' },
        { resourceType: 'platform', resourceId: 'main', permission: 'view_audit_logs', label: 'Platform: View Audit Logs' },
      ];
      
      for (const orgId of orgIds) {
        checks.push(
          { resourceType: 'organization', resourceId: orgId, permission: 'is_member', label: `${orgId}: Member` },
          { resourceType: 'organization', resourceId: orgId, permission: 'is_admin', label: `${orgId}: Admin` },
          { resourceType: 'organization', resourceId: orgId, permission: 'manage_org', label: `${orgId}: Manage` }
        );
      }

      const results = await Promise.all(
        checks.map(async (check) => {
          try {
            const result = await checkPermission(check.resourceType, check.resourceId, check.permission, 'user', selectedUser);
            return { ...check, allowed: result.allowed };
          } catch {
            return { ...check, allowed: false };
          }
        })
      );
      return results.filter(r => r.allowed);
    },
    enabled: !!selectedUser,
  });

  // Mutations
  const addRoleMutation = useMutation({
    mutationFn: async (data: { userId: string; type: 'platform' | 'org'; targetId: string; role: string }) => {
      if (data.type === 'platform') {
        return writeRelationship('platform', 'main', data.role, 'user', data.userId);
      } else {
        return writeRelationship('organization', data.targetId, data.role, 'user', data.userId);
      }
    },
    onSuccess: () => {
      toast.success('Role added');
      invalidateAll();
      resetQuickAdd();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const removeRoleMutation = useMutation({
    mutationFn: async (data: { userId: string; type: 'platform' | 'org'; targetId: string; role: string }) => {
      if (data.type === 'platform') {
        return deleteRelationship('platform', 'main', data.role, 'user', data.userId);
      } else {
        return deleteRelationship('organization', data.targetId, data.role, 'user', data.userId);
      }
    },
    onSuccess: () => {
      toast.success('Role removed');
      invalidateAll();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const changeRoleMutation = useMutation({
    mutationFn: async (data: { userId: string; type: 'platform' | 'org'; targetId: string; oldRole: string; newRole: string }) => {
      // Remove old role
      if (data.type === 'platform') {
        await deleteRelationship('platform', 'main', data.oldRole, 'user', data.userId);
        await writeRelationship('platform', 'main', data.newRole, 'user', data.userId);
      } else {
        await deleteRelationship('organization', data.targetId, data.oldRole, 'user', data.userId);
        await writeRelationship('organization', data.targetId, data.newRole, 'user', data.userId);
      }
    },
    onSuccess: () => {
      toast.success('Role updated');
      invalidateAll();
      setEditingRole(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const createOrgMutation = useMutation({
    mutationFn: async (orgId: string) => {
      await writeRelationship('organization', orgId, 'platform', 'platform', 'main');
    },
    onSuccess: () => {
      toast.success('Organization created');
      invalidateAll();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Grant user app access
  const grantAppMutation = useMutation({
    mutationFn: async (appId: string) => {
      return writeRelationship('application', appId, 'visible_to_user', 'user', selectedUser!);
    },
    onSuccess: () => {
      toast.success('Application access granted');
      queryClient.invalidateQueries({ queryKey: ['application-relationships'] });
      refetchApps();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Revoke user app access
  const revokeAppMutation = useMutation({
    mutationFn: async (appId: string) => {
      return deleteRelationship('application', appId, 'visible_to_user', 'user', selectedUser!);
    },
    onSuccess: () => {
      toast.success('Application access revoked');
      queryClient.invalidateQueries({ queryKey: ['application-relationships'] });
      refetchApps();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['platform-relationships'] });
    queryClient.invalidateQueries({ queryKey: ['all-org-relationships'] });
    queryClient.invalidateQueries({ queryKey: ['application-relationships'] });
    queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
  };

  const resetQuickAdd = () => {
    setShowQuickAdd(false);
    setQuickAddStep('user');
    setQuickAddData({ userId: '', type: '', targetId: '', role: '' });
  };

  const getRoleInfo = (role: string, type: 'platform' | 'org') => {
    const list = type === 'platform' ? PLATFORM_ROLES : ORG_ROLES;
    return list.find(r => r.value === role) || { label: role, color: '#64748b', icon: User, description: '' };
  };

  const getAppInfo = (appId: string) => KNOWN_APPS.find(a => a.id === appId) || { id: appId, name: appId, icon: '📦' };

  const selectedUserData = allUsers.find(u => u.id === selectedUser);

  return (
    <div className="page users-page">
      <header className="page-header">
        <div>
          <h1>Users & Permissions</h1>
          <p>Manage user roles, organization memberships, and permissions</p>
        </div>
        <div className="header-actions">
          <Button variant="secondary" onClick={() => { refetchPlatform(); refetchOrgs(); refetchApps(); }}>
            <RefreshCw size={16} />
          </Button>
          <Button onClick={() => setShowQuickAdd(true)}>
            <Plus size={16} />
            Add Role
          </Button>
        </div>
      </header>

      {/* Quick Add Modal */}
      {showQuickAdd && (
        <div className="modal-overlay" onClick={() => resetQuickAdd()}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Role to User</h3>
              <button className="close-btn" onClick={() => resetQuickAdd()}><X size={18} /></button>
            </div>
            <div className="modal-body">
              {quickAddStep === 'user' && (
                <div className="step">
                  <label className="step-label">Step 1: Enter User ID</label>
                  <Input
                    placeholder="Paste Entra ID Object ID (e.g., 7c459200-bd6a-45a8...)"
                    value={quickAddData.userId}
                    onChange={(e) => setQuickAddData({ ...quickAddData, userId: e.target.value })}
                    autoFocus
                  />
                  <p className="hint">This is the user's Object ID from Microsoft Entra ID</p>
                  
                  {allUsers.length > 0 && (
                    <div className="existing-users">
                      <label>Or select existing user:</label>
                      <div className="user-chips">
                        {allUsers.slice(0, 5).map(u => (
                          <button 
                            key={u.id} 
                            className="user-chip"
                            onClick={() => setQuickAddData({ ...quickAddData, userId: u.id })}
                          >
                            {u.id.slice(0, 8)}...
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="step-actions">
                    <Button variant="secondary" onClick={() => resetQuickAdd()}>Cancel</Button>
                    <Button 
                      disabled={!quickAddData.userId.trim()}
                      onClick={() => setQuickAddStep('type')}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}

              {quickAddStep === 'type' && (
                <div className="step">
                  <label className="step-label">Step 2: Choose Role Type</label>
                  <div className="role-type-grid">
                    <button 
                      className={`role-type-card ${quickAddData.type === 'platform' ? 'selected' : ''}`}
                      onClick={() => setQuickAddData({ ...quickAddData, type: 'platform', targetId: 'main' })}
                    >
                      <Crown size={24} />
                      <span className="role-type-title">Platform Role</span>
                      <span className="role-type-desc">Global admin access</span>
                    </button>
                    <button 
                      className={`role-type-card ${quickAddData.type === 'org' ? 'selected' : ''}`}
                      onClick={() => setQuickAddData({ ...quickAddData, type: 'org', targetId: '' })}
                    >
                      <Building2 size={24} />
                      <span className="role-type-title">Organization Role</span>
                      <span className="role-type-desc">Access within an org</span>
                    </button>
                  </div>

                  {quickAddData.type === 'org' && (
                    <div className="org-select">
                      <label>Select Organization:</label>
                      {orgIds.length === 0 ? (
                        <div className="no-orgs">
                          <p>No organizations yet.</p>
                          <Button 
                            size="sm" 
                            onClick={() => {
                              const name = prompt('Enter organization ID (e.g., org-acme):');
                              if (name) createOrgMutation.mutate(name);
                            }}
                          >
                            Create Organization
                          </Button>
                        </div>
                      ) : (
                        <div className="org-chips">
                          {orgIds.map(id => (
                            <button 
                              key={id}
                              className={`org-chip ${quickAddData.targetId === id ? 'selected' : ''}`}
                              onClick={() => setQuickAddData({ ...quickAddData, targetId: id })}
                            >
                              <Building2 size={14} />
                              {id}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="step-actions">
                    <Button variant="secondary" onClick={() => setQuickAddStep('user')}>Back</Button>
                    <Button 
                      disabled={!quickAddData.type || (quickAddData.type === 'org' && !quickAddData.targetId)}
                      onClick={() => setQuickAddStep('role')}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}

              {quickAddStep === 'role' && (
                <div className="step">
                  <label className="step-label">Step 3: Select Role</label>
                  <div className="roles-grid">
                    {(quickAddData.type === 'platform' ? PLATFORM_ROLES : ORG_ROLES).map(role => {
                      const RoleIcon = role.icon;
                      return (
                        <button
                          key={role.value}
                          className={`role-card ${quickAddData.role === role.value ? 'selected' : ''}`}
                          onClick={() => setQuickAddData({ ...quickAddData, role: role.value })}
                        >
                          <div className="role-card-icon" style={{ background: `${role.color}20`, color: role.color }}>
                            <RoleIcon size={20} />
                          </div>
                          <div className="role-card-info">
                            <span className="role-card-title">{role.label}</span>
                            <span className="role-card-desc">{role.description}</span>
                          </div>
                          {quickAddData.role === role.value && (
                            <Check size={18} className="role-check" style={{ color: role.color }} />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="summary">
                    <strong>Summary:</strong> Add <code>{quickAddData.role || '?'}</code> role to user <code>{quickAddData.userId.slice(0, 12)}...</code>
                    {quickAddData.type === 'org' && <> in org <code>{quickAddData.targetId}</code></>}
                  </div>

                  <div className="step-actions">
                    <Button variant="secondary" onClick={() => setQuickAddStep('type')}>Back</Button>
                    <Button 
                      disabled={!quickAddData.role}
                      loading={addRoleMutation.isPending}
                      onClick={() => addRoleMutation.mutate({
                        userId: quickAddData.userId,
                        type: quickAddData.type as 'platform' | 'org',
                        targetId: quickAddData.targetId,
                        role: quickAddData.role,
                      })}
                    >
                      Add Role
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="main-layout">
        {/* Users List */}
        <Card title={`Users (${filteredUsers.length})`} className="users-card">
          <div className="search-box">
            <Search size={16} />
            <input 
              type="text" 
              placeholder="Search users..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {filteredUsers.length === 0 ? (
            <div className="empty-state">
              <Users size={32} />
              <p>{searchTerm ? 'No users match your search' : 'No users found'}</p>
              <Button size="sm" onClick={() => setShowQuickAdd(true)}>Add First User</Button>
            </div>
          ) : (
            <div className="users-list">
              {filteredUsers.map((user, i) => (
                <button
                  key={user.id}
                  className={`user-item ${selectedUser === user.id ? 'selected' : ''}`}
                  onClick={() => setSelectedUser(selectedUser === user.id ? null : user.id)}
                  style={{ animationDelay: `${i * 20}ms` }}
                >
                  <div className="user-avatar"><User size={16} /></div>
                  <div className="user-info">
                    <code>{user.id.slice(0, 20)}{user.id.length > 20 ? '...' : ''}</code>
                    <div className="user-roles-preview">
                      {user.platformRoles.length > 0 && (
                        <span className="role-count platform">{user.platformRoles.length} platform</span>
                      )}
                      {user.orgMemberships.length > 0 && (
                        <span className="role-count org">{user.orgMemberships.length} org</span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>

        {/* User Details */}
        <div className="details-panel">
          {!selectedUser ? (
            <Card className="select-prompt">
              <div className="empty-state">
                <User size={48} />
                <h3>Select a user</h3>
                <p>Click on a user to view and manage their roles</p>
              </div>
            </Card>
          ) : (
            <>
              <Card title="User Info" className="user-info-card">
                <div className="user-header">
                  <div className="user-avatar large"><User size={24} /></div>
                  <div>
                    <code className="user-full-id">{selectedUser}</code>
                    <p className="user-meta">
                      {selectedUserData?.platformRoles.length || 0} platform roles, 
                      {selectedUserData?.orgMemberships.length || 0} org memberships
                    </p>
                  </div>
                </div>
              </Card>

              <Card 
                title="Platform Roles" 
                className="roles-card"
                actions={
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => {
                      setQuickAddData({ userId: selectedUser, type: 'platform', targetId: 'main', role: '' });
                      setQuickAddStep('role');
                      setShowQuickAdd(true);
                    }}
                  >
                    <Plus size={14} /> Add
                  </Button>
                }
              >
                {(selectedUserData?.platformRoles.length || 0) === 0 ? (
                  <p className="no-roles">No platform roles</p>
                ) : (
                  <div className="role-items">
                    {selectedUserData?.platformRoles.map(role => {
                      const info = getRoleInfo(role, 'platform');
                      const RoleIcon = info.icon;
                      const isEditing = editingRole?.type === 'platform' && editingRole.currentRole === role;
                      
                      return (
                        <div key={role} className="role-item">
                          <div className="role-icon" style={{ background: `${info.color}20`, color: info.color }}>
                            <RoleIcon size={16} />
                          </div>
                          {isEditing ? (
                            <select
                              className="role-select"
                              defaultValue={role}
                              onChange={(e) => {
                                if (e.target.value !== role) {
                                  changeRoleMutation.mutate({
                                    userId: selectedUser,
                                    type: 'platform',
                                    targetId: 'main',
                                    oldRole: role,
                                    newRole: e.target.value,
                                  });
                                }
                                setEditingRole(null);
                              }}
                              onBlur={() => setEditingRole(null)}
                              autoFocus
                            >
                              {PLATFORM_ROLES.map(r => (
                                <option key={r.value} value={r.value}>{r.label}</option>
                              ))}
                            </select>
                          ) : (
                            <span 
                              className="role-label clickable" 
                              onClick={() => setEditingRole({ type: 'platform', currentRole: role })}
                              title="Click to change role"
                            >
                              {info.label}
                            </span>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="delete-btn"
                            onClick={() => removeRoleMutation.mutate({
                              userId: selectedUser,
                              type: 'platform',
                              targetId: 'main',
                              role,
                            })}
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
                title="Organization Memberships" 
                className="roles-card"
                actions={
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => {
                      setQuickAddData({ userId: selectedUser, type: 'org', targetId: '', role: '' });
                      setQuickAddStep('type');
                      setShowQuickAdd(true);
                    }}
                  >
                    <Plus size={14} /> Add
                  </Button>
                }
              >
                {(selectedUserData?.orgMemberships.length || 0) === 0 ? (
                  <p className="no-roles">No organization memberships</p>
                ) : (
                  <div className="role-items">
                    {selectedUserData?.orgMemberships.map(mem => {
                      const info = getRoleInfo(mem.role, 'org');
                      const RoleIcon = info.icon;
                      const isEditing = editingRole?.type === 'org' && editingRole.orgId === mem.orgId;
                      
                      return (
                        <div key={`${mem.orgId}-${mem.role}`} className="role-item org-item">
                          <div className="role-icon" style={{ background: `${info.color}20`, color: info.color }}>
                            <RoleIcon size={16} />
                          </div>
                          <div className="org-role-info">
                            <span className="org-name">{mem.orgId}</span>
                            {isEditing ? (
                              <select
                                className="role-select"
                                defaultValue={mem.role}
                                onChange={(e) => {
                                  if (e.target.value !== mem.role) {
                                    changeRoleMutation.mutate({
                                      userId: selectedUser,
                                      type: 'org',
                                      targetId: mem.orgId,
                                      oldRole: mem.role,
                                      newRole: e.target.value,
                                    });
                                  }
                                  setEditingRole(null);
                                }}
                                onBlur={() => setEditingRole(null)}
                                autoFocus
                              >
                                {ORG_ROLES.map(r => (
                                  <option key={r.value} value={r.value}>{r.label}</option>
                                ))}
                              </select>
                            ) : (
                              <span 
                                className="role-label clickable" 
                                style={{ color: info.color }}
                                onClick={() => setEditingRole({ type: 'org', orgId: mem.orgId, currentRole: mem.role })}
                                title="Click to change role"
                              >
                                {info.label}
                              </span>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="delete-btn"
                            onClick={() => removeRoleMutation.mutate({
                              userId: selectedUser,
                              type: 'org',
                              targetId: mem.orgId,
                              role: mem.role,
                            })}
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
                title="Direct Application Access" 
                className="apps-card"
                actions={
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => setShowAddApp(true)}
                  >
                    <Plus size={14} /> Grant App
                  </Button>
                }
              >
                <p className="card-hint">
                  User-specific access (in addition to org-level access)
                </p>
                {(selectedUserData?.appAccess.length || 0) === 0 ? (
                  <p className="no-roles">No direct application access</p>
                ) : (
                  <div className="app-items">
                    {selectedUserData?.appAccess.map(appId => {
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
                            className="delete-btn"
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

              <Card title="Computed Permissions" className="permissions-card">
                {userPermissions.length === 0 ? (
                  <p className="no-roles">No active permissions</p>
                ) : (
                  <div className="permissions-grid">
                    {userPermissions.map((perm, i) => (
                      <div key={i} className="permission-badge">
                        <Eye size={12} />
                        <span>{perm.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      </div>

      {/* Grant User App Access Modal */}
      {showAddApp && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowAddApp(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Grant App Access</h3>
              <button className="close-btn" onClick={() => setShowAddApp(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p className="modal-hint">
                Grant direct application access to user <code>{selectedUser.slice(0, 12)}...</code>
              </p>
              
              <div className="app-select-grid">
                {KNOWN_APPS.map(app => {
                  const hasAccess = selectedUserData?.appAccess.includes(app.id);
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

              <div className="step-actions">
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
