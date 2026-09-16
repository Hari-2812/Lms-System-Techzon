const fs = require('fs');
const path = require('path');

function checkDir(dir) {
  fs.readdirSync(dir).forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      checkDir(filePath);
    } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Remove imports
      let contentWithoutImports = content.replace(/import[\s\S]*?;/g, '');

      // Find all imports of lucide-react
      const importRegex = /import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"]/g;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        const icons = match[1].split(',').map(i => i.trim());
        icons.forEach(icon => {
          if (!icon) return;
          const regex = new RegExp('\\{\\s*' + icon + '\\s*\\}', 'g');
          const matches = contentWithoutImports.match(regex);
          if (matches) {
            console.log(filePath + ': ' + icon);
          }
        });
      }
    }
  });
}

checkDir('src');
