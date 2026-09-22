const fs = require('fs');

async function crawlCategory(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return [];
    const text = await res.text();
    const regex = /<img[^>]+src="([^"]+)"[^>]*alt="([^"]*)"/gi;
    let match;
    const items = [];
    while ((match = regex.exec(text)) !== null) {
      if (match[1].includes('/prodotti/') || match[1].includes('/products/') || match[1].includes('/skincare/')) {
        items.push({ src: match[1], title: match[2] });
      }
    }
    return items;
  } catch (e) {
    return [];
  }
}

async function main() {
  const catUrls = [
    'https://diegodallapalmapro.com/it/skin-care/3/pulizia/',
    'https://diegodallapalmapro.com/it/skin-care/4/icon-time/',
    'https://diegodallapalmapro.com/it/skin-care/7/purificante/',
    'https://diegodallapalmapro.com/it/skin-care/6/lenitivo/',
    'https://diegodallapalmapro.com/it/body-care/'
  ];

  for (const url of catUrls) {
    console.log('Fetching', url);
    const items = await crawlCategory(url);
    console.log(`Found ${items.length} product images in ${url}`);
    items.forEach(i => console.log('  -', i.title, i.src));
  }
}

main();
