# Enterprise Authentication & Authorization Platform

A comprehensive enterprise platform demonstrating modern authentication (Microsoft Entra ID) and fine-grained authorization (SpiceDB/Zanzibar) patterns.

## Quick Start

### Prerequisites

- Docker and Docker Compose
- .NET 8 SDK
- Node.js 20+
- An Azure/Entra ID tenant with an app registration

### First Time Setup

After cloning the repository, run the setup script:

```bash
./scripts/setup.sh
```

This will:
1. Check prerequisites (Docker, Node.js, .NET)
2. Configure environment variables (prompts for Entra ID credentials)
3. Start infrastructure containers (PostgreSQL, SpiceDB, Redis)
4. Migrate SpiceDB database
5. Install all dependencies
6. Apply SpiceDB schema
7. Optionally seed demo data

### Starting Services

```bash
# Start all services
./scripts/services.sh start

# Stop all services
./scripts/services.sh stop

# Restart all services
./scripts/services.sh restart

# Check status
./scripts/services.sh status

# View logs
./scripts/services.sh logs authz
./scripts/services.sh logs catalogue-api
./scripts/services.sh logs frontend
./scripts/services.sh logs admin
```

### Service URLs

| Service | URL | Description |
|---------|-----|-------------|
| **Product Catalogue** | http://localhost:3000 | Main user-facing application |
| **SpiceDB Admin** | http://localhost:3020 | Manage permissions & relationships |
| **Catalogue API** | http://localhost:5000 | Backend API |
| **AuthZ Service** | http://localhost:3010 | Authorization service |

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      Frontend Applications                       │
├────────────────┬────────────────┬────────────────┬──────────────┤
│   Catalogue    │  SpiceDB Admin │     Admin      │   (Mobile)   │
│   SPA :3000    │   GUI :3020    │  Portal :3001  │              │
└───────┬────────┴───────┬────────┴───────┬────────┴──────────────┘
        │                │                │
        └────────────────┼────────────────┘
                         │
                         ▼
            ┌────────────────────────┐
            │    YARP API Gateway    │
            │        :5000           │
            └───────────┬────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Catalogue API│ │ Analytics API│ │ DocManager   │
│    :5001     │ │    :5002     │ │    :5003     │
└──────┬───────┘ └──────┬───────┘ └──────┬───────┘
       │                │                │
       └────────────────┼────────────────┘
                        │
                        ▼
            ┌────────────────────────┐
            │    AuthZ Service       │
            │    (Node.js) :3010     │
            └───────────┬────────────┘
                        │
                        ▼
            ┌────────────────────────┐
            │       SpiceDB          │
            │    :50051 (gRPC)       │
            └───────────┬────────────┘
                        │
                        ▼
            ┌────────────────────────┐
            │      PostgreSQL        │
            │        :5432           │
            └────────────────────────┘
```

## SpiceDB Admin GUI

The SpiceDB Admin GUI (http://localhost:3020) provides a visual interface to:

- **Relationships**: View, create, and delete SpiceDB relationships
- **Permission Checker**: Test permissions and lookup resources/subjects
- **Users & Organizations**: Manage organization memberships and user roles
- **Schema**: Browse the authorization schema

### Adding Users to Organizations

1. Open SpiceDB Admin at http://localhost:3020
2. Navigate to "Users & Orgs"
3. Select an organization or create a new one
4. Add users by their Entra ID Object ID (OID)
5. Assign roles: Owner, Admin, Member, Billing Admin, or External Partner

### Testing Permissions

1. Navigate to "Permission Checker"
2. Select the resource type and permission to check
3. Enter the subject ID (user's Entra OID)
4. Click "Check Permission" to see if access is allowed

## Tech Stack

| Layer | Technology |
|-------|------------|
| Authentication | Microsoft Entra ID (Azure AD) |
| Authorization | SpiceDB (Zanzibar-based) |
| API Gateway | YARP (.NET) |
| Backend Services | .NET 8 Minimal APIs |
| AuthZ Service | Node.js/TypeScript |
| Frontend | React + Vite + MSAL.js |
| Database | PostgreSQL (for SpiceDB) |
| Caching | Redis |

## Project Structure

```
enterprise-authn-authz/
├── schemas/
│   └── spicedb/           # SpiceDB schema definitions
├── scripts/
│   ├── setup.sh           # Initial project setup
│   ├── services.sh        # Start/stop/restart services
│   └── seed-data.sh       # Seed demo data
├── src/
│   ├── backend/
│   │   ├── Gateway/       # YARP API Gateway
│   │   ├── Catalogue.Api/ # Product catalogue service
│   │   ├── Analytics.Api/ # Analytics dashboard service
│   │   ├── DocManager.Api/# Document management service
│   │   ├── Reporting.Api/ # Reporting API service
│   │   └── Shared/        # Shared .NET libraries
│   ├── frontend/
│   │   ├── catalogue/     # Product Catalogue SPA
│   │   ├── spicedb-admin/ # SpiceDB Admin GUI
│   │   ├── admin/         # Admin Portal SPA
│   │   └── analytics/     # Analytics Dashboard SPA
│   └── services/
│       └── authz/         # Node.js Authorization Service
├── infrastructure/
│   ├── docker/            # Docker configurations
│   └── k8s/              # Kubernetes manifests
└── docs/                  # Documentation
```

## SpiceDB Namespaces

| Namespace | Purpose |
|-----------|---------|
| `platform` | Global admin roles |
| `organization` | Multi-tenancy, org hierarchy |
| `department` | Department membership |
| `application` | Catalogue visibility |
| `analytics_dashboard` | Dashboard permissions |
| `docmgr_folder` | Folder hierarchy |
| `docmgr_document` | Document permissions |
| `reporting_scope` | API scopes |
| `reporting_endpoint` | Endpoint access |

## Environment Variables

Create a `.env` file in the project root (copy from `.env.example`):

```bash
cp .env.example .env
# Then edit .env with your values
```

See `.env.example` for all available configuration options.

## API Endpoints

### AuthZ Service (`:3010`)
- `POST /api/v1/check` - Check permission
- `POST /api/v1/check/bulk` - Bulk check permissions
- `POST /api/v1/relationships` - Create relationship
- `DELETE /api/v1/relationships` - Delete relationship
- `GET /api/v1/relationships` - Read relationships
- `POST /api/v1/lookup/resources` - Find accessible resources
- `POST /api/v1/lookup/subjects` - Find subjects with access
- `GET /api/v1/schema` - Get SpiceDB schema

### Catalogue API (`:5000`)
- `GET /api/applications` - List accessible applications
- `GET /api/applications/{id}` - Get application details
- `GET /api/applications/me` - Get current user info
- `GET /api/favorites` - Get user favorites
- `PUT /api/favorites` - Set favorites

## Demo Scenarios

### 1. Organization-Wide Access Control
Users only see applications their organization is licensed for.

### 2. Resource-Level Permissions
Fine-grained access to documents with owner/editor/viewer roles.

### 3. Federated User Access
External partners authenticate via their own Entra ID tenant.

### 4. Department-Based Inheritance
Dashboard visibility based on department membership.

### 5. Service Account Authorization
API access for automated processes using scopes.

## Configuring Entra ID

Add these redirect URIs to your app registration:
- `http://localhost:3000` (Product Catalogue)
- `http://localhost:3001` (Admin Portal)
- `http://localhost:3020` (SpiceDB Admin - if using auth)

Add the API scope:
- `api://{client-id}/access_as_user`

## Troubleshooting

### Services won't start
```bash
# Check Docker is running
docker info

# Check service status
./scripts/services.sh status

# View logs
./scripts/services.sh logs authz
```

### Permission denied on scripts
```bash
chmod +x scripts/*.sh
```

### SpiceDB connection errors
```bash
# Restart SpiceDB
docker restart spicedb

# Re-run migrations (replace password with your POSTGRES_PASSWORD)
docker exec spicedb spicedb datastore migrate head \
  --datastore-engine postgres \
  --datastore-conn-uri "postgres://spicedb:YOUR_PASSWORD@spicedb-postgres:5432/spicedb?sslmode=disable"
```

## License

MIT
