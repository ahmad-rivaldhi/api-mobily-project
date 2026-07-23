# FTTH Mobily Project

Bruno API collection and automation engine for FTTH order flows (Mobily + OpenAccess: STC, ITC, ACES, DOWIYAT).

Layout: **Provider × Journey**, with shared WFM / TMF641 / SingleView under `Shared-Workflows/`.

## Structure

```
├── Authentication/          # OAuth per env
├── Mobily/{Journey}/
├── OpenAccess/{Provider}/{Journey}/
├── Shared-Workflows/        # WFM-CPE, WFM-ME, TMF641, SingleView, Create-Service-OA
├── Search-By-SAN-CPE/
├── Automation/              # engine (paths.js is source of truth)
└── environments/            # secrets — not committed
```

| Put here | Path |
|----------|------|
| Mobily create / journey request | `Mobily/{Journey}/` |
| OA create / ONT / failure | `OpenAccess/{Provider}/{Journey}/` |
| WFM, TMF641, SingleView | `Shared-Workflows/` |

### Naming (short)

- Folders: kebab (`Device-Swap`, `ONT-Installation`, `622-Create-Sales-Order`)
- Create order: `MOB-FTTH-Consumer[-N-ME].bru` / `{PROVIDER}-FTTH[-N-ME].bru` (no prepaid/postpaid split)
- OA ONT steps: `Step-NN-{PROVIDER}-{Action}.bru`
- Installation failure: `{SCOPE}-IF-T{n}[-V{n}][-{Code}]-{Reason}.bru`
- Paths for the runner live in `Automation/constants/paths.js`

### Activation paths

| Flow | Create | Notify |
|------|--------|--------|
| Mobily | `Mobily/Activation/622-Create-Sales-Order/` | Shared WFM-CPE → TMF641 → SingleView |
| OA | `OpenAccess/{P}/Activation/622-Create-Sales-Order/` | `Activation/ONT-Installation/` (no Mobily WFM CPE, no SV UAT) |

`networkCategory` is case-sensitive (`FTTH Consumer` / `FTTH RCY`). Source: `Automation/providers/network-category.js`.

## Journeys

| Journey | Mobily | OpenAccess | Example IDs |
|---------|--------|------------|-------------|
| Activation | yes | STC, ITC, ACES, DOWIYAT | `mobily-activation`, `aces-activation` |
| Failure | yes | yes (all OA) | `mobily-failure`, `aces-failure` |
| Relocation / Device-Swap / Rewiring | yes | yes | `aces-relocation` |
| Suspend / Resume / Termination | yes* | yes | `aces-suspend` |
| Maintenance / Upgrade / Downgrade | yes | yes (ACES+peers) | `aces-maintenance` |
| ME-Standalone | yes | yes | manual / Bruno |

\*Mobily has Suspend/Termination; Resume is OA-focused in the registry.

ACES installation-failure payloads use `providerStatus` / `providerMilestone` = `Pending`.

## Environments

Local `environments/*.bru` only (never commit). Typical vars: `authToken`, `orderId`, work-order IDs, OA installation IDs (`stcInstallationId`, `itcInstallationId`, `acesInstallationId`, `dawiyatInstallationId`), ACES device fields.

## Quick test

```bash
node -e "
process.env.NODE_TLS_REJECT_UNAUTHORIZED='0';
const core=require('./Automation/core.js');
core.init(process.cwd(),(t,m)=>console.log('['+t+']',m));
(async()=>{
  const v=core.parseEnvFile('Dev 2');
  await core.doAuth(v,'Dev 2');
})().catch(console.error);
"

node --test Automation/test/*.test.js
```

CLI journey example:

```bash
node Automation/journey-runner.js --env "Dev 2" --journey aces-activation --me 0
```

## Toolkit

UI lives in the sibling **FTTH-Mobily-Toolkit** repo. It loads this engine via the npm package or a local sibling `Automation/` path in dev.
