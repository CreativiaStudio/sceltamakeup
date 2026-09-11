# Catalogo, Fornitori & Pipeline di Arricchimento Dati — Scelta Makeup

## 1. Fornitore Diego Dalla Palma / RVB LAB (Cosmetica Hub S.p.A.)
- **Fatturazione / DDT:** Documento `Prodotti Diego della palma.pdf` (24 pagine, 799 pezzi totali).
- **Canale Make-up (RVB LAB):**
  - Tutti i prodotti make-up (prefisso articolo `MF...`) e solari (`DHC...`) sono venduti al pubblico tramite farmacie e profumerie.
  - **Sorgente Dati Ufficiale:** Il catalogo Shopify di `rvblab.com` espone gli endpoint JSON pubblici.
  - **Regola di Corrispondenza al 100%:** Il campo `sku` delle varianti Shopify coincide esattamente con il `Cod.Articolo/Item` del DDT (es. `MF101011` = Correttore HD 11, `MF122031R` = Matita labbra 31). Le foto packshot HD, i prezzi e gli INCI sono estratti direttamente con precisione matematica.
- **Canale Skincare / DDP Professional (Diego Dalla Palma Professional):**
  - Linee retail da rivendita (`DOM`, prefisso `PF...`, es. `PF01181 HA HERO Siero 30ml`, `PF01681 Icon Time Gold`, `PF01451 Cell Detoxium`).
  - Arricchimento via EAN-13 presente su DDT e schede ufficiali distributori autorizzati (*Hair Gallery*, *diegodallapalmapro.com*).
- **Filtro Esclusione Articoli Non-Retail:**
  - Vengono categoricamente esclusi dall'e-commerce:
    1. Formati cabina professionali maxi (`PROF` da 150ml/400ml riservati ai trattamenti fisici);
    2. Tester e campionari espositore (`PT...`, `MT...`, `TST`);
    3. Accessori e merchandising cabina (`PA...`, `PM...`, `PSS...`, teli, t-shirt, espositori banco).

---

## 2. Fornitore Cipria Make Up (Kappa Srl)
- **Fatturazione:** Documenti `FEDERICA CESIANO - MOBILE 1-5.pdf`.
- **Marchi Gestiti:**
  - **CM (Cipria Milano):** Linea proprietaria Kappa Srl.
  - **EV (Eveline Cosmetics):** EAN internazionale `590...`.
  - **PR (Pierre René):** EAN internazionale `370...`.
  - **MIYO (Miyo Cosmetics):** EAN internazionale `370...`.
- **Sorgente Dati Ufficiale:** `cipriamakeup.it` via scansione `product-sitemap.xml` e parsing delle varianti WooCommerce (`data-product_variations`).
- **Regola di Corrispondenza al 100%:** Il codice numerico presente sulla fattura corrisponde all'`EAN-13` inserito nello `sku` di ciascuna variante del portale, con link diretto all'immagine ad alta risoluzione del colore/cialda e al prezzo.

---

## 3. Protocollo di Sicurezza "Zero Errori" & Validazione
1. **Nessuna associazione probabilistica:** Ogni prodotto entra a catalogo solo se esiste corrispondenza esatta su codice numerico (SKU o EAN).
2. **Generazione Cockpit di Anteprima:** Prima del deploy in produzione, viene generato un report interattivo HTML contenente per ogni riga fattura:
   - Riga fattura originale;
   - Anteprima immagine scaricata;
   - Titolo, shade/variante, prezzo e INCI;
   - Badge di validazione visiva per controllo a vista in 5 minuti.
