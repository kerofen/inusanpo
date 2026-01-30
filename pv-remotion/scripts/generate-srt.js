/**
 * SRT Subtitle Generator for WanConnect PV
 * Generates YouTube-compatible SRT file
 */

const fs = require('fs');
const path = require('path');

// Subtitle data matching the video scenes
const subtitles = [
  {
    id: 1,
    start: '00:00:00,000',
    end: '00:00:05,000',
    text: 'つなげる。うめる。かわいい！'
  },
  {
    id: 2,
    start: '00:00:05,000',
    end: '00:00:10,000',
    text: '同じワンコをつなげよう！'
  },
  {
    id: 3,
    start: '00:00:10,000',
    end: '00:00:15,000',
    text: 'つながった！'
  },
  {
    id: 4,
    start: '00:00:15,000',
    end: '00:00:22,000',
    text: '32種類のワンコを集めよう！'
  },
  {
    id: 5,
    start: '00:00:22,000',
    end: '00:00:27,000',
    text: 'ストーリーモード100ステージ & チャレンジモード'
  },
  {
    id: 6,
    start: '00:00:27,000',
    end: '00:00:30,000',
    text: 'Coming Soon'
  }
];

// Generate SRT format
function generateSRT(subtitles) {
  return subtitles.map(sub => {
    return `${sub.id}\n${sub.start} --> ${sub.end}\n${sub.text}\n`;
  }).join('\n');
}

// Main execution
const srtContent = generateSRT(subtitles);
const outputPath = path.join(__dirname, '..', 'out', 'wanconnect-pv.srt');

// Ensure output directory exists
const outDir = path.dirname(outputPath);
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Write SRT file
fs.writeFileSync(outputPath, srtContent, 'utf8');
console.log(`SRT file generated: ${outputPath}`);
console.log('\nContent:');
console.log(srtContent);
