# AGENTS.md — FTTH Mobily Project

Panduan untuk AI agent yang bekerja di project ini. Baca sekali di awal sesi.

## Arsitektur (2 workspace)

- **`FTTH - Mobily - Project`** (repo ini) — Bruno collection (`.bru`) + engine
  automation di `Automation/`.
- **`FTTH-Mobily-Toolkit`** — web toolkit Node (`server.js`, `npm run dev`,
  port 3456). Meng-`require` `Automation/core.js` dari project ini via
  `--project`. UI-nya (journey run, resume, detect, search, B2B) memanggil
  fungsi di `Automation/`.

## Layout Bruno collection (Provider × Journey + Shared)

| Folder | Isi |
|--------|-----|
| `Mobily/{Journey}/` | TMF622 + Mobily-specific requests per journey |
| `OpenAccess/{Provider}/{Journey}/` | TMF622 + OA notifications per provider |
| `Shared-Workflows/` | WFM CPE/ME, TMF641, SingleView, Create-Service-Order-OA |

Semua path automation engine di `Automation/constants/paths.js` — jangan hardcode string path di registry/builders.

## Layout `Automation/` (Single Responsibility)

| Modul | Tanggung jawab |
|-------|----------------|
| `core.js` | Facade — re-export semua fungsi publik |
| `lib/runtime.js` | init, log, delay, cancellation |
| `lib/env-bru.js` | parse `environments/*.bru` + file `.bru` |
| `lib/http.js` | `httpRequest`, `runBruRequest` (subVars + audit log) |
| `lib/auth.js` | OAuth per environment |
| `lib/state.js` | extract sub-state, `doWaitForOrderState`, bridge replay |
| `lib/b2b.js` | B2B message helpers, `doWaitForCpeInstallationPendingUat` |
| `lib/extractors.js` | poll ID dari order detail / B2B |
| `lib/notifications.js` | `doNotification`, `doCreateOrder` |
| `providers/network-category.js` | routing `FTTH CONSUMER` vs `FTTH RCY` |
| `providers/mobily.js` | builder activation + field-work Mobily |
| `providers/openaccess.js` | builder + notif OA (STC/ITC/ACES/DOWIYAT) |
| `journeys/registry.js` | katalog journey |
| `journeys/labels.js` | label step + state map |
| `constants/paths.js` | path Bruno collection (Provider × Journey + Shared) |
| `constants/timing.js` | delay notifikasi (lihat Quirks) |
| `runner/runner.js` | orchestrator: load env → auth → jalankan step |
| `runner/step-executor.js` | dispatcher per `step.type` |
| `runner/resume.js` | mekanika resume (skip/strip/re-extract) |

Step descriptor: `{ step, type, file?, delay?, state?, vars? }`.

## Environment-specific quirks (MAHAL kalau lupa — semua ini pernah jadi bug)

1. **`networkCategory` case-sensitive** → hanya `FTTH CONSUMER` / `FTTH RCY`
   yang diterima API. Sumber kebenaran: `providers/network-category.js`.
2. **Notifikasi SV bersifat async lewat B2B.** SV `UAT-Completed` HARUS nunggu
   B2B `CPE Installation Action (Pending UAT)` muncul dulu
   (`doWaitForCpeInstallationPendingUat`), kalau tidak order nyangkut di
   "UAT Completed".
3. **Payload SV** pakai `"status": "completed"` (huruf kecil) dan
   `"orderState": "In Progress| UAT Completed"` (ada spasi setelah `|`).
4. **Delay notifikasi** di `constants/timing.js`: default **15s**, notifikasi
   Mesh Extender (`WFM-ME-Workflow`) **20s** via `notifyDelayForFile()`.
   Delay diterapkan terpusat di `runner/step-executor.js`.
5. **Resume WAJIB strip per-order ID stale dari env** (`stripStalePerOrderIds`
   di `runner/resume.js`) — `workOrderIdCpe`, `workOrderIdMe`, `serviceOrderId`,
   `odbPatchActionId`, dan OA IDs. Kalau tidak, notif kekirim pakai ID milik
   order lama (gejala: "resume ngambil order salah").

## Cara test cepat ke environment

Jalankan dari root project ini. Selalu matikan TLS reject (cert self-signed):

```bash
node -e "
process.env.NODE_TLS_REJECT_UNAUTHORIZED='0';
const core=require('./Automation/core.js');
core.init(process.cwd(),(t,m)=>console.log('['+t+']',m));
(async()=>{
  const v=core.parseEnvFile('Dev 2');
  await core.doAuth(v,'Dev 2');
  // v.orderId='ORD...'; panggil fungsi core yang mau dites
})().catch(console.error);
"
```

Fungsi yang sering dipakai: `doCreateOrder`, `doNotification`,
`doWaitForOrderState`, `doCheckState`, `parseBruFile`, `subVars`,
`cleanJsonBody`, `buildOrderDetailUrl` (`lib/url-builder.js`).

## Konvensi kerja

- **Investigasi dulu kalau root cause belum jelas**, baru ubah kode.
- **Verifikasi ke env** (bukan asumsi) sebelum bilang selesai — project ini
  banyak quirk yang cuma ketahuan dari response asli.
- **Perubahan timing/notif harus lintas provider** kecuali diminta spesifik
  (mobily.js, openaccess.js, builders.js, dan `constants/timing.js`).
- Jangan commit kecuali diminta. Jangan pernah commit file yang berisi secret
  (`environments/*.bru` mengandung password/clientsecret).

## Referensi prompt

Lihat `AI-COLLABORATION-GUIDE.md` untuk template prompt & pola kolaborasi.
