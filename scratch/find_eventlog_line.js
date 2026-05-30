import fs from 'fs';

const content = fs.readFileSync('prisma/schema.prisma', 'utf8');
const lines = content.split('\n');

lines.forEach((line, index) => {
  if (line.includes('model EventLog')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
