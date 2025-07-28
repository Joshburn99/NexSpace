const fs = require('fs');

// Read the routes.ts file
let content = fs.readFileSync('server/routes.ts', 'utf8');

// Fix pattern 1: Standalone template strings with closing parenthesis
// This matches lines like:
//   `[ROUTES] some message ${variable}`
// );
content = content.replace(/^\s*`\[[\w\s]+\].*?`\s*\n\s*\);$/gm, '');

// Fix pattern 2: Template strings that are arguments to removed console.log
// This matches:
//   `[ROUTES] message`,
//   { object: data }
// );
content = content.replace(/^\s*`\[[\w\s]+\].*?`,?\s*\n(\s*\{[\s\S]*?\}\s*\n)?\s*\);$/gm, '');

// Fix pattern 3: Object-only console.log leftovers
// This matches standalone objects followed by );
content = content.replace(/^\s*\{[\s\S]*?\}\s*\n\s*\);$/gm, '');

// Fix pattern 4: Remove lone closing parentheses that might be left over
// Only if they're preceded by whitespace and nothing else on the line
content = content.replace(/^\s*\);\s*$/gm, '');

// Write the fixed content back
fs.writeFileSync('server/routes.ts', content);

console.log('Fixed incomplete console.log statements in server/routes.ts');