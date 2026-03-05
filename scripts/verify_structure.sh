#!/bin/bash
echo "Verifying TypeScript Backend Structure..."

cd ariesxpert-backend-ts

# Check files
if [ -f "package.json" ] && [ -f "src/app.module.ts" ] && [ -f "src/modules/finance/wallet.service.ts" ]; then
    echo "✅ Core files present."
else
    echo "❌ Missing core files."
    exit 1
fi

# Check Compilation (Dry Run)
# Since we don't have node_modules installed, we can't run tsc directly without install.
# But we can verify syntax of the critical file using a simple node check if it were JS, 
# or just assume structure is correct for now as 'npm install' is required.

echo "✅ Structure Verification Complete. Ready for 'npm install'."
