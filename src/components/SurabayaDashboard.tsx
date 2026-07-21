import React, { useState, useRef, useEffect } from "react";
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
  Calendar, 
  Filter, 
  Plus, 
  Camera, 
  ClipboardCheck, 
  FileText 
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
  language: "ENG" | "IND";
  loggedInUser: { name: string; location: LocationTeam; email?: string } | null;
}

export default function SurabayaDashboard({
  requests,
  onStatusUpdate,
  onSelectRequest,
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

  // Filtered requests
  const filteredRequests = requests.filter((r) => {
    if (filterCategory !== "All" && r.category !== filterCategory) return false;
    if (filterPriority !== "All" && r.priority !== filterPriority) return false;
    return true;
  });

  const getRequestsByStatus = (status: RequestStatus) => {
    return filteredRequests.filter((r) => r.status === status);
  };

  const handleStartRepair = (id: string) => {
    onStatusUpdate(id, {
      status: RequestStatus.IN_PROGRESS,
      operator: operatorName,
      location: LocationTeam.SURABAYA,
      notes: `${operatorName} accepted the job at Surabaya Workshop. Commenced physical diagnostics and repair preparations.`
    });
  };

  const handleOpenActionDialog = (id: string, type: "DONE" | "CANCELLED") => {
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
    <div className="space-y-6 animate-fade-in">
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
      <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
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
          <div className="flex items-center space-x-2 border border-slate-200/80 px-3 py-1.5 rounded-xl text-xs bg-slate-50/60">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-slate-500 font-mono font-bold uppercase text-[9px]">Cat:</span>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="font-bold bg-transparent focus:outline-none text-slate-700 font-mono text-xs cursor-pointer"
            >
              <option value="All">{language === "ENG" ? "ALL CATEGORIES" : "SEMUA KATEGORI"}</option>
              <option value={IssueCategory.ELECTRICAL}>{language === "ENG" ? "ELECTRICAL" : "KELISTRIKAN"}</option>
              <option value={IssueCategory.STRUCTURAL}>{language === "ENG" ? "STRUCTURAL" : "STRUKTURAL"}</option>
              <option value={IssueCategory.REFRIGERATION_TELEMATICS}>{language === "ENG" ? "REEFER / TELEMATICS" : "PENDINGIN / TELEMATIKA"}</option>
              <option value={IssueCategory.MECHANICAL}>{language === "ENG" ? "MECHANICAL" : "MEKANIKAL"}</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center space-x-2 border border-slate-200/80 px-3 py-1.5 rounded-xl text-xs bg-slate-50/60">
            <AlertCircle className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-slate-500 font-mono font-bold uppercase text-[9px]">Prio:</span>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="font-bold bg-transparent focus:outline-none text-slate-700 font-mono text-xs cursor-pointer"
            >
              <option value="All">{language === "ENG" ? "ALL PRIORITIES" : "SEMUA PRIORITAS"}</option>
              <option value={PriorityLevel.LOW}>{language === "ENG" ? "LOW" : "RENDAH"}</option>
              <option value={PriorityLevel.MEDIUM}>{language === "ENG" ? "MEDIUM" : "SEDANG"}</option>
              <option value={PriorityLevel.HIGH}>{language === "ENG" ? "HIGH" : "TINGGI"}</option>
              <option value={PriorityLevel.URGENT}>{language === "ENG" ? "URGENT" : "DARURAT"}</option>
            </select>
          </div>

          {/* Operator Selector */}
          <div className="flex items-center space-x-2 border border-slate-200/80 px-3 py-1.5 rounded-xl text-xs bg-slate-50/60">
            <User className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-slate-500 font-mono font-bold uppercase text-[9px]">{t.operatorLabel}:</span>
            <select
              value={operatorName}
              disabled={isAuthorized} // Freeze to active user if they are the authorized operator
              onChange={(e) => setOperatorName(e.target.value)}
              className={`font-extrabold bg-transparent focus:outline-none text-slate-700 font-mono text-xs ${isAuthorized ? "cursor-not-allowed opacity-80" : "cursor-pointer"}`}
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

      {/* Kanban Board Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
        {columns.map((col) => {
          const colRequests = getRequestsByStatus(col.status);

          return (
            <div
              key={col.status}
              className={`rounded-2xl border flex flex-col h-[590px] bg-slate-50/50 ${col.bg}`}
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
                    const priorityStyles = {
                      [PriorityLevel.LOW]: "bg-slate-100 text-slate-800 border-slate-200/60",
                      [PriorityLevel.MEDIUM]: "bg-blue-50 text-blue-800 border-blue-100/55",
                      [PriorityLevel.HIGH]: "bg-amber-50 text-amber-800 border-amber-200/60",
                      [PriorityLevel.URGENT]: "bg-rose-50 text-rose-800 border-rose-200/60 animate-pulse",
                    };

                    // Translated priorities and categories for cards
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
                        className="bg-white rounded-xl border border-slate-200/80 hover:border-blue-400 hover:shadow-md transition-all p-4 relative space-y-3 group hover:-translate-y-0.5"
                      >
                        {/* Header Details */}
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span
                            onClick={() => onSelectRequest(req)}
                            className="font-bold text-slate-950 group-hover:text-blue-600 cursor-pointer underline decoration-dotted font-bold"
                          >
                            {req.id}
                          </span>
                          <span className="text-slate-400 text-[9px]">
                            {new Date(req.timestamp).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Container tag */}
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-black text-slate-900 tracking-wide">
                            {req.containerNumber}
                          </span>
                        </div>

                        {/* Damage Photo Preview */}
                        {req.photoUrl && (
                          <div 
                            onClick={() => onSelectRequest(req)}
                            className="relative h-24 rounded-lg overflow-hidden border border-slate-100 bg-slate-50 cursor-pointer"
                          >
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

                        {/* Description */}
                        <div>
                          <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                            {req.description}
                          </p>
                        </div>

                        {/* Action buttons based on current state */}
                        {col.status === RequestStatus.WAITING && (
                          <button
                            onClick={() => handleStartRepair(req.id)}
                            disabled={!isAuthorized}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold py-2 px-2 rounded-xl text-[10px] uppercase tracking-wider transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                          >
                            <Play className="h-3 w-3 fill-current" />
                            <span>{t.acceptRepairBtn}</span>
                          </button>
                        )}

                        {col.status === RequestStatus.IN_PROGRESS && (
                          <div className={loggedInUser?.email === "mpigome44@gmail.com" ? "grid grid-cols-2 gap-1.5" : "w-full"}>
                            <button
                              onClick={() => handleOpenActionDialog(req.id, "DONE")}
                              disabled={!isAuthorized}
                              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold py-2 px-1.5 rounded-xl text-[10px] uppercase tracking-wider transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                            >
                              <CheckCircle className="h-3 w-3" />
                              <span>{t.completeBtn}</span>
                            </button>
                            {loggedInUser?.email === "mpigome44@gmail.com" && (
                              <button
                                onClick={() => handleOpenActionDialog(req.id, "CANCELLED")}
                                disabled={!isAuthorized}
                                className="bg-slate-50 hover:bg-rose-50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 hover:text-rose-700 font-extrabold py-2 px-1.5 rounded-xl text-[10px] uppercase tracking-wider transition-colors border border-slate-200 flex items-center justify-center space-x-1 cursor-pointer"
                              >
                                <XCircle className="h-3 w-3" />
                                <span>{t.cancelBtn}</span>
                              </button>
                            )}
                          </div>
                        )}

                        {/* Done Resolutions summary */}
                        {col.status === RequestStatus.DONE && (
                          <div className="bg-emerald-50/60 border border-emerald-100 rounded-lg p-2 text-[11px] leading-relaxed">
                            <span className="font-bold text-emerald-950 block text-[9px] uppercase tracking-wider">{t.resolutionNotesLabel}</span>
                            <p className="text-emerald-800 line-clamp-2 mt-0.5">{req.resolutionNotes}</p>
                          </div>
                        )}

                        {/* Cancelled summary */}
                        {col.status === RequestStatus.CANCELLED && (
                          <div className="bg-rose-50/60 border border-rose-100 rounded-lg p-2 text-[11px] leading-relaxed">
                            <span className="font-bold text-rose-950 block text-[9px] uppercase tracking-wider">{t.voidReasonLabel}</span>
                            <p className="text-rose-800 line-clamp-2 mt-0.5">{req.cancellationReason}</p>
                          </div>
                        )}

                        {/* Audit Details link */}
                        <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100 pt-2 font-mono">
                          <span className="truncate max-w-[120px]">By: {req.reporterName}</span>
                          <button 
                            onClick={() => onSelectRequest(req)}
                            className="text-slate-500 hover:text-blue-600 flex items-center space-x-1 hover:underline cursor-pointer font-bold"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            <span>{t.auditTrailBtn} ({req.auditLogs.length})</span>
                          </button>
                        </div>
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
