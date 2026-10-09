const fs = require('fs');
const path = require('path');

const candidates = [
  path.join(__dirname, '../node_modules/pdfjs-dist/build/pdf.worker.min.mjs'),
  path.join(__dirname, '../node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs'),
];
const dest = path.join(__dirname, '../public/pdf.worker.min.mjs');
const source = candidates.find((file) => fs.existsSync(file));

if (!source) {
  console.warn('[pdf-worker] pdfjs-dist worker not found; skip copy');
  process.exit(0);
}

fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.copyFileSync(source, dest);
console.log('[pdf-worker] copied to public/pdf.worker.min.mjs');
