const fs = require('fs');
const path = require('path');

const featuresDir = path.join('c:\\xampp\\htdocs\\ERP-App', 'src', 'features');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir(featuresDir, function(filePath) {
  const fileName = path.basename(filePath);
  if (!fileName.endsWith('Screen.tsx')) return;
  
  // Only target list screens
  if (!fileName.includes('Dashboard') && !fileName.includes('Gestionar') && !fileName.includes('Historial')) return;

  // Skip Clientes as we already did it manually
  if (fileName === 'ClientesDashboardScreen.tsx') return;

  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // 1. Add hook import
  if (!content.includes('usePullToRefresh')) {
    content = content.replace(
      /import React([^;]*);/,
      "import React$1;\nimport { usePullToRefresh } from '@core/hooks/usePullToRefresh';"
    );
    changed = true;
  }

  // 2. Add RefreshControl import if missing
  if (!content.includes('RefreshControl')) {
    // try to add to react-native import
    if (content.includes("from 'react-native';")) {
      content = content.replace(
        /import\s+\{([^}]+)\}\s+from\s+'react-native';/,
        "import { $1, RefreshControl } from 'react-native';"
      );
    } else {
      content = content.replace(
        /import React([^;]*);/,
        "import React$1;\nimport { RefreshControl } from 'react-native';"
      );
    }
    changed = true;
  }

  // 3. Inject hook call
  if (!content.includes('const { refreshing, onRefresh } = usePullToRefresh();')) {
    // Find the export default function or export function
    content = content.replace(
      /export (default )?function ([a-zA-Z0-9]+)\([^\)]*\)\s*\{/,
      "export $1function $2() {\n  const { refreshing, onRefresh } = usePullToRefresh();"
    );
    changed = true;
  }

  // 4. Add refreshControl prop to ScrollView or FlatList
  if (!content.includes('refreshControl={') && (content.includes('<ScrollView') || content.includes('<FlatList'))) {
    if (content.includes('<ScrollView')) {
      content = content.replace(
        /<ScrollView/,
        "<ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}"
      );
    } else if (content.includes('<FlatList')) {
      content = content.replace(
        /<FlatList/,
        "<FlatList refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}"
      );
    }
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Added PullToRefresh to:', fileName);
  }
});
