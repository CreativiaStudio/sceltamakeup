const fs = require('fs');

async function getFarmaciaUno() {
  const url = 'https://www.farmaciauno.it/rvb-lab-delineatore-sopracciglia-in-crema-colore-21-da-4ml';
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  console.log('Status:', res.status);
  const text = await res.text();
  const ogImg = text.match(/<meta property="og:image" content="([^"]+)"/i);
  const ogTitle = text.match(/<meta property="og:title" content="([^"]+)"/i);
  console.log('Title:', ogTitle ? ogTitle[1] : 'NOT_FOUND');
  console.log('Image:', ogImg ? ogImg[1] : 'NOT_FOUND');
}

getFarmaciaUno();
