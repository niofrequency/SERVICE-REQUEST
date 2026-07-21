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
  Save
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
  }) => Promise<void>;
  requests: ServiceRequest[];
  onSelectRequest: (request: ServiceRequest) => void;
  language: "ENG" | "IND";
  loggedInUser: { name: string; location: LocationTeam; email?: string } | null;
  prefilledContainerNumber?: string;
  prefilledPhoto?: string | null;
  onClearPrefilled?: () => void;
}

// Helper to automatically format container number to ISO 6346 with hyphens (e.g. CBHU-265392-1)
const formatContainerNumber = (val: string): string => {
  const clean = val.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (clean.length === 0) return "";
  
  let formatted = "";
  // Part 1: Owner + Product code (first 4 characters)
  const part1 = clean.slice(0, 4);
  formatted += part1;
  
  if (clean.length > 4) {
    // Part 2: Serial number (next 6 characters)
    const part2 = clean.slice(4, 10);
    formatted += `-${part2}`;
  }
  
  if (clean.length > 10) {
    // Part 3: Check digit (1 character)
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
}: TimikaFormProps) {
  const t = locales[language];

  // Form State
  const [containerNumber, setContainerNumber] = useState("");
  const [priority, setPriority] = useState<PriorityLevel>(PriorityLevel.MEDIUM);
  const [category, setCategory] = useState<IssueCategory>(IssueCategory.STRUCTURAL);
  const [description, setDescription] = useState("");
  const [reporterName, setReporterName] = useState(() => loggedInUser?.name || "");
  const [photo, setPhoto] = useState<string | null>(null);

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

  // Delete Request Handler
  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm(language === "ENG" ? "Are you sure you want to delete this service request?" : "Apakah Anda yakin ingin menghapus permintaan layanan ini?")) {
      try {
        await deleteDoc(doc(db, "requests", id));
      } catch (error: any) {
        console.error("Error deleting request: ", error);
        alert(error.message || "Failed to delete request. Check security rules.");
      }
    }
  };

  // Start Edit Mode Handler
  const startEdit = (e: React.MouseEvent, req: ServiceRequest) => {
    e.stopPropagation();
    setEditingId(req.id);
    setEditDescription(req.description || "");
    setEditPriority(req.priority || PriorityLevel.MEDIUM);
    setEditCategory(req.category || IssueCategory.STRUCTURAL);
  };

  // Save Edit Handler
  const handleUpdate = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!editDescription.trim()) return;
    
    setIsUpdating(true);
    try {
      const reqRef = doc(db, "requests", id);
      await updateDoc(reqRef, {
        description: editDescription,
        priority: editPriority,
        category: editCategory,
        updatedAt: new Date().toISOString()
      });
      setEditingId(null);
    } catch (error: any) {
      console.error("Error updating request: ", error);
      alert(error.message || "Failed to update request.");
    } finally {
      setIsUpdating(false);
    }
  };

  // Direct manual file upload (No AI OCR Processing)
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
              <span>{t.submitBtn}</span>
            )}
          </button>
        </form>
      </div>

      {/* Timika Sent Tracker Column */}
      <div className="flex-[1_1_300px] min-w-[280px] bg-slate-50 p-5 rounded-2xl border border-slate-200/50 shadow-sm flex flex-col h-[calc(100vh-220px)] min-h-[500px] max-w-full">
        <div className="mb-4">
          <div className="flex items-center space-x-2 text-slate-800 mb-1">
            <div className="p-1 bg-slate-200 text-slate-700 rounded-md">
              <ClipboardList className="h-4 w-4" />
            </div>
            <h3 className="text-xs font-extrabold uppercase tracking-wider">{t.intakeLogTitle}</h3>
          </div>
          <p className="text-xs text-slate-400">
            {t.intakeLogSubtitle}
          </p>
        </div>

        {/* Requests List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {requests.length === 0 ? (
            <div className="text-center py-16 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
              {t.noRequestsYet}
            </div>
          ) : (
            requests.map((req) => {
              const priorityColors = {
                [PriorityLevel.LOW]: "bg-slate-100 text-slate-800 border-slate-200",
                [PriorityLevel.MEDIUM]: "bg-blue-50 text-blue-800 border-blue-100/55",
                [PriorityLevel.HIGH]: "bg-amber-50 text-amber-800 border-amber-200/60",
                [PriorityLevel.URGENT]: "bg-rose-50 text-rose-800 border-rose-200/60 animate-pulse",
              };

              const statusColors = {
                [RequestStatus.WAITING]: "bg-purple-50 text-purple-700 border-purple-200/60",
                [RequestStatus.IN_PROGRESS]: "bg-blue-50 text-blue-700 border-blue-200/60",
                [RequestStatus.DONE]: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
                [RequestStatus.CANCELLED]: "bg-rose-50 text-rose-700 border-rose-200/60",
              };

              let displayPrio = req.priority;
              if (req.priority === PriorityLevel.LOW) displayPrio = t.prioLow as PriorityLevel;
              else if (req.priority === PriorityLevel.MEDIUM) displayPrio = t.prioMedium as PriorityLevel;
              else if (req.priority === PriorityLevel.HIGH) displayPrio = t.prioHigh as PriorityLevel;
              else if (req.priority === PriorityLevel.URGENT) displayPrio = t.prioUrgent as PriorityLevel;

              let displayCat = req.category;
              if (req.category === IssueCategory.ELECTRICAL) displayCat = t.catElectrical as IssueCategory;
              else if (req.category === IssueCategory.STRUCTURAL) displayCat = t.catStructural as IssueCategory;
              else if (req.category === IssueCategory.REFRIGERATION_TELEMATICS) displayCat = t.catRefrigeration as IssueCategory;
              else if (req.category === IssueCategory.MECHANICAL) displayCat = t.catMechanical as IssueCategory;

              return (
                <div
                  key={req.id}
                  onClick={() => {
                    if (editingId !== req.id) onSelectRequest(req);
                  }}
                  className="bg-white p-4 rounded-xl border border-slate-200/70 hover:border-blue-400 transition-all cursor-pointer shadow-sm relative group space-y-2 hover:-translate-y-0.5 break-inside-avoid"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-slate-950 group-hover:text-blue-600 transition-colors">
                      {req.id} • {req.containerNumber}
                    </span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border uppercase font-bold tracking-wide ${statusColors[req.status]}`}>
                      {req.status}
                    </span>
                  </div>

                  {editingId === req.id ? (
                    <div className="space-y-3 pt-2" onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-wrap gap-2">
                        <select 
                          value={editPriority} 
                          onChange={(e) => setEditPriority(e.target.value as PriorityLevel)}
                          className="flex-[1_1_100px] min-w-0 text-xs font-semibold px-2 py-1.5 rounded border border-slate-300 outline-none"
                        >
                          <option value={PriorityLevel.LOW}>LOW</option>
                          <option value={PriorityLevel.MEDIUM}>MEDIUM</option>
                          <option value={PriorityLevel.HIGH}>HIGH</option>
                          <option value={PriorityLevel.URGENT}>URGENT</option>
                        </select>

                        <select 
                          value={editCategory} 
                          onChange={(e) => setEditCategory(e.target.value as IssueCategory)}
                          className="flex-[1_1_100px] min-w-0 text-xs font-semibold px-2 py-1.5 rounded border border-slate-300 outline-none"
                        >
                          <option value={IssueCategory.ELECTRICAL}>Electrical</option>
                          <option value={IssueCategory.STRUCTURAL}>Structural</option>
                          <option value={IssueCategory.REFRIGERATION_TELEMATICS}>Refrig/Telematics</option>
                          <option value={IssueCategory.MECHANICAL}>Mechanical</option>
                        </select>
                      </div>
                      
                      <textarea 
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-blue-500 resize-none font-sans"
                        rows={3}
                      />
                      
                      <div className="flex gap-2 justify-end pt-1">
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingId(null);
                          }}
                          className="px-3 py-1.5 text-xs text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 font-medium flex items-center gap-1"
                        >
                          <X className="h-3 w-3" /> Cancel
                        </button>
                        <button 
                          type="button"
                          disabled={isUpdating}
                          onClick={(e) => handleUpdate(e, req.id)}
                          className="px-3 py-1.5 text-xs text-white bg-blue-600 rounded-lg hover:bg-blue-700 font-semibold flex items-center gap-1 shadow-sm disabled:opacity-50"
                        >
                          <Save className="h-3 w-3" /> {isUpdating ? "Saving..." : "Save"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed font-sans">
                        {req.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 justify-between border-t border-slate-100 pt-2 text-[10px]">
                        <div className="flex flex-wrap gap-2 items-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${priorityColors[req.priority]}`}>
                            {displayPrio}
                          </span>
                          <span className="text-slate-400 text-[10px] font-mono uppercase truncate max-w-[120px]">{displayCat}</span>
                        </div>
                        <div className="text-slate-400 flex items-center space-x-1 font-mono text-[10px]">
                          <User className="h-3 w-3 text-slate-300" />
                          <span>{req.reporterName}</span>
                        </div>
                      </div>

                      {isAuthorized && (
                        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100/80 mt-1" onClick={(e) => e.stopPropagation()}>
                          <button 
                            type="button"
                            onClick={(e) => startEdit(e, req)}
                            className="text-[11px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 py-0.5 px-1 rounded hover:bg-blue-50 transition-colors"
                          >
                            <Edit2 className="h-3 w-3" /> Edit
                          </button>
                          <button 
                            type="button"
                            onClick={(e) => handleDelete(e, req.id)}
                            className="text-[11px] text-rose-500 hover:text-rose-700 font-bold flex items-center gap-1 py-0.5 px-1 rounded hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="h-3 w-3" /> Delete
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  {req.status === RequestStatus.DONE && (
                    <div className="mt-2 bg-emerald-50/50 border border-emerald-100/60 rounded-lg p-2 flex items-start gap-2 animate-fade-in text-[11px] leading-relaxed">
                      <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-extrabold text-emerald-950 block text-[9px] uppercase tracking-wider">{t.repairCompletedBanner}</span>
                        <span className="text-emerald-800 line-clamp-1">{req.resolutionNotes}</span>
                      </div>
                    </div>
                  )}

                  {req.status === RequestStatus.CANCELLED && (
                    <div className="mt-2 bg-rose-50/50 border border-rose-100/60 rounded-lg p-2 flex items-start gap-2 animate-fade-in text-[11px] leading-relaxed">
                      <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-extrabold text-rose-950 block text-[9px] uppercase tracking-wider">{t.requestCancelledBanner}</span>
                        <span className="text-rose-800 line-clamp-1">{req.cancellationReason}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
