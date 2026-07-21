import React, { useState, useRef, useEffect } from "react";
import { doc, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase"; // Adjust path if needed
import { 
  ServiceRequest, 
  RequestStatus, 
  PriorityLevel, 
  LocationTeam, 
  IssueCategory 
} from "../types.js";
import { 
  Wrench, 
  Play, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  User, 
  Filter, 
  Camera, 
  ClipboardCheck, 
  FileText,
  Edit2,
  Trash2,
  X,
  Save,
  Printer
} from "lucide-react";
import { locales } from "../locales.js";

interface SurabayaDashboardProps {
  requests: ServiceRequest[];
  onStatusUpdate: (
    id: string, 
    updatePayload: {
      status: RequestStatus;
      operator: string;
      location: LocationTeam;
      notes?: string;
      repairPhotoUrl?: string;
      resolutionNotes?: string;
      cancellationReason?: string;
    }
  ) => void;
  onSelectRequest: (request: ServiceRequest) => void;
  onPrint?: (request: ServiceRequest) => void; // Added onPrint prop to connect to App.tsx print engine
  language: "ENG" | "IND";
  loggedInUser: { name: string; location: LocationTeam; email?: string } | null;
}

export default function SurabayaDashboard({
  requests,
  onStatusUpdate,
  onSelectRequest,
  onPrint,
  language,
  loggedInUser,
}: SurabayaDashboardProps) {
  const t = locales[language];

  // Filters & Sorting
  const [filterCategory, setFilterCategory] = useState<string>("All");
  const [filterPriority, setFilterPriority] = useState<string>("All");
  const [operatorName, setOperatorName] = useState("Bambang Santoso");

  // Interaction Modals/States
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<"DONE" | "CANCELLED" | null>(null);
  
  // Dialog Inputs
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [repairPhoto, setRepairPhoto] = useState<string | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const [dialogError, setDialogError] = useState<string | null>(null);

  // Edit Card State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState<string>("");
  const [editPriority, setEditPriority] = useState<PriorityLevel>(PriorityLevel.MEDIUM);
  const [editCategory, setEditCategory] = useState<IssueCategory>(IssueCategory.STRUCTURAL);
  const [isUpdating, setIsUpdating] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auth check: user in TIMIKA cannot edit data for SURABAYA and vice versa (Admin is always authorized)
  const isAdmin = loggedInUser?.email === "mpigome44@gmail.com";
  const isAuthorized = loggedInUser?.location === LocationTeam.SURABAYA || isAdmin;

  // Auto assign logged-in user name to operator
  useEffect(() => {
    if (loggedInUser && (loggedInUser.location === LocationTeam.SURABAYA || loggedInUser.email === "mpigome44@gmail.com")) {
      setOperatorName(loggedInUser.name);
    }
  }, [loggedInUser]);

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

  // Filtered requests
  const filteredRequests = requests.filter((r) => {
    if (filterCategory !== "All" && r.category !== filterCategory) return false;
    if (filterPriority !== "All" && r.priority !== filterPriority) return false;
    return true;
  });

  const getRequestsByStatus = (status: RequestStatus) => {
    return filteredRequests.filter((r) => r.status === status);
  };

  const handleStartRepair = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onStatusUpdate(id, {
      status: RequestStatus.IN_PROGRESS,
      operator: operatorName,
      location: LocationTeam.SURABAYA,
      notes: `${operatorName} accepted the job at Surabaya Workshop. Commenced physical diagnostics and repair preparations.`
    });
  };

  const handleOpenActionDialog = (e: React.MouseEvent, id: string, type: "DONE" | "CANCELLED") => {
    e.stopPropagation();
    setActiveActionId(id);
    setActionType(type);
    setResolutionNotes("");
    setRepairPhoto(null);
    setCancellationReason("");
    setDialogError(null);
  };

  const handleCloseActionDialog = () => {
    setActiveActionId(null);
    setActionType(null);
  };

  // Convert uploaded image to base64
  const handleRepairPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setRepairPhoto(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAction = (e: React.FormEvent) => {
    e.preventDefault();
    setDialogError(null);

    if (!activeActionId) return;

    if (actionType === "DONE") {
      if (!resolutionNotes.trim()) {
        setDialogError(t.resolutionNotesError);
        return;
      }
      onStatusUpdate(activeActionId, {
        status: RequestStatus.DONE,
        operator: operatorName,
        location: LocationTeam.SURABAYA,
        notes: `Repair finalized and verified by ${operatorName}. Output tested and certified stable.`,
        resolutionNotes,
        repairPhotoUrl: repairPhoto || null,
      });
    } else if (actionType === "CANCELLED") {
      if (!cancellationReason.trim()) {
        setDialogError(t.cancellationReasonError);
        return;
      }
      onStatusUpdate(activeActionId, {
        status: RequestStatus.CANCELLED,
        operator: operatorName,
        location: LocationTeam.SURABAYA,
        notes: `Service request cancelled. Reason: ${cancellationReason}`,
        cancellationReason,
      });
    }

    handleCloseActionDialog();
  };

  const columns = [
    {
      title: t.statAwaiting,
      status: RequestStatus.WAITING,
      bg: "bg-purple-50/20 border-slate-200",
      headerColor: "text-purple-800 bg-purple-100 border-purple-200/60",
    },
    {
      title: t.statInProgress,
      status: RequestStatus.IN_PROGRESS,
      bg: "bg-blue-50/20 border-slate-200",
      headerColor: "text-blue-800 bg-blue-100 border-blue-200/60",
    },
    {
      title: t.statCompleted,
      status: RequestStatus.DONE,
      bg: "bg-emerald-50/20 border-slate-200",
      headerColor: "text-emerald-800 bg-emerald-100 border-emerald-200/60",
    },
    {
      title: t.statCancelled,
      status: RequestStatus.CANCELLED,
      bg: "bg-slate-50/20 border-slate-200",
      headerColor: "text-slate-800 bg-slate-100 border-slate-200/60",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in w-full">
      {/* Access Restriction Notice for Surabaya Dashboard */}
      {!isAuthorized && (
        <div className="bg-amber-500/10 border border-amber-500/25 text-amber-900 text-xs px-4 py-3.5 rounded-xl flex items-center space-x-3 shadow-sm">
          <div className="p-1.5 bg-amber-500/20 text-amber-700 rounded-lg shrink-0">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <span className="font-extrabold uppercase tracking-wider block text-[10px] text-amber-950">{t.unauthorizedTitle}</span>
            <span className="text-amber-800 mt-0.5 block">{t.restrictedSurabaya} {t.unauthorizedDesc}</span>
          </div>
        </div>
      )}

      {/* Workshop Controls & Filters */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-4 w-full">
        <div className="flex items-center space-x-3.5">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl shrink-0">
            <Wrench className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
              {t.surabayaTitle}
            </h2>
            <p className="text-xs text-slate-400">
              {t.surabayaSubtitle}
            </p>
          </div>
        </div>

        {/* Filters Grid */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Category Filter */}
          <div className="flex items-center space-x-2 border border-slate-200/80 px-3 py-1.5 rounded-xl text-xs bg-slate-50/60 flex-1 sm:flex-none">
            <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="text-slate-500 font-mono font-bold uppercase text-[9px] shrink-0">Cat:</span>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="font-bold bg-transparent focus:outline-none text-slate-700 font-mono text-xs cursor-pointer w-full"
            >
              <option value="All">{language === "ENG" ? "ALL CATEGORIES" : "SEMUA KATEGORI"}</option>
              <option value={IssueCategory.ELECTRICAL}>{language === "ENG" ? "ELECTRICAL" : "KELISTRIKAN"}</option>
              <option value={IssueCategory.STRUCTURAL}>{language === "ENG" ? "STRUCTURAL" : "STRUKTURAL"}</option>
              <option value={IssueCategory.REFRIGERATION_TELEMATICS}>{language === "ENG" ? "REEFER / TELEMATICS" : "PENDINGIN / TELEMATIKA"}</option>
              <option value={IssueCategory.MECHANICAL}>{language === "ENG" ? "MECHANICAL" : "MEKANIKAL"}</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center space-x-2 border border-slate-200/80 px-3 py-1.5 rounded-xl text-xs bg-slate-50/60 flex-1 sm:flex-none">
            <AlertCircle className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="text-slate-500 font-mono font-bold uppercase text-[9px] shrink-0">Prio:</span>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="font-bold bg-transparent focus:outline-none text-slate-700 font-mono text-xs cursor-pointer w-full"
            >
              <option value="All">{language === "ENG" ? "ALL PRIORITIES" : "SEMUA PRIORITAS"}</option>
              <option value={PriorityLevel.LOW}>{language === "ENG" ? "LOW" : "RENDAH"}</option>
              <option value={PriorityLevel.MEDIUM}>{language === "ENG" ? "MEDIUM" : "SEDANG"}</option>
              <option value={PriorityLevel.HIGH}>{language === "ENG" ? "HIGH" : "TINGGI"}</option>
              <option value={PriorityLevel.URGENT}>{language === "ENG" ? "URGENT" : "DARURAT"}</option>
            </select>
          </div>

          {/* Operator Selector */}
          <div className="flex items-center space-x-2 border border-slate-200/80 px-3 py-1.5 rounded-xl text-xs bg-slate-50/60 flex-1 sm:flex-none">
            <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="text-slate-500 font-mono font-bold uppercase text-[9px] shrink-0">{t.operatorLabel}:</span>
            <select
              value={operatorName}
              disabled={isAuthorized} // Freeze to active user if they are the authorized operator
              onChange={(e) => setOperatorName(e.target.value)}
              className={`font-extrabold bg-transparent focus:outline-none text-slate-700 font-mono text-xs w-full ${isAuthorized ? "cursor-not-allowed opacity-80" : "cursor-pointer"}`}
            >
              {loggedInUser && !["Bambang Santoso", "Hendra Wijaya", "Syarifuddin"].includes(loggedInUser.name) && (
                <option value={loggedInUser.name}>{loggedInUser.name}</option>
              )}
              <option value="Bambang Santoso">Bambang Santoso</option>
              <option value="Hendra Wijaya">Hendra Wijaya</option>
              <option value="Syarifuddin">Syarifuddin</option>
            </select>
          </div>
        </div>
      </div>

      {/* Kanban Board Grid - Now fully fluid and responsive */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-5 items-start w-full">
        {columns.map((col) => {
          const colRequests = getRequestsByStatus(col.status);

          return (
            <div
              key={col.status}
              className={`rounded-2xl border flex flex-col h-[650px] w-full min-w-[250px] bg-slate-50/50 shadow-sm ${col.bg}`}
            >
              {/* Column Header */}
              <div
                className={`p-3 rounded-t-2xl border-b flex items-center justify-between font-mono text-[10px] font-extrabold uppercase tracking-wider ${col.headerColor}`}
              >
                <span>{col.title}</span>
                <span className="bg-white px-2 py-0.5 rounded-full text-[9px] font-extrabold shadow-sm">
                  {colRequests.length}
                </span>
              </div>

              {/* Column Cards Container */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {colRequests.length === 0 ? (
                  <div className="h-32 border border-dashed border-slate-200/80 rounded-xl flex items-center justify-center text-center p-4">
                    <span className="text-[9px] font-mono uppercase text-slate-400 tracking-wider leading-relaxed">
                      {t.noActiveTickets}
                    </span>
                  </div>
                ) : (
                  colRequests.map((req) => {
                    return (
                      <div
                        key={req.id}
                        onClick={() => {
                          if (editingId !== req.id) onSelectRequest(req);
                        }}
                        className="bg-white rounded-xl border border-slate-200/80 hover:border-blue-400 hover:shadow-md transition-all p-4 relative space-y-3 group hover:-translate-y-0.5 cursor-pointer max-w-full"
                      >
                        {/* Header Details */}
                        <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] font-mono">
                          <span className="font-bold text-slate-950 group-hover:text-blue-600 underline decoration-dotted">
                            {req.id}
                          </span>
                          <span className="text-slate-400 text-[9px]">
                            {new Date(req.timestamp).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Container tag */}
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-black text-slate-900 tracking-wide break-words">
                            {req.containerNumber}
                          </span>
                        </div>

                        {/* Damage Photo Preview */}
                        {req.photoUrl && (
                          <div className="relative h-24 rounded-lg overflow-hidden border border-slate-100 bg-slate-50">
                            <img
                              src={req.photoUrl}
                              alt="Container issue proof"
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-slate-950/20 group-hover:bg-transparent transition-colors" />
                            <span className="absolute bottom-1.5 right-1.5 bg-slate-900/80 text-[8px] text-white px-2 py-0.5 rounded font-mono uppercase tracking-wider font-semibold">
                              WIT Proof
                            </span>
                          </div>
                        )}

                        {/* Inline Edit Mode vs Normal View Mode */}
                        {editingId === req.id ? (
                          <div className="space-y-3 pt-1" onClick={(e) => e.stopPropagation()}>
                            <div className="flex flex-wrap gap-2">
                              <select 
                                value={editPriority} 
                                onChange={(e) => setEditPriority(e.target.value as PriorityLevel)}
                                className="flex-[1_1_100px] min-w-0 text-[10px] font-semibold px-2 py-1.5 rounded border border-slate-300 outline-none"
                              >
                                <option value={PriorityLevel.LOW}>LOW</option>
                                <option value={PriorityLevel.MEDIUM}>MEDIUM</option>
                                <option value={PriorityLevel.HIGH}>HIGH</option>
                                <option value={PriorityLevel.URGENT}>URGENT</option>
                              </select>

                              <select 
                                value={editCategory} 
                                onChange={(e) => setEditCategory(e.target.value as IssueCategory)}
                                className="flex-[1_1_100px] min-w-0 text-[10px] font-semibold px-2 py-1.5 rounded border border-slate-300 outline-none"
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
                            
                            <div className="flex flex-wrap gap-2 justify-end pt-1">
                              <button 
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingId(null);
                                }}
                                className="px-2.5 py-1 text-[10px] text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 font-medium flex items-center gap-1"
                              >
                                <X className="h-3 w-3" /> Cancel
                              </button>
                              <button 
                                type="button"
                                disabled={isUpdating}
                                onClick={(e) => handleUpdate(e, req.id)}
                                className="px-2.5 py-1 text-[10px] text-white bg-blue-600 rounded-lg hover:bg-blue-700 font-semibold flex items-center gap-1 shadow-sm disabled:opacity-50"
                              >
                                <Save className="h-3 w-3" /> {isUpdating ? "Saving..." : "Save"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* Description */}
                            <div>
                              <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                                {req.description}
                              </p>
                            </div>

                            {/* Action buttons based on current state */}
                            {col.status === RequestStatus.WAITING && (
                              <button
                                type="button"
                                onClick={(e) => handleStartRepair(e, req.id)}
                                disabled={!isAuthorized}
                                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold py-2 px-2 rounded-xl text-[10px] uppercase tracking-wider transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                              >
                                <Play className="h-3 w-3 fill-current shrink-0" />
                                <span>{t.acceptRepairBtn}</span>
                              </button>
                            )}

                            {col.status === RequestStatus.IN_PROGRESS && (
                              <div className="space-y-1.5">
                                <div className={loggedInUser?.email === "mpigome44@gmail.com" ? "grid grid-cols-2 gap-1.5" : "w-full"}>
                                  <button
                                    type="button"
                                    onClick={(e) => handleOpenActionDialog(e, req.id, "DONE")}
                                    disabled={!isAuthorized}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold py-2 px-1.5 rounded-xl text-[10px] uppercase tracking-wider transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                                  >
                                    <CheckCircle className="h-3 w-3 shrink-0" />
                                    <span>{t.completeBtn}</span>
                                  </button>
                                  {loggedInUser?.email === "mpigome44@gmail.com" && (
                                    <button
                                      type="button"
                                      onClick={(e) => handleOpenActionDialog(e, req.id, "CANCELLED")}
                                      disabled={!isAuthorized}
                                      className="bg-slate-50 hover:bg-rose-50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 hover:text-rose-700 font-extrabold py-2 px-1.5 rounded-xl text-[10px] uppercase tracking-wider transition-colors border border-slate-200 flex items-center justify-center space-x-1 cursor-pointer"
                                    >
                                      <XCircle className="h-3 w-3 shrink-0" />
                                      <span>{t.cancelBtn}</span>
                                    </button>
                                  )}
                                </div>
                                {/* PRINT (PDF) Trigger for In Progress tasks */}
                                {onPrint && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onPrint(req);
                                    }}
                                    className="w-full bg-slate-900 hover:bg-slate-800 text-slate-100 font-extrabold py-1.5 px-2 rounded-xl text-[9px] uppercase tracking-widest transition-colors flex items-center justify-center space-x-1.5 shadow-sm cursor-pointer"
                                  >
                                    <Printer className="h-3 w-3" />
                                    <span>PRINT (PDF)</span>
                                  </button>
                                )}
                              </div>
                            )}

                            {/* Done Resolutions summary */}
                            {col.status === RequestStatus.DONE && (
                              <div className="space-y-1.5">
                                <div className="bg-emerald-50/60 border border-emerald-100 rounded-lg p-2 text-[11px] leading-relaxed">
                                  <span className="font-bold text-emerald-950 block text-[9px] uppercase tracking-wider">{t.resolutionNotesLabel}</span>
                                  <p className="text-emerald-800 line-clamp-2 mt-0.5">{req.resolutionNotes}</p>
                                </div>
                                {/* PRINT (PDF) Trigger for Completed tasks */}
                                {onPrint && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onPrint(req);
                                    }}
                                    className="w-full bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold py-1.5 px-2 rounded-xl text-[9px] uppercase tracking-widest transition-colors flex items-center justify-center space-x-1.5 shadow-sm cursor-pointer"
                                  >
                                    <Printer className="h-3 w-3" />
                                    <span>PRINT CERTIFICATE</span>
                                  </button>
                                )}
                              </div>
                            )}

                            {/* Cancelled summary */}
                            {col.status === RequestStatus.CANCELLED && (
                              <div className="bg-rose-50/60 border border-rose-100 rounded-lg p-2 text-[11px] leading-relaxed">
                                <span className="font-bold text-rose-950 block text-[9px] uppercase tracking-wider">{t.voidReasonLabel}</span>
                                <p className="text-rose-800 line-clamp-2 mt-0.5">{req.cancellationReason}</p>
                              </div>
                            )}

                            {/* Audit Details link & Action Buttons */}
                            <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-400 border-t border-slate-100 pt-2 font-mono gap-2">
                              <span className="truncate max-w-[100px]">By: {req.reporterName}</span>
                              <button 
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectRequest(req);
                                }}
                                className="text-slate-500 hover:text-blue-600 flex items-center space-x-1 hover:underline cursor-pointer font-bold shrink-0"
                              >
                                <FileText className="h-3.5 w-3.5" />
                                <span>{t.auditTrailBtn} ({req.auditLogs.length})</span>
                              </button>
                            </div>

                            {/* Edit & Delete Action Buttons for Surabaya / Admin */}
                            {isAuthorized && (
                              <div className="flex flex-wrap items-center justify-end gap-2 pt-1.5 border-t border-slate-100/80" onClick={(e) => e.stopPropagation()}>
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
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Dialog Modal */}
      {activeActionId && actionType && (
        <div className="fixed inset-0 bg-slate-950/20 backdrop-blur-[4px] flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200/80 w-full max-w-md overflow-hidden shadow-2xl animate-scale-up">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase text-slate-800 tracking-wider flex items-center space-x-2">
                {actionType === "DONE" ? (
                  <>
                    <ClipboardCheck className="h-5 w-5 text-emerald-600" />
                    <span>{t.completeBtn}</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-rose-600" />
                    <span>{t.cancelBtn}</span>
                  </>
                )}
              </h3>
              <button
                type="button"
                onClick={handleCloseActionDialog}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveAction} className="p-5 space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 text-[11px] font-mono space-y-1">
                <div>
                  <span className="text-slate-400">{t.ticketIdLabel}:</span>{" "}
                  <span className="font-bold text-slate-900">{activeActionId}</span>
                </div>
                <div>
                  <span className="text-slate-400">Container:</span>{" "}
                  <span className="font-bold text-slate-900">
                    {requests.find((r) => r.id === activeActionId)?.containerNumber}
                  </span>
                </div>
              </div>

              {actionType === "DONE" ? (
                <>
                  {/* Proof of Repair Image Upload */}
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-wider font-extrabold text-slate-500 mb-1.5">
                      {t.proofRepairPhotoLabel}
                    </label>
                    {repairPhoto ? (
                      <div className="relative">
                        <img
                          src={repairPhoto}
                          alt="Repair proof"
                          referrerPolicy="no-referrer"
                          className="w-full h-36 object-cover rounded-xl border border-slate-200"
                        />
                        <button
                          type="button"
                          onClick={() => setRepairPhoto(null)}
                          className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white p-1 rounded-full text-xs font-bold w-6 h-6 flex items-center justify-center cursor-pointer shadow"
                        >
                          &times;
                        </button>
                      </div>
                    ) : (
                      <div className="border border-dashed border-slate-200 rounded-xl p-5 text-center bg-slate-50 hover:bg-slate-100 transition-colors">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-xs text-blue-600 font-extrabold flex items-center justify-center space-x-1.5 mx-auto cursor-pointer"
                        >
                          <Camera className="h-4.5 w-4.5" />
                          <span>{t.attachProofBtn}</span>
                        </button>
                        <p className="text-[10px] text-slate-400 mt-1">{t.certifiedSealMsg}</p>
                      </div>
                    )}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleRepairPhotoUpload}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>

                  {/* Resolution Notes */}
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-wider font-extrabold text-slate-500 mb-1.5">
                      {t.resolutionNotesLabel}
                    </label>
                    <textarea
                      placeholder={t.resolutionNotesPlaceholder}
                      rows={3}
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs h-24 resize-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none transition-all"
                      required
                    />
                  </div>
                </>
              ) : (
                /* Cancellation Reason */
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider font-extrabold text-slate-500 mb-1.5">
                    {t.voidReasonLabel}
                  </label>
                  <textarea
                    placeholder={t.voidReasonPlaceholder}
                    rows={3}
                    value={cancellationReason}
                    onChange={(e) => setCancellationReason(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs h-24 resize-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20 outline-none transition-all"
                    required
                  />
                </div>
              )}

              {dialogError && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-xs font-semibold flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{dialogError}</span>
                </div>
              )}

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseActionDialog}
                  className="w-1/2 border border-slate-200 hover:bg-slate-50 text-slate-500 font-bold py-2.5 px-3 rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer text-center"
                >
                  {t.closeBtn}
                </button>
                <button
                  type="submit"
                  className={`w-1/2 font-bold py-2.5 px-3 rounded-xl text-xs uppercase tracking-wider text-white transition-colors cursor-pointer text-center ${
                    actionType === "DONE"
                      ? "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800"
                      : "bg-rose-600 hover:bg-rose-700 active:bg-rose-800"
                  }`}
                >
                  {t.saveStatusBtn}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
