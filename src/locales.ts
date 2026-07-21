/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface LocaleSchema {
  // Brand & General
  brandTitle: string;
  brandSubtitle: string;
  systemStatus: string;
  nodeSecurity: string;
  pollingSync: string;
  logInHeader: string;
  logOut: string;
  loggedInAs: string;
  changeLanguage: string;
  unauthorizedTitle: string;
  unauthorizedDesc: string;
  portHub: string;

  // Login Screen
  loginTitle: string;
  loginSubtitle: string;
  selectLocation: string;
  selectTechnician: string;
  customTechNamePlaceholder: string;
  enterPasscode: string;
  enterPasscodePlaceholder: string;
  submitLogin: string;
  loginRequiredMsg: string;
  loginErrorMsg: string;
  restrictedTimika: string;
  restrictedSurabaya: string;

  // Header and Roles
  roleTimika: string;
  roleSurabaya: string;
  roleMonitor: string;
  clockSurabaya: string;
  clockTimika: string;

  // Demo banners
  demoHubTitle: string;
  demoHubDesc: string;

  // Stats scoreboard
  statTotal: string;
  statAwaiting: string;
  statInProgress: string;
  statCompleted: string;
  statCancelled: string;

  // Timika Form
  formTitle: string;
  formSubtitle: string;
  geminiOcrTitle: string;
  presetsTitle: string;
  uploadDamagePhoto: string;
  containerIdLabel: string;
  inspectorNameLabel: string;
  categoryLabel: string;
  priorityLabel: string;
  descriptionLabel: string;
  descriptionPlaceholder: string;
  publishingBtn: string;
  submitBtn: string;
  intakeLogTitle: string;
  intakeLogSubtitle: string;
  noRequestsYet: string;
  auditTrailBtn: string;
  repairCompletedBanner: string;
  requestCancelledBanner: string;

  // Surabaya Dashboard
  surabayaTitle: string;
  surabayaSubtitle: string;
  operatorLabel: string;
  filterAllCategories: string;
  filterAllPriorities: string;
  noActiveTickets: string;
  acceptRepairBtn: string;
  completeBtn: string;
  cancelBtn: string;
  resolutionNotesLabel: string;
  resolutionNotesPlaceholder: string;
  voidReasonLabel: string;
  voidReasonPlaceholder: string;
  proofRepairPhotoLabel: string;
  attachProofBtn: string;
  certifiedSealMsg: string;
  closeBtn: string;
  saveStatusBtn: string;
  ticketIdLabel: string;
  resolutionNotesError: string;
  cancellationReasonError: string;

  // Audit trail Modal
  auditTitle: string;
  auditSubtitle: string;
  timikaProofTitle: string;
  surabayaProofTitle: string;
  beforeLabel: string;
  afterLabel: string;
  damageDetailsLabel: string;
  resolutionCertifiedLabel: string;
  voidReasonDetailLabel: string;
  repairPendingLabel: string;
  repairPendingDesc: string;
  immutableAuditLedgerTitle: string;

  // Category values
  catElectrical: string;
  catStructural: string;
  catRefrigeration: string;
  catMechanical: string;

  // Priority values
  prioLow: string;
  prioMedium: string;
  prioHigh: string;
  prioUrgent: string;
}

export const locales: Record<"ENG" | "IND", LocaleSchema> = {
  ENG: {
    brandTitle: "PT. PANJASA-INTRADIN",
    brandSubtitle: "Service Management System v2.5",
    systemStatus: "SYSTEM: REAL-TIME CONNECTED (SYNC: 200ms)",
    nodeSecurity: "NODE SECURITY: AES-256 • GEMINI OCR v2.5",
    pollingSync: "POLL SYNC: ACTIVE",
    logInHeader: "Log In",
    logOut: "Sign Out",
    loggedInAs: "User",
    changeLanguage: "IND",
    unauthorizedTitle: "Access Restricted",
    unauthorizedDesc: "Your logged-in location is not authorized to edit this form.",
    portHub: "TIMIKA & SURABAYA HUB",

    loginTitle: "PORT TECHNICIAN PORTAL",
    loginSubtitle: "Sign in with your location profile to start dispatching or repairing.",
    selectLocation: "Select Duty Location",
    selectTechnician: "Select Technician Profile",
    customTechNamePlaceholder: "Or enter custom technician name...",
    enterPasscode: "Enter Authorization Code",
    enterPasscodePlaceholder: "Default is 1234",
    submitLogin: "Authorize & Log In",
    loginRequiredMsg: "Technician Authentication Required to Proceed.",
    loginErrorMsg: "Invalid Authorization Code. Please try again.",
    restrictedTimika: "RESTRICTED: Accessible only to Timika Port Inspectors.",
    restrictedSurabaya: "RESTRICTED: Accessible only to Surabaya Workshop Technicians.",

    roleTimika: "Timika (WIT)",
    roleSurabaya: "Surabaya (WIB)",
    roleMonitor: "Full Monitor",
    clockSurabaya: "Surabaya (WIB)",
    clockTimika: "Timika (WIT)",

    demoHubTitle: "Live Demo Hub",
    demoHubDesc: "Your active session is fully simulated. Use the profile indicators to switch between Timika Inspectors (Papua) and Surabaya Workshop Repairs (East Java).",

    statTotal: "Total Ingest",
    statAwaiting: "Awaiting Repair",
    statInProgress: "In Progress",
    statCompleted: "Completed",
    statCancelled: "Cancelled / Void",

    formTitle: "New Service Request",
    formSubtitle: "Scan shipping container plates with Gemini OCR or manually enter details below.",
    geminiOcrTitle: "GEMINI MULTIMODAL OCR",
    presetsTitle: "PRESSET SCAN SIMULATOR",
    uploadDamagePhoto: "Upload a damage photo",
    containerIdLabel: "Container ID (Format: FUKU-610012-2)",
    inspectorNameLabel: "Inspector Name",
    categoryLabel: "Category",
    priorityLabel: "Priority",
    descriptionLabel: "Issue Description",
    descriptionPlaceholder: "Describe damage details in full...",
    publishingBtn: "Publishing to Surabaya...",
    submitBtn: "Submit to Surabaya",
    intakeLogTitle: "Timika Intake Log",
    intakeLogSubtitle: "Real-time synchronization feedback from Surabaya workshop technicians.",
    noRequestsYet: "No requests submitted yet. Use the intake form to file one.",
    auditTrailBtn: "Logs",
    repairCompletedBanner: "Repair Completed!",
    requestCancelledBanner: "Request Cancelled",

    surabayaTitle: "Surabaya Repair Workshop Control",
    surabayaSubtitle: "Review and action container intake tickets arriving in real-time from Timika.",
    operatorLabel: "Operator",
    filterAllCategories: "All Categories",
    filterAllPriorities: "All Priorities",
    noActiveTickets: "No Active Tickets",
    acceptRepairBtn: "Accept Repair Task",
    completeBtn: "Complete",
    cancelBtn: "Cancel",
    resolutionNotesLabel: "Resolution Notes *",
    resolutionNotesPlaceholder: "Detail the physical actions taken (e.g., 'Re-welded panel, adjusted telematics sensors, checked sealant seal').",
    voidReasonLabel: "Mandatory Cancellation Reason *",
    voidReasonPlaceholder: "Specify why this ticket is being cancelled (e.g., 'Duplicate request', 'Resolved on-site').",
    proofRepairPhotoLabel: "Proof of Repair Photo *",
    attachProofBtn: "Attach Completed Photo",
    certifiedSealMsg: "Or defaults to workshop certified seal photo",
    closeBtn: "Close",
    saveStatusBtn: "Save Status",
    ticketIdLabel: "Ticket ID",
    resolutionNotesError: "Please describe the physical resolution and test results.",
    cancellationReasonError: "Please state the mandatory reason for cancelling this service request.",

    auditTitle: "Audit Logs",
    auditSubtitle: "Immutable Accountability Ledger",
    timikaProofTitle: "Timika Damage Proof",
    surabayaProofTitle: "Surabaya Resolution Proof",
    beforeLabel: "BEFORE",
    afterLabel: "AFTER",
    damageDetailsLabel: "Damage Details",
    resolutionCertifiedLabel: "Resolution Certified",
    voidReasonDetailLabel: "Void Reason",
    repairPendingLabel: "Workshop Repair Pending",
    repairPendingDesc: "Waiting for Surabaya technicians to perform repairs and attach certification.",
    immutableAuditLedgerTitle: "IMMUTABLE AUDIT LOGS",

    catElectrical: "Electrical",
    catStructural: "Structural",
    catRefrigeration: "Refrigeration/Telematics",
    catMechanical: "Mechanical",

    prioLow: "LOW",
    prioMedium: "MEDIUM",
    prioHigh: "HIGH",
    prioUrgent: "URGENT",
  },
  IND: {
    brandTitle: "PT. PANJASA-INTRADIN",
    brandSubtitle: "Sistem Manajemen Servis v2.5",
    systemStatus: "SISTEM: TERHUBUNG REAL-TIME (SINKRONISASI: 200ms)",
    nodeSecurity: "KEAMANAN SIMPUL: AES-256 • GEMINI OCR v2.5",
    pollingSync: "SINKRONISASI POLL: AKTIF",
    logInHeader: "Masuk",
    logOut: "Keluar",
    loggedInAs: "Pengguna",
    changeLanguage: "ENG",
    unauthorizedTitle: "Akses Dibatasi",
    unauthorizedDesc: "Lokasi login Anda tidak memiliki otoritas untuk mengubah formulir ini.",
    portHub: "PUSAT TIMIKA & SURABAYA",

    loginTitle: "PORTAL TEKNISI PELABUHAN",
    loginSubtitle: "Masuk dengan profil lokasi tugas Anda untuk memulai pelaporan atau perbaikan.",
    selectLocation: "Pilih Lokasi Tugas",
    selectTechnician: "Pilih Profil Teknisi",
    customTechNamePlaceholder: "Atau masukkan nama teknisi sendiri...",
    enterPasscode: "Masukkan Kode Otorisasi",
    enterPasscodePlaceholder: "Default adalah 1234",
    submitLogin: "Otorisasi & Masuk",
    loginRequiredMsg: "Otentikasi Teknisi Diperlukan untuk Melanjutkan.",
    loginErrorMsg: "Kode Otorisasi Salah. Silakan coba lagi.",
    restrictedTimika: "DIBATASI: Hanya dapat diakses oleh Inspektur Pelabuhan Timika.",
    restrictedSurabaya: "DIBATASI: Hanya dapat diakses oleh Teknisi Bengkel Surabaya.",

    roleTimika: "Timika (WIT)",
    roleSurabaya: "Surabaya (WIB)",
    roleMonitor: "Monitor Penuh",
    clockSurabaya: "Surabaya (WIB)",
    clockTimika: "Timika (WIT)",

    demoHubTitle: "Pusat Demo Langsung",
    demoHubDesc: "Sesi aktif Anda disimulasikan sepenuhnya. Gunakan indikator profil untuk beralih antara Inspektur Timika (Papua) dan Perbaikan Bengkel Surabaya (Jawa Timur).",

    statTotal: "Total Masuk",
    statAwaiting: "Menunggu Perbaikan",
    statInProgress: "Dalam Proses",
    statCompleted: "Selesai",
    statCancelled: "Dibatalkan / Void",

    formTitle: "Permintaan Servis Baru",
    formSubtitle: "Pindai pelat kontainer kontainer dengan Gemini OCR atau masukkan detail manual di bawah.",
    geminiOcrTitle: "GEMINI MULTIMODAL OCR",
    presetsTitle: "SIMULATOR PINDAI PRESET",
    uploadDamagePhoto: "Unggah foto kerusakan",
    containerIdLabel: "ID Kontainer (Format: FUKU-610012-2)",
    inspectorNameLabel: "Nama Inspektur",
    categoryLabel: "Kategori",
    priorityLabel: "Prioritas",
    descriptionLabel: "Deskripsi Masalah",
    descriptionPlaceholder: "Jelaskan detail kerusakan secara lengkap...",
    publishingBtn: "Menerbitkan ke Surabaya...",
    submitBtn: "Kirim ke Surabaya",
    intakeLogTitle: "Log Masuk Timika",
    intakeLogSubtitle: "Umpan balik sinkronisasi real-time dari teknisi bengkel Surabaya.",
    noRequestsYet: "Belum ada permintaan yang dikirim. Gunakan formulir masuk untuk melaporkan.",
    auditTrailBtn: "Log",
    repairCompletedBanner: "Perbaikan Selesai!",
    requestCancelledBanner: "Permintaan Dibatalkan",

    surabayaTitle: "Kontrol Bengkel Perbaikan Surabaya",
    surabayaSubtitle: "Tinjau dan tindak lanjuti tiket masuk kontainer yang tiba secara real-time dari Timika.",
    operatorLabel: "Operator",
    filterAllCategories: "Semua Kategori",
    filterAllPriorities: "Semua Prioritas",
    noActiveTickets: "Tidak Ada Tiket Aktif",
    acceptRepairBtn: "Terima Tugas Perbaikan",
    completeBtn: "Selesaikan",
    cancelBtn: "Batalkan",
    resolutionNotesLabel: "Catatan Resolusi *",
    resolutionNotesPlaceholder: "Rincikan tindakan fisik yang diambil (misalnya, 'Pengelasan ulang panel, penyesuaian sensor telematika, pemeriksaan segel sealant').",
    voidReasonLabel: "Alasan Pembatalan Wajib *",
    voidReasonPlaceholder: "Tentukan alasan mengapa tiket ini dibatalkan (misalnya, 'Permintaan ganda', 'Selesai di tempat').",
    proofRepairPhotoLabel: "Foto Bukti Perbaikan *",
    attachProofBtn: "Lampirkan Foto Selesai",
    certifiedSealMsg: "Atau default menggunakan foto segel bersertifikat bengkel",
    closeBtn: "Tutup",
    saveStatusBtn: "Simpan Status",
    ticketIdLabel: "ID Tiket",
    resolutionNotesError: "Silakan jelaskan tindakan perbaikan fisik dan hasil pengujian.",
    cancellationReasonError: "Silakan sebutkan alasan wajib untuk membatalkan permintaan layanan ini.",

    auditTitle: "Log Audit",
    auditSubtitle: "Buku Besar Akuntabilitas yang Tidak Dapat Diubah",
    timikaProofTitle: "Bukti Kerusakan Timika",
    surabayaProofTitle: "Bukti Resolusi Surabaya",
    beforeLabel: "SEBELUM",
    afterLabel: "SESUDAH",
    damageDetailsLabel: "Detail Kerusakan",
    resolutionCertifiedLabel: "Resolusi Bersertifikat",
    voidReasonDetailLabel: "Alasan Void",
    repairPendingLabel: "Perbaikan Bengkel Tertunda",
    repairPendingDesc: "Menunggu teknisi Surabaya melakukan perbaikan dan melampirkan sertifikasi.",
    immutableAuditLedgerTitle: "LOG AUDIT YANG TIDAK DAPAT DIUBAH",

    catElectrical: "Kelistrikan",
    catStructural: "Struktural",
    catRefrigeration: "Pendinginan/Telematika",
    catMechanical: "Mekanikal",

    prioLow: "RENDAH",
    prioMedium: "SEDANG",
    prioHigh: "TINGGI",
    prioUrgent: "DARURAT",
  }
};
