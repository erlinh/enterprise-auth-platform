#!/bin/bash

# Apply SpiceDB schema
# Usage: ./apply-schema.sh [spicedb-endpoint] [preshared-key]

SPICEDB_ENDPOINT=${1:-"localhost:50051"}
SPICEDB_TOKEN=${2:-"mysecret"}
SCHEMA_FILE="$(dirname "$0")/../schemas/spicedb/schema.zed"

echo "Applying SpiceDB schema from: $SCHEMA_FILE"
echo "SpiceDB endpoint: $SPICEDB_ENDPOINT"

# Check if zed CLI is installed
if ! command -v zed &> /dev/null; then
    echo "zed CLI not found. Installing..."
    
    # Try to install via go
    if command -v go &> /dev/null; then
        go install github.com/authzed/zed@latest
    else
        echo "Please install the zed CLI: https://github.com/authzed/zed#installation"
        echo "Or use: brew install authzed/tap/zed (macOS)"
        exit 1
    fi
fi

# Set up zed context
zed context set local "$SPICEDB_ENDPOINT" "$SPICEDB_TOKEN" --insecure

# Apply the schema
echo "Writing schema to SpiceDB..."
zed schema write "$SCHEMA_FILE" --insecure

if [ $? -eq 0 ]; then
    echo "✓ Schema applied successfully!"
    
    # Show the current schema
    echo ""
    echo "Current schema:"
    zed schema read --insecure
else
    echo "✗ Failed to apply schema"
    exit 1
fi

