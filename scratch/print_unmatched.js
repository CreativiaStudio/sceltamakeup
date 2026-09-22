const fs = require('fs');
const all = JSON.parse(fs.readFileSync('scratch/all_86_matched.json', 'utf8'));
const unmatched = all.filter(p => p.source === 'UNMATCHED');
console.log('Unmatched items (' + unmatched.length + '):');
unmatched.forEach((p, idx) => {
  console.log((idx + 1) + '. SKU: ' + p.sku.padEnd(10) + ' | EAN: ' + p.ean.padEnd(14) + ' | Cost: ' + (p.wholesaleCost + '€').padEnd(6) + ' | ' + p.invoiceDesc);
});
