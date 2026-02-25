const sharp = require('sharp');
const path = require('path');

async function generateFeatureGraphic() {
    const WIDTH = 1024;
    const HEIGHT = 500;
    const OUTPUT = path.join(__dirname, '..', 'screenshots', 'feature-graphic.png');
    const ICON = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'playstore', 'ic_launcher-playstore.png');

    const iconSize = 320;
    const iconResized = await sharp(ICON)
        .resize(iconSize, iconSize)
        .toBuffer();

    const iconX = 60;
    const iconY = Math.round((HEIGHT - iconSize) / 2);

    const titleSvg = `
    <svg width="${WIDTH}" height="${HEIGHT}">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#87CEEB"/>
          <stop offset="60%" stop-color="#B0E0F0"/>
          <stop offset="100%" stop-color="#90D490"/>
        </linearGradient>
      </defs>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#sky)"/>

      <!-- Title text -->
      <text x="580" y="190" font-family="Arial, sans-serif" font-size="72" font-weight="bold"
            fill="#FFFFFF" stroke="#D4882C" stroke-width="4" text-anchor="middle">ワン</text>
      <text x="580" y="290" font-family="Arial, sans-serif" font-size="80" font-weight="bold"
            fill="#FFFFFF" stroke="#D4882C" stroke-width="4" text-anchor="middle">こねくと</text>

      <!-- Subtitle -->
      <text x="580" y="370" font-family="Arial, sans-serif" font-size="28" font-weight="bold"
            fill="#FFFFFF" stroke="#7A5A30" stroke-width="1.5" text-anchor="middle">つなげて遊ぼう！一筆書きパズル</text>

      <!-- Paw prints decoration -->
      <text x="430" y="440" font-size="36" fill="rgba(255,255,255,0.5)">🐾</text>
      <text x="530" y="460" font-size="28" fill="rgba(255,255,255,0.4)">🐾</text>
      <text x="650" y="445" font-size="32" fill="rgba(255,255,255,0.45)">🐾</text>
      <text x="750" y="460" font-size="26" fill="rgba(255,255,255,0.35)">🐾</text>

      <!-- Cloud shapes -->
      <ellipse cx="150" cy="60" rx="80" ry="35" fill="rgba(255,255,255,0.3)"/>
      <ellipse cx="900" cy="80" rx="90" ry="40" fill="rgba(255,255,255,0.25)"/>
      <ellipse cx="700" cy="50" rx="60" ry="25" fill="rgba(255,255,255,0.2)"/>
    </svg>`;

    await sharp(Buffer.from(titleSvg))
        .composite([
            {
                input: iconResized,
                left: iconX,
                top: iconY,
            }
        ])
        .png()
        .toFile(OUTPUT);

    console.log(`Feature graphic generated: ${OUTPUT}`);
}

generateFeatureGraphic().catch(console.error);
