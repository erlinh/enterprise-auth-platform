import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Shield, CheckCircle, XCircle, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input, Select } from '../components/Input';
import { checkPermission, lookupResources, lookupSubjects } from '../api/client';
import './PermissionCheckerPage.css';

const RESOURCE_TYPES = [
  { value: 'platform', label: 'platform' },
  { value: 'organization', label: 'organization' },
  { value: 'application', label: 'application' },
  { value: 'analytics_dashboard', label: 'analytics_dashboard' },
  { value: 'docmgr_folder', label: 'docmgr_folder' },
  { value: 'docmgr_document', label: 'docmgr_document' },
];

const PERMISSIONS: Record<string, string[]> = {
  platform: ['manage_all', 'manage_organizations', 'view_audit_logs', 'impersonate_users'],
  organization: ['manage_org', 'admin_access', 'invite_members', 'view_members', 'is_member', 'is_admin'],
  application: ['can_view_in_catalogue', 'can_launch', 'manage'],
  analytics_dashboard: ['view', 'edit', 'delete', 'share', 'export'],
  docmgr_folder: ['view', 'edit', 'delete', 'create_document', 'share'],
  docmgr_document: ['view', 'edit', 'delete', 'comment', 'share'],
};

export default function PermissionCheckerPage() {
  const [mode, setMode] = useState<'check' | 'lookupResources' | 'lookupSubjects'>('check');
  const [checkForm, setCheckForm] = useState({
    resourceType: 'organization',
    resourceId: '',
    permission: 'is_member',
    subjectType: 'user',
    subjectId: '',
  });
  const [result, setResult] = useState<{ type: 'check' | 'resources' | 'subjects'; data: unknown } | null>(null);

  const checkMutation = useMutation({
    mutationFn: () => checkPermission(
      checkForm.resourceType,
      checkForm.resourceId,
      checkForm.permission,
      checkForm.subjectType,
      checkForm.subjectId
    ),
    onSuccess: (data) => {
      setResult({ type: 'check', data });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const lookupResourcesMutation = useMutation({
    mutationFn: () => lookupResources(
      checkForm.resourceType,
      checkForm.permission,
      checkForm.subjectType,
      checkForm.subjectId
    ),
    onSuccess: (data) => {
      setResult({ type: 'resources', data });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const lookupSubjectsMutation = useMutation({
    mutationFn: () => lookupSubjects(
      checkForm.resourceType,
      checkForm.resourceId,
      checkForm.permission,
      checkForm.subjectType
    ),
    onSuccess: (data) => {
      setResult({ type: 'subjects', data });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleSubmit = () => {
    setResult(null);
    if (mode === 'check') {
      checkMutation.mutate();
    } else if (mode === 'lookupResources') {
      lookupResourcesMutation.mutate();
    } else {
      lookupSubjectsMutation.mutate();
    }
  };

  const permissions = PERMISSIONS[checkForm.resourceType] || [];

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Permission Checker</h1>
          <p>Test permissions and lookup resources/subjects</p>
        </div>
      </header>

      <div className="mode-tabs">
        <button
          className={`mode-tab ${mode === 'check' ? 'active' : ''}`}
          onClick={() => { setMode('check'); setResult(null); }}
        >
          <Shield size={16} />
          Check Permission
        </button>
        <button
          className={`mode-tab ${mode === 'lookupResources' ? 'active' : ''}`}
          onClick={() => { setMode('lookupResources'); setResult(null); }}
        >
          <Zap size={16} />
          Lookup Resources
        </button>
        <button
          className={`mode-tab ${mode === 'lookupSubjects' ? 'active' : ''}`}
          onClick={() => { setMode('lookupSubjects'); setResult(null); }}
        >
          <Zap size={16} />
          Lookup Subjects
        </button>
      </div>

      <Card title={mode === 'check' ? 'Permission Check' : mode === 'lookupResources' ? 'Lookup Resources' : 'Lookup Subjects'}>
        <div className="check-form">
          <div className="form-grid">
            <Select
              label="Resource Type"
              options={RESOURCE_TYPES}
              value={checkForm.resourceType}
              onChange={(e) => setCheckForm({ 
                ...checkForm, 
                resourceType: e.target.value,
                permission: PERMISSIONS[e.target.value]?.[0] || ''
              })}
            />
            
            {(mode === 'check' || mode === 'lookupSubjects') && (
              <Input
                label="Resource ID"
                placeholder="e.g., org-acme"
                value={checkForm.resourceId}
                onChange={(e) => setCheckForm({ ...checkForm, resourceId: e.target.value })}
              />
            )}
            
            <Select
              label="Permission"
              options={permissions.map(p => ({ value: p, label: p }))}
              value={checkForm.permission}
              onChange={(e) => setCheckForm({ ...checkForm, permission: e.target.value })}
            />
            
            <Select
              label="Subject Type"
              options={[{ value: 'user', label: 'user' }, { value: 'service_account', label: 'service_account' }]}
              value={checkForm.subjectType}
              onChange={(e) => setCheckForm({ ...checkForm, subjectType: e.target.value })}
            />
            
            {(mode === 'check' || mode === 'lookupResources') && (
              <Input
                label="Subject ID"
                placeholder="e.g., user-123 or OID"
                value={checkForm.subjectId}
                onChange={(e) => setCheckForm({ ...checkForm, subjectId: e.target.value })}
              />
            )}
          </div>

          <div className="form-submit">
            <Button
              onClick={handleSubmit}
              loading={checkMutation.isPending || lookupResourcesMutation.isPending || lookupSubjectsMutation.isPending}
            >
              {mode === 'check' ? 'Check Permission' : mode === 'lookupResources' ? 'Find Resources' : 'Find Subjects'}
            </Button>
          </div>
        </div>
      </Card>

      {result && (
        <Card title="Result" className="result-card animate-fade-in">
          {result.type === 'check' && (
            <div className={`check-result ${(result.data as { allowed: boolean }).allowed ? 'allowed' : 'denied'}`}>
              {(result.data as { allowed: boolean }).allowed ? (
                <>
                  <CheckCircle size={48} />
                  <span>ALLOWED</span>
                </>
              ) : (
                <>
                  <XCircle size={48} />
                  <span>DENIED</span>
                </>
              )}
            </div>
          )}
          
          {result.type === 'resources' && (
            <div className="lookup-result">
              <h4>Resources with permission "{checkForm.permission}":</h4>
              {(result.data as string[]).length === 0 ? (
                <p className="no-results">No resources found</p>
              ) : (
                <ul className="result-list">
                  {(result.data as string[]).map((id, i) => (
                    <li key={i}><code>{checkForm.resourceType}:{id}</code></li>
                  ))}
                </ul>
              )}
            </div>
          )}
          
          {result.type === 'subjects' && (
            <div className="lookup-result">
              <h4>Subjects with permission "{checkForm.permission}":</h4>
              {(result.data as string[]).length === 0 ? (
                <p className="no-results">No subjects found</p>
              ) : (
                <ul className="result-list">
                  {(result.data as string[]).map((id, i) => (
                    <li key={i}><code>{checkForm.subjectType}:{id}</code></li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
