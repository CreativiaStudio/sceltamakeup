/**
 * Scelta Makeup — Sdoppiamento chirurgico delle 17 schede "Categoria B" in 43 schede autonome.
 *
 * Fonti di verità:
 *   - `data/catalog.json`                    → dati autorevoli (EAN, SKU, price, wholesale, stock).
 *   - `scratch/grouped_variants_audit_report.json` → mappa dello split (17 genitori → 43 gruppi).
 *
 * Vincoli NON negoziabili (direttiva Mario):
 *   1. I prezzi NON vengono toccati: ogni variante eredita il proprio `price` e
 *      `originalWholesalePrice` ESATTI dal catalogo reale (anche quando differiscono
 *      tra varianti dello stesso genitore).
 *   2. Le giacenze vengono preservate: totale stock PRIMA == totale stock DOPO == 3.096.
 *   3. Le immagini: si usa l'immagine specifica della variante se esiste ed è coerente,
 *      altrimenti il packshot di brand `/products/${brandSlug}-packshot.jpg`.
 *
 * Uso: node scripts/split_category_b_products.js
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const CATALOG_PATH = path.join(ROOT, "data", "catalog.json");
const REPORT_PATH = path.join(ROOT, "scratch", "grouped_variants_audit_report.json");
const BASELINE_PATH = path.join(ROOT, "scratch", "prezzi_baseline_riferimento.json");

const EXPECTED_STOCK_TOTAL = 3096;
const EXPECTED_PARENTS = 17;
const EXPECTED_CARDS = 43;

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function slugify(input) {
  return String(input)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // rimuove accenti
    .replace(/[^a-z0-9]+/g, "-") // ogni blocco non-alfanumerico → trattino
    .replace(/^-+|-+$/g, ""); // niente trattini iniziali/finali
}

function cleanTitle(name) {
  // Corregge l'unico refuso presente nei cardName del report.
  return String(name).replace(/\bStrech\b/g, "Stretch");
}

// Mapping brand → slug del packshot generico (i 4 file sono già in public/products/).
const BRAND_PACKSHOT_SLUG = {
  "Eveline Cosmetics": "eveline-cosmetics",
  "Pierre René": "pierre-rene",
  "Cipria Make Up": "cipria-milano",
  Miyo: "miyo",
};

function brandPackshot(brand) {
  const slug = BRAND_PACKSHOT_SLUG[brand] || slugify(brand);
  return `/products/${slug}-packshot.jpg`;
}

const GENERIC_INCI =
  "Formula cosmetica testata dermatologicamente secondo standard europei di purezza e sicurezza. Prodotto cruelty-free.";

// ---------------------------------------------------------------------------
// Contenuti editoriali MUA per ciascuna delle 43 nuove schede (chiave = cardName
// esatto del report, così il lookup è deterministico e a prova di refuso).
// ---------------------------------------------------------------------------

const CONTENT = {
  "Eveline Cosmetics 6 Ceramidi Latte Detergente 150 ml": {
    shortDescription: "Latte detergente delicato ai 6 ceramidi per viso e occhi.",
    description:
      "Latte detergente dalla texture cremosa e confortevole, arricchito con un complesso di 6 ceramidi che deterge viso e occhi rispettando il film idrolipidico. Scioglie anche il make-up più tenace e le impurità accumulate durante il giorno, lasciando la pelle morbida, idratata e mai tirante. Perfetto per la routine serale delle pelli secche e sensibili.",
    formulaBenefits:
      "Formula ai 6 ceramidi che deterge senza aggredire, preservando idratazione e comfort della barriera cutanea.",
    howToUse:
      "Applicare su viso asciutto e massaggiare con movimenti circolari, quindi rimuovere con un dischetto di cotone o risciacquare con acqua tiepida. Usare mattina e sera.",
    features: ["Deterge e strucca in un solo gesto", "Texture cremosa confortevole", "Adatto a pelli secche e sensibili", "Complesso ai 6 ceramidi"],
  },
  "Eveline Cosmetics 6 Ceramidi Gel Struccante 150 ml": {
    shortDescription: "Gel struccante rinfrescante ai 6 ceramidi dalla texture in gel.",
    description:
      "Gel struccante dalla texture leggera e rinfrescante che si trasforma in una morbida schiuma, eliminando trucco e impurità in profondità. Il complesso di 6 ceramidi aiuta a mantenere la pelle purificata, idratata e riequilibrata, senza sensazione di secchezza. Ideale per pelli miste e grasse che cercano una detersione profonda ma delicata.",
    formulaBenefits:
      "Purifica a fondo e riequilibra senza seccare, grazie al complesso ai 6 ceramidi che sostiene l'idratazione naturale.",
    howToUse:
      "Emulsionare una piccola quantità di gel con acqua e massaggiare su viso umido, poi risciacquare abbondantemente. Usare mattina e sera.",
    features: ["Texture rinfrescante in gel", "Purifica e riequilibra", "Ideale per pelli miste e grasse", "Complesso ai 6 ceramidi"],
  },

  "Eveline Cosmetics Ampoule Cream Collagen Lifting 50 ml": {
    shortDescription: "Crema viso concentrata al collagene con effetto lifting.",
    description:
      "Crema viso dalla texture ricca e avvolgente, formulata con collagene per un immediato effetto lifting e rassodante. Leviga i segni del tempo, migliora elasticità e compattezza della pelle e dona un incarnato più disteso e luminoso. Trattamento concentrato in formato ampolla, ideale come rituale anti-age quotidiano.",
    formulaBenefits:
      "Collagene ad alta concentrazione per un effetto tensore immediato e un'azione rimpolpante nel tempo.",
    howToUse:
      "Applicare mattina e/o sera su viso e collo perfettamente detersi, massaggiando dal centro verso l'esterno fino a completo assorbimento.",
    features: ["Effetto lifting immediato", "Texture ricca e avvolgente", "Migliora elasticità e compattezza", "Formato ampolla concentrato"],
  },
  "Eveline Cosmetics Ampoule Cream Hyaluron Moisturizing 50 ml": {
    shortDescription: "Crema viso concentrata all'acido ialuronico ultra-idratante.",
    description:
      "Crema viso dalla texture fluida e setosa, arricchita con acido ialuronico che trattiene l'idratazione e rimpolpa la pelle dall'interno. Lascia l'incarnato morbido, levigato e visibilmente più luminoso, attenuando i segni di disidratazione e le linee sottili. Perfetta per donare comfort immediato a pelli secche o stressate.",
    formulaBenefits:
      "Acido ialuronico a rapido assorbimento per un'idratazione profonda e un effetto rimpolpante duraturo.",
    howToUse:
      "Applicare mattina e/o sera su viso e collo detersi, massaggiando fino a completo assorbimento. Ideale come base prima del make-up.",
    features: ["Idratazione profonda e immediata", "Effetto rimpolpante", "Texture fluida a rapido assorbimento", "Attenua i segni di disidratazione"],
  },
  "Eveline Cosmetics Ampoule Cream Niacinamide Imperfezioni 50 ml": {
    shortDescription: "Crema viso alla niacinamide per pelli con imperfezioni.",
    description:
      "Crema viso concentrata alla niacinamide, studiata per pelli con imperfezioni, pori dilatati e discromie. Aiuta a riequilibrare la produzione di sebo, uniformare l'incarnato e ridurre visibilmente le imperfezioni, mantenendo la pelle idratata e confortevole. La texture leggera si assorbe rapidamente senza ungere.",
    formulaBenefits:
      "Niacinamide che minimizza pori e imperfezioni, uniforma il tono e rinforza la barriera cutanea.",
    howToUse:
      "Applicare mattina e/o sera su viso deterso, insistendo sulle zone con imperfezioni, e massaggiare fino a completo assorbimento.",
    features: ["Riduce pori e imperfezioni", "Uniforma l'incarnato", "Riequilibra il sebo", "Texture leggera non grassa"],
  },
  "Eveline Cosmetics Ampoule Cream Retinol Skin Night 50 ml": {
    shortDescription: "Crema notte al retinolo per un'azione anti-age rigenerante.",
    description:
      "Crema notte concentrata al retinolo, studiata per agire durante il riposo notturno e favorire il rinnovamento cellulare. Aiuta a levigare la grana della pelle, ridurre rughe e segni d'espressione e uniformare il tono, per un risveglio con un incarnato più compatto e luminoso. Texture nutriente ma a rapido assorbimento.",
    formulaBenefits:
      "Retinolo che stimola il rinnovamento notturno, levigando rughe e irregolarità per un aspetto più fresco e uniforme.",
    howToUse:
      "Applicare la sera su viso e collo detersi, evitando il contorno occhi. Usare la protezione solare di giorno.",
    features: ["Azione rigenerante notturna", "Leviga rughe e grana", "Uniforma il tono", "A base di retinolo"],
  },
  "Eveline Cosmetics Ampoule Cream Peptides Wrinkle 50 ml": {
    shortDescription: "Crema viso ai peptidi anti-rughe per pelli mature.",
    description:
      "Crema viso concentrata ai peptidi, progettata per contrastare rughe e perdita di tonicità. I peptidi supportano la sintesi di collagene, migliorando elasticità e compattezza e donando un aspetto più giovane e riposato. La texture ricca nutre in profondità senza appesantire, ideale per pelli mature.",
    formulaBenefits:
      "Peptidi che stimolano il collagene, riducono la profondità delle rughe e restituiscono tonicità alla pelle.",
    howToUse:
      "Applicare mattina e/o sera su viso e collo detersi, massaggiando dal basso verso l'alto fino a completo assorbimento.",
    features: ["Azione anti-rughe mirata", "Stimola il collagene", "Migliora tonicità ed elasticità", "Texture ricca e nutriente"],
  },

  "Eveline Cosmetics Body Shot Balsamo-Siero Hyaluronic 200 ml": {
    shortDescription: "Balsamo-siero corpo all'acido ialuronico, idratazione intensa.",
    description:
      "Balsamo-siero corpo dalla texture leggera e fondente, arricchito con acido ialuronico per un'idratazione intensa e prolungata. Nutre la pelle in profondità, migliorandone elasticità e morbidezza e lasciando una sensazione di comfort immediato. Si assorbe rapidamente senza ungere, perfetto per l'uso quotidiano.",
    formulaBenefits:
      "Acido ialuronico che idrata in profondità e restituisce elasticità e morbidezza alla pelle del corpo.",
    howToUse:
      "Applicare su tutto il corpo con movimenti circolari, insistendo sulle zone più secche, fino a completo assorbimento.",
    features: ["Idratazione intensa e prolungata", "Texture fondente a rapido assorbimento", "Migliora elasticità e morbidezza", "Uso quotidiano"],
  },
  "Eveline Cosmetics Body Shot Balsamo-Siero Regenerating 200 ml": {
    shortDescription: "Balsamo-siero corpo rigenerante per pelle secca e stressata.",
    description:
      "Balsamo-siero corpo rigenerante, formulato per nutrire e riparare la pelle secca, ruvida o stressata. La texture ricca avvolge il corpo in un velo di comfort, favorendo il rinnovamento cutaneo e restituendo una pelle visibilmente più liscia, elastica e vellutata. Ideale dopo la doccia o l'esposizione ambientale.",
    formulaBenefits:
      "Azione rigenerante che ripara e leviga la pelle secca, restituendo elasticità e un comfort duraturo.",
    howToUse:
      "Applicare su tutto il corpo dopo la doccia, massaggiando con movimenti circolari fino a completo assorbimento.",
    features: ["Ripara la pelle secca e stressata", "Leviga e nutre in profondità", "Restituisce elasticità", "Texture ricca e confortevole"],
  },

  "Eveline Cosmetics Clean Shot Tonico Idratante 150 ml": {
    shortDescription: "Tonico viso idratante che riequilibra e rinfresca la pelle.",
    description:
      "Tonico viso idratante dalla formula delicata che completa la detersione, rimuovendo gli ultimi residui e riequilibrando il pH cutaneo. Lascia la pelle fresca, morbida e preparata a ricevere i trattamenti successivi, donando un'immediata sensazione di comfort. Adatto a tutti i tipi di pelle, anche le più sensibili.",
    formulaBenefits:
      "Idrata e riequilibra la pelle, perfezionando la detersione e preparando l'incarnato ai trattamenti successivi.",
    howToUse:
      "Applicare su un dischetto di cotone e passare su viso e collo detersi, mattina e sera, senza risciacquare.",
    features: ["Completa la detersione", "Riequilibra il pH", "Azione idratante e rinfrescante", "Adatto a pelli sensibili"],
  },
  "Eveline Cosmetics Clean Shot Tonico Rigenerante 200 ml": {
    shortDescription: "Tonico viso rigenerante per pelle opaca e stanca.",
    description:
      "Tonico viso rigenerante pensato per ravvivare la pelle opaca e stanca, favorendo il rinnovamento cutaneo e uniformando l'incarnato. La formula rinfrescante tonifica e leviga, restituendo luminosità e preparando la pelle al make-up o al siero. Perfetto come gesto di risveglio nella routine mattutina.",
    formulaBenefits:
      "Tonifica e rigenera la pelle opaca, ravvivando l'incarnato e favorendo un aspetto più luminoso e uniforme.",
    howToUse:
      "Applicare su un dischetto di cotone e passare su viso e collo detersi, mattina e sera, senza risciacquare.",
    features: ["Ravviva la pelle opaca", "Azione rigenerante e tonificante", "Uniforma l'incarnato", "Prepara la pelle ai trattamenti"],
  },

  "Eveline Cosmetics Face Therapy Maschera Collagen 8 ml": {
    shortDescription: "Maschera viso monodose al collagene, effetto rimpolpante.",
    description:
      "Maschera viso in ampolla monodose al collagene, un trattamento d'urto concentrato per un effetto rimpolpante immediato. Leviga la grana della pelle, distende i lineamenti e dona un incarnato più compatto e luminoso in pochi minuti. Formato monodose igienico e pratico, perfetto anche in viaggio.",
    formulaBenefits:
      "Collagene concentrato per un effetto rimpolpante immediato e un incarnato più compatto e levigato.",
    howToUse:
      "Applicare uno strato uniforme su viso deterso, lasciare agire 10-15 minuti e risciacquare. Usare 1-2 volte a settimana.",
    features: ["Trattamento d'urto rimpolpante", "Formato monodose igienico", "Leviga e distende i lineamenti", "Effetto luminosità immediato"],
  },
  "Eveline Cosmetics Face Therapy Maschera Ceramidi 8 ml": {
    shortDescription: "Maschera viso monodose alle ceramidi, comfort e nutrimento.",
    description:
      "Maschera viso in ampolla monodose alle ceramidi, studiata per rinforzare la barriera cutanea e lenire la pelle secca e sensibile. Nutre in profondità, restituisce comfort ed elasticità e riduce la sensazione di tensione. Il formato monodose garantisce freschezza e la massima concentrazione di attivi.",
    formulaBenefits:
      "Ceramidi che rinforzano la barriera cutanea, leniscono e nutrono la pelle secca e sensibile in profondità.",
    howToUse:
      "Applicare uno strato uniforme su viso deterso, lasciare agire 10-15 minuti e risciacquare. Usare 1-2 volte a settimana.",
    features: ["Rinforza la barriera cutanea", "Azione lenitiva e nutriente", "Ideale per pelli secche e sensibili", "Formato monodose"],
  },
  "Eveline Cosmetics Face Therapy Maschera Niacinamide 8 ml": {
    shortDescription: "Maschera viso monodose alla niacinamide, purifica e uniforma.",
    description:
      "Maschera viso in ampolla monodose alla niacinamide, pensata per pelli con pori dilatati, imperfezioni e discromie. Purifica e riequilibra l'incarnato, minimizzando l'aspetto dei pori e lasciando la pelle uniforme, opacizzata e luminosa. Un boost concentrato per una pelle visibilmente più levigata.",
    formulaBenefits:
      "Niacinamide che purifica, minimizza i pori e uniforma il tono, per una pelle più levigata e luminosa.",
    howToUse:
      "Applicare uno strato uniforme su viso deterso, lasciare agire 10-15 minuti e risciacquare. Usare 1-2 volte a settimana.",
    features: ["Purifica e riequilibra", "Minimizza i pori", "Uniforma l'incarnato", "Azione opacizzante"],
  },
  "Eveline Cosmetics Face Therapy Maschera Retinol 8 ml": {
    shortDescription: "Maschera viso monodose al retinolo, rinnovamento intensivo.",
    description:
      "Maschera viso in ampolla monodose al retinolo, un trattamento intensivo che stimola il rinnovamento cellulare e leviga visibilmente la grana della pelle. Riduce l'aspetto di rughe e irregolarità, restituendo un incarnato più compatto, uniforme e radioso. Trattamento d'urto perfetto prima di un evento speciale.",
    formulaBenefits:
      "Retinolo che accelera il rinnovamento cutaneo, levigando rughe e irregolarità per un incarnato più uniforme e luminoso.",
    howToUse:
      "Applicare uno strato uniforme su viso deterso la sera, lasciare agire 10-15 minuti e risciacquare. Usare la protezione solare di giorno.",
    features: ["Rinnovamento cellulare intensivo", "Leviga rughe e irregolarità", "Incarnato più uniforme", "Boost pre-evento"],
  },

  "Eveline Cosmetics Korean Rituals Crema Ceramides+ 50 ml": {
    shortDescription: "Crema viso ai ceramidi ispirata alla skincare coreana.",
    description:
      "Crema viso ai ceramidi ispirata ai rituali di bellezza coreani, formulata per rinforzare la barriera cutanea e trattenere l'idratazione. La texture setosa nutre e lenisce la pelle, restituendo comfort, elasticità e un incarnato morbido e luminoso. Ideale per pelli secche, sensibili o stressate da agenti esterni.",
    formulaBenefits:
      "Ceramidi che rinforzano la barriera cutanea e sigillano l'idratazione, per una pelle morbida, elastica e protetta.",
    howToUse:
      "Applicare mattina e/o sera su viso e collo detersi, massaggiando delicatamente fino a completo assorbimento.",
    features: ["Ispirata alla skincare coreana", "Rinforza la barriera cutanea", "Idratazione a lunga durata", "Texture setosa e confortevole"],
  },
  "Eveline Cosmetics Korean Rituals Crema Hyaluron+ 50 ml": {
    shortDescription: "Crema viso all'acido ialuronico ispirata alla skincare coreana.",
    description:
      "Crema viso all'acido ialuronico ispirata ai rituali di bellezza coreani, pensata per un'idratazione profonda e un effetto rimpolpante. La texture leggera e idratante si assorbe rapidamente, lasciando la pelle fresca, levigata e visibilmente più luminosa. Perfetta come base quotidiana per un incarnato sano e radioso.",
    formulaBenefits:
      "Acido ialuronico che idrata a strati e rimpolpa la pelle, per un incarnato fresco, levigato e luminoso.",
    howToUse:
      "Applicare mattina e/o sera su viso e collo detersi, massaggiando fino a completo assorbimento. Ottima base make-up.",
    features: ["Ispirata alla skincare coreana", "Idratazione profonda", "Effetto rimpolpante", "Texture leggera a rapido assorbimento"],
  },

  "Eveline Cosmetics Eyeliner & Stamp 2in1 Star": {
    shortDescription: "Eyeliner 2-in-1 con timbro a stella per look creativi.",
    description:
      "Eyeliner 2-in-1 che unisce un tratto liquido preciso e un pratico timbro a stella, per creare dettagli grafici e look creativi in pochi secondi. La formula nero intenso è a lunga tenuta e si stende uniformemente senza sbavature. Il doppio applicatore rende il make-up occhi divertente e immediato.",
    formulaBenefits:
      "Formula nero intenso a lunga tenuta con doppio applicatore: tratto liquido preciso e timbro a stella per look originali.",
    howToUse:
      "Usare la punta per tracciare la linea di eyeliner lungo l'attaccatura delle ciglia, poi premere il timbro nell'angolo esterno per il dettaglio a stella.",
    features: ["Doppio applicatore 2-in-1", "Timbro a stella integrato", "Tratto nero a lunga tenuta", "Ideale per look creativi"],
  },
  "Eveline Cosmetics Eyeliner Precision Black": {
    shortDescription: "Eyeliner liquido nero a punta fine di alta precisione.",
    description:
      "Eyeliner liquido dalla punta sottile e flessibile, pensato per tracciare linee precise, code sottili e dettagli millimetrici. La formula nero intenso è a rapida asciugatura e lunga tenuta, senza sbavature né trasferimenti. Perfetto per un tratto classico o per look grafici di grande definizione.",
    formulaBenefits:
      "Punta fine e flessibile per un tratto millimetrico e una formula nero intenso a lunga tenuta e rapida asciugatura.",
    howToUse:
      "Tracciare la linea dall'angolo interno verso l'esterno dell'occhio, ispessendola a piacere e definendo la coda con la punta.",
    features: ["Punta fine di precisione", "Nero intenso a lunga tenuta", "Rapida asciugatura", "Tratto modulabile"],
  },
  "Eveline Cosmetics Matita Sopracciglia Waterproof Soft Brown": {
    shortDescription: "Matita sopracciglia waterproof nella tonalità soft brown.",
    description:
      "Matita sopracciglia waterproof dalla texture scorrevole, nella tonalità soft brown naturale. Definisce e riempie le sopracciglia con tratti precisi che resistono ad acqua e umidità per tutto il giorno. La punta morbida permette un'applicazione modulabile, per un risultato naturale o più definito.",
    formulaBenefits:
      "Texture waterproof a lunga tenuta che definisce e riempie le sopracciglia con un colore naturale e modulabile.",
    howToUse:
      "Riempire le sopracciglia con piccoli tratti nella direzione del pelo, poi pettinare con lo scovolino per un effetto naturale.",
    features: ["Formula waterproof", "Tonalità soft brown naturale", "Tratti precisi e modulabili", "Lunga tenuta"],
  },

  "Eveline Cosmetics Perfect Bright Crema SPF20 50 ml": {
    shortDescription: "Crema viso illuminante con SPF20 per un incarnato luminoso.",
    description:
      "Crema viso illuminante con protezione SPF20 che uniforma l'incarnato e dona luminosità, proteggendo la pelle dai raggi UV. La texture vellutata si fonde con la pelle, minimizzando imperfezioni e discromie e lasciando un finish radioso e naturale. Ideale per l'uso quotidiano.",
    formulaBenefits:
      "Formula illuminante con SPF20 che uniforma l'incarnato e protegge la pelle, donando un finish luminoso e naturale.",
    howToUse:
      "Applicare al mattino su viso deterso, massaggiando fino a completo assorbimento, prima del make-up.",
    features: ["Protezione SPF20", "Effetto illuminante", "Uniforma l'incarnato", "Finish radioso e naturale"],
  },
  "Eveline Cosmetics Perfect Bright Crema SPF50 30 ml": {
    shortDescription: "Crema viso illuminante ad alta protezione SPF50.",
    description:
      "Crema viso illuminante ad alta protezione SPF50, pensata per chi desidera una difesa solare efficace senza rinunciare alla luminosità. La texture leggera uniforma il tono, minimizza le discromie e protegge la pelle dai danni dei raggi UV, lasciando un incarnato radioso e omogeneo.",
    formulaBenefits:
      "Alta protezione SPF50 con effetto illuminante: difende la pelle dai raggi UV uniformando e valorizzando l'incarnato.",
    howToUse:
      "Applicare al mattino su viso deterso, massaggiando fino a completo assorbimento, prima del make-up.",
    features: ["Alta protezione SPF50", "Effetto illuminante", "Minimizza le discromie", "Texture leggera"],
  },

  "Eveline Cosmetics Pink Snail Siero Illuminante 30 ml": {
    shortDescription: "Siero viso alla bava di lumaca, effetto illuminante.",
    description:
      "Siero viso alla bava di lumaca dalla texture leggera e a rapido assorbimento, che idrata e illumina l'incarnato. La bava di lumaca favorisce il rinnovamento cutaneo, levigando la grana e attenuando le irregolarità per una pelle più uniforme, morbida e radiosa. Ideale come siero quotidiano.",
    formulaBenefits:
      "Bava di lumaca che favorisce il rinnovamento cutaneo, idrata e illumina per una pelle uniforme e radiosa.",
    howToUse:
      "Applicare poche gocce su viso e collo detersi, mattina e sera, massaggiando fino a completo assorbimento prima della crema.",
    features: ["Azione illuminante", "Favorisce il rinnovamento cutaneo", "Leviga la grana della pelle", "Texture leggera a rapido assorbimento"],
  },
  "Eveline Cosmetics Pink Snail Crema Nutrente Giorno/Notte 50 ml": {
    shortDescription: "Crema viso alla bava di lumaca, nutrimento giorno e notte.",
    description:
      "Crema viso alla bava di lumaca dalla texture ricca e nutriente, pensata per un comfort continuo giorno e notte. Nutre in profondità, migliora elasticità e morbidezza e aiuta a ridurre i segni del tempo, lasciando la pelle visibilmente più levigata, compatta e luminosa. Adatta a tutti i tipi di pelle.",
    formulaBenefits:
      "Bava di lumaca nutriente che migliora elasticità e compattezza, per una pelle levigata, morbida e luminosa giorno e notte.",
    howToUse:
      "Applicare mattina e sera su viso e collo detersi, massaggiando fino a completo assorbimento.",
    features: ["Nutrimento giorno e notte", "Migliora elasticità e compattezza", "Riduce i segni del tempo", "Texture ricca e confortevole"],
  },

  "Eveline Cosmetics Slim Extreme 4D Strech Marks 150 ml": {
    shortDescription: "Siero corpo 4D anticellulite e anti-smagliature 150 ml.",
    description:
      "Siero corpo ad azione 4D studiato per contrastare smagliature e rilassamento cutaneo, migliorando tonicità ed elasticità. La texture leggera si assorbe rapidamente e agisce in profondità, levigando la grana della pelle e rendendola visibilmente più compatta e uniforme. Ideale per un trattamento corpo rimodellante.",
    formulaBenefits:
      "Azione 4D mirata su smagliature e rilassamento cutaneo, per una pelle più tonica, elastica e uniforme.",
    howToUse:
      "Applicare sulle zone interessate con movimenti circolari ascendenti, mattina e sera, fino a completo assorbimento.",
    features: ["Azione 4D anti-smagliature", "Migliora tonicità ed elasticità", "Levigante e rimodellante", "Texture leggera"],
  },
  "Eveline Cosmetics Slim Extreme Night Therapy Serum 250 ml": {
    shortDescription: "Siero corpo notte rimodellante, agisce durante il riposo.",
    description:
      "Siero corpo notte formulato per agire durante il riposo, quando la pelle è più ricettiva. Favorisce il rinnovamento cutaneo, leviga e rassoda, aiutando a ridurre l'aspetto a buccia d'arancia e i segni del rilassamento. Al risveglio la pelle appare più compatta, tonica e uniforme.",
    formulaBenefits:
      "Trattamento notturno che sfrutta il riposo per rassodare, levigare e migliorare l'aspetto della pelle del corpo.",
    howToUse:
      "Applicare la sera su tutto il corpo con movimenti circolari ascendenti, lasciando agire durante la notte.",
    features: ["Agisce durante la notte", "Rassoda e leviga", "Riduce l'aspetto a buccia d'arancia", "Incarnato più compatto al risveglio"],
  },
  "Eveline Cosmetics Slim Extreme 4D Slimming Serum 250 ml": {
    shortDescription: "Siero corpo 4D snellente ad azione rimodellante.",
    description:
      "Siero corpo ad azione 4D snellente, studiato per favorire il rimodellamento della silhouette e ridurre l'aspetto a buccia d'arancia. La formula concentrata tonifica e leviga la pelle, migliorandone compattezza ed elasticità e donando un aspetto più definito e armonioso. Texture fresca a rapido assorbimento.",
    formulaBenefits:
      "Azione 4D snellente che rimodella la silhouette, tonifica e leviga la pelle per un aspetto più compatto e definito.",
    howToUse:
      "Applicare sulle zone da trattare con movimenti circolari ascendenti, mattina e sera, fino a completo assorbimento.",
    features: ["Azione 4D snellente", "Rimodella la silhouette", "Tonifica e leviga", "Texture fresca"],
  },
  "Eveline Cosmetics Slim Extreme Thermo Activator 250 ml": {
    shortDescription: "Siero corpo termo-attivatore per potenziare il rimodellamento.",
    description:
      "Siero corpo termo-attivatore che genera una piacevole sensazione di calore, potenziando l'azione rimodellante degli attivi. Favorisce la circolazione, leviga e rassoda la pelle, donando un aspetto più tonico e compatto. Perfetto da abbinare al massaggio per potenziare i risultati del trattamento corpo.",
    formulaBenefits:
      "Effetto termo-attivante che potenzia l'azione rimodellante, stimola la circolazione e rassoda la pelle.",
    howToUse:
      "Applicare sulle zone interessate massaggiando energicamente con movimenti circolari ascendenti, fino a percepire la sensazione di calore.",
    features: ["Effetto termo-attivante", "Potenzia il rimodellamento", "Stimola la circolazione", "Rassoda la pelle"],
  },

  "Eveline Cosmetics Slim Extreme 3D Crema Anticellulite 250 ml": {
    shortDescription: "Crema corpo 3D anticellulite ad azione intensiva.",
    description:
      "Crema corpo ad azione 3D anticellulite, formulata per contrastare gli inestetismi della cellulite e migliorare la compattezza cutanea. La texture ricca nutre e leviga la pelle, riducendo l'aspetto a buccia d'arancia e donando una silhouette più tonica e uniforme. Uso quotidiano per risultati visibili.",
    formulaBenefits:
      "Azione 3D anticellulite che leviga e rassoda, riducendo l'aspetto a buccia d'arancia e migliorando la compattezza.",
    howToUse:
      "Applicare sulle zone interessate con movimenti circolari ascendenti, mattina e sera, fino a completo assorbimento.",
    features: ["Azione 3D anticellulite", "Leviga e rassoda", "Riduce la buccia d'arancia", "Texture nutriente"],
  },
  "Eveline Cosmetics Slim Extreme Intense Bust Volumizzante 200 ml": {
    shortDescription: "Crema corpo intensiva volumizzante per décolleté e busto.",
    description:
      "Crema corpo intensiva studiata per tonificare e volumizzare la zona di busto e décolleté, migliorando compattezza ed elasticità della pelle. La formula nutriente leviga e rassoda, donando un aspetto più pieno, tonico e curato. Ideale per un trattamento corpo mirato e femminile.",
    formulaBenefits:
      "Formula intensiva che tonifica, volumizza e rassoda busto e décolleté, migliorando compattezza ed elasticità.",
    howToUse:
      "Applicare su busto e décolleté con movimenti circolari ascendenti, mattina e sera, fino a completo assorbimento.",
    features: ["Azione volumizzante mirata", "Tonifica e rassoda", "Migliora elasticità", "Trattamento per busto e décolleté"],
  },
  "Eveline Cosmetics Slim Extreme Superconcentrato Serum 250 ml": {
    shortDescription: "Siero corpo superconcentrato ad azione snellente intensiva.",
    description:
      "Siero corpo superconcentrato, una formula ad alta intensità per un'azione snellente e rimodellante potenziata. Aiuta a levigare, rassodare e migliorare l'aspetto della pelle, donando una silhouette più definita e armoniosa. Texture leggera a rapido assorbimento, ideale per un trattamento intensivo.",
    formulaBenefits:
      "Formula superconcentrata che potenzia l'azione snellente e rimodellante, per una silhouette più definita e tonica.",
    howToUse:
      "Applicare sulle zone da trattare con movimenti circolari ascendenti, mattina e sera, fino a completo assorbimento.",
    features: ["Formula superconcentrata", "Azione snellente intensiva", "Rimodella e rassoda", "Texture leggera"],
  },

  "Eveline Cosmetics Super Needles Meso-Booster Collagen 50 ml": {
    shortDescription: "Meso-booster viso al collagene, effetto tensore immediato.",
    description:
      "Meso-booster viso al collagene ispirato ai trattamenti mesoterapici, per un effetto tensore e rimpolpante immediato. La formula concentrata leviga i segni del tempo, migliora elasticità e compattezza e dona un incarnato visibilmente più disteso e luminoso. Trattamento d'urto per pelli mature.",
    formulaBenefits:
      "Collagene concentrato ispirato alla mesoterapia, per un effetto tensore immediato e un'azione rimpolpante nel tempo.",
    howToUse:
      "Applicare su viso e collo detersi, mattina e/o sera, massaggiando fino a completo assorbimento prima della crema.",
    features: ["Ispirato alla mesoterapia", "Effetto tensore immediato", "Migliora compattezza", "Formula concentrata"],
  },
  "Eveline Cosmetics Super Needles Meso-Booster Hyaluron 50 ml": {
    shortDescription: "Meso-booster viso all'acido ialuronico, idratazione profonda.",
    description:
      "Meso-booster viso all'acido ialuronico ispirato ai trattamenti mesoterapici, per un'idratazione profonda e un effetto rimpolpante. La formula leggera si assorbe rapidamente, riempiendo le linee sottili e donando un incarnato fresco, levigato e luminoso. Ideale per pelli disidratate e opache.",
    formulaBenefits:
      "Acido ialuronico concentrato ispirato alla mesoterapia, per un'idratazione profonda e un effetto rimpolpante visibile.",
    howToUse:
      "Applicare su viso e collo detersi, mattina e/o sera, massaggiando fino a completo assorbimento prima della crema.",
    features: ["Ispirato alla mesoterapia", "Idratazione profonda", "Effetto rimpolpante", "Texture leggera"],
  },

  "Eveline Cosmetics Wonder Show Illuminante Stick": {
    shortDescription: "Stick illuminante in due nuance per punti luce e glow.",
    description:
      "Stick illuminante dalla texture cremosa e sfumabile, disponibile in due nuance luminose (01 Starlight e 02 Golden Hour). Esalta i punti luce del viso — zigomi, arco di Cupido, ponte del naso e arcata sopraccigliare — con un glow naturale e modulabile. Pratico formato stick, perfetto per il ritocco on-the-go.",
    formulaBenefits:
      "Texture cremosa sfumabile che esalta i punti luce con un glow naturale e modulabile, in due nuance luminose.",
    howToUse:
      "Applicare direttamente sui punti luce del viso e sfumare con le dita o un pennello, costruendo l'intensità desiderata.",
    features: ["Formato stick pratico", "Texture cremosa sfumabile", "Glow naturale e modulabile", "Due nuance luminose"],
  },
  "Eveline Cosmetics Wonder Show Bronzer Stick": {
    shortDescription: "Stick bronzer in due nuance per un incarnato abbronzato.",
    description:
      "Stick bronzer dalla texture cremosa e sfumabile, disponibile in due nuance calde (1BE Natural e 2BE Happy). Scolpisce e riscalda l'incarnato, donando un effetto abbronzato naturale e senza macchie. Il formato stick consente un'applicazione precisa e un ritocco rapido in qualsiasi momento.",
    formulaBenefits:
      "Texture cremosa sfumabile che scolpisce e riscalda l'incarnato con un effetto abbronzato naturale, in due nuance calde.",
    howToUse:
      "Applicare sulle zone da definire (zigomi, fronte, mascella) e sfumare con le dita o un pennello per un effetto naturale.",
    features: ["Formato stick pratico", "Texture cremosa sfumabile", "Effetto abbronzato naturale", "Due nuance calde"],
  },

  "Pierre René Make Up Base Illuminating Light Rose": {
    shortDescription: "Base trucco illuminante light rose per un glow immediato.",
    description:
      "Base trucco illuminante dalla nuance light rose, che prepara la pelle e dona un'immediata luminosità. Uniforma l'incarnato, leviga la grana e prolunga la tenuta del make-up, con un finish radioso e naturale. Perfetta da sola o come primer sotto il fondotinta.",
    formulaBenefits:
      "Nuance light rose illuminante che uniforma l'incarnato, leviga la grana e prolunga la tenuta del make-up.",
    howToUse:
      "Applicare su viso deterso prima del fondotinta, distribuendo uniformemente con le dita o un pennello.",
    features: ["Effetto illuminante light rose", "Uniforma e leviga", "Prolunga la tenuta del make-up", "Primer o base da sola"],
  },
  "Pierre René Make Up Base Smoothing Transparent": {
    shortDescription: "Base trucco levigante trasparente per un incarnato uniforme.",
    description:
      "Base trucco levigante dalla texture trasparente, che uniforma la grana della pelle e minimizza pori e imperfezioni. Crea una tela liscia per il make-up, migliorandone aderenza e durata, con un finish naturale e senza effetto colore. Ideale come primer universale per tutti i tipi di pelle.",
    formulaBenefits:
      "Texture trasparente levigante che minimizza pori e imperfezioni, creando una base liscia e uniforme per il make-up.",
    howToUse:
      "Applicare su viso deterso prima del make-up, distribuendo uniformemente e lasciando assorbire qualche istante.",
    features: ["Texture trasparente universale", "Levigante e uniformante", "Minimizza pori e imperfezioni", "Prolunga la tenuta del make-up"],
  },

  "Pierre René Lipmatic Waterproof Liner": {
    shortDescription: "Matita labbra waterproof a lunga tenuta, in 6 nuance.",
    description:
      "Matita labbra waterproof dalla texture scorrevole e precisa, disponibile in sei nuance. Definisce il contorno delle labbra, impedendo sbavature del rossetto e prolungandone la tenuta per tutto il giorno. La formula resiste ad acqua e umidità, garantendo un contorno netto e definito a lunga durata.",
    formulaBenefits:
      "Formula waterproof a lunga tenuta che definisce il contorno labbra con precisione, impedendo sbavature del rossetto.",
    howToUse:
      "Delineare il contorno delle labbra partendo dall'arco di Cupido verso gli angoli, poi riempire a piacere prima del rossetto.",
    features: ["Formula waterproof", "Lunga tenuta", "Contorno preciso e netto", "Disponibile in 6 nuance"],
  },
  "Pierre René Glory Lipmatic Love": {
    shortDescription: "Matita labbra Glory dalla texture cremosa e scorrevole.",
    description:
      "Matita labbra Glory dalla texture cremosa e scorrevole, che definisce il contorno con un tratto pieno e confortevole. Il colore intenso e uniforme si sfuma facilmente, permettendo di creare contorni definiti o riempimenti totali. Pratica e precisa, si abbina perfettamente al rossetto per un risultato impeccabile.",
    formulaBenefits:
      "Texture cremosa e scorrevole che definisce il contorno labbra con un colore intenso, uniforme e facilmente sfumabile.",
    howToUse:
      "Delineare il contorno delle labbra e, a piacere, riempire l'intera superficie per una base colore uniforme prima del rossetto.",
    features: ["Texture cremosa e scorrevole", "Colore intenso e uniforme", "Facile da sfumare", "Contorno definito"],
  },

  "Pierre René Royal Pencil Occhi": {
    shortDescription: "Matita occhi Royal Pencil in nero e marrone, tratto intenso.",
    description:
      "Matita occhi Royal Pencil dalla mina morbida e pigmentata, disponibile nelle nuance nero e marrone. Traccia linee intense e uniformi lungo la rima cigliare, con una scorrevolezza che permette sia tratti netti che sfumature smoky. Formula a lunga tenuta per uno sguardo definito tutto il giorno.",
    formulaBenefits:
      "Mina morbida e pigmentata che traccia linee intense e uniformi, con una scorrevolezza ideale per tratti netti e sfumature.",
    howToUse:
      "Applicare lungo la rima cigliare superiore e/o inferiore, sfumando con le dita o un pennello per un effetto smoky.",
    features: ["Mina morbida e pigmentata", "Nuance nero e marrone", "Lunga tenuta", "Ideale per look smoky"],
  },
  "Pierre René Long Lasting Eyeliner 03": {
    shortDescription: "Eyeliner a lunga tenuta nella nuance 03, tratto preciso.",
    description:
      "Eyeliner a lunga tenuta dalla formula intensa e a rapida asciugatura, nella nuance 03. Traccia linee precise e definite lungo la rima cigliare, resistendo a sbavature e trasferimenti per tutto il giorno. La punta permette di modulare lo spessore del tratto, dal più sottile al più deciso.",
    formulaBenefits:
      "Formula a lunga tenuta e rapida asciugatura che traccia linee precise e resistenti a sbavature per tutto il giorno.",
    howToUse:
      "Tracciare la linea lungo l'attaccatura delle ciglia, modulando lo spessore a piacere e definendo la coda.",
    features: ["Lunga tenuta", "Rapida asciugatura", "Tratto preciso e modulabile", "Resistente a sbavature"],
  },

  "Pierre René Medic Laboratorium Siero Essenza Anti-Aging 30 ml": {
    shortDescription: "Siero essenza anti-age concentrato, azione rigenerante.",
    description:
      "Siero essenza anti-age dalla texture concentrata e a rapido assorbimento, formulato per contrastare i segni del tempo. Leviga rughe e linee sottili, migliora elasticità e compattezza e dona un incarnato più uniforme e luminoso. Trattamento intensivo ispirato ai protocolli del laboratorio Medic.",
    formulaBenefits:
      "Formula anti-age concentrata che leviga rughe e linee sottili, migliorando elasticità, compattezza e luminosità della pelle.",
    howToUse:
      "Applicare poche gocce su viso e collo detersi, mattina e sera, massaggiando fino a completo assorbimento prima della crema.",
    features: ["Azione anti-age intensiva", "Leviga rughe e linee sottili", "Migliora elasticità", "Texture concentrata"],
  },
  "Pierre René Medic Laboratorium Siero Essenza Hydration 30 ml": {
    shortDescription: "Siero essenza idratante concentrato, comfort immediato.",
    description:
      "Siero essenza idratante dalla texture leggera e a rapido assorbimento, formulato per un'idratazione profonda e prolungata. Rimpolpa e leviga la pelle, attenuando i segni di disidratazione e donando un incarnato fresco, morbido e luminoso. Ideale per pelli secche, opache o stressate.",
    formulaBenefits:
      "Formula idratante concentrata che rimpolpa e leviga la pelle, attenuando i segni di disidratazione per un comfort immediato.",
    howToUse:
      "Applicare poche gocce su viso e collo detersi, mattina e sera, massaggiando fino a completo assorbimento prima della crema.",
    features: ["Idratazione profonda", "Effetto rimpolpante", "Attenua i segni di disidratazione", "Texture leggera"],
  },
};

// ---------------------------------------------------------------------------
// Costruzione delle schede
// ---------------------------------------------------------------------------

function buildVariant(sourceVariant, image) {
  const ean = String(sourceVariant.ean);
  return {
    id: `var-${ean}`,
    name: sourceVariant.name,
    sku: ean,
    ean,
    colorHex: sourceVariant.colorHex ?? null,
    image,
    inStock: true,
    price: sourceVariant.price,
    originalWholesalePrice: sourceVariant.originalWholesalePrice,
    stock: sourceVariant.stock,
  };
}

function buildShade(variant) {
  return {
    id: variant.id,
    name: variant.name,
    code: variant.sku,
    hex: variant.colorHex ?? null,
    image: variant.image,
    price: variant.price,
    inStock: true,
    stock: variant.stock,
  };
}

function buildProduct({ title, slug, brand, category, price, wholesale, stock, image, variants }) {
  return {
    id: `prod-${slug}`,
    slug,
    name: title,
    brand,
    category,
    price,
    originalWholesalePrice: wholesale,
    description: null, // riempito sotto dal CONTENT
    shortDescription: null,
    formulaBenefits: null,
    howToUse: null,
    inci: GENERIC_INCI,
    features: [],
    badges: null, // riempito sotto
    image,
    images: [image],
    variants,
    shades: variants.map(buildShade),
    stock,
    inStock: true,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  if (!fs.existsSync(CATALOG_PATH)) throw new Error(`Catalogo non trovato: ${CATALOG_PATH}`);
  if (!fs.existsSync(REPORT_PATH)) throw new Error(`Report non trovato: ${REPORT_PATH}`);

  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));
  if (!Array.isArray(catalog)) throw new Error("Il catalogo non è un array JSON.");

  const report = JSON.parse(fs.readFileSync(REPORT_PATH, "utf8"));
  const categoryB = Array.isArray(report.categoryB) ? report.categoryB : [];
  if (categoryB.length !== EXPECTED_PARENTS) {
    throw new Error(`Attesi ${EXPECTED_PARENTS} genitori Categoria B, trovati ${categoryB.length}.`);
  }

  // Mappa parentId → product reale (per dati autorevoli).
  const parentById = new Map();
  for (const p of catalog) parentById.set(p.id, p);

  const parentIds = categoryB.map((b) => b.id);

  // --- 1. Snapshot baseline prezzi (PRIMA di qualsiasi modifica). ---
  const sumVariantStock = (products) =>
    products.reduce((a, p) => a + (p.variants || []).reduce((s, v) => s + (Number(v.stock ?? 0) || 0), 0), 0);

  const totalStockBefore = sumVariantStock(catalog);

  const baseline = {
    generatedAt: new Date().toISOString(),
    note: "Baseline di riferimento per la revisione prezzi. Prezzi e giacenze NON modificati dallo split Categoria B.",
    totalProducts: catalog.length,
    totalStock: totalStockBefore,
    products: catalog.map((p) => ({
      id: p.id,
      title: p.name,
      brand: p.brand,
      price: p.price,
      wholesalePrice: p.originalWholesalePrice ?? null,
      stock: p.stock,
      variants: (p.variants || []).map((v) => ({
        name: v.name,
        ean: v.ean,
        sku: v.sku,
        price: v.price,
        wholesalePrice: v.originalWholesalePrice ?? v.wholesalePrice ?? null,
        stock: v.stock,
      })),
    })),
  };
  fs.writeFileSync(BASELINE_PATH, `${JSON.stringify(baseline, null, 2)}\n`, "utf8");
  console.log(`Snapshot baseline salvato in ${path.relative(ROOT, BASELINE_PATH)}.`);
  console.log(`Totale stock PRIMA: ${totalStockBefore}`);

  // --- 2. Costruzione delle 43 nuove schede. ---
  const newProducts = [];
  const errors = [];

  for (const b of categoryB) {
    const parent = parentById.get(b.id);
    if (!parent) {
      errors.push(`Genitore non trovato nel catalogo: ${b.id}`);
      continue;
    }
    const brand = parent.brand;
    const packshot = brandPackshot(brand);

    // Mappa EAN → variante reale del genitore (dati autorevoli).
    const variantByEan = new Map();
    for (const v of parent.variants || []) variantByEan.set(String(v.ean), v);

    const split = b.proposedSplit || {};
    const groups = Array.isArray(split.groups) ? split.groups : [];
    const imageStrategy = Array.isArray(split.imageStrategy) ? split.imageStrategy : [];
    const strategyByCard = new Map(imageStrategy.map((s) => [s.cardName, s]));

    for (const group of groups) {
      const cardName = group.cardName;
      const title = cleanTitle(cardName);
      const slug = slugify(cardName);
      const category = group.category || parent.category;
      const strategy = strategyByCard.get(cardName) || {};
      const usableImage = typeof strategy.usableImage === "string" && strategy.usableImage ? strategy.usableImage : null;
      const cardImage = usableImage || packshot;

      // Costruisce le varianti della scheda a partire dagli EAN del gruppo,
      // ma leggendo i dati autorevoli (price/wholesale/stock) dal catalogo reale.
      const variants = [];
      for (const gv of group.variants || []) {
        const source = variantByEan.get(String(gv.ean));
        if (!source) {
          errors.push(`Variante non trovata nel genitore ${b.id}: EAN ${gv.ean} (${cardName})`);
          continue;
        }
        const image = usableImage && source.image ? source.image : cardImage;
        variants.push(buildVariant(source, image));
      }

      if (variants.length === 0) {
        errors.push(`Nessuna variante valida per la scheda "${cardName}".`);
        continue;
      }

      const stock = variants.reduce((a, v) => a + v.stock, 0);
      const price = variants[0].price;
      const wholesale = variants[0].originalWholesalePrice;

      const product = buildProduct({
        title,
        slug,
        brand,
        category,
        price,
        wholesale,
        stock,
        image: cardImage,
        variants,
      });

      // Contenuti editoriali MUA.
      const content = CONTENT[cardName];
      if (!content) {
        errors.push(`Contenuto editoriale mancante per la scheda "${cardName}".`);
        product.description = `${title}. ${parent.brand ? "Prodotto " + parent.brand : "Prodotto cosmetico"} della categoria ${category}, formulato secondo rigorosi standard di qualità.`;
        product.shortDescription = title;
        product.formulaBenefits = "Formula cosmetica di alta qualità, testata dermatologicamente per comfort e performance.";
        product.howToUse = "Applicare con cura sulla zona desiderata secondo il protocollo di utilizzo professionale.";
        product.features = ["Formula cosmetica certificata", "Testato dermatologicamente", "Alta performance"];
      } else {
        product.description = content.description;
        product.shortDescription = content.shortDescription;
        product.formulaBenefits = content.formulaBenefits;
        product.howToUse = content.howToUse;
        product.features = content.features;
      }
      product.badges = Array.isArray(parent.badges) ? parent.badges.slice() : ["cruelty_free"];

      newProducts.push(product);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Errori durante la costruzione delle schede:\n  - ${errors.join("\n  - ")}`);
  }

  if (newProducts.length !== EXPECTED_CARDS) {
    throw new Error(`Attese ${EXPECTED_CARDS} schede, generate ${newProducts.length}.`);
  }

  // --- 3. Rimozione dei 17 genitori e inserimento delle 43 schede. ---
  const kept = catalog.filter((p) => !parentIds.includes(p.id));
  if (kept.length !== catalog.length - parentIds.length) {
    throw new Error("Conteggio prodotti dopo la rimozione incoerente.");
  }

  const result = kept.concat(newProducts);

  // --- 4. Controlli di integrità. ---
  const ids = result.map((p) => p.id);
  if (new Set(ids).size !== ids.length) throw new Error("Rilevati ID duplicati.");
  const slugs = result.map((p) => p.slug);
  if (new Set(slugs).size !== slugs.length) throw new Error("Rilevati slug duplicati.");

  const totalStockAfter = sumVariantStock(result);
  console.log(`Totale stock DOPO: ${totalStockAfter}`);

  if (totalStockAfter !== totalStockBefore) {
    throw new Error(`Invariante di stock violata: PRIMA ${totalStockBefore}, DOPO ${totalStockAfter}.`);
  }
  if (totalStockAfter !== EXPECTED_STOCK_TOTAL) {
    throw new Error(`Stock totale atteso ${EXPECTED_STOCK_TOTAL}, ottenuto ${totalStockAfter}.`);
  }

  // Verifica che nessun prezzo/wholesale sia stato alterato per le varianti spostate.
  const baselineVariantPrice = new Map();
  for (const bp of baseline.products) {
    for (const bv of bp.variants) {
      baselineVariantPrice.set(String(bv.ean), { price: bv.price, wholesale: bv.wholesalePrice, stock: bv.stock });
    }
  }
  for (const np of newProducts) {
    for (const nv of np.variants) {
      const orig = baselineVariantPrice.get(String(nv.ean));
      if (!orig) continue; // EAN nuovo non mappato: impossibile (tutti provengono da genitori esistenti).
      if (orig.price !== nv.price) {
        throw new Error(`Prezzo alterato per EAN ${nv.ean}: era ${orig.price}, ora ${nv.price}.`);
      }
      if (orig.wholesale !== nv.originalWholesalePrice) {
        throw new Error(`Wholesale alterato per EAN ${nv.ean}: era ${orig.wholesale}, ora ${nv.originalWholesalePrice}.`);
      }
      if (orig.stock !== nv.stock) {
        throw new Error(`Stock alterato per EAN ${nv.ean}: era ${orig.stock}, ora ${nv.stock}.`);
      }
    }
  }

  // --- 5. Scrittura. ---
  fs.writeFileSync(CATALOG_PATH, `${JSON.stringify(result, null, 2)}\n`, "utf8");

  console.log(`\nOK: rimosse ${parentIds.length} schede genitore, inserite ${newProducts.length} schede autonome.`);
  console.log(`Invariante stock rispettata: ${totalStockBefore} === ${totalStockAfter} === ${EXPECTED_STOCK_TOTAL}.`);
  console.log(`Totale prodotti: ${result.length} (prima ${catalog.length}).`);
}

main();
