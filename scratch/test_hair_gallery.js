const fs = require('fs');

async function test() {
  const url = 'https://hair-gallery.it/diego-dalla-palma-professional-cell-detoxium-latte-detergente-250ml.html';
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  console.log('Status:', res.status);
  const text = await res.text();
  
  const jsonLdRegex = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = jsonLdRegex.exec(text)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      if (data['@type'] === 'Product' || data.offers) {
        console.log('Product JSON-LD:', JSON.stringify(data, null, 2));
      }
    } catch (e) {}
  }

  const ogImg = text.match(/<meta property="og:image" content="([^"]+)"/i);
  const ogTitle = text.match(/<meta property="og:title" content="([^"]+)"/i);
  console.log('OG Title:', ogTitle ? ogTitle[1] : null);
  console.log('OG Image:', ogImg ? ogImg[1] : null);
}

test();
