# Demonstration Scenarios

This document describes the demo scenarios that can be performed with the platform.

## Scenario 1: Organization-Wide Access Control

**Objective:** Demonstrate that users only see applications their organization is licensed for.

### Setup
- Org ACME is licensed for all applications
- Org Partner is licensed for Analytics Dashboard only

### Demo Flow
1. Log in as a user from Org ACME (`employee-acme-001`)
2. View the Product Catalogue - all 6 applications are visible
3. Log out and log in as a user from Org Partner (`employee-partner-001`)
4. View the Product Catalogue - only Analytics Dashboard is visible
5. Attempt to directly access Document Manager URL - access denied

### SpiceDB Relationships
```
application:analytics-dashboard#visible_to_org@organization:org-acme
application:document-manager#visible_to_org@organization:org-acme
application:analytics-dashboard#visible_to_org@organization:org-partner
# Note: document-manager NOT visible to org-partner
```

---

## Scenario 2: Resource-Level Permissions

**Objective:** Demonstrate fine-grained access control within a product.

### Setup
- Document A is owned by User 1, shared with User 2 as editor
- Document B is org-wide viewable
- Document C is private to User 3

### Demo Flow
1. Log in as User 1 - can edit Document A
2. Log in as User 2 - can edit Document A (via sharing)
3. Both users can view Document B (via org access)
4. Neither user can see Document C (private)
5. User 1 revokes User 2's access - immediate effect

### SpiceDB Relationships
```
docmgr_document:doc-a#owner@user:user-1
docmgr_document:doc-a#editor@user:user-2
docmgr_document:doc-b#org_visible@user:marker
docmgr_document:doc-c#owner@user:user-3
```

---

## Scenario 3: Federated User Access

**Objective:** Demonstrate B2B authentication and cross-organization access.

### Setup
- Partner organization has B2B federation configured
- Partner user is granted access to shared project folder

### Demo Flow
1. Partner user navigates to platform login
2. System redirects to partner's Entra ID (different tenant)
3. After authentication, user returns as guest
4. User sees only applications shared with partner org
5. User can access shared folder but not other org resources

### SpiceDB Relationships
```
organization:org-acme#external_partner@user:partner-user-id
docmgr_folder:folder-shared#viewer@user:partner-user-id
```

---

## Scenario 4: Department-Based Inheritance

**Objective:** Demonstrate hierarchical permission inheritance.

### Setup
- Sales Dashboard is visible to Sales department members
- Executive Dashboard is visible to all department managers

### Demo Flow
1. Log in as Sales rep - sees Sales Dashboard only
2. Log in as Sales manager - sees Sales + Executive dashboards
3. Log in as Engineering manager - sees Engineering + Executive dashboards
4. Add new member to Sales department - automatically sees Sales Dashboard

### SpiceDB Relationships
```
analytics_dashboard:dash-sales#department_viewer@department:dept-sales
analytics_dashboard:dash-executive#viewer@user:manager-sales
analytics_dashboard:dash-executive#viewer@user:manager-engineering

department:dept-sales#member@user:sales-rep-001
department:dept-sales#manager@user:manager-sales
```

---

## Scenario 5: Service Account Authorization

**Objective:** Demonstrate non-user authentication and authorization.

### Setup
- `report-generator` service account has read access to reporting API
- User-delegated calls use on-behalf-of flow

### Demo Flow
1. Service account authenticates via client credentials
2. Service account can invoke read endpoints
3. Service account cannot invoke write endpoints (not in scope)
4. Demonstrate on-behalf-of flow where service acts with user's permissions

### SpiceDB Relationships
```
reporting_scope:read#service_holder@service_account:report-generator
reporting_scope:export#service_holder@service_account:report-generator
# Note: write scope NOT granted
```

---

## Scenario 6: Permission Delegation and Sharing

**Objective:** Demonstrate user-initiated permission grants.

### Setup
- User creates a document
- User wants to share with external collaborator

### Demo Flow
1. User opens sharing dialog
2. User enters external email
3. System creates SpiceDB relationship granting view access
4. External user receives notification (simulated)
5. External user can access document
6. User revokes access - external user immediately loses access

### Admin Portal View
Use the Admin Portal to:
1. View all relationships for the document
2. See the viewer relationship created
3. Delete the relationship
4. Verify access is revoked via Permission Checker

---

## Scenario 7: Platform Administration

**Objective:** Demonstrate administrative override capabilities.

### Setup
- Platform admin needs to troubleshoot user access issue

### Demo Flow
1. Admin logs into Admin Portal
2. Admin navigates to Relationships page
3. Admin searches for user's relationships across all namespaces
4. Admin identifies missing relationship
5. Admin adds the relationship via UI
6. User's access is immediately restored
7. All actions are logged for audit

### Admin Portal Features
- View relationships by resource type
- Create new relationships
- Delete relationships
- Check permissions for any user/resource combination

---

## Running the Demos

### Prerequisites
1. All services running (see README.md)
2. Demo data seeded (`./scripts/seed-data.sh`)
3. Frontend apps accessible

### Demo User Mapping

For demos, map these conceptual users to real Entra ID users:

| Demo User | Role | Access Level |
|-----------|------|--------------|
| `admin-user-001` | Platform Super Admin | Full platform access |
| `ceo-acme` | Org ACME Owner | Full org access |
| `admin-acme-001` | Org ACME Admin | User management, all apps |
| `manager-sales` | Sales Manager | Sales dept + Executive dashboard |
| `employee-acme-001` | Regular Employee | Limited to assigned resources |
| `ceo-partner` | Partner Org Owner | Analytics only |

### Quick Demo Steps

1. **Open Product Catalogue** (`http://localhost:3000`)
   - Sign in with Microsoft
   - View your accessible applications
   - Toggle favorites

2. **Open Admin Portal** (`http://localhost:3001`)
   - View and create relationships
   - Test permissions with the Permission Checker

3. **Modify Permissions**
   - Add/remove relationships in Admin Portal
   - Refresh catalogue to see immediate effect

