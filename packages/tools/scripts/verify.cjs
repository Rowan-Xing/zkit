const assert = require('node:assert/strict');

const tools = require('../dist');

assert.equal(tools.wp(10), 10);
assert.equal(tools.sp(10), 10);
assert.equal(tools.resolveDeviceBrand({ os: 'ios' }), 'apple');
assert.equal(tools.resolveDeviceBrand({ os: 'android', brand: 'HONOR' }), 'honor');
assert.equal(tools.resolveDeviceBrand({ os: 'android', brand: 'Redmi' }), 'redmi');

const calls = [];
let currentPath = '/home';
const listeners = new Set();
const router = {
  push(path) {
    calls.push(`push:${path}`);
    currentPath = path;
    for (const listener of listeners) listener();
  },
  back() {
    calls.push('back');
    currentPath = '/home';
    for (const listener of listeners) listener();
  },
};

const guard = tools.createRouterGuard({
  router,
  lockMs: 1000,
  getCurrentPath: () => currentPath,
  subscribeToStateChange(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
});

router.push('/detail');
router.push('/detail');
assert.deepEqual(calls, ['push:/detail']);
router.back();
router.push('/settings');
assert.deepEqual(calls, ['push:/detail', 'back', 'push:/settings']);
guard.destroy();

console.log('zkit-tools verify passed');
