/**
 * Scelta Makeup — Split "prod-pierre-ren-brushes" in 12 schede autonome.
 *
 * Sostituisce la scheda raggruppata "Pierre René Pennelli e Accessori Trucco
 * Professionali" (12 varianti, prezzi 8.90€–21.90€) con 12 schede prodotto
 * distinte di categoria "Beauty & Accessori", ognuna con la propria variante
 * singola (EAN per la pistola cassa barcode) e `shades: []`.
 *
 * Uso: node scripts/split_pierre_rene_brushes.js
 */

const fs = require("fs");
const path = require("path");

const CATALOG_PATH = path.resolve(__dirname, "..", "data", "catalog.json");
const GROUPED_ID = "prod-pierre-ren-brushes";
const PACKSHOT = "/products/pierre-rene-packshot.jpg";

const ACCESSORY_INCI =
  "Accessorio cosmetico professionale. Materiali dermatologicamente testati, conformi agli standard europei di qualità e sicurezza. Prodotto cruelty-free.";
const ACCESSORY_BENEFITS =
  "Setole sintetiche ipoallergeniche e cruelty-free, studiate per garantire precisione, massima resa del prodotto e una lunga durata nel tempo.";

const ITEMS = [
  {
    ean: "3700467837115",
    name: "Pierre René Pennello Occhi Sfumatura Mini Blend 206",
    slug: "pierre-rene-pennello-occhi-sfumatura-mini-blend-206",
    variantName: "Mini Blend 206",
    price: 15.5,
    wholesale: 5.5,
    stock: 3,
    shortDescription:
      "Pennello occhi mini blend a ciuffo compatto per sfumature mirate nella piega palpebrale.",
    description:
      "Il Pennello Occhi Sfumatura Mini Blend 206 di Pierre René è un piccolo pennello dal ciuffo arrotondato e compatto, pensato per sfumare con estrema precisione gli ombretti nella piega palpebrale e nell'angolo esterno dell'occhio. Le setole sintetiche ultra-soffici, tagliate a mano, rilasciano il pigmento in modo progressivo e controllato, evitando cadute di prodotto e accumuli eccessivi. La forma ridotta lo rende ideale per look naturali diurni o per definire sfumature nette nel make-up artistico. Manico ergonomico in alluminio leggero e ghiera in metallo spazzolato per una presa stabile e durevole.",
    howToUse:
      "Prelevare una piccola quantità di ombretto e appoggiarla nella piega palpebrale. Sfumare con movimenti brevi a zig-zag verso l'angolo esterno, insistendo fino a ottenere la sfumatura desiderata. Pulire con uno shampoo per pennelli dopo l'uso.",
    benefits:
      "Setole sintetiche extra-soffici, ipoallergeniche e cruelty-free: precisione assoluta e massima resa del pigmento nella piega palpebrale.",
    features: [
      "Ciuffo arrotondato mini blend per sfumature nella piega palpebrale",
      "Setole sintetiche tagliate a mano ultra-soffici",
      "Ideale per make-up occhi di precisione e look sfumati",
      "Manico ergonomico in alluminio leggero",
    ],
  },
  {
    ean: "3700467848166",
    name: "Pierre René Pennello Precision Line 209",
    slug: "pierre-rene-pennello-precision-line-209",
    variantName: "Precision Line 209",
    price: 14.5,
    wholesale: 5.15,
    stock: 3,
    shortDescription:
      "Pennello angolato e sottile di alta precisione per eyeliner, rima infracigliare e sopracciglia.",
    description:
      "Il Pennello Precision Line 209 di Pierre René è un pennello angolato dal profilo sottile e affilato, progettato per tracciare linee di eyeliner, definire la rima infracigliare e scolpire le sopracciglia con altissima precisione. La punta smussata segue la naturale curvatura dell'occhio e permette di creare tratti sottili, code di eyeliner e riempimenti decisi. Le setole sintetiche compatte trattengono la giusta quantità di prodotto e non si deformano, garantendo un'applicazione uniforme sia con eyeliner in polvere che in crema o gel.",
    howToUse:
      "Appoggiare il lato corto del pennello sull'attaccatura delle ciglia e tracciare piccoli tratti sovrapposti per un eyeliner preciso. Per le sopracciglia, riempire le zone diradate con leggeri tocchi seguendo la direzione del pelo.",
    benefits:
      "Punta angolata sottile per un tratto millimetrico e modulabile; setole compatte che mantengono la forma nel tempo.",
    features: [
      "Profilo angolato e sottile per eyeliner millimetrico",
      "Perfetto per rima infracigliare e definizione sopracciglia",
      "Compatto e preciso anche con prodotti in crema o gel",
      "Ghiera in metallo e manico in alluminio",
    ],
  },
  {
    ean: "8032179084620",
    name: "Pierre René Spugnetta Trucco Blender a Uovo Professional",
    slug: "pierre-rene-spugnetta-trucco-blender-uovo",
    variantName: "Blender a Uovo",
    price: 8.9,
    wholesale: 3.12,
    stock: 6,
    shortDescription:
      "Spugnetta ergonomica a goccia per stesura uniforme di fondotinta e correttori senza macchie.",
    description:
      "La Spugnetta Trucco Blender a Uovo Professional di Pierre René è un accessorio indispensabile per un incarnato impeccabile. La forma ergonomica a goccia presenta una base arrotondata per stendere fondotinta e base su guance e fronte, e una punta affusolata per raggiungere le zone più difficili come contorno occhi, naso e labbra. La superficie in spugna latex-free, morbida e non assorbente, uniforma il prodotto senza creare righe o macchie, lasciando la pelle levigata e dal finish naturale. Utilizzabile bagnata per un effetto seconda pelle più leggero, o asciutta per una coprenza maggiore.",
    howToUse:
      "Inumidire la spugnetta e strizzarla, oppure usarla asciutta per una coprenza superiore. Applicare il fondotinta con piccoli tocchi a rullo sulla pelle, insistendo sulle zone da coprire. Lavare con acqua tiepida e sapone delicato dopo ogni utilizzo e lasciare asciugare all'aria.",
    benefits:
      "Spugna latex-free, ipoallergenica e non assorbente: distribuisce il prodotto in modo uniforme riducendo gli sprechi.",
    features: [
      "Forma a goccia ergonomica: base per il viso, punta per le zone difficili",
      "Spugna latex-free morbida e non assorbente",
      "Utilizzabile bagnata o asciutta",
      "Lavabile e riutilizzabile",
    ],
  },
  {
    ean: "3700467837047",
    name: "Pierre René Pennello Cipria e Polveri Powder Brush 107",
    slug: "pierre-rene-pennello-cipria-polveri-powder-brush-107",
    variantName: "Powder Brush 107",
    price: 21.9,
    wholesale: 7.9,
    stock: 3,
    shortDescription:
      "Maxi pennello a cupola per polveri libere e compatte, finish uniforme e leggero.",
    description:
      "Il Pennello Cipria e Polveri Powder Brush 107 di Pierre René è un maxi pennello a cupola, ampio e vaporoso, progettato per applicare polveri libere e compatte su tutto il viso. Le setole sintetiche extra-morbide, dense ma flessibili, raccolgono la giusta quantità di polvere e la distribuiscono in un velo sottile e uniforme, fissando il make-up senza appesantire la pelle. La testa bombata consente una presa confortevole e un'applicazione rapida anche sulle superfici più ampie. Ideale per un finish matte-luminoso e uniforme.",
    howToUse:
      "Prelevare la polvere con movimento rotatorio, picchiettare sul dorso della mano per eliminare l'eccesso, quindi stendere su tutto il viso con passaggi leggeri dal centro verso l'esterno.",
    benefits:
      "Setole extra-morbide e vaporose per un velo di polvere uniforme, senza eccessi né cadute di prodotto.",
    features: [
      "Maxi testa a cupola per polveri libere e compatte",
      "Setole sintetiche extra-morbide e dense",
      "Fissaggio del make-up in un velo leggero e uniforme",
      "Manico ergonomico per una presa salda",
    ],
  },
  {
    ean: "3700467837016",
    name: "Pierre René Pennello Fondotinta Foundation Brush 104",
    slug: "pierre-rene-pennello-fondotinta-foundation-brush-104",
    variantName: "Foundation Brush 104",
    price: 21.9,
    wholesale: 7.9,
    stock: 3,
    shortDescription:
      "Pennello fitto a lingua di gatto per fondotinta liquidi e fluidi, coprenza modulabile.",
    description:
      "Il Pennello Fondotinta Foundation Brush 104 di Pierre René è un pennello a lingua di gatto dal ciuffo fitto e piatto, studiato per stendere fondotinta liquidi e fluidi con un'ottima coprenza. Le setole sintetiche fitte e compatte trattengono la giusta dose di prodotto e la distribuiscono in uno strato sottile e uniforme, minimizzando linee e sbavature. La forma piatta e arrotondata in punta si adatta ai contorni del viso per un risultato graduale e naturale. Per un effetto ancora più flawless, rifinire con piccoli tocchi a movimento verticale.",
    howToUse:
      "Versare qualche goccia di fondotinta sul dorso della mano e prelevarne una piccola quantità con il pennello. Stendere dal centro del viso verso l'esterno con movimenti lineari, poi rifinire con tocchi leggeri per un finish impeccabile. Lavare regolarmente il pennello.",
    benefits:
      "Ciuffo fitto e compatto che evita assorbimento eccessivo del prodotto e garantisce una coprenza uniforme e modulabile.",
    features: [
      "Forma a lingua di gatto/flat per fondotinta liquidi e fluidi",
      "Setole sintetiche fitte e compatte",
      "Minimizza righe e sbavature per un incarnato uniforme",
      "Adatto anche a basi BB cream e primer fluidi",
    ],
  },
  {
    ean: "3700467837078",
    name: "Pierre René Pennello Applicatore Ombretto 202",
    slug: "pierre-rene-pennello-applicatore-ombretto-202",
    variantName: "Eyeshadow Applicator 202",
    price: 15.5,
    wholesale: 5.6,
    stock: 3,
    shortDescription:
      "Pennello a lingua compatta per stendere pigmenti e ombretti sulla palpebra mobile.",
    description:
      "Il Pennello Applicatore Ombretto 202 di Pierre René è un pennello a lingua compatta, perfetto per prelevare e depositare pigmenti e ombretti sulla palpebra mobile. Le setole sintetiche fitte e leggermente rigide trattengono la polvere e la rilasciano con precisione, garantendo un colore pieno e senza dispersione. La punta arrotondata consente di costruire il colore a strati e di raggiungere tutta la palpebra con un'unica passata. Ideale per ombretti in polvere, pigmenti sciolti e basi cremose.",
    howToUse:
      "Prelevare l'ombretto e appoggiarlo sulla palpebra mobile con leggeri tocchi pressati. Costruire l'intensità desiderata sovrapponendo più passate. Sfumare i bordi con un pennello da sfumatura.",
    benefits:
      "Setole fitte che trattengono il pigmento e lo rilasciano con precisione, per un colore pieno e senza fall-out.",
    features: [
      "Lingua compatta per palpebra mobile",
      "Alta tenuta del pigmento e zero fall-out",
      "Ideale per ombretti in polvere e pigmenti sciolti",
      "Facile da pulire e da mantenere",
    ],
  },
  {
    ean: "3700467837030",
    name: "Pierre René Pennello Polveri e Bronzer Powder & Bronzer 106",
    slug: "pierre-rene-pennello-polveri-bronzer-106",
    variantName: "Powder & Bronzer 106",
    price: 20.5,
    wholesale: 7.3,
    stock: 3,
    shortDescription:
      "Pennello angolato per contouring e terra abbronzante, sfumatura naturale.",
    description:
      "Il Pennello Polveri e Bronzer Powder & Bronzer 106 di Pierre René è un pennello angolato dalla testa leggermente inclinata, progettato per scolpire i lineamenti con terra abbronzante e polveri. La forma obliqua segue la naturale curva dello zigomo e della mascella, depositando il prodotto esattamente dove serve e permettendo un contouring sfumato e naturale. Le setole sintetiche morbide ma strutturate garantiscono un rilascio controllato e modulabile, per un effetto bronzato senza eccessi.",
    howToUse:
      "Prelevare la terra abbronzante e picchiettare per eliminare l'eccesso. Applicare lungo il contorno del viso, sotto lo zigomo e sui lati della fronte con movimenti diagonali, sfumando verso l'alto.",
    benefits:
      "Testa angolata che asseconda i lineamenti per un contouring preciso e perfettamente sfumato.",
    features: [
      "Forma angolata ideale per contouring e terra abbronzante",
      "Setole morbide ma strutturate per un rilascio modulabile",
      "Effetto bronzato naturale senza macchie",
      "Adatto anche a polveri illuminanti",
    ],
  },
  {
    ean: "3700467837023",
    name: "Pierre René Pennello Fard e Blush Rouge Powder 105",
    slug: "pierre-rene-pennello-fard-blush-rouge-powder-105",
    variantName: "Rouge Powder 105",
    price: 16.5,
    wholesale: 5.9,
    stock: 3,
    shortDescription:
      "Pennello morbido per applicazione calibrata del blush sugli zigomi.",
    description:
      "Il Pennello Fard e Blush Rouge Powder 105 di Pierre René è un pennello morbido dalla testa arrotondata e leggermente inclinata, perfetto per applicare il blush sugli zigomi con un rilascio calibrato e modulabile. Le setole sintetiche vaporose prelevano la giusta quantità di prodotto e la diffondono in un velo naturale, esaltando la luminosità dell'incarnato senza eccessi. Adatto a fard in polvere, in crema e in cialda, per un effetto fresco e uniforme.",
    howToUse:
      "Prelevare il blush e picchiettare leggermente per rimuovere l'eccesso. Applicare sulle mele del viso con piccoli movimenti circolari, sfumando verso le tempie per un effetto naturale.",
    benefits:
      "Setole vaporose per un rilascio graduale e calibrato che dona un colorito fresco e naturale.",
    features: [
      "Testa morbida e arrotondata per un blush naturale",
      "Rilascio calibrato e modulabile",
      "Adatto a fard in polvere, crema e cialda",
      "Ideale anche per il bronzer leggero",
    ],
  },
  {
    ean: "3700467837054",
    name: "Pierre René Pennello Correttore Concealer Brush",
    slug: "pierre-rene-pennello-correttore-concealer",
    variantName: "Concealer Brush",
    price: 14.5,
    wholesale: 5.2,
    stock: 3,
    shortDescription:
      "Pennello piatto di precisione per occhiaie, discromie e piccole imperfezioni.",
    description:
      "Il Pennello Correttore Concealer Brush di Pierre René è un pennello piatto e compatto, dalla punta arrotondata, ideale per applicare correttore su occhiaie, discromie e piccole imperfezioni. Le setole sintetiche dense permettono di costruire la coprenza con precisione, sfumando il prodotto solo dove necessario senza trascinarlo sulle zone circostanti. Perfetto anche per correttori in crema e illuminanti liquidi, garantisce un finish impeccabile e naturale.",
    howToUse:
      "Applicare una piccola quantità di correttore e tamponare con la punta del pennello sulle zone interessate. Sfumare i bordi con leggeri movimenti. Per una coprenza maggiore, stratificare con tocchi pressati.",
    benefits:
      "Punta piatta e densa per una coprenza mirata che non trascina il prodotto sulle zone circostanti.",
    features: [
      "Forma piatta e compatta per la massima precisione",
      "Ideale per occhiaie, discromie e imperfezioni",
      "Perfetto con correttori in crema e liquidi",
      "Sfumatura uniforme senza segnare il contorno occhi",
    ],
  },
  {
    ean: "3700467845813",
    name: "Pierre René Pennello Occhiaie e Zona Perioculare Under Eye 109",
    slug: "pierre-rene-pennello-under-eye-109",
    variantName: "Under Eye 109",
    price: 19.5,
    wholesale: 7.0,
    stock: 3,
    shortDescription:
      "Pennello svasato per fissare la polvere illuminante sotto gli occhi, senza segnare.",
    description:
      "Il Pennello Occhiaie e Zona Perioculare Under Eye 109 di Pierre René è un pennello svasato e leggermente appuntito, progettato per fissare la polvere sotto gli occhi e nella zona perioculare. La punta arrotondata si adatta alla delicata concavità dell'occhio, depositando la polvere illuminante in modo uniforme e senza segnare la pelle sottile. Le setole extra-soffici evitano di stressare la zona e consentono di sfumare correttore e illuminante in polvere per un effetto luminoso e naturale.",
    howToUse:
      "Prelevare una piccola quantità di polvere e picchiettare delicatamente sotto l'occhio, seguendo la curva perioculare. Insistere leggermente sull'angolo interno per illuminare lo sguardo.",
    benefits:
      "Setole extra-soffici e punta svasata studiate per la fragile zona perioculare, per un fissaggio delicato e luminoso.",
    features: [
      "Forma svasata per la zona sotto gli occhi",
      "Setole extra-soffici che non stressano la pelle sottile",
      "Fissa la polvere illuminante senza segnare",
      "Ideale anche per sfumare il correttore",
    ],
  },
  {
    ean: "3700467845806",
    name: "Pierre René Pennello Illuminante Viso Highlighter 110",
    slug: "pierre-rene-pennello-illuminante-highlighter-110",
    variantName: "Highlighter 110",
    price: 16.5,
    wholesale: 5.9,
    stock: 3,
    shortDescription:
      "Pennello a fiamma affusolato per punti luce su zigomi, arco di cupido e naso.",
    description:
      "Il Pennello Illuminante Viso Highlighter 110 di Pierre René è un pennello a fiamma affusolato, dalla punta sottile e flessibile, studiato per applicare l'illuminante nei punti strategici del viso. La forma a fiamma consente un rilascio graduale e controllato del pigmento, per illuminare zigomi, arco di Cupido, ponte del naso, arco sopraccigliare e clavicole con un effetto naturale e dal finish luminoso. Perfetto per polveri illuminanti, cream highlighter e stick.",
    howToUse:
      "Prelevare l'illuminante e applicarlo con la punta del pennello sui punti luce: parte alta degli zigomi, arco di Cupido, ponte del naso e arco sopraccigliare. Sfumare con leggeri movimenti per un effetto glow naturale.",
    benefits:
      "Punta a fiamma che controlla il rilascio del pigmento per un glow modulabile e mai eccessivo.",
    features: [
      "Forma a fiamma affusolata per i punti luce del viso",
      "Rilascio graduale e controllato",
      "Adatto a polveri, cream e stick illuminanti",
      "Effetto luminoso naturale e modulabile",
    ],
  },
  {
    ean: "3700467837085",
    name: "Pierre René Pennello Dettaglio Occhi Mini Eyeshadow 203",
    slug: "pierre-rene-pennello-dettaglio-occhi-mini-203",
    variantName: "Eyeshadow Mini 203",
    price: 15.5,
    wholesale: 5.6,
    stock: 3,
    shortDescription:
      "Micro pennellino a penna per angolo interno e sfumatura della rima inferiore.",
    description:
      "Il Pennello Dettaglio Occhi Mini Eyeshadow 203 di Pierre René è un micro pennellino dalla forma a penna, dall'estremità compatta e appuntita, ideale per definire i dettagli più minuti dello sguardo. Perfetto per applicare e sfumare l'ombretto nell'angolo interno dell'occhio, lungo la rima inferiore e sull'arcata sopraccigliare. Le setole sintetiche precise consentono di lavorare anche i colori più intensi con assoluto controllo, per look smokey o cut-crease di grande impatto.",
    howToUse:
      "Prelevare una piccola quantità di ombretto e appoggiarla nell'angolo interno dell'occhio o lungo la rima inferiore con tocchi leggeri. Sfumare con brevi movimenti per un dettaglio definito e luminoso.",
    benefits:
      "Punta compatta e appuntita per un controllo millimetrico dei dettagli più difficili dello sguardo.",
    features: [
      "Micro pennellino a penna per dettagli di precisione",
      "Perfetto per angolo interno e rima inferiore",
      "Controllo assoluto anche con colori intensi",
      "Ideale per look smokey e cut-crease",
    ],
  },
];

function buildProduct(item) {
  return {
    id: `prod-single-${item.ean}`,
    slug: item.slug,
    name: item.name,
    brand: "Pierre René",
    category: "Beauty & Accessori",
    price: item.price,
    originalWholesalePrice: item.wholesale,
    description: item.description,
    shortDescription: item.shortDescription,
    formulaBenefits: item.benefits || ACCESSORY_BENEFITS,
    howToUse: item.howToUse,
    inci: ACCESSORY_INCI,
    features: item.features,
    badges: ["cruelty_free"],
    shades: [],
    variants: [
      {
        id: `var-${item.ean}`,
        name: item.variantName,
        sku: item.ean,
        ean: item.ean,
        colorHex: null,
        image: PACKSHOT,
        inStock: true,
        price: item.price,
        originalWholesalePrice: item.wholesale,
        stock: item.stock,
      },
    ],
    images: [PACKSHOT],
    stock: item.stock,
    inStock: true,
  };
}

function main() {
  if (!fs.existsSync(CATALOG_PATH)) {
    throw new Error(`Catalogo non trovato: ${CATALOG_PATH}`);
  }

  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));
  if (!Array.isArray(catalog)) {
    throw new Error("Il catalogo non è un array JSON.");
  }

  const groupedIndex = catalog.findIndex((p) => p.id === GROUPED_ID);
  if (groupedIndex === -1) {
    throw new Error(`Scheda raggruppata "${GROUPED_ID}" non trovata.`);
  }
  const grouped = catalog[groupedIndex];

  // Validazione: i 12 EAN devono corrispondere esattamente a quelli attesi.
  const expectedEans = ITEMS.map((i) => i.ean).sort();
  const groupedEans = (grouped.variants || []).map((v) => v.ean).sort();
  if (JSON.stringify(expectedEans) !== JSON.stringify(groupedEans)) {
    throw new Error(
      `Gli EAN della scheda raggruppata non corrispondono.\nAttesi: ${expectedEans.join(
        ", "
      )}\nTrovati: ${groupedEans.join(", ")}`
    );
  }

  const newProducts = ITEMS.map(buildProduct);

  // Sostituzione atomica della scheda raggruppata con le 12 schede autonome.
  catalog.splice(groupedIndex, 1, ...newProducts);

  // Controlli di integrità pre-scrittura.
  const ids = new Set(catalog.map((p) => p.id));
  if (ids.size !== catalog.length) throw new Error("Rilevati ID duplicati nel catalogo.");
  const slugs = new Set(catalog.map((p) => p.slug));
  if (slugs.size !== catalog.length) throw new Error("Rilevati slug duplicati nel catalogo.");
  for (const p of newProducts) {
    if (p.shades.length !== 0) throw new Error(`shades non vuoto per ${p.id}`);
    if (p.variants.length !== 1) throw new Error(`varianti != 1 per ${p.id}`);
    if (p.variants[0].ean !== p.variants[0].sku)
      throw new Error(`SKU/EAN non allineati per ${p.id}`);
    if (p.category !== "Beauty & Accessori")
      throw new Error(`Categoria errata per ${p.id}: ${p.category}`);
  }

  fs.writeFileSync(CATALOG_PATH, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");

  console.log(
    `OK: rimossa "${GROUPED_ID}" e inserite ${newProducts.length} schede autonome.`
  );
  console.log(`Totale prodotti: ${catalog.length}`);
  for (const p of newProducts) {
    console.log(
      `  - ${p.id} | EAN ${p.variants[0].ean} | €${p.price.toFixed(2)} | wholesale €${p.originalWholesalePrice.toFixed(2)} | stock ${p.stock}`
    );
  }
}

main();
