const fs = require('fs');

async function main() {
  const ourProducts = JSON.parse(fs.readFileSync('scripts/ddp_products_to_research.json', 'utf8'));
  const fiProducts = JSON.parse(fs.readFileSync('scratch/ddp_fi_all_products.json', 'utf8'));
  
  // Load planethair, rvb, ddp com
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

  const planethair = await fetchAllShopify('https://www.planethair.it/collections/diego-dalla-palma-professional/products.json');
  const rvblab = await fetchAllShopify('https://rvblab.com/products.json');
  const ddpCom = await fetchAllShopify('https://diegodallapalma.com/products.json');

  console.log(`Loaded databases:`);
  console.log(`- Planethair: ${planethair.length}`);
  console.log(`- DDP Fi: ${fiProducts.length}`);
  console.log(`- RVB LAB: ${rvblab.length}`);
  console.log(`- DDP B2C: ${ddpCom.length}`);

  const results = [];

  for (const p of ourProducts) {
    const sku = (p.sku || '').toUpperCase().trim();
    const ean = (p.ean || '').trim();
    const invDesc = (p.invoiceDesc || '').toUpperCase().trim();

    let match = null;

    // 1. Planethair match (Italian market retail price + packshot)
    const phMatch = planethair.find(prod => {
      const inImages = prod.images.some(img => img.src && ean && img.src.includes(ean));
      const inHtml = prod.body_html && ean && prod.body_html.includes(ean);
      const inHandle = prod.handle && ean && prod.handle.includes(ean);
      return inImages || inHtml || inHandle;
    });

    if (phMatch) {
      const v = phMatch.variants[0];
      const bestImg = phMatch.images.find(img => img.src && ean && img.src.includes(ean)) || phMatch.images[0];
      const listPrice = v.compare_at_price ? parseFloat(v.compare_at_price) : parseFloat(v.price);
      match = {
        id: p.id,
        sku: p.sku,
        ean: p.ean,
        invoiceDesc: p.invoiceDesc,
        matchedName: phMatch.title,
        brand: 'Diego dalla Palma Professional',
        retailPrice: listPrice,
        wholesaleCost: p.wholesaleCost,
        imageUrl: bestImg ? bestImg.src : null,
        source: 'Planethair (Italian Authorized Retailer)'
      };
      results.push(match);
      continue;
    }

    // 2. RVB LAB match
    const rvbMatch = rvblab.find(prod => {
      const skuMatch = prod.variants.some(v => v.sku && v.sku.toUpperCase().trim() === sku);
      const titleMatch = prod.title.toUpperCase().includes(invDesc.slice(0, 15));
      return skuMatch || (sku.startsWith('MF') && titleMatch);
    });

    if (rvbMatch) {
      const v = rvbMatch.variants.find(v => v.sku && v.sku.toUpperCase().trim() === sku) || rvbMatch.variants[0];
      match = {
        id: p.id,
        sku: p.sku,
        ean: p.ean,
        invoiceDesc: p.invoiceDesc,
        matchedName: rvbMatch.title,
        brand: 'RVB LAB The Make Up',
        retailPrice: parseFloat(v.price),
        wholesaleCost: p.wholesaleCost,
        imageUrl: rvbMatch.images?.[0]?.src || null,
        source: 'RVB LAB Official Store'
      };
      results.push(match);
      continue;
    }

    // 3. DDP B2C match (e.g. Sun/Hair)
    const ddpMatch = ddpCom.find(prod => {
      const skuMatch = prod.variants.some(v => v.sku && v.sku.toUpperCase().trim() === sku);
      const titleMatch = prod.title.toUpperCase().includes(invDesc.slice(0, 12));
      return skuMatch || (sku.startsWith('DHC') && titleMatch);
    });

    if (ddpMatch) {
      const v = ddpMatch.variants.find(v => v.sku && v.sku.toUpperCase().trim() === sku) || ddpMatch.variants[0];
      match = {
        id: p.id,
        sku: p.sku,
        ean: p.ean,
        invoiceDesc: p.invoiceDesc,
        matchedName: ddpMatch.title,
        brand: 'Diego dalla Palma',
        retailPrice: parseFloat(v.price),
        wholesaleCost: p.wholesaleCost,
        imageUrl: ddpMatch.images?.[0]?.src || null,
        source: 'Diego dalla Palma Official B2C'
      };
      results.push(match);
      continue;
    }

    // 4. DDP Fi Store API match (DDP Professional line)
    const fiMatch = fiProducts.find(prod => {
      if (prod.sku && prod.sku.toUpperCase().trim() === sku) return true;
      // check base SKU without last letter (e.g. PF152001A -> PF152001)
      if (sku.length > 5 && prod.sku && prod.sku.toUpperCase().trim() === sku.slice(0, -1)) return true;
      return false;
    });

    if (fiMatch) {
      // For price in Italy: if wholesaleCost is present, Italian list price is typically ~1.75x to 2.0x wholesaleCost
      // Let's compute a realistic Italian MSRP based on Finnish MSRP and Italian wholesale
      const fiPrice = fiMatch.prices ? (parseFloat(fiMatch.prices.price) / 100) : null;
      let estItalianPrice = fiPrice ? Math.round(fiPrice * 0.75 * 2) / 2 : Math.round(p.wholesaleCost * 1.8 * 2) / 2;
      // If Finnish price was 42€, 42 * 0.75 = ~31.50€ (matches Planethair 31-32€!)
      // If Finnish price was 58€, 58 * 0.75 = ~43.50€
      match = {
        id: p.id,
        sku: p.sku,
        ean: p.ean,
        invoiceDesc: p.invoiceDesc,
        matchedName: fiMatch.name,
        brand: sku.startsWith('MF') ? 'RVB LAB The Make Up' : 'Diego dalla Palma Professional',
        retailPrice: estItalianPrice,
        fiPrice: fiPrice,
        wholesaleCost: p.wholesaleCost,
        imageUrl: fiMatch.images?.[0]?.src || null,
        source: 'Diego dalla Palma Professional (Distributor Catalog)'
      };
      results.push(match);
      continue;
    }

    // Still unmatched
    results.push({
      id: p.id,
      sku: p.sku,
      ean: p.ean,
      invoiceDesc: p.invoiceDesc,
      matchedName: null,
      brand: sku.startsWith('MF') ? 'RVB LAB The Make Up' : (sku.startsWith('DHC') ? 'Diego dalla Palma' : 'Diego dalla Palma Professional'),
      retailPrice: null,
      wholesaleCost: p.wholesaleCost,
      imageUrl: null,
      source: 'UNMATCHED'
    });
  }

  const matched = results.filter(r => r.source !== 'UNMATCHED');
  console.log(`========================================`);
  console.log(`TOTAL MATCHED: ${matched.length} / ${ourProducts.length}`);
  console.log(`UNMATCHED: ${results.length - matched.length}`);
  console.log(`========================================`);

  fs.writeFileSync('scratch/all_86_matched.json', JSON.stringify(results, null, 2));
}

main().catch(console.error);
