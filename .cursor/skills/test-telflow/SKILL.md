---
name: test-telflow
description: Run one-shot Node checks against a Telflow environment for the FTTH Mobily project — auth, create order, send notifications, wait for/inspect order state, or read B2B messages. Use when the user asks to test, reproduce, verify, or debug a journey/notification/order against Dev 2, SIT, or any environment in Automation/environments.
---

# Test Telflow (one-shot Node checks)

Reproduce and verify behavior against a live Telflow env using the project's
own `Automation/core.js`. Always run from the project root (the folder that
contains `Automation/`).

## Boilerplate

Telflow envs use self-signed certs, so TLS rejection MUST be disabled.

```bash
node -e "
process.env.NODE_TLS_REJECT_UNAUTHORIZED='0';
const core=require('./Automation/core.js');
core.init(process.cwd(),(t,m)=>console.log('['+t+']',m));
(async()=>{
  const v=core.parseEnvFile('Dev 2');   // env name = file in environments/ without .bru
  await core.doAuth(v,'Dev 2');
  // --- test body here (set v.orderId etc.) ---
})().catch(e=>{console.error(e);process.exit(1);});
"
```

## Common building blocks

Set IDs on `v` before calling (e.g. `v.orderId='ORD...'`, `v.svActionId='MOB-FTTH-01'`).

- Create order: `await core.doCreateOrder(v, bruPath)` → sets `v.orderId`.
- Send a notification: `await core.doNotification(v, bruPath)`.
- Inspect current state: `console.log(await core.doCheckState(v))`.
- Wait for a state: `await core.doWaitForOrderState(v, 'In Progress|Pre-Completion', 5, 8000)`
  (args: target, maxAttempts, intervalMs — keep attempts small for tests).
- Read order detail sub-state:
  ```js
  const { buildOrderDetailUrl } = require('./Automation/lib/url-builder');
  const { extractSubState } = require('./Automation/lib/state');
  const r = await core.httpRequest('GET', buildOrderDetailUrl(v), { Authorization:'Bearer '+v.authToken });
  console.log(extractSubState(r.body?.data||r.body));
  ```
- List B2B messages:
  ```js
  const { buildB2bUrl } = require('./Automation/lib/url-builder');
  const b = await core.httpRequest('GET', buildB2bUrl(v), { Authorization:'Bearer '+v.authToken });
  for (const m of (b.body?.data?.Rows||[])) console.log(m.Action, '|', (m.Message?.Data||'').slice(0,120).replace(/\n/g,' '));
  ```
- Render a `.bru` payload without sending (to inspect substituted values):
  ```js
  const p = core.parseBruFile(bruPath);
  console.log(core.cleanJsonBody(core.subVars(p.body, v)));
  ```

## Rules

- Never hardcode credentials; they come from `environments/<env>.bru`.
- Prefer short timeouts/attempts so the check returns quickly.
- For long waits, run with a larger `block_until_ms` and let it complete;
  don't poll aggressively.
- Remember the domain quirks (see `AGENTS.md`): `networkCategory` casing, SV
  payload `status: completed`, ME delay 20s, wait for B2B Pending UAT before SV
  UAT, strip stale per-order IDs on resume.
