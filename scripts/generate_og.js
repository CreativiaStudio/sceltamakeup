const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function createOgImages() {
  const root = process.cwd();
  const logoPath = path.join(root, 'public/brand/logo-transparent.png');
  const outJpg1200 = path.join(root, 'public/brand/og-image.jpg');
  const outJpg800 = path.join(root, 'public/brand/og-square.jpg');

  const bgWidth = 1200;
  const bgHeight = 630;

  // Resize logo for 1200x630 banner
  const logoResized = await sharp(logoPath)
    .resize({ width: 720, height: 420, fit: 'inside' })
    .toBuffer();

  const logoMeta = await sharp(logoResized).metadata();

  const svgOverlay = Buffer.from(`
    <svg width="${bgWidth}" height="${bgHeight}" viewBox="0 0 ${bgWidth} ${bgHeight}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FAF7FB" />
          <stop offset="50%" stop-color="#F2E8F5" />
          <stop offset="100%" stop-color="#E8D8ED" />
        </linearGradient>
      </defs>
      <rect width="${bgWidth}" height="${bgHeight}" fill="url(#bg)" />
      <rect x="28" y="28" width="${bgWidth - 56}" height="${bgHeight - 56}" rx="20" fill="none" stroke="#5E1788" stroke-opacity="0.14" stroke-width="2" />
      <text x="600" y="525" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="700" fill="#5E1788" letter-spacing="4" text-anchor="middle">BOUTIQUE D'AUTORE &amp; ALTA COSMESI</text>
      <text x="600" y="560" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="500" fill="#7A3293" letter-spacing="2" text-anchor="middle">VIA DEI PELLEGRINI 28/29, NAPOLI • SPEDIZIONE RAPIDA 24/48H</text>
    </svg>
  `);

  const topPos = Math.round((bgHeight - logoMeta.height - 80) / 2);
  const leftPos = Math.round((bgWidth - logoMeta.width) / 2);

  await sharp(svgOverlay)
    .composite([
      {
        input: logoResized,
        top: topPos,
        left: leftPos
      }
    ])
    .jpeg({ quality: 92, mozjpeg: true })
    .toFile(outJpg1200);

  console.log('og-image.jpg created:', fs.statSync(outJpg1200).size, 'bytes');

  // Square 800x800 for WhatsApp compact card
  const sqSize = 800;
  const logoSq = await sharp(logoPath)
    .resize({ width: 600, height: 420, fit: 'inside' })
    .toBuffer();
  const metaSq = await sharp(logoSq).metadata();

  const svgSq = Buffer.from(`
    <svg width="${sqSize}" height="${sqSize}" viewBox="0 0 ${sqSize} ${sqSize}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgSq" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FAF7FB" />
          <stop offset="100%" stop-color="#EFE2F3" />
        </linearGradient>
      </defs>
      <rect width="${sqSize}" height="${sqSize}" fill="url(#bgSq)" />
      <rect x="24" y="24" width="${sqSize - 48}" height="${sqSize - 48}" rx="20" fill="none" stroke="#5E1788" stroke-opacity="0.14" stroke-width="2" />
      <text x="400" y="655" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="700" fill="#5E1788" letter-spacing="3" text-anchor="middle">BOUTIQUE &amp; ALTA COSMESI</text>
      <text x="400" y="690" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="500" fill="#7A3293" letter-spacing="2" text-anchor="middle">VIA DEI PELLEGRINI 28/29, NAPOLI</text>
    </svg>
  `);

  const topSqPos = Math.round((sqSize - metaSq.height - 100) / 2);
  const leftSqPos = Math.round((sqSize - metaSq.width) / 2);

  await sharp(svgSq)
    .composite([
      {
        input: logoSq,
        top: topSqPos,
        left: leftSqPos
      }
    ])
    .jpeg({ quality: 92, mozjpeg: true })
    .toFile(outJpg800);

  console.log('og-square.jpg created:', fs.statSync(outJpg800).size, 'bytes');
}

createOgImages().catch(console.error);
