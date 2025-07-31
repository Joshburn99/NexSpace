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
let inSingleComment = false;
let inMultiComment = false;

const lines = content.split('\n');
const stack = []; // Track opening delimiters with their line numbers

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  inSingleComment = false;
  
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    const nextChar = line[j + 1];
    
    // Handle single-line comments
    if (!inString && !inMultiComment && char === '/' && nextChar === '/') {
      inSingleComment = true;
      break; // Skip rest of line
    }
    
    // Handle multi-line comments
    if (!inString && !inSingleComment && char === '/' && nextChar === '*') {
      inMultiComment = true;
      j++;
      continue;
    }
    
    if (inMultiComment && char === '*' && nextChar === '/') {
      inMultiComment = false;
      j++;
      continue;
    }
    
    if (inMultiComment || inSingleComment) continue;
    
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
    
    // Count delimiters only outside strings and comments
    if (!inString) {
      if (char === '(') {
        openParens++;
        stack.push({ type: '(', line: i + 1, col: j + 1 });
      }
      if (char === ')') {
        openParens--;
        const last = stack[stack.length - 1];
        if (last && last.type === '(') {
          stack.pop();
        }
      }
      if (char === '{') {
        openBraces++;
        stack.push({ type: '{', line: i + 1, col: j + 1 });
      }
      if (char === '}') {
        openBraces--;
        const last = stack[stack.length - 1];
        if (last && last.type === '{') {
          stack.pop();
        }
      }
      if (char === '[') {
        openBrackets++;
        stack.push({ type: '[', line: i + 1, col: j + 1 });
      }
      if (char === ']') {
        openBrackets--;
        const last = stack[stack.length - 1];
        if (last && last.type === '[') {
          stack.pop();
        }
      }
    }
  }
}

console.log('\nFinal delimiter counts:');
console.log(`  Parentheses: ${openParens} (${openParens > 0 ? 'missing ' + openParens + ' closing' : 'balanced'})`);
console.log(`  Braces: ${openBraces} (${openBraces > 0 ? 'missing ' + openBraces + ' closing' : 'balanced'})`);
console.log(`  Brackets: ${openBrackets} (${openBrackets > 0 ? 'missing ' + openBrackets + ' closing' : 'balanced'})`);

if (stack.length > 0) {
  console.log('\nUnclosed delimiters (most recent first):');
  stack.reverse().forEach((item, index) => {
    if (index < 20) { // Show only first 20
      console.log(`  ${item.type} at line ${item.line}, column ${item.col}`);
    }
  });
  
  if (stack.length > 20) {
    console.log(`  ... and ${stack.length - 20} more`);
  }
}