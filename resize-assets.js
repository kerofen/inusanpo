const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const assetsDir = './assets';
const targetSize = 128;

const imagesToResize = [
    'shiba_idle.png',
    'shiba_walk.png',
    'shiba_happy.png',
    'snack_meat.png',
    'snack_taiyaki.png',
    'snack_bone.png',
    'snack_dango.png',
    'paw_print.png',
    'particle_sparkle.png',
    'particle_heart.png',
    'particle_star.png',
    'ui_button.png'
];

async function resizeImages() {
    for (const imageName of imagesToResize) {
        const inputPath = path.join(assetsDir, imageName);
        const outputPath = inputPath; // overwrite
        const tempPath = inputPath + '.tmp';

        if (fs.existsSync(inputPath)) {
            try {
                await sharp(inputPath)
                    .resize(targetSize, targetSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
                    .toFile(tempPath);

                fs.unlinkSync(inputPath);
                fs.renameSync(tempPath, inputPath);
                console.log(`Resized: ${imageName}`);
            } catch (err) {
                console.error(`Error resizing ${imageName}:`, err.message);
            }
        } else {
            console.log(`Not found: ${imageName}`);
        }
    }
    console.log('Done!');
}

resizeImages();
