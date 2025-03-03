#!/bin/bash
# Enhanced deployment script with better error handling and output

# Load environment variables
if [[ ! -f .env ]]; then
  echo "Error: .env file not found!"
  exit 1
fi
source .env

# Check for required environment variables
if [[ -z "$DOMAIN" || -z "$DIGITAL_OCEAN_APP_ID" || -z "$DIGITAL_OCEAN_API" ]]; then
  echo "Error: Required environment variables missing in .env file"
  echo "Please ensure DOMAIN, DIGITAL_OCEAN_APP_ID, and DIGITAL_OCEAN_API are set"
  exit 1
fi

# Terminal colors for better output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to display step information
function step() {
  echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} $1"
}

# Function to display success messages
function success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Function to display warning messages
function warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to display error messages
function error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Check if there are changes to commit
step "Checking for changes..."
git diff --quiet && git diff --staged --quiet
if [[ $? -eq 0 ]]; then
  warning "Nothing to commit, working tree clean!"
  exit 0
fi

# Add and commit changes
step "Adding changes to git..."
git add .

step "Committing changes..."
git commit -m "updated"

# Push changes
step "Pushing to remote repository..."
output=$(git push origin island-bitcoin 2>&1)
echo "$output"

# Check if there was nothing to commit
if [[ "$output" == *"nothing to commit, working tree clean"* ]]; then
  warning "Nothing was changed! No need to run https://$DOMAIN/api/notifier/run"
  exit 0
fi

# Wait for deployment to start
echo ""
step "Waiting to run https://$DOMAIN/api/notifier/run..."
echo -e "${BLUE}-------------------------------------------------------------${NC}"

# Wait a bit for the deployment to register in DigitalOcean
sleep 5

# Get the most recent deployment ID
step "Fetching recent deployment ID..."
deployment_response=$(curl -s -X GET "https://api.digitalocean.com/v2/apps/$DIGITAL_OCEAN_APP_ID/deployments" \
-H "Authorization: Bearer $DIGITAL_OCEAN_API" \
-H "Content-Type: application/json")

# Check if we got a valid response
if [[ $(echo "$deployment_response" | jq -r 'has("deployments")') != "true" ]]; then
  error "API request failed. Response: $(echo "$deployment_response" | jq -r '.message // "Unknown error"')"
  error "Please check your DIGITAL_OCEAN_API token and DIGITAL_OCEAN_APP_ID"
  exit 1
fi

# Check if there are any deployments
if [[ $(echo "$deployment_response" | jq -r '.deployments | length') -eq 0 ]]; then
  warning "No deployments found. Waiting for deployment to start..."
  sleep 15
  deployment_response=$(curl -s -X GET "https://api.digitalocean.com/v2/apps/$DIGITAL_OCEAN_APP_ID/deployments" \
  -H "Authorization: Bearer $DIGITAL_OCEAN_API" \
  -H "Content-Type: application/json")
  
  if [[ $(echo "$deployment_response" | jq -r '.deployments | length') -eq 0 ]]; then
    error "Still no deployments found after waiting. Deployment may not have triggered."
    warning "Continuing without waiting for deployment. Running notifier directly..."
    step "Running notifier..."
    notifier_result=$(curl -s "https://$DOMAIN/api/notifier/run")
    success "Notifier executed: $notifier_result"
    exit 0
  fi
fi

recent_deployment_id=$(echo "$deployment_response" | jq -r '.deployments[0].id')

if [[ -z "$recent_deployment_id" || "$recent_deployment_id" == "null" ]]; then
  error "Failed to get deployment ID. Check your credentials and app ID."
  exit 1
fi

success "Found deployment ID: $recent_deployment_id"

# Add a fallback option
step "Would you like to run the notifier directly without waiting? [y/N] (10s timeout)"
read -t 10 -n 1 run_directly
echo ""

if [[ "$run_directly" == "y" || "$run_directly" == "Y" ]]; then
  step "Running notifier directly..."
  notifier_result=$(curl -s "https://$DOMAIN/api/notifier/run")
  success "Notifier executed: $notifier_result"
  exit 0
fi

# Track the deployment status
prev_status=""
dots=""
step "Monitoring deployment status..."

while true; do
  # Get the current deployment status
  deployment_response=$(curl -s -X GET "https://api.digitalocean.com/v2/apps/$DIGITAL_OCEAN_APP_ID/deployments/$recent_deployment_id" \
  -H "Authorization: Bearer $DIGITAL_OCEAN_API" \
  -H "Content-Type: application/json")
  
  deployment_status=$(echo "$deployment_response" | jq -r '.deployment.phase // "UNKNOWN"')
  
  # Handle null status
  if [[ -z "$deployment_status" || "$deployment_status" == "null" ]]; then
    deployment_status="PENDING"
  fi
  
  # Show status change
  if [[ "$deployment_status" != "$prev_status" ]]; then
    echo -e "\n${YELLOW}Deployment status:${NC} $deployment_status"
    prev_status=$deployment_status
    dots=""
  else
    # Show progress with rotating spinner
    spinner=("-" "\\" "|" "/")
    printf "\r${BLUE}[${spinner[$(($(date +%s) % 4))}]${NC} Waiting... %s" "$dots"
    dots="$dots."
    if [[ ${#dots} -gt 50 ]]; then
      dots="."
    fi
  fi
  
  # Check for completion
  if [[ "$deployment_status" == "ACTIVE" ]]; then
    echo ""
    success "Deployment completed successfully!"
    step "Running notifier..."
    
    # Call the notifier endpoint
    notifier_result=$(curl -s "https://$DOMAIN/api/notifier/run")
    success "Notifier executed: $notifier_result"
    break
  fi
  
  # Check for error
  if [[ "$deployment_status" == "ERROR" ]]; then
    echo ""
    error "Deployment failed with status: ERROR"
    exit 1
  fi
  
  # Wait before checking again
  sleep 2
done

success "Deployment process completed!"