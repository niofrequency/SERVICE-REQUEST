// src/components/AdminProfile.tsx
import React from "react";
import { ServiceRequest, LocationTeam, RequestStatus } from "../types.js";
import TimikaForm from "./TimikaForm.js";
import SurabayaDashboard from "./SurabayaDashboard.js";
import JakartaDashboard from "./JakartaDashboard.js";
import { ArrowRight } from "lucide-react";

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

      {/* Interactive Flow-Chart Pipeline Layout */}
      <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-xl space-y-3">
        <h3 className="text-xs font-bold font-mono text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          {language === "ENG" ? "Container Service Flowchart Pipeline" : "Alur Pipa Layanan Kontainer"}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center pt-1">
          {/* Box 1: Awaiting Repair */}
          <div
            onClick={() => onNavigateTab ? onNavigateTab("awaiting") : onNavigateInProgress()}
            className="bg-white p-4 rounded-xl border-2 border-slate-300 shadow-sm hover:border-amber-500 transition-all cursor-pointer group flex items-center justify-between md:col-span-2"
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
          <div className="hidden md:flex justify-center text-slate-400">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shadow-inner">
              <ArrowRight className="h-4 w-4 animate-pulse text-blue-600" />
            </div>
          </div>

          {/* Box 2: In Progress */}
          <div
            onClick={onNavigateInProgress}
            className="bg-white p-4 rounded-xl border-2 border-slate-300 shadow-sm hover:border-blue-500 transition-all cursor-pointer group flex items-center justify-between md:col-span-2"
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center pt-1">
          <div className="hidden md:block md:col-span-2"></div>
          <div className="hidden md:flex justify-center text-slate-400">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shadow-inner rotate-90 md:rotate-0">
              <ArrowRight className="h-4 w-4 animate-pulse text-emerald-600" />
            </div>
          </div>
          {/* Box 3: Completed */}
          <div
            onClick={() => onNavigateTab ? onNavigateTab("completed") : onNavigateHistory()}
            className="bg-white p-4 rounded-xl border-2 border-slate-300 shadow-sm hover:border-emerald-500 transition-all cursor-pointer group flex items-center justify-between md:col-span-2"
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
        <div className="xl:col-span-4 space-y-6 w-full">
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
            />
          </div>
        </div>

        <div className="xl:col-span-8 space-y-6 w-full">
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
    </div>
  );
}
