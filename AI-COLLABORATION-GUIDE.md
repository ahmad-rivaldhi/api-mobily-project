# AI Collaboration Guide — FTTH Mobily Project

Rangkuman feedback berdasarkan sesi development yang sudah kita lakukan
(fix `networkCategory` casing, stuck order UAT→Pre-Completion, resume fetch
wrong order, notification delay, ME 20s delay, dll).

Tujuan dokumen ini: (1) bikin kamu bisa nulis prompt yang menghasilkan output
proper **sekali jalan**, dan (2) daftar skills/rules yang sebaiknya di-install
di project ini.

---

## 1. Cara Menulis Prompt yang "Sekali Jalan Beres"

### 1.1 Kenapa beberapa request kemarin butuh banyak eksplorasi

Dari pola request kemarin, yang bikin agent harus muter-muter dulu:

- Prompt terlalu pendek (contoh: _"solve this error"_) tanpa nyebut order ID,
  env, journey, atau step mana.
- Konteks "expected vs actual" tersirat, bukan eksplisit (agent harus nebak
  hasil yang benar seperti apa).
- Tidak nyebut file/modul yang relevan, jadi agent harus grep dari nol.

Yang **sudah bagus** dan tolong dipertahankan:
- Nempel potongan log terminal (`terminals/2.txt:49-52`).
- Nyebut environment spesifik (`dev2`) dan order ID (`ORD000000146644`).
- Nyebut titik mulai (`from wfm notif`).

### 1.2 Template Prompt (copy-paste)

```
KONTEKS
- Workspace: [FTTH Collection / FTTH-Mobily-Toolkit]
- Env: [Dev 2 / SIT / ...]
- Journey: [mobily-activation / dawiyat-activation / ...]
- Order ID (kalau ada): [ORD..........]
- ME count / paymentType (kalau relevan): [0 / 1 / 2 / 3] [Postpaid/Prepaid]

MASALAH / TUJUAN
- Apa yang terjadi sekarang (actual): [...]
- Apa yang seharusnya (expected): [...]
- Bukti: [tempel log terminal / response body / screenshot path]

BATASAN
- Jangan ubah: [file/perilaku yang tidak boleh disentuh]
- Harus berlaku untuk: [semua provider / hanya Mobily / hanya OA / dst]

VERIFIKASI
- Anggap selesai kalau: [order lanjut ke state X / payload kirim value Y / test node lolos]
```

### 1.3 Aturan singkat biar hasil proper sekali jalan

1. **Selalu sertakan expected vs actual.** Contoh bug `networkCategory`:
   yang bikin cepat adalah kamu bilang _"it should be FTTH Consumer"_ →
   langsung tahu target valuenya, tinggal cari kenapa API nolak.
2. **Tentukan scope perubahan.** Kalimat _"untuk semua provider"_ (waktu minta
   delay 15s) itu emas — langsung tahu harus sentuh mobily.js, openaccess.js,
   builders.js, bukan satu file saja.
3. **Kasih 1 contoh konkret** (order ID + env). Agent bisa langsung test ke
   API dan buktikan fix-nya, bukan cuma menebak.
4. **Sebut "definition of done".** Misal: _"dianggap beres kalau order lanjut
   ke Pre-Completion"_. Ini yang bikin agent mau jalanin verifikasi, bukan
   berhenti di "sudah kuubah".
5. **Kalau perilaku beda antar kasus, bilang di depan.** Contoh: _"ME delay
   20s, sisanya tetap 15s"_ → langsung dibuat file-aware, bukan global.
6. **Pisahkan "investigasi" vs "eksekusi"** kalau kamu belum yakin root cause.
   Contoh: _"analisa dulu kenapa resume ambil order salah, jangan langsung
   ubah"_ vs _"fix dan verifikasi"_.

### 1.4 Contoh: prompt lemah → prompt kuat

**Lemah**
> resume ku ngambil order yang salah, tolong benerin

**Kuat**
> Di Dev 2, aku resume `ORD000000146644` journey `mobily-activation` dari step
> WFM notif, tapi notifikasi kekirim pakai `workOrderIdCpe` order lama.
> Expected: pakai workOrderIdCpe milik ORD000000146644.
> Tolong analisa root cause di `Automation/runner/resume.js` dulu, baru fix,
> lalu verifikasi logika strip/re-extract-nya. Fix harus jalan untuk semua
> Mobily & OA journey, jangan sampai run baru (resumeFrom=1) ikut kena.

---

## 2. Skills / Rules (SUDAH terpasang)

> Update: project ini **sudah punya** `AGENTS.md` (root), `.cursor/rules/ftth-mobily.mdc`
> (always-applied), dan skill `.cursor/skills/test-telflow/`. Bagian di bawah
> dipertahankan sebagai catatan rasional/konten yang seharusnya ada di file-file
> itu — bukan lagi TODO.

### 2.1 (WAJIB) Project Rule — domain knowledge

Isi `.cursor/rules/ftth-mobily.mdc` (dan `AGENTS.md` di root):

- **Arsitektur 2 workspace**: Bruno collection (`FTTH - Mobily - Project`) +
  toolkit Node (`FTTH-Mobily-Toolkit/server.js` yang `require` `Automation/core.js`).
- **Layout `Automation/`**: `lib/`, `providers/`, `journeys/`, `runner/`,
  `constants/` + tanggung jawab tiap modul (sudah terdokumentasi di `core.js`).
- **Model journey/step**: step descriptor `{ step, type, file?, delay?, state? }`,
  dispatcher di `runner/step-executor.js`.
- **Quirk environment yang MAHAL kalau lupa**:
  - `networkCategory` case-sensitive → harus `FTTH CONSUMER` / `FTTH RCY`.
  - Notifikasi SV async lewat B2B → SV UAT harus nunggu B2B
    `CPE Installation Action (Pending UAT)` dulu.
  - Payload SV pakai `"status": "completed"` (huruf kecil).
  - Delay notif: default 15s, ME (`WFM-ME-Workflow`) 20s → di `constants/timing.js`.
  - Resume: per-order IDs harus di-strip dari env stale
    (`stripStalePerOrderIds`) biar re-extract ke order yang benar.
- **Cara test cepat ke env** (lihat 2.4).

> Kenapa penting: semua bug kemarin (casing, timing, resume, delay) berakar di
> domain knowledge yang tidak tertulis. Sekali ditulis sebagai rule, agent
> nggak perlu nemuin ulang dan nggak akan ngulang kesalahan yang sama.

### 2.2 Skills yang tinggal dipakai (sudah tersedia, tinggal diaktifkan pola pakainya)

- **`systematic-debugging`** — untuk kasus "kenapa order stuck / resume salah".
  Bikin agent kumpulkan bukti runtime dulu sebelum ngubah kode.
- **`verification-before-completion`** — biar agent wajib jalanin test/hit API
  dan tunjukkan bukti sebelum bilang "beres". Cocok banget buat project ini
  yang fix-nya harus dibuktikan ke Dev 2.
- **`writing-plans`** — untuk perubahan lintas file (misal ubah timing di semua
  provider) supaya nggak ada yang kelewat.
- **`brainstorming`** — dipakai sebelum nambah fitur baru (misal "search OA
  rewiring order") biar requirement & desain jelas dulu.

### 2.3 (OPSIONAL, high value) Custom Skill: "Test journey/notif ke env"

Bikin skill di `.cursor/skills-*/test-telflow/SKILL.md` yang isinya pola test
one-shot yang berulang kali kita pakai:

```js
// pola yang dipakai berulang di sesi debugging
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const core = require('./Automation/core.js');
core.init(process.cwd(), (t, m) => console.log('[' + t + ']', m));
const vars = core.parseEnvFile('Dev 2');
await core.doAuth(vars, 'Dev 2');
// ... doNotification / doCreateOrder / doWaitForOrderState / doCheckState
```

Dengan skill ini, tiap kali kamu minta "test X ke dev2", agent langsung pakai
pola yang benar (TLS off, init, auth, parseEnvFile) tanpa nyusun ulang.

### 2.4 Cara test cepat (dipakai sebagai referensi di rule)

```bash
# dari root: FTTH - Mobily - Project
node -e "
process.env.NODE_TLS_REJECT_UNAUTHORIZED='0';
const core=require('./Automation/core.js');
core.init(process.cwd(),(t,m)=>console.log('['+t+']',m));
(async()=>{
  const v=core.parseEnvFile('Dev 2');
  await core.doAuth(v,'Dev 2');
  // panggil fungsi core yang mau dites di sini
})().catch(console.error);
"
```

---

## 3. Ringkasan Prioritas

| Prioritas | Aksi | Dampak |
|-----------|------|--------|
| 1 | `.cursor/rules/ftth-mobily.mdc` (domain + quirks) | SUDAH ada — hilangkan re-discovery |
| 2 | Biasakan pola prompt di §1.2 (expected/actual + scope + DoD) | Hasil proper sekali jalan |
| 3 | Aktifkan `systematic-debugging` + `verification-before-completion` | Fix terbukti, bukan asumsi |
| 4 | Custom skill "Test journey/notif ke env" | SUDAH ada (`test-telflow`) |
