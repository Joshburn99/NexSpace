const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Function to remove console.log statements
function removeConsoleLogs(content) {
  // Remove simple console.log statements
  content = content.replace(/^\s*console\.log\(.*?\);?\s*$/gm, '');
  
  // Remove multi-line console.log statements
  content = content.replace(/^\s*console\.log\([^)]*\n[^)]*\);?\s*$/gm, '');
  
  // Remove console.log statements that span multiple lines with proper indentation
  content = content.replace(/^\s*console\.log\(\s*[\s\S]*?\n\s*\);?\s*$/gm, '');
  
  // Clean up any resulting double blank lines
  content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
  
  return content;
}

// Find all TypeScript and JavaScript files
const patterns = [
  'client/src/**/*.{ts,tsx,js,jsx}',
  'server/**/*.{ts,tsx,js,jsx}'
];

let totalRemoved = 0;

patterns.forEach(pattern => {
  const files = glob.sync(pattern, { ignore: ['**/node_modules/**'] });
  
  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const originalLength = content.split('\n').length;
    
    const cleaned = removeConsoleLogs(content);
    const cleanedLength = cleaned.split('\n').length;
    
    if (content !== cleaned) {
      fs.writeFileSync(file, cleaned);
      const removed = originalLength - cleanedLength;
      totalRemoved += removed;
      console.log(`Cleaned ${file} - removed ~${removed} lines`);
    }
  });
});

console.log(`\nTotal console.log statements removed: ~${totalRemoved} lines`);