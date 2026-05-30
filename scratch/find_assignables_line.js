import fs from 'fs';

const content = fs.readFileSync('src/routes/crm.routes.js', 'utf8');
const lines = content.split('\n');

lines.forEach((line, index) => {
  if (line.includes('assignables')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
