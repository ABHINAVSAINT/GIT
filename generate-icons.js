const sharp = require('sharp');
const path = require('path');

const SIZE = 1024;
const BG_COLOR = '#10B981'; // Emerald green background
const ACCENT_COLOR = '#FFFFFF'; // White elements
const ACCENT2_COLOR = '#059669'; // Darker green for depth
const WHITE = '#FFFFFF';

// Create SVG for the icon
function createIconSVG() {
  return `
    <svg width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg">
      <!-- Background -->
      <rect width="${SIZE}" height="${SIZE}" rx="200" fill="${BG_COLOR}"/>
      
      <!-- Chart bars (white on green) -->
      <rect x="180" y="520" width="120" height="260" rx="20" fill="${WHITE}" opacity="0.25"/>
      <rect x="340" y="400" width="120" height="380" rx="20" fill="${WHITE}" opacity="0.35"/>
      <rect x="500" y="280" width="120" height="500" rx="20" fill="${WHITE}" opacity="0.5"/>
      <rect x="660" y="160" width="120" height="620" rx="20" fill="${WHITE}" opacity="0.7"/>
      
      <!-- Main chart line -->
      <polyline 
        points="180,560 340,440 500,320 660,200 820,120" 
        fill="none" 
        stroke="${WHITE}" 
        stroke-width="32" 
        stroke-linecap="round" 
        stroke-linejoin="round"
      />
      
      <!-- Trend arrow -->
      <g transform="translate(800, 100)">
        <circle cx="0" cy="0" r="65" fill="${WHITE}"/>
        <path d="M-22,11 L0,-17 L22,11 M0,-17 L0,28" 
              stroke="${BG_COLOR}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      </g>
    </svg>
  `;
}

// Create adaptive icon foreground
function createAdaptiveForeground() {
  return `
    <svg width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg">
      <!-- Chart bars (white on transparent - bg comes from XML) -->
      <rect x="180" y="520" width="120" height="260" rx="20" fill="${WHITE}" opacity="0.35"/>
      <rect x="340" y="400" width="120" height="380" rx="20" fill="${WHITE}" opacity="0.5"/>
      <rect x="500" y="280" width="120" height="500" rx="20" fill="${WHITE}" opacity="0.65"/>
      <rect x="660" y="160" width="120" height="620" rx="20" fill="${WHITE}"/>
      
      <!-- Main chart line -->
      <polyline 
        points="180,560 340,440 500,320 660,200 820,120" 
        fill="none" 
        stroke="${WHITE}" 
        stroke-width="36" 
        stroke-linecap="round" 
        stroke-linejoin="round"
      />
      
      <!-- Trend arrow -->
      <g transform="translate(800, 100)">
        <circle cx="0" cy="0" r="70" fill="${WHITE}"/>
        <path d="M-24,12 L0,-18 L24,12 M0,-18 L0,30" 
              stroke="${BG_COLOR}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      </g>
    </svg>
  `;
}

// Create splash screen
function createSplashSVG() {
  const splashW = 1284;
  const splashH = 2778;
  return `
    <svg width="${splashW}" height="${splashH}" viewBox="0 0 ${splashW} ${splashH}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${splashW}" height="${splashH}" fill="${BG_COLOR}"/>
      
      <!-- Logo -->
      <g transform="translate(${splashW/2 - 150}, ${splashH/2 - 250})">
        <circle cx="150" cy="150" r="140" fill="${WHITE}" opacity="0.15"/>
        <polyline 
          points="50,180 110,130 170,80 230,40 290,10" 
          fill="none" 
          stroke="${WHITE}" 
          stroke-width="16" 
          stroke-linecap="round" 
          stroke-linejoin="round"
        />
        <g transform="translate(265, 0)">
          <circle cx="0" cy="0" r="35" fill="${WHITE}"/>
          <path d="M-12,6 L0,-8 L12,6 M0,-8 L0,14" 
                stroke="${BG_COLOR}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        </g>
      </g>
      
      <!-- App name -->
      <text x="${splashW/2}" y="${splashH/2 + 80}" font-family="Arial, Helvetica, sans-serif" font-size="72" font-weight="bold" 
            fill="${WHITE}" text-anchor="middle">FinTrack</text>
      
      <!-- Tagline -->
      <text x="${splashW/2}" y="${splashH/2 + 140}" font-family="Arial, Helvetica, sans-serif" font-size="32" 
            fill="${WHITE}" opacity="0.7" text-anchor="middle">Smart Finance Tracking</text>
    </svg>
  `;
}

async function generateIcons() {
  const assetsDir = path.join(__dirname, 'apps/mobile/assets');
  const resDir = path.join(__dirname, 'apps/mobile/android/app/src/main/res');
  
  // Generate main icon
  const iconSvg = createIconSVG();
  await sharp(Buffer.from(iconSvg)).png().toFile(path.join(assetsDir, 'icon.png'));
  console.log('✓ Generated icon.png');
  
  // Generate adaptive icon foreground
  const foregroundSvg = createAdaptiveForeground();
  await sharp(Buffer.from(foregroundSvg)).png().toFile(path.join(assetsDir, 'adaptive-icon.png'));
  console.log('✓ Generated adaptive-icon.png');
  
  // Generate splash screen
  const splashSvg = createSplashSVG();
  await sharp(Buffer.from(splashSvg)).resize(1284, 2778).png().toFile(path.join(assetsDir, 'splash.png'));
  console.log('✓ Generated splash.png');
  
  // Generate favicon
  await sharp(Buffer.from(iconSvg)).resize(48, 48).png().toFile(path.join(assetsDir, 'favicon.png'));
  console.log('✓ Generated favicon.png');
  
  // Generate Android mipmap icons
  const androidSizes = {
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192,
  };
  
  for (const [folder, size] of Object.entries(androidSizes)) {
    const dir = path.join(resDir, folder);
    await sharp(Buffer.from(iconSvg)).resize(size, size).png().toFile(path.join(dir, 'ic_launcher.png'));
    await sharp(Buffer.from(iconSvg)).resize(size, size).png().toFile(path.join(dir, 'ic_launcher_round.png'));
    console.log(`✓ Generated ${folder} icons (${size}x${size})`);
  }
  
  // Generate adaptive icon PNG for anydpi-v26
  const anydpiDir = path.join(resDir, 'mipmap-anydpi-v26');
  await sharp(Buffer.from(foregroundSvg)).resize(432, 432).png().toFile(path.join(anydpiDir, 'ic_launcher_foreground.png'));
  console.log('✓ Generated adaptive foreground for Android');
  
  console.log('\nAll icons generated successfully!');
}

generateIcons().catch(console.error);
