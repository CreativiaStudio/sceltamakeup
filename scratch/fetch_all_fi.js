const fs = require('fs');

async function fetchAllFi() {
  let page = 1;
  let all = [];
  console.log('Fetching all products from diegodallapalma.fi...');

  while (true) {
    try {
      const url = `https://diegodallapalma.fi/wp-json/wc/store/v1/products?per_page=100&page=${page}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      if (!res.ok) {
        console.log(`Page ${page} returned status ${res.status}`);
        break;
      }
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        console.log(`Page ${page} empty. Done.`);
        break;
      }
      all.push(...data);
      console.log(`Fetched page ${page}: ${data.length} products (Total so far: ${all.length})`);
      page++;
      await new Promise(r => setTimeout(r, 200));
    } catch (e) {
      console.error(`Error fetching page ${page}:`, e.message);
      break;
    }
  }

  console.log(`Finished! Total products fetched: ${all.length}`);
  fs.writeFileSync('scratch/ddp_fi_all_products.json', JSON.stringify(all, null, 2));
}

fetchAllFi();
