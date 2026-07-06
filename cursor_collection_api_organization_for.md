# Collection API organization for mobile project
_Exported on 3/4/2026 at 03:18:54 GMT+7 from Cursor (2.2.36)_

---

**User**

okee sekarang analisa projectku ini, bantu aku re-organize collection api mobily project ini karena sudah semakin berkembang.

aku ingin organize collection api ini sesuai dengan documentation di folder ini @Documentation jadi awal kamu bisa pelajari semua dokumentasinya dan baru organize collcetion apinya

okee sekarang goalsnya berikan aku saran organize collection api yg proper dan scaleable, berikan aku rencanamu dulu sebelum kamu eksekusinya

---

**Cursor**

Baik, saya akan mulai dengan mempelajari dokumentasi dan struktur project kamu secara menyeluruh. Mari kita mulai!

Dokumen terlalu besar, saya perlu membaca bagian-bagian pentingnya. Mari saya baca secara bertahap.

PDF files are binary and can't be read as text directly. Let me look at the existing Bruno collection files and README to understand the current structure, then I'll use the file structure and existing API requests to understand the project.

Now let me explore the detailed contents of the folders that seem less organized, plus read some key .bru files to understand the API patterns.

Let me read a few more key .bru files to understand the API patterns and then also look at remaining top-level folders.

Now let me look at some specific .bru request files to understand the API patterns better.

Let me look at the remaining folder details.

Excellent! Now I have a very thorough understanding of the entire project. Let me analyze everything and present my reorganization plan.

---

## ðŸ“Š Analisis Lengkap & Rencana Reorganisasi

Setelah mempelajari seluruh **struktur project**, **API patterns**, dan **konteks dokumentasi** (TMF 622, TMF 641, SingleView Action API, Notification Event API, HLD FTTH), berikut temuan dan rencana saya:

---

### ðŸ” **Masalah yang Ditemukan pada Struktur Saat Ini**

| # | Masalah | Detail |
|---|---------|--------|
| 1 | **Duplikasi OpenAccess Workflows** | Folder `OpenAccess-Provider-Workflows` terduplikasi di dalam `Product-Order-Management-TMF622/Create-Order/Mobily/Royal-Customer/Postpaid/` â€” jelas salah tempat |
| 2 | **Penamaan Tidak Konsisten** | Campuran hyphen-case (`Product-Order-Management-TMF622`), spasi (`Suspends & Resume Order`), dan campur aduk |
| 3 | **Flat root tanpa grouping** | 15 folder di root level tanpa hierarki yang jelas â€” Device Swap, Maintenance, Relocation, Rewiring, Termination, Upgrade/Downgrade semuanya di root padahal **semua pakai TMF622 API endpoint yang sama** (`/tmf-api/productOrderingManagement/v4/productOrder/`) |
| 4 | **Sequence number tidak logis** | `Authentication` dan `OpenAccess-Provider-Workflows` sama-sama seq:2, urutan tidak mengikuti workflow flow |
| 5 | **File salah tempat** | `Step-09-CPE-UAT-Completed.bru` ada di luar folder `CPE-Installation-Workflow/` |
| 6 | **Maintenance Order flat** | 11 file tanpa sub-folder (Create, Close, ReOpen mixed) |
| 7 | **Tidak ada grouping by API Standard** | TMF622-related operations tersebar di 10+ folder berbeda |

---

### ðŸ—ï¸ **Rencana Reorganisasi â€” Grouped by API Interface + Business Process**

Prinsip organisasi:
1. **Layer 1:** Grouped by API Standard/Interface (TMF622, TMF641, WFM, OpenAccess, SingleView)
2. **Layer 2:** Grouped by Business Process/Order Type
3. **Layer 3:** Grouped by Provider (Mobily, DAWIYAT, ITC, STC)
4. **Numbered prefixes** untuk urutan eksekusi yang jelas

```
FTTH - Mobily - Project/
â”œâ”€â”€ environments/
â”œâ”€â”€ Documentation/
â”‚
â”œâ”€â”€ Authentication/
â”‚   â”œâ”€â”€ Auth-Dev-1.bru
â”‚   â”œâ”€â”€ Auth-Dev-2.bru
â”‚   â””â”€â”€ Auth-Dev-On-Prem.bru
â”‚
â”œâ”€â”€ 02-Product-Order-Management-TMF622/
â”‚   â”‚
â”‚   â”œâ”€â”€ 01-Activation/                          â† New Connection (action: add)
â”‚   â”‚   â”œâ”€â”€ Mobily/
â”‚   â”‚   â”‚   â”œâ”€â”€ Regular-Customer/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ Postpaid/  (No ME, 1-3 ME)
â”‚   â”‚   â”‚   â”‚   â””â”€â”€ Prepaid/   (No ME, 1-3 ME)
â”‚   â”‚   â”‚   â””â”€â”€ Royal-Customer/
â”‚   â”‚   â”‚       â””â”€â”€ Postpaid/  (No ME, 1-3 ME)
â”‚   â”‚   â””â”€â”€ OpenAccess/
â”‚   â”‚       â”œâ”€â”€ DAWIYAT/
â”‚   â”‚       â”œâ”€â”€ ITC/
â”‚   â”‚       â””â”€â”€ STC/
â”‚   â”‚
â”‚   â”œâ”€â”€ 02-Modification/                        â† (action: modify)
â”‚   â”‚   â”œâ”€â”€ Upgrade/
â”‚   â”‚   â”‚   â””â”€â”€ Upgrade-Bandwidth-Only-Mobily.bru
â”‚   â”‚   â”œâ”€â”€ Downgrade/
â”‚   â”‚   â”‚   â””â”€â”€ Downgrade-Bandwidth-Only-Mobily.bru
â”‚   â”‚   â”œâ”€â”€ Relocation/
â”‚   â”‚   â”‚   â”œâ”€â”€ Relocation-Mobily.bru
â”‚   â”‚   â”‚   â”œâ”€â”€ Relocation-Dowiyat.bru
â”‚   â”‚   â”‚   â”œâ”€â”€ Relocation-ITC.bru
â”‚   â”‚   â”‚   â””â”€â”€ Relocation-STC.bru
â”‚   â”‚   â”œâ”€â”€ Rewiring/
â”‚   â”‚   â”‚   â”œâ”€â”€ Rewiring-Mobily.bru
â”‚   â”‚   â”‚   â””â”€â”€ Rewiring-Dowiyat.bru
â”‚   â”‚   â”œâ”€â”€ Device-Swap/
â”‚   â”‚   â”‚   â”œâ”€â”€ CPE-Swap-Mobily.bru
â”‚   â”‚   â”‚   â”œâ”€â”€ HAG-Swap-Mobily.bru
â”‚   â”‚   â”‚   â”œâ”€â”€ ONT-Swap-DOWIYAT.bru
â”‚   â”‚   â”‚   â”œâ”€â”€ ONT-Swap-ITC.bru
â”‚   â”‚   â”‚   â””â”€â”€ ONT-Swap-STC.bru
â”‚   â”‚   â””â”€â”€ Request-Update/
â”‚   â”‚       â”œâ”€â”€ Get-Order.bru
â”‚   â”‚       â”œâ”€â”€ Request-Update-Mobily.bru
â”‚   â”‚       â”œâ”€â”€ Request-Update-DOWIYAT.bru
â”‚   â”‚       â””â”€â”€ Request-Update-ITC.bru
â”‚   â”‚
â”‚   â”œâ”€â”€ 03-Suspend-Resume/                     â† (action: modify, suspend/resume)
â”‚   â”‚   â”œâ”€â”€ Mobily/
â”‚   â”‚   â”‚   â””â”€â”€ Suspend-Mobily.bru
â”‚   â”‚   â”œâ”€â”€ DOWIYAT/
â”‚   â”‚   â”‚   â”œâ”€â”€ Suspend-Dowiyat.bru
â”‚   â”‚   â”‚   â””â”€â”€ Resume-Dowiyat.bru
â”‚   â”‚   â”œâ”€â”€ ITC/
â”‚   â”‚   â”‚   â”œâ”€â”€ Suspend-ITC.bru
â”‚   â”‚   â”‚   â””â”€â”€ Resume-ITC.bru
â”‚   â”‚   â””â”€â”€ STC/
â”‚   â”‚       â”œâ”€â”€ Suspend-STC.bru
â”‚   â”‚       â””â”€â”€ Resume-STC.bru
â”‚   â”‚
â”‚   â”œâ”€â”€ 04-Termination/                        â† (action: delete)
â”‚   â”‚   â”œâ”€â”€ Termination-Mobily.bru
â”‚   â”‚   â”œâ”€â”€ Termination-DOWIYAT.bru
â”‚   â”‚   â”œâ”€â”€ Termination-ITC.bru
â”‚   â”‚   â””â”€â”€ Termination-STC.bru
â”‚   â”‚
â”‚   â”œâ”€â”€ 05-Maintenance-Order/                  â† (Maintenance WO spec)
â”‚   â”‚   â”œâ”€â”€ Create/
â”‚   â”‚   â”‚   â”œâ”€â”€ Maintenance-Order-Mobily.bru
â”‚   â”‚   â”‚   â”œâ”€â”€ Maintenance-Order-DOWIYAT.bru
â”‚   â”‚   â”‚   â”œâ”€â”€ Maintenance-Order-ITC.bru
â”‚   â”‚   â”‚   â””â”€â”€ Maintenance-Order-STC.bru
â”‚   â”‚   â”œâ”€â”€ Close/
â”‚   â”‚   â”‚   â”œâ”€â”€ Close-Maintenance-DOWIYAT.bru
â”‚   â”‚   â”‚   â”œâ”€â”€ Close-Maintenance-ITC.bru
â”‚   â”‚   â”‚   â””â”€â”€ Close-Maintenance-STC.bru
â”‚   â”‚   â””â”€â”€ ReOpen/
â”‚   â”‚       â”œâ”€â”€ ReOpen-Maintenance-DOWIYAT.bru
â”‚   â”‚       â”œâ”€â”€ ReOpen-Maintenance-ITC.bru
â”‚   â”‚       â””â”€â”€ ReOpen-Maintenance-STC.bru
â”‚   â”‚
â”‚   â””â”€â”€ 06-Get-Order/
â”‚       â””â”€â”€ Get-Order.bru
â”‚
â”œâ”€â”€ 03-Service-Order-Notifications-TMF641/
â”‚   â”œâ”€â”€ Activation/
â”‚   â”‚   â”œâ”€â”€ Service-Order-Acknowledged.bru
â”‚   â”‚   â”œâ”€â”€ Service-Order-InProgress.bru
â”‚   â”‚   â”œâ”€â”€ Service-Order-Completed.bru
â”‚   â”‚   â””â”€â”€ Service-Order-Error-1000-OK.bru
â”‚   â””â”€â”€ Termination/
â”‚       â””â”€â”€ 641-Cease-Termination.bru
â”‚
â”œâ”€â”€ 04-Workforce-Management-WFM/
â”‚   â”œâ”€â”€ CPE-Installation-Workflow/             â† Step 01-09 (semua di dalam!)
â”‚   â”‚   â”œâ”€â”€ Step-01-CPE-1000-OK.bru
â”‚   â”‚   â”œâ”€â”€ ... (Step 02-08)
â”‚   â”‚   â””â”€â”€ Step-09-CPE-UAT-Completed.bru     â† FIX: pindah ke dalam folder
â”‚   â”œâ”€â”€ Mesh-Extender-Installation-Workflow/   â† Step 01-09
â”‚   â””â”€â”€ Installation-Failure-Scenarios/
â”‚       â”œâ”€â”€ Mobily/
â”‚       â”œâ”€â”€ Mobily-Maintenance/
â”‚       â””â”€â”€ OpenAccess/
â”‚
â”œâ”€â”€ 05-OpenAccess-Provider-Workflows/
â”‚   â”œâ”€â”€ DAWIYAT/
â”‚   â”‚   â”œâ”€â”€ Activation-Service-Installation/   â† Step 01-07
â”‚   â”‚   â””â”€â”€ Modification-Service-Installation/
â”‚   â”œâ”€â”€ ITC/
â”‚   â”‚   â”œâ”€â”€ Activation-Service-Installation/   â† Step 01-06
â”‚   â”‚   â””â”€â”€ Modification-Service-Installation/
â”‚   â”œâ”€â”€ STC/
â”‚   â”‚   â”œâ”€â”€ Activation-Service-Installation/   â† Step 01-06
â”‚   â”‚   â”œâ”€â”€ Modification-Service-Installation/
â”‚   â”‚   â”œâ”€â”€ Service-Qualification-Notifications/
â”‚   â”‚   â””â”€â”€ STC-SQ-INFEASIBLE/
â”‚   â””â”€â”€ Open-Service-Request-Maintenance/
â”‚
â”œâ”€â”€ 06-SingleView-Integration/
â”‚   â”œâ”€â”€ Appointment-Management/
â”‚   â”œâ”€â”€ Order-Cancellation/
â”‚   â”œâ”€â”€ Order-Completion/
â”‚   â”œâ”€â”€ Installation-Failure-Actions/
â”‚   â””â”€â”€ Custom-Notifications/
â”‚
â””â”€â”€ 07-Create-Service-Order-OpenAccess/        â† Separate API: serviceInstallationManagement
    â”œâ”€â”€ Create-Service-Order-OA-Dowiyat.bru
    â”œâ”€â”€ Create-Service-Order-OA-ITC.bru
    â””â”€â”€ Create-Service-Order-OA-STC.bru
```

---

### ðŸ“‹ **Ringkasan Perubahan**

| # | Perubahan | Alasan |
|---|-----------|--------|
| 1 | **Merge 10 root folders ke dalam `02-Product-Order-Management-TMF622/`** | Device Swap, Termination, Relocation, Rewiring, Upgrade/Downgrade, Suspend/Resume, Maintenance, Request Update â€” semuanya menggunakan TMF622 endpoint yang sama |
| 2 | **Numbered prefix (01-07)** | Mengikuti alur workflow eksekusi dari Authentication â†’ Order â†’ Notification â†’ WFM â†’ Provider â†’ SingleView |
| 3 | **Fix misplaced files** | `Step-09-CPE-UAT-Completed.bru` masuk ke dalam `CPE-Installation-Workflow/` |
| 4 | **Remove duplikat OpenAccess Workflows** | Hapus nested copy dari dalam `Royal-Customer/Postpaid/` |
| 5 | **Maintenance Order di-sub-folder-kan** | Pisah `Create/`, `Close/`, `ReOpen/` |
| 6 | **TMF641 di-sub-folder-kan** | Pisah `Activation/` dan `Termination/` |
| 7 | **Konsistenkan penamaan** | Semua pakai `hyphen-case`, tidak ada spasi di folder name |

---

### ðŸŽ¯ **Keuntungan Struktur Baru**

1. **Scalable** â€” Ketika ada order type baru (misal Migration), tinggal tambah subfolder di `02-Modification/`
2. **Self-documenting** â€” Numbered prefix menunjukkan urutan workflow
3. **TMF-aligned** â€” Grouped by API standard (622, 641) sesuai dokumentasi
4. **Provider-friendly** â€” Tiap order type punya sub per provider
5. **Reduced root clutter** â€” Dari 15 folder ke 7 folder utama + environments + Documentation

---

**Apakah kamu setuju dengan rencana ini? Atau ada bagian yang ingin kamu adjust sebelum saya eksekusi?** 

Beberapa pertanyaan opsional:
1. Apakah kamu ingin prefix angka (01-, 02-) di nama folder, atau tanpa prefix?
2. Apakah folder `Get-Order` perlu di-merge dengan `Request-Update` atau terpisah?
3. Apakah duplikat `OpenAccess-Provider-Workflows` di dalam `Royal-Customer/Postpaid/` bisa langsung dihapus?

```plaintext
FTTH - Mobily - Project/
â”œâ”€â”€ environments/
â”œâ”€â”€ Documentation/
â”‚
â”œâ”€â”€ Authentication/
â”‚   â”œâ”€â”€ Auth-Dev-1.bru
â”‚   â”œâ”€â”€ Auth-Dev-2.bru
â”‚   â””â”€â”€ Auth-Dev-On-Prem.bru
â”‚
â”œâ”€â”€ 02-Product-Order-Management-TMF622/
â”‚   â”‚
â”‚   â”œâ”€â”€ 01-Activation/                          â† New Connection (action: add)
â”‚   â”‚   â”œâ”€â”€ Mobily/
â”‚   â”‚   â”‚   â”œâ”€â”€ Regular-Customer/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ Postpaid/  (No ME, 1-3 ME)
â”‚   â”‚   â”‚   â”‚   â””â”€â”€ Prepaid/   (No ME, 1-3 ME)
â”‚   â”‚   â”‚   â””â”€â”€ Royal-Customer/
â”‚   â”‚   â”‚       â””â”€â”€ Postpaid/  (No ME, 1-3 ME)
â”‚   â”‚   â””â”€â”€ OpenAccess/
â”‚   â”‚       â”œâ”€â”€ DAWIYAT/
â”‚   â”‚       â”œâ”€â”€ ITC/
â”‚   â”‚       â””â”€â”€ STC/
â”‚   â”‚
â”‚   â”œâ”€â”€ 02-Modification/                        â† (action: modify)
â”‚   â”‚   â”œâ”€â”€ Upgrade/
â”‚   â”‚   â”‚   â””â”€â”€ Upgrade-Bandwidth-Only-Mobily.bru
â”‚   â”‚   â”œâ”€â”€ Downgrade/
â”‚   â”‚   â”‚   â””â”€â”€ Downgrade-Bandwidth-Only-Mobily.bru
â”‚   â”‚   â”œâ”€â”€ Relocation/
â”‚   â”‚   â”‚   â”œâ”€â”€ Relocation-Mobily.bru
â”‚   â”‚   â”‚   â”œâ”€â”€ Relocation-Dowiyat.bru
â”‚   â”‚   â”‚   â”œâ”€â”€ Relocation-ITC.bru
â”‚   â”‚   â”‚   â””â”€â”€ Relocation-STC.bru
â”‚   â”‚   â”œâ”€â”€ Rewiring/
â”‚   â”‚   â”‚   â”œâ”€â”€ Rewiring-Mobily.bru
â”‚   â”‚   â”‚   â””â”€â”€ Rewiring-Dowiyat.bru
â”‚   â”‚   â”œâ”€â”€ Device-Swap/
â”‚   â”‚   â”‚   â”œâ”€â”€ CPE-Swap-Mobily.bru
â”‚   â”‚   â”‚   â”œâ”€â”€ HAG-Swap-Mobily.bru
â”‚   â”‚   â”‚   â”œâ”€â”€ ONT-Swap-DOWIYAT.bru
â”‚   â”‚   â”‚   â”œâ”€â”€ ONT-Swap-ITC.bru
â”‚   â”‚   â”‚   â””â”€â”€ ONT-Swap-STC.bru
â”‚   â”‚   â””â”€â”€ Request-Update/
â”‚   â”‚       â”œâ”€â”€ Get-Order.bru
â”‚   â”‚       â”œâ”€â”€ Request-Update-Mobily.bru
â”‚   â”‚       â”œâ”€â”€ Request-Update-DOWIYAT.bru
â”‚   â”‚       â””â”€â”€ Request-Update-ITC.bru
â”‚   â”‚
â”‚   â”œâ”€â”€ 03-Suspend-Resume/                     â† (action: modify, suspend/resume)
â”‚   â”‚   â”œâ”€â”€ Mobily/
â”‚   â”‚   â”‚   â””â”€â”€ Suspend-Mobily.bru
â”‚   â”‚   â”œâ”€â”€ DOWIYAT/
â”‚   â”‚   â”‚   â”œâ”€â”€ Suspend-Dowiyat.bru
â”‚   â”‚   â”‚   â””â”€â”€ Resume-Dowiyat.bru
â”‚   â”‚   â”œâ”€â”€ ITC/
â”‚   â”‚   â”‚   â”œâ”€â”€ Suspend-ITC.bru
â”‚   â”‚   â”‚   â””â”€â”€ Resume-ITC.bru
â”‚   â”‚   â””â”€â”€ STC/
â”‚   â”‚       â”œâ”€â”€ Suspend-STC.bru
â”‚   â”‚       â””â”€â”€ Resume-STC.bru
â”‚   â”‚
â”‚   â”œâ”€â”€ 04-Termination/                        â† (action: delete)
â”‚   â”‚   â”œâ”€â”€ Termination-Mobily.bru
â”‚   â”‚   â”œâ”€â”€ Termination-DOWIYAT.bru
â”‚   â”‚   â”œâ”€â”€ Termination-ITC.bru
â”‚   â”‚   â””â”€â”€ Termination-STC.bru
â”‚   â”‚
â”‚   â”œâ”€â”€ 05-Maintenance-Order/                  â† (Maintenance WO spec)
â”‚   â”‚   â”œâ”€â”€ Create/
â”‚   â”‚   â”‚   â”œâ”€â”€ Maintenance-Order-Mobily.bru
â”‚   â”‚   â”‚   â”œâ”€â”€ Maintenance-Order-DOWIYAT.bru
â”‚   â”‚   â”‚   â”œâ”€â”€ Maintenance-Order-ITC.bru
â”‚   â”‚   â”‚   â””â”€â”€ Maintenance-Order-STC.bru
â”‚   â”‚   â”œâ”€â”€ Close/
â”‚   â”‚   â”‚   â”œâ”€â”€ Close-Maintenance-DOWIYAT.bru
â”‚   â”‚   â”‚   â”œâ”€â”€ Close-Maintenance-ITC.bru
â”‚   â”‚   â”‚   â””â”€â”€ Close-Maintenance-STC.bru
â”‚   â”‚   â””â”€â”€ ReOpen/
â”‚   â”‚       â”œâ”€â”€ ReOpen-Maintenance-DOWIYAT.bru
â”‚   â”‚       â”œâ”€â”€ ReOpen-Maintenance-ITC.bru
â”‚   â”‚       â””â”€â”€ ReOpen-Maintenance-STC.bru
â”‚   â”‚
â”‚   â””â”€â”€ 06-Get-Order/
â”‚       â””â”€â”€ Get-Order.bru
â”‚
â”œâ”€â”€ 03-Service-Order-Notifications-TMF641/
â”‚   â”œâ”€â”€ Activation/
â”‚   â”‚   â”œâ”€â”€ Service-Order-Acknowledged.bru
â”‚   â”‚   â”œâ”€â”€ Service-Order-InProgress.bru
â”‚   â”‚   â”œâ”€â”€ Service-Order-Completed.bru
â”‚   â”‚   â””â”€â”€ Service-Order-Error-1000-OK.bru
â”‚   â””â”€â”€ Termination/
â”‚       â””â”€â”€ 641-Cease-Termination.bru
â”‚
â”œâ”€â”€ 04-Workforce-Management-WFM/
â”‚   â”œâ”€â”€ CPE-Installation-Workflow/             â† Step 01-09 (semua di dalam!)
â”‚   â”‚   â”œâ”€â”€ Step-01-CPE-1000-OK.bru
â”‚   â”‚   â”œâ”€â”€ ... (Step 02-08)
â”‚   â”‚   â””â”€â”€ Step-09-CPE-UAT-Completed.bru     â† FIX: pindah ke dalam folder
â”‚   â”œâ”€â”€ Mesh-Extender-Installation-Workflow/   â† Step 01-09
â”‚   â””â”€â”€ Installation-Failure-Scenarios/
â”‚       â”œâ”€â”€ Mobily/
â”‚       â”œâ”€â”€ Mobily-Maintenance/
â”‚       â””â”€â”€ OpenAccess/
â”‚
â”œâ”€â”€ 05-OpenAccess-Provider-Workflows/
â”‚   â”œâ”€â”€ DAWIYAT/
â”‚   â”‚   â”œâ”€â”€ Activation-Service-Installation/   â† Step 01-07
â”‚   â”‚   â””â”€â”€ Modification-Service-Installation/
â”‚   â”œâ”€â”€ ITC/
â”‚   â”‚   â”œâ”€â”€ Activation-Service-Installation/   â† Step 01-06
â”‚   â”‚   â””â”€â”€ Modification-Service-Installation/
â”‚   â”œâ”€â”€ STC/
â”‚   â”‚   â”œâ”€â”€ Activation-Service-Installation/   â† Step 01-06
â”‚   â”‚   â”œâ”€â”€ Modification-Service-Installation/
â”‚   â”‚   â”œâ”€â”€ Service-Qualification-Notifications/
â”‚   â”‚   â””â”€â”€ STC-SQ-INFEASIBLE/
â”‚   â””â”€â”€ Open-Service-Request-Maintenance/
â”‚
â”œâ”€â”€ 06-SingleView-Integration/
â”‚   â”œâ”€â”€ Appointment-Management/
â”‚   â”œâ”€â”€ Order-Cancellation/
â”‚   â”œâ”€â”€ Order-Completion/
â”‚   â”œâ”€â”€ Installation-Failure-Actions/
â”‚   â””â”€â”€ Custom-Notifications/
â”‚
â””â”€â”€ 07-Create-Service-Order-OpenAccess/        â† Separate API: serviceInstallationManagement
    â”œâ”€â”€ Create-Service-Order-OA-Dowiyat.bru
    â”œâ”€â”€ Create-Service-Order-OA-ITC.bru
    â””â”€â”€ Create-Service-Order-OA-STC.bru
```

---

**User**

okee menurutku bagus, jika aku lihat kamu mengggabungkan semua request payload yg 622 ke 1 folder yang sama ya? itu bagus, tapi yg jadi kendala saat ini adalah agar tetap align dengan journey/use case yg sedang di test adalah request payloadnya, contoh di relocation itu kan harus trigger WFM notification untuk Completed tapi untuk dibagian comment tidak salah itu masih request payload yg untuk installation sedangkan saat itu sedang testing relocation jadi orang terkadang lupa, dan juga untuk dokumentasi tiap journeynya kurang, contoh untuk relocation use case harus trigger api apa saja dan urutan yg benarnya bagaimana, itu sih tantangannya 

---

**Cursor**

Sangat bagus poinnya! Itu memang pain point yang krusial. Jadi masalahnya bukan cuma soal grouping, tapi juga tentang:

1. **Payload contextual** â€” WFM notification saat Relocation harus punya comment/content yang berbeda dari Installation
2. **Journey completeness** â€” Setiap use case harus jelas API apa saja yang harus di-trigger dan urutannya

Ini mengubah pendekatan saya. Mari saya revisi strategi:

---

## ðŸ”„ Revisi Pendekatan: **Journey-Centric Organization**

Alih-alih grouping by API type (TMF622/TMF641/WFM), kita organize **by Journey/Use Case** dimana setiap journey folder berisi **SEMUA API steps yang diperlukan** dengan **payload yang kontekstual**.

```
FTTH - Mobily - Project/
â”œâ”€â”€ environments/
â”œâ”€â”€ Documentation/
â”‚
â”œâ”€â”€ Authentication/
â”‚   â”œâ”€â”€ Auth-Dev-1.bru
â”‚   â”œâ”€â”€ Auth-Dev-2.bru
â”‚   â””â”€â”€ Auth-Dev-On-Prem.bru
â”‚
â”‚â”€â”€ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
â”‚   ðŸ“Œ JOURNEYS - Setiap folder = 1 complete use case
â”‚â”€â”€ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
â”‚
â”œâ”€â”€ 02-New-Activation/                         â† Journey: Aktivasi Baru
â”‚   â”œâ”€â”€ _workflow.md                           â† ðŸ“– "Step 1: Create Order â†’ Step 2: TMF641 Ack â†’ ..."
â”‚   â”œâ”€â”€ 01-Create-Order-TMF622/
â”‚   â”‚   â”œâ”€â”€ Mobily/
â”‚   â”‚   â”‚   â”œâ”€â”€ Regular-Customer/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ Postpaid/ (No ME, 1-3 ME)
â”‚   â”‚   â”‚   â”‚   â””â”€â”€ Prepaid/ (No ME, 1-3 ME)
â”‚   â”‚   â”‚   â””â”€â”€ Royal-Customer/
â”‚   â”‚   â”‚       â””â”€â”€ Postpaid/ (No ME, 1-3 ME)
â”‚   â”‚   â””â”€â”€ OpenAccess/
â”‚   â”‚       â”œâ”€â”€ DAWIYAT/ (No ME, 1-3 ME)
â”‚   â”‚       â”œâ”€â”€ ITC/ (No ME, 1-3 ME)
â”‚   â”‚       â””â”€â”€ STC/ (No ME, 1-3 ME)
â”‚   â”œâ”€â”€ 02-TMF641-Notifications/
â”‚   â”‚   â”œâ”€â”€ Service-Order-Acknowledged.bru      â† Activation context
â”‚   â”‚   â”œâ”€â”€ Service-Order-InProgress.bru
â”‚   â”‚   â”œâ”€â”€ Service-Order-Completed.bru
â”‚   â”‚   â””â”€â”€ Service-Order-Error-1000-OK.bru
â”‚   â”œâ”€â”€ 03-WFM-CPE-Installation/
â”‚   â”‚   â”œâ”€â”€ Step-01 â†’ Step-09                   â† Activation-specific comments
â”‚   â”œâ”€â”€ 04-WFM-ME-Installation/
â”‚   â”‚   â”œâ”€â”€ Step-01 â†’ Step-09
â”‚   â”œâ”€â”€ 05-OpenAccess-Provider-Workflow/
â”‚   â”‚   â”œâ”€â”€ DAWIYAT/
â”‚   â”‚   â”‚   â”œâ”€â”€ Activation-Service-Installation/ (Step 01-07)
â”‚   â”‚   â”‚   â””â”€â”€ Modification-Service-Installation/
â”‚   â”‚   â”œâ”€â”€ ITC/
â”‚   â”‚   â”‚   â”œâ”€â”€ Activation-Service-Installation/ (Step 01-06)
â”‚   â”‚   â”‚   â””â”€â”€ Modification-Service-Installation/
â”‚   â”‚   â””â”€â”€ STC/
â”‚   â”‚       â”œâ”€â”€ Activation-Service-Installation/ (Step 01-06)
â”‚   â”‚       â”œâ”€â”€ Modification-Service-Installation/
â”‚   â”‚       â”œâ”€â”€ Service-Qualification-Notifications/
â”‚   â”‚       â””â”€â”€ STC-SQ-INFEASIBLE/
â”‚   â”œâ”€â”€ 06-SingleView-Integration/
â”‚   â”‚   â”œâ”€â”€ Appointment-Management/
â”‚   â”‚   â”œâ”€â”€ Order-Cancellation/
â”‚   â”‚   â”œâ”€â”€ Order-Completion/
â”‚   â”‚   â””â”€â”€ Custom-Notifications/
â”‚   â””â”€â”€ 07-Installation-Failure-Scenarios/
â”‚       â”œâ”€â”€ Mobily/
â”‚       â”œâ”€â”€ Mobily-Maintenance/
â”‚       â””â”€â”€ OpenAccess/
â”‚
â”œâ”€â”€ 03-Relocation/                              â† Journey: Relocation
â”‚   â”œâ”€â”€ _workflow.md                            â† ðŸ“– "1. Create TMF622 Relocation â†’ 2. TMF641 Ack â†’ 
â”‚   â”‚                                              3. WFM CPE (relocation context) â†’ 4. Completed"
â”‚   â”œâ”€â”€ 01-Create-Relocation-Order-TMF622/
â”‚   â”‚   â”œâ”€â”€ Relocation-Mobily.bru
â”‚   â”‚   â”œâ”€â”€ Relocation-Dowiyat.bru
â”‚   â”‚   â”œâ”€â”€ Relocation-ITC.bru
â”‚   â”‚   â””â”€â”€ Relocation-STC.bru
â”‚   â”œâ”€â”€ 02-TMF641-Notifications/
â”‚   â”‚   â”œâ”€â”€ Service-Order-Acknowledged.bru      â† Relocation context payload
â”‚   â”‚   â”œâ”€â”€ Service-Order-InProgress.bru
â”‚   â”‚   â””â”€â”€ Service-Order-Completed.bru
â”‚   â””â”€â”€ 03-WFM-CPE-Relocation/                 â† ðŸ”‘ WFM with RELOCATION-specific comments!
â”‚       â”œâ”€â”€ Step-01-CPE-1000-OK.bru
â”‚       â”œâ”€â”€ ...                                 â† Comments: "Relocation work order dispatched"
â”‚       â””â”€â”€ Step-09-CPE-Completed.bru           â† Comments: "Relocation completed successfully"
â”‚
â”œâ”€â”€ 04-Device-Swap/                             â† Journey: Device Swap
â”‚   â”œâ”€â”€ _workflow.md                            â† ðŸ“– "1. Create Swap Order â†’ 2. TMF641 â†’ 3. WFM CPE Swap"
â”‚   â”œâ”€â”€ 01-Create-Swap-Order-TMF622/
â”‚   â”‚   â”œâ”€â”€ CPE-Swap-Mobily.bru
â”‚   â”‚   â”œâ”€â”€ HAG-Swap-Mobily.bru
â”‚   â”‚   â”œâ”€â”€ ONT-Swap-DOWIYAT.bru
â”‚   â”‚   â”œâ”€â”€ ONT-Swap-ITC.bru
â”‚   â”‚   â””â”€â”€ ONT-Swap-STC.bru
â”‚   â”œâ”€â”€ 02-TMF641-Notifications/                â† Device Swap context
â”‚   â””â”€â”€ 03-WFM-CPE-Device-Swap/                 â† ðŸ”‘ WFM with SWAP-specific comments!
â”‚
â”œâ”€â”€ 05-Upgrade-Downgrade/                       â† Journey: Upgrade & Downgrade
â”‚   â”œâ”€â”€ _workflow.md
â”‚   â”œâ”€â”€ 01-Upgrade-Order-TMF622/
â”‚   â”‚   â””â”€â”€ Upgrade-Bandwidth-Only-Mobily.bru
â”‚   â”œâ”€â”€ 02-Downgrade-Order-TMF622/
â”‚   â”‚   â””â”€â”€ Downgrade-Bandwidth-Only-Mobily.bru
â”‚   â””â”€â”€ 03-TMF641-Notifications/                â† Upgrade/Downgrade context
â”‚
â”œâ”€â”€ 06-Suspend-Resume/                          â† Journey: Suspend & Resume
â”‚   â”œâ”€â”€ _workflow.md                            â† ðŸ“– "1. Suspend TMF622 â†’ 2. OA Service Order â†’ 3. Resume"
â”‚   â”œâ”€â”€ 01-Suspend-Order-TMF622/
â”‚   â”‚   â”œâ”€â”€ Suspend-Mobily.bru
â”‚   â”‚   â”œâ”€â”€ Suspend-Dowiyat.bru
â”‚   â”‚   â”œâ”€â”€ Suspend-ITC.bru
â”‚   â”‚   â””â”€â”€ Suspend-STC.bru
â”‚   â”œâ”€â”€ 02-Create-Service-Order-OA/             â† serviceInstallationManagement API
â”‚   â”‚   â”œâ”€â”€ Create-Service-Order-OA-Dowiyat.bru
â”‚   â”‚   â”œâ”€â”€ Create-Service-Order-OA-ITC.bru
â”‚   â”‚   â””â”€â”€ Create-Service-Order-OA-STC.bru
â”‚   â””â”€â”€ 03-Resume-Order-TMF622/
â”‚       â”œâ”€â”€ Resume-Dowiyat.bru
â”‚       â”œâ”€â”€ Resume-ITC.bru
â”‚       â””â”€â”€ Resume-STC.bru
â”‚
â”œâ”€â”€ 07-Termination/                             â† Journey: Termination
â”‚   â”œâ”€â”€ _workflow.md                            â† ðŸ“– "1. Termination TMF622 â†’ 2. TMF641 Cease â†’ 3. OA Deactivation"
â”‚   â”œâ”€â”€ 01-Termination-Order-TMF622/
â”‚   â”‚   â”œâ”€â”€ Termination-Mobily.bru
â”‚   â”‚   â”œâ”€â”€ Termination-DOWIYAT.bru
â”‚   â”‚   â”œâ”€â”€ Termination-ITC.bru
â”‚   â”‚   â””â”€â”€ Termination-STC.bru
â”‚   â”œâ”€â”€ 02-TMF641-Cease-Notification/
â”‚   â”‚   â””â”€â”€ 641-Cease-Termination.bru
â”‚   â””â”€â”€ 03-Create-Service-Order-OA/             â† OA deactivation if needed
â”‚
â”œâ”€â”€ 08-Rewiring/                                â† Journey: Rewiring
â”‚   â”œâ”€â”€ _workflow.md
â”‚   â”œâ”€â”€ 01-Create-Rewiring-Order-TMF622/
â”‚   â”‚   â”œâ”€â”€ Rewiring-Mobily.bru
â”‚   â”‚   â””â”€â”€ Rewiring-Dowiyat.bru
â”‚   â”œâ”€â”€ 02-TMF641-Notifications/
â”‚   â””â”€â”€ 03-WFM-CPE-Rewiring/                    â† Rewiring-specific WFM payloads
â”‚
â”œâ”€â”€ 09-Maintenance/                             â† Journey: Maintenance
â”‚   â”œâ”€â”€ _workflow.md                            â† ðŸ“– "1. Create MO â†’ 2. WFM â†’ 3. Close/ReOpen"
â”‚   â”œâ”€â”€ 01-Create-Maintenance-Order-TMF622/
â”‚   â”‚   â”œâ”€â”€ Maintenance-Order-Mobily.bru
â”‚   â”‚   â”œâ”€â”€ Maintenance-Order-DOWIYAT.bru
â”‚   â”‚   â”œâ”€â”€ Maintenance-Order-ITC.bru
â”‚   â”‚   â””â”€â”€ Maintenance-Order-STC.bru
â”‚   â”œâ”€â”€ 02-WFM-Maintenance-Notifications/       â† Maintenance-specific WFM payloads
â”‚   â”œâ”€â”€ 03-Close-Maintenance-Order/
â”‚   â”‚   â”œâ”€â”€ Close-Maintenance-DOWIYAT.bru
â”‚   â”‚   â”œâ”€â”€ Close-Maintenance-ITC.bru
â”‚   â”‚   â””â”€â”€ Close-Maintenance-STC.bru
â”‚   â”œâ”€â”€ 04-ReOpen-Maintenance-Order/
â”‚   â””â”€â”€ 05-Open-Service-Request-OA/
â”‚       â”œâ”€â”€ Closed.bru
â”‚       â”œâ”€â”€ Rejected.bru
â”‚       â””â”€â”€ Resolved.bru
â”‚
â””â”€â”€ 10-Request-Update/                          â† Journey: Request Update
    â”œâ”€â”€ _workflow.md
    â”œâ”€â”€ Get-Order.bru
    â”œâ”€â”€ Request-Update-Mobily.bru
    â”œâ”€â”€ Request-Update-DOWIYAT.bru
    â””â”€â”€ Request-Update-ITC.bru
```

---

### ðŸ”‘ Perbedaan Kunci dari Rencana Sebelumnya

| Aspek | Rencana 1 (API-type) | Rencana 2 (Journey-centric) |
|-------|---------------------|---------------------------|
| **Grouping** | By API standard (TMF622/641/WFM) | By use case/journey |
| **WFM payloads** | 1 set generic | Setiap journey punya WFM payloads sendiri dengan context yang benar |
| **TMF641 payloads** | 1 set generic | Setiap journey punya TMF641 payloads dengan context yang benar |
| **Testing flow** | Harus jump antar folder | Semua steps ada di 1 folder, tinggal execute dari atas ke bawah |
| **Documentation** | 1 README global | `_workflow.md` per journey â†’ jelas step-by-step |
| **Trade-off** | Less duplication, more confusion | Some duplication, tapi **zero confusion** |

### ðŸ“– Contoh `_workflow.md` untuk Relocation:

```markdown
# Relocation Journey - Workflow

## Prerequisites
- Existing active FTTH service
- Valid authentication token

## Steps
| Step | Folder | API | Description |
|------|--------|-----|-------------|
| 1 | `01-Create-Relocation-Order-TMF622/` | POST TMF622 | Create relocation order (pilih provider) |
| 2 | `02-TMF641-Notifications/` | POST TMF641 | Trigger Acknowledged â†’ InProgress â†’ Completed |
| 3 | `03-WFM-CPE-Relocation/` | POST WFM | Execute CPE workflow Step 01-09 |

## Notes
- WFM comments sudah disesuaikan untuk Relocation context
- Untuk OpenAccess, setelah Step 3 perlu trigger OA provider workflow
```

---

**Gimana menurutmu dengan pendekatan Journey-Centric ini?** 

Pertanyaan:
1. Apakah semua journey yang di atas sudah lengkap, atau ada use case lain yang belum ter-cover?
2. Untuk WFM, apakah setiap journey memang punya step WFM yang berbeda, atau langkahnya sama tapi hanya comment/payload yang berbeda?
3. Apakah kamu mau `_workflow.md` dibuat per journey, atau cukup deskripsi di `folder.bru`?

```plaintext
FTTH - Mobily - Project/
â”œâ”€â”€ environments/
â”œâ”€â”€ Documentation/
â”‚
â”œâ”€â”€ Authentication/
â”‚   â”œâ”€â”€ Auth-Dev-1.bru
â”‚   â”œâ”€â”€ Auth-Dev-2.bru
â”‚   â””â”€â”€ Auth-Dev-On-Prem.bru
â”‚
â”‚â”€â”€ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
â”‚   ðŸ“Œ JOURNEYS - Setiap folder = 1 complete use case
â”‚â”€â”€ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
â”‚
â”œâ”€â”€ 02-New-Activation/                         â† Journey: Aktivasi Baru
â”‚   â”œâ”€â”€ _workflow.md                           â† ðŸ“– "Step 1: Create Order â†’ Step 2: TMF641 Ack â†’ ..."
â”‚   â”œâ”€â”€ 01-Create-Order-TMF622/
â”‚   â”‚   â”œâ”€â”€ Mobily/
â”‚   â”‚   â”‚   â”œâ”€â”€ Regular-Customer/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ Postpaid/ (No ME, 1-3 ME)
â”‚   â”‚   â”‚   â”‚   â””â”€â”€ Prepaid/ (No ME, 1-3 ME)
â”‚   â”‚   â”‚   â””â”€â”€ Royal-Customer/
â”‚   â”‚   â”‚       â””â”€â”€ Postpaid/ (No ME, 1-3 ME)
â”‚   â”‚   â””â”€â”€ OpenAccess/
â”‚   â”‚       â”œâ”€â”€ DAWIYAT/ (No ME, 1-3 ME)
â”‚   â”‚       â”œâ”€â”€ ITC/ (No ME, 1-3 ME)
â”‚   â”‚       â””â”€â”€ STC/ (No ME, 1-3 ME)
â”‚   â”œâ”€â”€ 02-TMF641-Notifications/
â”‚   â”‚   â”œâ”€â”€ Service-Order-Acknowledged.bru      â† Activation context
â”‚   â”‚   â”œâ”€â”€ Service-Order-InProgress.bru
â”‚   â”‚   â”œâ”€â”€ Service-Order-Completed.bru
â”‚   â”‚   â””â”€â”€ Service-Order-Error-1000-OK.bru
â”‚   â”œâ”€â”€ 03-WFM-CPE-Installation/
â”‚   â”‚   â”œâ”€â”€ Step-01 â†’ Step-09                   â† Activation-specific comments
â”‚   â”œâ”€â”€ 04-WFM-ME-Installation/
â”‚   â”‚   â”œâ”€â”€ Step-01 â†’ Step-09
â”‚   â”œâ”€â”€ 05-OpenAccess-Provider-Workflow/
â”‚   â”‚   â”œâ”€â”€ DAWIYAT/
â”‚   â”‚   â”‚   â”œâ”€â”€ Activation-Service-Installation/ (Step 01-07)
â”‚   â”‚   â”‚   â””â”€â”€ Modification-Service-Installation/
â”‚   â”‚   â”œâ”€â”€ ITC/
â”‚   â”‚   â”‚   â”œâ”€â”€ Activation-Service-Installation/ (Step 01-06)
â”‚   â”‚   â”‚   â””â”€â”€ Modification-Service-Installation/
â”‚   â”‚   â””â”€â”€ STC/
â”‚   â”‚       â”œâ”€â”€ Activation-Service-Installation/ (Step 01-06)
â”‚   â”‚       â”œâ”€â”€ Modification-Service-Installation/
â”‚   â”‚       â”œâ”€â”€ Service-Qualification-Notifications/
â”‚   â”‚       â””â”€â”€ STC-SQ-INFEASIBLE/
â”‚   â”œâ”€â”€ 06-SingleView-Integration/
â”‚   â”‚   â”œâ”€â”€ Appointment-Management/
â”‚   â”‚   â”œâ”€â”€ Order-Cancellation/
â”‚   â”‚   â”œâ”€â”€ Order-Completion/
â”‚   â”‚   â””â”€â”€ Custom-Notifications/
â”‚   â””â”€â”€ 07-Installation-Failure-Scenarios/
â”‚       â”œâ”€â”€ Mobily/
â”‚       â”œâ”€â”€ Mobily-Maintenance/
â”‚       â””â”€â”€ OpenAccess/
â”‚
â”œâ”€â”€ 03-Relocation/                              â† Journey: Relocation
â”‚   â”œâ”€â”€ _workflow.md                            â† ðŸ“– "1. Create TMF622 Relocation â†’ 2. TMF641 Ack â†’ 
â”‚   â”‚                                              3. WFM CPE (relocation context) â†’ 4. Completed"
â”‚   â”œâ”€â”€ 01-Create-Relocation-Order-TMF622/
â”‚   â”‚   â”œâ”€â”€ Relocation-Mobily.bru
â”‚   â”‚   â”œâ”€â”€ Relocation-Dowiyat.bru
â”‚   â”‚   â”œâ”€â”€ Relocation-ITC.bru
â”‚   â”‚   â””â”€â”€ Relocation-STC.bru
â”‚   â”œâ”€â”€ 02-TMF641-Notifications/
â”‚   â”‚   â”œâ”€â”€ Service-Order-Acknowledged.bru      â† Relocation context payload
â”‚   â”‚   â”œâ”€â”€ Service-Order-InProgress.bru
â”‚   â”‚   â””â”€â”€ Service-Order-Completed.bru
â”‚   â””â”€â”€ 03-WFM-CPE-Relocation/                 â† ðŸ”‘ WFM with RELOCATION-specific comments!
â”‚       â”œâ”€â”€ Step-01-CPE-1000-OK.bru
â”‚       â”œâ”€â”€ ...                                 â† Comments: "Relocation work order dispatched"
â”‚       â””â”€â”€ Step-09-CPE-Completed.bru           â† Comments: "Relocation completed successfully"
â”‚
â”œâ”€â”€ 04-Device-Swap/                             â† Journey: Device Swap
â”‚   â”œâ”€â”€ _workflow.md                            â† ðŸ“– "1. Create Swap Order â†’ 2. TMF641 â†’ 3. WFM CPE Swap"
â”‚   â”œâ”€â”€ 01-Create-Swap-Order-TMF622/
â”‚   â”‚   â”œâ”€â”€ CPE-Swap-Mobily.bru
â”‚   â”‚   â”œâ”€â”€ HAG-Swap-Mobily.bru
â”‚   â”‚   â”œâ”€â”€ ONT-Swap-DOWIYAT.bru
â”‚   â”‚   â”œâ”€â”€ ONT-Swap-ITC.bru
â”‚   â”‚   â””â”€â”€ ONT-Swap-STC.bru
â”‚   â”œâ”€â”€ 02-TMF641-Notifications/                â† Device Swap context
â”‚   â””â”€â”€ 03-WFM-CPE-Device-Swap/                 â† ðŸ”‘ WFM with SWAP-specific comments!
â”‚
â”œâ”€â”€ 05-Upgrade-Downgrade/                       â† Journey: Upgrade & Downgrade
â”‚   â”œâ”€â”€ _workflow.md
â”‚   â”œâ”€â”€ 01-Upgrade-Order-TMF622/
â”‚   â”‚   â””â”€â”€ Upgrade-Bandwidth-Only-Mobily.bru
â”‚   â”œâ”€â”€ 02-Downgrade-Order-TMF622/
â”‚   â”‚   â””â”€â”€ Downgrade-Bandwidth-Only-Mobily.bru
â”‚   â””â”€â”€ 03-TMF641-Notifications/                â† Upgrade/Downgrade context
â”‚
â”œâ”€â”€ 06-Suspend-Resume/                          â† Journey: Suspend & Resume
â”‚   â”œâ”€â”€ _workflow.md                            â† ðŸ“– "1. Suspend TMF622 â†’ 2. OA Service Order â†’ 3. Resume"
â”‚   â”œâ”€â”€ 01-Suspend-Order-TMF622/
â”‚   â”‚   â”œâ”€â”€ Suspend-Mobily.bru
â”‚   â”‚   â”œâ”€â”€ Suspend-Dowiyat.bru
â”‚   â”‚   â”œâ”€â”€ Suspend-ITC.bru
â”‚   â”‚   â””â”€â”€ Suspend-STC.bru
â”‚   â”œâ”€â”€ 02-Create-Service-Order-OA/             â† serviceInstallationManagement API
â”‚   â”‚   â”œâ”€â”€ Create-Service-Order-OA-Dowiyat.bru
â”‚   â”‚   â”œâ”€â”€ Create-Service-Order-OA-ITC.bru
â”‚   â”‚   â””â”€â”€ Create-Service-Order-OA-STC.bru
â”‚   â””â”€â”€ 03-Resume-Order-TMF622/
â”‚       â”œâ”€â”€ Resume-Dowiyat.bru
â”‚       â”œâ”€â”€ Resume-ITC.bru
â”‚       â””â”€â”€ Resume-STC.bru
â”‚
â”œâ”€â”€ 07-Termination/                             â† Journey: Termination
â”‚   â”œâ”€â”€ _workflow.md                            â† ðŸ“– "1. Termination TMF622 â†’ 2. TMF641 Cease â†’ 3. OA Deactivation"
â”‚   â”œâ”€â”€ 01-Termination-Order-TMF622/
â”‚   â”‚   â”œâ”€â”€ Termination-Mobily.bru
â”‚   â”‚   â”œâ”€â”€ Termination-DOWIYAT.bru
â”‚   â”‚   â”œâ”€â”€ Termination-ITC.bru
â”‚   â”‚   â””â”€â”€ Termination-STC.bru
â”‚   â”œâ”€â”€ 02-TMF641-Cease-Notification/
â”‚   â”‚   â””â”€â”€ 641-Cease-Termination.bru
â”‚   â””â”€â”€ 03-Create-Service-Order-OA/             â† OA deactivation if needed
â”‚
â”œâ”€â”€ 08-Rewiring/                                â† Journey: Rewiring
â”‚   â”œâ”€â”€ _workflow.md
â”‚   â”œâ”€â”€ 01-Create-Rewiring-Order-TMF622/
â”‚   â”‚   â”œâ”€â”€ Rewiring-Mobily.bru
â”‚   â”‚   â””â”€â”€ Rewiring-Dowiyat.bru
â”‚   â”œâ”€â”€ 02-TMF641-Notifications/
â”‚   â””â”€â”€ 03-WFM-CPE-Rewiring/                    â† Rewiring-specific WFM payloads
â”‚
â”œâ”€â”€ 09-Maintenance/                             â† Journey: Maintenance
â”‚   â”œâ”€â”€ _workflow.md                            â† ðŸ“– "1. Create MO â†’ 2. WFM â†’ 3. Close/ReOpen"
â”‚   â”œâ”€â”€ 01-Create-Maintenance-Order-TMF622/
â”‚   â”‚   â”œâ”€â”€ Maintenance-Order-Mobily.bru
â”‚   â”‚   â”œâ”€â”€ Maintenance-Order-DOWIYAT.bru
â”‚   â”‚   â”œâ”€â”€ Maintenance-Order-ITC.bru
â”‚   â”‚   â””â”€â”€ Maintenance-Order-STC.bru
â”‚   â”œâ”€â”€ 02-WFM-Maintenance-Notifications/       â† Maintenance-specific WFM payloads
â”‚   â”œâ”€â”€ 03-Close-Maintenance-Order/
â”‚   â”‚   â”œâ”€â”€ Close-Maintenance-DOWIYAT.bru
â”‚   â”‚   â”œâ”€â”€ Close-Maintenance-ITC.bru
â”‚   â”‚   â””â”€â”€ Close-Maintenance-STC.bru
â”‚   â”œâ”€â”€ 04-ReOpen-Maintenance-Order/
â”‚   â””â”€â”€ 05-Open-Service-Request-OA/
â”‚       â”œâ”€â”€ Closed.bru
â”‚       â”œâ”€â”€ Rejected.bru
â”‚       â””â”€â”€ Resolved.bru
â”‚
â””â”€â”€ 10-Request-Update/                          â† Journey: Request Update
    â”œâ”€â”€ _workflow.md
    â”œâ”€â”€ Get-Order.bru
    â”œâ”€â”€ Request-Update-Mobily.bru
    â”œâ”€â”€ Request-Update-DOWIYAT.bru
    â””â”€â”€ Request-Update-ITC.bru
```

```markdown
# Relocation Journey - Workflow

## Prerequisites
- Existing active FTTH service
- Valid authentication token

## Steps
| Step | Folder | API | Description |
|------|--------|-----|-------------|
| 1 | `01-Create-Relocation-Order-TMF622/` | POST TMF622 | Create relocation order (pilih provider) |
| 2 | `02-TMF641-Notifications/` | POST TMF641 | Trigger Acknowledged â†’ InProgress â†’ Completed |
| 3 | `03-WFM-CPE-Relocation/` | POST WFM | Execute CPE workflow Step 01-09 |

## Notes
- WFM comments sudah disesuaikan untuk Relocation context
- Untuk OpenAccess, setelah Step 3 perlu trigger OA provider workflow
```

---

**User**

masalahnya begini, apa workflow md itu bisa dibuka di bruno app? karena kan kita akses via bruno app

---

**Cursor**

Poin bagus! Benar, file `.md` **tidak akan muncul** di Bruno app karena Bruno hanya membaca file `.bru`. Jadi `_workflow.md` akan sia-sia.

Tapi ada solusinya â€” Bruno mendukung **`docs` block** di dalam file `folder.bru`! Ini akan tampil sebagai dokumentasi langsung di Bruno app saat kamu klik folder tersebut.

Contoh:

```bru
meta {
  name: 03-Relocation
  seq: 3
}

docs {
  # ðŸ”„ Relocation Journey

  ## Workflow Steps
  | Step | Folder | Description |
  |------|--------|-------------|
  | 1 | `01-Create-Relocation-Order-TMF622/` | Create relocation order (pilih provider) |
  | 2 | `02-TMF641-Notifications/` | Trigger: Acknowledged â†’ InProgress â†’ Completed |
  | 3 | `03-WFM-CPE-Relocation/` | Execute CPE workflow Step 01-09 (Relocation context) |

  ## Notes
  - WFM payloads sudah disesuaikan untuk Relocation context
  - Untuk OpenAccess, setelah Step 3 trigger OA provider workflow juga
  - Relocation type: "Within Mobily" atau "Cross Provider"
}

auth {
  mode: inherit
}
```

Dan **setiap individual `.bru` request** juga bisa punya `docs` block:

```bru
meta {
  name: Step-01-CPE-1000-OK
  type: http
  seq: 1
}

docs {
  ## Relocation Context
  - Ini adalah WFM notification untuk **Relocation** journey
  - Comment di payload sudah disesuaikan: "Relocation work order received"
  - Jangan pakai payload ini untuk New Activation
}

post {
  url: {{demo-mob-dev}}/...
}
```

---

### âœ… Revisi Final: Ganti `_workflow.md` â†’ `docs` di `folder.bru`

Jadi plannya tetap **Journey-Centric**, tapi semua dokumentasi masuk ke `folder.bru` via `docs` block, bukan file `.md` terpisah. Ini akan **100% visible di Bruno app**.

**Mau saya langsung eksekusi reorganisasi ini?** Saya akan:
1. Buat folder structure baru sesuai journey
2. Pindahkan semua `.bru` files ke lokasi baru
3. Update semua `folder.bru` dengan `docs` block berisi workflow steps
4. Buat journey-specific WFM/TMF641 payloads dimana diperlukan
5. Hapus folder lama yang sudah kosong

```plaintext
meta {
  name: 03-Relocation
  seq: 3
}

docs {
  # ðŸ”„ Relocation Journey

  ## Workflow Steps
  | Step | Folder | Description |
  |------|--------|-------------|
  | 1 | `01-Create-Relocation-Order-TMF622/` | Create relocation order (pilih provider) |
  | 2 | `02-TMF641-Notifications/` | Trigger: Acknowledged â†’ InProgress â†’ Completed |
  | 3 | `03-WFM-CPE-Relocation/` | Execute CPE workflow Step 01-09 (Relocation context) |

  ## Notes
  - WFM payloads sudah disesuaikan untuk Relocation context
  - Untuk OpenAccess, setelah Step 3 trigger OA provider workflow juga
  - Relocation type: "Within Mobily" atau "Cross Provider"
}

auth {
  mode: inherit
}
```

```plaintext
meta {
  name: Step-01-CPE-1000-OK
  type: http
  seq: 1
}

docs {
  ## Relocation Context
  - Ini adalah WFM notification untuk **Relocation** journey
  - Comment di payload sudah disesuaikan: "Relocation work order received"
  - Jangan pakai payload ini untuk New Activation
}

post {
  url: {{demo-mob-dev}}/...
}
```

---

**User**

okee good yg pertama kita push dulu kondisi sekarang struktur collection api nya untuk berjaga jaga nantinya jika aku ingin revert ke conditions sebelumnya, setelah itu kamu bisa eksekusi plan tadi

---

**Cursor**

Baik! Pertama kita backup dulu dengan git commit. Mari cek apakah sudah ada git repo atau belum.

Sudah ada git repo. Ada banyak perubahan yang belum di-commit. Mari kita add semua dan commit sebagai backup.

Backup sudah tersimpan di commit `91e3e29`. Sekarang mari kita mulai eksekusi reorganisasi. Saya akan mulai membuat folder structure baru dan memindahkan file.

Sekarang pindahkan semua file ke struktur baru. Saya akan mulai dengan **Activation Journey** (yang paling besar).

Sekarang pindahkan file untuk **semua journey lainnya** sekaligus.

Semua file sudah dipindahkan. Sekarang buat semua `folder.bru` files dengan dokumentasi workflow yang lengkap untuk setiap journey. Mari lihat dulu folder.bru yang ada untuk referensi format.

Now let me check existing structure to understand files I have, before creating all the folder.bru files.

Semua file sudah terkonfirmasi di tempat yang benar. Sekarang buat semua `folder.bru` files dengan dokumentasi workflow.

Sekarang cleanup folder-folder lama. Saya perlu menghapus folder lama dan memastikan hanya folder baru yang tersisa.

Sekarang update README.md.

```markdown
# FTTH - Mobily - Project

**Journey-Centric API Collection for FTTH (Fiber To The Home) Solution - Mobily Implementation**

---

## ðŸ“‹ **Table of Contents**

1. [Overview](#overview)
2. [Project Structure](#project-structure)
3. [Environments](#environments)
4. [Journey Guide](#journey-guide)
5. [Getting Started](#getting-started)

---

## ðŸŽ¯ **Overview**

This Bruno API collection contains a comprehensive, journey-centric set of APIs for the FTTH (Fiber To The Home) solution implementation for Mobily. 

**Key Design Principle:** Each journey/use case contains ALL the API requests needed (TMF622, TMF641, WFM, SingleView, etc.) with **contextual payloads** specific to that journey. This eliminates confusion when testing â€” you don't need to remember to change comments or payload context between different use cases.

**Total APIs:** ~100+ endpoints organized across 9 business journeys

---

## ðŸ“ **Project Structure**

```
FTTH - Mobily - Project/
â”œâ”€â”€ environments/                     # Environment configs (AWS Dev & On-Prem Dev)
â”œâ”€â”€ Authentication/                   # Auth APIs (Dev 1, Dev 2, On-Prem)
â”‚
â”œâ”€â”€ 02-New-Activation/                # ðŸŸ¢ New FTTH Installation
â”‚   â”œâ”€â”€ 01-Create-Order-TMF622/       # Product orders (Mobily/OpenAccess)
â”‚   â”‚   â”œâ”€â”€ Mobily/
â”‚   â”‚   â”‚   â”œâ”€â”€ Regular-Customer/     # Postpaid & Prepaid
â”‚   â”‚   â”‚   â””â”€â”€ Royal-Customer/       # Postpaid
â”‚   â”‚   â””â”€â”€ OpenAccess/               # DAWIYAT, ITC, STC
â”‚   â”œâ”€â”€ 02-TMF641-Notifications/      # Service order notifications
â”‚   â”œâ”€â”€ 03-WFM-CPE-Installation/      # CPE installation workflow (9 steps)
â”‚   â”œâ”€â”€ 04-WFM-ME-Installation/       # Mesh Extender installation
â”‚   â”œâ”€â”€ 05-OpenAccess-Provider-Workflow/  # DAWIYAT/ITC/STC workflows
â”‚   â”œâ”€â”€ 06-SingleView-Integration/    # Appointments, Completion, Cancellation
â”‚   â””â”€â”€ 07-Installation-Failure-Scenarios/ # Failure codes & recovery
â”‚
â”œâ”€â”€ 03-Relocation/                    # ðŸ”„ Service Relocation
â”‚   â”œâ”€â”€ 01-Create-Relocation-Order-TMF622/
â”‚   â”œâ”€â”€ 02-TMF641-Notifications/
â”‚   â””â”€â”€ 03-WFM-CPE-Relocation/       # WFM with RELOCATION context
â”‚
â”œâ”€â”€ 04-Device-Swap/                   # ðŸ”§ CPE/HAG/ONT Replacement
â”‚   â”œâ”€â”€ 01-Create-Swap-Order-TMF622/
â”‚   â”œâ”€â”€ 02-TMF641-Notifications/
â”‚   â”œâ”€â”€ 03-WFM-CPE-Device-Swap/      # WFM with DEVICE SWAP context
â”‚   â””â”€â”€ 04-Installation-Failure-Scenarios/
â”‚
â”œâ”€â”€ 05-Upgrade-Downgrade/             # â¬†ï¸ Bandwidth Changes
â”‚   â”œâ”€â”€ 01-Upgrade-Order-TMF622/
â”‚   â”œâ”€â”€ 02-Downgrade-Order-TMF622/
â”‚   â””â”€â”€ 03-TMF641-Notifications/
â”‚
â”œâ”€â”€ 06-Suspend-Resume/                # â¸ï¸ Service Suspend & Resume
â”‚   â”œâ”€â”€ 01-Suspend-Order-TMF622/
â”‚   â”œâ”€â”€ 02-Create-Service-Order-OA/
â”‚   â””â”€â”€ 03-Resume-Order-TMF622/
â”‚
â”œâ”€â”€ 07-Termination/                   # âŒ Service Deactivation
â”‚   â”œâ”€â”€ 01-Termination-Order-TMF622/
â”‚   â””â”€â”€ 02-TMF641-Cease-Notification/
â”‚
â”œâ”€â”€ 08-Rewiring/                      # ðŸ”Œ Cable Rewiring
â”‚   â”œâ”€â”€ 01-Create-Rewiring-Order-TMF622/
â”‚   â”œâ”€â”€ 02-TMF641-Notifications/
â”‚   â””â”€â”€ 03-WFM-CPE-Rewiring/         # WFM with REWIRING context
â”‚
â”œâ”€â”€ 09-Maintenance/                   # ðŸ› ï¸ Service Maintenance/Repair
â”‚   â”œâ”€â”€ 01-Create-Maintenance-Order-TMF622/
â”‚   â”œâ”€â”€ 02-WFM-Maintenance-Notifications/ # WFM with MAINTENANCE context
â”‚   â”œâ”€â”€ 03-Close-Maintenance-Order/
â”‚   â”œâ”€â”€ 04-ReOpen-Maintenance-Order/
â”‚   â””â”€â”€ 05-Open-Service-Request-OA/
â”‚
â”œâ”€â”€ 10-Request-Update/                # ðŸ“‹ Order Status Updates
â”‚
â””â”€â”€ Documentation/                    # ðŸ“„ Reference documents (PDFs)
```

---

## ðŸŒ **Environments**

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

## ðŸ“š **Journey Guide**

### **02 - New Activation** ðŸŸ¢
> New FTTH service installation from scratch

| Step | Folder | API Type | Description |
|------|--------|----------|-------------|
| 1 | `01-Create-Order-TMF622` | TMF622 POST | Create product order (select provider/customer/ME variant) |
| 2 | `02-TMF641-Notifications` | TMF641 | Acknowledged â†’ InProgress â†’ Completed |
| 3 | `03-WFM-CPE-Installation` | WFM | 9-step CPE installation workflow |
| 4 | `04-WFM-ME-Installation` | WFM | Mesh Extender installation (if applicable) |
| 5 | `05-OpenAccess-Provider-Workflow` | OA | DAWIYAT/ITC/STC activation (if OpenAccess) |
| 6 | `06-SingleView-Integration` | SV Action | Appointments, completion, cancellation |
| 7 | `07-Installation-Failure-Scenarios` | WFM | Failure codes & recovery flows |

---

### **03 - Relocation** ðŸ”„
> Move existing FTTH service to a new location

| Step | Folder | API Type | Description |
|------|--------|----------|-------------|
| 1 | `01-Create-Relocation-Order-TMF622` | TMF622 POST | action: modify, ftthSubAction: Relocation |
| 2 | `02-TMF641-Notifications` | TMF641 | Acknowledged â†’ InProgress â†’ Completed |
| 3 | `03-WFM-CPE-Relocation` | WFM | CPE steps with **RELOCATION** context comments |

âš ï¸ **Key Difference:** WFM comments must reference relocation, NOT installation.

---

### **04 - Device Swap** ðŸ”§
> Replace CPE, HAG, or ONT device

| Step | Folder | API Type | Description |
|------|--------|----------|-------------|
| 1 | `01-Create-Swap-Order-TMF622` | TMF622 POST | action: modify, ftthSubAction: CPESwap |
| 2 | `02-TMF641-Notifications` | TMF641 | Acknowledged â†’ InProgress â†’ Completed |
| 3 | `03-WFM-CPE-Device-Swap` | WFM | CPE steps with **DEVICE SWAP** context comments |
| 4 | `04-Installation-Failure-Scenarios` | WFM | Device swap failure handling |

âš ï¸ **Key Difference:** Payload includes `oldCpeSerialNumber`. WFM comments reference device replacement.

---

### **05 - Upgrade/Downgrade** â¬†ï¸
> Change bandwidth (no technician visit needed)

| Step | Folder | API Type | Description |
|------|--------|----------|-------------|
| 1 | `01-Upgrade-Order-TMF622` | TMF622 POST | Bandwidth upgrade |
| 2 | `02-Downgrade-Order-TMF622` | TMF622 POST | Bandwidth downgrade |
| 3 | `03-TMF641-Notifications` | TMF641 | Acknowledged â†’ Completed (no InProgress) |

---

### **06 - Suspend & Resume** â¸ï¸
> Temporarily suspend and resume service

| Step | Folder | API Type | Description |
|------|--------|----------|-------------|
| 1 | `01-Suspend-Order-TMF622` | TMF622 POST | Suspend (Mobily + OpenAccess) |
| 2 | `02-Create-Service-Order-OA` | OA | Notify OpenAccess providers |
| 3 | `03-Resume-Order-TMF622` | TMF622 POST | Resume (OpenAccess only) |

---

### **07 - Termination** âŒ
> Permanently deactivate FTTH service

| Step | Folder | API Type | Description |
|------|--------|----------|-------------|
| 1 | `01-Termination-Order-TMF622` | TMF622 POST | action: delete, ftthSubAction: Deactivate |
| 2 | `02-TMF641-Cease-Notification` | TMF641 | Cease/termination notification |

---

### **08 - Rewiring** ðŸ”Œ
> Physical cable rewiring

| Step | Folder | API Type | Description |
|------|--------|----------|-------------|
| 1 | `01-Create-Rewiring-Order-TMF622` | TMF622 POST | Rewiring order |
| 2 | `02-TMF641-Notifications` | TMF641 | Acknowledged â†’ InProgress â†’ Completed |
| 3 | `03-WFM-CPE-Rewiring` | WFM | CPE steps with **REWIRING** context comments |

---

### **09 - Maintenance** ðŸ› ï¸
> Service repair and maintenance

| Step | Folder | API Type | Description |
|------|--------|----------|-------------|
| 1 | `01-Create-Maintenance-Order-TMF622` | TMF622 POST | action: add, srAction: New |
| 2 | `02-WFM-Maintenance-Notifications` | WFM | CPE steps with **MAINTENANCE** context |
| 3 | `03-Close-Maintenance-Order` | PATCH | Close completed maintenance |
| 4 | `04-ReOpen-Maintenance-Order` | PATCH | ReOpen if issue persists |
| 5 | `05-Open-Service-Request-OA` | OA | OpenAccess maintenance (Resolved/Rejected/Closed) |

---

### **10 - Request Update** ðŸ“‹
> Check or update order status

- Get Order status
- Trigger update for specific provider (Mobily/DAWIYAT/ITC)

---

## ðŸš€ **Getting Started**

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
   - Within WFM folders, follow Step-01 â†’ Step-02 â†’ ... â†’ Step-09

### **Tips**
- ðŸ“– **Read folder docs:** Each journey folder's `folder.bru` contains important context notes
- ðŸ”¢ **Follow numbering:** Sub-folders are numbered to indicate execution order
- âš ï¸ **Context matters:** WFM/notification payloads are different per journey â€” use the ones inside the specific journey folder
- ðŸ”„ **ME variants:** When testing with Mesh Extenders, use Step-08 variant matching the number of MEs ordered
- âŒ **Failure scenarios:** Each journey with WFM has its own failure scenarios folder

---

## ðŸ“ **Notes**

- All APIs follow TMF (TM Forum) standards for telecom operations
- **Journey-centric organization** ensures contextual correctness for each use case
- Each journey folder contains ALL API requests needed for that use case
- WFM notification comments are pre-configured for each journey's context
- Environment variables are shared across all journeys

---

## ðŸ”— **Related Documentation**

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

```

Now let me also update the `Authentication` folder.bru to have `seq: 1` so it shows first:

```bruno
meta {
  name: Authentication
  seq: 1
}

auth {
  mode: inherit
}

```

Sekarang commit hasil reorganisasi:

---

**User**

lanjutkan

lanjutkan

lanjutkan


