# Setup Cassa RT, POS, Barriera Vendita & Scarico Magazzino — Scelta Makeup

## 1. Architettura di Cassa & Integrazione Hardware

### Componenti in Gioco:
1. **Registratore Telematico (Cassa Fiscale RT):** Stampante fiscale telematica con connessione Wi-Fi/LAN (es. Epson FP-81II RT o similare). Riceve comandi di stampa XML over HTTP (protocollo ePOS-Print).
2. **POS Bancario (myPOS Go 2):** Terminale di pagamento autonomo (Standalone) con SIM 4G dati integrata e Wi-Fi. Non necessita di cavi verso la cassa fisica: l'operatore digita l'importo sul display del POS e seleziona "Pagamento Elettronico" sul gestionale/cassa.
3. **Pistola Lettore Barcode:** Scanner ottico 1D/2D collegato in USB o Bluetooth al PC/tablet del banco cassa (emulazione tastiera HID).
4. **Gestionale Cloud (Frontend Barriera Cassa / POS Web):** Web app responsive su PC/Tablet collegata al database Supabase di Scelta Makeup.

---

## 2. Il Flusso Operativo Passo-Passo

```
[1. SCANSIONE PISTOLA] -> Legge codice a barre (EAN-13) sulla confezione
           |
[2. CARRELLO GESTIONALE] -> Il PC al banco riconosce articolo, variante, prezzo e giacenza
           |
[3. SELEZIONE PAGAMENTO] -> Contanti oppure Pagamento Elettronico (myPOS Go 2)
           |
[4. CLICK "STAMPA SCONTRINO"]
           |
     +-----+---------------------------------------------------------+
     |                                                               |
     v (Chiamata HTTP/XML su IP locale cassa)                       v (Query Supabase)
[5. CASSA FISCALE RT]                                       [6. DATABASE MAGAZZINO]
- Stampa scontrino cartaceo per cliente                     - Scala istantaneamente giacenza (-1)
- Registra transazione per chiusura telematica serale AdE   - Sincronizza disponibilità sull'E-commerce
```

### Regola d'Oro Operativa:
- **È sempre il Gestionale a comandare la cassa fiscale, mai il contrario.**
- **Cosa succede se Federica batte direttamente sulla cassa fisica?** Se digita l'importo a mano sulla tastiera della cassa senza passare dal computer, la cassa emette lo scontrino fiscale ma **il magazzino non sa cosa è stato venduto**. In tal caso il prodotto andrebbe rettificato a mano dal gestionale. Per questo il punto cassa primario deve essere lo schermo del computer con la pistola barcode.

---

## 3. Gestione Prodotti: Hanno tutti l'EAN? Come gestire le eccezioni

### Tutti i prodotti cosmetici hanno l'EAN?
- **Sì, il 99.9% dei prodotti cosmetici industriali:** Dalle fatture e DDT di Scelta Makeup, **il 100% dei prodotti** di RVB LAB, Diego Dalla Palma, Cipria Milano, Eveline Cosmetics, Pierre René e Miyo ha il codice a barre EAN-13 originale stampato sulla confezione o sul flacone.

### Cosa fare per i prodotti o servizi che NON hanno l'EAN:
1. **Trattamenti Cabina Estetica & Servizi:** Non esiste codice a barre fisico per una "Pulizia Viso" o un "Trattamento HA Hero in Cabina". Nel gestionale questi servizi compaiono come **pulsanti rapidi touch a schermo** (sezione "Servizi Cabina"). Basta un tocco per inserirli a scontrino.
2. **Cofanetti, Kit Regalo o Promozioni Speciali:** Se Federica crea un pacchetto natalizio o un bundle personalizzato, il gestionale genera un codice interno breve (es. `KIT-01`). Può essere selezionato da una griglia visiva o tramite etichetta barcode adesiva stampata in negozio.
3. **Ricerca Testuale di Sicurezza:** Se un codice a barre è rovinato o illeggibile, la schermata di cassa dispone di una barra di ricerca istantanea: basta digitare "31" o "scrub" per aggiungere il prodotto al carrello in un click senza pistola.

---

## 4. Checklist Tecnica per l'Installazione (8 Settembre)

Da richiedere tassativamente al tecnico del fornitore di cassa durante l'installazione:

1. **IP Statico (Fisso):**
   - La cassa DEVE avere un IP statico configurato sulla rete Wi-Fi del negozio (es. `192.168.1.150`), per evitare che al riavvio del modem l'IP cambi bloccando le stampe.
2. **Modello Esatto e Versione Firmware:**
   - Annotare marca e modello (es. Epson FP-81II RT, RCH Onda RT, Custom JSMART).
3. **Abilitazione Server Web Integrato (ePOS-Print / XML):**
   - Verificare che il modulo web server per la ricezione di comandi XML su porta 80 o 443 sia abilitato e attivo.
4. **Credenziali di Accesso Cassa:**
   - Password di rete/operatore (spesso default vuota o `1234`).

---

## 5. Potenziali Complessità Tecniche & Soluzioni Preventive

| Complessità / Rischio | Causa Tecnica | Soluzione Adottata |
| :--- | :--- | :--- |
| **Mixed Content (HTTPS vs HTTP)** | La web app è su HTTPS (`https://...`), mentre la cassa sulla rete locale risponde solitamente su HTTP (`http://192.168.1.X`). I browser moderni possono bloccare chiamate HTTP insicure da pagine HTTPS. | 1) Abilitare certificato SSL/HTTPS direttamente sulla cassa fiscale, oppure 2) Utilizzare un micro-bridge locale (leggero script locale sul PC cassa che fa da tramite), oppure 3) Configurare i flag Private Network Access (PNA). |
| **Isolamento Client Wi-Fi (AP Isolation)** | Alcuni modem commerciali hanno attiva l'opzione "Isolamento AP" che impedisce ai dispositivi Wi-Fi di comunicare tra loro. | Disattivare l'isolamento client sul modem del negozio, permettendo al PC cassa di raggiungere l'IP della stampante fiscale. |
| **Caduta Connessione Internet Store** | Se manca momentaneamente la linea internet nel negozio, il gestionale cloud non può salvare sul cloud. | Modalità Offline / PWA Service Worker: il browser memorizza temporaneamente le vendite in locale (IndexedDB), stampa lo scontrino sulla cassa locale e sincronizza con Supabase appena torna la rete. |
| **Doppia Vendita Negozio / E-commerce (Collisione Giacenza 1)** | Un cliente acquista l'ultimo rossetto in negozio proprio mentre un utente online lo ha nel carrello. | Concorrenza ottimistica su Supabase: appena la cassa spara il barcode e chiude la vendita, la giacenza scende a 0 e il carrello online si aggiorna istantaneamente bloccando l'ordine dell'articolo terminato. |
