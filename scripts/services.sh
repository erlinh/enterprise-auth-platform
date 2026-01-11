#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PID_DIR="$PROJECT_ROOT/.pids"
LOG_DIR="$PROJECT_ROOT/.logs"

# Load environment
if [ -f "$PROJECT_ROOT/.env" ]; then
    export $(grep -v '^#' "$PROJECT_ROOT/.env" | xargs)
fi

# Default ports
AUTHZ_PORT=${AUTHZ_PORT:-3010}
CATALOGUE_API_PORT=${CATALOGUE_API_PORT:-5000}
FRONTEND_PORT=${FRONTEND_PORT:-3000}
ANALYTICS_PORT=${ANALYTICS_PORT:-3001}
DOCMANAGER_PORT=${DOCMANAGER_PORT:-3002}
REPORTING_PORT=${REPORTING_PORT:-3003}
ADMIN_PORT=${ADMIN_PORT:-3020}
SPICEDB_TOKEN=${SPICEDB_TOKEN:-mysecret}
SPICEDB_ENDPOINT=${SPICEDB_ENDPOINT:-localhost:50051}
REDIS_URL=${REDIS_URL:-redis://localhost:6379}

mkdir -p "$PID_DIR" "$LOG_DIR"

print_header() {
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║     Enterprise Auth Platform - Service Manager             ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Check if a process is running
is_running() {
    local pid_file="$PID_DIR/$1.pid"
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            return 0
        fi
    fi
    return 1
}

# Get PID of a service
get_pid() {
    local pid_file="$PID_DIR/$1.pid"
    if [ -f "$pid_file" ]; then
        cat "$pid_file"
    fi
}

# Start Docker infrastructure
start_infrastructure() {
    echo -e "${YELLOW}Starting infrastructure containers...${NC}"
    
    cd "$PROJECT_ROOT/infrastructure/docker"
    
    # Check if containers exist and are running
    if docker ps --format '{{.Names}}' | grep -q "spicedb"; then
        echo -e "  ${GREEN}✓${NC} SpiceDB already running"
    else
        docker compose up -d spicedb-postgres redis spicedb 2>/dev/null || {
            docker rm -f spicedb-postgres spicedb platform-redis 2>/dev/null || true
            docker compose up -d spicedb-postgres redis
            sleep 5
            docker compose up -d spicedb
        }
        echo -e "  ${GREEN}✓${NC} Infrastructure containers started"
    fi
}

# Stop Docker infrastructure
stop_infrastructure() {
    echo -e "${YELLOW}Stopping infrastructure containers...${NC}"
    cd "$PROJECT_ROOT/infrastructure/docker"
    docker compose down 2>/dev/null || true
    echo -e "  ${GREEN}✓${NC} Infrastructure containers stopped"
}

# Start AuthZ Service
start_authz() {
    if is_running "authz"; then
        echo -e "  ${GREEN}✓${NC} AuthZ Service already running (PID: $(get_pid authz))"
        return
    fi
    
    echo -e "  ${CYAN}Starting AuthZ Service on port $AUTHZ_PORT...${NC}"
    cd "$PROJECT_ROOT/src/services/authz"
    
    SPICEDB_ENDPOINT="$SPICEDB_ENDPOINT" \
    SPICEDB_TOKEN="$SPICEDB_TOKEN" \
    REDIS_URL="$REDIS_URL" \
    PORT="$AUTHZ_PORT" \
    node dist/index.js > "$LOG_DIR/authz.log" 2>&1 &
    
    echo $! > "$PID_DIR/authz.pid"
    sleep 2
    
    if is_running "authz"; then
        echo -e "  ${GREEN}✓${NC} AuthZ Service started (PID: $(get_pid authz))"
    else
        echo -e "  ${RED}✗${NC} AuthZ Service failed to start. Check $LOG_DIR/authz.log"
    fi
}

# Start Catalogue API
start_catalogue_api() {
    if is_running "catalogue-api"; then
        echo -e "  ${GREEN}✓${NC} Catalogue API already running (PID: $(get_pid catalogue-api))"
        return
    fi
    
    echo -e "  ${CYAN}Starting Catalogue API on port $CATALOGUE_API_PORT...${NC}"
    cd "$PROJECT_ROOT/src/backend/Catalogue.Api/Catalogue.Api"
    
    ASPNETCORE_URLS="http://localhost:$CATALOGUE_API_PORT" \
    ASPNETCORE_ENVIRONMENT=Development \
    dotnet run --no-launch-profile > "$LOG_DIR/catalogue-api.log" 2>&1 &
    
    echo $! > "$PID_DIR/catalogue-api.pid"
    sleep 5
    
    if is_running "catalogue-api"; then
        echo -e "  ${GREEN}✓${NC} Catalogue API started (PID: $(get_pid catalogue-api))"
    else
        echo -e "  ${RED}✗${NC} Catalogue API failed to start. Check $LOG_DIR/catalogue-api.log"
    fi
}

# Start Frontend Catalogue
start_frontend() {
    if is_running "frontend"; then
        echo -e "  ${GREEN}✓${NC} Frontend already running (PID: $(get_pid frontend))"
        return
    fi
    
    echo -e "  ${CYAN}Starting Frontend on port $FRONTEND_PORT...${NC}"
    cd "$PROJECT_ROOT/src/frontend/catalogue"
    
    npm run dev -- --port "$FRONTEND_PORT" --host > "$LOG_DIR/frontend.log" 2>&1 &
    
    echo $! > "$PID_DIR/frontend.pid"
    sleep 3
    
    if is_running "frontend"; then
        echo -e "  ${GREEN}✓${NC} Frontend started (PID: $(get_pid frontend))"
    else
        echo -e "  ${RED}✗${NC} Frontend failed to start. Check $LOG_DIR/frontend.log"
    fi
}

# Start SpiceDB Admin
start_admin() {
    if [ ! -d "$PROJECT_ROOT/src/frontend/spicedb-admin" ]; then
        echo -e "  ${YELLOW}⚠${NC} SpiceDB Admin not found, skipping"
        return
    fi
    
    if is_running "admin"; then
        echo -e "  ${GREEN}✓${NC} SpiceDB Admin already running (PID: $(get_pid admin))"
        return
    fi
    
    echo -e "  ${CYAN}Starting SpiceDB Admin on port $ADMIN_PORT...${NC}"
    cd "$PROJECT_ROOT/src/frontend/spicedb-admin"
    
    npm run dev -- --port "$ADMIN_PORT" --host > "$LOG_DIR/admin.log" 2>&1 &
    
    echo $! > "$PID_DIR/admin.pid"
    sleep 3
    
    if is_running "admin"; then
        echo -e "  ${GREEN}✓${NC} SpiceDB Admin started (PID: $(get_pid admin))"
    else
        echo -e "  ${RED}✗${NC} SpiceDB Admin failed to start. Check $LOG_DIR/admin.log"
    fi
}

# Start Analytics Dashboard
start_analytics() {
    if [ ! -d "$PROJECT_ROOT/src/frontend/analytics" ]; then
        echo -e "  ${YELLOW}⚠${NC} Analytics Dashboard not found, skipping"
        return
    fi
    
    if is_running "analytics"; then
        echo -e "  ${GREEN}✓${NC} Analytics Dashboard already running (PID: $(get_pid analytics))"
        return
    fi
    
    echo -e "  ${CYAN}Starting Analytics Dashboard on port $ANALYTICS_PORT...${NC}"
    cd "$PROJECT_ROOT/src/frontend/analytics"
    
    npm run dev -- --port "$ANALYTICS_PORT" --host > "$LOG_DIR/analytics.log" 2>&1 &
    
    echo $! > "$PID_DIR/analytics.pid"
    sleep 3
    
    if is_running "analytics"; then
        echo -e "  ${GREEN}✓${NC} Analytics Dashboard started (PID: $(get_pid analytics))"
    else
        echo -e "  ${RED}✗${NC} Analytics Dashboard failed to start. Check $LOG_DIR/analytics.log"
    fi
}

# Start Document Manager
start_docmanager() {
    if [ ! -d "$PROJECT_ROOT/src/frontend/docmanager" ]; then
        echo -e "  ${YELLOW}⚠${NC} Document Manager not found, skipping"
        return
    fi
    
    if is_running "docmanager"; then
        echo -e "  ${GREEN}✓${NC} Document Manager already running (PID: $(get_pid docmanager))"
        return
    fi
    
    echo -e "  ${CYAN}Starting Document Manager on port $DOCMANAGER_PORT...${NC}"
    cd "$PROJECT_ROOT/src/frontend/docmanager"
    
    npm run dev -- --port "$DOCMANAGER_PORT" --host > "$LOG_DIR/docmanager.log" 2>&1 &
    
    echo $! > "$PID_DIR/docmanager.pid"
    sleep 3
    
    if is_running "docmanager"; then
        echo -e "  ${GREEN}✓${NC} Document Manager started (PID: $(get_pid docmanager))"
    else
        echo -e "  ${RED}✗${NC} Document Manager failed to start. Check $LOG_DIR/docmanager.log"
    fi
}

# Start Reporting API UI
start_reporting() {
    if [ ! -d "$PROJECT_ROOT/src/frontend/reporting" ]; then
        echo -e "  ${YELLOW}⚠${NC} Reporting API not found, skipping"
        return
    fi
    
    if is_running "reporting"; then
        echo -e "  ${GREEN}✓${NC} Reporting API already running (PID: $(get_pid reporting))"
        return
    fi
    
    echo -e "  ${CYAN}Starting Reporting API on port $REPORTING_PORT...${NC}"
    cd "$PROJECT_ROOT/src/frontend/reporting"
    
    npm run dev -- --port "$REPORTING_PORT" --host > "$LOG_DIR/reporting.log" 2>&1 &
    
    echo $! > "$PID_DIR/reporting.pid"
    sleep 3
    
    if is_running "reporting"; then
        echo -e "  ${GREEN}✓${NC} Reporting API started (PID: $(get_pid reporting))"
    else
        echo -e "  ${RED}✗${NC} Reporting API failed to start. Check $LOG_DIR/reporting.log"
    fi
}

# Stop a service
stop_service() {
    local name=$1
    local pid_file="$PID_DIR/$name.pid"
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid" 2>/dev/null || true
            sleep 1
            kill -9 "$pid" 2>/dev/null || true
            echo -e "  ${GREEN}✓${NC} Stopped $name (PID: $pid)"
        fi
        rm -f "$pid_file"
    fi
}

# Stop all application services
stop_services() {
    echo -e "${YELLOW}Stopping application services...${NC}"
    
    stop_service "reporting"
    stop_service "docmanager"
    stop_service "analytics"
    stop_service "admin"
    stop_service "frontend"
    stop_service "catalogue-api"
    stop_service "authz"
    
    # Also kill by process name as fallback
    pkill -f "node.*authz" 2>/dev/null || true
    pkill -f "Catalogue.Api" 2>/dev/null || true
    pkill -f "vite.*catalogue" 2>/dev/null || true
    pkill -f "vite.*admin" 2>/dev/null || true
    pkill -f "vite.*analytics" 2>/dev/null || true
    pkill -f "vite.*docmanager" 2>/dev/null || true
    pkill -f "vite.*reporting" 2>/dev/null || true
    
    echo -e "${GREEN}✓ All application services stopped${NC}"
}

# Start all services
start_all() {
    print_header
    echo -e "${YELLOW}Starting all services...${NC}"
    echo ""
    
    start_infrastructure
    sleep 2
    
    echo -e "${YELLOW}Starting application services...${NC}"
    start_authz
    start_catalogue_api
    start_frontend
    start_admin
    start_analytics
    start_docmanager
    start_reporting
    
    echo ""
    echo -e "${GREEN}All services started!${NC}"
    echo ""
    show_status
}

# Stop all services
stop_all() {
    print_header
    stop_services
    stop_infrastructure
    echo ""
    echo -e "${GREEN}All services stopped${NC}"
}

# Restart all services
restart_all() {
    print_header
    echo -e "${YELLOW}Restarting all services...${NC}"
    echo ""
    stop_services
    sleep 2
    start_all
}

# Show status
show_status() {
    echo -e "${BLUE}Service Status:${NC}"
    echo ""
    
    # Docker containers
    echo -e "  ${CYAN}Infrastructure:${NC}"
    for container in spicedb-postgres spicedb platform-redis; do
        if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^$container$"; then
            echo -e "    ${GREEN}●${NC} $container"
        else
            echo -e "    ${RED}○${NC} $container"
        fi
    done
    
    echo ""
    echo -e "  ${CYAN}Applications:${NC}"
    
    # AuthZ Service
    if is_running "authz"; then
        echo -e "    ${GREEN}●${NC} AuthZ Service      http://localhost:$AUTHZ_PORT"
    else
        echo -e "    ${RED}○${NC} AuthZ Service"
    fi
    
    # Catalogue API
    if is_running "catalogue-api"; then
        echo -e "    ${GREEN}●${NC} Catalogue API      http://localhost:$CATALOGUE_API_PORT"
    else
        echo -e "    ${RED}○${NC} Catalogue API"
    fi
    
    # Frontend
    if is_running "frontend"; then
        echo -e "    ${GREEN}●${NC} Frontend           http://localhost:$FRONTEND_PORT"
    else
        echo -e "    ${RED}○${NC} Frontend"
    fi
    
    # Admin
    if [ -d "$PROJECT_ROOT/src/frontend/spicedb-admin" ]; then
        if is_running "admin"; then
            echo -e "    ${GREEN}●${NC} SpiceDB Admin      http://localhost:$ADMIN_PORT"
        else
            echo -e "    ${RED}○${NC} SpiceDB Admin"
        fi
    fi
    
    echo ""
    echo -e "  ${CYAN}Demo Applications:${NC}"
    
    # Analytics
    if [ -d "$PROJECT_ROOT/src/frontend/analytics" ]; then
        if is_running "analytics"; then
            echo -e "    ${GREEN}●${NC} Analytics          http://localhost:$ANALYTICS_PORT"
        else
            echo -e "    ${RED}○${NC} Analytics"
        fi
    fi
    
    # Document Manager
    if [ -d "$PROJECT_ROOT/src/frontend/docmanager" ]; then
        if is_running "docmanager"; then
            echo -e "    ${GREEN}●${NC} Document Manager   http://localhost:$DOCMANAGER_PORT"
        else
            echo -e "    ${RED}○${NC} Document Manager"
        fi
    fi
    
    # Reporting
    if [ -d "$PROJECT_ROOT/src/frontend/reporting" ]; then
        if is_running "reporting"; then
            echo -e "    ${GREEN}●${NC} Reporting API      http://localhost:$REPORTING_PORT"
        else
            echo -e "    ${RED}○${NC} Reporting API"
        fi
    fi
    
    echo ""
}

# Show logs
show_logs() {
    local service=$1
    local log_file="$LOG_DIR/$service.log"
    
    if [ -f "$log_file" ]; then
        tail -f "$log_file"
    else
        echo "No logs found for $service"
    fi
}

# Print usage
usage() {
    echo "Usage: $0 {start|stop|restart|status|logs <service>}"
    echo ""
    echo "Commands:"
    echo "  start     Start all services"
    echo "  stop      Stop all services"
    echo "  restart   Restart all services"
    echo "  status    Show service status"
    echo "  logs      Show logs for a service (authz|catalogue-api|frontend|admin)"
    echo ""
}

# Main
case "${1:-}" in
    start)
        start_all
        ;;
    stop)
        stop_all
        ;;
    restart)
        restart_all
        ;;
    status)
        print_header
        show_status
        ;;
    logs)
        if [ -z "${2:-}" ]; then
            echo "Please specify a service: authz, catalogue-api, frontend, admin"
            exit 1
        fi
        show_logs "$2"
        ;;
    *)
        usage
        exit 1
        ;;
esac
