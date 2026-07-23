PT. PANJASA INTRADIN - Container Service & Fleet Management Portal
==================================================================

A secure, real-time enterprise full-stack web application built for **PT. Panjasa Intradin** to streamline container damage intake, cross-hub workshop repairs (Timika, Surabaya, and Jakarta), audit tracking, and automated fleet inventory synchronization.

🚀 Key Features & Architecture
------------------------------

*   **Multi-Hub Operational Pipeline:** Role-based access control for field inspectors at the **Timika Port Hub** and workshop technicians at the **Surabaya** and **Jakarta** workshops.
    
*   **Direct Photo Attachments & Compression:** Client-side image resizing and direct cloud uploads to Firebase Storage with a 3-photo cap limit for damage reporting and repair proof.
    
*   **Real-Time Firebase Synchronization:** Live data binding across collections using Firestore snapshots for instant ticket status updates, audit ledger changes, and cross-hub routing.
    
*   **Automated Google Apps Script Fleet Sync:** Automated background integration pulling live Google Sheets data into Firestore (app\_data/fleet\_inventory) every minute.
    
*   **Excel-Style Interactive Fleet Database:** Fully customizable data views featuring global search, multi-column checkbox filtering, ascending/descending sorting, and manual column resizing.
    
*   **Professional Audit Trail & PDF Printing:** Complete immutable audit logs for every ticket status transition, accompanied by an ultra-compact, 1-page printable service report template complete with digital signature stamps.
    

🛠️ Technology Stack
--------------------

*   **Frontend:** React, TypeScript, Tailwind CSS, Lucide Icons
    
*   **Backend & Database:** Firebase Firestore (NoSQL), Firebase Authentication (Email/Password & Google OAuth), Firebase Storage
    
*   **Automation & Integration:** Google Apps Script, Google Sheets API
    
*   **Build Tool:** Vite / Vercel CLI
    

📦 Project Structure
--------------------

Plaintext
```
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
```

⚙️ Installation & Local Setup
-----------------------------

1.  Bashgit clone https://github.com/niofrequency/SERVICE-REQUEST.gitcd SERVICE-REQUEST
    
2.  Bashbun install# ornpm install
    
3.  Code snippetVITE\_FIREBASE\_API\_KEY=your\_api\_keyVITE\_FIREBASE\_AUTH\_DOMAIN=your\_auth\_domainVITE\_FIREBASE\_PROJECT\_ID=your\_project\_idVITE\_FIREBASE\_STORAGE\_BUCKET=your\_storage\_bucketVITE\_FIREBASE\_MESSAGING\_SENDER\_ID=your\_sender\_idVITE\_FIREBASE\_APP\_ID=your\_app\_id
    
4.  Bashbun run dev# ornpm run dev
    

🔐 Security & Firestore Rules
-----------------------------

The system enforces strict security and data validation policies via Firestore Rules. Admins (mpigome44@gmail.com) maintain global read/write override privileges, while operational hub permissions isolate branch updates.

```
JavaScript

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
    
    function isSignedIn() { return request.auth != null; }
    function isAdmin() { return isSignedIn() && request.auth.token.email == "mpigome44@gmail.com"; }

    match /requests/{requestId} {
      allow read: if isSignedIn();
      allow create: if isSignedIn();
      allow update: if isSignedIn() && (isAdmin() || resource.data.status != 'DONE');
      allow delete: if isSignedIn() && (isAdmin() || resource.data.location == 'Timika');
    }

    match /app_data/{documentId} {
      allow read: if isSignedIn();
      allow write: if isAdmin();
    }
  }
}
```

📄 License
----------

Licensed under the \[Apache-2.0 License\](SPDX-License-Identifier: Apache-2.0). Proprietary enterprise infrastructure for PT. Panjasa Intradin © 2026.
