#!/usr/bin/env node
/**
 * FTTH Mobily Journey Runner — slim CLI over core.js
 *
 * Requirements: Node.js 18+
 */

const path = require('path');
const core = require('./core');

core.init(path.resolve(__dirname, '..'));
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const {
  parseEnvFile,
  doAuth,
  runJourney,
  JOURNEYS,
  doCheckState,
  doListB2b,
  doExtractAllIds,
  doTriggerSvNotification,
  doListTasks,
  doCompleteTask,
  getJourneyStepLabels,
  log,
} = core;

const SV_TYPES = 'provisioning-completed, uat-completed, pre-completion, odb-patch';

function collectTasks(body) {
  if (!body) return [];
  if (Array.isArray(body)) return body;
  const d = body.data;
  if (Array.isArray(d)) return d;
  if (d && Array.isArray(d.tasks)) return d.tasks;
  if (Array.isArray(body.tasks)) return body.tasks;
  if (Array.isArray(body.items)) return body.items;
  return [];
}

function taskStatusLower(t) {
  const s = t.status ?? t.State ?? t.TaskStatus ?? t.taskStatus ?? t.statusName;
  return String(s ?? '').toLowerCase();
}

function getTaskId(t) {
  return t.id ?? t.Id ?? t.taskId ?? t.TaskId;
}

/**
 * List tasks, then complete any whose status indicates exception or failed.
 */
async function runClaimException(vars) {
  const res = await doListTasks(vars);
  const tasks = collectTasks(res.body);
  log('ACTION', `Found ${tasks.length} task(s)`);
  const toComplete = tasks.filter((t) => {
    const st = taskStatusLower(t);
    return st.includes('exception') || st.includes('failed');
  });
  if (toComplete.length === 0) {
    log('ACTION', 'No tasks with exception/failed status');
    console.log(JSON.stringify({
      completed: [],
      tasks: tasks.map((t) => ({ id: getTaskId(t), status: taskStatusLower(t) })),
    }, null, 2));
    return;
  }
  const results = [];
  for (const t of toComplete) {
    const id = getTaskId(t);
    if (!id) continue;
    log('ACTION', `Completing task ${id} (${taskStatusLower(t)})`);
    const cres = await doCompleteTask(vars, id);
    results.push({ taskId: id, httpStatus: cres.status, ok: cres.ok, body: cres.body });
  }
  console.log(JSON.stringify({ completed: results }, null, 2));
}

async function runToolkitAction(action, envName, cli) {
  const vars = parseEnvFile(envName);
  vars.orderId = cli.orderId;
  if (cli.svActionId) vars.svActionId = cli.svActionId;
  if (cli.serviceOrderId) vars.serviceOrderId = cli.serviceOrderId;

  await doAuth(vars, envName);

  switch (action) {
    case 'check-state': {
      const out = await doCheckState(vars);
      console.log(JSON.stringify(out, null, 2));
      break;
    }
    case 'list-b2b': {
      const rows = await doListB2b(vars);
      console.log(JSON.stringify(rows, null, 2));
      break;
    }
    case 'extract-ids': {
      const me = parseInt(cli.me || '0', 10);
      const out = await doExtractAllIds(vars, { me });
      console.log(JSON.stringify(out, null, 2));
      break;
    }
    case 'trigger-sv': {
      if (!cli.type) {
        throw new Error(`--type is required for trigger-sv (${SV_TYPES})`);
      }
      const res = await doTriggerSvNotification(vars, cli.type);
      console.log(JSON.stringify({ ok: res.ok, status: res.status, body: res.body }, null, 2));
      break;
    }
    case 'claim-exception': {
      await runClaimException(vars);
      break;
    }
    default:
      throw new Error(`Unknown action "${action}". Use: check-state, list-b2b, extract-ids, trigger-sv, claim-exception`);
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {};
  const keyMap = {
    'resume-from': 'resumeFrom',
    'list-journeys': 'listJourneys',
  };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--list-journeys') {
      opts.listJourneys = true;
      continue;
    }
    if (a === '--help' || a === '-h') {
      opts.help = true;
      continue;
    }
    if (a.startsWith('--') && i + 1 < args.length && !args[i + 1].startsWith('-')) {
      let key = a.slice(2);
      key = keyMap[key] || key;
      opts[key] = args[++i];
    }
  }
  return opts;
}

function printHelp() {
  const steps = getJourneyStepLabels();
  const stepLines = steps.map((s) => `    ${String(s.num).padStart(2)}  ${s.label}`).join('\n');

  console.log(`
FTTH Mobily Journey Runner
==========================

Usage (journey):
  node journey-runner.js --env <name> --journey <name> [options]

Usage (toolkit actions):
  node journey-runner.js --env <name> --action <name> --orderId <id> [options]

Other:
  node journey-runner.js --list-journeys
  node journey-runner.js --help

Required (journey mode):
  --env <name>         Environment ("Dev 1", "Dev 2", "SIT", "Dev On Prem", ...)
  --journey <name>     Journey to run (see --list-journeys)

Required (action mode):
  --env <name>
  --action <name>      Toolkit: check-state | list-b2b | extract-ids | trigger-sv | claim-exception
  --orderId <id>       Business interaction / order id

Journey options:
  --me <0|1|2|3>       Mesh Extenders count (default: 0)
  --customerType <t>   Regular-Customer or Royal-Customer (default: Regular-Customer)
  --paymentType <t>    Postpaid or Prepaid (default: Postpaid)
  --resume-from <n>    Resume from journey step (1 = from auth; skips earlier numbered steps)
  --orderId <id>       Pre-seed when resuming past create (step 2)
  --svActionId <id>    Pre-seed SingleView external id when needed
  --serviceOrderId <id> Pre-seed service order id when needed

Action options:
  --type <type>        For --action trigger-sv only (${SV_TYPES})
  --me <n>             For extract-ids (mesh-related order detail)

Journey steps (for --resume-from):
${stepLines}

Examples:
  node journey-runner.js --env "Dev 2" --journey mobily-activation
  node journey-runner.js --env "Dev 2" --journey mobily-activation --me 1
  node journey-runner.js --env "Dev 2" --journey mobily-activation --resume-from 7 --orderId ORD...
  node journey-runner.js --env "Dev 2" --action check-state --orderId ORD...
  node journey-runner.js --env "Dev 2" --action trigger-sv --type provisioning-completed --orderId ORD...
  node journey-runner.js --env "Dev 2" --action claim-exception --orderId ORD...
`);
}

async function main() {
  const opts = parseArgs();

  if (opts.help) {
    printHelp();
    process.exit(0);
  }

  if (opts.listJourneys) {
    console.log('\nAvailable journeys:');
    Object.keys(JOURNEYS).forEach((j) => console.log(`  - ${j}`));
    console.log('');
    process.exit(0);
  }

  if (opts.action) {
    if (!opts.env) {
      console.error('Error: --env is required');
      process.exit(1);
    }
    if (!opts.orderId) {
      console.error('Error: --orderId is required for toolkit actions');
      process.exit(1);
    }
    try {
      await runToolkitAction(opts.action, opts.env, opts);
    } catch (err) {
      log('ERROR', err.message);
      if (err.stack) log('ERROR', err.stack.split('\n').slice(1, 4).join('\n'));
      process.exit(1);
    }
    return;
  }

  if (opts.journey) {
    if (!opts.env) {
      console.error('Error: --env is required');
      process.exit(1);
    }
    try {
      await runJourney(opts.journey, opts.env, {
        me: parseInt(opts.me || '0', 10),
        provider: opts.provider,
        customerType: opts.customerType,
        paymentType: opts.paymentType,
        resumeFrom: opts.resumeFrom != null ? Number(opts.resumeFrom) : undefined,
        orderId: opts.orderId,
        svActionId: opts.svActionId,
        serviceOrderId: opts.serviceOrderId,
      });
    } catch (err) {
      log('ERROR', err.message);
      if (err.stack) log('ERROR', err.stack.split('\n').slice(1, 3).join('\n'));
      process.exit(1);
    }
    return;
  }

  console.error('Error: specify --journey, --action, --list-journeys, or --help');
  process.exit(1);
}

main();
