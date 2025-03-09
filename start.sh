#!/bin/bash

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Find Node.js binary dynamically from NVM
NODE_BIN="$(which node)"

# Export environment variables from .env
export $(grep -v '^#' "$SCRIPT_DIR/.env" | xargs)

# Start Node.js app
$NODE_BIN "$SCRIPT_DIR/index.js" >> "$SCRIPT_DIR/log.txt" 2>&1 &

# Retry Serveo up to 5 times
MAX_RETRIES=5
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    echo "Attempt $(($RETRY_COUNT+1)) to start Serveo..."
    /usr/bin/ssh -o ServerAliveInterval=60 -R slackup-relay:80:localhost:3001 serveo.net >> "$SCRIPT_DIR/serveo.log" 2>&1 &
    SSH_PID=$!

    # Wait 10 seconds to check if SSH process is still running
    sleep 10

    if ps -p $SSH_PID > /dev/null; then
        echo "Serveo started successfully!"
        break
    else
        echo "Serveo failed. Retrying in 10 seconds..."
        RETRY_COUNT=$((RETRY_COUNT + 1))
        sleep 10
    fi
done

if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
    echo "Serveo failed after $MAX_RETRIES attempts. Giving up."
fi
