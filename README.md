# PT. PANJASA INTRADIN - Container Service & Fleet Management Portal

A secure, real-time enterprise full-stack web application built for **PT. Panjasa Intradin** to streamline container damage intake, cross-hub workshop repairs (Timika, Surabaya, and Jakarta), audit tracking, and automated fleet inventory synchronization.

---

## 🚀 Key Features & Architecture

* **Multi-Hub Operational Pipeline:** Role-based access control for field inspectors at the **Timika Port Hub** and workshop technicians at the **Surabaya** and **Jakarta** workshops.
* **Direct Photo Attachments & Compression:** Client-side image resizing and direct cloud uploads to Firebase Storage with a 3-photo cap limit for damage reporting and repair proof.
* **Real-Time Firebase Synchronization:** Live data binding across collections using Firestore snapshots for instant ticket status updates, audit ledger changes, and cross-hub routing.
* **Automated Google Apps Script Fleet Sync:** Automated background integration pulling live Google Sheets data into Firestore (`app_data/fleet_inventory`) every minute.
* **Excel-Style Interactive Fleet Database:** Fully customizable data views featuring global search, multi-column checkbox filtering, ascending/descending sorting, and manual column resizing.
* **Professional Audit Trail & PDF Printing:** Complete immutable audit logs for every ticket status transition, accompanied by an ultra-compact, 1-page printable service report template complete with digital signature stamps.

---

## 🛠️ Technology Stack

* **Frontend:** React, TypeScript, Tailwind CSS, Lucide Icons
* **Backend & Database:** Firebase Firestore (NoSQL), Firebase Authentication (Email/Password & Google OAuth), Firebase Storage
* **Automation & Integration:** Google Apps Script, Google Sheets API
* **Build Tool:** Vite / Vercel CLI

---

## 📦 Project Structure

```text
SERVICE-REQUEST/
├── public/
│   └── img/
│       └── panjasa-intradin_logo.png
├── src/
│   ├── components/
│   │   ├── AdminProfile.tsx
│   │   ├── AuditTrailModal.tsx
│   │   ├── Header.tsx
│   │   ├── JakartaDashboard.tsx
│   │   ├── LocationTab.tsx
│   │   ├── SurabayaDashboard.tsx
│   │   └── TimikaForm.tsx
│   ├── firebase.ts
│   ├── index.css
│   ├── initialData.ts
│   ├── locales.ts
│   ├── main.tsx
│   └── types.ts
├── firestore.rules
├── server.ts
├── tsconfig.json
├── vercel.json
└── vite.config.ts
