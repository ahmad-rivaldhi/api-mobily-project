# FTTH - Mobily - Project

**Provider × Journey + Shared API Collection for FTTH (Fiber To The Home) — Mobily Implementation**

---

## 📋 **Table of Contents**

1. [Overview](#overview)
2. [Project Structure](#project-structure)
3. [Environments](#environments)
4. [Journey Guide](#journey-guide)
5. [Getting Started](#getting-started)

---

## 🎯 **Overview**

This Bruno API collection covers FTTH order flows for Mobily and OpenAccess providers (STC, ITC, ACES, DOWIYAT).

**Key design:** Provider-specific TMF622 and OA notifications live under `Mobily/{Journey}/` or `OpenAccess/{Provider}/{Journey}/`. Cross-journey steps (WFM CPE/ME, TMF641, SingleView) live under `Shared-Workflows/` — one set, reused by the automation engine and toolkit.

**Total APIs:** ~400+ `.bru` files across providers and journeys.

---

## 📁 **Project Structure**

```
FTTH - Mobily - Project/
├── environments/
├── Authentication/
├── Mobily/                      # Mobily × journey
├── OpenAccess/                  # STC | ITC | ACES | DOWIYAT × journey
├── Shared-Workflows/            # WFM-CPE, WFM-ME, TMF641, SingleView
├── Search-By-SAN-CPE/
├── Automation/
└── Documentation/

**Where to put new requests**

| Request type | Folder |
|--------------|--------|
| Mobily TMF622 per journey | `Mobily/{Journey}/` |
| OA TMF622 / OA notifications | `OpenAccess/{Provider}/{Journey}/` |
| WFM, TMF641, SingleView | `Shared-Workflows/` |
```

---

## 🌍 **Environments**

### **awsDev** (AWS Development)
- **Base URL:** `https://mobily-dev.live.demo-in.telflow.com`
- **Purpose:** AWS-hosted development environment

### **devOnPrem** (On-Premise Development)
- **Base URL:** `https://mobily-onprem.dev.telflow.com`
- **Purpose:** On-premise development environment

### **Environment Variables:**
- `authToken` - Dynamic authentication token
- `orderId`, `externalId` - Order identifiers
- `workOrderIdCpe`, `workOrderIdMe` - Work order IDs
- `customerId`, `customerSAN`, `customerCAN` - Customer details
- `ftthSAI`, `feasibilityId`, `odbId` - FTTH specific IDs
- `meshExtender1/2/3` - Mesh extender integration IDs
- `dawiyatInstallationId`, `itcInstallationId`, `stcInstallationId`, `acesInstallationId` - Provider IDs
- `acesServiceAccNum`, `acesCpeIntegrationId`, `acesCpeSerialNumber` - ACES-specific IDs
- `customerCategory`, `networkCategory` - **TMF 622 Phase 4B** characteristic defaults (overridden per-folder)

---

## 🆕 **What's New (Phase 4B - 18 Apr update)**

### 1. `networkCategory` is now mandatory in all TMF 622 payloads

The TMF 622 Phase 4B update (18 Apr; external spec doc, not bundled in this
repo) introduces a new mandatory characteristic on every Create Product Order
request:

| Customer Type | `customerCategory` | `networkCategory` |
|---------------|--------------------|-------------------|
| Regular       | `Regular`          | `FTTH CONSUMER`   |
| Royal (RCY)   | `Royal`            | `FTTH RCY`        |
| VIP           | `Vip`              | `FTTH CONSUMER`   |

> **Case-sensitive:** the API only accepts the UPPERCASE values `FTTH CONSUMER`
> / `FTTH RCY`. The engine's single source of truth is
> `Automation/providers/network-category.js`; folder defaults, the smoke test,
> and these docs all derive from it.

`networkCategory` is now the **primary differentiator** between Regular and
RCY customers — replacing the historical practice of relying on separate folders.

#### How this is wired in the collection (single source of truth)

Every TMF 622 `.bru` references the values via `{{customerCategory}}` and
`{{networkCategory}}`. The actual values are sourced from folder-level
`vars:pre-request` blocks:

| Folder | `customerCategory` | `networkCategory` |
|--------|---------------------|---------------------|
| `Mobily/Activation/TMF-622 Create Sales Order/FTTH Consumer/` | `Regular` | `FTTH CONSUMER` |
| `Mobily/Activation/TMF-622 Create Sales Order/FTTH RCY/`      | `Royal`   | `FTTH RCY`          |
| `OpenAccess/{Provider}/Activation/`                           | `Regular` | `FTTH CONSUMER` |

Override at the request level (in another `vars:pre-request` block inside the
`.bru`) only when you need to test an edge case (e.g. an OA Royal scenario).

### 2. New Open Access Provider — **ACES**

ACES is a new infrastructure provider added in phase 4B. Notification flows
are mapped under `OpenAccess/ACES/`.

| Sub-folder | Purpose |
|------------|---------|
| OA ONT Installation - Notification     | Accepted → In Progress → Serial Number → Completed |
| Cancellation-Service-Installation   | Received → Accepted → In Progress → Cancelled |
| Modification-Service-Installation   | Completed |
| DeviceSwap-Service-Installation     | Accepted → In Progress → Serial Number → Completed |
| Relocation-Service-Installation     | Accepted → In Progress → Completed |
| Rewiring-Service-Installation       | Accepted → In Progress → Completed |
| Suspend-Service-Installation        | Completed |
| Resume-Service-Installation         | Completed |
| Termination-Service-Installation    | Completed |
| TroubleTicket-Notification          | Resolved / Rejected |

Source samples: `aces/*.json` (collection root).

> **Installation Failure for ACES = TBD.** A placeholder folder is prepared at
> `Mobily/Installation-Failure/` and `OpenAccess/{Provider}/Installation-Failure/`
> with a starter `(T0)` request based on the provisional sample. Final
> failure scenarios will be populated once the OA team confirms the contract.

---

### 3. New OpenAccess Activation Automation (provider-side flow)

The journey runner (`Automation/journey-runner.js`) now drives **all four**
OA providers (STC, ITC, ACES, **DOWIYAT**) through the **provider-side**
activation flow — the providers' own Service-Installation notification API
replaces the Mobily WFM-CPE workflow:

| Journey ID         | Provider | Flow |
|--------------------|----------|------|
| `stc-activation`     | STC      | Create Order → **STC SQ Notifs (Ordered → Completed → Closed)** → STC Activation Notifs (6 steps) → TMF641 Completed → SV Provisioning-Completed → SV Pre-Completion → Completed |
| `itc-activation`     | ITC      | Create Order → ITC Activation Notifs (6 steps) → TMF641 Completed → SV Provisioning-Completed → SV Pre-Completion → Completed |
| `aces-activation` 🆕 | ACES     | Create Order → ACES Activation Notifs (4 steps) → TMF641 Completed → SV Provisioning-Completed → SV Pre-Completion → Completed |
| `dawiyat-activation` | DOWIYAT  | Create Order → DOWIYAT OA ONT notifications (7 steps) → TMF641 Completed → SV Provisioning-Completed → SV Pre-Completion → Completed |

> ⚠️ **Difference from Mobily activation:** OA flows do **NOT** run **Mobily** WFM CPE steps (`Shared-Workflows/WFM-CPE`) and do **NOT** include the SV `UAT-Completed` step. Provider simulations live under **`OpenAccess/<PROVIDER>/Activation/OA ONT Installation - Notification/`**.

**Run examples:**

```bash
node Automation/journey-runner.js --env "Dev 3" --journey aces-activation
node Automation/journey-runner.js --env "Dev 3" --journey stc-activation --me 1
node Automation/journey-runner.js --env "Dev 3" --journey itc-activation
```

**Required env vars per provider:**

| Provider | Required vars in `environments/<env>.bru` |
|----------|--------------------------------------------|
| STC      | `stcInstallationId`, `stcSqId` |
| ITC      | `itcInstallationId` |
| ACES     | `acesInstallationId`, `acesServiceAccNum`, `acesCpeIntegrationId`, `acesCpeSerialNumber` |
| DOWIYAT  | `dawiyatInstallationId` |

---

## Journey Guide

Each `folder.bru` under `Mobily/{Journey}/` or `OpenAccess/{Provider}/{Journey}/` documents the step sequence. Shared steps always come from `Shared-Workflows/`.

| Journey | Mobily path | OpenAccess path | Toolkit examples |
|---------|-------------|-----------------|------------------|
| Activation | `Mobily/Activation/` | `OpenAccess/{P}/Activation/` | `mobily-activation`, `stc-activation` |
| Relocation | `Mobily/Relocation/` | `OpenAccess/{P}/Relocation/` | `mobily-relocation`, `dawiyat-relocation` |
| Device Swap | `Mobily/Device-Swap/` | `OpenAccess/{P}/Device-Swap/` | `mobily-device-swap-cpe` |
| Upgrade / Downgrade | `Mobily/Upgrade|Downgrade/` | `OpenAccess/{P}/Upgrade|Downgrade/` | `mobily-upgrade`, `oa-downgrade` |
| Suspend / Resume | `Mobily/Suspend/` | `OpenAccess/{P}/Suspend|Resume/` | `dawiyat-suspend`, `stc-resume` |
| Termination | `Mobily/Termination/` | `OpenAccess/{P}/Termination/` | `mobily-termination` |
| Rewiring | `Mobily/Rewiring/` | `OpenAccess/{P}/Rewiring/` | `mobily-rewiring` |
| Maintenance | `Mobily/Maintenance/` | `OpenAccess/{P}/Maintenance/` | `stc-maintenance` |
| Installation Failure | `Mobily/Installation-Failure/` | `OpenAccess/{P}/Installation-Failure/` | `mobily-failure`, `stc-failure` |
| Request Update | `Mobily/Request-Update/` | `OpenAccess/{P}/Request-Update/` | manual |
| Mesh Extender | `Mobily/Mesh-Extender-Standalone/` | `OpenAccess/{P}/Mesh-Extender-Standalone/` | manual |

Mobily field-work journeys compose: **create order → WFM-CPE (shared) → TMF641 → SingleView → WFM Step-09**.

OA activation uses provider ONT notifications under `Activation/OA ONT Installation - Notification/` (no shared WFM CPE, no SV UAT step).

---

### 
