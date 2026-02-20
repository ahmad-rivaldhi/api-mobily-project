# FTTH - Mobily - Project

**Organized API Collection for FTTH (Fiber To The Home) Solution - Mobily Implementation**

---

## 📋 **Table of Contents**

1. [Overview](#overview)
2. [Project Structure](#project-structure)
3. [Environments](#environments)
4. [API Categories](#api-categories)
5. [Workflow Execution Order](#workflow-execution-order)
6. [Getting Started](#getting-started)

---

## 🎯 **Overview**

This Bruno API collection contains a comprehensive, well-organized set of APIs for the FTTH (Fiber To The Home) solution implementation for Mobily. The collection includes:

- **Product Order Management (TMF622)** - Create orders for Mobily and OpenAccess providers
- **Service Notifications (TMF641)** - Order state change notifications
- **Workforce Management (WFM)** - CPE and Mesh Extender installation workflows
- **OpenAccess Provider Workflows** - DAWIYAT, ITC, and STC provider integrations
- **SingleView Integration** - Customer-facing APIs for appointments, cancellations, and notifications

**Total APIs:** ~100+ endpoints organized across 24 functional categories

---

## 📁 **Project Structure**

```
FTTH - Mobily - Project/
├── environments/              # Environment configurations (AWS Dev & On-Prem Dev)
├── Authentication/            # Auth APIs (Admin & Provider)
├── Product-Order-Management-TMF622/
│   └── Create-Order/
│       ├── Mobily/           # Mobily orders (Regular & Royal customers)
│       │   ├── Regular-Customer/
│       │   │   ├── Postpaid/ (No ME, 1 ME, 2 ME, 3 ME)
│       │   │   └── Prepaid/  (No ME, 1 ME, 2 ME, 3 ME)
│       │   └── Royal-Customer/
│       │       └── Postpaid/  (No ME, 1 ME, 2 ME, 3 ME)
│       └── OpenAccess/        # OpenAccess provider orders
│           ├── DAWIYAT/
│           ├── ITC/
│           └── STC/
├── Service-Order-Notifications-TMF641/ # TMF641 Notifications
├── Workforce-Management-WFM/
│   ├── CPE-Installation-Workflow/      # 9-step CPE workflow
│   ├── Mesh-Extender-Installation-Workflow/ # 11-step ME workflow
│   └── Installation-Failure-Scenarios/
│       ├── Mobily/
│       └── OpenAccess/
├── OpenAccess-Provider-Workflows/
│   ├── DAWIYAT/              # 7-step activation + modification
│   ├── ITC/                  # 6-step activation + modification
│   └── STC/                  # 6-step activation + SQ notifications
└── SingleView-Integration/
    ├── Appointment-Management/
    ├── Order-Cancellation/
    ├── Order-Completion/
    ├── Installation-Failure-Actions/
    └── Custom-Notifications/
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
- `dawiyatInstallationId`, `itcInstallationId`, `stcInstallationId` - Provider IDs

---

## 📚 **API Categories**

### **1. Authentication**
- `Auth-Admin.bru` - Admin authentication
- `Auth-Provider.bru` - Provider authentication

### **2. Product Order Management (TMF622)**

#### **Create Order - Mobily**
**Regular Customer:**
- Postpaid: No ME, 1 ME, 2 ME, 3 ME (4 APIs)
- Prepaid: No ME, 1 ME, 2 ME, 3 ME (4 APIs)

**Royal Customer:**
- Postpaid: No ME, 1 ME, 2 ME, 3 ME (4 APIs)

#### **Create Order - OpenAccess**
- **DAWIYAT:** No ME, 1 ME, 2 ME, 3 ME (4 APIs)
- **ITC:** No ME, 1 ME, 2 ME, 3 ME (4 APIs)
- **STC:** No ME, 1 ME, 2 ME, 3 ME (4 APIs)

**Total Product Order APIs:** 24

### **3. Service Order Notifications (TMF641)**
- Service-Order-Acknowledged
- Service-Order-InProgress
- Service-Order-Completed
- Service-Order-Error-1000-OK

**Total:** 4 APIs

### **4. Workforce Management (WFM)**

#### **CPE Installation Workflow (9 Steps)**
1. CPE-1000-OK
2. CPE-Ready
3. CPE-Acknowledged
4. CPE-Accepted
5. CPE-Trip-Started
6. CPE-Customer-Premises
7. CPE-In-Work
8. CPE-Installation-Completed
9. CPE-UAT-Completed

#### **Mesh Extender Installation Workflow (11 Steps)**
1. ME-1000-OK
2. ME-Ready
3. ME-Acknowledged
4. ME-Accepted
5. ME-Trip-Started
6. ME-Customer-Premises
7. ME-In-Work
8. ME-Installation-Completed (1-ME, 2-ME, 3-ME variants)
9. ME-UAT-Completed

#### **Installation Failure Scenarios**
- **Mobily:** 7 failure scenarios
- **OpenAccess:** 2 failure scenarios

**Total WFM APIs:** 29

### **5. OpenAccess Provider Workflows**

#### **DAWIYAT (9 APIs)**
- **Activation (7 steps):** Acknowledged → Dispatch → Departure → Arrival → HAG Activation → Serial Number → Completed
- **Modification (1 API):** Modification Completed
- **InProgress states:** Dispatch, Departure, Arrival, HAG Activation

#### **ITC (7 APIs)**
- **Activation (6 steps):** Create Task → Accepted → Assigned → SetOff → Serial Number → Success
- **Modification (1 API):** Modification Completed

#### **STC (13 APIs)**
- **Activation (6 steps):** WO Created → Technician Assignment → Working → Test Link → Activate ONT → Closed
- **Modification (1 API):** Modification Completed
- **Service Qualification (6 APIs):** Acknowledged, InProgress, Feasibility Check, Approved, Rejected, Completed

**Total OpenAccess APIs:** 29

### **6. SingleView Integration**

#### **Appointment Management (4 APIs)**
- Schedule-Appointment
- Appointment-Booked
- Appointment-Not-Booked
- Appointment-Not-Required

#### **Order Cancellation (4 APIs)**
- Pre-Cancellation
- Cancel-Order-Verification-Booked-Appointment
- Cancel-Order-Verification-Cancelling-Order

#### **Order Completion (3 APIs)**
- Pre-Completion
- Provisioning-Completed
- UAT-Completed

#### **Installation Failure Actions (5 APIs)**
- Problem-Resolved
- Problem-Not-Resolved
- Update-Contact-Number
- Update-odbId

#### **Custom Notifications (1 API)**
- ODB-Patch-Notification

**Total SingleView APIs:** 17

---

## 🔄 **Workflow Execution Order**

### **Typical FTTH Activation Flow:**

#### **1. Create Order (TMF622)**
```
POST /tmf-api/productOrderingManagement/v4/productOrder/
```
Select appropriate endpoint based on:
- Provider: Mobily or OpenAccess (DAWIYAT/ITC/STC)
- Customer Type: Regular or Royal
- Payment Type: Postpaid or Prepaid
- Mesh Extenders: None, 1, 2, or 3

#### **2. Service Order Notification (TMF641)**
```
Acknowledged → InProgress → Completed
```

#### **3. WFM CPE Installation**
```
1000-OK → Ready → Acknowledged → Accepted → Trip Started → 
Customer Premises → In Work → Installation Completed → UAT Completed
```

#### **4. WFM Mesh Extender Installation** (if applicable)
```
1000-OK → Ready → Acknowledged → Accepted → Trip Started → 
Customer Premises → In Work → Installation Completed (1/2/3 ME) → UAT Completed
```

#### **5. OpenAccess Provider Workflow** (if OpenAccess)

**DAWIYAT:**
```
Acknowledged → Dispatch → Departure → Arrival → 
HAG Activation → Serial Number → Completed
```

**ITC:**
```
Create Task → Accepted → Assigned → SetOff → 
Serial Number → Success
```

**STC:**
```
WO Created → Technician Assignment → Working → 
Test FTTH Link → Activate ONT → Closed
```

#### **6. SingleView Integration**
- Appointment scheduling and capture
- Order completion notifications
- Installation failure handling (if needed)

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
   - Run `Auth-Admin.bru` or `Auth-Provider.bru`
   - Copy the auth token to `authToken` environment variable

3. **Create Order**
   - Navigate to `Product-Order-Management-TMF622/Create-Order/`
   - Select appropriate provider and customer type
   - Choose ME variant (No ME, 1 ME, 2 ME, 3 ME)
   - Execute the API

4. **Follow Workflow**
   - Execute Service Order Notifications
   - Execute WFM workflows in sequence (follow step numbers)
   - Execute OpenAccess provider workflows (if applicable)
   - Execute SingleView APIs as needed

### **Tips**
- **Step Numbers:** WFM and OpenAccess workflow files are prefixed with step numbers (Step-01, Step-02, etc.) for easy execution order
- **ME Variants:** When creating orders with Mesh Extenders, ensure you use the corresponding ME installation API (1-ME, 2-ME, or 3-ME)
- **Installation Failures:** Use files in `Installation-Failure-Scenarios/` folder to test failure and recovery flows

---

## 📝 **Notes**

- All APIs follow TMF (TM Forum) standards for telecom operations
- APIs are organized by execution order for easy workflow testing
- Environment variables are pre-configured for quick testing
- Installation failure scenarios cover common real-world issues

---

## 🔗 **Related Documentation**

- TMF622 Product Ordering Management API Specification
- TMF641 Service Ordering Management API Specification
- Mobily FTTH Solution HLD (High-Level Design)
- FTTH Installation and Configuration Guide

---

**Version:** 1.0  
**Last Updated:** February 2026  
**Maintained By:** Mobily FTTH Integration Team


