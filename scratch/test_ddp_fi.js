const fs = require('fs');

async function checkDdpFi() {
  const round1 = JSON.parse(fs.readFileSync('scratch/cross_match_round1.json', 'utf8'));
  const unmatched = round1.filter(p => p.source === 'UNMATCHED_YET');
  console.log(`Checking ${unmatched.length} unmatched products on diegodallapalma.fi Store API...`);

  let foundCount = 0;
  for (const p of unmatched) {
    const sku = p.sku.trim();
    try {
      const res = await fetch(`https://diegodallapalma.fi/wp-json/wc/store/v1/products?search=${encodeURIComponent(sku)}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      if (res.ok) {
        const data = await res.json();
        const exact = data.find(item => item.sku && item.sku.toUpperCase().trim() === sku.toUpperCase());
        if (exact) {
          foundCount++;
          console.log(`✅ Found SKU ${sku}: ${exact.name} | Price: ${exact.prices.price / 100}€ | Img: ${exact.images?.[0]?.src}`);
          p.source = 'diegodallapalma.fi (Official Distributor)';
          p.brand = 'Diego dalla Palma Professional';
          p.title = exact.name;
          p.price = exact.prices.price / 100;
          p.image = exact.images?.[0]?.src || null;
        } else if (data.length > 0) {
          console.log(`⚠️ Search ${sku} matched ${data.length} items, but no exact SKU match (first: ${data[0].sku} - ${data[0].name})`);
        }
      }
    } catch (e) {
      console.error(`Error checking ${sku}:`, e.message);
    }
    // Small delay to be polite to server
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`Found on diegodallapalma.fi: ${foundCount}`);
  fs.writeFileSync('scratch/cross_match_round2.json', JSON.stringify(round1, null, 2));
}

checkDdpFi().catch(console.error);
