const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'client/src/pages/enhanced-calendar-page.tsx');
const content = fs.readFileSync(file, 'utf8');

let openParens = 0;
let openBraces = 0;
let openBrackets = 0;
let inString = false;
let stringChar = null;
let escaped = false;
let inComment = false;
let inMultilineComment = false;

const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    const nextChar = line[j + 1];
    
    // Handle comments
    if (!inString && !inMultilineComment && char === '/' && nextChar === '/') {
      // Single line comment - skip rest of line
      break;
    }
    
    if (!inString && char === '/' && nextChar === '*') {
      inMultilineComment = true;
      j++; // Skip next char
      continue;
    }
    
    if (inMultilineComment && char === '*' && nextChar === '/') {
      inMultilineComment = false;
      j++; // Skip next char
      continue;
    }
    
    if (inMultilineComment) continue;
    
    // Handle strings
    if (!escaped && (char === '"' || char === "'" || char === '`')) {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
        stringChar = null;
      }
    }
    
    // Handle escape sequences
    if (char === '\\' && !escaped) {
      escaped = true;
      continue;
    }
    escaped = false;
    
    // Count brackets only outside strings
    if (!inString) {
      if (char === '(') openParens++;
      if (char === ')') openParens--;
      if (char === '{') openBraces++;
      if (char === '}') openBraces--;
      if (char === '[') openBrackets++;
      if (char === ']') openBrackets--;
      
      if (openParens < 0 || openBraces < 0 || openBrackets < 0) {
        console.log(`Mismatch at line ${i + 1}, char ${j + 1}:`);
        console.log(`Line: ${line}`);
        console.log(`Counts: parens=${openParens}, braces=${openBraces}, brackets=${openBrackets}`);
        process.exit(1);
      }
    }
  }
}

console.log(`Final counts at end of file:`);
console.log(`  Parentheses: ${openParens} (${openParens > 0 ? 'missing closing' : openParens < 0 ? 'extra closing' : 'balanced'})`);
console.log(`  Braces: ${openBraces} (${openBraces > 0 ? 'missing closing' : openBraces < 0 ? 'extra closing' : 'balanced'})`);
console.log(`  Brackets: ${openBrackets} (${openBrackets > 0 ? 'missing closing' : openBrackets < 0 ? 'extra closing' : 'balanced'})`);

if (openParens !== 0 || openBraces !== 0 || openBrackets !== 0) {
  console.log('\nFile has unmatched delimiters!');
  process.exit(1);
} else {
  console.log('\nAll delimiters are balanced.');
}