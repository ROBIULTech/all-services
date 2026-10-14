const fs = require('fs');
const parser = require('@babel/parser');

let code = fs.readFileSync('src/components/UserPanel.tsx', 'utf8');

const ast = parser.parse(code, {
  sourceType: 'module',
  plugins: ['typescript', 'jsx'],
  errorRecovery: true
});

console.log("Total errors:", ast.errors ? ast.errors.length : 0);
if (ast.errors) {
  for (let i = 0; i < Math.min(20, ast.errors.length); i++) {
    const err = ast.errors[i];
    console.log(`[${i+1}] Line ${err.loc ? err.loc.line : '?'}: ${err.message}`);
  }
}
