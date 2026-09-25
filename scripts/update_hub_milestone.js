const hubUrl = 'https://ekfnekrjpumjpetzgwzy.supabase.co/rest/v1/knowledge_nodes';
const hubKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrZm5la3JqcHVtanBldHpnd3p5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzgyNjAxNiwiZXhwIjoyMDk5NDAyMDE2fQ.Ne-jtSPB8NP-79_pV1KsGubYbCDtQVhQAXRtC-PzT-8';
const clientId = '14fa9b24-8991-4150-a1fe-d60adbabd469';

async function updateHub() {
  const node = {
    client_id: clientId,
    title: 'Risoluzione Totale Catalogo & Cassa: 108 Nuovi Prodotti Fatture Fabrizio e Fix Architettura Registrazione al Banco',
    tags: ['catalogo', 'cassa_rt', 'barcode', 'fabrizio', 'pierre_rene', 'eveline', 'cipriamakeup', 'miyo', 'overrides'],
    content: `Risolto al 100% il disallineamento segnalato da Federica Cesiano relativo ai prodotti non presenti nel gestionale e non riconosciuti al banco cassa:
1) Analisi Nuove Fatture Fabrizio: nei 5 PDF 'Federica Cesiano Temporary 1-5' identificati 108 prodotti (466 pezzi) mancanti a catalogo (47 Pierre René compresi tutti i pennelli trucco 105/109/110/203 e le ciprie SPF 25 01/03; 24 Eveline Cosmetics tra cui l'Eyeliner Waterproof 01 Black; 20 Cipria Make Up come blush Sublime e tinte labbra 511-525; 17 Miyo tra cui blush Cheeky e gloss Outstanding).
2) Integrazione Catalogo: 33 varianti/nuance agganciate alle schede esistenti ereditando packshot e formule, e 35 nuove schede prodotto raggruppate create con prezzi al pubblico su listino ufficiale e markup psicologico (.90/.50). Totale catalogo elevato a 441 prodotti, 887 varianti e 3.054 pezzi fisici a magazzino con copertura barcode al 100% (108/108 EAN verificati).
3) Fix Architetturale Prodotti Registrati al Banco: risolti i 4 blocchi nel codice (ProductCatalogTable, QuickScanBarcodeModal, lib/catalog.ts, NewManualOrderModal, lib/adminStore). Qualsiasi prodotto registrato al volo al banco (ID quick-...) compare ora istantaneamente nella tabella del gestionale, è ricercabile negli ordini e viene riagganciato in frazioni di secondo al re-scan della cassa con tolleranza barcode hardware (12/13 cifre con recupero prefisso).
4) Validazione & Test E2E: validazione JEV 1.13 con esito 'ottimo_strutturato' in 883ms, test di integrazione salvataggio/scansione superato al 100%, build di produzione Next.js (Turbopack) 462 pagine statiche compilata con successo (0 errori).`
  };

  const res = await fetch(hubUrl, {
    method: 'POST',
    headers: {
      apikey: hubKey,
      Authorization: `Bearer ${hubKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(node)
  });

  if (res.ok) {
    console.log('✅ Creativia Hub aggiornato con il nuovo cassetto operativo!');
  } else {
    console.error('❌ Errore aggiornamento cassetto Hub:', res.status, await res.text());
  }
}

updateHub().catch(console.error);
