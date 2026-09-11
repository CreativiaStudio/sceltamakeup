const fs = require('fs');

const SUPABASE_URL = 'https://zsycaulbamdxqhcukrvn.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzeWNhdWxiYW1keHFoY3VrcnZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODg1MTA4NSwiZXhwIjoyMTA0NDI3MDg1fQ.Czr2EkjwAA7m5J7LLrCq3caDMZSuMSUIbPYISe6X_o0';

const headers = {
  'apikey': SERVICE_KEY,
  'Authorization': 'Bearer ' + SERVICE_KEY,
  'Content-Type': 'application/json',
  'Prefer': 'resolution=merge-duplicates'
};

async function seed() {
  console.log('🚀 Avvio caricamento catalogo su Supabase...');
  const catalog = JSON.parse(fs.readFileSync('data/catalog.json', 'utf8'));
  console.log('Trovati', catalog.length, 'prodotti nel catalogo.');

  const productsPayload = [];
  const variantsPayload = [];
  const inventoryPayload = [];

  for (const p of catalog) {
    productsPayload.push({
      id: p.id,
      slug: p.slug,
      name: p.name,
      brand: p.brand,
      category: p.category,
      price: Number(p.price) || 0,
      original_price: p.originalPrice ? Number(p.originalPrice) : null,
      original_wholesale_price: Number(p.originalWholesalePrice) || 0,
      rating: 5.0,
      review_count: 0,
      badge: p.badge || null,
      badges: p.badges || [],
      description: p.description || '',
      short_description: p.shortDescription || '',
      formula_benefits: p.formulaBenefits || '',
      how_to_use: p.howToUse || '',
      inci: p.inci || '',
      features: p.features || [],
      images: p.images || [],
      is_featured: !!p.isFeatured,
      tags: p.tags || [],
      texture: p.texture || null,
      coverage: p.coverage || null,
      finish: p.finish || null
    });

    if (p.variants && Array.isArray(p.variants)) {
      for (const v of p.variants) {
        variantsPayload.push({
          id: v.id,
          product_id: p.id,
          name: v.name,
          sku: v.sku,
          ean: v.ean || '',
          color_hex: v.colorHex || null,
          image: v.image || (p.images && p.images[0]) || '',
          texture_image: v.textureImage || null,
          in_stock: v.inStock !== false,
          price: v.price ? Number(v.price) : Number(p.price),
          original_wholesale_price: v.originalWholesalePrice ? Number(v.originalWholesalePrice) : Number(p.originalWholesalePrice)
        });

        const stockQty = typeof v.stock === 'number' ? v.stock : (typeof p.stock === 'number' ? p.stock : 0);
        inventoryPayload.push({
          variant_id: v.id,
          product_id: p.id,
          quantity_on_hand: stockQty,
          safety_stock: 2,
          location: 'Boutique Napoli - Via dei Pellegrini 28/29'
        });
      }
    }
  }

  // 1. Carica Prodotti a blocchi di 50
  console.log('📦 Caricamento', productsPayload.length, 'prodotti in scelta_products...');
  for (let i = 0; i < productsPayload.length; i += 50) {
    const chunk = productsPayload.slice(i, i + 50);
    const res = await fetch(SUPABASE_URL + '/rest/v1/scelta_products', {
      method: 'POST',
      headers,
      body: JSON.stringify(chunk)
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error('Errore inserimento prodotti (blocco ' + i + '): ' + err);
    }
    process.stdout.write('.');
  }
  console.log('\n✅ 341 Prodotti caricati con successo!');

  // 2. Carica Varianti a blocchi di 50
  console.log('🎨 Caricamento', variantsPayload.length, 'varianti in scelta_variants...');
  for (let i = 0; i < variantsPayload.length; i += 50) {
    const chunk = variantsPayload.slice(i, i + 50);
    const res = await fetch(SUPABASE_URL + '/rest/v1/scelta_variants', {
      method: 'POST',
      headers,
      body: JSON.stringify(chunk)
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error('Errore inserimento varianti (blocco ' + i + '): ' + err);
    }
    process.stdout.write('.');
  }
  console.log('\n✅ 659 Varianti caricate con successo!');

  // 3. Carica Inventario a blocchi di 50
  console.log('📊 Caricamento giacenze reali in scelta_inventory...');
  for (let i = 0; i < inventoryPayload.length; i += 50) {
    const chunk = inventoryPayload.slice(i, i + 50);
    const res = await fetch(SUPABASE_URL + '/rest/v1/scelta_inventory', {
      method: 'POST',
      headers,
      body: JSON.stringify(chunk)
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error('Errore inserimento inventario (blocco ' + i + '): ' + err);
    }
    process.stdout.write('.');
  }
  console.log('\n✅ Giacenze inventario caricate con successo!');
  console.log('🎉 POPOLAMENTO SUPABASE COMPLETATO CON SUCCESSO AL 100%!');
}

seed().catch(e => {
  console.error('❌ ERRORE SEED:', e);
  process.exit(1);
});
