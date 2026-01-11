#!/bin/bash

# Apply SpiceDB schema
# Usage: ./apply-schema.sh [spicedb-endpoint] [preshared-key]

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SCHEMA_FILE="$PROJECT_ROOT/schemas/spicedb/schema.zed"
AUTHZ_DIR="$PROJECT_ROOT/src/services/authz"

SPICEDB_ENDPOINT=${1:-"localhost:50051"}
SPICEDB_TOKEN=${2:-"mysecret"}

echo "Applying SpiceDB schema from: $SCHEMA_FILE"
echo "SpiceDB endpoint: $SPICEDB_ENDPOINT"

# Check if schema file exists
if [ ! -f "$SCHEMA_FILE" ]; then
    echo "Error: Schema file not found: $SCHEMA_FILE"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "$AUTHZ_DIR/node_modules" ]; then
    echo "Installing authz service dependencies..."
    cd "$AUTHZ_DIR" && npm install
fi

# Apply schema using Node.js
cd "$AUTHZ_DIR"

node << 'EOF'
const { v1 } = require('@authzed/authzed-node');
const fs = require('fs');
const path = require('path');

const schemaPath = path.resolve(__dirname, '../../../schemas/spicedb/schema.zed');
const schema = fs.readFileSync(schemaPath, 'utf8');

const endpoint = process.env.SPICEDB_ENDPOINT || 'localhost:50051';
const token = process.env.SPICEDB_TOKEN || 'mysecret';

console.log(`Connecting to SpiceDB at ${endpoint}...`);

const client = v1.NewClient(
  token,
  endpoint,
  v1.ClientSecurity.INSECURE_PLAINTEXT_CREDENTIALS
);

const request = v1.WriteSchemaRequest.create({ schema });

client.writeSchema(request, (err, response) => {
  if (err) {
    console.error('❌ Schema validation failed:');
    console.error(err.message);
    if (err.details) {
      console.error('Details:', err.details);
    }
    process.exit(1);
  }
  
  console.log('✅ Schema applied successfully!');
  console.log('');
  
  // Read back the schema to confirm
  client.readSchema(v1.ReadSchemaRequest.create({}), (err, response) => {
    if (err) {
      console.error('Warning: Could not read back schema:', err.message);
      process.exit(0);
    }
    
    const lines = response.schemaText.split('\n').length;
    console.log(`Schema contains ${lines} lines`);
    
    // Count definitions
    const definitions = (response.schemaText.match(/^definition /gm) || []).length;
    console.log(`Schema contains ${definitions} definitions`);
    
    process.exit(0);
  });
});
EOF

echo ""
echo "Done!"
