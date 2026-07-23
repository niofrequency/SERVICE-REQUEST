PT. PANJASA INTRADIN - Container Service & Fleet Management Portal
A secure, real-time enterprise full-stack web application built for PT. Panjasa Intradin to streamline container damage intake, cross-hub workshop repairs (Timika, Surabaya, and Jakarta), audit tracking, and automated fleet inventory synchronization.

🚀 Key Features & Architecture
Multi-Hub Operational Pipeline: Role-based access control for field inspectors at the Timika Port Hub and workshop technicians at the Surabaya and Jakarta workshops.

Direct Photo Attachments & Compression: Client-side image resizing and direct cloud uploads to Firebase Storage with a 3-photo cap limit for damage reporting and repair proof.

Real-Time Firebase Synchronization: Live data binding across collections using Firestore snapshots for instant ticket status updates, audit ledger changes, and cross-hub routing.

Automated Google Apps Script Fleet Sync: Automated background integration pulling live Google Sheets data into Firestore (app_data/fleet_inventory) every minute.

Excel-Style Interactive Fleet Database: Fully customizable data views featuring global search, multi-column checkbox filtering, ascending/descending sorting, and manual column resizing.

Professional Audit Trail & PDF Printing: Complete immutable audit logs for every ticket status transition, accompanied by an ultra-compact, 1-page printable service report template complete with digital signature stamps.

🛠️ Technology Stack
Frontend: React, TypeScript, Tailwind CSS, Lucide Icons

Backend & Database: Firebase Firestore (NoSQL), Firebase Authentication (Email/Password & Google OAuth), Firebase Storage

Automation & Integration: Google Apps Script, Google Sheets API

Build Tool: Vite / Vercel CLI

📦 Project Structure
Plaintext
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
⚙️ Installation & Local Setup
Clone the Repository:

Bash
git clone https://github.com/niofrequency/SERVICE-REQUEST.git
cd SERVICE-REQUEST
Install Dependencies:

Bash
bun install
# or
npm install
Configure Environment Variables:
Create a .env file in the root directory and add your Firebase configuration credentials:

Code snippet
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
Run the Development Server:

Bash
bun run dev
# or
npm run dev
🔐 Security & Firestore Rules
The system enforces strict security and data validation policies via Firestore Rules. Admins (mpigome44@gmail.com) maintain global read/write override privileges, while operational hub permissions isolate branch updates.

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
📄 License
Licensed under the [Apache-2.0 License](SPDX-License-Identifier: Apache-2.0). Proprietary enterprise infrastructure for PT. Panjasa Intradin © 2026.
