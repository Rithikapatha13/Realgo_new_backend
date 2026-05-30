import fs from 'fs';
import path from 'path';

function checkDir(dir) {
  try {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const fullPath = path.join(dir, file);
      try {
        const stats = fs.statSync(fullPath);
        if (stats.isDirectory()) {
          console.log(`Directory: ${fullPath} - Modified: ${stats.mtime.toLocaleString()}`);
        }
      } catch (e) {}
    });
  } catch (e) {}
}

console.log("d:\\Brandwar:");
checkDir("d:\\Brandwar");
console.log("c:\\Users\\vanis\\Downloads:");
checkDir("c:\\Users\\vanis\\Downloads");
