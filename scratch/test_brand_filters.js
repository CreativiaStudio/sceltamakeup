const path = require('path');
const c = require('../data/catalog.json');
const ddpDirect = c.filter(p => p.brand === 'Diego dalla Palma');
const rvbDirect = c.filter(p => p.brand === 'RVB LAB');
console.log('Diego dalla Palma products count:', ddpDirect.length);
console.log('RVB LAB products count:', rvbDirect.length);

const testFilter = (brand) => {
  return c.filter(product => {
    return product.brand === brand ||
      (brand === 'Diego dalla Palma' && product.brand.toLowerCase().includes('diego dalla palma')) ||
      (brand === 'RVB LAB' && product.brand.toLowerCase().includes('rvb lab'));
  });
};

console.log('Filtered by Diego dalla Palma:', testFilter('Diego dalla Palma').length);
console.log('Filtered by RVB LAB:', testFilter('RVB LAB').length);
