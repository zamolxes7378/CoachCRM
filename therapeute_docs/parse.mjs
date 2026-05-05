import pkg from 'xlsx';
const { readFile, utils } = pkg;
import fs from 'fs';

const files = fs.readdirSync('.').filter(f => f.endsWith('.ods'));
let md = '# Data Summary\n\n';

for (const file of files) {
  md += `## File: ${file}\n`;
  const wb = readFile(file);
  for (const sheetName of wb.SheetNames) {
    md += `### Sheet: ${sheetName}\n`;
    const ws = wb.Sheets[sheetName];
    const data = utils.sheet_to_json(ws, { header: 1 });
    let printed = 0;
    md += '```json\n[\n';
    for (const row of data) {
      if (row && row.length > 0 && row.some(cell => cell !== null && cell !== undefined && cell !== '')) {
        md += '  ' + JSON.stringify(row) + ',\n';
        printed++;
        if (printed >= 5) break;
      }
    }
    md += ']\n```\n\n';
  }
}
fs.writeFileSync('summary.md', md);
