#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Enterprise Auth Platform - Initial Setup               ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}Checking prerequisites...${NC}"
    
    local missing=()
    
    if ! command -v docker &> /dev/null; then
        missing+=("docker")
    fi
    
    if ! command -v node &> /dev/null; then
        missing+=("node")
    fi
    
    if ! command -v npm &> /dev/null; then
        missing+=("npm")
    fi
    
    if ! command -v dotnet &> /dev/null; then
        missing+=("dotnet")
    fi
    
    if [ ${#missing[@]} -ne 0 ]; then
        echo -e "${RED}Missing required tools: ${missing[*]}${NC}"
        echo "Please install them before running this script."
        exit 1
    fi
    
    echo -e "${GREEN}✓ All prerequisites installed${NC}"
}

# Check if Docker is running
check_docker() {
    echo -e "${YELLOW}Checking Docker...${NC}"
    if ! docker info &> /dev/null; then
        echo -e "${RED}Docker is not running. Please start Docker first.${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Docker is running${NC}"
}

# Create .env file if not exists
create_env_file() {
    local env_file="$PROJECT_ROOT/.env"
    
    if [ -f "$env_file" ]; then
        echo -e "${YELLOW}Found existing .env file${NC}"
        read -p "Do you want to reconfigure? (y/N): " reconfigure
        if [[ ! "$reconfigure" =~ ^[Yy]$ ]]; then
            return
        fi
    fi
    
    echo -e "${YELLOW}Configuring environment variables...${NC}"
    echo ""
    
    read -p "Enter your Azure/Entra Tenant ID: " AZURE_TENANT_ID
    read -p "Enter your Azure/Entra Client ID (Application ID): " AZURE_CLIENT_ID
    read -p "Enter SpiceDB preshared key [mysecret]: " SPICEDB_TOKEN
    SPICEDB_TOKEN=${SPICEDB_TOKEN:-mysecret}
    
    cat > "$env_file" << EOF
# Microsoft Entra ID Configuration
AZURE_TENANT_ID=$AZURE_TENANT_ID
AZURE_CLIENT_ID=$AZURE_CLIENT_ID

# SpiceDB Configuration
SPICEDB_TOKEN=$SPICEDB_TOKEN
SPICEDB_ENDPOINT=localhost:50051

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Service Ports
AUTHZ_PORT=3010
CATALOGUE_API_PORT=5000
FRONTEND_PORT=3000
ADMIN_PORT=3020
EOF

    echo -e "${GREEN}✓ Environment file created at $env_file${NC}"
}

# Start infrastructure containers
start_infrastructure() {
    echo -e "${YELLOW}Starting infrastructure containers...${NC}"
    
    cd "$PROJECT_ROOT/infrastructure/docker"
    
    # Remove old containers if they exist
    docker rm -f spicedb-postgres spicedb platform-redis 2>/dev/null || true
    
    # Start only infrastructure services
    docker compose up -d spicedb-postgres redis
    
    echo "Waiting for PostgreSQL to be healthy..."
    sleep 5
    
    # Start SpiceDB
    docker compose up -d spicedb
    
    echo "Waiting for SpiceDB to start..."
    sleep 5
    
    echo -e "${GREEN}✓ Infrastructure containers started${NC}"
}

# Migrate SpiceDB
migrate_spicedb() {
    echo -e "${YELLOW}Migrating SpiceDB database...${NC}"
    
    docker exec spicedb spicedb datastore migrate head \
        --datastore-engine postgres \
        --datastore-conn-uri "postgres://spicedb:spicedbpass@spicedb-postgres:5432/spicedb?sslmode=disable"
    
    # Restart SpiceDB to pick up migrations
    docker restart spicedb
    sleep 3
    
    echo -e "${GREEN}✓ SpiceDB migrated${NC}"
}

# Install dependencies
install_dependencies() {
    echo -e "${YELLOW}Installing dependencies...${NC}"
    
    # AuthZ Service
    echo "  Installing AuthZ service dependencies..."
    cd "$PROJECT_ROOT/src/services/authz"
    npm install --silent
    npm run build
    
    # Frontend Catalogue
    echo "  Installing Catalogue frontend dependencies..."
    cd "$PROJECT_ROOT/src/frontend/catalogue"
    npm install --silent
    
    # Admin Portal (if exists)
    if [ -d "$PROJECT_ROOT/src/frontend/admin" ]; then
        echo "  Installing Admin portal dependencies..."
        cd "$PROJECT_ROOT/src/frontend/admin"
        npm install --silent
    fi
    
    # SpiceDB Admin (will be created)
    if [ -d "$PROJECT_ROOT/src/frontend/spicedb-admin" ]; then
        echo "  Installing SpiceDB Admin dependencies..."
        cd "$PROJECT_ROOT/src/frontend/spicedb-admin"
        npm install --silent
    fi
    
    # .NET projects
    echo "  Restoring .NET dependencies..."
    cd "$PROJECT_ROOT/src/backend"
    dotnet restore --verbosity quiet
    
    echo -e "${GREEN}✓ Dependencies installed${NC}"
}

# Apply SpiceDB schema
apply_schema() {
    echo -e "${YELLOW}Applying SpiceDB schema...${NC}"
    
    source "$PROJECT_ROOT/.env" 2>/dev/null || true
    
    cd "$PROJECT_ROOT/src/services/authz"
    node -e "
const { v1 } = require('@authzed/authzed-node');
const fs = require('fs');
const path = require('path');

const client = v1.NewClient(
  process.env.SPICEDB_TOKEN || 'mysecret',
  process.env.SPICEDB_ENDPOINT || 'localhost:50051',
  v1.ClientSecurity.INSECURE_LOCALHOST_ALLOWED
).promises;

const schema = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'schemas', 'spicedb', 'schema.zed'), 'utf-8');

client.writeSchema({ schema }).then(() => {
  console.log('Schema applied successfully');
  process.exit(0);
}).catch(err => {
  console.error('Failed to apply schema:', err.message);
  process.exit(1);
});
"
    
    echo -e "${GREEN}✓ SpiceDB schema applied${NC}"
}

# Seed demo data
seed_demo_data() {
    echo -e "${YELLOW}Would you like to seed demo data? (y/N): ${NC}"
    read -r seed_choice
    
    if [[ "$seed_choice" =~ ^[Yy]$ ]]; then
        echo "Enter your Entra ID Object ID (leave empty to skip user setup):"
        read -r user_oid
        
        source "$PROJECT_ROOT/.env" 2>/dev/null || true
        
        cd "$PROJECT_ROOT/src/services/authz"
        USER_OID="${user_oid:-demo-user}" node -e "
const { v1 } = require('@authzed/authzed-node');

const client = v1.NewClient(
  process.env.SPICEDB_TOKEN || 'mysecret',
  process.env.SPICEDB_ENDPOINT || 'localhost:50051',
  v1.ClientSecurity.INSECURE_LOCALHOST_ALLOWED
).promises;

const userId = process.env.USER_OID;

async function writeRel(resourceType, resourceId, relation, subjectType, subjectId) {
  await client.writeRelationships(v1.WriteRelationshipsRequest.create({
    updates: [v1.RelationshipUpdate.create({
      operation: v1.RelationshipUpdate_Operation.TOUCH,
      relationship: v1.Relationship.create({
        resource: v1.ObjectReference.create({ objectType: resourceType, objectId: resourceId }),
        relation: relation,
        subject: v1.SubjectReference.create({
          object: v1.ObjectReference.create({ objectType: subjectType, objectId: subjectId })
        })
      })
    })]
  }));
}

async function seed() {
  // Platform setup
  await writeRel('platform', 'main', 'super_admin', 'user', userId);
  
  // Organization setup
  await writeRel('organization', 'org-acme', 'platform', 'platform', 'main');
  await writeRel('organization', 'org-acme', 'owner', 'user', userId);
  
  // Applications
  const apps = ['analytics-dashboard', 'document-manager', 'reporting-api', 'admin-portal', 'team-calendar', 'expense-tracker'];
  for (const app of apps) {
    await writeRel('application', app, 'platform', 'platform', 'main');
    await writeRel('application', app, 'visible_to_org', 'organization', 'org-acme');
  }
  
  console.log('Demo data seeded for user:', userId);
}

seed().catch(err => { console.error('Failed:', err.message); process.exit(1); });
"
        echo -e "${GREEN}✓ Demo data seeded${NC}"
    fi
}

# Main setup flow
main() {
    check_prerequisites
    check_docker
    create_env_file
    start_infrastructure
    migrate_spicedb
    install_dependencies
    apply_schema
    seed_demo_data
    
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                    Setup Complete!                         ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "To start all services, run: ${BLUE}./scripts/services.sh start${NC}"
    echo -e "To stop all services, run:  ${BLUE}./scripts/services.sh stop${NC}"
    echo ""
    echo -e "Services will be available at:"
    echo -e "  Frontend Catalogue: ${BLUE}http://localhost:3000${NC}"
    echo -e "  SpiceDB Admin:      ${BLUE}http://localhost:3020${NC}"
    echo -e "  Catalogue API:      ${BLUE}http://localhost:5000${NC}"
    echo -e "  AuthZ Service:      ${BLUE}http://localhost:3010${NC}"
    echo ""
}

main "$@"
