const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'client/src/pages/enhanced-calendar-page.tsx');
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');

// Find specific patterns
console.log('=== Conditional Blocks Analysis ===\n');

// Find all {selectedShift && ( patterns
const selectedShiftBlocks = [];
lines.forEach((line, i) => {
  if (line.includes('{selectedShift && (')) {
    selectedShiftBlocks.push({ line: i + 1, content: line.trim() });
  }
});

console.log('Found {selectedShift && ( blocks:');
selectedShiftBlocks.forEach(block => {
  console.log(`  Line ${block.line}: ${block.content}`);
});

// Find potential closing )} patterns for these blocks
console.log('\nPotential closing )} patterns:');
lines.forEach((line, i) => {
  if (line.trim() === ')}' && i > 1000) {
    console.log(`  Line ${i + 1}: ${line.trim()}`);
  }
});

// Check for Dialog components
console.log('\n=== Dialog Components ===\n');
const dialogOpens = [];
const dialogCloses = [];

lines.forEach((line, i) => {
  if (line.includes('<Dialog') && line.includes('open=')) {
    dialogOpens.push({ line: i + 1, content: line.trim() });
  }
  if (line.includes('</Dialog>')) {
    dialogCloses.push({ line: i + 1, content: line.trim() });
  }
});

console.log('Dialog opens:');
dialogOpens.forEach(d => console.log(`  Line ${d.line}: ${d.content.substring(0, 80)}...`));

console.log('\nDialog closes:');
dialogCloses.forEach(d => console.log(`  Line ${d.line}: ${d.content}`));

// Check return statement
console.log('\n=== Return Statement ===\n');
lines.forEach((line, i) => {
  if (line.trim().startsWith('return (') && i > 200 && i < 700) {
    console.log(`Main return statement at line ${i + 1}`);
  }
});

// Check component function definition
console.log('\n=== Component Definition ===\n');
lines.forEach((line, i) => {
  if (line.includes('function EnhancedCalendarPage') || line.includes('export default function')) {
    console.log(`Component definition at line ${i + 1}: ${line.trim()}`);
  }
});

// Analyze the end of file structure
console.log('\n=== End of File Structure ===\n');
for (let i = lines.length - 10; i < lines.length; i++) {
  if (i >= 0) {
    console.log(`Line ${i + 1}: "${lines[i]}"`);
  }
}