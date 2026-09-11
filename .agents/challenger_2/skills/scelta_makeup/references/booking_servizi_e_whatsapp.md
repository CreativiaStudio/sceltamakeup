# Modulo Booking Servizi (Makeup & Beauty) & Comunicazioni Anti-Ban — Scelta Makeup

## 1. Architettura a 2 Canali Paralleli (Beauty vs Makeup)

Il sistema di prenotazione è progettato con un'architettura **Multi-Risorsa e Multi-Ambiente a canali indipendenti**. I due rami operano in parallelo senza collisioni di spazio o personale:

| Canale di Servizio | Ambiente Fisico | Operatrice Assegnata | Stato Attuale | Scalabilità Futura |
| :--- | :--- | :--- | :--- | :--- |
| **Canale 1: MAKEUP** | Postazione Trucco Negozio (Open Space) | **Federica Cesiano** | 🟢 **ATTIVO SUBITO** | Predisposto per aggiungere ulteriori makeup artist |
| **Canale 2: BEAUTY** | Stanza Cabina Estetica Privata | Operatrice Estetica Esterna / Dedicata | ⚪ **DISATTIVATO ORA** | Sbloccabile con 1-click appena la cabina sarà operativa |

### Logica di Concorrenza:
- I due canali viaggiano su binari paralleli: una prenotazione di Makeup e una di Beauty possono coesistere nello stesso identico orario perché occupano **ambienti diversi** (postazione trucco vs stanza cabina) e **persone diverse**.

---

## 2. Tutela Operativa Negozio & Flessibilità Orari Federica (Solo-Worker Guard)

### Il Vincolo Fisico:
Federica gestisce il negozio da sola. Se sta truccando una cliente durante l'orario di vendita al banco, non può seguire chi entra in negozio né battere scontrini.

### La Soluzione nel Gestionale:
1. **Disponibilità Fuori Orario di Default:**
   - Gli slot prenotabili online dal pubblico vengono aperti prioritariamente nelle fasce in cui il negozio è chiuso al pubblico:
     - **Fascia Pausa Pranzo:** es. 13:30 – 15:30
     - **Fascia Serali / Post-Chiusura:** es. dopo le 20:00 (20:00 – 21:30)
     - **Domeniche o Mattine di Chiusura:** per trucco eventi/sposa su richiesta.
2. **Massima Flessibilità di Time-Blocking (1-Click):**
   - Federica dispone sul suo cellulare o sul PC cassa di un interruttore rapido:
     - Può bloccare o sbloccare interi giorni o singole ore in 2 secondi;
     - Può inserire appuntamenti presi a voce/telefono che oscurano all'istante la disponibilità online;
     - Buffer di sicurezza automatico tra un appuntamento e l'altro (es. 15 minuti per pulizia pennelli e igienizzazione postazione).

---

## 3. Canali di Comunicazione: Email Resend & WhatsApp QR Code

### Canale Email: Resend
- Invio istantaneo di email transazionali pulite e brandizzate (palette violetto/bianco):
  - Conferma prenotazione con dettagli appuntamento;
  - Link per disdetta o modifica entro 24 ore;
  - Promemoria automatico a 24h dall'appuntamento.

### Canale WhatsApp: Evolution API (Sessione QR Code del Negozio)
- Collegamento del numero WhatsApp ufficiale del negozio scansionando il QR code dal gestionale.
- Messaggi transazionali e promemoria diretti 1-a-1 alle clienti.

---

## 4. Motore Anti-Ban WhatsApp & Algoritmo di Invio a Passo d'Uomo

> [!WARNING]
> **REGOLA ARCHITETTURALE ANTI-BAN:** Per tutelare il numero di Federica ed evitare il blocco permanente da parte di Meta, il software **blocca alla radice qualsiasi tentativo di broadcast o invio massivo istantaneo**.

### 1. Blocco Tecnico Broadcast Massivi:
- L'interfaccia non include volutamente funzioni di invio "a tappeto" istantaneo (vietati blast a centinaia o migliaia di numeri in contemporanea).
- L'uso è limitato esclusivamente a **comunicazioni di servizio transazionali** (conferme, promemoria, notifiche ordine e-commerce).

### 2. Coda di Invio a Velocità Umana (Pacing & Throttling Lento):
Nel caso in cui debbano partire promemoria giornalieri cumulativi o piccoli avvisi mirati (es. 10-20 clienti):
- **Coda Asincrona (Queue Worker via n8n / Database):** I messaggi non partono mai insieme.
- **Delay Casuale con Jitter Umano:** Tra un messaggio e il successivo viene applicato un ritardo randomico compreso tra **20 e 45 secondi**.
- **Spaziatura Oraria:** Tetto massimo di invii orari garantito per simulare la digitazione naturale di un operatore umano ed evitare trigger sui filtri antispam di Meta.
- **Formattazione Dinamica Variabile:** Ogni messaggio include variabili personalizzate (Nome cliente, orario, trattamento) per evitare che il testo inviato sia identico a livello di checksum.


---

## 5. Politica Economica Booking: Acconto di Conferma & Sconto 10% Online

### La Strategia Commerciale:
Per educare la clientela alla prenotazione autonoma sul sito (evitando telefonate continue a Federica mentre è sola al banco) e azzerare il rischio di *no-show* (clienti che prenotano e non si presentano), applichiamo due leve sinergiche:

1. **Leva Incentivo (10% di Sconto Online):**
   - Chi prenota direttamente dal sito riceve subito il **10% di sconto** sul prezzo di listino del servizio.
   - Serve a canalizzare il traffico sul digitale e raccogliere contatti profilati (email e cellulare) nel CRM.
2. **Leva Tutela (Acconto di Conferma del 20%):**
   - Per bloccare definitivamente lo slot orario, la cliente versa online un piccolo anticipo del **20%** tramite Stripe / Apple Pay / Carta.
   - Il saldo residuo viene pagato comodamente in negozio il giorno del trattamento (contanti o myPOS Go 2).

---

### Esempio Pratico di Flusso Cassa:
- **Servizio:** *Make-up Evento / Cerimonia* (Prezzo Listino Store: **50,00 €**)
- **Tariffa Esclusiva Online (-10%):** **45,00 €**
- **Acconto di Conferma Online (20%):** **9,00 €** (pagati subito via Stripe al checkout)
- **Saldo Finale in Negozio:** **36,00 €** (versati a Federica a fine servizio)

---

### Copywriting Elegante per il Sito & Termini di Prenotazione (Anti-No Show):

> **Titolo Promozionale:**
> *"✨ Riserva Online con il 10% di Vantaggio Esclusivo"*
> *"Pianifica la tua seduta di bellezza in totale comodità: prenotando dal nostro sito hai diritto al 10% di sconto immediato sul trattamento selezionato."*

> **Nota di Riservazione Esclusiva (Trattenuta Acconto in modo gentile):**
> *"Per offrirti la massima cura sartoriale e dedicare la nostra professionista e la postazione esclusivamente a te per tutta la durata del servizio, è richiesta una piccola quota di conferma (20%) al momento della prenotazione.*
> 
> *🌸 **Flessibilità e Cancellazione:** Sappiamo che gli imprevisti possono accadere: puoi riprogrammare o cancellare il tuo appuntamento senza alcun costo fino a **24 ore prima** dell'orario fissato.*
> *In caso di mancata presentazione o cancellazione tardiva (con meno di 24h di preavviso), la quota di conferma sarà trattenuta a copertura dell'orario riservato e non più riallocabile."*


---

## 6. Flusso Cassa In-Store: Gestione Automatica del Saldo Residuo

### La Domanda Operativa:
Come fa Federica al termine del trucco a incassare solo il saldo rimanente senza fare calcoli a mente o doppi passaggi manuali?

### L'Esperienza a Schermo per Federica (Schermata "Appuntamenti di Oggi"):

```
+-------------------------------------------------------------------------+
|  📅 SCHEDA APPUNTAMENTO: Chiara Rossi                                   |
|  Servizio: Make-up Cerimonia (Fissato per oggi ore 15:30)               |
+-------------------------------------------------------------------------+
|  Tariffa Online concordata:                  45,00 €                    |
|  Acconto versato online (Stripe):           - 9,00 €  🟢 INCASSATO      |
+-------------------------------------------------------------------------+
|  >>> SALDO DA INCASSARE IN NEGOZIO:          36,00 € <<<                |
+-------------------------------------------------------------------------+
|  Metodo di Saldo:                                                       |
|  [ 💳 Carta / POS (myPOS Go 2) ]        [ 💵 Contanti ]                 |
|                                                                         |
|  [  👉 CLICK UNICO: "INCASSA SALDO & EMETTI SCONTRINO (36,00 €)"  ]     |
+-------------------------------------------------------------------------+
```

### I Due Semplici Passaggi Reali (Tempo totale: 5 secondi):
1. **Sul POS myPOS Go 2 (Terminale Fisico):**
   - Poiché il myPOS Go 2 è un terminale mobile indipendente (senza cavi verso il PC), Federica digita semplicemente sul tastierino del POS la cifra che legge a schermo in grande: `36,00` e porge il lettore contactless alla cliente.
2. **Sul Gestionale (Un Solo Click):**
   - Federica tocca il pulsante **"Incassa Saldo & Emetti Scontrino"**.
   - **Cosa fa il sistema in automatico:**
     1. Invia il comando XML via Wi-Fi all'IP della Cassa Fiscale RT, che stampa all'istante lo scontrino per il saldo di **36,00 €** (oppure per l'intero importo 45€ con riga "Acconto versato -9€ = Saldo 36€");
     2. Cambia lo stato dell'appuntamento nel database Supabase da "Prenotato" a 🟢 **"Saldato & Concluso"**;
     3. Registra l'incasso nel registro corrispettivi giornaliero dello store.

### Vantaggi Operativi:
- **Zero calcoli mentali:** Federica non deve ricordarsi chi ha versato l'acconto, quando o quanto: il sistema calcola la differenza al centesimo.
- **Zero scontrini manuali duplicati:** Lo scontrino fiscale della cassa viene generato per il saldo effettivo in un solo tocco.
- **Nessuna dimenticanza:** Un appuntamento non può essere archiviato senza aver registrato il saldo.
