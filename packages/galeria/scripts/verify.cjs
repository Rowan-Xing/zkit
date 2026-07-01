const assert = require('node:assert/strict');

const galeria = require('../dist');

assert.equal(typeof galeria.createGaleria, 'function');
assert.equal(typeof galeria.GaleriaViewer, 'function');
assert.equal(typeof galeria.sourceRectFromElement, 'function');

console.log('zkit-galeria verify passed');
