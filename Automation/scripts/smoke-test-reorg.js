#!/usr/bin/env node
/**
 * Smoke test after Provider × Journey reorg.
 * Runs: auth, create-order for key journeys, detect position, resume step-1 parse.
 */
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const path = require('path');
const core = require('../core');

core.init(path.resolve(__dirname, '..', '..'), (t, m) => {
  if (['ERROR', 'WARN', 'START', 'AUTH', 'STEP', 'STATE', 'BRIDGE'].includes(t)) {
    console.log(`[${t}] ${m}`);
  }
});

const { JOURNEY_REGISTRY } = require('../journeys/registry');
const { resolveNetworkCategory, NETWORK_CATEGORY } = require('../providers/network-category');
const { executeStep } = require('../runner/step-executor');
const { detectOrderPosition } = require('../runner/state-detector');
const { buildOrderDetailUrl } = require('../lib/url-builder');
const { extractSubState } = require('../lib/state');
const { buildB2bUrl } = require('../lib/url-builder');

const ENV = process.env.SMOKE_ENV || 'Dev 2';

const CASES = [
  {
    name: 'mobily-activation',
    opts: { me: 0, customerType: 'Regular-Customer', paymentType: 'Postpaid' },
  },
  { name: 'stc-activation', opts: { me: 0 } },
  // Bru paths only — .bru files reference fixed inventory IDs that may be in-flight/missing on Dev 2.
  { name: 'dawiyat-relocation', opts: { me: 0 }, parseOnly: true },
  { name: 'stc-resume', opts: {}, parseOnly: true },
];

/** Telflow API expects `FTTH CONSUMER` / `FTTH RCY` (see AGENTS.md). */
function apiNetworkCategory(opts) {
  const nc = resolveNetworkCategory(opts);
  return nc === NETWORK_CATEGORY.RCY ? 'FTTH RCY' : 'FTTH CONSUMER';
}

async function orderSubState(vars) {
  const res = await core.httpRequest('GET', buildOrderDetailUrl(vars), {
    Authorization: `Bearer ${vars.authToken}`,
  });
  return extractSubState(res.body?.data || res.body);
}

async function latestB2bState(vars) {
  const res = await core.httpRequest('GET', buildB2bUrl(vars), {
    Authorization: `Bearer ${vars.authToken}`,
  });
  const rows = res.body?.data?.Rows || [];
  for (const msg of rows) {
    const raw = msg.Message?.Data;
    if (!raw || typeof raw !== 'string') continue;
    try {
      const data = JSON.parse(raw);
      const st = data?.event?.salesOrder?.orderState;
      if (st) return st;
    } catch {
      /* ignore */
    }
  }
  return null;
}

async function runCreateSmoke(testCase) {
  const entry = JOURNEY_REGISTRY[testCase.name];
  if (!entry) throw new Error(`Unknown journey ${testCase.name}`);

  const vars = core.parseEnvFile(ENV);
  await core.doAuth(vars, ENV);

  const steps = entry.build(testCase.opts);
  const createStep = steps.find((s) => s.type === 'create');
  if (!createStep?.file) throw new Error(`No create step for ${testCase.name}`);

  console.log(`\n=== ${testCase.name} ===`);
  console.log(`CREATE ${createStep.file}`);

  const apiNc = apiNetworkCategory(testCase.opts);
  if (createStep.vars) createStep.vars.networkCategory = apiNc;
  else createStep.vars = { networkCategory: apiNc };
  const ctx = { opts: testCase.opts, notifyNum: 0, notifyCount: 0 };
  await executeStep(createStep, vars, ctx);
  if (!vars.orderId) throw new Error('orderId not set after create');

  const subState = await orderSubState(vars);
  console.log(`PASS create -> orderId=${vars.orderId} state=${subState}`);

  const b2b = await latestB2bState(vars);
  const detected = detectOrderPosition(subState, b2b, testCase.name);
  if (detected) {
    console.log(
      `DETECT step=${detected.currentStep} next="${detected.nextStepLabel}" (${detected.completedSteps.length}/${detected.totalSteps} done)`,
    );
  } else {
    console.log('DETECT (early — no stateMap match yet, expected right after create)');
  }

  return { vars, detected, createStep };
}

async function runParseOnlySmoke(testCase) {
  const entry = JOURNEY_REGISTRY[testCase.name];
  if (!entry) throw new Error(`Unknown journey ${testCase.name}`);

  const steps = entry.build(testCase.opts);
  const createStep = steps.find((s) => s.type === 'create');
  if (!createStep?.file) throw new Error(`No create step for ${testCase.name}`);

  console.log(`\n=== ${testCase.name} (parse-only) ===`);
  const parsed = core.parseBruFile(createStep.file);
  console.log(`PARSE ${createStep.file} (${parsed.method}) OK`);

  const notify = steps.find((s) => s.type === 'notify');
  if (notify?.file) {
    const np = core.parseBruFile(notify.file);
    console.log(`PARSE notify -> ${notify.file} (${np.method}) OK`);
  }
}

async function runResumeParseSmoke(name, orderId) {
  const entry = JOURNEY_REGISTRY[name];
  const vars = core.parseEnvFile(ENV);
  vars.orderId = orderId;
  await core.doAuth(vars, ENV);

  const subState = await orderSubState(vars);
  const b2b = await latestB2bState(vars);
  const detected = detectOrderPosition(subState, b2b, name);
  const steps = entry.build({ me: 0, customerType: 'Regular-Customer', paymentType: 'Postpaid' });
  const stepNum = detected?.currentStep ?? 3;
  const next = steps.find((s) => s.step === stepNum && s.type === 'notify');
  if (next?.file) {
    const parsed = core.parseBruFile(next.file);
    console.log(`RESUME-PARSE ${name} step ${stepNum} -> ${next.file} (${parsed.method}) OK`);
  } else {
    const createFile = steps.find((s) => s.type === 'create')?.file;
    core.parseBruFile(createFile);
    console.log(`RESUME-PARSE ${name} step ${stepNum} — bru paths OK (${createFile})`);
  }
  return detected;
}

(async () => {
  console.log(`Smoke test env: ${ENV}`);
  const results = [];

  for (const tc of CASES) {
    try {
      if (tc.parseOnly) {
        await runParseOnlySmoke(tc);
        results.push({ journey: tc.name, ok: true });
        continue;
      }
      const r = await runCreateSmoke(tc);
      results.push({ journey: tc.name, ok: true, orderId: r.vars.orderId });
    } catch (e) {
      console.error(`FAIL ${tc.name}: ${e.message}`);
      results.push({ journey: tc.name, ok: false, error: e.message });
    }
  }

  const mobily = results.find((r) => r.journey === 'mobily-activation' && r.ok);
  if (mobily?.orderId) {
    try {
      await runResumeParseSmoke('mobily-activation', mobily.orderId);
      results.push({ journey: 'mobily-resume-parse', ok: true });
    } catch (e) {
      console.error(`FAIL mobily-resume-parse: ${e.message}`);
      results.push({ journey: 'mobily-resume-parse', ok: false, error: e.message });
    }
  }

  // Shared WFM path sanity (post-reorg)
  const wfm = core.parseBruFile('Shared-Workflows/WFM-CPE/Phase 1/Step-01-CPE-1000-OK.bru');
  console.log(`\nOK  shared-wfm-cpe-path (${wfm.method})`);

  console.log('\n=== SUMMARY ===');
  for (const r of results) {
    console.log(`${r.ok ? 'OK' : 'FAIL'}  ${r.journey}${r.orderId ? ` (${r.orderId})` : ''}${r.error ? ` — ${r.error}` : ''}`);
  }

  const failed = results.filter((r) => !r.ok);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
