const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const OUTPUT_DIR = path.join(__dirname, 'store-assets');

const SCREENSHOTS = [
  {
    id: '01_title',
    iphoneFile: 'ss_10.26.44.png',
    ipadFile: 'ipad_ss_10.26.44.png',
    heading: 'かわいい犬たちと',
    heading2: '一筆書きパズル！',
    sub: 'つなげて遊ぼう！',
    gradientTop: '#87CEEB',
    gradientBottom: '#A8E6CF',
  },
  {
    id: '02_gameplay',
    iphoneFile: 'ss_10.27.00.png',
    ipadFile: 'ipad_ss_10.27.00.png',
    heading: 'なぞって犬を',
    heading2: 'つなげよう！',
    sub: '頭を使う一筆書き',
    gradientTop: '#B8E6B8',
    gradientBottom: '#F5E6A3',
  },
  {
    id: '03_clear',
    iphoneFile: 'ss_10.27.14.png',
    ipadFile: 'ipad_ss_10.27.14.png',
    heading: 'ステージクリアで',
    heading2: 'ごほうび！',
    sub: 'おさんぽたのしかったね！',
    gradientTop: '#FFD1DC',
    gradientBottom: '#FFDAB9',
  },
  {
    id: '04_dogget',
    iphoneFile: 'ss_10.27.18.png',
    ipadFile: 'ipad_ss_10.27.18.png',
    heading: '新しい犬友だちを',
    heading2: 'ゲット！',
    sub: '全32種類以上！',
    gradientTop: '#FFE4B5',
    gradientBottom: '#FFFACD',
  },
  {
    id: '05_collection',
    iphoneFile: 'ss_10.27.34.png',
    ipadFile: 'ipad_ss_10.27.34.png',
    heading: '犬のずかんを',
    heading2: 'コンプリート！',
    sub: 'レア犬もいるよ！',
    gradientTop: '#E0BBE4',
    gradientBottom: '#B5C7E3',
  },
];

const TARGET_SIZES = {
  'apple_iphone67': { w: 1290, h: 2796, source: 'iphone', label: 'Apple iPhone 6.7"' },
  'apple_iphone65': { w: 1284, h: 2778, source: 'iphone', label: 'Apple iPhone 6.5"' },
  'apple_iphone55': { w: 1242, h: 2208, source: 'iphone', label: 'Apple iPhone 5.5"' },
  'apple_ipad129':  { w: 2048, h: 2732, source: 'ipad',   label: 'Apple iPad 12.9"' },
  'google_phone':   { w: 1080, h: 1920, source: 'iphone', label: 'Google Play Phone' },
};

function createGradientSVG(w, h, topColor, bottomColor) {
  return Buffer.from(`<svg width="${w}" height="${h}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${topColor}"/>
        <stop offset="100%" stop-color="${bottomColor}"/>
      </linearGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#bg)"/>
  </svg>`);
}

function createTextOverlaySVG(w, h, heading1, heading2, sub, textAreaH) {
  const fontSize = Math.round(w * 0.065);
  const subFontSize = Math.round(w * 0.032);
  const lineHeight = fontSize * 1.35;
  const textY1 = textAreaH * 0.32;
  const textY2 = textY1 + lineHeight;
  const subY = textY2 + lineHeight * 0.8;

  return Buffer.from(`<svg width="${w}" height="${textAreaH}">
    <defs>
      <linearGradient id="textBg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="white" stop-opacity="0.92"/>
        <stop offset="70%" stop-color="white" stop-opacity="0.75"/>
        <stop offset="100%" stop-color="white" stop-opacity="0"/>
      </linearGradient>
      <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="white" flood-opacity="0.8"/>
      </filter>
    </defs>
    <rect width="${w}" height="${textAreaH}" fill="url(#textBg)"/>
    <text x="${w/2}" y="${textY1}" text-anchor="middle" font-family="'Hiragino Kaku Gothic ProN','Hiragino Sans','Yu Gothic','Meiryo',sans-serif" font-size="${fontSize}" font-weight="900" fill="#5D4E37" filter="url(#shadow)">${escapeXml(heading1)}</text>
    <text x="${w/2}" y="${textY2}" text-anchor="middle" font-family="'Hiragino Kaku Gothic ProN','Hiragino Sans','Yu Gothic','Meiryo',sans-serif" font-size="${fontSize}" font-weight="900" fill="#5D4E37" filter="url(#shadow)">${escapeXml(heading2)}</text>
    <text x="${w/2}" y="${subY}" text-anchor="middle" font-family="'Hiragino Kaku Gothic ProN','Hiragino Sans','Yu Gothic','Meiryo',sans-serif" font-size="${subFontSize}" font-weight="700" fill="#8B7355">${escapeXml(sub)}</text>
  </svg>`);
}

function createShadowSVG(w, h, radius) {
  return Buffer.from(`<svg width="${w}" height="${h}">
    <defs>
      <filter id="dropShadow" x="-5%" y="-5%" width="110%" height="110%">
        <feDropShadow dx="0" dy="6" stdDeviation="12" flood-color="#000000" flood-opacity="0.18"/>
      </filter>
    </defs>
    <rect x="10" y="6" width="${w - 20}" height="${h - 16}" rx="${radius}" ry="${radius}" fill="white" filter="url(#dropShadow)"/>
  </svg>`);
}

function createRoundedMask(w, h, radius) {
  return Buffer.from(`<svg width="${w}" height="${h}">
    <rect width="${w}" height="${h}" rx="${radius}" ry="${radius}" fill="white"/>
  </svg>`);
}

function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function generateScreenshot(ss, sizeKey) {
  const target = TARGET_SIZES[sizeKey];
  const w = target.w;
  const h = target.h;

  const sourceFile = target.source === 'ipad' ? ss.ipadFile : ss.iphoneFile;
  const sourcePath = path.join(__dirname, sourceFile);

  const textAreaH = Math.round(h * 0.26);
  const ssAreaH = h - textAreaH;

  const ssDisplayW = Math.round(w * 0.88);
  const ssDisplayH = Math.round(ssAreaH * 0.95);
  const ssRadius = Math.round(w * 0.025);

  const ssImage = await sharp(sourcePath)
    .resize(ssDisplayW, ssDisplayH, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const ssMetadata = await sharp(ssImage).metadata();
  const actualSSW = ssMetadata.width;
  const actualSSH = ssMetadata.height;

  const roundedMask = createRoundedMask(actualSSW, actualSSH, ssRadius);
  const roundedSS = await sharp(ssImage)
    .composite([{
      input: await sharp(roundedMask).png().toBuffer(),
      blend: 'dest-in',
    }])
    .png()
    .toBuffer();

  const shadowW = actualSSW + 30;
  const shadowH = actualSSH + 30;
  const shadowSVG = createShadowSVG(shadowW, shadowH, ssRadius);
  const shadowBuf = await sharp(shadowSVG).png().toBuffer();

  const ssWithShadow = await sharp(shadowBuf)
    .resize(shadowW, shadowH)
    .composite([{
      input: roundedSS,
      left: 15,
      top: 10,
    }])
    .png()
    .toBuffer();

  const gradientBg = createGradientSVG(w, h, ss.gradientTop, ss.gradientBottom);

  const textOverlay = createTextOverlaySVG(w, h, ss.heading, ss.heading2, ss.sub, textAreaH);

  const ssLeft = Math.round((w - shadowW) / 2);
  const ssTop = textAreaH + Math.round((ssAreaH - shadowH) / 2);

  const result = await sharp(gradientBg)
    .resize(w, h)
    .composite([
      { input: ssWithShadow, left: Math.max(0, ssLeft), top: Math.max(0, ssTop) },
      { input: await sharp(textOverlay).png().toBuffer(), left: 0, top: 0 },
    ])
    .png({ quality: 95 })
    .toBuffer();

  const outputDir = path.join(OUTPUT_DIR, sizeKey);
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, `${ss.id}.png`);
  await sharp(result).toFile(outputPath);
  return outputPath;
}

function createFeatureGradientSVG() {
  return Buffer.from(`<svg width="1024" height="500">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#87CEEB"/>
        <stop offset="50%" stop-color="#A8E6CF"/>
        <stop offset="100%" stop-color="#F5E6A3"/>
      </linearGradient>
    </defs>
    <rect width="1024" height="500" fill="url(#bg)"/>
    <!-- Grass area -->
    <ellipse cx="512" cy="560" rx="600" ry="200" fill="#7BC67B"/>
    <!-- Clouds -->
    <ellipse cx="150" cy="60" rx="80" ry="35" fill="rgba(255,255,255,0.5)"/>
    <ellipse cx="750" cy="40" rx="100" ry="40" fill="rgba(255,255,255,0.5)"/>
    <ellipse cx="500" cy="70" rx="60" ry="25" fill="rgba(255,255,255,0.4)"/>
    <!-- Paw prints -->
    <text x="350" y="430" font-size="30" opacity="0.15" transform="rotate(-10,350,430)">🐾</text>
    <text x="550" y="450" font-size="25" opacity="0.12" transform="rotate(15,550,450)">🐾</text>
    <text x="750" y="420" font-size="35" opacity="0.13" transform="rotate(-5,750,420)">🐾</text>
  </svg>`);
}

function createFeatureTextSVG() {
  return Buffer.from(`<svg width="1024" height="500">
    <defs>
      <filter id="textShadow">
        <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="white" flood-opacity="0.6"/>
      </filter>
    </defs>
    <text x="620" y="180" text-anchor="middle" font-family="'Hiragino Kaku Gothic ProN','Hiragino Sans','Yu Gothic','Meiryo',sans-serif" font-size="78" font-weight="900" fill="#5D4E37" filter="url(#textShadow)">ワン</text>
    <text x="650" y="290" text-anchor="middle" font-family="'Hiragino Kaku Gothic ProN','Hiragino Sans','Yu Gothic','Meiryo',sans-serif" font-size="78" font-weight="900" fill="#5D4E37" filter="url(#textShadow)">こねくと</text>
    <text x="640" y="345" text-anchor="middle" font-family="'Hiragino Kaku Gothic ProN','Hiragino Sans','Yu Gothic','Meiryo',sans-serif" font-size="26" font-weight="700" fill="#8B7355">つなげて遊ぼう！一筆書きパズル 🐾</text>
  </svg>`);
}

async function generateFeatureGraphic() {
  const w = 1024;
  const h = 500;
  const iconPath = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'playstore', 'ic_launcher-playstore.png');

  const bgSVG = createFeatureGradientSVG();

  const icon = await sharp(iconPath)
    .resize(200, 200)
    .png()
    .toBuffer();

  const iconMask = createRoundedMask(200, 200, 40);
  const roundedIcon = await sharp(icon)
    .composite([{
      input: await sharp(iconMask).png().toBuffer(),
      blend: 'dest-in',
    }])
    .png()
    .toBuffer();

  const iconShadowSVG = Buffer.from(`<svg width="220" height="220">
    <defs>
      <filter id="s"><feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#000" flood-opacity="0.2"/></filter>
    </defs>
    <rect x="10" y="6" width="200" height="200" rx="40" ry="40" fill="white" filter="url(#s)"/>
  </svg>`);

  const iconWithShadow = await sharp(iconShadowSVG)
    .resize(220, 220)
    .composite([{ input: roundedIcon, left: 10, top: 6 }])
    .png()
    .toBuffer();

  const textSVG = createFeatureTextSVG();

  const result = await sharp(bgSVG)
    .resize(w, h)
    .composite([
      { input: iconWithShadow, left: 80, top: Math.round((h - 220) / 2) },
      { input: await sharp(textSVG).png().toBuffer(), left: 0, top: 0 },
    ])
    .png({ quality: 95 })
    .toBuffer();

  const outputDir = path.join(OUTPUT_DIR, 'feature_graphic');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, 'feature_graphic_1024x500.png');
  await sharp(result).toFile(outputPath);
  return outputPath;
}

async function main() {
  console.log('🐕 ワンこねくと ストアアセット生成を開始...\n');

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  let total = 0;
  const sizeKeys = Object.keys(TARGET_SIZES);

  for (const sizeKey of sizeKeys) {
    const target = TARGET_SIZES[sizeKey];
    console.log(`📱 ${target.label} (${target.w}×${target.h}) を生成中...`);

    for (const ss of SCREENSHOTS) {
      try {
        const outputPath = await generateScreenshot(ss, sizeKey);
        console.log(`   ✓ ${ss.id}`);
        total++;
      } catch (e) {
        console.error(`   ✗ ${ss.id}: ${e.message}`);
      }
    }
    console.log('');
  }

  console.log('🎨 フィーチャーグラフィック (1024×500) を生成中...');
  try {
    const fgPath = await generateFeatureGraphic();
    console.log(`   ✓ feature_graphic_1024x500.png`);
    total++;
  } catch (e) {
    console.error(`   ✗ Feature Graphic: ${e.message}`);
  }

  console.log(`\n✅ 完了！合計 ${total} ファイルを生成しました`);
  console.log(`📁 出力先: ${OUTPUT_DIR}`);

  console.log('\n📋 生成されたフォルダ構成:');
  for (const sizeKey of sizeKeys) {
    const target = TARGET_SIZES[sizeKey];
    console.log(`  ${sizeKey}/ — ${target.label} (${target.w}×${target.h})`);
  }
  console.log('  feature_graphic/ — Google Play フィーチャーグラフィック (1024×500)');

  console.log('\n📝 ストア提出時の注意:');
  console.log('  Apple App Store:');
  console.log('    - apple_iphone67/ → iPhone 6.7インチ用（必須）');
  console.log('    - apple_iphone65/ → iPhone 6.5インチ用');
  console.log('    - apple_iphone55/ → iPhone 5.5インチ用');
  console.log('    - apple_ipad129/  → iPad Pro 12.9インチ用');
  console.log('  Google Play:');
  console.log('    - google_phone/        → スマートフォン用');
  console.log('    - feature_graphic/     → フィーチャーグラフィック（必須）');
}

main().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
