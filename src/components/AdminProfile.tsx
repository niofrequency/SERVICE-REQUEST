// src/components/AdminProfile.tsx
import React, { useState } from "react";
import { ServiceRequest, LocationTeam, RequestStatus } from "../types.js";
import TimikaForm from "./TimikaForm.js";
import SurabayaDashboard from "./SurabayaDashboard.js";
import JakartaDashboard from "./JakartaDashboard.js";
import { ArrowRight, FileSpreadsheet, Upload, CheckCircle2, AlertTriangle, Database } from "lucide-react";
import * as XLSX from "xlsx";
import { doc, updateDoc, collection, getDocs } from "firebase/firestore";
import { db } from "../firebase.js";

interface AdminProfileProps {
  requests: ServiceRequest[];
  language: "ENG" | "IND";
  loggedInUser: { name: string; location: LocationTeam; email?: string; signature?: string } | null;
  onCreateRequest: (payload: any) => Promise<void>;
  onStatusUpdate: (id: string, payload: any) => Promise<void>;
  onSelectRequest: (req: ServiceRequest) => void;
  onPrintRequest: (req: ServiceRequest) => void;
  prefilledContainerNumber: string;
  prefilledPhoto: string | null;
  onClearPrefilled: () => void;
  onNavigateHistory: () => void;
  onNavigateInProgress: () => void;
  onNavigateTab?: (tab: "awaiting" | "in-progress" | "completed") => void;
}

export default function AdminProfile({
  requests,
  language,
  loggedInUser,
  onCreateRequest,
  onStatusUpdate,
  onSelectRequest,
  onPrintRequest,
  prefilledContainerNumber,
  prefilledPhoto,
  onClearPrefilled,
  onNavigateHistory,
  onNavigateInProgress,
  onNavigateTab,
}: AdminProfileProps) {
  const waitingCount = requests.filter((r) => r.status === RequestStatus.WAITING).length;
  const inProgressCount = requests.filter((r) => r.status === RequestStatus.IN_PROGRESS).length;
  const completedCount = requests.filter((r) => r.status === RequestStatus.DONE).length;

  // VLookup Excel Upload & Fleet States
  const [isUploadingExcel, setIsUploadingExcel] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  // Store the parsed excel data to show in the "Fleet Inventory" tab
  const [fleetData, setFleetData] = useState<any[]>([]);
  const [showFleet, setShowFleet] = useState(false);

  const handleExcelVLookupUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingExcel(true);
    setUploadMessage(null);
    setUploadError(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        // Convert to JSON
        const data: any[] = XLSX.utils.sheet_to_json(ws);
        
        // Save to local state for the Fleet Database Table View
        setFleetData(data);
        setShowFleet(true); // Auto-open the tab when uploaded

        let updatedCount = 0;

        // Fetch all current Firestore requests
        const querySnapshot = await getDocs(collection(db, "requests"));
        const existingDocs = querySnapshot.docs;

        for (const row of data) {
          const containerNo = String(row["CONTAINER_NUMBER"] || "").toUpperCase().trim();
          const newLocationDetail = row["Location Detail"];

          if (!containerNo) continue;

          // MATCH CONDITION: Find document by container number AND ensure it is in WAITING status
          const matchedDoc = existingDocs.find(d => {
            const docData = d.data();
            return (
              docData.containerNumber?.toUpperCase().trim() === containerNo &&
              docData.status === RequestStatus.WAITING
            );
          });

          if (matchedDoc) {
            const docRef = doc(db, "requests", matchedDoc.id);
            await updateDoc(docRef, {
              locationDetail: newLocationDetail, 
              updatedAt: new Date().toISOString()
            });
            updatedCount++;
          }
        }

        setUploadMessage(`Successfully synced and updated locations for ${updatedCount} container(s) currently awaiting repair.`);
      } catch (err: any) {
        setUploadError(`VLookup sync failed: ${err.message}`);
      } finally {
        setIsUploadingExcel(false);
        e.target.value = ""; // Reset file input
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-6">
      <div className="relative border-b border-slate-200 pb-3 flex items-center justify-between text-[11px] font-mono">
        <span className="text-amber-600 font-extrabold flex items-center space-x-1.5 uppercase tracking-wider">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
          <span>TIMIKA PORT INTAKE (PAPUA)</span>
        </span>

        <span className="text-blue-600 font-extrabold flex items-center space-x-1.5 uppercase tracking-wider">
          <span>SURABAYA &amp; JAKARTA WORKSHOP SYSTEM</span>
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
        </span>
      </div>

      {/* Bulk VLookup Excel Upload Widget */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <FileSpreadsheet className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-xs font-mono font-extrabold text-slate-900 uppercase tracking-wider">
              Bulk VLookup Location Sync
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload movement spreadsheets (e.g., 20 JULY 2026 Reefer Movement PSU and PRIMO.xlsx). <br/>
              <span className="font-bold text-amber-600">Note: Only containers in 'AWAITING' status will have their locations updated.</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {fleetData.length > 0 && (
            <button
              onClick={() => setShowFleet(!showFleet)}
              className="flex items-center space-x-2 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm border border-indigo-200"
            >
              <Database className="h-4 w-4" />
              <span>{showFleet ? "Hide Fleet Data" : "View Fleet Data"}</span>
            </button>
          )}
          <label className={`flex items-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-all shadow-sm ${isUploadingExcel ? "opacity-50 pointer-events-none" : ""}`}>
            <Upload className="h-4 w-4" />
            <span>{isUploadingExcel ? "Processing..." : "Upload Excel"}</span>
            <input type="file" accept=".xlsx, .xls, .csv" onChange={handleExcelVLookupUpload} className="hidden" disabled={isUploadingExcel} />
          </label>
        </div>
      </div>

      {uploadMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-xs font-semibold flex items-center space-x-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{uploadMessage}</span>
        </div>
      )}

      {uploadError && (
        <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-xs font-semibold flex items-center space-x-2">
          <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Fleet Inventory Table Section */}
      {showFleet && fleetData.length > 0 && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-extrabold text-slate-900 text-xs font-mono uppercase tracking-widest flex items-center space-x-2">
                <Database className="h-4 w-4 text-indigo-500" />
                <span>Company Fleet Database</span>
              </h3>
              <p className="text-[10px] text-slate-500 mt-1 uppercase">Showing {fleetData.length} total active units from imported sheet</p>
            </div>
            <button onClick={() => setShowFleet(false)} className="text-xs font-bold text-slate-500 hover:text-slate-800 uppercase underline">
              Close View
            </button>
          </div>
          
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 font-mono">
                  <th className="p-3 border-b border-slate-200">No</th>
                  <th className="p-3 border-b border-slate-200">Container Number</th>
                  <th className="p-3 border-b border-slate-200">Mfg</th>
                  <th className="p-3 border-b border-slate-200">Gas Type</th>
                  <th className="p-3 border-b border-slate-200">Voyage No</th>
                  <th className="p-3 border-b border-slate-200">Date To</th>
                  <th className="p-3 border-b border-slate-200">Diff Day</th>
                  <th className="p-3 border-b border-slate-200">Product</th>
                  <th className="p-3 border-b border-slate-200">Location Category</th>
                  <th className="p-3 border-b border-slate-200">Location Detail</th>
                </tr>
              </thead>
              <tbody className="text-xs text-slate-700">
                {fleetData.map((row, idx) => {
                  const diffDay = Number(row["Diff Day"]);
                  const isHighDiff = !isNaN(diffDay) && diffDay > 50;

                  return (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-mono text-slate-400">{row["NO"] || idx + 1}</td>
                      <td className="p-3 font-bold text-slate-900">{row["CONTAINER_NUMBER"] || "-"}</td>
                      <td className="p-3">{row["Mfg"] || "-"}</td>
                      <td className="p-3">{row["GAS_TYPE"] || "-"}</td>
                      <td className="p-3 text-[11px] truncate max-w-[150px]">{row["VOYAGE_NO"] || "-"}</td>
                      <td className="p-3">{row["DATE_TO"] || "-"}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-md font-mono font-bold ${isHighDiff ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {row["Diff Day"] || "0"}
                        </span>
                      </td>
                      <td className="p-3">{row["Product_"] || "-"}</td>
                      <td className="p-3">{row["Location_Category"] || "-"}</td>
                      <td className="p-3 font-mono text-[10px] text-blue-700 bg-blue-50/50">{row["Location Detail"] || "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Interactive Flow-Chart Pipeline Layout */}
      {!showFleet && (
        <>
          <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-xl space-y-3">
            <h3 className="text-xs font-bold font-mono text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              {language === "ENG" ? "Container Service Flowchart Pipeline" : "Alur Pipa Layanan Kontainer"}
            </h3>
            
            <div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-1">
              {/* Box 1: Awaiting Repair */}
              <div
                onClick={() => onNavigateTab ? onNavigateTab("awaiting") : onNavigateInProgress()}
                className="flex-1 w-full bg-white p-4 rounded-xl border-2 border-slate-300 shadow-sm hover:border-amber-500 transition-all cursor-pointer group flex items-center justify-between"
              >
                <div className="space-y-0.5">
                  <span className="text-[9px] font-mono font-bold text-amber-600 uppercase">Step 1</span>
                  <h4 className="text-xs font-extrabold text-slate-900 uppercase">Awaiting Repair</h4>
                  <p className="text-[10px] text-slate-500">Click to view queue</p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-mono font-bold text-sm group-hover:scale-105 transition-transform">
                  {waitingCount}
                </div>
              </div>

              {/* Arrow 1 */}
              <div className="hidden md:flex justify-center text-slate-400 shrink-0 px-1">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shadow-inner">
                  <ArrowRight className="h-4 w-4 animate-pulse text-blue-600" />
                </div>
              </div>

              {/* Box 2: In Progress */}
              <div
                onClick={onNavigateInProgress}
                className="flex-1 w-full bg-white p-4 rounded-xl border-2 border-slate-300 shadow-sm hover:border-blue-500 transition-all cursor-pointer group flex items-center justify-between"
              >
                <div className="space-y-0.5">
                  <span className="text-[9px] font-mono font-bold text-blue-600 uppercase">Step 2</span>
                  <h4 className="text-xs font-extrabold text-slate-900 uppercase">In Progress</h4>
                  <p className="text-[10px] text-slate-500">Click to view active jobs</p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-mono font-bold text-sm group-hover:scale-105 transition-transform">
                  {inProgressCount}
                </div>
              </div>

              {/* Arrow 2 */}
              <div className="hidden md:flex justify-center text-slate-400 shrink-0 px-1">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shadow-inner">
                  <ArrowRight className="h-4 w-4 animate-pulse text-emerald-600" />
                </div>
              </div>

              {/* Box 3: Completed */}
              <div
                onClick={() => onNavigateTab ? onNavigateTab("completed") : onNavigateHistory()}
                className="flex-1 w-full bg-white p-4 rounded-xl border-2 border-slate-300 shadow-sm hover:border-emerald-500 transition-all cursor-pointer group flex items-center justify-between"
              >
                <div className="space-y-0.5">
                  <span className="text-[9px] font-mono font-bold text-emerald-600 uppercase">Step 3</span>
                  <h4 className="text-xs font-extrabold text-slate-900 uppercase">Completed</h4>
                  <p className="text-[10px] text-slate-500">Click to view archives</p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-mono font-bold text-sm group-hover:scale-105 transition-transform">
                  {completedCount}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start w-full">
            <div className="xl:col-span-12 space-y-6 w-full">
              <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm space-y-5">
                <div className="border-b border-slate-100 pb-3">
                  <div className="flex justify-between items-center">
                    <h3 className="font-extrabold text-slate-900 text-xs font-mono uppercase tracking-widest flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      <span>TIMIKA FIELD OPERATIONS</span>
                    </h3>
                    <span className="text-[10px] bg-blue-500/10 text-blue-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider hidden lg:inline-block">
                      DIRECT UPLOAD
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Field technicians attach damage documentation directly to incoming container logs.
                  </p>
                </div>
                <TimikaForm
                  onSubmitSuccess={() => {}}
                  onSubmitRequest={onCreateRequest}
                  requests={requests}
                  onSelectRequest={onSelectRequest}
                  language={language}
                  loggedInUser={loggedInUser}
                  prefilledContainerNumber={prefilledContainerNumber}
                  prefilledPhoto={prefilledPhoto}
                  onClearPrefilled={onClearPrefilled}
                  onNavigateHistory={onNavigateHistory}
                  onNavigateInProgress={onNavigateInProgress}
                  onNavigateTab={onNavigateTab}
                />
              </div>
            </div>

            <div className="xl:col-span-12 space-y-6 w-full">
              <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm border-l-4 border-l-blue-600 flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-xs font-mono uppercase tracking-widest flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span>SURABAYA &amp; JAKARTA WORKSHOP SYSTEM</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Technicians diagnostic queue, process parts, signoff completion logs, or cancel tickets.
                  </p>
                </div>
                <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  LIVE
                </span>
              </div>
              <div className="space-y-6">
                <SurabayaDashboard
                  requests={requests.filter(
                    (r) =>
                      r.location === LocationTeam.SURABAYA ||
                      (!r.location && r.destinationLocation === LocationTeam.SURABAYA)
                  )}
                  onStatusUpdate={onStatusUpdate}
                  onSelectRequest={onSelectRequest}
                  onPrint={onPrintRequest}
                  language={language}
                  loggedInUser={loggedInUser}
                />
                <JakartaDashboard
                  requests={requests.filter(
                    (r) =>
                      r.location === LocationTeam.JAKARTA ||
                      r.destinationLocation === LocationTeam.JAKARTA
                  )}
                  onStatusUpdate={onStatusUpdate}
                  onSelectRequest={onSelectRequest}
                  onPrint={onPrintRequest}
                  language={language}
                  loggedInUser={loggedInUser}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
