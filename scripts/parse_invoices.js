const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

async function inspectPdf(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdf(dataBuffer);
  console.log(`=== FILE: ${path.basename(filePath)} ===`);
  console.log(`Pages: ${data.numpages}`);
  console.log(`Text preview (first 1000 chars):`);
  console.log(data.text.substring(0, 1000));
  console.log(`\n------------------------------------\n`);
  return data.text;
}

async function run() {
  const ddpPath = path.join(__dirname, '../Fatture Diego della Palma/Prodotti Diego della palma.pdf');
  if (fs.existsSync(ddpPath)) {
    const text = await inspectPdf(ddpPath);
    fs.writeFileSync(path.join(__dirname, 'ddp_text.txt'), text);
  }

  for (let i = 1; i <= 5; i++) {
    const cipriaPath = path.join(__dirname, `../Fatture Cipria Makeup/FEDERICA CESIANO - MOBILE ${i}.pdf`);
    if (fs.existsSync(cipriaPath)) {
      const text = await inspectPdf(cipriaPath);
      fs.writeFileSync(path.join(__dirname, `cipria_mobile_${i}_text.txt`), text);
    }
  }
}

run().catch(console.error);
