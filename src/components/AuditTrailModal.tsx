// src/components/AuditTrailModal.tsx
import React, { useState, useEffect } from "react";
import { ServiceRequest, RequestStatus, LocationTeam, PriorityLevel, IssueCategory } from "../types.js";
import { 
  Clock, 
  MapPin, 
  User, 
  ArrowRight, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  Activity,
  Edit3,
  Trash2,
  X
} from "lucide-react";
import { locales } from "../locales.js";

interface AuditTrailModalProps {
  request: ServiceRequest | null;
  onClose: () => void;
  language: "ENG" | "IND";
  onPrint?: (req: ServiceRequest) => void;
  loggedInUser?: { name: string; location: LocationTeam; email?: string } | null;
  onDeleteRequest?: (id: string) => Promise<void>;
  onUpdateRequest?: (id: string, updatedFields: Partial<ServiceRequest>) => Promise<void>;
  isAdmin?: boolean;
}

export default function AuditTrailModal({
  request,
  onClose,
  language,
  onPrint,
  loggedInUser,
  onDeleteRequest,
  onUpdateRequest,
  isAdmin = false,
}: AuditTrailModalProps) {
  if (!request) return null;

  const t = locales[language];

  // Authorization Check - leveraging the passed prop and local location
  const isTimikaOrAdmin = loggedInUser?.location === LocationTeam.TIMIKA || isAdmin;

  // Admin States
  const [isEditing, setIsEditing] = useState(false);
  const [editedContainerNumber, setEditedContainerNumber] = useState("");
  const [editedPriority, setEditedPriority] = useState<PriorityLevel>(PriorityLevel.MEDIUM);
  const [editedCategory, setEditedCategory] = useState<IssueCategory>(IssueCategory.STRUCTURAL);
  const [editedDescription, setEditedDescription] = useState("");
  const [editedStatus, setEditedStatus] = useState<RequestStatus>(RequestStatus.WAITING);
  const [editedResolutionNotes, setEditedResolutionNotes] = useState("");
  const [editedCancellationReason, setEditedCancellationReason] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Lightbox Zoom Preview State
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  // Sync edits state with selected request
  useEffect(() => {
    if (request) {
      setEditedContainerNumber(request.containerNumber || "");
      setEditedPriority(request.priority || PriorityLevel.MEDIUM);
      setEditedCategory(request.category || IssueCategory.STRUCTURAL);
      setEditedDescription(request.description || "");
      setEditedStatus(request.status || RequestStatus.WAITING);
      setEditedResolutionNotes(request.resolutionNotes || "");
      setEditedCancellationReason(request.cancellationReason || "");
      setIsEditing(false);
      setShowDeleteConfirm(false);
      setErrorMessage(null);
    }
  }, [request]);

  const statusColors = {
    [RequestStatus.WAITING]: "bg-purple-100 text-purple-800 border-purple-200",
    [RequestStatus.IN_PROGRESS]: "bg-blue-100 text-blue-800 border-blue-200",
    [RequestStatus.DONE]: "bg-emerald-100 text-emerald-800 border-emerald-200",
    [RequestStatus.CANCELLED]: "bg-rose-100 text-rose-800 border-rose-200",
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSaving(true);

    if (!editedContainerNumber.trim()) {
      setErrorMessage("Container Number is required.");
      setIsSaving(false);
      return;
    }
    if (!editedDescription.trim()) {
      setErrorMessage("Description is required.");
      setIsSaving(false);
      return;
    }

    try {
      if (onUpdateRequest) {
        const payload: Partial<ServiceRequest> = {
          containerNumber: editedContainerNumber.toUpperCase(),
          priority: editedPriority,
          category: editedCategory,
          description: editedDescription,
          status: editedStatus,
        };

        if (editedStatus === RequestStatus.DONE) {
          payload.resolutionNotes = editedResolutionNotes;
        } else if (editedStatus === RequestStatus.CANCELLED) {
          payload.cancellationReason = editedCancellationReason;
        }

        await onUpdateRequest(request.id, payload);
        setIsEditing(false);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update service request.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    setErrorMessage(null);
    try {
      if (onDeleteRequest) {
        await onDeleteRequest(request.id);
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to delete service request.");
    }
  };

  // Gather photos safely supporting up to 3 images per request
  const timikaPhotos = request.photoUrls && request.photoUrls.length > 0 
    ? request.photoUrls 
    : (request.photoUrl ? [request.photoUrl] : []);

  const repairPhotos = request.repairPhotoUrls && request.repairPhotoUrls.length > 0 
    ? request.repairPhotoUrls 
    : (request.repairPhotoUrl ? [request.repairPhotoUrl] : []);

  return (
    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-[2px] flex items-center justify-center p-3 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-scale-up">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-slate-900 text-blue-500 rounded-lg">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-slate-900 font-mono">
                  {request.id}
                </h3>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border uppercase font-bold ${statusColors[request.status]}`}>
                  {request.status}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wide">
                PT. PANJASA-INTRADIN • CONTAINER {request.containerNumber} Ledger
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold text-xl p-1 cursor-pointer"
          >
            &times;
          </button>
        </div>

        {/* Content Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-xs font-semibold flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {isEditing ? (
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 space-y-3">
                <div className="flex items-center space-x-1.5 text-indigo-950 font-bold text-xs uppercase font-mono border-b border-indigo-100 pb-2">
                  <Edit3 className="h-4 w-4 text-indigo-600" />
                  <span>Interactive Editor</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Container Number */}
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-wider font-extrabold text-slate-500 mb-1">
                      Container Number
                    </label>
                    <input
                      type="text"
                      value={editedContainerNumber}
                      onChange={(e) => setEditedContainerNumber(e.target.value.toUpperCase())}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-bold uppercase focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all"
                      required
                    />
                  </div>

                  {/* Status selector */}
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-wider font-extrabold text-slate-500 mb-1">
                      Status
                    </label>
                    <select
                      value={editedStatus}
                      onChange={(e) => setEditedStatus(e.target.value as RequestStatus)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-sans font-bold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all cursor-pointer bg-white"
                    >
                      <option value={RequestStatus.WAITING}>Waiting / Antrian</option>
                      <option value={RequestStatus.IN_PROGRESS}>In Progress / Sedang Dikerjakan</option>
                      <option value={RequestStatus.DONE}>Done (Completed) / Selesai</option>
                      <option value={RequestStatus.CANCELLED}>Cancelled / Dibatalkan</option>
                    </select>
                  </div>
                </div>

                {/* Category & Priority Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-wider font-extrabold text-slate-500 mb-1">
                      Category
                    </label>
                    <select
                      value={editedCategory}
                      onChange={(e) => setEditedCategory(e.target.value as IssueCategory)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-sans font-bold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all cursor-pointer bg-white"
                    >
                      <option value={IssueCategory.ELECTRICAL}>Electrical</option>
                      <option value={IssueCategory.STRUCTURAL}>Structural</option>
                      <option value={IssueCategory.REFRIGERATION_TELEMATICS}>Reefer / Telematics</option>
                      <option value={IssueCategory.MECHANICAL}>Mechanical</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-wider font-extrabold text-slate-500 mb-1">
                      Priority
                    </label>
                    <select
                      value={editedPriority}
                      onChange={(e) => setEditedPriority(e.target.value as PriorityLevel)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-sans font-bold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all cursor-pointer bg-white"
                    >
                      <option value={PriorityLevel.LOW}>Low</option>
                      <option value={PriorityLevel.MEDIUM}>Medium</option>
                      <option value={PriorityLevel.HIGH}>High</option>
                      <option value={PriorityLevel.URGENT}>Urgent</option>
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider font-extrabold text-slate-500 mb-1">
                    Damage Description
                  </label>
                  <textarea
                    rows={3}
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-xs h-24 resize-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all"
                    required
                  />
                </div>

                {/* Conditional Resolution Notes */}
                {editedStatus === RequestStatus.DONE && (
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-wider font-extrabold text-slate-500 mb-1">
                      Resolution Notes
                    </label>
                    <textarea
                      rows={3}
                      value={editedResolutionNotes}
                      onChange={(e) => setEditedResolutionNotes(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-xs h-24 resize-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-all"
                      placeholder="Add repairs details, tools used, etc..."
                      required
                    />
                  </div>
                )}

                {/* Conditional Cancellation Reason */}
                {editedStatus === RequestStatus.CANCELLED && (
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-wider font-extrabold text-slate-500 mb-1">
                      Cancellation Reason
                    </label>
                    <textarea
                      rows={3}
                      value={editedCancellationReason}
                      onChange={(e) => setEditedCancellationReason(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-3.5 py-2.5 text-xs h-24 resize-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20 outline-none transition-all"
                      placeholder="Specify reason for cancelling..."
                      required
                    />
                  </div>
                )}
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="w-1/2 border border-slate-200 hover:bg-slate-50 text-slate-500 py-2.5 rounded-xl text-xs uppercase font-extrabold tracking-wider cursor-pointer text-center"
                >
                  Cancel Edit
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-1/2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white py-2.5 rounded-xl text-xs uppercase font-extrabold tracking-wider cursor-pointer flex items-center justify-center space-x-2"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* Photos Grid Support (Up to 3 Photos Side-by-Side Clickable to Zoom) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Before Photos (Timika Intake) */}
                <div className="border border-slate-200/60 rounded-2xl p-3.5 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wide">
                    <span className="font-bold text-slate-600 flex items-center space-x-1">
                      <MapPin className="h-3.5 w-3.5 text-blue-600" />
                      <span>{t.timikaProofTitle}</span>
                    </span>
                    <span className="text-slate-400 font-extrabold">BEFORE ({timikaPhotos.length})</span>
                  </div>
                  
                  {timikaPhotos.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {timikaPhotos.map((url, idx) => (
                        <div 
                          key={idx} 
                          onClick={() => setLightboxImg(url)}
                          className="relative rounded-xl overflow-hidden border border-slate-200 h-28 bg-slate-900 cursor-pointer group hover:border-blue-500 transition shadow-sm"
                        >
                          <img src={url} alt={`Before proof ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-32 border border-dashed border-slate-200 bg-slate-100 rounded-xl flex items-center justify-center text-center p-3 text-slate-400 text-[10px] font-mono font-bold uppercase">
                      No Image Available
                    </div>
                  )}

                  <div className="text-[11px] text-slate-600 leading-relaxed bg-white border border-slate-100 p-2.5 rounded-xl">
                    <span className="font-extrabold text-slate-800 text-[10px] uppercase block mb-0.5">{t.damageDetailsLabel}:</span>
                    {request.description}
                  </div>
                </div>

                {/* After Photos (Surabaya / Jakarta Workshop Resolution) */}
                <div className="border border-slate-200/60 rounded-2xl p-3.5 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wide">
                    <span className="font-bold text-slate-600 flex items-center space-x-1">
                      <MapPin className="h-3.5 w-3.5 text-blue-600" />
                      <span>{t.surabayaProofTitle}</span>
                    </span>
                    <span className="text-slate-400 font-extrabold">AFTER ({repairPhotos.length})</span>
                  </div>

                  {request.status === RequestStatus.DONE ? (
                    <>
                      {repairPhotos.length > 0 ? (
                        <div className="grid grid-cols-3 gap-2">
                          {repairPhotos.map((url, idx) => (
                            <div 
                              key={idx} 
                              onClick={() => setLightboxImg(url)}
                              className="relative rounded-xl overflow-hidden border border-slate-200 h-28 bg-slate-900 cursor-pointer group hover:border-emerald-500 transition shadow-sm"
                            >
                              <img src={url} alt={`After proof ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="h-32 border border-dashed border-slate-200 bg-slate-100 rounded-xl flex items-center justify-center text-center p-3 text-slate-400 text-[10px] font-mono font-bold uppercase">
                          No Repair Photos Uploaded
                        </div>
                      )}
                      
                      <div className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-100/65 rounded-xl p-2.5 leading-relaxed">
                        <span className="font-extrabold text-emerald-950 flex items-center space-x-1 mb-0.5 text-[10px] uppercase">
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                          <span>{t.resolutionCertifiedLabel}:</span>
                        </span>
                        {request.resolutionNotes}
                      </div>
                    </>
                  ) : request.status === RequestStatus.CANCELLED ? (
                    <div className="h-full min-h-[180px] border border-dashed border-rose-200 bg-rose-50/30 rounded-2xl flex flex-col items-center justify-center p-4 text-center space-y-2">
                      <AlertTriangle className="h-7 w-7 text-rose-500 animate-pulse" />
                      <span className="text-xs font-extrabold text-rose-950 uppercase tracking-wide">{t.requestCancelledBanner}</span>
                      <p className="text-[10px] text-rose-800 max-w-sm">
                        {t.voidReasonDetailLabel}: {request.cancellationReason}
                      </p>
                    </div>
                  ) : (
                    <div className="h-full min-h-[180px] border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-4 text-center space-y-2 bg-white shadow-sm">
                      <Clock className="h-7 w-7 text-slate-400 animate-pulse" />
                      <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wide">{t.repairPendingLabel}</span>
                      <p className="text-[10px] text-slate-400 max-w-[190px] leading-relaxed">
                        {t.repairPendingDesc}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Immutable Audit Ledger Timeline */}
              <div className="space-y-3 bg-slate-50/40 border border-slate-200/50 p-4 rounded-2xl">
                <h4 className="text-[10px] font-mono font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5 border-b border-slate-100 pb-2">
                  <Clock className="h-3.5 w-3.5 text-slate-500" />
                  <span>{t.immutableAuditLedgerTitle}</span>
                </h4>

                <div className="relative border-l-2 border-slate-100 pl-4 space-y-4 ml-2 font-mono">
                  {request.auditLogs.map((log) => {
                    const isTimika = log.location === LocationTeam.TIMIKA;
                    
                    return (
                      <div key={log.id} className="relative group">
                        <span className={`absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full border-2 bg-white transition-colors ${
                          isTimika ? "border-amber-500" : "border-blue-600"
                        }`} />

                        <div className="space-y-1 text-xs">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 justify-between">
                            <div className="flex items-center space-x-1.5">
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold text-white uppercase ${
                                isTimika ? "bg-amber-500" : "bg-blue-600"
                              }`}>
                                {log.location}
                              </span>
                              <span className="font-bold text-slate-800 flex items-center space-x-1">
                                <User className="h-3 w-3 text-slate-400" />
                                <span>{log.operator}</span>
                              </span>
                            </div>
                            <span className="text-slate-400 text-[9px] font-mono">
                              {new Date(log.timestamp).toLocaleString()}
                            </span>
                          </div>

                          <div className="flex items-center space-x-1.5 text-slate-500 text-[9px] bg-slate-100/60 p-1 px-1.5 rounded-md border border-slate-100 w-fit">
                            <span className="font-semibold text-slate-700">{log.fromStatus}</span>
                            <ArrowRight className="h-3 w-3 text-slate-400" />
                            <span className="font-bold text-slate-800">{log.toStatus}</span>
                          </div>

                          {log.notes && (
                            <p className="text-slate-600 text-xs font-sans mt-1 bg-white p-2.5 rounded-xl border border-slate-100/50 italic">
                              "{log.notes}"
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col gap-3">
          
          {isTimikaOrAdmin && !isEditing && (
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                Admin Console:
              </span>
              <div className="flex items-center space-x-2">
                {showDeleteConfirm ? (
                  <div className="flex items-center space-x-1.5 bg-rose-50 border border-rose-100 p-1.5 rounded-xl">
                    <span className="text-[10px] text-rose-700 font-bold uppercase px-1">Are you sure?</span>
                    <button
                      type="button"
                      onClick={handleConfirmDelete}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-mono uppercase font-extrabold cursor-pointer transition-all"
                    >
                      Yes, Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[10px] font-mono uppercase font-bold cursor-pointer"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase cursor-pointer flex items-center space-x-1 shadow-sm"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>Edit Request</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="px-3.5 py-2 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 rounded-xl text-xs font-bold uppercase cursor-pointer flex items-center space-x-1 border border-rose-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Delete</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-between items-center w-full">
            {onPrint && !isEditing && (
              <button
                onClick={() => onPrint(request)}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold uppercase tracking-tight flex items-center space-x-1.5 cursor-pointer transition-colors shadow-sm"
              >
                <FileText className="h-3.5 w-3.5" />
                <span>{language === "ENG" ? "Print (PDF)" : "Cetak (PDF)"}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold cursor-pointer ml-auto shadow-sm"
            >
              {t.closeBtn}
            </button>
          </div>
        </div>

      </div>

      {/* Lightbox Full Image Zoom Popup */}
      {lightboxImg && (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in" onClick={() => setLightboxImg(null)}>
          <div className="relative max-w-4xl max-h-[90vh] w-full flex items-center justify-center">
            <button onClick={() => setLightboxImg(null)} className="absolute -top-12 right-0 text-white bg-slate-800 hover:bg-rose-600 p-2 rounded-full transition cursor-pointer">
              <X className="h-6 w-6" />
            </button>
            <img src={lightboxImg} alt="Enlarged proof view" className="max-w-full max-h-[85vh] object-contain rounded-2xl border border-slate-700 shadow-2xl" />
          </div>
        </div>
      )}

    </div>
  );
}
