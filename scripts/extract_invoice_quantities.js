const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { PDFParse } = require('pdf-parse');

const BASE_DIR = 'c:/Users/mario/Progetti Antigravity/Scelta Makeup';

async function extractDdp() {
  console.log('--- Extracting Diego della Palma / RVB LAB DDT ---');
  const ddpBuf = fs.readFileSync(path.join(BASE_DIR, 'Fatture Diego della Palma/Prodotti Diego della palma.pdf'));
  
  function getDdpObj(id) {
    const marker = id + ' 0 obj';
    const idx = ddpBuf.indexOf(Buffer.from(marker));
    if (idx === -1) return '';
    const sIdx = ddpBuf.indexOf(Buffer.from('stream'), idx);
    if (sIdx === -1) return '';
    const eIdx = ddpBuf.indexOf(Buffer.from('endstream'), sIdx);
    let dataStart = sIdx + 6;
    if (ddpBuf[dataStart] === 13) dataStart++;
    if (ddpBuf[dataStart] === 10) dataStart++;
    const raw = ddpBuf.subarray(dataStart, eIdx);
    try { return zlib.inflateSync(raw).toString('latin1'); } catch (e) { return raw.toString('latin1'); }
  }

  const textObjIds = [10, 20, 28, 36, 44, 52, 60, 68, 76, 84, 92, 100, 108, 116, 124, 132, 142, 150, 158, 166, 174, 182, 190, 198];
  const items = [];
  
  for (let p = 0; p < textObjIds.length; p++) {
    const str = getDdpObj(textObjIds[p]);
    const lines = str.split('\n');
    let currentFont = '';
    const pageLines = [];
    for (const line of lines) {
      if (line.includes('/FFN')) currentFont = 'FFN';
      else if (line.includes('/FN')) currentFont = 'FN';
      const m = line.match(/\((.*?)\)\s*Tj/);
      if (m && currentFont === 'FFN') pageLines.push(m[1]);
    }
    for (let i = 0; i < pageLines.length; i++) {
      const line = pageLines[i];
      const prodMatch = line.match(/^([A-Z0-9]{4,14})\s+(.*?)\s+(\d{13})\s+PZ\s+(\d+)/);
      if (prodMatch) {
        const code = prodMatch[1].trim();
        let desc = prodMatch[2].trim();
        const ean = prodMatch[3].trim();
        const qty = parseInt(prodMatch[4].trim(), 10);
        if (i + 1 < pageLines.length) {
          const nextLine = pageLines[i + 1];
          if (nextLine.startsWith('                  ') && !nextLine.match(/\d{13}/)) {
            desc += ' ' + nextLine.trim();
          }
        }
        items.push({ code, desc, ean, qty, page: p + 1 });
      }
    }
  }

  console.log(`Extracted ${items.length} total rows from DDP PDF.`);
  return items;
}

async function extractCipria() {
  console.log('--- Extracting Cipria Makeup Mobile 1-5 PDFs ---');
  const items = [];
  for (let fileIdx = 1; fileIdx <= 5; fileIdx++) {
    const filePath = path.join(BASE_DIR, `Fatture Cipria Makeup/FEDERICA CESIANO - MOBILE ${fileIdx}.pdf`);
    const buf = fs.readFileSync(filePath);
    const parser = new PDFParse({ data: buf });
    await parser.load();
    const res = await parser.getText();
    const lines = res.text.split('\n').map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
      const m = line.match(/^(\d+)\s+Pz\s+([\d,.]+)\s+(\d+)\s+([\d,.]+)\s+(.*?)\s+(\d{13})$/);
      if (m) {
        let desc = m[5].trim().replace(/\s+[\d,.]+%?$/, '').trim();
        items.push({
          qty: parseInt(m[1], 10),
          unitPrice: parseFloat(m[2].replace(',', '.')),
          vat: parseInt(m[3], 10),
          total: parseFloat(m[4].replace(',', '.')),
          desc,
          ean: m[6],
          file: `MOBILE ${fileIdx}`
        });
      }
    }
  }
  console.log(`Extracted ${items.length} total rows from Cipria PDFs.`);
  return items;
}

async function run() {
  const ddp = await extractDdp();
  const cipria = await extractCipria();

  fs.writeFileSync(path.join(BASE_DIR, 'scripts/raw_ddp_items.json'), JSON.stringify(ddp, null, 2));
  fs.writeFileSync(path.join(BASE_DIR, 'scripts/raw_cipria_items.json'), JSON.stringify(cipria, null, 2));

  // Summary stats
  console.log('--- STATS ---');
  const ddpTotalQty = ddp.reduce((sum, item) => sum + item.qty, 0);
  const cipriaTotalQty = cipria.reduce((sum, item) => sum + item.qty, 0);
  console.log(`Diego della Palma: ${ddp.length} righe, ${ddpTotalQty} pezzi totali`);
  console.log(`Cipria Makeup: ${cipria.length} righe, ${cipriaTotalQty} pezzi totali`);
}

run().catch(console.error);
