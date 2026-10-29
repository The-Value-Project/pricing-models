'use strict';
// Phase 3: price resolution (7.4). A replaced line skips the commitment plan and bundles.
const { overrides } = require('./adj');
const { applyPlan } = require('./plans');
const { setupBundles, applyBundles } = require('./bundles');
const { applyReplacements } = require('./replace');

function phase3(S, lines) {
  setupBundles(S);
  const ovs = overrides(S);
  for (const l of lines) {
    if (applyReplacements(S, l, ovs) || l.kind !== 'module') continue;
    applyPlan(S, l);
    applyBundles(S, l);
  }
}
module.exports = { phase3 };
