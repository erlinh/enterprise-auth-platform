import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Search, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input, Select } from '../components/Input';
import { readRelationships, writeRelationship, deleteRelationship } from '../api/client';
import './RelationshipsPage.css';

const RESOURCE_TYPES = [
  { value: 'user', label: 'user' },
  { value: 'platform', label: 'platform' },
  { value: 'organization', label: 'organization' },
  { value: 'department', label: 'department' },
  { value: 'team', label: 'team' },
  { value: 'application', label: 'application' },
  { value: 'product', label: 'product' },
  { value: 'license', label: 'license' },
  { value: 'analytics_dashboard', label: 'analytics_dashboard' },
  { value: 'analytics_report', label: 'analytics_report' },
  { value: 'docmgr_folder', label: 'docmgr_folder' },
  { value: 'docmgr_document', label: 'docmgr_document' },
];

export default function RelationshipsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState({ resourceType: 'organization', resourceId: '', relation: '' });
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRel, setNewRel] = useState({
    resourceType: 'organization',
    resourceId: '',
    relation: '',
    subjectType: 'user',
    subjectId: '',
  });

  const { data: relationships = [], isLoading, refetch } = useQuery({
    queryKey: ['relationships', filter],
    queryFn: () => readRelationships(filter.resourceType, filter.resourceId || undefined, filter.relation || undefined),
  });

  const addMutation = useMutation({
    mutationFn: () => writeRelationship(
      newRel.resourceType,
      newRel.resourceId,
      newRel.relation,
      newRel.subjectType,
      newRel.subjectId
    ),
    onSuccess: () => {
      toast.success('Relationship created');
      queryClient.invalidateQueries({ queryKey: ['relationships'] });
      setShowAddForm(false);
      setNewRel({ resourceType: 'organization', resourceId: '', relation: '', subjectType: 'user', subjectId: '' });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (rel: { resource: string; relation: string; subject: string }) => {
      const [resType, resId] = rel.resource.split(':');
      const subjectParts = rel.subject.split(':');
      const subType = subjectParts[0];
      const subId = subjectParts[1]?.split('#')[0] || '';
      return deleteRelationship(resType, resId, rel.relation, subType, subId);
    },
    onSuccess: () => {
      toast.success('Relationship deleted');
      queryClient.invalidateQueries({ queryKey: ['relationships'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Relationships</h1>
          <p>View and manage SpiceDB relationships</p>
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)}>
          <Plus size={16} />
          Add Relationship
        </Button>
      </header>

      {showAddForm && (
        <Card title="New Relationship" className="animate-fade-in add-form-card">
          <div className="add-form">
            <div className="form-row">
              <Select
                label="Resource Type"
                options={RESOURCE_TYPES}
                value={newRel.resourceType}
                onChange={(e) => setNewRel({ ...newRel, resourceType: e.target.value })}
              />
              <Input
                label="Resource ID"
                placeholder="e.g., org-acme"
                value={newRel.resourceId}
                onChange={(e) => setNewRel({ ...newRel, resourceId: e.target.value })}
              />
              <Input
                label="Relation"
                placeholder="e.g., admin"
                value={newRel.relation}
                onChange={(e) => setNewRel({ ...newRel, relation: e.target.value })}
              />
            </div>
            <div className="form-row">
              <Select
                label="Subject Type"
                options={RESOURCE_TYPES}
                value={newRel.subjectType}
                onChange={(e) => setNewRel({ ...newRel, subjectType: e.target.value })}
              />
              <Input
                label="Subject ID"
                placeholder="e.g., user-123"
                value={newRel.subjectId}
                onChange={(e) => setNewRel({ ...newRel, subjectId: e.target.value })}
              />
              <div className="form-actions">
                <Button variant="secondary" onClick={() => setShowAddForm(false)}>Cancel</Button>
                <Button 
                  loading={addMutation.isPending}
                  onClick={() => addMutation.mutate()}
                  disabled={!newRel.resourceId || !newRel.relation || !newRel.subjectId}
                >
                  Create
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      <Card title="Filter Relationships" className="filter-card">
        <div className="filter-form">
          <Select
            label="Resource Type"
            options={RESOURCE_TYPES}
            value={filter.resourceType}
            onChange={(e) => setFilter({ ...filter, resourceType: e.target.value })}
          />
          <Input
            label="Resource ID (optional)"
            placeholder="Leave empty for all"
            value={filter.resourceId}
            onChange={(e) => setFilter({ ...filter, resourceId: e.target.value })}
          />
          <Input
            label="Relation (optional)"
            placeholder="Leave empty for all"
            value={filter.relation}
            onChange={(e) => setFilter({ ...filter, relation: e.target.value })}
          />
          <Button variant="secondary" onClick={() => refetch()}>
            <Search size={16} />
            Search
          </Button>
        </div>
      </Card>

      <Card 
        title={`Results (${relationships.length})`}
        actions={
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            <RefreshCw size={14} />
          </Button>
        }
      >
        {isLoading ? (
          <div className="loading">Loading...</div>
        ) : relationships.length === 0 ? (
          <div className="empty">No relationships found</div>
        ) : (
          <div className="relationships-table">
            <div className="table-header">
              <span>Resource</span>
              <span>Relation</span>
              <span>Subject</span>
              <span></span>
            </div>
            {relationships.map((rel, i) => (
              <div key={i} className="table-row animate-slide-in" style={{ animationDelay: `${i * 30}ms` }}>
                <code className="resource">{rel.resource}</code>
                <span className="relation-badge">{rel.relation}</span>
                <code className="subject">{rel.subject}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteMutation.mutate(rel)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
