#!/bin/bash

# Seed SpiceDB with demo data for demonstration scenarios
# Usage: ./seed-data.sh

AUTHZ_URL=${1:-"http://localhost:3010"}

echo "Seeding SpiceDB with demo data..."
echo "AuthZ Service URL: $AUTHZ_URL"

# Helper function to create a relationship
create_relationship() {
    local resource_type=$1
    local resource_id=$2
    local relation=$3
    local subject_type=$4
    local subject_id=$5

    echo "Creating: $resource_type:$resource_id#$relation@$subject_type:$subject_id"
    
    curl -s -X POST "$AUTHZ_URL/api/v1/relationships" \
        -H "Content-Type: application/json" \
        -d "{
            \"resourceType\": \"$resource_type\",
            \"resourceId\": \"$resource_id\",
            \"relation\": \"$relation\",
            \"subjectType\": \"$subject_type\",
            \"subjectId\": \"$subject_id\"
        }" > /dev/null
}

echo ""
echo "=== Creating Platform Admins ==="
create_relationship "platform" "main" "super_admin" "user" "admin-user-001"
create_relationship "platform" "main" "platform_admin" "user" "platform-admin-001"
create_relationship "platform" "main" "support_agent" "user" "support-user-001"

echo ""
echo "=== Creating Organizations ==="

# Organization A (Internal - full access)
create_relationship "organization" "org-acme" "owner" "user" "ceo-acme"
create_relationship "organization" "org-acme" "admin" "user" "admin-acme-001"
create_relationship "organization" "org-acme" "admin" "user" "admin-acme-002"
create_relationship "organization" "org-acme" "billing_admin" "user" "billing-acme"
create_relationship "organization" "org-acme" "member" "user" "employee-acme-001"
create_relationship "organization" "org-acme" "member" "user" "employee-acme-002"
create_relationship "organization" "org-acme" "member" "user" "employee-acme-003"

# Organization B (Partner - limited access)
create_relationship "organization" "org-partner" "owner" "user" "ceo-partner"
create_relationship "organization" "org-partner" "admin" "user" "admin-partner"
create_relationship "organization" "org-partner" "member" "user" "employee-partner-001"
create_relationship "organization" "org-partner" "external_partner" "user" "external-contractor-001"

echo ""
echo "=== Creating Departments ==="
create_relationship "department" "dept-sales" "organization" "organization" "org-acme"
create_relationship "department" "dept-sales" "manager" "user" "manager-sales"
create_relationship "department" "dept-sales" "member" "user" "employee-acme-001"

create_relationship "department" "dept-engineering" "organization" "organization" "org-acme"
create_relationship "department" "dept-engineering" "manager" "user" "manager-engineering"
create_relationship "department" "dept-engineering" "member" "user" "employee-acme-002"
create_relationship "department" "dept-engineering" "member" "user" "employee-acme-003"

echo ""
echo "=== Creating Application Visibility ==="
# All applications visible to Org ACME
create_relationship "application" "analytics-dashboard" "visible_to_org" "organization" "org-acme"
create_relationship "application" "document-manager" "visible_to_org" "organization" "org-acme"
create_relationship "application" "reporting-api" "visible_to_org" "organization" "org-acme"
create_relationship "application" "admin-portal" "visible_to_org" "organization" "org-acme"
create_relationship "application" "team-calendar" "visible_to_org" "organization" "org-acme"
create_relationship "application" "expense-tracker" "visible_to_org" "organization" "org-acme"

# Partner org only gets Analytics Dashboard
create_relationship "application" "analytics-dashboard" "visible_to_org" "organization" "org-partner"

echo ""
echo "=== Creating Analytics Dashboards ==="
# Sales Dashboard - visible to sales department
create_relationship "analytics_dashboard" "dash-sales" "organization" "organization" "org-acme"
create_relationship "analytics_dashboard" "dash-sales" "owner" "user" "manager-sales"
create_relationship "analytics_dashboard" "dash-sales" "department_viewer" "department" "dept-sales"

# Executive Dashboard - visible to managers only
create_relationship "analytics_dashboard" "dash-executive" "organization" "organization" "org-acme"
create_relationship "analytics_dashboard" "dash-executive" "owner" "user" "ceo-acme"
create_relationship "analytics_dashboard" "dash-executive" "viewer" "user" "manager-sales"
create_relationship "analytics_dashboard" "dash-executive" "viewer" "user" "manager-engineering"

# Private Dashboard
create_relationship "analytics_dashboard" "dash-private" "organization" "organization" "org-acme"
create_relationship "analytics_dashboard" "dash-private" "owner" "user" "employee-acme-001"

echo ""
echo "=== Creating Document Hierarchy ==="
# Shared folder - org visible
create_relationship "docmgr_folder" "folder-shared" "organization" "organization" "org-acme"
create_relationship "docmgr_folder" "folder-shared" "owner" "user" "admin-acme-001"
create_relationship "docmgr_folder" "folder-shared" "org_visible" "user" "marker"

# Projects folder - specific access
create_relationship "docmgr_folder" "folder-projects" "organization" "organization" "org-acme"
create_relationship "docmgr_folder" "folder-projects" "owner" "user" "manager-engineering"
create_relationship "docmgr_folder" "folder-projects" "editor" "user" "employee-acme-002"
create_relationship "docmgr_folder" "folder-projects" "viewer" "user" "employee-acme-003"

# Document in shared folder
create_relationship "docmgr_document" "doc-handbook" "folder" "docmgr_folder" "folder-shared"
create_relationship "docmgr_document" "doc-handbook" "owner" "user" "admin-acme-001"

# Private document
create_relationship "docmgr_document" "doc-private" "organization" "organization" "org-acme"
create_relationship "docmgr_document" "doc-private" "owner" "user" "employee-acme-001"

echo ""
echo "=== Creating API Scopes ==="
# Service account with read scope
create_relationship "reporting_scope" "read" "service_holder" "service_account" "report-generator"
create_relationship "reporting_scope" "export" "service_holder" "service_account" "report-generator"

# User with full access
create_relationship "reporting_scope" "read" "user_holder" "user" "admin-acme-001"
create_relationship "reporting_scope" "write" "user_holder" "user" "admin-acme-001"
create_relationship "reporting_scope" "admin" "user_holder" "user" "admin-acme-001"

echo ""
echo "=== Demo Data Seeding Complete ==="
echo ""
echo "Demo Users:"
echo "  - admin-user-001 (Platform Super Admin)"
echo "  - ceo-acme (Org ACME Owner)"
echo "  - admin-acme-001 (Org ACME Admin)"
echo "  - manager-sales (Sales Department Manager)"
echo "  - employee-acme-001 (Regular Employee)"
echo "  - ceo-partner (Partner Org Owner)"
echo ""
echo "Demo Organizations:"
echo "  - org-acme (Full access to all apps)"
echo "  - org-partner (Limited access - Analytics only)"
echo ""

