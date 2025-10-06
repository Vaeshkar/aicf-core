#!/bin/bash

# AICF v3.1.1 Production Deployment Script
# Automated deployment with safety checks and rollback capability

set -e  # Exit on any error

# Configuration
VERSION="3.1.1"
REPO_URL="https://github.com/yourusername/aicf-core.git"
STAGING_BRANCH="staging"
PRODUCTION_BRANCH="main"
BACKUP_DIR="./deployment-backups"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Pre-deployment checks
pre_deployment_checks() {
    log "🔍 Running pre-deployment checks..."
    
    # Check if we're in the right directory
    if [ ! -f "package.json" ] || ! grep -q "aicf-core" package.json; then
        error "Not in AICF project directory!"
        exit 1
    fi
    
    # Check git status
    if ! git status --porcelain | grep -q '^$'; then
        warning "Uncommitted changes detected!"
        git status --short
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    # Check if all security files exist
    REQUIRED_FILES=(
        "src/aicf-stream-reader.js"
        "src/pii-detector.js" 
        "src/aicf-secure-writer.js"
        "src/security-fixes.js"
        "docs/SECURITY_IMPROVEMENTS.md"
    )
    
    for file in "${REQUIRED_FILES[@]}"; do
        if [ ! -f "$file" ]; then
            error "Required security file missing: $file"
            exit 1
        fi
    done
    
    success "Pre-deployment checks passed!"
}

# Create staging environment
deploy_to_staging() {
    log "🚀 Deploying to staging environment..."
    
    # Create backup
    mkdir -p "$BACKUP_DIR"
    BACKUP_FILE="$BACKUP_DIR/backup-$(date +'%Y%m%d-%H%M%S').tar.gz"
    tar -czf "$BACKUP_FILE" --exclude=node_modules --exclude=.git . || true
    log "Backup created: $BACKUP_FILE"
    
    # Ensure staging branch exists and is up to date
    if git branch -r | grep -q "origin/$STAGING_BRANCH"; then
        git checkout "$STAGING_BRANCH"
        git pull origin "$STAGING_BRANCH"
    else
        git checkout -b "$STAGING_BRANCH"
    fi
    
    # Merge latest changes
    git merge "$PRODUCTION_BRANCH" --no-edit
    
    # Install dependencies
    log "📦 Installing dependencies..."
    npm install --production
    
    # Run staging-specific configurations
    export NODE_ENV=staging
    export AICF_LOG_LEVEL=debug
    
    success "Staging deployment completed!"
    log "Staging environment ready for testing at: $(pwd)"
}

# Deploy to production
deploy_to_production() {
    log "🚀 Deploying to production environment..."
    
    # Final confirmation
    echo -e "${YELLOW}You are about to deploy AICF v$VERSION to PRODUCTION!${NC}"
    read -p "Are you absolutely sure? Type 'DEPLOY' to continue: " -r
    if [ "$REPLY" != "DEPLOY" ]; then
        log "Deployment cancelled."
        exit 0
    fi
    
    # Switch to production branch
    git checkout "$PRODUCTION_BRANCH"
    git pull origin "$PRODUCTION_BRANCH"
    
    # Tag the release
    if git tag -l | grep -q "v$VERSION"; then
        warning "Tag v$VERSION already exists!"
    else
        git tag -a "v$VERSION" -m "AICF v$VERSION - Production-ready security update"
        log "Created release tag: v$VERSION"
    fi
    
    # Production environment setup
    export NODE_ENV=production
    export AICF_LOG_LEVEL=info
    
    # Install production dependencies
    npm ci --only=production
    
    # Push changes and tags
    git push origin "$PRODUCTION_BRANCH"
    git push origin --tags
    
    success "Production deployment completed!"
    success "AICF v$VERSION is now LIVE! 🎉"
}

# Rollback function
rollback() {
    log "🔄 Rolling back deployment..."
    
    # Find latest backup
    LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/backup-*.tar.gz 2>/dev/null | head -1)
    
    if [ -z "$LATEST_BACKUP" ]; then
        error "No backup found for rollback!"
        exit 1
    fi
    
    log "Rolling back to: $LATEST_BACKUP"
    
    # Extract backup
    tar -xzf "$LATEST_BACKUP"
    
    # Reinstall dependencies
    npm install
    
    success "Rollback completed!"
}

# Main deployment function
main() {
    log "🚀 AICF v$VERSION Production Deployment Starting..."
    
    case "${1:-deploy}" in
        "staging")
            pre_deployment_checks
            deploy_to_staging
            ;;
        "production")
            pre_deployment_checks
            deploy_to_staging
            log "⏳ Staging deployment completed. Please run smoke tests."
            read -p "Proceed to production? (y/N): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                deploy_to_production
            fi
            ;;
        "rollback")
            rollback
            ;;
        *)
            echo "Usage: $0 [staging|production|rollback]"
            echo ""
            echo "  staging    - Deploy to staging environment only"
            echo "  production - Deploy to staging, then production (with confirmation)"
            echo "  rollback   - Rollback to previous backup"
            echo ""
            echo "Default: production"
            exit 1
            ;;
    esac
    
    success "Deployment script completed successfully! ✅"
}

# Run main function with all arguments
main "$@"