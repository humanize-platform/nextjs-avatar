// scripts/generate-icons.js
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const inputPath = path.join(__dirname, '../public/icons/icon-512x512.png');
const outputDir = path.join(__dirname, '../public/icons');

async function generateIcons() {
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    for (const size of sizes) {
        const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);

        // Skip 512x512 as it already exists
        if (size === 512) {
            console.log(`Skipping ${size}x${size} (source file)`);
            continue;
        }

        try {
            await sharp(inputPath)
                .resize(size, size)
                .png()
                .toFile(outputPath);
            console.log(`Generated: icon-${size}x${size}.png`);
        } catch (error) {
            console.error(`Error generating ${size}x${size}:`, error.message);
        }
    }

    console.log('Icon generation complete!');
}

generateIcons();
