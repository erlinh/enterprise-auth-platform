import { useState, useEffect } from 'react';
import { FileCode, Copy, Check, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import './SchemaPage.css';

export default function SchemaPage() {
  const [schema, setSchema] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [selectedDef, setSelectedDef] = useState<string | null>(null);

  useEffect(() => {
    loadSchema();
  }, []);

  const loadSchema = async () => {
    setLoading(true);
    try {
      // Try to fetch from public folder or use embedded schema
      const response = await fetch('/api/v1/schema');
      if (response.ok) {
        const data = await response.json();
        setSchema(data.schema || '');
      } else {
        // Use embedded schema as fallback
        setSchema(EMBEDDED_SCHEMA);
      }
    } catch {
      setSchema(EMBEDDED_SCHEMA);
    }
    setLoading(false);
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(schema);
    setCopied(true);
    toast.success('Schema copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  // Parse definitions from schema
  const definitions = schema.match(/definition\s+(\w+)\s*\{/g)?.map(d => 
    d.match(/definition\s+(\w+)/)?.[1] || ''
  ).filter(Boolean) || [];

  // Get content for a definition
  const getDefinitionContent = (defName: string) => {
    const regex = new RegExp(`definition\\s+${defName}\\s*\\{([^}]+)\\}`, 's');
    const match = schema.match(regex);
    return match ? match[1].trim() : '';
  };

  return (
    <div className="page schema-page">
      <header className="page-header">
        <div>
          <h1>SpiceDB Schema</h1>
          <p>View and explore the authorization schema</p>
        </div>
        <div className="header-actions">
          <Button variant="secondary" onClick={loadSchema}>
            <RefreshCw size={16} />
            Reload
          </Button>
          <Button onClick={copyToClipboard}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Copied!' : 'Copy Schema'}
          </Button>
        </div>
      </header>

      <div className="schema-layout">
        <Card title="Definitions" className="defs-card">
          <div className="def-list">
            {definitions.map(def => (
              <button
                key={def}
                className={`def-item ${selectedDef === def ? 'selected' : ''}`}
                onClick={() => setSelectedDef(selectedDef === def ? null : def)}
              >
                <FileCode size={16} />
                <span>{def}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card 
          title={selectedDef ? `definition ${selectedDef}` : 'Full Schema'}
          className="schema-card"
        >
          {loading ? (
            <div className="loading">Loading schema...</div>
          ) : (
            <pre className="schema-code">
              <code>
                {selectedDef 
                  ? `definition ${selectedDef} {\n${getDefinitionContent(selectedDef).split('\n').map(l => '  ' + l).join('\n')}\n}`
                  : schema
                }
              </code>
            </pre>
          )}
        </Card>
      </div>

      <Card title="Schema Reference" className="reference-card">
        <div className="reference-grid">
          <div className="reference-section">
            <h4>Resource Types</h4>
            <ul>
              <li><code>user</code> - Individual users (Entra ID OID)</li>
              <li><code>platform</code> - Global platform administration</li>
              <li><code>organization</code> - Multi-tenant organizations</li>
              <li><code>application</code> - Product catalogue apps</li>
              <li><code>department</code> - Org departments</li>
              <li><code>team</code> - Teams within departments</li>
            </ul>
          </div>
          <div className="reference-section">
            <h4>Common Relations</h4>
            <ul>
              <li><code>owner</code> - Full ownership/control</li>
              <li><code>admin</code> - Administrative access</li>
              <li><code>member</code> - Standard membership</li>
              <li><code>viewer</code> - Read-only access</li>
              <li><code>editor</code> - Read/write access</li>
            </ul>
          </div>
          <div className="reference-section">
            <h4>Key Permissions</h4>
            <ul>
              <li><code>manage_all</code> - Super admin on platform</li>
              <li><code>is_member</code> - Check org membership</li>
              <li><code>can_view_in_catalogue</code> - App visibility</li>
              <li><code>view</code> / <code>edit</code> / <code>delete</code> - CRUD</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}

const EMBEDDED_SCHEMA = `/**
 * Enterprise Auth Platform - SpiceDB Schema
 */

definition user {}

definition service_account {
    relation organization: organization
    relation owner: user
    permission is_valid = organization->is_member
}

definition platform {
    relation super_admin: user
    relation platform_admin: user
    relation support_agent: user

    permission manage_all = super_admin
    permission manage_organizations = super_admin + platform_admin
    permission view_audit_logs = super_admin + platform_admin + support_agent
    permission impersonate_users = super_admin
    permission assist_users = super_admin + support_agent
}

definition organization {
    relation platform: platform
    relation owner: user
    relation admin: user
    relation billing_admin: user
    relation member: user
    relation external_partner: user

    permission manage_org = owner + platform->manage_organizations
    permission admin_access = owner + admin + platform->manage_organizations
    permission invite_members = owner + admin
    permission manage_billing = owner + billing_admin
    permission view_members = owner + admin + member + billing_admin
    permission view_billing = owner + billing_admin
    permission is_member = owner + admin + member + billing_admin
    permission is_admin = owner + admin + platform->manage_organizations
    permission is_external = external_partner
}

definition application {
    relation platform: platform
    relation category: category
    relation product: product
    relation visible_to_org: organization
    relation visible_to_user: user
    relation hidden_from_user: user

    permission can_view_in_catalogue = visible_to_org->is_member + visible_to_user + platform->manage_all - hidden_from_user
    permission can_launch = can_view_in_catalogue
    permission manage = platform->manage_all
}

// ... (truncated for display)
`;
