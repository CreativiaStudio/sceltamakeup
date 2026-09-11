# Original User Request

## 2026-09-07T09:57:37Z

Costruire e integrare la FASE 3 dell'architettura di Scelta Makeup: il motore di comunicazione transazionale anti-ban per WhatsApp (invio a passo d'uomo con delay casuale di 20–45 secondi e sessione QR code) e il modulo di notifiche email transazionali di lusso con Resend (conferma booking acconto 20%, saldo in-store 80%, promemoria a 24h e notifiche ordini e-commerce), corredato da una dashboard di monitoraggio code in tempo reale integrata nel gestionale di Federica (/admin/appuntamenti).

Nota importante: gli account cloud reali (Supabase, Resend, Evolution API) saranno registrati e configurati in seguito. L'implementazione deve essere al 100% funzionante e collaudata in locale con modalità demo/simulazione realistica (connettori pronti a ricevere le chiavi in .env.local).

Working directory: c:/Users/mario/Progetti Antigravity/Scelta Makeup
Integrity mode: development

## Requirements

### R1. Motore Asincrono WhatsApp Anti-Ban & Pacing Umano (Evolution API / QR Code Store)
- Implementare una coda asincrona di invio messaggi (Queue Worker) per proteggere il numero di cellulare di Federica dal ban di Meta:
  - Divieto categorico di broadcast massivi istantanei; solo comunicazioni transazionali 1-a-1.
  - Pacing a velocità umana: tra un messaggio e il successivo viene applicato un ritardo casuale (jitter) compreso tassativamente tra 20 e 45 secondi.
  - Variazione dinamica del testo: ogni messaggio include campi univoci (nome cliente, orario, trattamento, codice prenotazione, data, consigli pre-trattamento) in modo che nessun messaggio sia identico a livello di checksum/hash antispam.
  - Tipi di messaggio:
    1. Conferma Prenotazione: Riepilogo acconto 20% versato, saldo dovuto in boutique, data/ora e indirizzo store.
    2. Promemoria a 24h: Avviso amichevole con indicazioni per cancellazione gratuita entro le 24h e mappa negozio.
    3. Conferma Ordine E-Commerce: Dettaglio articoli e tracking/ritiro in store.

### R2. Modulo Email Transazionali di Lusso con Resend
- Creare il generatore di template email HTML responsive brandizzate con il design system ufficiale di Scelta Makeup:
  - Palette: Royal Violet (#5E1788), Pastel Lilac (#D8C2E7), Optical White (#FFFFFF), Mauve Rose (#D462A6).
  - Header con logo ufficiale vettoriale e claim "L'eleganza di essere autentica".
  - Template dedicati:
    1. Booking Confirmation: Riepilogo finanziario trasparente (prezzo listino, sconto 10% online, acconto 20% pagato, saldo 80% in negozio) e pulsante Google Calendar/Apple Calendar.
    2. Booking 24h Reminder: Promemoria con vademecum (pelle pulita per il trucco, puntualità) e link disdetta.
    3. Order Placed: Conferma acquisto cosmetici per spedizione corriere o ritiro gratuito in boutique.
  - Servizio API lib/resendService.ts pronto per la chiave RESEND_API_KEY con fallback di anteprima/simulazione visiva in locale.

### R3. Dashboard Monitor Code & Connessione nel Gestionale (/admin/appuntamenti)
- Integrare nel pannello gestionale di Federica un tab dedicato "Canali Notifiche & Coda":
  - Stato Connessione WhatsApp: visualizzazione stato sessione (Connesso / Disconnesso / QR Code scannerizzabile dal telefono del negozio).
  - Monitor Coda di Invio in Tempo Reale: visualizzazione messaggi in coda con countdown del delay (20–45s), orario di rilascio programmato, destinatario e stato (In attesa / In invio / Consegnato / Errore).
  - Pulsante Test Invio Singolo: per verificare istantaneamente la formattazione e il rispetto del tempo di attesa.

### R4. File Schema SQL Supabase Dedicato
- Creare il file c:/Users/mario/Progetti Antigravity/Scelta Makeup/supabase_schema.sql contenente lo schema completo e isolato di Scelta Makeup (products, variants, inventory, appointments, orders, blocked_slots, notification_logs) con RLS policies, pronto per essere incollato con 1 click nel nuovo progetto Supabase appena creato.

## Acceptance Criteria
- [ ] Test automatico di coda: verificato che l'intervallo misurato tra due invii consecutivi sia compreso tra 20 e 45 secondi con jitter casuale.
- [ ] Tutti i template email (conferma booking, promemoria 24h, conferma ordine) generano HTML responsive conforme alla palette ufficiale Scelta Makeup.
- [ ] Calcolo corretto degli importi (listino, -10% online, acconto 20%, saldo 80%) visualizzato nell'email di riepilogo.
- [ ] npx tsc --noEmit eseguito con 0 errori TypeScript.
- [ ] npm run lint eseguito con 0 errori e 0 warning.
- [ ] npm run build completato con successo su tutte le rotte.

## 2026-09-07T14:23:10Z

Costruire la suite completa di Amministrazione E-Commerce per Scelta Makeup (`/admin`), ispirata all'architettura backend di Isabel Pepe (Dashboard Ordini, Catalogo Prodotti & Giacenze Stock, Spedizioni & Ritiro in Store, Clienti & CRM, Analytics) e unificata con l'esistente gestionale Appuntamenti/Cassa RT/WhatsApp, garantendo il vincolo categorico di ISOLAMENTO TOTALE del database da Isabel Pepe.

Working directory: c:/Users/mario/Progetti Antigravity/Scelta Makeup
Integrity mode: development

## Requirements

### R1. VINCOLO CATEGORICO: Isolamento Assoluto da Isabel Pepe (Zero Contaminazione)
- **Divieto assoluto** di creare tabelle, modificare o accedere ai dati dell'istanza Supabase di Isabel Pepe.
- Fornire il file `c:/Users/mario/Progetti Antigravity/Scelta Makeup/supabase_schema.sql` completo e autonomo, contenente lo schema DDL completo per Scelta Makeup (`scelta_products`, `scelta_variants`, `scelta_orders`, `scelta_order_items`, `scelta_inventory_logs`, `scelta_customers`, `scelta_appointments`, `scelta_blocked_slots`, `scelta_notification_logs`) con RLS, indici e trigger, pronto per essere incollato ed eseguito con 1 click nel nuovo database Supabase dedicato di Federica appena creato.
- L'intera architettura backend locale deve operare con un layer di storage isolato (file JSON/localStorage/mock service atomico) con zero chiamate verso il database di Isabel Pepe.

### R2. Dashboard Admin E-Commerce Unificata (`/admin`)
- Creare il pannello di controllo `/admin` con navigazione tramite Sidebar responsive (ispirata al layout di Isabel Pepe con la palette e l'estetica Scelta Makeup):
  - **Panoramica / Dashboard:** KPI vendite (Fatturato totale, Ordini evasi, Carrello medio, Clienti registrati, Conversion rate), grafico andamento e feed ordini recenti.
  - **Catalogo Prodotti & Stock:** Tabella interattiva per consultare i 341 prodotti, filtri per brand (RVB LAB, Diego dalla Palma, Cipria, Pierre René, Eveline, Miyo) e categoria (Viso, Occhi, Labbra, Skincare, Accessori), ricerca rapida, gestione giacenze stock per singola variante/shade con indicatori visivi (Disponibile, Scorte Basse, Esaurito), e modale per modifica prezzo o dettagli.
  - **Ordini & Spedizioni:** Tabella gestione ordini e-commerce con stati operativi ("In Elaborazione", "Spedito con Corriere Tracciato", "Pronto per Ritiro in Boutique", "Completato"), visualizzazione articoli acquistati, dati cliente, tracking number e totale.
  - **Clienti / CRM:** Elenco clienti con storico acquisti e appuntamenti effettuati.
  - **Appuntamenti & Cassa RT (Preservato al 100%):** Mantenere l'accesso completo e intatto a tutte le funzionalità già collaudate in `/admin/appuntamenti` (incasso saldi, scontrino RT XML compatibile ePOS, blocco orari, coda anti-ban WhatsApp Evolution API).

### R3. Preservazione e Robustezza del Codice Esistente
- Nessuna rottura dello storefront pubblico (`/`, `/prodotti/[slug]`, `/prenota`, `/servizi`, carrello Zustand).
- `npx tsc --noEmit` deve passare con 0 errori TypeScript.
- `npm run lint` deve passare con 0 errori ESLint.
- `npm run build` deve compilare tutte le 345+ pagine con successo.

## Acceptance Criteria

### Isolamento Database
- [ ] Il file `supabase_schema.sql` è presente nella root del progetto, perfettamente strutturato e con prefissi/tabelle dedicati a Scelta Makeup.
- [ ] Nessuna connessione attiva tenta di scrivere o modificare tabelle nel database di Isabel Pepe in locale.

### Navigazione & Sezioni Admin
- [ ] La rotta `/admin` presenta la sidebar di navigazione completa con tutte le sezioni (Panoramica, Prodotti & Stock, Ordini, Spedizioni, Appuntamenti & Cassa, Notifiche).
- [ ] I 341 prodotti sono consultabili nella tabella con stato stock, prezzi e filtri funzionanti.
- [ ] Gli ordini e-commerce sono visualizzabili con i dettagli degli articoli e possibilità di aggiornare lo stato di spedizione/ritiro in negozio.
- [ ] La sezione Appuntamenti/Cassa RT/WhatsApp non subisce alcuna regressione funzionale.

### Standard Tecnici
- [ ] `npx tsc --noEmit` completato con 0 errori.
- [ ] `npm run lint` completato con 0 errori.
- [ ] `npm run build` completato con successo.
