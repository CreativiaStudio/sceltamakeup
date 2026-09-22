# MISSIONE: BONIFICA PROFONDA CATALOGO DIEGO DALLA PALMA E RVB LAB - SCELTA MAKEUP

Sei incaricato come esperto sviluppatore e data engineer di completare la bonifica definitiva, profonda e certificata degli 86 prodotti Diego dalla Palma e RVB LAB nel catalogo di Scelta Makeup.

## IL CONTESTO CRITICO
Il negozio/salone di Federica Cesiano ("Scelta Makeup") è stato inaugurato. Attualmente nel catalogo:
1. Molti prodotti Diego dalla Palma hanno prezzi totalmente sballati (es. 48,30€ flat su tutto, persino su prodotti da 20€ o 30€).
2. Molti prodotti mostrano immagini errate: in particolare tabelle di riciclo/smaltimento imballaggi ("FAI LA DIFFERENZA, DIFFERENZIA!") o file HTML di errore 404 salvati come .jpg.
3. C'è confusione tra marchi del gruppo Cosmetica S.r.l.:
   - Codici `MF...` = **RVB LAB The Make Up**
   - Codici `PF...` terminanti con `1` = **Diego dalla Palma Professional (Linee Retail / Home Care)**
   - Codici `PF...` terminanti con `5` = **Diego dalla Palma Professional (Linee Cabina / Formato Professionale Salone)**
   - Codici `DHC...` = **Diego dalla Palma (Sun & Hair Care)**

## I DATI GIÀ DISPONIBILI SUL DISCO
Nel workspace hai a disposizione:
1. `scripts/ddp_products_to_research.json`: gli 86 prodotti con ID, SKU, EAN-13 ricavati dalle fatture ufficiali del fornitore, costo all'ingrosso pagato da Federica (`wholesaleCost`), prezzo attuale sballato (`currentPrice`) e descrizione fattura (`invoiceDesc`).
2. `scratch/ddp_fi_all_products.json`: catalogo completo ufficiale europeo DDP Pro (353 prodotti scaricati da WooCommerce Store API con SKU, titoli ufficiali, packshot studio ad alta risoluzione).
3. `scratch/all_86_matched.json`: prima mappatura automatica con 56 match certi tra Planethair, RVB LAB, DDP B2C e DDP Fi.

## COSA DEVI FARE
Scrivi ed esegui uno script Node.js completo ed esaustivo (`scripts/deep_catalog_resolver.js`) che:

1. **Risolve tutti gli 86 prodotti al 100%:**
   - Per i prodotti con corrispondenza esatta di codice (retail o distributore): assegna il nome ufficiale in italiano, il brand esatto (`Diego dalla Palma Professional` o `RVB LAB The Make Up` o `Diego dalla Palma`), il prezzo consigliato al pubblico reale italiano (prezzo di listino verificato).
   - Per i prodotti formato CABINA (terminanti in `5`):
     - Riconosce la linea di appartenenza (es. Cell-Detoxium, Icon Time, Ha Hero, Smart Pure, Sculptorea).
     - Assegna il nome formattato correttamente (es. "Cell-Detoxium Latte Detergente Micellare - Formato Cabina Salone").
     - Assegna il packshot ufficiale della linea corrispondente (mai più la tabella di riciclo!).
     - Calcola il prezzo pubblico/gestionale con ricarico standard da salone estetico (costo ingrosso * 1.77 arrotondato psicologico, es. costo 18€ -> 32,00€; costo 22.50€ -> 39,00€).
   - Per `MF106021` (EAN `8023264499979`): RVB LAB Delineatore Sopracciglia in Crema 21, prezzo 21,90€, packshot pulito.
   - Per i solari capelli `DHC110160` (Sun Shampoo 250ml) e `DHC120160` (Sun Mask 200ml): prezzo 24,50€, immagini CDN ufficiali già verificate (`DHC110160_0.jpg` e `DHC120160_0.jpg`).

2. **Scarica e Ottimizza le Immagini Packshot:**
   - Scarica le immagini autentiche in `public/products/` con nomi puliti (es. `public/products/ddp-<sku_minuscolo>.webp` o `.jpg`).
   - Verifica che le immagini scaricate siano reali file immagine validi (> 5KB, non pagine di errore HTML o icone di riciclo).
   - Elimina o sovrascrivi i vecchi file corrotti o con tabella di riciclo.

3. **Aggiorna `data/catalog.json`:**
   - Aggiorna i campi `name`, `brand`, `price`, `image`, `description` per ciascuno degli 86 prodotti corrispondenti in `data/catalog.json`.
   - Assicurati che il catalogo totale rimanga integro (341 prodotti totali o quelli esistenti, senza cancellare gli altri marchi come Cipria Makeup).

4. **Verifica Finale e Build:**
   - Verifica che non ci siano errori TypeScript (`npx tsc --noEmit`).
   - Genera un report di sintesi in `scratch/bonifica_report.json` con:
     - Totale prodotti aggiornati
     - Prezzo medio precedente vs Prezzo medio aggiornato
     - Lista completa delle modifiche effettuate (SKU, vecchio nome -> nuovo nome, vecchio prezzo -> nuovo prezzo, nuova immagine).
