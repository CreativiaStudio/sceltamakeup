const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const workspaceDir = 'C:/Users/mario/Progetti Antigravity/Scelta Makeup';
const artifactDir = 'C:/Users/mario/.gemini/antigravity/brain/e277ca45-7ae0-46ad-b569-e8159455b4a1';

// Read assets as Base64
function toBase64(relPath, mimeType) {
  try {
    const fullPath = path.join(workspaceDir, relPath);
    if (fs.existsSync(fullPath)) {
      const b64 = fs.readFileSync(fullPath).toString('base64');
      return `data:${mimeType};base64,${b64}`;
    }
  } catch (e) {
    console.error('Error reading asset:', relPath, e.message);
  }
  return '';
}

const logoB64 = toBase64('public/brand/logo-white.png', 'image/png');
const salonMirrorsB64 = toBase64('Foto Google Business Profile/salone-postazioni-trucco-specchi.jpg', 'image/jpeg');
const salonOverviewB64 = toBase64('Foto Google Business Profile/salone-panoramica-boutique-completa.jpg', 'image/jpeg');

const htmlContent = `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<title>Strategia Operativa Retail & Video Fai-Da-Te — Scelta Makeup</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,400;1,600&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');

  @page {
    size: A4;
    margin: 0;
  }

  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  body {
    margin: 0;
    padding: 0;
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #1F1B24;
    background: #FAF8FC;
    font-size: 13px;
    line-height: 1.58;
  }

  .page {
    width: 210mm;
    height: 297mm;
    position: relative;
    padding: 22mm 22mm 18mm 22mm;
    background: #FFFFFF;
    overflow: hidden;
    page-break-after: always;
    break-after: page;
  }

  /* Luxury Headers & Footers */
  .page-header {
    position: absolute;
    top: 11mm;
    left: 22mm;
    right: 22mm;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #EADCF5;
    padding-bottom: 3mm;
    font-size: 8.5pt;
    text-transform: uppercase;
    letter-spacing: 1.2px;
    color: #7A3293;
    font-weight: 600;
  }

  .page-header .brand-label {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #5E1788;
  }

  .page-header .doc-tag {
    color: #8C789E;
    font-weight: 500;
  }

  .page-footer {
    position: absolute;
    bottom: 11mm;
    left: 22mm;
    right: 22mm;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid #EADCF5;
    padding-top: 3mm;
    font-size: 8pt;
    color: #8C789E;
  }

  .page-footer .studio-tag {
    color: #5E1788;
    font-weight: 600;
  }

  .page-footer .page-number {
    font-weight: 600;
    color: #7A3293;
  }

  /* Typography */
  h1, h2, h3, h4 {
    font-family: 'Playfair Display', Georgia, serif;
    color: #2D1145;
    margin: 0;
    line-height: 1.25;
  }

  h2.section-title {
    font-size: 20pt;
    font-weight: 700;
    color: #5E1788;
    margin-bottom: 2.5mm;
  }

  .section-subtitle {
    font-size: 9.5pt;
    color: #6C587D;
    margin-bottom: 5mm;
    font-style: italic;
  }

  p {
    margin: 0 0 3.5mm 0;
    color: #2E2836;
  }

  strong {
    color: #4A126D;
  }

  /* Callout Cards */
  .callout-box {
    background: #FAF5FE;
    border-left: 3.5px solid #5E1788;
    border-radius: 4px;
    padding: 3.5mm 4.5mm;
    margin: 3.5mm 0;
  }

  .callout-gold {
    background: #FCF9F2;
    border-left: 3.5px solid #C6A86B;
    border-radius: 4px;
    padding: 3.5mm 4.5mm;
    margin: 3.5mm 0;
  }

  .badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 7.5pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.8px;
  }

  .badge-purple {
    background: #EADCF5;
    color: #5E1788;
  }

  .badge-gold {
    background: #F5ECCF;
    color: #8A6A1E;
  }

  /* Tables */
  table.data-table {
    width: 100%;
    border-collapse: collapse;
    margin: 2.5mm 0;
    font-size: 8pt;
  }

  table.data-table th {
    background: #5E1788;
    color: #FFFFFF;
    text-align: left;
    padding: 5px 8px;
    font-weight: 600;
    letter-spacing: 0.5px;
    font-family: 'Plus Jakarta Sans', sans-serif;
  }

  table.data-table td {
    padding: 5px 8px;
    border-bottom: 1px solid #EADCF5;
    vertical-align: top;
    line-height: 1.35;
  }

  table.data-table tr:nth-child(even) td {
    background: #FAF6FD;
  }

  /* Card Grid */
  .grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4mm;
    margin: 3.5mm 0;
  }

  .grid-3 {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 3.5mm;
    margin: 3.5mm 0;
  }

  .card {
    background: #FFFFFF;
    border: 1px solid #EADCF5;
    border-radius: 6px;
    padding: 3.5mm;
    box-shadow: 0 2px 6px rgba(94, 23, 136, 0.04);
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 1.5mm;
    font-weight: 700;
    color: #5E1788;
    font-size: 9pt;
  }

  /* ==============================================================
     PAGE 1: LUXURY COVER
     ============================================================== */
  .cover-page {
    background: radial-gradient(circle at 80% 20%, #7A3293 0%, #4D1270 50%, #2B0740 100%);
    color: #FFFFFF;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 26mm 24mm 22mm 24mm;
  }

  .cover-border {
    position: absolute;
    top: 13mm;
    bottom: 13mm;
    left: 13mm;
    right: 13mm;
    border: 1px solid rgba(216, 194, 231, 0.3);
    pointer-events: none;
  }

  .cover-border-inner {
    position: absolute;
    top: 16mm;
    bottom: 16mm;
    left: 16mm;
    right: 16mm;
    border: 1px solid rgba(198, 168, 107, 0.4);
    pointer-events: none;
  }

  .cover-top {
    position: relative;
    z-index: 2;
  }

  .cover-agency-tag {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 4px 14px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 20px;
    font-size: 8pt;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: #F0E3FA;
    font-weight: 600;
    margin-bottom: 8mm;
  }

  .cover-logo-wrapper {
    margin-bottom: 10mm;
  }

  .cover-logo-img {
    height: 60px;
    filter: drop-shadow(0 4px 12px rgba(0,0,0,0.3));
  }

  .cover-middle {
    position: relative;
    z-index: 2;
    margin-top: 6mm;
  }

  .cover-title {
    font-size: 32pt;
    font-weight: 700;
    color: #FFFFFF;
    line-height: 1.15;
    margin-bottom: 4mm;
    letter-spacing: -0.5px;
  }

  .cover-title span {
    color: #E6D0F7;
    font-style: italic;
  }

  .cover-gold-rule {
    width: 60mm;
    height: 3px;
    background: linear-gradient(90deg, #C6A86B, rgba(198, 168, 107, 0.2));
    margin: 5mm 0 5mm 0;
  }

  .cover-subtitle {
    font-size: 12.5pt;
    font-weight: 300;
    color: #E2D3EF;
    line-height: 1.45;
    max-width: 145mm;
  }

  .cover-bottom {
    position: relative;
    z-index: 2;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    border-top: 1px solid rgba(255, 255, 255, 0.15);
    padding-top: 5mm;
  }

  .cover-meta {
    font-size: 8.5pt;
    color: #D3BFDF;
    line-height: 1.6;
  }

  .cover-meta strong {
    color: #FFFFFF;
  }

  .cover-stamp {
    text-align: right;
    font-size: 8pt;
    color: #C6A86B;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: 600;
  }
</style>
</head>
<body>

<!-- ==============================================================
     PAGE 1: COVER
     ============================================================== -->
<div class="page cover-page">
  <div class="cover-border"></div>
  <div class="cover-border-inner"></div>

  <div class="cover-top">
    <div class="cover-agency-tag">
      <span>Creativia Studio</span>
      <span>•</span>
      <span>Retail Acceleration & Video Blueprint</span>
    </div>

    <div class="cover-logo-wrapper">
      ${logoB64 ? `<img src="${logoB64}" class="cover-logo-img" alt="Scelta Makeup" />` : `<h2 style="color:#FFF;">SCELTA MAKEUP</h2>`}
    </div>
  </div>

  <div class="cover-middle">
    <h1 class="cover-title">
      Come Portare Clienti<br>
      in Negozio <span>Senza Budget</span>
    </h1>
    <div class="cover-gold-rule"></div>
    <div class="cover-subtitle">
      Guida pratica, format video da smartphone e idee d'urto per attirare clienti nel Salone di Via dei Pellegrini a Napoli e generare cassa subito.
    </div>
  </div>

  <div class="cover-bottom">
    <div class="cover-meta">
      <strong>Preparato per:</strong> Federica Cesiano — Scelta Makeup<br>
      <strong>A cura di:</strong> Mario • Creativia Studio<br>
      <strong>Sede Salone:</strong> Via dei Pellegrini 28/29, Montesanto (Napoli)
    </div>
    <div class="cover-stamp">
      Edizione Riservata<br>
      Ottobre 2026
    </div>
  </div>
</div>

<!-- ==============================================================
     PAGE 2: LETTERA APERTA DI MARIO
     ============================================================== -->
<div class="page">
  <div class="page-header">
    <div class="brand-label">Scelta Makeup • Via dei Pellegrini, Napoli</div>
    <div class="doc-tag">01. Il Patto di Realtà</div>
  </div>

  <h2 class="section-title">Il Motore e la Benzina</h2>
  <div class="section-subtitle">Una premessa schietta, con il cuore in mano e zero peli sulla lingua.</div>

  <p><strong>Ciao Federica,</strong></p>
  <p>Ti metto nero su bianco questo documento perché <strong>ci tengo al successo di Scelta Makeup e mi sta a cuore la tua situazione</strong>, e voglio darti una mano vera, come ho sempre cercato di fare fin dal primo giorno.</p>

  <p>Come già sai e come ci siamo detti a voce nelle varie telefonate e su WhatsApp, ho percepito tutta la tua ansia. Ne abbiamo parlato tanto: mi hai ripetuto più volte che <em>"non entra gente in negozio"</em>, che <em>"dobbiamo trovare il modo di far entrare persone"</em> e che sei preoccupata per l'affitto e i costi del locale. Ti capisco benissimo: avviare un'attività da zero, da sola, mette una pressione tremenda sulle spalle. È una fase dura che toglie il sonno a qualsiasi commerciante.</p>

  <div class="callout-box">
    <strong style="color: #5E1788; font-size: 9.5pt; display: block; margin-bottom: 1.5mm;">
      ⚠️ Il punto fondamentale di cui abbiamo già parlato:
    </strong>
    <p style="margin-bottom: 0; font-size: 8.5pt;">
      Tu da noi hai acquistato <strong>lo sviluppo del sito e-commerce, il registratore di cassa telematico RT, il catalogo prodotti sincronizzato e il gestionale con il CRM per i profili trucco</strong>. Hai un'infrastruttura tecnologica su misura che a Napoli la maggior parte delle profumerie e saloni non ha nemmeno nei sogni. Ma come ti ho già detto a voce: <strong>tu hai il motore, ma non hai la benzina per farlo girare</strong>.
    </p>
  </div>

  <p style="font-size: 8.5pt;">
    Avere un sito bello e una cassa moderna non fa materializzare per magia le persone dentro la porta in Via dei Pellegrini. Quello si chiama <strong>marketing, acquisizione clienti e lavoro attivo sul territorio</strong>. Fare campagne pubblicitarie a pagamento, gestire i canali social giorno per giorno e portare clienti con le sponsorizzate è un altro mestiere: richiede <strong>budget mensili importanti e contratti dedicati</strong>.
  </p>

  <p style="font-size: 8.5pt;">
    <strong>Ma tu questo lo sai già, ne abbiamo parlato.</strong> Questa è solo la premessa per farti capire che adesso va fatto un miracolo per cercare di smuovere la situazione senza budget: fortunatamente <strong>ci apprestiamo ad entrare nel periodo Natalizio, che a prescindere smuove sempre qualcosa</strong>.
  </p>

  <div class="callout-gold" style="margin-top: 2.5mm;">
    <strong style="color: #8A6A1E; font-size: 9.5pt; display: block; margin-bottom: 1mm;">
      🎯 Il senso di questa guida:
    </strong>
    <p style="margin-bottom: 0; font-size: 8.5pt;">
      Non è teoria accademica. Sono <strong>le istruzioni pratiche, i format video e i copioni parola per parola</strong> che devi iniziare ad applicare <strong>tu, ogni singolo giorno, con il tuo telefono</strong>. A costo zero. Se vogliamo attirare clienti nel salone senza budget pubblicitario, la tua unica arma è la tua faccia, la tua voce da professionista e il tuo smartphone.
    </p>
  </div>

  <p style="margin-top: 3mm; font-size: 8.5pt;">
    Adesso giriamo pagina e vediamo esattamente come fare. Senza ansia, senza scuse, ma con metodo.
  </p>

  <div style="margin-top: 5mm; text-align: right;">
    <span style="font-family: 'Playfair Display', serif; font-size: 13pt; color: #5E1788; font-style: italic;">Mario</span><br>
    <span style="font-size: 7.5pt; color: #8C789E; text-transform: uppercase; letter-spacing: 1px;">Founder & Creative Director • Creativia Studio</span>
  </div>

  <div class="page-footer">
    <div class="studio-tag">Creativia Studio per Scelta Makeup</div>
    <div class="page-number">Pagina 02</div>
  </div>
</div>

<!-- ==============================================================
     PAGE 3: I 5 COMANDAMENTI DELLO SMARTPHONE
     ============================================================== -->
<div class="page">
  <div class="page-header">
    <div class="brand-label">Scelta Makeup • Via dei Pellegrini, Napoli</div>
    <div class="doc-tag">02. Setup Tecnico da Smartphone</div>
  </div>

  <h2 class="section-title">I 5 Comandamenti dello Smartphone</h2>
  <div class="section-subtitle">Come girare video di qualità luxury con un semplice telefono (Zero spese).</div>

  <p style="font-size: 8.5pt;">
    Non serve spendere migliaia di euro in videocamere. Il 95% del successo di un video beauty sui social dipende da 3 fattori: <strong>luce corretta, audio chiaro e credibilità visiva</strong>. Tu hai già nel tuo salone un vantaggio enorme rispetto a chi fa video da casa.
  </p>

  <div class="grid-2" style="margin-bottom: 2mm;">
    <div class="card" style="border-left: 3px solid #5E1788;">
      <div class="card-header">
        <span class="badge badge-purple">1</span>
        <span>Pulisci la lente prima di iniziare</span>
      </div>
      <p style="font-size: 8pt; margin: 0; color: #4A3E54; line-height: 1.45;">
        Sembra una banalità, ma tocchiamo il telefono con dita unte di crema o trucco. Il 90% dei video "scadenti" è solo appannato. <strong>Un colpo di maglietta o panno in microfibra sulla fotocamera</strong> e l'immagine diventa subito brillante e nitida.
      </p>
    </div>

    <div class="card" style="border-left: 3px solid #5E1788;">
      <div class="card-header">
        <span class="badge badge-purple">2</span>
        <span>Sfrutta gli specchi a 5500K</span>
      </div>
      <p style="font-size: 8pt; margin: 0; color: #4A3E54; line-height: 1.45;">
        Nel tuo salone hai le postazioni trucco illuminate con <strong>luce bianca pura a 5500K</strong>. Quella luce è oro colato: elimina le ombre scure sotto gli occhi e fa risaltare le sfumature reali del make-up. Registra sempre seduta lì davanti o rivolta verso la vetrina.
      </p>
    </div>

    <div class="card" style="border-left: 3px solid #D462A6;">
      <div class="card-header">
        <span class="badge badge-purple">3</span>
        <span>VIETATI i filtri leviganti!</span>
      </div>
      <p style="font-size: 8pt; margin: 0; color: #4A3E54; line-height: 1.45;">
        Se vendi cosmetici e usi il filtro "bellezza" di Instagram, la donna che guarda pensa: <em>"Usa il filtro perché il trucco fa schifo"</em>. <strong>La grana della pelle reale vende mille volte di più</strong>. Chi ha pori, discromie o rughette si fida solo se vede pelle vera.
      </p>
    </div>

    <div class="card" style="border-left: 3px solid #D462A6;">
      <div class="card-header">
        <span class="badge badge-purple">4</span>
        <span>Telefono verticale ad altezza occhi</span>
      </div>
      <p style="font-size: 8pt; margin: 0; color: #4A3E54; line-height: 1.45;">
        Appoggia il telefono su una mensola o un treppiede economico (da 10€) <strong>esattamente all'altezza del tuo sguardo</strong>. Mai riprendere dal basso verso l'alto: deforma le proporzioni del viso e accentua il sottomento.
      </p>
    </div>
  </div>

  <div class="callout-box" style="margin-top: 1.5mm; margin-bottom: 3mm;">
    <strong style="color: #5E1788; font-size: 8.5pt;">5. Voce vicina e musica al minimo:</strong>
    <p style="font-size: 8pt; margin-top: 1mm; margin-bottom: 0;">
      Parla a <strong>40-50 cm dal microfono</strong> del telefono con tono fermo, sicuro e sorridente. Se aggiungi una canzone di tendenza dentro TikTok o Instagram, <strong>abbassa il volume della musica all'8-10%</strong>. La protagonista sei tu e quello che spieghi, non la musica dance a palla.
    </p>
  </div>

  <!-- Box Foto Salone: Verticale e non tagliata! -->
  <div style="display: flex; gap: 4mm; align-items: stretch; background: #FAF5FE; border: 1px solid #EADCF5; border-radius: 6px; padding: 3mm;">
    ${salonMirrorsB64 ? `
    <div style="width: 120px; min-width: 120px; height: 165px; border-radius: 4px; overflow: hidden; border: 1px solid #D8C2E7;">
      <img src="${salonMirrorsB64}" style="width: 100%; height: 100%; object-fit: cover; object-position: center top;" alt="Postazione Trucco Specchi" />
    </div>` : ''}
    <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; font-size: 8.5pt; color: #4A3E54; line-height: 1.5;">
      <strong style="color: #5E1788; font-size: 10pt; margin-bottom: 1.5mm; display: block;">Il Tuo Negozio è il Tuo Set Cinematografico</strong>
      <p style="margin: 0; font-size: 8.5pt; color: #33283E;">
        Con le poltrone professionali e gli specchi cinematografici trasmette subito l'idea di <strong>Salone di Alta Gamma</strong>. Usalo come sfondo naturale per ogni singolo video.
      </p>
      <div style="margin-top: 2.5mm; font-size: 7.5pt; color: #7A3293; font-style: italic;">
        📍 Via dei Pellegrini 28/29, Montesanto • Luce bianca 5500K controllata.
      </div>
    </div>
  </div>

  <div class="page-footer">
    <div class="studio-tag">Creativia Studio per Scelta Makeup</div>
    <div class="page-number">Pagina 03</div>
  </div>
</div>

<!-- ==============================================================
     PAGE 4: I PRIMI 3 SECONDI (HOOK) & 10 COPIONI
     ============================================================== -->
<div class="page">
  <div class="page-header">
    <div class="brand-label">Scelta Makeup • Via dei Pellegrini, Napoli</div>
    <div class="doc-tag">03. L'Arte dell'Aggancio (Hook)</div>
  </div>

  <h2 class="section-title">I Primi 3 Secondi (L'Aggancio)</h2>
  <div class="section-subtitle">Come fermare il pollice delle donne di Napoli prima che scorrano oltre.</div>

  <p style="font-size: 8pt; margin-bottom: 2mm;">
    Sui social il tempo non si misura in minuti, ma in decimi di secondo. Se nei primi 3 secondi dici:<br>
    <span style="color: #C0392B; font-weight: 600;">❌ "Ciao ragazze, oggi sono qui per parlarvi di un prodotto che mi piace tantissimo..."</span> — <strong>Hai perso la cliente</strong>. Ha già scrollato.
    Inizia parlando <strong>del suo problema, dei soldi sprecati o di una curiosità scottante</strong>:
  </p>

  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 23%;">Categoria</th>
        <th style="width: 48%;">Frase Esatta da Dire in Camera (0-3s)</th>
        <th style="width: 29%;">Cosa Fare Fisicamente</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Soldi Buttati</strong></td>
        <td><em>"Quanti soldi hai buttato quest'anno in fondotinta comprati al buio che a casa erano arancioni?"</em></td>
        <td>Rovescia 2 boccette di fondotinta sul banco con rumore secco.</td>
      </tr>
      <tr>
        <td><strong>L'Errore Quotidiano</strong></td>
        <td><em>"Se il correttore ti entra nelle rughette e ti invecchia di 10 anni, fermati: stai sbagliando questo passaggio."</em></td>
        <td>Indica la zona perioculare guardando dritta in camera.</td>
      </tr>
      <tr>
        <td><strong>Verità MUA (7€ vs 35€)</strong></td>
        <td><em>"Sono una truccatrice e in salone ho sia il mascara da 6€ sia quello da 30€. Oggi vi dico con sincerità quale comprare."</em></td>
        <td>Tieni i due mascara in mano, uno a destra e uno a sinistra.</td>
      </tr>
      <tr>
        <td><strong>La Trousse Piena</strong></td>
        <td><em>"Hai la pochette che scoppia di trucchi ma alla fine usi sempre le stesse 3 cose mezze scadute?"</em></td>
        <td>Apri una trousse piena e mostrala in favore di camera.</td>
      </tr>
      <tr>
        <td><strong>Local Montesanto 1</strong></td>
        <td><em>"Se scendi alla Cumana di Montesanto con 10 euro in tasca, devi assolutamente vedere questa chicca."</em></td>
        <td>Inquadra per 1 secondo l'esterno della vetrina poi entra decisa.</td>
      </tr>
      <tr>
        <td><strong>Local Montesanto 2</strong></td>
        <td><em>"A Napoli c'è un posto dove non ti fanno comprare un rossetto senza fartelo provare sotto la luce reale."</em></td>
        <td>Accendi lo specchio trucco con un tocco scenico.</td>
      </tr>
      <tr>
        <td><strong>La Matita Indistruttibile</strong></td>
        <td><em>"Questa matita labbra costa 7€ e resiste pure a una pizza margherita fritta. La proviamo insieme?"</em></td>
        <td>Traccia una linea netta sul dorso della mano e sfregala forte.</td>
      </tr>
      <tr>
        <td><strong>Sposa & Cerimonie</strong></td>
        <td><em>"Se hai una cerimonia e non vuoi che il trucco ti si sciolga dopo due ore di balli, guarda questo segreto."</em></td>
        <td>Vaporizza un fissante termale sul viso di una cliente o su una spugnetta.</td>
      </tr>
      <tr>
        <td><strong>Pelle Spenta / Stanchezza</strong></td>
        <td><em>"Dormi 5 ore a notte e sembri sempre stanca? Guarda cosa fa questo correttore idratante con un solo tocco."</em></td>
        <td>Applica un micro-punto di correttore illuminante picchiettando.</td>
      </tr>
      <tr>
        <td><strong>Armocromia Lampo</strong></td>
        <td><em>"Sottotono caldo o freddo? Se ti trucchi con il tono opposto, sembrerai sempre ingrigita. Ti faccio vedere."</em></td>
        <td>Accosta due drappi o due rossetti (uno corallo e uno malva freddo).</td>
      </tr>
    </tbody>
  </table>

  <!-- Box con margine controllato per non toccare il footer -->
  <div class="callout-box" style="margin-top: 2.5mm; padding: 2.5mm 3.5mm;">
    <strong style="font-size: 8pt; color: #5E1788;">Regola d'oro:</strong>
    <span style="font-size: 7.5pt; color: #33283E;">
      Non imparare a memoria come un robot. Leggi il gancio, memorizza il concetto chiave e dillo con la tua parlata naturale. A Napoli l'autenticità vince su qualsiasi copione perfetto.
    </span>
  </div>

  <div class="page-footer">
    <div class="studio-tag">Creativia Studio per Scelta Makeup</div>
    <div class="page-number">Pagina 04</div>
  </div>
</div>

<!-- ==============================================================
     PAGE 5: I 3 FORMAT VIDEO PER FARE CASSA
     ============================================================== -->
<div class="page">
  <div class="page-header">
    <div class="brand-label">Scelta Makeup • Via dei Pellegrini, Napoli</div>
    <div class="doc-tag">04. I 3 Format Chiave</div>
  </div>

  <h2 class="section-title">I 3 Format Video per Fare Cassa</h2>
  <div class="section-subtitle">Tre formule semplici, da girare in 15 minuti ciascuna tra una cliente e l'altra.</div>

  <!-- Format 1 -->
  <div class="card" style="margin-bottom: 3.5mm; border-left: 3.5px solid #5E1788;">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5mm;">
      <strong style="color: #5E1788; font-size: 9.5pt;">FORMAT 1: L'Autopsia della Trousse & L'Errore del Fondotinta</strong>
      <span class="badge badge-purple">Durata: 35-45 sec</span>
    </div>
    <p style="font-size: 8pt; margin-bottom: 1.5mm; color: #332B3A;">
      <strong>Obiettivo:</strong> Toccare il tasto del portafoglio e posizionarti come l'esperta che salva dagli acquisti sbagliati.
    </p>
    <div style="background: #FAF6FD; padding: 2.5mm 3.5mm; border-radius: 4px; font-size: 8pt; line-height: 1.45;">
      <strong>• Scena 1 (0-4s):</strong> Trousse svuotata sul banco: <em>"Basta spendere soldi in fondotinta comprati al buio che ti fanno sembrare un fantasma."</em><br>
      <strong>• Scena 2 (5-25s):</strong> Fai 2 strisce sulla mascella: una sbagliata (grigia o arancio) e una perfetta (RVB LAB o Eveline). Mostra come la tonalità corretta sparisce fondendosi perfettamente con la pelle sotto le luci a 5500K.<br>
      <strong>• Scena 3 (26-40s):</strong> Spiega: <em>"Nei grandi magazzini compri sotto luci gialle e torni a casa insoddisfatta. Da noi ti siedi e troviamo la tua shade esatta."</em> + Chiusura con CTA.
    </div>
  </div>

  <!-- Format 2 -->
  <div class="card" style="margin-bottom: 3.5mm; border-left: 3.5px solid #C6A86B;">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5mm;">
      <strong style="color: #8A6A1E; font-size: 9.5pt;">FORMAT 2: Sfida Metà Viso: 7€ vs 35€ (La Verità Sincera)</strong>
      <span class="badge badge-gold">Durata: 40-50 sec</span>
    </div>
    <p style="font-size: 8pt; margin-bottom: 1.5mm; color: #332B3A;">
      <strong>Obiettivo:</strong> Creare una fiducia cieca. Se ammetti apertamente che un prodotto da 6€ è ottimo, quando consigli quello da 35€ ti crederanno ciecamente.
    </p>
    <div style="background: #FCF9F2; padding: 2.5mm 3.5mm; border-radius: 4px; font-size: 8pt; line-height: 1.45;">
      <strong>• Scena 1 (0-4s):</strong> Mostra il mascara Eveline da 6€ a sinistra e Diego dalla Palma da 24€ a destra: <em>"Quale vale davvero i vostri soldi?"</em><br>
      <strong>• Scena 2 (5-30s):</strong> Applica quello da 6€ sull'occhio sinistro e quello da 24€ sul destro. Commenta con obiettività: <em>"Per l'università o tutti i giorni, Eveline è pazzesco e costa 6€. Ma se hai una cerimonia di 12 ore e lacrime, Diego dalla Palma non sbava nemmeno con 40 gradi."</em><br>
      <strong>• Scena 3 (31-45s):</strong> <em>"Li ho entrambi disponibili al banco. Passa a provarli o scrivimi su WhatsApp."</em>
    </div>
  </div>

  <!-- Format 3 -->
  <div class="card" style="border-left: 3.5px solid #D462A6;">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5mm;">
      <strong style="color: #9E2B72; font-size: 9.5pt;">FORMAT 3: La Combo Weekend Sotto i 15€ (Pronta al Banco)</strong>
      <span class="badge badge-purple">Durata: 25-30 sec</span>
    </div>
    <p style="font-size: 8pt; margin-bottom: 1.5mm; color: #332B3A;">
      <strong>Obiettivo:</strong> Vendita d'impulso a cassa immediata per chi cammina a Montesanto il giovedì o venerdì pomeriggio.
    </p>
    <div style="background: #FAF6FD; padding: 2.5mm 3.5mm; border-radius: 4px; font-size: 8pt; line-height: 1.45;">
      <strong>• Scena 1 (0-3s):</strong> Mostra le tue labbra con una combo pazzesca (Matita + Rossetto Cipria o Miyo): <em>"Combo labbra autunno da urlo a meno di 15 euro in totale!"</em><br>
      <strong>• Scena 2 (4-18s):</strong> Applicazione rapida: contorno labbra + rossetto al centro + bacio sul dorso della mano: <em>"Guardate, no-transfer totale!"</em><br>
      <strong>• Scena 3 (19-30s):</strong> <em>"Ne ho confezionate solo 10 pronte al banco a Via dei Pellegrini 28. Scrivimi su WhatsApp al link in bio con la parola COMBO e te la metto da parte prima che finiscano!"</em>
    </div>
  </div>

  <div class="page-footer">
    <div class="studio-tag">Creativia Studio per Scelta Makeup</div>
    <div class="page-number">Pagina 05</div>
  </div>
</div>

<!-- ==============================================================
     PAGE 6: L'OFFERTA CAVALLO DI TROIA
     ============================================================== -->
<div class="page">
  <div class="page-header">
    <div class="brand-label">Scelta Makeup • Via dei Pellegrini, Napoli</div>
    <div class="doc-tag">05. Il Cavallo di Troia</div>
  </div>

  <h2 class="section-title">L'Offerta "Cavallo di Troia"</h2>
  <div class="section-subtitle">Come attirare persone in negozio subito e farsi pagare l'affitto.</div>

  <p style="font-size: 8.5pt;">
    Per pagare l'affitto non puoi aspettare le spose da 120€ che capitano due volte al mese. Ti serve un'offerta d'urto ad <strong>altissimo valore percepito ma con barriera psicologica pari a zero</strong>.
  </p>

  <div class="callout-box" style="border: 1.5px solid #5E1788; background: #FAF5FE; padding: 4mm;">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2mm;">
      <h3 style="color: #5E1788; font-size: 12pt;">"SOS Fondotinta & Correttore" (Luce Reale 5500K)</h3>
      <span class="badge badge-gold" style="font-size: 8pt;">10€ • 100% RIMBORSABILI</span>
    </div>
    <p style="font-size: 8.5pt; color: #2E2836; margin-bottom: 2mm;">
      <strong>La Formula:</strong> La cliente viene in Salone per 15 minuti di consulenza rapida sulla postazione professionale. Federica le trova il sottotono esatto, corregge le discromie e le applica la shade perfetta. <strong>I 10€ della seduta vengono scalati al 100% dal conto se acquista qualsiasi prodotto in negozio</strong> (anche un mascara da 7€ + una matita da 7€).
    </p>
    <div style="font-size: 8pt; color: #6C587D; font-style: italic;">
      Perché funziona a Napoli: Elimina la paura della fregatura. La cliente pensa: "Male che va mi prendo due trucchi che già mi servivano e la consulenza della truccatrice me la sono fatta gratis!"
    </div>
  </div>

  <h3 style="font-size: 10.5pt; color: #5E1788; margin: 3.5mm 0 2mm 0;">La Scala di Upsell al Banco (Cosa succede durante i 15 minuti):</h3>

  <div class="grid-3">
    <div class="card" style="border-top: 3px solid #7A3293;">
      <strong style="color: #7A3293; font-size: 8.5pt; display: block; margin-bottom: 1.5mm;">Livello 1: Cassa Rapida</strong>
      <div style="font-size: 8pt; color: #8A6A1E; font-weight: 700; margin-bottom: 1.5mm;">Scontrino: 15€ - 22€</div>
      <p style="font-size: 7.5pt; color: #4A3E54; margin: 0; line-height: 1.4;">
        Entra per il test da 10€ ed esce con una matita labbra Cipria + un mascara Eveline. Incasso veloce, margine pulito e cliente soddisfatta che parlerà di te alle amiche.
      </p>
    </div>

    <div class="card" style="border-top: 3px solid #5E1788;">
      <strong style="color: #5E1788; font-size: 8.5pt; display: block; margin-bottom: 1.5mm;">Livello 2: Dermo-Cosmesi</strong>
      <div style="font-size: 8pt; color: #8A6A1E; font-weight: 700; margin-bottom: 1.5mm;">Scontrino: 35€ - 55€</div>
      <p style="font-size: 7.5pt; color: #4A3E54; margin: 0; line-height: 1.4;">
        Se ha pelli mature o occhiaie segnate, provi RVB LAB o Diego dalla Palma. Quando si guarda allo specchio illuminato e vede il viso radioso, compra il prodotto da 35€ senza esitare.
      </p>
    </div>

    <div class="card" style="border-top: 3px solid #C6A86B;">
      <strong style="color: #8A6A1E; font-size: 8.5pt; display: block; margin-bottom: 1.5mm;">Livello 3: Servizio Sartoriale</strong>
      <div style="font-size: 8pt; color: #8A6A1E; font-weight: 700; margin-bottom: 1.5mm;">Scontrino: 58€ - 65€</div>
      <p style="font-size: 7.5pt; color: #4A3E54; margin: 0; line-height: 1.4;">
        La vedi indecisa? Le dici: <em>"Portami la tua trousse da casa: facciamo la lezione individuale di Self Make-Up e impariamo a valorizzarti ogni giorno"</em>. Venduto!
      </p>
    </div>
  </div>

  <div class="callout-gold" style="margin-top: 3.5mm;">
    <strong style="font-size: 8.5pt;">I Conti della Serva (Come pagare l'affitto):</strong><br>
    <span style="font-size: 8pt; color: #33283E;">
      Se fai entrare <strong>solo 3 persone al giorno</strong> con questa formula e ognuna spende una media di 25-30€ tra prodotti e servizi, generi <strong>tra i 75€ e i 90€ al giorno di cassa pulita</strong>. In 20 giorni lavorativi hai coperto l'affitto del locale senza spendere un solo centesimo in pubblicità.
    </span>
  </div>

  <div class="page-footer">
    <div class="studio-tag">Creativia Studio per Scelta Makeup</div>
    <div class="page-number">Pagina 06</div>
  </div>
</div>

<!-- ==============================================================
     PAGE 7: DOPPIA CHIUSURA & CALENDARIO SETTIMANALE
     ============================================================== -->
<div class="page">
  <div class="page-header">
    <div class="brand-label">Scelta Makeup • Via dei Pellegrini, Napoli</div>
    <div class="doc-tag">06. Conversione & Calendario</div>
  </div>

  <h2 class="section-title">La Chiusura dei Video & Il Calendario</h2>
  <div class="section-subtitle">Come convertire le visualizzazioni in vendite al banco.</div>

  <p style="font-size: 8.5pt;">
    Mai chiudere i video con <em>"Seguimi per altri consigli"</em> o <em>"Lascia un like"</em>. Sono frasi morte. Negli ultimi 5 secondi di OGNI video devi usare la <strong>Doppia Chiusura a Bivio (Strada Fisica + WhatsApp Concierge)</strong>:
  </p>

  <div class="callout-box" style="border-left: 4px solid #5E1788; padding: 3.5mm 4.5mm;">
    <strong style="color: #5E1788; font-size: 9pt; display: block; margin-bottom: 1mm;">
      🗣️ La frase esatta da recitare a voce alla fine del video:
    </strong>
    <p style="font-size: 8.5pt; font-style: italic; color: #2B1D38; margin: 0;">
      "Io sono Federica di Scelta Makeup: mi trovi a Napoli in <strong>Via dei Pellegrini 28/29, a due minuti a piedi dalla Cumana di Montesanto</strong>. Se sei in zona passa a provarlo dal vivo, oppure <strong>clicca sul link WhatsApp nel mio profilo e scrivimi la parola [COMBO / FONDOTINTA]</strong>: te lo metto da parte io prima che finisca!"
    </p>
  </div>

  <h3 style="font-size: 10.5pt; color: #5E1788; margin: 3.5mm 0 2mm 0;">Il Calendario Settimanale (Solo 1 Ora a Settimana)</h3>

  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 15%;">Giorno</th>
        <th style="width: 25%;">Cosa Fare</th>
        <th style="width: 45%;">Dettaglio Operativo</th>
        <th style="width: 15%;">Tempo</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Lunedì</strong></td>
        <td><strong>Video 1 (Reel & TikTok)</strong></td>
        <td>Sfida 7€ vs 35€ (Mascara o Matita). Registra e pubblica.</td>
        <td>15 min</td>
      </tr>
      <tr>
        <td><strong>Martedì</strong></td>
        <td>Storie Instagram</td>
        <td>2 Storie veloci: swatch rossetto alla luce della vetrina con buongiorno.</td>
        <td>2 min</td>
      </tr>
      <tr>
        <td><strong>Mercoledì</strong></td>
        <td><strong>Video 2 (Reel & TikTok)</strong></td>
        <td>Autopsia Trousse + Invito al test Fondotinta 10€ rimborsabili.</td>
        <td>15 min</td>
      </tr>
      <tr>
        <td><strong>Giovedì</strong></td>
        <td>Storie Instagram</td>
        <td>Inquadra la postazione trucco pulita prima dell'arrivo di una cliente.</td>
        <td>2 min</td>
      </tr>
      <tr>
        <td><strong>Venerdì</strong></td>
        <td><strong>Video 3 (Reel & TikTok)</strong></td>
        <td>Combo Weekend sotto i 15€ ("Ne ho solo 10 pronte al banco!").</td>
        <td>15 min</td>
      </tr>
      <tr>
        <td><strong>Sabato</strong></td>
        <td>Storie Live Salone</td>
        <td>Mostra il movimento del sabato a Montesanto e invita al passaggio rapido.</td>
        <td>3 min</td>
      </tr>
      <tr>
        <td><strong>Domenica</strong></td>
        <td><strong style="color:#C0392B;">Riposo Totale</strong></td>
        <td>Stacca il telefono. I social non devono divorarti la serenità.</td>
        <td>0 min</td>
      </tr>
    </tbody>
  </table>

  <div class="callout-gold" style="margin-top: 3mm;">
    <strong style="font-size: 8pt;">Il trucco di WhatsApp:</strong>
    <span style="font-size: 7.5pt; color: #33283E;">
      Quando una ragazza ti scrive al link, mandale un <strong>vocale caldo di 10 secondi</strong>: <em>"Ciao cara, sono Federica! Certo, te l'ho messo da parte al banco! A che ora riesci a passare oggi o domani?"</em>. Il vocale a Napoli crea una connessione immediata: chi si fa mettere da parte un trucco su WhatsApp passa a ritirarlo nel 90% dei casi.
    </span>
  </div>

  <div class="page-footer">
    <div class="studio-tag">Creativia Studio per Scelta Makeup</div>
    <div class="page-number">Pagina 07</div>
  </div>
</div>

<!-- ==============================================================
     PAGE 8: LETTERA FINALE DI MARIO & CHECKLIST
     ============================================================== -->
<div class="page">
  <div class="page-header">
    <div class="brand-label">Scelta Makeup • Via dei Pellegrini, Napoli</div>
    <div class="doc-tag">07. Azione Immediata</div>
  </div>

  <h2 class="section-title">La Palla Adesso Passa a Te</h2>
  <div class="section-subtitle">Nessuno può metterci la faccia al posto tuo. Si parte da domani mattina.</div>

  <p style="font-size: 9pt; margin-bottom: 3.5mm;">
    <strong>Nessuno può metterci la faccia al posto tuo, con assenza di budget.</strong> Si potrebbe fare con l'AI, ma ci sono due inconvenienti: <strong>1 ha un costo</strong>, <strong>2 non può fare video veri come li faresti tu</strong>.
  </p>

  <p style="font-size: 8.5pt;">
    Non serve che aspetti il giorno perfetto o che ti senta "pronta al 100%". Nessuno è pronto all'inizio. Se ti vergogni davanti al telefono, fregatene: le prime due volte ti sembrerà strano, alla terza ci avrai preso la mano e alla decima sarà naturale come respirare.
  </p>

  <!-- Box Evidente: Altre strade non ce ne sono -->
  <div class="callout-gold" style="border-left: 4px solid #C6A86B; background: #FCF9F2; padding: 4mm 5mm; margin: 3.5mm 0;">
    <strong style="color: #8A6A1E; font-size: 10pt; display: block; text-transform: uppercase; letter-spacing: 0.5px;">
      ⚡ Altre strade efficaci come questa a costo zero, non ce ne sono.
    </strong>
  </div>

  <div class="card" style="background: #FAF5FE; border: 1.5px solid #5E1788; padding: 3.5mm 4.5mm; margin: 3.5mm 0;">
    <strong style="color: #5E1788; font-size: 9pt; display: block; margin-bottom: 1.5mm;">
      📋 La Tua Checklist per Domani Mattina:
    </strong>
    <div style="font-size: 8pt; color: #2B1D38; line-height: 1.55;">
      <strong>1.</strong> Arriva in negozio 20 minuti prima dell'apertura.<br>
      <strong>2.</strong> Pulisci la lente della fotocamera con la maglietta.<br>
      <strong>3.</strong> Siediti davanti allo specchio acceso a 5500K e prendi in mano i due mascara (Eveline e Diego dalla Palma).<br>
      <strong>4.</strong> Registra il Video della Sfida (Format 2) in 40 secondi, senza filtri e con il tuo sorriso schietto.<br>
      <strong>5.</strong> Pubblicalo come Reel su Instagram e su TikTok con geolocalizzazione su "Montesanto, Napoli".
    </div>
  </div>

  <p style="margin-top: 3.5mm; font-size: 8.5pt;">
    Fallo con costanza per tre settimane. Non fermarti dopo due giorni se non vedi subito la fila. I social premiano chi insiste e chi dimostra valore autentico sul territorio.
  </p>

  <p style="font-size: 8.5pt;">
    Noi ci siamo e continueremo a supportarti sulla tecnologia, <strong>ma la benzina per far camminare questo motore, solo tu puoi metterla.</strong>
  </p>

  <div style="margin-top: 5mm; display: flex; justify-content: space-between; align-items: flex-end;">
    <div>
      <div style="font-family: 'Playfair Display', serif; font-size: 15pt; color: #5E1788; font-style: italic; margin-bottom: 1mm;">Mario</div>
      <div style="font-size: 8.5pt; font-weight: 700; color: #2B1D38;">Creativia Studio</div>
      <div style="font-size: 7.5pt; color: #7A698B;">Email: sviluppo@creativiastudio.com • Web: www.creativiastudio.com</div>
    </div>

    ${salonOverviewB64 ? `
    <div style="width: 140px; height: 85px; border-radius: 4px; overflow: hidden; border: 1px solid #EADCF5;">
      <img src="${salonOverviewB64}" style="width: 100%; height: 100%; object-fit: cover;" alt="Salone Scelta Makeup" />
    </div>` : ''}
  </div>

  <div class="page-footer">
    <div class="studio-tag">Creativia Studio per Scelta Makeup</div>
    <div class="page-number">Pagina 08</div>
  </div>
</div>

</body>
</html>
`;

// Write HTML
const htmlPath = path.join(workspaceDir, 'scratch', 'strategia_federica.html');
if (!fs.existsSync(path.join(workspaceDir, 'scratch'))) {
  fs.mkdirSync(path.join(workspaceDir, 'scratch'), { recursive: true });
}
fs.writeFileSync(htmlPath, htmlContent, 'utf8');
console.log('HTML scritto con successo:', htmlPath);

// Generate PDF with Edge
const outPdfWorkspace = path.join(workspaceDir, 'Strategia_Social_FaiDaTe_Federica_Mario.pdf');
const outPdfArtifact = path.join(artifactDir, 'Strategia_Social_FaiDaTe_Federica_Mario.pdf');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const command = `"${edgePath}" --headless --disable-gpu --no-pdf-header-footer --print-to-pdf="${outPdfWorkspace}" "file:///${htmlPath.replace(/\\/g, '/')}"`;

console.log('Esecuzione rendering PDF con Edge...');
execSync(command);

if (fs.existsSync(outPdfWorkspace)) {
  const stat = fs.statSync(outPdfWorkspace);
  console.log('PDF generato in workspace:', outPdfWorkspace, `(${(stat.size / 1024).toFixed(1)} KB)`);
  
  // Copy to artifact directory
  fs.copyFileSync(outPdfWorkspace, outPdfArtifact);
  console.log('PDF copiato negli artifacts:', outPdfArtifact);
} else {
  console.error('Errore: PDF non trovato dopo l\'esecuzione.');
  process.exit(1);
}
