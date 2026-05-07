# FTTH - Mobily - Project

**Journey-Centric API Collection for FTTH (Fiber To The Home) Solution - Mobily Implementation**

---

## 📋 **Table of Contents**

1. [Overview](#overview)
2. [Project Structure](#project-structure)
3. [Environments](#environments)
4. [Journey Guide](#journey-guide)
5. [Getting Started](#getting-started)

---

## 🎯 **Overview**

This Bruno API collection contains a comprehensive, journey-centric set of APIs for the FTTH (Fiber To The Home) solution implementation for Mobily. 

**Key Design Principle:** Each journey/use case contains ALL the API requests needed (TMF622, TMF641, WFM, SingleView, etc.) with **contextual payloads** specific to that journey. This eliminates confusion when testing — you don't need to remember to change comments or payload context between different use cases.

**Total APIs:** ~100+ endpoints organized across 9 business journeys

---

## 📁 **Project Structure**

```
FTTH - Mobily - Project/
├── environments/                     # Environment configs (AWS Dev & On-Prem Dev)
├── Authentication/                   # Token per env (DEV 1 … SIT — nested folders)
│
├── Activation Order/                  # 🟢 New activation (Mobily TMF622 + OA + WFM CPE)
│   ├── Mobily/                        # Appointment update, Mobily-specific aux
│   ├── TMF-622 Create Sales Order/    # Regular (Consumer postpaid/prepaid) + Royal (RCY)
│   ├── WFM CPE Installation - Notification/
│   │   ├── Steps 01-08 - Field Work/  # Run folder alone → steps 01–08 only (no Step 09)
│   │   └── Step 09 - Completed/       # Post–intermediate milestones WFM closure (separate)
│   └── OpenAccess/                     # ACES, STC, ITC, DOWIYAT (TMF622 + OA ONT workflows)
│
├── 03-Relocation/                    # 🔄 Service Relocation
│   ├── 01-Create-Relocation-Order-TMF622/
│   ├── 02-TMF641-Notifications/
│   └── 03-WFM-CPE-Relocation/       # WFM with RELOCATION context
│
├── 04-Device-Swap/                   # 🔧 CPE/HAG/ONT Replacement
│   ├── 01-Create-Swap-Order-TMF622/
│   ├── 02-TMF641-Notifications/
│   ├── 03-WFM-CPE-Device-Swap/      # WFM with DEVICE SWAP context
│   └── 04-Installation-Failure-Scenarios/
│
├── 05-Upgrade-Downgrade/             # ⬆️ Bandwidth Changes
│   ├── 01-Upgrade-Order-TMF622/
│   ├── 02-Downgrade-Order-TMF622/
│   └── 03-TMF641-Notifications/
│
├── 06-Suspend-Resume/                # ⏸️ Service Suspend & Resume
│   ├── 01-Suspend-Order-TMF622/
│   ├── 02-Create-Service-Order-OA/
│   └── 03-Resume-Order-TMF622/
│
├── 07-Termination/                   # ❌ Service Deactivation
│   ├── 01-Termination-Order-TMF622/
│   └── 02-TMF641-Cease-Notification/
│
├── 08-Rewiring/                      # 🔌 Cable Rewiring
│   ├── 01-Create-Rewiring-Order-TMF622/
│   ├── 02-TMF641-Notifications/
│   └── 03-WFM-CPE-Rewiring/         # WFM with REWIRING context
│
├── 09-Maintenance/                   # 🛠️ Service Maintenance/Repair
│   ├── 01-Create-Maintenance-Order-TMF622/
│   ├── 02-WFM-Maintenance-Notifications/ # WFM with MAINTENANCE context
│   ├── 03-Close-Maintenance-Order/
│   ├── 04-ReOpen-Maintenance-Order/
│   └── 05-Open-Service-Request-OA/
│
├── 10-Request-Update/                # 📋 Order Status Updates
│
├── 11-Search-By-SAN-CPE/             # 🔎 Lookup SAN & CPE Serial Number
│   ├── 01-By-Order-ID/               # Order ID → SAN & CPE SN
│   ├── 02-By-SAN/                    # SAN → all orders
│   └── 03-By-CPE-Serial/             # CPE SN → all orders
│
└── Documentation/                    # 📄 Reference documents (PDFs)
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

The `Documentation/TMF 622 - Updated - 18 Apr.pdf` introduces a new mandatory
characteristic on every Create Product Order request:

| Customer Type | `customerCategory` | `networkCategory` |
|---------------|--------------------|-------------------|
| Regular       | `Regular`          | `FTTH CONSUMER`   |
| Royal (RCY)   | `Royal`            | `FTTH RCY`        |
| VIP           | `Vip`              | `FTTH CONSUMER`   |

`networkCategory` is now the **primary differentiator** between Regular and
RCY customers — replacing the historical practice of relying on separate folders.

#### How this is wired in the collection (single source of truth)

Every TMF 622 `.bru` references the values via `{{customerCategory}}` and
`{{networkCategory}}`. The actual values are sourced from folder-level
`vars:pre-request` blocks:

| Folder | `customerCategory` | `networkCategory` |
|--------|---------------------|---------------------|
| `Activation Order/TMF-622 Create Sales Order/FTTH Consumer/folder.bru` | `Regular` | `FTTH CONSUMER` |
| `Activation Order/TMF-622 Create Sales Order/FTTH RCY/folder.bru`   | `Royal`   | `FTTH RCY`          |
| `Activation Order/OpenAccess/folder.bru`              | `Regular` | `FTTH CONSUMER` |

Override at the request level (in another `vars:pre-request` block inside the
`.bru`) only when you need to test an edge case (e.g. an OA Royal scenario).

### 2. New Open Access Provider — **ACES**

ACES is a new infrastructure provider added in phase 4B. Notification flows
are mapped under `Activation Order/OpenAccess/ACES/`.

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
> `Shared-Workflows/Installation-Failure-Scenarios/OpenAccess/ACES - Installation Failure Notification/`
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

> ⚠️ **Difference from Mobily activation:** OA flows do **NOT** run **Mobily** WFM CPE steps (`Activation Order/WFM CPE Installation - Notification`) and do **NOT** include the SV `UAT-Completed` step. Provider simulations live under **`Activation Order/OpenAccess/<PROVIDER>/OA ONT Installation - Notification/`**.

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

## 📚 **Journey Guide**

### **Activation Order** 🟢
> New FTTH installation assets (Mobily/Open Access TMF622, WFM CPE 01–08 vs Step 09, OA ONT notifications). Shared workflows (TMF641, SingleView, ME mesh, failures) stay under **`Shared-Workflows/`**.

| Area | Folder | Notes |
|------|--------|--------|
| Mobily create order | `Activation Order/TMF-622 Create Sales Order/` | FTTH Consumer (postpaid/prepaid) and FTTH RCY, each under `without ME` / `with 1 ME` … `with 3 ME` |
| WFM CPE | `Activation Order/WFM CPE Installation - Notification/` | Run folder **Steps 01-08 - Field Work** alone for notifications 01–08 only |
| OA providers | `Activation Order/OpenAccess/<ACES|STC|ITC|DOWIYAT>/` | TMF622 + **OA ONT Installation - Notification** + lifecycle subfolders |

Cross-cutting steps (TMF641, appointments, completions, failures) remain in **`Shared-Workflows`** and **`11-Search-By-SAN-CPE`**—see Bruno collection sidebar.

---

### **03 - Relocation** 🔄
> Move existing FTTH service to a new location

| Step | Folder | API Type | Description |
|------|--------|----------|-------------|
| 1 | `01-Create-Relocation-Order-TMF622` | TMF622 POST | action: modify, ftthSubAction: Relocation |
| 2 | `02-TMF641-Notifications` | TMF641 | Acknowledged → InProgress → Completed |
| 3 | `03-WFM-CPE-Relocation` | WFM | CPE steps with **RELOCATION** context comments |

⚠️ **Key Difference:** WFM comments must reference relocation, NOT installation.

---

### **04 - Device Swap** 🔧
> Replace CPE, HAG, or ONT device

| Step | Folder | API Type | Description |
|------|--------|----------|-------------|
| 1 | `01-Create-Swap-Order-TMF622` | TMF622 POST | action: modify, ftthSubAction: CPESwap |
| 2 | `02-TMF641-Notifications` | TMF641 | Acknowledged → InProgress → Completed |
| 3 | `03-WFM-CPE-Device-Swap` | WFM | CPE steps with **DEVICE SWAP** context comments |
| 4 | `04-Installation-Failure-Scenarios` | WFM | Device swap failure handling |

⚠️ **Key Difference:** Payload includes `oldCpeSerialNumber`. WFM comments reference device replacement.

---

### **05 - Upgrade/Downgrade** ⬆️
> Change bandwidth (no technician visit needed)

| Step | Folder | API Type | Description |
|------|--------|----------|-------------|
| 1 | `01-Upgrade-Order-TMF622` | TMF622 POST | Bandwidth upgrade |
| 2 | `02-Downgrade-Order-TMF622` | TMF622 POST | Bandwidth downgrade |
| 3 | `03-TMF641-Notifications` | TMF641 | Acknowledged → Completed (no InProgress) |

---

### **06 - Suspend & Resume** ⏸️
> Temporarily suspend and resume service

| Step | Folder | API Type | Description |
|------|--------|----------|-------------|
| 1 | `01-Suspend-Order-TMF622` | TMF622 POST | Suspend (Mobily + OpenAccess) |
| 2 | `02-Create-Service-Order-OA` | OA | Notify OpenAccess providers |
| 3 | `03-Resume-Order-TMF622` | TMF622 POST | Resume (OpenAccess only) |

---

### **07 - Termination** ❌
> Permanently deactivate FTTH service

| Step | Folder | API Type | Description |
|------|--------|----------|-------------|
| 1 | `01-Termination-Order-TMF622` | TMF622 POST | action: delete, ftthSubAction: Deactivate |
| 2 | `02-TMF641-Cease-Notification` | TMF641 | Cease/termination notification |

---

### **08 - Rewiring** 🔌
> Physical cable rewiring

| Step | Folder | API Type | Description |
|------|--------|----------|-------------|
| 1 | `01-Create-Rewiring-Order-TMF622` | TMF622 POST | Rewiring order |
| 2 | `02-TMF641-Notifications` | TMF641 | Acknowledged → InProgress → Completed |
| 3 | `03-WFM-CPE-Rewiring` | WFM | CPE steps with **REWIRING** context comments |

---

### **09 - Maintenance** 🛠️
> Service repair and maintenance

| Step | Folder | API Type | Description |
|------|--------|----------|-------------|
| 1 | `01-Create-Maintenance-Order-TMF622` | TMF622 POST | action: add, srAction: New |
| 2 | `02-WFM-Maintenance-Notifications` | WFM | CPE steps with **MAINTENANCE** context |
| 3 | `03-Close-Maintenance-Order` | PATCH | Close completed maintenance |
| 4 | `04-ReOpen-Maintenance-Order` | PATCH | ReOpen if issue persists |
| 5 | `05-Open-Service-Request-OA` | OA | OpenAccess maintenance (Resolved/Rejected/Closed) |

---

### **10 - Request Update** 📋
> Check or update order status

- Get Order status
- Trigger update for specific provider (Mobily / DOWIYAT / ITC)

---

### **11 - Search By SAN & CPE Serial** 🔎
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
| `01-By-Order-ID` | `GET /portal/api/order/order/{id}?...includeInventory=true...` (endpoint Portal, exact URL seperti UI) — langsung dapat SAN + CPE SN + inventoryId | — |
| `02-By-SAN` | `salesorders?q={SAN}` + `customerorders?q={SAN}` | `inventory?q={SAN}` → `inventory/{id}/relationships` → `customerorders?inventoryId=...` |
| `03-By-CPE-Serial` | `salesorders?q={SN}` + `customerorders?q={SN}` | `inventory?q={SN}` → `inventory/{id}/relationships` → `customerorders?inventoryId=...` |

Chain meng-capture `inventoryId` otomatis lewat `vars:post-response`, jadi tinggal jalankan 01 → 02 → 03 … berurutan.

---

## 🚀 **Getting Started**

### **Prerequisites**
- Bruno API Client installed
- Access to Mobily development environments (AWS Dev or On-Prem Dev)
- Valid authentication credentials

### **Usage Steps**

1. **Select Environment**
   - Choose `awsDev` or `devOnPrem` from environments dropdown

2. **Authenticate**
   - Run one of the Auth APIs in `Authentication/`
   - Token is automatically captured via post-response script

3. **Pick Your Journey**
   - Navigate to the numbered journey folder (e.g., `03-Relocation`)
   - Read the `folder.bru` docs for workflow guidance
   - Follow the numbered sub-folders in order

4. **Execute APIs in Sequence**
   - Start with `01-` folder, then `02-`, etc.
   - Within WFM folders, follow Step-01 → Step-02 → ... → Step-09

### **Tips**
- 📖 **Read folder docs:** Each journey folder's `folder.bru` contains important context notes
- 🔢 **Follow numbering:** Sub-folders are numbered to indicate execution order
- ⚠️ **Context matters:** WFM/notification payloads are different per journey — use the ones inside the specific journey folder
- 🔄 **ME variants:** When testing with Mesh Extenders, use Step-08 variant matching the number of MEs ordered
- ❌ **Failure scenarios:** Each journey with WFM has its own failure scenarios folder

---

## 📝 **Notes**

- All APIs follow TMF (TM Forum) standards for telecom operations
- **Journey-centric organization** ensures contextual correctness for each use case
- Each journey folder contains ALL API requests needed for that use case
- WFM notification comments are pre-configured for each journey's context
- Environment variables are shared across all journeys

---

## 🔗 **Related Documentation**

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
