# FTTH - Mobily - Project

**Journey-Centric API Collection for FTTH (Fiber To The Home) Solution - Mobily Implementation**

---

## Ã°Å¸â€œâ€¹ **Table of Contents**

1. [Overview](#overview)
2. [Project Structure](#project-structure)
3. [Environments](#environments)
4. [Journey Guide](#journey-guide)
5. [Getting Started](#getting-started)

---

## Ã°Å¸Å½Â¯ **Overview**

This Bruno API collection contains a comprehensive, journey-centric set of APIs for the FTTH (Fiber To The Home) solution implementation for Mobily. 

**Key Design Principle:** Each journey/use case contains ALL the API requests needed (TMF622, TMF641, WFM, SingleView, etc.) with **contextual payloads** specific to that journey. This eliminates confusion when testing Ã¢â‚¬â€ you don't need to remember to change comments or payload context between different use cases.

**Total APIs:** ~100+ endpoints organized across 9 business journeys

---

## Ã°Å¸â€œÂ **Project Structure**

```
FTTH - Mobily - Project/
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ environments/                     # Environment configs (AWS Dev & On-Prem Dev)
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ 01-Authentication/                   # Token per env (DEV 1 Ã¢â‚¬Â¦ SIT Ã¢â‚¬â€ nested folders)
Ã¢â€â€š
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ 02-Activation Order/                  # Ã°Å¸Å¸Â¢ New activation (Mobily TMF622 + OA + WFM CPE)
Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ Mobily/
Ã¢â€â€š   Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ TMF-622 Create Sales Order/
Ã¢â€â€š   Ã¢â€â€š   Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ FTTH RCY/              # with 1/2/3 ME + without ME
Ã¢â€â€š   Ã¢â€â€š   Ã¢â€â€š   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ FTTH Consumer/         # with 1/2/3 ME + without ME
Ã¢â€â€š   Ã¢â€â€š   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ WFM CPE Installation - Notification/
Ã¢â€â€š   Ã¢â€â€š       Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ Phase 1/               # Step 01 Ã¢â€ â€™ Step 08
Ã¢â€â€š   Ã¢â€â€š       Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ Phase 2/               # Step 09
Ã¢â€â€š   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ OpenAccess/                     # ACES, STC, ITC, DOWIYAT (TMF622 + OA ONT workflows)
Ã¢â€â€š
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ 03-Relocation/                    # Ã°Å¸â€â€ž Service Relocation
Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ Mobily / OpenAccess/
Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ 02-TMF641-Notifications/
Ã¢â€â€š   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ 03-WFM-CPE-Relocation/       # WFM with RELOCATION context
Ã¢â€â€š
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ 04-Device-Swap/                   # Ã°Å¸â€Â§ CPE/HAG/ONT Replacement
Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ Mobily / OpenAccess/
Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ 02-TMF641-Notifications/
Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ 03-WFM-CPE-Device-Swap/      # WFM with DEVICE SWAP context
Ã¢â€â€š   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ 04-Installation-Failure-Scenarios/
Ã¢â€â€š
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ 05-Upgrade-Downgrade/             # Ã¢Â¬â€ Ã¯Â¸Â Bandwidth Changes
Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ Upgrade/Mobily + Upgrade/OpenAccess/
Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ Downgrade/Mobily + Downgrade/OpenAccess/
Ã¢â€â€š   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ 03-TMF641-Notifications/
Ã¢â€â€š
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ 06-Suspend-Resume/                # Ã¢ÂÂ¸Ã¯Â¸Â Service Suspend & Resume
Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ Suspend/Mobily + Suspend/OpenAccess/
Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ 13-Shared-Workflows/Create Service Order - OA/
Ã¢â€â€š   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ Resume/OpenAccess/
Ã¢â€â€š
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ 07-Termination/                   # Ã¢ÂÅ’ Service Deactivation
Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ Mobily + OpenAccess/
Ã¢â€â€š   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ 02-TMF641-Cease-Notification/
Ã¢â€â€š
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ 08-Rewiring/                      # Ã°Å¸â€Å’ Cable Rewiring
Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ Mobily + OpenAccess/
Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ 02-TMF641-Notifications/
Ã¢â€â€š   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ 03-WFM-CPE-Rewiring/         # WFM with REWIRING context
Ã¢â€â€š
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ 09-Maintenance/                   # Ã°Å¸â€ºÂ Ã¯Â¸Â Service Maintenance/Repair
Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ 01-Create-Maintenance-Order-TMF622/
Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ 02-WFM-Maintenance-Notifications/ # WFM with MAINTENANCE context
Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ 03-Close-Maintenance-Order/
Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ 04-ReOpen-Maintenance-Order/
Ã¢â€â€š   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ 05-Open-Service-Request-OA/
Ã¢â€â€š
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ 10-Request-Update/                # Ã°Å¸â€œâ€¹ Order Status Updates
Ã¢â€â€š
Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ 11-Search-By-SAN-CPE/             # Ã°Å¸â€Å½ Lookup SAN & CPE Serial Number
Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ 01-By-Order-ID/               # Order ID Ã¢â€ â€™ SAN & CPE SN
Ã¢â€â€š   Ã¢â€Å“Ã¢â€â‚¬Ã¢â€â‚¬ 02-By-SAN/                    # SAN Ã¢â€ â€™ all orders
Ã¢â€â€š   Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ 03-By-CPE-Serial/             # CPE SN Ã¢â€ â€™ all orders
Ã¢â€â€š
Ã¢â€â€Ã¢â€â‚¬Ã¢â€â‚¬ Documentation/                    # Ã°Å¸â€œâ€ž Reference documents (PDFs)
```

---

## Ã°Å¸Å’Â **Environments**

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

## Ã°Å¸â€ â€¢ **What's New (Phase 4B - 18 Apr update)**

### 1. `networkCategory` is now mandatory in all TMF 622 payloads

The `Documentation/TMF 622 - Updated - 18 Apr.pdf` introduces a new mandatory
characteristic on every Create Product Order request:

| Customer Type | `customerCategory` | `networkCategory` |
|---------------|--------------------|-------------------|
| Regular       | `Regular`          | `FTTH CONSUMER`   |
| Royal (RCY)   | `Royal`            | `FTTH RCY`        |
| VIP           | `Vip`              | `FTTH CONSUMER`   |

`networkCategory` is now the **primary differentiator** between Regular and
RCY customers Ã¢â‚¬â€ replacing the historical practice of relying on separate folders.

#### How this is wired in the collection (single source of truth)

Every TMF 622 `.bru` references the values via `{{customerCategory}}` and
`{{networkCategory}}`. The actual values are sourced from folder-level
`vars:pre-request` blocks:

| Folder | `customerCategory` | `networkCategory` |
|--------|---------------------|---------------------|
| `02-Activation Order/Mobily/TMF-622 Create Sales Order/FTTH Consumer/folder.bru` | `Regular` | `FTTH CONSUMER` |
| `02-Activation Order/Mobily/TMF-622 Create Sales Order/FTTH RCY/folder.bru`   | `Royal`   | `FTTH RCY`          |
| `02-Activation Order/OpenAccess/folder.bru`              | `Regular` | `FTTH CONSUMER` |

Override at the request level (in another `vars:pre-request` block inside the
`.bru`) only when you need to test an edge case (e.g. an OA Royal scenario).

### 2. New Open Access Provider Ã¢â‚¬â€ **ACES**

ACES is a new infrastructure provider added in phase 4B. Notification flows
are mapped under `02-Activation Order/OpenAccess/ACES/`.

| Sub-folder | Purpose |
|------------|---------|
| OA ONT Installation - Notification     | Accepted Ã¢â€ â€™ In Progress Ã¢â€ â€™ Serial Number Ã¢â€ â€™ Completed |
| Cancellation-Service-Installation   | Received Ã¢â€ â€™ Accepted Ã¢â€ â€™ In Progress Ã¢â€ â€™ Cancelled |
| Modification-Service-Installation   | Completed |
| DeviceSwap-Service-Installation     | Accepted Ã¢â€ â€™ In Progress Ã¢â€ â€™ Serial Number Ã¢â€ â€™ Completed |
| Relocation-Service-Installation     | Accepted Ã¢â€ â€™ In Progress Ã¢â€ â€™ Completed |
| Rewiring-Service-Installation       | Accepted Ã¢â€ â€™ In Progress Ã¢â€ â€™ Completed |
| Suspend-Service-Installation        | Completed |
| Resume-Service-Installation         | Completed |
| Termination-Service-Installation    | Completed |
| TroubleTicket-Notification          | Resolved / Rejected |

Source samples: `aces/*.json` (collection root).

> **Installation Failure for ACES = TBD.** A placeholder folder is prepared at
> `13-Shared-Workflows/Installation-Failure-Scenarios/OpenAccess/ACES - Installation Failure Notification/`
> with a starter `(T0)` request based on the provisional sample. Final
> failure scenarios will be populated once the OA team confirms the contract.

---

### 3. New OpenAccess Activation Automation (provider-side flow)

The journey runner (`Automation/journey-runner.js`) now drives **all four**
OA providers (STC, ITC, ACES, **DOWIYAT**) through the **provider-side**
activation flow Ã¢â‚¬â€ the providers' own Service-Installation notification API
replaces the Mobily WFM-CPE workflow:

| Journey ID         | Provider | Flow |
|--------------------|----------|------|
| `stc-activation`     | STC      | Create Order Ã¢â€ â€™ **STC SQ Notifs (Ordered Ã¢â€ â€™ Completed Ã¢â€ â€™ Closed)** Ã¢â€ â€™ STC Activation Notifs (6 steps) Ã¢â€ â€™ TMF641 Completed Ã¢â€ â€™ SV Provisioning-Completed Ã¢â€ â€™ SV Pre-Completion Ã¢â€ â€™ Completed |
| `itc-activation`     | ITC      | Create Order Ã¢â€ â€™ ITC Activation Notifs (6 steps) Ã¢â€ â€™ TMF641 Completed Ã¢â€ â€™ SV Provisioning-Completed Ã¢â€ â€™ SV Pre-Completion Ã¢â€ â€™ Completed |
| `aces-activation` Ã°Å¸â€ â€¢ | ACES     | Create Order Ã¢â€ â€™ ACES Activation Notifs (4 steps) Ã¢â€ â€™ TMF641 Completed Ã¢â€ â€™ SV Provisioning-Completed Ã¢â€ â€™ SV Pre-Completion Ã¢â€ â€™ Completed |
| `dawiyat-activation` | DOWIYAT  | Create Order Ã¢â€ â€™ DOWIYAT OA ONT notifications (7 steps) Ã¢â€ â€™ TMF641 Completed Ã¢â€ â€™ SV Provisioning-Completed Ã¢â€ â€™ SV Pre-Completion Ã¢â€ â€™ Completed |

> Ã¢Å¡Â Ã¯Â¸Â **Difference from Mobily activation:** OA flows do **NOT** run **Mobily** WFM CPE steps (`02-Activation Order/Mobily/WFM CPE Installation - Notification`) and do **NOT** include the SV `UAT-Completed` step. Provider simulations live under **`02-Activation Order/OpenAccess/<PROVIDER>/OA ONT Installation - Notification/`**.

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

## Ã°Å¸â€œÅ¡ **Journey Guide**

### **Activation Order** Ã°Å¸Å¸Â¢
> New FTTH installation assets (Mobily/Open Access TMF622, WFM CPE 01Ã¢â‚¬â€œ08 vs Step 09, OA ONT notifications). Shared workflows (TMF641, SingleView, ME mesh, failures) stay under **`13-Shared-Workflows/`**.

| Area | Folder | Notes |
|------|--------|--------|
| Mobily create order | `02-Activation Order/Mobily/TMF-622 Create Sales Order/` | FTTH Consumer and FTTH RCY, each grouped by `without ME` / `with 1 ME` Ã¢â‚¬Â¦ `with 3 ME` |
| WFM CPE | `02-Activation Order/Mobily/WFM CPE Installation - Notification/` | Run **Phase 1** for step 01Ã¢â‚¬â€œ08 only; **Phase 2** for dedicated step 09 |
| OA providers | `02-Activation Order/OpenAccess/<ACES|STC|ITC|DOWIYAT>/` | TMF622 + **OA ONT Installation - Notification** + lifecycle subfolders |

Cross-cutting steps (TMF641, appointments, completions, failures) remain in **`Shared-Workflows`** and **`11-Search-By-SAN-CPE`**Ã¢â‚¬â€see Bruno collection sidebar.

---

### **03 - Relocation** Ã°Å¸â€â€ž
> Move existing FTTH service to a new location

| Step | Folder | API Type | Description |
|------|--------|----------|-------------|
| 1 | `Mobily / OpenAccess` | TMF622 POST | action: modify, ftthSubAction: Relocation |
| 2 | `02-TMF641-Notifications` | TMF641 | Acknowledged Ã¢â€ â€™ InProgress Ã¢â€ â€™ Completed |
| 3 | `03-WFM-CPE-Relocation` | WFM | CPE steps with **RELOCATION** context comments |

Ã¢Å¡Â Ã¯Â¸Â **Key Difference:** WFM comments must reference relocation, NOT installation.

---

### **04 - Device Swap** Ã°Å¸â€Â§
> Replace CPE, HAG, or ONT device

| Step | Folder | API Type | Description |
|------|--------|----------|-------------|
| 1 | `Mobily / OpenAccess` | TMF622 POST | action: modify, ftthSubAction: CPESwap |
| 2 | `02-TMF641-Notifications` | TMF641 | Acknowledged Ã¢â€ â€™ InProgress Ã¢â€ â€™ Completed |
| 3 | `03-WFM-CPE-Device-Swap` | WFM | CPE steps with **DEVICE SWAP** context comments |
| 4 | `04-Installation-Failure-Scenarios` | WFM | Device swap failure handling |

Ã¢Å¡Â Ã¯Â¸Â **Key Difference:** Payload includes `oldCpeSerialNumber`. WFM comments reference device replacement.

---

### **05 - Upgrade/Downgrade** Ã¢Â¬â€ Ã¯Â¸Â
> Change bandwidth (no technician visit needed)

| Step | Folder | API Type | Description |
|------|--------|----------|-------------|
| 1 | `Upgrade/Mobily + Upgrade/OpenAccess` | TMF622 POST | Bandwidth upgrade |
| 2 | `Downgrade/Mobily + Downgrade/OpenAccess` | TMF622 POST | Bandwidth downgrade |
| 3 | `03-TMF641-Notifications` | TMF641 | Acknowledged Ã¢â€ â€™ Completed (no InProgress) |

---

### **06 - Suspend & Resume** Ã¢ÂÂ¸Ã¯Â¸Â
> Temporarily suspend and resume service

| Step | Folder | API Type | Description |
|------|--------|----------|-------------|
| 1 | `Suspend/Mobily + Suspend/OpenAccess` | TMF622 POST | Suspend (Mobily + OpenAccess) |
| 2 | `13-Shared-Workflows/Create Service Order - OA` | OA | Notify OpenAccess providers |
| 3 | `Resume/OpenAccess` | TMF622 POST | Resume (OpenAccess only) |

---

### **07 - Termination** Ã¢ÂÅ’
> Permanently deactivate FTTH service

| Step | Folder | API Type | Description |
|------|--------|----------|-------------|
| 1 | `Mobily + OpenAccess` | TMF622 POST | action: delete, ftthSubAction: Deactivate |
| 2 | `02-TMF641-Cease-Notification` | TMF641 | Cease/termination notification |

---

### **08 - Rewiring** Ã°Å¸â€Å’
> Physical cable rewiring

| Step | Folder | API Type | Description |
|------|--------|----------|-------------|
| 1 | `Mobily + OpenAccess` | TMF622 POST | Rewiring order |
| 2 | `02-TMF641-Notifications` | TMF641 | Acknowledged Ã¢â€ â€™ InProgress Ã¢â€ â€™ Completed |
| 3 | `03-WFM-CPE-Rewiring` | WFM | CPE steps with **REWIRING** context comments |

---

### **09 - Maintenance** Ã°Å¸â€ºÂ Ã¯Â¸Â
> Service repair and maintenance

| Step | Folder | API Type | Description |
|------|--------|----------|-------------|
| 1 | `01-Create-Maintenance-Order-TMF622` | TMF622 POST | action: add, srAction: New |
| 2 | `02-WFM-Maintenance-Notifications` | WFM | CPE steps with **MAINTENANCE** context |
| 3 | `03-Close-Maintenance-Order` | PATCH | Close completed maintenance |
| 4 | `04-ReOpen-Maintenance-Order` | PATCH | ReOpen if issue persists |
| 5 | `05-Open-Service-Request-OA` | OA | OpenAccess maintenance (Resolved/Rejected/Closed) |

---

### **10 - Request Update** Ã°Å¸â€œâ€¹
> Check or update order status

- Get Order status
- Trigger update for specific provider (Mobily / DOWIYAT / ITC)

---

### **11 - Search By SAN & CPE Serial** Ã°Å¸â€Å½
> Lookup SAN / CPE Serial Number via CSG Telflow Portal Internal API

Base path riil = **`/portal/api/v1/...`** (bukan `/api/v1/...` dari swagger).

**Insight kunci:** SAN & cpeSerialNumber **tersimpan sebagai nested Characteristic**:
```json
{ "Characteristic": { "ID": "san" },             "Value": "23532557" }
{ "Characteristic": { "ID": "cpeSerialNumber" }, "Value": "TK3B119002209-test" }
```
Swagger tidak punya filter characteristic langsung, jadi dua strategi dipakai:

| Folder | Strategi A (fast) | Strategi B (reliable) |
|--------|-------------------|-----------------------|
| `01-By-Order-ID` | `GET /portal/api/order/order/{id}?...includeInventory=true...` (endpoint Portal, exact URL seperti UI) Ã¢â‚¬â€ langsung dapat SAN + CPE SN + inventoryId | Ã¢â‚¬â€ |
| `02-By-SAN` | `salesorders?q={SAN}` + `customerorders?q={SAN}` | `inventory?q={SAN}` Ã¢â€ â€™ `inventory/{id}/relationships` Ã¢â€ â€™ `customerorders?inventoryId=...` |
| `03-By-CPE-Serial` | `salesorders?q={SN}` + `customerorders?q={SN}` | `inventory?q={SN}` Ã¢â€ â€™ `inventory/{id}/relationships` Ã¢â€ â€™ `customerorders?inventoryId=...` |

Chain meng-capture `inventoryId` otomatis lewat `vars:post-response`, jadi tinggal jalankan 01 Ã¢â€ â€™ 02 Ã¢â€ â€™ 03 Ã¢â‚¬Â¦ berurutan.

---

## Ã°Å¸Å¡â‚¬ **Getting Started**

### **Prerequisites**
- Bruno API Client installed
- Access to Mobily development environments (AWS Dev or On-Prem Dev)
- Valid authentication credentials

### **Usage Steps**

1. **Select Environment**
   - Choose `awsDev` or `devOnPrem` from environments dropdown

2. **Authenticate**
   - Run one of the Auth APIs in `01-Authentication/`
   - Token is automatically captured via post-response script

3. **Pick Your Journey**
   - Navigate to the numbered journey folder (e.g., `03-Relocation`)
   - Read the `folder.bru` docs for workflow guidance
   - Follow the numbered sub-folders in order

4. **Execute APIs in Sequence**
   - Start with `01-` folder, then `02-`, etc.
   - Within WFM folders, follow Step-01 Ã¢â€ â€™ Step-02 Ã¢â€ â€™ ... Ã¢â€ â€™ Step-09

### **Tips**
- Ã°Å¸â€œâ€“ **Read folder docs:** Each journey folder's `folder.bru` contains important context notes
- Ã°Å¸â€Â¢ **Follow numbering:** Sub-folders are numbered to indicate execution order
- Ã¢Å¡Â Ã¯Â¸Â **Context matters:** WFM/notification payloads are different per journey Ã¢â‚¬â€ use the ones inside the specific journey folder
- Ã°Å¸â€â€ž **ME variants:** When testing with Mesh Extenders, use Step-08 variant matching the number of MEs ordered
- Ã¢ÂÅ’ **Failure scenarios:** Each journey with WFM has its own failure scenarios folder

---

## Ã°Å¸â€œÂ **Notes**

- All APIs follow TMF (TM Forum) standards for telecom operations
- **Journey-centric organization** ensures contextual correctness for each use case
- Each journey folder contains ALL API requests needed for that use case
- WFM notification comments are pre-configured for each journey's context
- Environment variables are shared across all journeys

---

## Ã°Å¸â€â€” **Related Documentation**

- TMF622 Product Ordering Management API Specification
- TMF641 Service Ordering Management API Specification
- Mobily FTTH Solution HLD (High-Level Design)
- Telflow SingleView Action API
- Telflow Notification Event API

---

**Version:** 2.0  
**Last Updated:** March 2026  
**Maintained By:** Mobily FTTH Integration Team  
**Organization:** Journey-Centric (reorganized from API-type grouping)





