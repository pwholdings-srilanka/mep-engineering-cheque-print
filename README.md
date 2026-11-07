# MEP Engineering & Trading Company - Cheque & Voucher Printer (Version 2.0)

A modern, high-precision cheque and voucher printing system built specifically for **MEP Engineering & Trading Company (Pvt) Ltd** (Zoho Books Organization ID: `940082326`).

---

## 🌟 Key Features

1. **Modern Clean Architecture:**
   - Modular frontend and backend: `public/` (UI, styles, presets), `api/` (Zoho Books sync & OAuth), and `lib/` (Zoho client, number-to-words engine).
   - Zero external npm production dependencies — runs natively on Node.js 20/22+.
   - Modern dark theme UI with live preview, bank calibration sliders, and instant printing.

2. **Sri Lanka Banking Calibration Standards:**
   - Pre-calibrated bank profiles:
     - **Commercial Bank of Ceylon** (Calibrated for Canon rear tray & vertical feed)
     - **Nations Trust Bank (NTB)**
     - **Sampath Bank**
     - **Hatton National Bank (HNB)**
     - **Bank of Ceylon (BOC)**
     - **Seylan Bank**
   - Date formats:
     - `Skip [20]` (skips pre-printed `20` on modern cheques: `DD MM [20] YY`)
     - `Compact 6-box` (`DD MM YY`)
     - `Full 8-box` (`DD MM YYYY`)
   - Parallel crossing lines (**"A/C PAYEE ONLY"**).
   - Bearer strike (**"OR BEARER"** line strike).
   - Authorised signatory line.

3. **Smart Text Casing & Formatting:**
   - **Payee Name:** Automatically preserves original vendor casing and abbreviations (`Pvt Ltd`, initials).
   - **Amount in Words:** Auto-generated in Title Case with currency formatting (`One Hundred And Thirty Five Thousand And Cents Zero Only`).

4. **Dual Feed & Orientation Control:**
   - **270° Canon Rear Tray Feed (Default):** Cheque fed narrow-edge first into rear tray.
   - **0° Horizontal / Landscape Feed:** Standard landscape bottom-tray feed.
   - **90° Vertical & 180° Inverted Feed.**
   - Live visual indicator and 1-click **Rotate Orientation** cycle button.
   - Whole Cheque Shift nudging (`▲ Top`, `▼ Down`, `◄ Left`, `► Right`) in 1mm increments.

5. **Direct Zoho Books Integration:**
   - 1-click **Recent Payments**: Fetches recent vendor payments directly from Zoho Books.
   - **Auto-Fill & Print**: Automatically loads Payee, Amount, converts to Words, formats Date, and updates the cheque canvas.

---

