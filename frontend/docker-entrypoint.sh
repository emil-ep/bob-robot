#!/bin/sh

# Generate env.js with runtime environment variables
cat > /usr/share/nginx/html/env.js << EOF
window.ENV = {
  API_BASE_URL: "${API_BASE_URL:-http://localhost}"
};
EOF

# Execute the CMD
exec "$@"

# Made with Bob
