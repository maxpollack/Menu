const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Icon sizes needed for iOS and PWA
const sizes = [
  { size: 16, name: 'icon-16.png' },
  { size: 32, name: 'icon-32.png' },
  { size: 152, name: 'icon-152.png' },
  { size: 167, name: 'icon-167.png' },
  { size: 180, name: 'icon-180.png' },
  { size: 192, name: 'icon-192.png' },
  { size: 512, name: 'icon-512.png' }
];

// Create SVG for the icon with gradient background and fork/knife symbol
function createSVG(size) {
  return `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
        </linearGradient>
      </defs>

      <!-- Background with rounded corners -->
      <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#grad)"/>

      <!-- Fork and Knife Symbol -->
      <g transform="translate(${size/2}, ${size/2})">
        <!-- Fork (left) -->
        <g transform="translate(${-size * 0.12}, 0)">
          <!-- Handle -->
          <rect x="${-size * 0.015}" y="${-size * 0.2}" width="${size * 0.03}" height="${size * 0.45}" rx="${size * 0.015}" fill="white"/>

          <!-- Left tine -->
          <rect x="${-size * 0.06}" y="${-size * 0.2}" width="${size * 0.025}" height="${size * 0.15}" rx="${size * 0.0125}" fill="white"/>

          <!-- Middle tine -->
          <rect x="${-size * 0.0125}" y="${-size * 0.2}" width="${size * 0.025}" height="${size * 0.15}" rx="${size * 0.0125}" fill="white"/>

          <!-- Right tine -->
          <rect x="${size * 0.035}" y="${-size * 0.2}" width="${size * 0.025}" height="${size * 0.15}" rx="${size * 0.0125}" fill="white"/>
        </g>

        <!-- Knife (right) -->
        <g transform="translate(${size * 0.12}, 0)">
          <!-- Handle -->
          <rect x="${-size * 0.015}" y="${-size * 0.2}" width="${size * 0.03}" height="${size * 0.45}" rx="${size * 0.015}" fill="white"/>

          <!-- Blade -->
          <path d="M ${-size * 0.025} ${-size * 0.2} L ${size * 0.025} ${-size * 0.2} L ${size * 0.015} ${-size * 0.05} L ${-size * 0.015} ${-size * 0.05} Z" fill="white"/>
        </g>
      </g>
    </svg>
  `;
}

// Generate icons
async function generateIcons() {
  const outputDir = path.join(__dirname, 'client', 'public');

  // Make sure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('Generating PWA icons...\n');

  for (const { size, name } of sizes) {
    try {
      const svg = createSVG(size);
      const outputPath = path.join(outputDir, name);

      await sharp(Buffer.from(svg))
        .resize(size, size)
        .png()
        .toFile(outputPath);

      console.log(`✓ Generated ${name} (${size}x${size})`);
    } catch (error) {
      console.error(`✗ Failed to generate ${name}:`, error.message);
    }
  }

  console.log('\n✓ All icons generated successfully!');
  console.log(`\nIcons saved to: ${outputDir}`);
}

// Run the generator
generateIcons().catch(console.error);
