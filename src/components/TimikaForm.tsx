import React, { useState, useRef, useEffect } from "react";
import { doc, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase"; // Adjust path if needed
import { 
  PriorityLevel, 
  IssueCategory, 
  ServiceRequest, 
  RequestStatus, 
  LocationTeam 
} from "../types.js";
import { 
  Camera, 
  AlertTriangle, 
  CheckCircle, 
  User, 
  ClipboardList, 
  Image as ImageIcon,
  Edit2,
  Trash2,
  X,
  Save,
  Lock,
  Send,
  Clock
} from "lucide-react";
import { locales } from "../locales.js";

interface TimikaFormProps {
  onSubmitSuccess: () => void;
  onSubmitRequest?: (payload: {
    containerNumber: string;
    priority: PriorityLevel;
    category: IssueCategory;
    description: string;
    photoUrl: string | null;
    reporterName: string;
    destinationLocation?: LocationTeam; 
  }) => Promise<void>;
  requests: ServiceRequest[];
  onSelectRequest: (request: ServiceRequest) => void;
  language: "ENG" | "IND";
  loggedInUser: { name: string; location: LocationTeam; email?: string } | null;
  prefilledContainerNumber?: string;
  prefilledPhoto?: string | null;
  onClearPrefilled?: () => void;
  onNavigateHistory?: () => void;
  onNavigateInProgress?: () => void; // Added handler for navigating to In Progress tab
}

// Helper to automatically format container number to ISO 6346 with hyphens (e.g. CBHU-265392-1)
const formatContainerNumber = (val: string): string => {
  const clean = val.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (clean.length === 0) return "";
  
  let formatted = "";
  const part1 = clean.slice(0, 4);
  formatted += part1;
  
  if (clean.length > 4) {
    const part2 = clean.slice(4, 10);
    formatted += `-${part2}`;
  }
  
  if (clean.length > 10) {
    const part3 = clean.slice(10, 11);
    formatted += `-${part3}`;
  }
  
  return formatted;
};

export default function TimikaForm({
  onSubmitSuccess,
  onSubmitRequest,
  requests,
  onSelectRequest,
  language,
  loggedInUser,
  prefilledContainerNumber,
  prefilledPhoto,
  onClearPrefilled,
  onNavigateHistory,
  onNavigateInProgress,
}: TimikaFormProps) {
  const t = locales[language];

  // Form State
  const [containerNumber, setContainerNumber] = useState("");
  const [priority, setPriority] = useState<PriorityLevel>(PriorityLevel.MEDIUM);
  const [category, setCategory] = useState<IssueCategory>(IssueCategory.STRUCTURAL);
  const [description, setDescription] = useState("");
  const [reporterName, setReporterName] = useState(() => loggedInUser?.name || "");
  const [photo, setPhoto] = useState<string | null>(null);
  const [destinationLocation, setDestinationLocation] = useState<LocationTeam>(LocationTeam.SURABAYA); // Default destination

  // Edit Card State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState<string>("");
  const [editPriority, setEditPriority] = useState<PriorityLevel>(PriorityLevel.MEDIUM);
  const [editCategory, setEditCategory] = useState<IssueCategory>(IssueCategory.STRUCTURAL);
  const [isUpdating, setIsUpdating] = useState(false);

  // Prefill from external inputs or mobile camera
  useEffect(() => {
    if (prefilledContainerNumber) {
      setContainerNumber(formatContainerNumber(prefilledContainerNumber));
    }
  }, [prefilledContainerNumber]);

  useEffect(() => {
    if (prefilledPhoto) {
      setPhoto(prefilledPhoto);
    }
  }, [prefilledPhoto]);

  // Auth constraint check
  const isAdmin = loggedInUser?.email === "mpigome44@gmail.com";
  const isAuthorized = loggedInUser?.location === LocationTeam.TIMIKA || isAdmin;

  // Auto assign logged-in user name
  useEffect(() => {
    if (loggedInUser && loggedInUser.location === LocationTeam.TIMIKA) {
      setReporterName(loggedInUser.name);
    }
  }, [loggedInUser]);

  // UI Flow State
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Separate logs into active (In Progress / Waiting) and finished (Done / Cancelled)
  const activeRequests = requests.filter(
    (req) => req.status !== RequestStatus.DONE && req.status !== RequestStatus.CANCELLED
  );
  const completedRequests = requests.filter(
    (req) => req.status === RequestStatus.DONE || req.status === RequestStatus.CANCELLED
  );

  // Direct manual file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setPhoto(base64);
    };
    reader.readAsDataURL(file);
  };

  // Submit the Service Request
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!containerNumber.trim()) {
      setSubmitError("Container Number is required. Please type the container plate above.");
      return;
    }

    const cleanNum = containerNumber.replace(/[^a-zA-Z0-9]/g, "");
    if (cleanNum.length < 8) {
      setSubmitError("Warning: Container number seems too short. Ensure valid ISO 6346 code (e.g. MSKU 491028 3)");
    }

    if (!description.trim()) {
      setSubmitError("Please provide a detailed description of the damage.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (onSubmitRequest) {
        await onSubmitRequest({
          containerNumber,
          priority,
          category,
          description,
          photoUrl: photo,
          reporterName,
          destinationLocation, // Pass destination selection to parent
        });
        setContainerNumber("");
        setDescription("");
        setPhoto(null);
        if (onClearPrefilled) onClearPrefilled();
        onSubmitSuccess();
      } else {
        const response = await fetch("/api/requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            containerNumber,
            priority,
            category,
            description,
            photoUrl: photo,
            reporterName,
            destinationLocation,
          }),
        });

        const data = await response.json();
        if (response.ok) {
          setContainerNumber("");
          setDescription("");
          setPhoto(null);
          if (onClearPrefilled) onClearPrefilled();
          onSubmitSuccess();
        } else {
          setSubmitError(data.error || "Failed to submit request.");
        }
      }
    } catch (err: any) {
      setSubmitError(err.message || "Network error: Could not connect to full-stack server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-6 animate-fade-in w-full">

      {/* Form & Photo Attachment Column */}
      <div className="flex-[1_1_450px] min-w-[280px] bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm space-y-5 relative max-w-full">
        {!isAuthorized && (
          <div className="absolute inset-0 bg-slate-950/10 backdrop-blur-[2px] rounded-2xl z-10 flex flex-col items-center justify-center p-6 text-center">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-sm shadow-2xl text-white space-y-4">
              <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle className="h-6 w-6 text-amber-500 animate-pulse" />
              </div>
              <h3 className="text-sm font-extrabold tracking-wider uppercase">{t.unauthorizedTitle}</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {t.restrictedTimika}
              </p>
              <p className="text-[11px] text-slate-500 font-mono">
                {t.unauthorizedDesc}
              </p>
            </div>
          </div>
        )}

        <div className="border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2 text-blue-600 mb-1">
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <Camera className="h-4 w-4" />
            </div>
            <h2 className="text-xs font-extrabold uppercase text-slate-800 tracking-wider">
              {t.formTitle}
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            {t.formSubtitle}
          </p>
        </div>

        {/* Direct Photo Attachment Section */}
        <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/40 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-slate-500 flex items-center space-x-1.5 uppercase tracking-wide">
              <ImageIcon className="h-4 w-4 text-slate-600" />
              <span>{language === "ENG" ? "Damage Photo Attachment" : "Lampiran Foto Kerusakan"}</span>
            </span>
          </div>

          <div className="relative">
            <div className="flex items-center justify-center border border-dashed border-slate-200 hover:border-slate-300 rounded-xl bg-white p-5 transition-colors">
              {photo ? (
                <div className="relative w-full max-w-md mx-auto">
                  <img
                    src={photo}
                    alt="Uploaded damage proof"
                    referrerPolicy="no-referrer"
                    className="w-full h-40 object-cover rounded-lg border border-slate-200"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPhoto(null);
                      if (onClearPrefilled) onClearPrefilled();
                    }}
                    disabled={!isAuthorized}
                    className="absolute -top-2 -right-2 bg-rose-600 hover:bg-rose-700 text-white p-1 rounded-full text-xs font-bold w-6 h-6 flex items-center justify-center cursor-pointer shadow"
                    title="Clear photo"
                  >
                    &times;
                  </button>
                </div>
              ) : (
                <div className="text-center space-y-2">
                  <div className="p-3 bg-slate-50 text-slate-400 rounded-full w-12 h-12 flex items-center justify-center mx-auto">
                    <ImageIcon className="h-6 w-6" />
                  </div>
                  <div className="text-xs text-slate-600">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={!isAuthorized}
                      className="font-extrabold text-blue-600 hover:underline disabled:text-slate-400 disabled:no-underline cursor-pointer"
                    >
                      {t.uploadDamagePhoto}
                    </button>
                    <span> or take smartphone photo</span>
                  </div>
                  <p className="text-[10px] text-slate-400">PNG, JPG, JPEG up to 10MB</p>
                </div>
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              className="hidden"
              disabled={!isAuthorized}
            />
          </div>
        </div>

        {/* Create Request Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-[1_1_200px] min-w-[150px]">
              <label className="block text-[10px] font-mono uppercase tracking-wider font-extrabold text-slate-500 mb-1.5 flex items-center justify-between">
                <span>{t.containerIdLabel} *</span>
                {prefilledContainerNumber && (
                  <span className="text-[8px] font-black tracking-widest text-blue-600 uppercase bg-blue-500/10 px-1.5 py-0.5 rounded">
                    {language === "ENG" ? "Prefilled" : "Terisi"}
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  id="form-container-number"
                  type="text"
                  placeholder="e.g. FUKU-610012-2"
                  value={containerNumber}
                  disabled={!isAuthorized}
                  onChange={(e) => {
                    setContainerNumber(formatContainerNumber(e.target.value));
                  }}
                  className="w-full bg-blue-50/30 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none transition-all"
                  required
                />
                {containerNumber && (
                  <span className="absolute right-3 top-3 text-xs text-emerald-600 font-semibold flex items-center space-x-1 animate-fade-in">
                    <CheckCircle className="h-4 w-4" />
                  </span>
                )}
              </div>
            </div>

            <div className="flex-[1_1_200px] min-w-[150px]">
              <label className="block text-[10px] font-mono uppercase tracking-wider font-extrabold text-slate-500 mb-1.5">
                {t.inspectorNameLabel} *
              </label>
              <input
                id="form-reporter-name"
                type="text"
                value={reporterName}
                disabled={true}
                placeholder="Technician Profile"
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold outline-none bg-slate-100 text-slate-500 cursor-not-allowed"
                required
              />
            </div>
          </div>

          {/* Destination Hub Selector (Surabaya or Jakarta) */}
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-wider font-extrabold text-slate-500 mb-1.5">
              {language === "ENG" ? "Send Destination Hub *" : "Kirim Tujuan Hub *"}
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setDestinationLocation(LocationTeam.SURABAYA)}
                disabled={!isAuthorized}
                className={`py-2.5 px-3 rounded-xl border text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                  destinationLocation === LocationTeam.SURABAYA
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                SURABAYA
              </button>
              <button
                type="button"
                onClick={() => setDestinationLocation(LocationTeam.JAKARTA)}
                disabled={!isAuthorized}
                className={`py-2.5 px-3 rounded-xl border text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                  destinationLocation === LocationTeam.JAKARTA
                    ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                JAKARTA
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase tracking-wider font-extrabold text-slate-500 mb-1.5">
              {t.descriptionLabel} *
            </label>
            <textarea
              id="form-description"
              placeholder={t.descriptionPlaceholder}
              rows={3}
              value={description}
              disabled={!isAuthorized}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs h-24 resize-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none transition-all"
              required
            />
          </div>

          {submitError && (
            <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-xs font-medium flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          <button
            id="btn-submit-request"
            type="submit"
            disabled={isSubmitting || !isAuthorized}
            className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-xs shadow-md shadow-blue-500/10 transition-all uppercase tracking-widest flex items-center justify-center space-x-2 cursor-pointer text-center"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{t.publishingBtn}</span>
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                <span>{language === "ENG" ? `Send to ${destinationLocation}` : `Kirim ke ${destinationLocation}`}</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Sidebar Summary Bubbles Column */}
      <div className="flex-[1_1_300px] min-w-[280px] space-y-4 max-w-full">
        
        {/* SECTION A: IN PROGRESS & WAITING SUMMARY BUBBLE (Clickable to In-Progress Tab) */}
        <div 
          onClick={() => {
            if (onNavigateInProgress) onNavigateInProgress();
          }}
          className="bg-white p-5 rounded-2xl border border-slate-200/60 hover:border-blue-400 shadow-sm flex items-center justify-between cursor-pointer transition-all group hover:-translate-y-0.5"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl group-hover:scale-105 transition-transform">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 group-hover:text-blue-600 transition-colors">
                {language === "ENG" ? "In Progress & Waiting" : "Sedang Diproses & Antre"}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {language === "ENG" ? "Click to view active requests list" : "Klik untuk melihat daftar permintaan aktif"}
              </p>
            </div>
          </div>
          <span className="bg-amber-100 text-amber-800 text-xs px-3 py-1 rounded-full font-bold font-mono shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-colors">
            {activeRequests.length}
          </span>
        </div>

        {/* SECTION B: COMPLETED & ARCHIVED SUMMARY CARD (Clickable to History Page) */}
        <div 
          onClick={() => {
            if (onNavigateHistory) onNavigateHistory();
          }}
          className="bg-white p-5 rounded-2xl border border-slate-200/60 hover:border-blue-400 shadow-sm flex items-center justify-between cursor-pointer transition-all group hover:-translate-y-0.5"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-105 transition-transform">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 group-hover:text-blue-600 transition-colors">
                {language === "ENG" ? "Completed & Archived Logs" : "Arsip Selesai & Dibatalkan"}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {language === "ENG" ? "Click to view full history ledger" : "Klik untuk melihat buku besar riwayat"}
              </p>
            </div>
          </div>
          <span className="bg-emerald-100 text-emerald-800 text-xs px-3 py-1 rounded-full font-bold font-mono shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-colors">
            {completedRequests.length}
          </span>
        </div>

      </div>
    </div>
  );
}
