import React, { useState, useRef, useEffect } from "react";
import { doc, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase"; 
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
  Clock,
  Plus
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
    photoUrls?: string[];
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
  onNavigateInProgress?: () => void;
}

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

  const [containerNumber, setContainerNumber] = useState("");
  const [priority, setPriority] = useState<PriorityLevel>(PriorityLevel.MEDIUM);
  const [category, setCategory] = useState<IssueCategory>(IssueCategory.STRUCTURAL);
  const [description, setDescription] = useState("");
  const [reporterName, setReporterName] = useState(() => loggedInUser?.name || "");
  const [destinationLocation, setDestinationLocation] = useState<LocationTeam>(LocationTeam.SURABAYA);
  
  // Up to 3 Photos Array State
  const [photos, setPhotos] = useState<string[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState<string>("");
  const [editPriority, setEditPriority] = useState<PriorityLevel>(PriorityLevel.MEDIUM);
  const [editCategory, setEditCategory] = useState<IssueCategory>(IssueCategory.STRUCTURAL);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (prefilledContainerNumber) {
      setContainerNumber(formatContainerNumber(prefilledContainerNumber));
    }
  }, [prefilledContainerNumber]);

  useEffect(() => {
    if (prefilledPhoto) {
      setPhotos([prefilledPhoto]);
    }
  }, [prefilledPhoto]);

  const isAdmin = loggedInUser?.email === "mpigome44@gmail.com";
  const isAuthorized = loggedInUser?.location === LocationTeam.TIMIKA || isAdmin;

  useEffect(() => {
    if (loggedInUser && loggedInUser.location === LocationTeam.TIMIKA) {
      setReporterName(loggedInUser.name);
    }
  }, [loggedInUser]);

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isLogLocked = (status: RequestStatus) => {
    return status === RequestStatus.IN_PROGRESS || status === RequestStatus.DONE || status === RequestStatus.CANCELLED;
  };

  const activeRequests = requests.filter(
    (req) => req.status !== RequestStatus.DONE && req.status !== RequestStatus.CANCELLED
  );
  const completedRequests = requests.filter(
    (req) => req.status === RequestStatus.DONE || req.status === RequestStatus.CANCELLED
  );

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm(language === "ENG" ? "Are you sure you want to delete this service request?" : "Apakah Anda yakin ingin menghapus permintaan layanan ini?")) {
      try {
        await deleteDoc(doc(db, "requests", id));
      } catch (error: any) {
        alert(error.message || "Failed to delete request.");
      }
    }
  };

  const startEdit = (e: React.MouseEvent, req: ServiceRequest) => {
    e.stopPropagation();
    setEditingId(req.id);
    setEditDescription(req.description || "");
    setEditPriority(req.priority || PriorityLevel.MEDIUM);
    setEditCategory(req.category || IssueCategory.STRUCTURAL);
  };

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
      alert(error.message || "Failed to update request.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setPhotos((prev) => {
          if (prev.length >= 3) return prev;
          return [...prev, base64];
        });
      };
      reader.readAsDataURL(file);
    });
    if (e.target) e.target.value = "";
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!containerNumber.trim()) {
      setSubmitError("Container Number is required.");
      return;
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
          photoUrl: photos[0] || null,
          photoUrls: photos,
          reporterName,
          destinationLocation, 
        });
        setContainerNumber("");
        setDescription("");
        setPhotos([]);
        if (onClearPrefilled) onClearPrefilled();
        onSubmitSuccess();
      }
    } catch (err: any) {
      setSubmitError(err.message || "Network error.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderRequestCard = (req: ServiceRequest) => {
    const locked = isLogLocked(req.status);

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

    return (
      <div
        key={req.id}
        onClick={() => {
          if (editingId !== req.id) onSelectRequest(req);
        }}
        className={`bg-white p-4 rounded-xl border transition-all cursor-pointer shadow-sm relative group space-y-2 hover:-translate-y-0.5 break-inside-avoid ${
          locked ? "border-slate-200/50 bg-slate-50/40" : "border-slate-200/70 hover:border-blue-400"
        }`}
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
                  {req.priority}
                </span>
                <span className="text-slate-400 text-[10px] font-mono uppercase truncate max-w-[120px]">{req.category}</span>
              </div>
              <div className="text-slate-400 flex items-center space-x-1 font-mono text-[10px]">
                <User className="h-3 w-3 text-slate-300" />
                <span>{req.reporterName}</span>
              </div>
            </div>

            {isAuthorized && (
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100/80 mt-1" onClick={(e) => e.stopPropagation()}>
                {!locked ? (
                  <>
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
                  </>
                ) : (
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1 italic">
                      <Lock className="h-3 w-3" /> {language === "ENG" ? "Locked" : "Terkunci"}
                    </span>
                    {isAdmin && (
                      <button 
                        type="button"
                        onClick={(e) => handleDelete(e, req.id)}
                        className="text-[11px] text-rose-500 hover:text-rose-700 font-bold flex items-center gap-1 py-0.5 px-1 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" /> Admin Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 animate-fade-in w-full items-start">

      {/* Form & Photo Attachment Column */}
      <div className="flex-1 bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm space-y-5 relative w-full">
        {!isAuthorized && (
          <div className="absolute inset-0 bg-slate-950/10 backdrop-blur-[2px] rounded-2xl z-10 flex flex-col items-center justify-center p-6 text-center">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-sm shadow-2xl text-white space-y-4">
              <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle className="h-6 w-6 text-amber-500 animate-pulse" />
              </div>
              <h3 className="text-sm font-extrabold tracking-wider uppercase">{t.unauthorizedTitle}</h3>
              <p className="text-xs text-slate-300">{t.restrictedTimika}</p>
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
          <p className="text-xs text-slate-500">{t.formSubtitle}</p>
        </div>

        {/* Multi-Photo Attachment Section (Up to 3 Photos) */}
        <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/40 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-slate-500 flex items-center space-x-1.5 uppercase tracking-wide">
              <ImageIcon className="h-4 w-4 text-slate-600" />
              <span>{language === "ENG" ? "Damage Photos (Max 3)" : "Foto Kerusakan (Maks 3)"}</span>
            </span>
            <span className="text-[10px] font-mono font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded">
              {photos.length} / 3 Uploaded
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {photos.map((pUrl, idx) => (
              <div key={idx} className="relative rounded-xl overflow-hidden border border-slate-200 h-28 bg-slate-900 group">
                <img src={pUrl} alt={`Uploaded ${idx + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(idx)}
                  className="absolute top-1 right-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full p-1 text-xs w-6 h-6 flex items-center justify-center shadow cursor-pointer"
                >
                  &times;
                </button>
              </div>
            ))}

            {photos.length < 3 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={!isAuthorized}
                className="flex flex-col items-center justify-center border border-dashed border-slate-300 hover:border-blue-500 rounded-xl bg-white h-28 text-slate-400 hover:text-blue-600 transition cursor-pointer"
              >
                <Plus className="h-6 w-6 mb-1" />
                <span className="text-[10px] font-bold uppercase font-mono">Add Photo</span>
              </button>
            )}
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            multiple
            className="hidden"
            disabled={!isAuthorized}
          />
        </div>

        {/* Create Request Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-[1_1_200px] min-w-[150px]">
              <label className="block text-[10px] font-mono uppercase tracking-wider font-extrabold text-slate-500 mb-1.5">
                <span>{t.containerIdLabel} *</span>
              </label>
              <input
                id="form-container-number"
                type="text"
                placeholder="e.g. FUKU-610012-2"
                value={containerNumber}
                disabled={!isAuthorized}
                onChange={(e) => setContainerNumber(formatContainerNumber(e.target.value))}
                className="w-full bg-blue-50/30 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold focus:border-blue-500 outline-none"
                required
              />
            </div>

            <div className="flex-[1_1_200px] min-w-[150px]">
              <label className="block text-[10px] font-mono uppercase tracking-wider font-extrabold text-slate-500 mb-1.5">
                {t.inspectorNameLabel} *
              </label>
              <input
                type="text"
                value={reporterName}
                disabled={true}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold bg-slate-100 text-slate-500 cursor-not-allowed"
                required
              />
            </div>
          </div>

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
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs h-24 resize-none focus:border-blue-500 outline-none"
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
            type="submit"
            disabled={isSubmitting || !isAuthorized}
            className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-xs shadow-md transition uppercase tracking-widest flex items-center justify-center space-x-2 cursor-pointer"
          >
            <Send className="h-3.5 w-3.5" />
            <span>{language === "ENG" ? `Send to ${destinationLocation}` : `Kirim ke ${destinationLocation}`}</span>
          </button>
        </form>
      </div>

      {/* Sidebar Stretched Rectangular Summary Bubbles Column */}
      <div className="w-full lg:w-[420px] space-y-4 shrink-0">
        <div 
          onClick={() => { if (onNavigateInProgress) onNavigateInProgress(); }}
          className="bg-white p-5 rounded-2xl border border-slate-200/60 hover:border-blue-400 shadow-sm flex items-center justify-between cursor-pointer transition-all group hover:-translate-y-0.5 w-full"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl group-hover:scale-105 transition-transform">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 group-hover:text-blue-600 transition-colors">
                {language === "ENG" ? "In Progress & Waiting" : "Sedang Diproses & Antre"}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Click to view active requests list</p>
            </div>
          </div>
          <span className="bg-amber-100 text-amber-800 text-xs px-3 py-1 rounded-full font-bold font-mono shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-colors">
            {activeRequests.length}
          </span>
        </div>

        <div 
          onClick={() => { if (onNavigateHistory) onNavigateHistory(); }}
          className="bg-white p-5 rounded-2xl border border-slate-200/60 hover:border-blue-400 shadow-sm flex items-center justify-between cursor-pointer transition-all group hover:-translate-y-0.5 w-full"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-105 transition-transform">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 group-hover:text-blue-600 transition-colors">
                {language === "ENG" ? "Completed & Archived Logs" : "Arsip Selesai & Dibatalkan"}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Click to view full history ledger</p>
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
