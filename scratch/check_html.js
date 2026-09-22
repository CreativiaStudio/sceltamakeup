const fs = require('fs');

async function test() {
  const res = await fetch('https://diegodallapalmapro.com/it/skin-care/3/pulizia/');
  const text = await res.text();
  const re = /<img[^>]+src="([^"]+)"/gi;
  let m;
  const imgs = [];
  while ((m = re.exec(text)) !== null) {
    imgs.push(m[1]);
  }
  console.log('Total img tags:', imgs.length);
  console.log(imgs.slice(0, 20));

  // Also check product links
  const linkRe = /href="([^"]*product[^"]*)"|href="([^"]*prodotto[^"]*)"/gi;
  let lm;
  const links = [];
  while ((lm = linkRe.exec(text)) !== null) {
    links.push(lm[1] || lm[2]);
  }
  console.log('Product links:', links);
}

test();
