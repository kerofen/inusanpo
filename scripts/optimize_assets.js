const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const targetDir = process.argv[2] || 'assets';
const ASSETS_DIR = path.join(__dirname, '..', targetDir);

const MAX_BG_WIDTH = 1080;
const MAX_BG_HEIGHT = 1920;
const MAX_ICON_SIZE = 512;
const MAX_CHAR_SIZE = 512;
const PNG_QUALITY = { compressionLevel: 9, effort: 10 };

const BG_DIRS = ['kisekae', 'mainmenu', 'osanpo', 'title', 'nikukyu'];

let totalBefore = 0;
let totalAfter = 0;
let processed = 0;

async function getAllPngs(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...await getAllPngs(fullPath));
    } else if (entry.name.toLowerCase().endsWith('.png')) {
      results.push(fullPath);
    }
  }
  return results;
}

function isBgDir(filePath) {
  const rel = path.relative(ASSETS_DIR, filePath);
  return BG_DIRS.some(d => rel.startsWith(d + path.sep) || rel.startsWith(d + '/'));
}

async function optimizeImage(filePath) {
  const before = fs.statSync(filePath).size;
  totalBefore += before;

  try {
    const meta = await sharp(filePath).metadata();
    let pipeline = sharp(filePath);
    const isBg = isBgDir(filePath);

    if (isBg && (meta.width > MAX_BG_WIDTH || meta.height > MAX_BG_HEIGHT)) {
      pipeline = pipeline.resize(MAX_BG_WIDTH, MAX_BG_HEIGHT, {
        fit: 'inside',
        withoutEnlargement: true
      });
    } else if (!isBg && meta.width > MAX_CHAR_SIZE && meta.height > MAX_CHAR_SIZE) {
      pipeline = pipeline.resize(MAX_CHAR_SIZE, MAX_CHAR_SIZE, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }

    const buffer = await pipeline
      .png(PNG_QUALITY)
      .toBuffer();

    if (buffer.length < before) {
      fs.writeFileSync(filePath, buffer);
      totalAfter += buffer.length;
      const saved = ((1 - buffer.length / before) * 100).toFixed(0);
      processed++;
      if (before - buffer.length > 100000) {
        const rel = path.relative(ASSETS_DIR, filePath);
        console.log(`  ${rel}: ${(before/1024/1024).toFixed(1)}MB -> ${(buffer.length/1024/1024).toFixed(1)}MB (-${saved}%)`);
      }
    } else {
      totalAfter += before;
    }
  } catch (err) {
    console.error(`Error: ${filePath}: ${err.message}`);
    totalAfter += before;
  }
}

async function main() {
  console.log('=== Asset Optimization ===');
  console.log(`Source: ${ASSETS_DIR}\n`);

  const files = await getAllPngs(ASSETS_DIR);
  console.log(`Found ${files.length} PNG files\n`);

  for (const f of files) {
    await optimizeImage(f);
  }

  console.log(`\n=== Results ===`);
  console.log(`Processed: ${processed}/${files.length} files`);
  console.log(`Before: ${(totalBefore/1024/1024).toFixed(1)} MB`);
  console.log(`After:  ${(totalAfter/1024/1024).toFixed(1)} MB`);
  console.log(`Saved:  ${((totalBefore-totalAfter)/1024/1024).toFixed(1)} MB (${((1-totalAfter/totalBefore)*100).toFixed(0)}%)`);
}

main().catch(console.error);
