# Phase 4B — ACES Open Access Provider — Test Plan

> **Style Reference:** Valen Style (per `Test-Cases/QandO_AWS_Phase_4A_*.csv`)
> **Area Path:** `New Stack Impl\Solution\CSG\CSG QandO`
> **Provider:** `ACES` (Open Access — added in Phase 4B)
> **Endpoint under test:** `POST {{demo-mob-dev}}/serviceInstallationManagement/v1/notification/`
> **funcId (failure flow):** `ACES_ORDER_UPDATE`
> **Reason-code series:** `R-OM-xxx` (Telflow Order-Management series)

---

## Coverage Analysis — What Must Be Covered

Below is the analysis of all the test scenarios that must be covered for ACES based on the Bruno collection (`02-OpenAccess-Provider-Workflow/ACES/...`) and the `Shared-Workflows/Installation-Failure-Scenarios/OpenAccess/ACES - Installation Failure Notification/` folder.

### A. Order Creation (TMF 622) — `infraProvider = ACES`
1. FTTH ACES Postpaid — No ME (Regular)
2. FTTH ACES Postpaid — With 1 ME
3. FTTH ACES Postpaid — With 2 ME
4. FTTH ACES Postpaid — With 3 ME
5. FTTH ACES Postpaid — Royal customer (override `customerCategory`)
6. Negative — Invalid `infraProvider` / missing characteristic

### B. Activation — Service Installation Notification flow (Accepted → In Progress → Serial Number → Completed)
7. End-to-end happy path (4 statuses)
8. Each individual notification (Accepted, In Progress, Serial Number, Completed) — payload mapping
9. Out-of-sequence notification (e.g. Completed received before In Progress) — negative
10. Idempotency — duplicate `eventId` for the same status

### C. Cancellation — Service Installation flow (Received → Accepted → In Progress → Cancelled)
11. End-to-end happy path (4 statuses)
12. Each individual cancellation step — payload mapping

### D. Modification — Service Installation Notification (Completed only)
13. Modification Completed — successful UPDATE_ORDER
14. Modification Completed — `serviceAccNum` & `orderTransactionNo` mapping

### E. Device Swap — Service Installation flow (Accepted → In Progress → Serial Number → Completed)
15. End-to-end happy path
16. Serial Number notification updates inventory (`devices[].newSerialNumber`)

### F. Relocation — Service Installation flow (Accepted → In Progress → Completed)
17. End-to-end happy path

### G. Rewiring — Service Installation flow (Accepted → In Progress → Completed)
18. End-to-end happy path

### H. Suspend / Resume / Termination (single Completed notification each)
19. Suspend Completed — payload + state transition
20. Resume Completed — payload + state transition
21. Termination Completed — payload + state transition

### I. Trouble Ticket Notifications
22. TT — Resolved (e.g. ODB Port Clean)
23. TT — Rejected (e.g. ODB Port Clean not successful)

### J. Installation Failure — Standard Treatments (T1–T4)
24. T1 — `R-OM-001` SYSTEMATIC REJECTION
25. T2 — `R-OM-002` CUSTOMER REJECTION
26. T3 — `R-OM-003` PROVIDER REJECTION
27. T4 — `R-OM-005` UNKNOWN REJECTION

### K. Installation Failure — Dynamic-Value Treatments (D1–D4)
28. D1 — `R-OM-006` Product Relationship Conflict (`[prodInstId]` × 2)
29. D2 — `R-OM-007` Product Not Orderable (`[prodSpecCode]`)
30. D3 — `R-OM-010` Product Cannot Be Deleted (`[prodSpecCode]` + `[prodInstaId]`)
31. D4 — `R-OM-012` Address Not Found (`[addressId]`)

### L. Auto-Cancellation in ACES (mirrors Phase 4B pattern from STC / ITC / DAWIYAT)
32. Auto-cancel during Activation Order
33. Auto-cancel during Device Swap Order
34. Auto-cancel during Relocation Order
35. Auto-cancel during Rewiring Order

### M. Cross-cutting / Non-functional
36. End-to-end positive flow — Order created → In Progress → Completed (Telflow Portal final state)
37. Order Detail synchronization — Telflow Details tab reflects ACES `serviceAccNum`, CPE `serialNumber`, `providerStatus`
38. Authentication — bearer token validation
39. Negative — missing `externalId` / unknown `acesInstallationId`

---

## Test Cases (Valen Style — ADO ready)

> **Format per case:** `Title` · `Test Objective` · `Pre Conditions` · `Expected Result` · `Test Steps` (each with **Step Action** and **Step Expected**).

---

### TC-01 — Phase4B.Dev3.OpenAccess.ACES — Verify TMF 622 to create FTTH — ACES — Regular customer — Postpaid (No ME)

**Test Objective:** Ensure that a Product Order with `infraProvider = ACES`, customer category `Regular`, payment type `Postpaid`, and no Mesh Extender is successfully created in Telflow via TMF 622.

**Pre Conditions:**
- Authentication token (`{{authToken}}`) is valid in Bruno.
- Bruno environment variable `demo-mob-dev` points to the AWS Dev3 environment.
- ACES provider is registered as a valid Open Access infraProvider in Telflow.

**Expected Result:** `201 Created` is returned, the order is reflected in Telflow Portal with `infraProvider = ACES`, and all attributes (CPE, ODB, customer, appointment, address) are mapped to Telflow Order Details.

| Step | Step Action | Step Expected |
|------|-------------|---------------|
| 1 | Send the TMF 622 request `FTTH-ACES-Postpaid-No-ME.bru` via Bruno. | Response is `201 Created` and the `state` in the response is `acknowledged`. |
| 2 | Open the Telflow Portal (NSP) and search the order by the returned `id`. | The corresponding FTTH (ACES — Regular — Postpaid) order is created and visible in Telflow Portal. |
| 3 | Open Telflow Order Details and verify mapped characteristics. | `infraProvider = ACES`, `customerCategory = Regular`, `serviceType = Fiber 300 Postpaid`, ODB / CPE / appointment / customer attributes are all mapped per the request payload. |
| 4 | Verify the BPMN process initiated. | The `OpenAccess Fulfillment` process is triggered with the `ACES` provider branch (no Mobily Infra branch). |

---

### TC-02 — Phase4B.Dev3.OpenAccess.ACES — Verify TMF 622 to create FTTH with 1 Mesh Extender — ACES — Regular — Postpaid

**Test Objective:** Ensure that a Product Order for ACES with **1 Mesh Extender** is created in Telflow and the ME line item is processed alongside the FTTH parent.

**Pre Conditions:**
- Authentication token valid.
- ACES provider registered.

**Expected Result:** `201 Created`, order created in Telflow Portal, parent FTTH and 1 child ME `productOrderItem` are reflected in Order Details.

| Step | Step Action | Step Expected |
|------|-------------|---------------|
| 1 | Send `FTTH-ACES-Postpaid-With-1-ME.bru` via Bruno. | Response is `201 Created`, `state = acknowledged`. |
| 2 | Open Telflow Portal and verify order creation. | Order is visible with parent FTTH item and 1 ME child item. |
| 3 | Verify Telflow Order Details for parent and ME mapping. | Parent FTTH attributes plus 1 ME `cpeDetails` (integrationId, cpeName, cpeType=ME) are mapped correctly. |

---

### TC-03 — Phase4B.Dev3.OpenAccess.ACES — Verify TMF 622 to create FTTH with 2 Mesh Extenders — ACES — Regular — Postpaid

**Test Objective:** Ensure ACES order with 2 ME items is accepted and reflected.

**Pre Conditions:** Same as TC-02.

**Expected Result:** `201 Created`, both ME items present in Telflow Order Details.

| Step | Step Action | Step Expected |
|------|-------------|---------------|
| 1 | Send `FTTH-ACES-Postpaid-With-2-ME.bru` via Bruno. | Response is `201 Created`. |
| 2 | Open Telflow Portal and verify the order. | Order is created with parent FTTH + 2 ME children. |
| 3 | Verify Order Details mapping. | All 2 ME `integrationId` values are unique and persisted correctly. |

---

### TC-04 — Phase4B.Dev3.OpenAccess.ACES — Verify TMF 622 to create FTTH with 3 Mesh Extenders — ACES — Regular — Postpaid

**Test Objective:** Ensure ACES order with the maximum 3 ME items is accepted and reflected.

**Pre Conditions:** Same as TC-02.

**Expected Result:** `201 Created`, 3 ME items present.

| Step | Step Action | Step Expected |
|------|-------------|---------------|
| 1 | Send `FTTH-ACES-Postpaid-With-3-ME.bru` via Bruno. | Response is `201 Created`. |
| 2 | Open Telflow Portal and verify the order. | Order is created with parent FTTH + 3 ME children. |
| 3 | Verify Order Details. | All 3 ME items are visible and mapped correctly. |

---

### TC-05 — Phase4B.Dev3.OpenAccess.ACES — Verify TMF 622 to create FTTH — ACES — Royal customer

**Test Objective:** Ensure `customerCategory = Royal` is honoured for the ACES path and the `Royal` branch is taken in the BPMN.

**Pre Conditions:**
- Token valid.
- Bruno var `customerCategory` overridden to `Royal`.

**Expected Result:** `201 Created`, order is created in Telflow Portal, the `Royal` customer branch is triggered (Initiate ODB Patch is **skipped**, similar to Mobily Royal behaviour).

| Step | Step Action | Step Expected |
|------|-------------|---------------|
| 1 | Override `customerCategory = Royal` in Bruno and send `FTTH-ACES-Postpaid-No-ME.bru`. | Response is `201 Created`. |
| 2 | Open Telflow Portal and verify the order. | The Royal branch is taken in the OA Fulfillment process and the `Initiate ODB Patch` node is skipped. |
| 3 | Verify Order Details. | `customerCategory = Royal` reflected on the Order Details tab. |

---

### TC-06 — Phase4B.Dev3.OpenAccess.ACES — Verify ACES Activation — End-to-End (Accepted → In Progress → Serial Number → Completed)

**Test Objective:** Ensure the full ACES Activation Service Installation notification flow is processed end-to-end and the order reaches `Completed` in Telflow.

**Pre Conditions:**
- An ACES order is already created via TC-01 and is in `In Progress` state with `acesInstallationId` available.
- Bruno folder `02-OpenAccess-Provider-Workflow/ACES/Activation-Service-Installation/` is configured.

**Expected Result:** Telflow processes all 4 notifications, persists serviceAccNum and CPE serial number in inventory, and the order reaches `Completed`.

| Step | Step Action | Step Expected |
|------|-------------|---------------|
| 1 | Trigger `Step-01-ACES-Accepted.bru`. | Response is `200 OK`. CPE Installation Work Order Notification for `Accepted` is generated in Telflow System tab. Order state is updated to `In Progress / Accepted`. |
| 2 | Trigger `Step-02-ACES-InProgress.bru`. | Response `200 OK`. Notification for `In Progress` appears in System tab. Order state = `In Progress / In Progress`. |
| 3 | Trigger `Step-03-ACES-Serial-Number-Notification.bru` with `acesServiceAccNum`, `acesCpeIntegrationId`, `acesCpeSerialNumber`. | Response `200 OK`. Notification with `devices[].newSerialNumber` is logged. Inventory is updated — CPE/ONT serial number is persisted on Telflow Inventory; `serviceAccNum` is stored on Order Details. |
| 4 | Trigger `Step-04-ACES-Completed.bru`. | Response `200 OK`. `providerStatus = Completed` is logged. The OpenAccess Fulfillment process moves to `Mobily Infra` (CPE Install) phase or to the next post-OA node per BPMN. |
| 5 | Verify final order state in Telflow Portal. | The OA-side processing for ACES is `Completed`; the parent order continues per the FTTH activation BPMN until reaching `Completed`. |

---

### TC-07 — Phase4B.Dev3.OpenAccess.ACES — Verify ACES Activation Notification — `Accepted` payload mapping

**Test Objective:** Ensure the Accepted notification payload is fully mapped onto Telflow CPE Work Order Details.

**Pre Conditions:** ACES order created and waiting for ACES Accepted.

**Expected Result:** Telflow logs the notification and reflects all fields in Order Details.

| Step | Step Action | Step Expected |
|------|-------------|---------------|
| 1 | Verify the payload `Step-01-ACES-Accepted.bru` in Bruno. | Body contains `eventType = serviceOrderStateChangeNotification`, `funcId = UPDATE_ORDER`, `externalId = {{acesInstallationId}}`, `providerStatus = Accepted`, `providerMilestone = Accepted`. |
| 2 | Trigger the request in Bruno. | Response is `200 OK`. |
| 3 | Open Telflow System tab. | The `serviceOrderStateChangeNotification` for ACES with `providerStatus = Accepted` is generated. |
| 4 | Open Telflow Details tab. | `taskStatus = Accepted`, `providerMilestone = Accepted` are reflected under the OA / CPE Work Order Details section. |

---

### TC-08 — Phase4B.Dev3.OpenAccess.ACES — Verify ACES Activation Notification — `In Progress` payload mapping

**Test Objective:** Ensure In Progress notification updates Telflow Order state.

**Pre Conditions:** ACES order is in `Accepted` state.

**Expected Result:** Order transitions to `In Progress`.

| Step | Step Action | Step Expected |
|------|-------------|---------------|
| 1 | Verify and trigger `Step-02-ACES-InProgress.bru`. | Response `200 OK`. Body contains `providerStatus = In Progress`. |
| 2 | Open Telflow System tab. | Notification is generated with `providerStatus = In Progress`. |
| 3 | Verify Order state on Telflow Portal. | Order state = `In Progress`, sub-state = `In Progress`. |

---

### TC-09 — Phase4B.Dev3.OpenAccess.ACES — Verify ACES Activation `Serial Number` Notification — Inventory & Service Account update

**Test Objective:** Ensure the `Serial Number Notification` updates the CPE inventory with the new serial number, and `serviceAccNum` is captured on the order.

**Pre Conditions:** ACES order is in `In Progress` state. `acesCpeIntegrationId` and `acesCpeSerialNumber` are set.

**Expected Result:** Telflow updates the CPE/ONT inventory record (matched by `integrationId`) with `newSerialNumber`, and persists `serviceAccNum` on Order Details.

| Step | Step Action | Step Expected |
|------|-------------|---------------|
| 1 | Verify the payload `Step-03-ACES-Serial-Number-Notification.bru`. | `orderStatus = Installation Completed`, `devices[]` contains the integration id and serial number, `serviceAccNum = {{acesServiceAccNum}}`. |
| 2 | Trigger the request via Bruno. | Response `200 OK`. |
| 3 | Open Telflow Inventory and search by `integrationId = {{acesCpeIntegrationId}}`. | The inventory record is updated with the new serial number. |
| 4 | Open Telflow Order Details. | `serviceAccNum` is reflected in the Order header / Service section. |

---

### TC-10 — Phase4B.Dev3.OpenAccess.ACES — Verify ACES Activation `Completed` Notification — Final state on OA side

**Test Objective:** Ensure the `Completed` notification finalises the OA-side workflow and signals downstream nodes.

**Pre Conditions:** ACES order has received the Serial Number notification.

**Expected Result:** Order's OA branch is marked Completed; downstream Mobily-Infra / Activation Action is triggered per BPMN.

| Step | Step Action | Step Expected |
|------|-------------|---------------|
| 1 | Trigger `Step-04-ACES-Completed.bru`. | Response `200 OK`. |
| 2 | Verify in Telflow System tab. | Notification with `providerStatus = Completed` is logged. |
| 3 | Verify BPMN flow. | OA Fulfillment process for ACES reaches the `Activation Service Installation Completed` end event. |

---

### TC-11 — Phase4B.Dev3.OpenAccess.ACES — Verify ACES Cancellation flow — End-to-End (Received → Accepted → In Progress → Cancelled)

**Test Objective:** Ensure the full ACES Cancellation Service Installation notification chain is accepted and order is set to `Cancelled`.

**Pre Conditions:** An ACES order is in cancellation pending state (e.g. cancelled from portal or auto-cancelled).

**Expected Result:** Telflow processes all 4 cancellation notifications, order final state = `CANCELLED`, TMF 622 cancellation notification is sent to SingleView.

| Step | Step Action | Step Expected |
|------|-------------|---------------|
| 1 | Trigger `Cancellation-Service-Installation/Step-01-ACES-Received.bru`. | Response `200 OK`. Notification with `providerStatus = Received` is logged in System tab. |
| 2 | Trigger `Step-02-ACES-Accepted.bru`. | Response `200 OK`. `providerStatus = Accepted` (cancellation accepted by ACES). |
| 3 | Trigger `Step-03-ACES-InProgress.bru`. | Response `200 OK`. `providerStatus = In Progress` (cancellation in progress). |
| 4 | Trigger `Step-04-ACES-Cancelled.bru`. | Response `200 OK`. `providerStatus = Cancelled`. |
| 5 | Verify Telflow Portal final state. | Order state = `CANCELLED`. |
| 6 | Verify TMF 622 outbound to SingleView. | TMF 622 notification with `state = cancelled` is sent to SV. |

---

### TC-12 — Phase4B.Dev3.OpenAccess.ACES — Verify ACES Modification — Service Installation Completed

**Test Objective:** Ensure Modification Completed notification updates the order with the new service account number and order transaction number.

**Pre Conditions:** An ACES Modification order is pending Completion notification.

**Expected Result:** `providerStatus = Completed`, `serviceAccNum` and `orderTransactionNo` are reflected on Order Details.

| Step | Step Action | Step Expected |
|------|-------------|---------------|
| 1 | Trigger `Modification-Service-Installation/ACES-Modification-Completed.bru`. | Response `200 OK`. |
| 2 | Open Telflow System tab. | `serviceOrderStateChangeNotification` with `funcId = UPDATE_ORDER`, `providerStatus = Completed`, `orderTransactionNo` and `serviceAccNum` is logged. |
| 3 | Verify Order Details on Telflow. | `orderTransactionNo` and `serviceAccNum` are stored on the Modification order. |
| 4 | Verify final order state. | Modification order reaches `Completed`. |

---

### TC-13 — Phase4B.Dev3.OpenAccess.ACES — Verify ACES Device Swap — End-to-End (Accepted → In Progress → Serial Number → Completed)

**Test Objective:** Ensure the ACES Device Swap flow processes all 4 notifications, swaps the CPE serial number on inventory, and finishes with `Completed`.

**Pre Conditions:** An ACES Device Swap order is created and is in `In Progress`. New `acesCpeIntegrationId` and `acesCpeSerialNumber` are configured.

**Expected Result:** All 4 notifications are processed, the CPE inventory is updated with the new serial number, and the order is `Completed`.

| Step | Step Action | Step Expected |
|------|-------------|---------------|
| 1 | Trigger `DeviceSwap-Service-Installation/Step-01-ACES-Accepted.bru`. | Response `200 OK`, notification logged. |
| 2 | Trigger `Step-02-ACES-InProgress.bru`. | Response `200 OK`, status = In Progress. |
| 3 | Trigger `Step-03-ACES-Serial-Number-Notification.bru`. | Response `200 OK`. CPE inventory updated with the new serial number. |
| 4 | Trigger `Step-04-ACES-Completed.bru`. | Response `200 OK`. Device Swap order final state = `Completed`. |
| 5 | Verify Inventory and Order Details. | Inventory reflects the swapped serial number; Order Details reflects `serviceAccNum`. |

---

### TC-14 — Phase4B.Dev3.OpenAccess.ACES — Verify ACES Relocation — End-to-End (Accepted → In Progress → Completed)

**Test Objective:** Ensure the ACES Relocation Service Installation notifications transition the order through to Completion.

**Pre Conditions:** An ACES Relocation order has been created in Telflow.

**Expected Result:** Relocation reaches `Completed` and address change is reflected on the order.

| Step | Step Action | Step Expected |
|------|-------------|---------------|
| 1 | Trigger `Relocation-Service-Installation/Step-01-ACES-Accepted.bru`. | Response `200 OK`. Notification with `providerStatus = Accepted` logged. |
| 2 | Trigger `Step-02-ACES-InProgress.bru`. | Response `200 OK`. Order in `In Progress`. |
| 3 | Trigger `Step-03-ACES-Completed.bru`. | Response `200 OK`. `providerStatus = Completed`. |
| 4 | Verify Telflow Portal. | Relocation order reaches `Completed`, the new address is reflected on Order Details. |

---

### TC-15 — Phase4B.Dev3.OpenAccess.ACES — Verify ACES Rewiring — End-to-End (Accepted → In Progress → Completed)

**Test Objective:** Ensure the ACES Rewiring Service Installation notifications transition the order through to Completion.

**Pre Conditions:** An ACES Rewiring order exists in Telflow.

**Expected Result:** Rewiring reaches `Completed`.

| Step | Step Action | Step Expected |
|------|-------------|---------------|
| 1 | Trigger `Rewiring-Service-Installation/Step-01-ACES-Accepted.bru`. | Response `200 OK`. Notification logged. |
| 2 | Trigger `Step-02-ACES-InProgress.bru`. | Response `200 OK`. |
| 3 | Trigger `Step-03-ACES-Completed.bru`. | Response `200 OK`. Order status = `Completed`. |
| 4 | Verify Order Details. | Updated wiring details reflected if mapped. |

---

### TC-16 — Phase4B.Dev3.OpenAccess.ACES — Verify ACES Suspend — Service Installation Completed

**Test Objective:** Ensure `Suspend Completed` notification suspends the ACES service.

**Pre Conditions:** An active ACES service is requested to suspend.

**Expected Result:** Order final state = `Completed (Suspended)`; `serviceAccNum` and `orderTransactionNo` are reflected.

| Step | Step Action | Step Expected |
|------|-------------|---------------|
| 1 | Trigger `Suspend-Service-Installation/ACES-Suspend-Completed.bru`. | Response `200 OK`. `providerStatus = Completed` with `funcId = UPDATE_ORDER`. |
| 2 | Verify Telflow System tab. | Notification logged with `serviceAccNum` and `orderTransactionNo`. |
| 3 | Verify Order state. | Suspend order = Completed; underlying service marked Suspended. |

---

### TC-17 — Phase4B.Dev3.OpenAccess.ACES — Verify ACES Resume — Service Installation Completed

**Test Objective:** Ensure `Resume Completed` notification reactivates the ACES service.

**Pre Conditions:** A suspended ACES service is requested to resume.

**Expected Result:** Resume order = `Completed`, service back to active.

| Step | Step Action | Step Expected |
|------|-------------|---------------|
| 1 | Trigger `Resume-Service-Installation/ACES-Resume-Completed.bru`. | Response `200 OK`. |
| 2 | Verify Telflow System tab. | Notification logged with `providerStatus = Completed`. |
| 3 | Verify Service / Inventory state. | Service is reactivated. |

---

### TC-18 — Phase4B.Dev3.OpenAccess.ACES — Verify ACES Termination — Service Installation Completed

**Test Objective:** Ensure `Termination Completed` notification terminates the ACES service.

**Pre Conditions:** An ACES service is requested to terminate.

**Expected Result:** Termination = `Completed`, inventory deactivated, service closed.

| Step | Step Action | Step Expected |
|------|-------------|---------------|
| 1 | Trigger `Termination-Service-Installation/ACES-Termination-Completed.bru`. | Response `200 OK`. |
| 2 | Verify Telflow System tab. | Notification with `providerStatus = Completed` logged. |
| 3 | Verify Inventory & Service. | CPE / Service status moved to terminated / inactive on Telflow Inventory. |

---

### TC-19 — Phase4B.Dev3.OpenAccess.ACES — Verify ACES Trouble Ticket — Resolved

**Test Objective:** Ensure ACES TT-Resolved notification is processed and the corresponding TT in Telflow is closed.

**Pre Conditions:** An open Trouble Ticket exists in Telflow tied to the ACES installation.

**Expected Result:** TT is closed/resolved on Telflow.

| Step | Step Action | Step Expected |
|------|-------------|---------------|
| 1 | Trigger `TroubleTicket-Notification/ACES-TT-Resolved.bru`. | Response `200 OK`. Body contains `providerStatus = Resolved`, `providerComments = "ODB Port Clean"`. |
| 2 | Verify Telflow System tab. | Notification logged with `providerStatus = Resolved`. |
| 3 | Verify Trouble Ticket on Telflow. | TT is closed/resolved; the parent ACES order resumes the original BPMN node. |

---

### TC-20 — Phase4B.Dev3.OpenAccess.ACES — Verify ACES Trouble Ticket — Rejected

**Test Objective:** Ensure ACES TT-Rejected notification is processed and the parent order goes to the failure / treatment branch.

**Pre Conditions:** An open Trouble Ticket exists.

**Expected Result:** TT is marked rejected, parent order is routed to the rejection treatment.

| Step | Step Action | Step Expected |
|------|-------------|---------------|
| 1 | Trigger `TroubleTicket-Notification/ACES-TT-Rejected.bru`. | Response `200 OK`. Body has `providerStatus = Rejected`, `providerComments = "ODB Port Clean not successful"`, `externalId = "1-{{acesInstallationId}}"`. |
| 2 | Verify Telflow System tab. | Notification with `providerStatus = Rejected` logged. |
| 3 | Verify TT and parent order. | TT marked Rejected; parent order moves to the rejection / cancellation branch. |

---

### TC-21 — Phase4B.Dev3.OpenAccess.ACES — Verify Installation Failure (T1) — `R-OM-001` Systematic Rejection

**Test Objective:** Ensure ACES installation-failure notification with reasonCode `R-OM-001` triggers the **Systematic Rejection** treatment in Telflow.

**Pre Conditions:**
- ACES order is `In Progress` with installation pending.
- `acesInstallationId` and `acesServiceAccNum` are set.

**Expected Result:** Telflow logs the failure, the SV `Installation Failure Action` is generated with `treatmentCategory = Systematic Rejection` (or equivalent OA mapping), and the order state moves to `IN PROGRESS / On Hold`.

| Step | Step Action | Step Expected |
|------|-------------|---------------|
| 1 | Verify the payload `(T1) ACES - R-OM-001 - SYSTEMATIC REJECTION.bru`. | `funcId = ACES_ORDER_UPDATE`, `providerStatus = Failure`, `reasonCode = R-OM-001`, `reasonText = "VALIDATION OF CUSTOMER ORDER IS NOT PASSED"`. |
| 2 | Trigger the request via Bruno. | Response is `200 OK`. |
| 3 | Verify Telflow System tab. | `serviceOrderStateChangeNotification` with `providerStatus = Failure` and `reasonCode = R-OM-001` is logged. |
| 4 | Verify Treatment process triggered. | The OA Handle Installation Failure process triggers the `Systematic Rejection` treatment branch. Installation Failure Action Request is sent to SingleView. |
| 5 | Verify Order state. | Order state moves to `IN PROGRESS / On Hold`. |

---

### TC-22 — Phase4B.Dev3.OpenAccess.ACES — Verify Installation Failure (T2) — `R-OM-002` Customer Rejection

**Test Objective:** Ensure `R-OM-002` triggers the **Customer Rejection** treatment.

**Pre Conditions:** Same as TC-21.

**Expected Result:** Telflow routes the failure to Customer Rejection treatment (re-attempt / wrong contact).

| Step | Step Action | Step Expected |
|------|-------------|---------------|
| 1 | Verify and trigger `(T2) ACES - R-OM-002 - CUSTOMER REJECTION.bru`. | `200 OK`. Body has `reasonCode = R-OM-002`, `reasonText = "CANNOT CONTACT THE END-CUSTOMER"`. |
| 2 | Verify Telflow System tab. | Failure notification with `reasonCode = R-OM-002` logged. |
| 3 | Verify treatment routing. | OA Handle Installation Failure → Customer Rejection treatment branch is taken; SV `Installation Failure Action` is created with `treatmentCategory` mapped to Customer Rejection. |

---

### TC-23 — Phase4B.Dev3.OpenAccess.ACES — Verify Installation Failure (T3) — `R-OM-003` Provider Rejection

**Test Objective:** Ensure `R-OM-003` triggers the **Provider Rejection** treatment (capacity / no idle resource).

**Pre Conditions:** Same as TC-21.

**Expected Result:** Provider Rejection treatment branch is executed.

| Step | Step Action | Step Expected |
|------|-------------|---------------|
| 1 | Verify and trigger `(T3) ACES - R-OM-003 - PROVIDER REJECTION.bru`. | `200 OK`. `reasonCode = R-OM-003`, `reasonText = "NETWORK IS PLANNING OR NO IDLE RESOURCE FOR SERVICE"`. |
| 2 | Verify Telflow System tab. | Failure notification logged with `reasonCode = R-OM-003`. |
| 3 | Verify treatment routing. | Provider Rejection treatment branch triggered; SV `Installation Failure Action` is generated. |

---

### TC-24 — Phase4B.Dev3.OpenAccess.ACES — Verify Installation Failure (T4) — `R-OM-005` Unknown Rejection

**Test Objective:** Ensure `R-OM-005` falls into the **Unknown Rejection** treatment fallback path.

**Pre Conditions:** Same as TC-21.

**Expected Result:** Unknown / fallback treatment path is taken.

| Step | Step Action | Step Expected |
|------|-------------|---------------|
| 1 | Verify and trigger `(T4) ACES - R-OM-005 - UNKNOWN REJECTION.bru`. | `200 OK`. `reasonCode = R-OM-005`, `reasonText = "NETWORK IS AVAILABLE FOR SERVICE"`. |
| 2 | Verify System tab. | Failure notification logged. |
| 3 | Verify treatment routing. | The Unknown Rejection / fallback branch is taken; SV `Installation Failure Action` is created with `treatmentCategory = Unknown Rejection`. |

---

### TC-25 — Phase4B.Dev3.OpenAccess.ACES — Verify Installation Failure (D1) — `R-OM-006` Product Relationship Conflict (dynamic)

**Test Objective:** Ensure `R-OM-006` with two dynamic `[prodInstId]` placeholders is parsed and routed correctly, and both IDs are surfaced in Telflow.

**Pre Conditions:** ACES order is in `In Progress`.

**Expected Result:** Both `prodInstA` and `prodInstB` IDs are visible in Telflow logs / Action Request `comments`.

| Step | Step Action | Step Expected |
|------|-------------|---------------|
| 1 | Verify the payload `(D1) ACES - R-OM-006 - Product Relationship Conflict.bru`. | The `pre-request` script generates `randomProdInstAId = FTTH<12 digits>` and `randomProdInstBId = FTTH<12 digits>`, embedded in `providerComments` and `reasonText`. |
| 2 | Trigger the request via Bruno. | `200 OK`. |
| 3 | Verify Telflow System tab. | Notification logged with `reasonCode = R-OM-006` and the rendered `reasonText` containing both random IDs. |
| 4 | Verify treatment routing & SV Action. | Failure treatment branch triggered; SV `Installation Failure Action Request` `comments` field carries both IDs. |
| 5 | Re-trigger to verify dynamic generation. | A new pair of IDs is generated on every send (no cached values). |

---

### TC-26 — Phase4B.Dev3.OpenAccess.ACES — Verify Installation Failure (D2) — `R-OM-007` Product Not Orderable (dynamic)

**Test Objective:** Ensure `R-OM-007` dynamic `[prodSpecCode]` is parsed and the failure routed correctly.

**Pre Conditions:** Same as TC-25.

**Expected Result:** Generated `prodSpecCode` (`MOB-FTTH-<FAMILY>-<NN>-<NN>`) is surfaced in Telflow.

| Step | Step Action | Step Expected |
|------|-------------|---------------|
| 1 | Verify and trigger `(D2) ACES - R-OM-007 - Product Not Orderable.bru`. | `200 OK`. `reasonCode = R-OM-007`, `reasonText` contains `randomProdSpecCode`. |
| 2 | Verify Telflow System tab. | Failure notification logged with rendered `reasonText`. |
| 3 | Verify SV `Installation Failure Action Request`. | `comments`/`reasonText` contains the generated `prodSpecCode`. |

---

### TC-27 — Phase4B.Dev3.OpenAccess.ACES — Verify Installation Failure (D3) — `R-OM-010` Product Cannot Be Deleted (dynamic)

**Test Objective:** Ensure `R-OM-010` with both `[prodSpecCode]` and `[prodInstaId]` is parsed and routed.

**Pre Conditions:** Same as TC-25.

**Expected Result:** Both dynamic IDs visible in Telflow.

| Step | Step Action | Step Expected |
|------|-------------|---------------|
| 1 | Verify and trigger `(D3) ACES - R-OM-010 - Product Cannot Be Deleted.bru`. | `200 OK`. `reasonCode = R-OM-010`. `reasonText` carries both `randomProdSpecCode` and `randomProdInstaId`. |
| 2 | Verify Telflow System tab. | Failure notification logged. |
| 3 | Verify SV Action `comments`. | Both random IDs reflected. |

---

### TC-28 — Phase4B.Dev3.OpenAccess.ACES — Verify Installation Failure (D4) — `R-OM-012` Address Not Found (dynamic)

**Test Objective:** Ensure `R-OM-012` with dynamic 8-digit `[addressId]` is parsed and routed.

**Pre Conditions:** Same as TC-25.

**Expected Result:** Dynamic `addressId` visible.

| Step | Step Action | Step Expected |
|------|-------------|---------------|
| 1 | Verify and trigger `(D4) ACES - R-OM-012 - Address Not Found.bru`. | `200 OK`. `reasonCode = R-OM-012`. `reasonText` contains the generated 8-digit `randomAddressId`. |
| 2 | Verify Telflow System tab. | Failure notification logged. |
| 3 | Verify SV Action / Address-related routing. | Treatment branch surfaces the generated `addressId` in `comments`. |

---

### TC-29 — Phase4B.Dev3.OpenAccess.ACES — Verify Auto-Cancellation in Open Access (ACES) FTTH During Activation Order

**Test Objective:** Ensure that when ACES emits an installation-failure during Activation, Telflow auto-cancels the order and rolls back to ACES.

**Pre Conditions:**
- An ACES Activation order is `In Progress`.
- Auto-Cancellation is enabled in Telflow.

**Expected Result:** Final order state = `CANCELLED`, TMF 622 cancellation notification is sent to SV with `state = cancelled`.

| Step | Step Action | Step Expected |
|------|-------------|---------------|
| 1 | Simulate an ACES Installation Failure by sending the `(T1) ACES - R-OM-001` payload. | `200 OK`. Telflow logs the failure notification. |
| 2 | Check System Tab to verify Telflow initiates the Treatment process. | Telflow successfully sends the mapped Action API request to SingleView. |
| 3 | Monitor the Order State transition in Telflow Portal. | Order transitions from `IN PROGRESS / On Hold` to `Assessing Cancellation`, then `Pending Cancellation`. |
| 4 | Check System Tab to verify Rollback execution towards ACES. | Cancel Service Installation Request is successfully sent to ACES (`Cancellation` flow Step-01 / Step-02 endpoints). |
| 5 | Simulate ACES Cancellation Completion by sending the async `Step-04-ACES-Cancelled.bru`. | Telflow successfully accepts the ACES rollback completion response. |
| 6 | Monitor final state in Telflow Portal and verify TMF 622 notification. | Final Order state = `CANCELLED`. TMF 622 Notification sent to SV with `state = cancelled`. |

---

### TC-30 — Phase4B.Dev3.OpenAccess.ACES — Verify Auto-Cancellation in Open Access (ACES) FTTH During Device Swap Order

**Test Objective:** Same as TC-29 but for a Device Swap order on ACES.

**Pre Conditions:** A Device Swap order on ACES is `In Progress`.

**Expected Result:** Final state = `CANCELLED`.

| Step | Step Action | Step Expected |
|------|-------------|---------------|
| 1 | Simulate ACES Installation Failure on the Device Swap order via `(T2) ACES - R-OM-002`. | `200 OK`. Failure logged. |
| 2 | Verify Treatment process and SV Action. | Telflow sends the mapped Action API request to SingleView. |
| 3 | Monitor Order state. | Order transitions to `Assessing Cancellation` → `Pending Cancellation`. |
| 4 | Verify Rollback to ACES. | Cancel Service Installation Request sent to ACES. |
| 5 | Send `Step-04-ACES-Cancelled.bru`. | Cancellation completion accepted. |
| 6 | Verify final state and TMF 622 outbound. | Order = `CANCELLED`. TMF 622 with `state = cancelled` sent to SV. |

---

### TC-31 — Phase4B.Dev3.OpenAccess.ACES — Verify Auto-Cancellation in Open Access (ACES) FTTH During Relocation Order

**Test Objective:** Same as TC-29 but for a Relocation order on ACES.

**Pre Conditions:** Relocation order on ACES is `In Progress`.

**Expected Result:** Order auto-cancelled.

| Step | Step Action | Step Expected |
|------|-------------|---------------|
| 1 | Simulate ACES Installation Failure during Relocation via `(T3) ACES - R-OM-003`. | `200 OK`. Failure logged. |
| 2 | Verify Treatment + SV Action. | Mapped Action API request sent to SV. |
| 3 | Monitor Order state. | Transitions to `Assessing Cancellation` → `Pending Cancellation`. |
| 4 | Verify Rollback to ACES. | Cancel Service Installation Request sent to ACES. |
| 5 | Send `Step-04-ACES-Cancelled.bru`. | Cancellation completion accepted. |
| 6 | Verify final state. | Order = `CANCELLED`. TMF 622 cancelled-state notification sent to SV. |

---

### TC-32 — Phase4B.Dev3.OpenAccess.ACES — Verify Auto-Cancellation in Open Access (ACES) FTTH During Rewiring Order

**Test Objective:** Same as TC-29 but for a Rewiring order on ACES.

**Pre Conditions:** Rewiring order on ACES is `In Progress`.

**Expected Result:** Order auto-cancelled.

| Step | Step Action | Step Expected |
|------|-------------|---------------|
| 1 | Simulate ACES Installation Failure during Rewiring via `(T4) ACES - R-OM-005`. | `200 OK`. Failure logged. |
| 2 | Verify Treatment + SV Action. | SV Action request generated. |
| 3 | Monitor Order state. | `Assessing Cancellation` → `Pending Cancellation`. |
| 4 | Verify Rollback to ACES. | Cancel Service Installation Request sent. |
| 5 | Send `Step-04-ACES-Cancelled.bru`. | Cancellation accepted. |
| 6 | Verify final state. | Order = `CANCELLED`, TMF 622 cancelled notification sent to SV. |

---

### TC-33 — Phase4B.Dev3.OpenAccess.ACES — Verify duplicate `eventId` is handled idempotently

**Test Objective:** Ensure Telflow does not double-process when the same `eventId` is received twice for the same ACES status.

**Pre Conditions:** ACES order is `In Progress`.

**Expected Result:** First call updates state and is logged; second call is rejected or silently de-duplicated. No double state-transition.

| Step | Step Action | Step Expected |
|------|-------------|---------------|
| 1 | Trigger `Step-02-ACES-InProgress.bru` once. | `200 OK`. Notification logged once in System tab. Order state updated. |
| 2 | Re-trigger the same payload (same `eventId`) without changing any value. | `200 OK` (or de-dup acknowledged), but no second state transition occurs. System tab shows the de-duplication / idempotent behaviour. |
| 3 | Verify Order Details. | No double mapping; counters / audit logs do not double-increment. |

---

### TC-34 — Phase4B.Dev3.OpenAccess.ACES — Verify out-of-sequence notification (Completed before In Progress) is rejected / handled

**Test Objective:** Ensure that if `Completed` arrives before `In Progress`, Telflow rejects the out-of-order event or queues it according to BPMN rules.

**Pre Conditions:** ACES order is in `Accepted` state (no `In Progress` yet received).

**Expected Result:** Out-of-order `Completed` is rejected with a logged warning (or state machine ignores the event), and the order remains in `Accepted`.

| Step | Step Action | Step Expected |
|------|-------------|---------------|
| 1 | With order in `Accepted`, trigger `Step-04-ACES-Completed.bru` directly. | `200 OK` accepted at API level. |
| 2 | Verify Telflow System tab and BPMN. | Telflow logs the event but does not transition to `Completed`; order remains in `Accepted` (or `In Progress` per state-machine rules). A warning / unexpected-event entry is logged. |
| 3 | Trigger `Step-02-ACES-InProgress.bru`. | Order resumes the normal flow into `In Progress`. |

---

### TC-35 — Phase4B.Dev3.OpenAccess.ACES — Verify request rejected when bearer token is missing/invalid

**Test Objective:** Ensure unauthorised requests to `/serviceInstallationManagement/v1/notification/` are rejected.

**Pre Conditions:** None.

**Expected Result:** API responds with `401 Unauthorized`.

| Step | Step Action | Step Expected |
|------|-------------|---------------|
| 1 | Remove or invalidate the bearer token in Bruno and trigger `Step-01-ACES-Accepted.bru`. | Response is `401 Unauthorized`. |
| 2 | Verify Telflow logs. | No notification is generated in Telflow System tab. |

---

### TC-36 — Phase4B.Dev3.OpenAccess.ACES — Verify notification rejected when `externalId` is unknown / not provisioned

**Test Objective:** Ensure that ACES notifications referencing an unknown `acesInstallationId` are rejected with a clear error.

**Pre Conditions:** No ACES order exists for the `externalId` value used.

**Expected Result:** Telflow returns an error (e.g. `404` or `400`) and no order is impacted.

| Step | Step Action | Step Expected |
|------|-------------|---------------|
| 1 | Override `acesInstallationId` to a non-existent value in Bruno. | — |
| 2 | Trigger `Step-01-ACES-Accepted.bru`. | Response is an error (`404` Not Found or `400` Bad Request) per the API contract. |
| 3 | Verify Telflow logs. | An error / not-found entry is logged; no order state is updated. |

---

### TC-37 — Phase4B.Dev3.OpenAccess.ACES — Verify Order Details synchronisation for ACES end-to-end activation

**Test Objective:** Ensure all attributes from TMF 622 + ACES notifications are reflected on Telflow Order Details / Service section / Inventory.

**Pre Conditions:** ACES order is in `Completed` after running TC-06 end-to-end.

**Expected Result:** Order Details show ACES infraProvider, customer details, ODB, CPE, appointment, serviceAccNum, CPE serial number — all consistent with the original payloads.

| Step | Step Action | Step Expected |
|------|-------------|---------------|
| 1 | Open Telflow Portal → search by Order ID. | Order found, state = `Completed`. |
| 2 | Verify Order Details — Infrastructure section. | `infraProvider = ACES`, ODB id, region and geo coordinates from TMF 622 are reflected. |
| 3 | Verify Order Details — Customer section. | SAN, CAN, customerName, surname, contacts, address all match TMF 622. |
| 4 | Verify Order Details — Service section. | `serviceAccNum = {{acesServiceAccNum}}` from the Serial Number Notification. |
| 5 | Verify Inventory record by `integrationId`. | CPE/ONT inventory record carries the `acesCpeSerialNumber`. |
| 6 | Verify TMF 622 outbound to SingleView. | Final TMF 622 notification with `state = completed` is sent to SV. |

---

## Suggested ADO Import Mapping

When you upload these test cases into Azure DevOps, the columns map as follows (consistent with the existing CSVs in `Test-Cases/`):

| ADO Column | Source from this MD |
|------------|---------------------|
| Work Item Type | `Test Case` |
| Title | The `### TC-xx — ...` heading |
| Description | `Test Objective` + `Pre Conditions` + `Expected Result` blocks |
| Test Step | Row number (1, 2, …) |
| Step Action | Left column "Step Action" of the table |
| Step Expected | Right column "Step Expected" of the table |
| Area Path | `New Stack Impl\Solution\CSG\CSG QandO` |

---

## Quick Coverage Matrix (use cases × test case IDs)

| Use Case Group                        | TC IDs |
|---------------------------------------|--------|
| TMF 622 Order Creation                | TC-01, TC-02, TC-03, TC-04, TC-05 |
| Activation (E2E + per step)           | TC-06, TC-07, TC-08, TC-09, TC-10 |
| Cancellation                          | TC-11 |
| Modification                          | TC-12 |
| Device Swap                           | TC-13 |
| Relocation                            | TC-14 |
| Rewiring                              | TC-15 |
| Suspend / Resume / Termination        | TC-16, TC-17, TC-18 |
| Trouble Ticket                        | TC-19, TC-20 |
| Installation Failure (Standard T1–T4) | TC-21, TC-22, TC-23, TC-24 |
| Installation Failure (Dynamic D1–D4)  | TC-25, TC-26, TC-27, TC-28 |
| Auto-Cancellation                     | TC-29, TC-30, TC-31, TC-32 |
| Idempotency / Out-of-order            | TC-33, TC-34 |
| Negative — auth / unknown order       | TC-35, TC-36 |
| Order Details synchronisation         | TC-37 |
