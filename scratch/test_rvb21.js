const fs = require('fs');

async function test() {
  const urls = [
    'https://virtualpharma.it/products/rvb-lab-delineatore-sopracciglia-in-crema-21',
    'https://www.lovethehair.it/it/rvb-lab-delineatore-sopracciglia-in-crema-col-21-4ml.html',
    'https://xfarma.it/prodotto/rvb-lab-delineatore-sopracciglia-in-crema-21/'
  ];
  for (const u of urls) {
    try {
      const res = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      console.log(u, '=>', res.status);
      if (res.ok) {
        const text = await res.text();
        const ogImg = text.match(/<meta property="og:image" content="([^"]+)"/i);
        const ogPrice = text.match(/product:price:amount" content="([^"]+)"/i);
        console.log('  Image:', ogImg ? ogImg[1] : null);
        console.log('  Price:', ogPrice ? ogPrice[1] : null);
      }
    } catch(e) {
      console.log(u, 'error:', e.message);
    }
  }
}

test();
