const fs = require('fs');

async function main() {
  const hubUrl = 'https://ekfnekrjpumjpetzgwzy.supabase.co/rest/v1/clients?id=eq.14fa9b24-8991-4150-a1fe-d60adbabd469&select=preferences';
  const hubKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrZm5la3JqcHVtanBldHpnd3p5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzgyNjAxNiwiZXhwIjoyMDk5NDAyMDE2fQ.Ne-jtSPB8NP-79_pV1KsGubYbCDtQVhQAXRtC-PzT-8';

  const res = await fetch(hubUrl, { headers: { apikey: hubKey, Authorization: 'Bearer ' + hubKey } });
  const data = await res.json();
  const prefs = data[0]?.preferences || {};
  const overrides = prefs.catalog_overrides || {};
  const prodOverrides = overrides.productOverrides || {};
  const variantStocks = overrides.variantStocks || {};

  const cat = JSON.parse(fs.readFileSync('data/catalog.json', 'utf8'));
  const catEanMap = new Map();
  cat.forEach(p => {
    (p.variants || []).forEach(v => {
      if (v.ean) catEanMap.set(v.ean.trim(), { prodId: p.id, variantId: v.id, price: v.price });
      if (v.sku) catEanMap.set(v.sku.trim(), { prodId: p.id, variantId: v.id, price: v.price });
    });
  });

  console.log(`Overrides prima della bonifica: ${Object.keys(prodOverrides).length}`);

  let cleaned = 0;
  for (const id of Object.keys(prodOverrides)) {
    if (id.startsWith('quick-')) {
      const qProd = prodOverrides[id];
      const ean = qProd.variants?.[0]?.ean || qProd.variants?.[0]?.sku;
      // If the product is now fully native in catalog.json, remove the temporary quick override
      if (ean && (catEanMap.has(ean) || catEanMap.has('0' + ean) || catEanMap.has('8' + ean))) {
        delete prodOverrides[id];
        cleaned++;
      }
    }
  }

  console.log(`Rimossi ${cleaned} record temporanei 'quick-...' ora nativi a catalogo!`);
  console.log(`Overrides rimanenti (personalizzazioni legittime): ${Object.keys(prodOverrides).length}`);

  overrides.productOverrides = prodOverrides;
  overrides.updatedAt = new Date().toISOString();
  prefs.catalog_overrides = overrides;

  const patchRes = await fetch('https://ekfnekrjpumjpetzgwzy.supabase.co/rest/v1/clients?id=eq.14fa9b24-8991-4150-a1fe-d60adbabd469', {
    method: 'PATCH',
    headers: {
      apikey: hubKey,
      Authorization: 'Bearer ' + hubKey,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ preferences: prefs })
  });

  if (patchRes.ok) {
    console.log('✅ Creativia Hub aggiornato con successo!');
  } else {
    console.error('❌ Errore aggiornamento Hub:', patchRes.status, await patchRes.text());
  }
}

main().catch(console.error);
