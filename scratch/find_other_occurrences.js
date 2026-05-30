import fs from 'fs';

const files = [
  'src/routes/telecaller.routes.js',
  'src/routes/performance.routes.js',
  'src/routes/roles.routes.js'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      if (line.toUpperCase().includes('TELECALLER ADMIN') || line.includes('isAdminTC')) {
        console.log(`${file}:${index + 1}: ${line.trim()}`);
      }
    });
  }
});
