const fs = require('fs');

async function fetchAllShopify(url) {
  let page = 1;
  let all = [];
  while (true) {
    const separator = url.includes('?') ? '&' : '?';
    const target = `${url}${separator}page=${page}&limit=250`;
    try {
      const res = await fetch(target, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!res.ok) break;
      const data = await res.json();
      if (!data.products || data.products.length === 0) break;
      all.push(...data.products);
      if (data.products.length < 250) break;
      page++;
    } catch (e) {
      break;
    }
  }
  return all;
}

async function fetchPlanethair() {
  console.log('Fetching Planethair DDP collection...');
  return await fetchAllShopify('https://www.planethair.it/collections/diego-dalla-palma-professional/products.json');
}

async function fetchRvbLab() {
  console.log('Fetching RVB LAB...');
  return await fetchAllShopify('https://rvblab.com/products.json');
}

async function fetchDdpCom() {
  console.log('Fetching Diego dalla Palma B2C...');
  return await fetchAllShopify('https://diegodallapalma.com/products.json');
}

async function main() {
  const ourProducts = JSON.parse(fs.readFileSync('scripts/ddp_products_to_research.json', 'utf8'));
  console.log(`Analyzing ${ourProducts.length} products...`);

  const planethair = await fetchPlanethair();
  const rvblab = await fetchRvbLab();
  const ddpCom = await fetchDdpCom();

  console.log(`Loaded Planethair: ${planethair.length}`);
  console.log(`Loaded RVB LAB: ${rvblab.length}`);
  console.log(`Loaded DDP Com: ${ddpCom.length}`);

  let matchResults = [];

  for (const p of ourProducts) {
    const sku = (p.sku || '').toUpperCase().trim();
    const ean = (p.ean || '').trim();
    let matched = null;

    // 1. Check RVB LAB by SKU or title
    const rvbMatch = rvblab.find(prod => {
      const hasSku = prod.variants.some(v => v.sku && v.sku.toUpperCase().trim() === sku);
      const titleMatch = prod.title.toLowerCase().includes(p.invoiceDesc.toLowerCase().slice(0, 15));
      return hasSku || (p.sku.startsWith('MF') && titleMatch);
    });

    if (rvbMatch) {
      const v = rvbMatch.variants.find(v => v.sku && v.sku.toUpperCase().trim() === sku) || rvbMatch.variants[0];
      matched = {
        id: p.id,
        sku: p.sku,
        ean: p.ean,
        source: 'RVB LAB Official',
        brand: 'RVB LAB The Make Up',
        title: rvbMatch.title,
        price: parseFloat(v.price),
        image: rvbMatch.images?.[0]?.src || null,
        wholesaleCost: p.wholesaleCost,
        currentPrice: p.currentPrice
      };
      matchResults.push(matched);
      continue;
    }

    // 2. Check DDP B2C by SKU
    const ddpMatch = ddpCom.find(prod => {
      return prod.variants.some(v => v.sku && v.sku.toUpperCase().trim() === sku);
    });

    if (ddpMatch) {
      const v = ddpMatch.variants.find(v => v.sku && v.sku.toUpperCase().trim() === sku) || ddpMatch.variants[0];
      matched = {
        id: p.id,
        sku: p.sku,
        ean: p.ean,
        source: 'Diego dalla Palma B2C',
        brand: 'Diego dalla Palma',
        title: ddpMatch.title,
        price: parseFloat(v.price),
        image: ddpMatch.images?.[0]?.src || null,
        wholesaleCost: p.wholesaleCost,
        currentPrice: p.currentPrice
      };
      matchResults.push(matched);
      continue;
    }

    // 3. Check Planethair by EAN in image filename or body_html or title
    const phMatch = planethair.find(prod => {
      const inImages = prod.images.some(img => img.src && ean && img.src.includes(ean));
      const inHtml = prod.body_html && ean && prod.body_html.includes(ean);
      const inHandle = prod.handle && ean && prod.handle.includes(ean);
      return inImages || inHtml || inHandle;
    });

    if (phMatch) {
      const v = phMatch.variants[0];
      const listPrice = v.compare_at_price ? parseFloat(v.compare_at_price) : parseFloat(v.price);
      // Clean packshot: find the image with the ean or first image
      const bestImg = phMatch.images.find(img => img.src && ean && img.src.includes(ean)) || phMatch.images[0];
      matched = {
        id: p.id,
        sku: p.sku,
        ean: p.ean,
        source: 'Planethair (DDP Pro Official Retailer)',
        brand: 'Diego dalla Palma Professional',
        title: phMatch.title,
        price: listPrice,
        image: bestImg?.src || null,
        wholesaleCost: p.wholesaleCost,
        currentPrice: p.currentPrice
      };
      matchResults.push(matched);
      continue;
    }

    // Unmatched
    matchResults.push({
      id: p.id,
      sku: p.sku,
      ean: p.ean,
      source: 'UNMATCHED_YET',
      brand: p.sku.startsWith('MF') ? 'RVB LAB The Make Up' : (p.sku.startsWith('DHC') ? 'Diego dalla Palma' : 'Diego dalla Palma Professional'),
      title: p.invoiceDesc,
      price: null,
      image: null,
      wholesaleCost: p.wholesaleCost,
      currentPrice: p.currentPrice
    });
  }

  const matchedCount = matchResults.filter(m => m.source !== 'UNMATCHED_YET').length;
  console.log(`Matched ${matchedCount} / ${ourProducts.length} products`);

  fs.writeFileSync('scratch/cross_match_round1.json', JSON.stringify(matchResults, null, 2));
}

main().catch(console.error);
