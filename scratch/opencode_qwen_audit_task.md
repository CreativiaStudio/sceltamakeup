# AUDIT DI QUALITÀ COMPLETO: CATALOGO PRODOTTI CIPRIA MAKEUP (260 PRODOTTI)

Sei incaricato di effettuare un audit meticoloso e approfondito sui 260 prodotti del catalogo di Scelta Makeup importati dalla piattaforma Cipria Makeup (cipriamakeup.it).

## I BRAND INTERESSATI (260 PRODOTTI TOTALI):
- **Cipria Make Up**: 23 prodotti
- **Eveline Cosmetics**: 99 prodotti
- **Pierre René**: 59 prodotti
- **RVB LAB (importati da Cipria)**: 53 prodotti
- **Miyo**: 26 prodotti

## OBIETTIVI DELL'AUDIT:
1. **Verifica Prezzi e Coerenza Commerciale:**
   - Controlla che nessun prodotto abbia prezzo 0€, negativo, o palesemente anomalo.
   - Verifica che i prezzi delle varianti (`variants` e `shades`) siano sincronizzati con il prezzo del prodotto genitore.
   - Esegui una verifica a campione rispetto alla struttura prezzi tipica di Cipria Makeup.

2. **Verifica Fisica di Tutte le Immagini:**
   - Controlla ogni singolo percorso immagine in `p.image` e `p.images`.
   - Verifica che il file esista fisicamente sul disco in `public/products/`.
   - Verifica che la dimensione del file sia valida (> 2 KB) e non sia un file di errore HTML salvato come immagine.
   - Nota critica già individuata: il prodotto `cipria-67238b` ("Eveline Cosmetics BioHyaluron 3xRetinol Crema Riparatrice 40+") punta a `/products/eveline-cosmetics-packshot.jpg` che non esiste sul disco. Correggi questa anomalia assegnando un'immagine valida di Eveline BioHyaluron o scaricando il packshot corretto.

3. **Verifica Schede, Categorie e Varianti:**
   - Controlla che tutti i prodotti abbiano categoria valida, slug univoco e varianti coerenti con stock.

4. **Report Finale:**
   - Genera uno script Node.js che esegue tutti i controlli e salva il resoconto completo in `scratch/cipriamakeup_audit_report.json`.
   - Fornisci una sintesi chiara: totale prodotti controllati, integrità prezzi (%), integrità immagini (%), anomalie riscontrate e risolte.
