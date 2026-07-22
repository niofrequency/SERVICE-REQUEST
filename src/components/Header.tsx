import React, { useState, useRef, useEffect } from "react";
import { LocationTeam } from "../types.js";
import { HardHat, Wrench, RefreshCw, Layers, Globe, LogOut, Camera } from "lucide-react";
import { locales } from "../locales.js";

interface HeaderProps {
  currentRole: LocationTeam | "Admin";
  onRoleChange: (role: LocationTeam | "Admin") => void;
  isPolling: boolean;
  onRefresh: () => void;
  language: "ENG" | "IND";
  onLanguageToggle: () => void;
  loggedInUser: { name: string; location: LocationTeam; email?: string } | null;
  onLogOut: () => void;
  onScanImage?: (base64Data: string) => Promise<void>;
}

export default function Header({
  currentRole,
  onRoleChange,
  isPolling,
  onRefresh,
  language,
  onLanguageToggle,
  loggedInUser,
  onLogOut,
  onScanImage,
}: HeaderProps) {
  const [wibTime, setWibTime] = useState("");
  const [witTime, setWitTime] = useState("");
  const mobileFileInputRef = useRef<HTMLInputElement>(null);

  const t = locales[language];

  const handleMobilePhotoSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      if (onScanImage) {
        onScanImage(base64);
      }
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    const updateClocks = () => {
      const now = new Date();

      // WIB (Surabaya & Jakarta, UTC+7)
      const wibStr = now.toLocaleTimeString("en-US", {
        timeZone: "Asia/Jakarta",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
      setWibTime(wibStr);

      // WIT (Timika, UTC+9)
      const witStr = now.toLocaleTimeString("en-US", {
        timeZone: "Asia/Jayapura",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
      setWitTime(witStr);
    };

    updateClocks();
    const interval = setInterval(updateClocks, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* Desktop Header */}
      <header className="hidden sm:block w-full bg-slate-950 text-white border-b border-slate-800 shadow-md shrink-0 relative z-20">
        <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
        <div className="w-full px-4 sm:px-6 lg:px-8 py-3.5">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 w-full">
            
            {/* Left Block: Brand and Clocks */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
              {/* Brand & Identity with Custom Logo */}
              <div className="flex items-center space-x-3">
                <div className="h-10 flex items-center justify-center select-none shrink-0">
                  <img 
                    src="/img/panjasa-intradin_logo.png" 
                    alt="PT. Panjasa Intradin Logo" 
                    className="h-9 w-auto object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-sm font-extrabold tracking-tight uppercase font-sans text-slate-100 leading-none">
                    {t.brandTitle}
                  </h1>
                  <p className="text-[9px] text-slate-400 font-mono tracking-widest uppercase mt-1">
                    {t.brandSubtitle}
                  </p>
                </div>
              </div>

              {/* Timezones Divider */}
              <div className="hidden sm:block h-6 w-[1px] bg-slate-800 shrink-0" />

              {/* Real-time Timezone Clocks */}
              <div className="hidden sm:flex items-center space-x-3 bg-slate-900/60 py-1.5 px-3 rounded-lg border border-slate-800/80 text-[11px] font-mono w-fit shrink-0">
                <div className="text-center border-r border-slate-800 pr-3">
                  <span className="block text-[8px] text-amber-500 uppercase font-bold tracking-wider mb-0.5">
                    Surabaya/Jakarta (WIB)
                  </span>
                  <span className="text-xs font-bold text-slate-200 tracking-wider">{wibTime || "00:00:00"}</span>
                </div>
                <div className="text-center pl-1">
                  <span className="block text-[8px] text-emerald-400 uppercase font-bold tracking-wider mb-0.5">
                    Timika (WIT)
                  </span>
                  <span className="text-xs font-bold text-slate-200 tracking-wider">{witTime || "00:00:00"}</span>
                </div>
              </div>
            </div>

            {/* Right Block: Role Switchers, Utilities, and Profile Info */}
            <div className="flex flex-wrap items-center gap-3 lg:justify-end">
              
              {/* Role / Context Switcher */}
              {loggedInUser?.email === "mpigome44@gmail.com" && (
                <div className="bg-slate-900/80 p-1 rounded-lg border border-slate-800 flex space-x-1 shadow-inner">
                  <button
                    id="role-switch-timika"
                    onClick={() => onRoleChange(LocationTeam.TIMIKA)}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-[10px] font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                      currentRole === LocationTeam.TIMIKA
                        ? "bg-blue-600 text-white font-bold shadow-md shadow-blue-600/15"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                    }`}
                  >
                    <HardHat className="h-3.5 w-3.5" />
                    <span>Timika</span>
                  </button>

                  <button
                    id="role-switch-surabaya"
                    onClick={() => onRoleChange(LocationTeam.SURABAYA)}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-[10px] font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                      currentRole === LocationTeam.SURABAYA
                        ? "bg-blue-600 text-white font-bold shadow-md shadow-blue-600/15"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                    }`}
                  >
                    <Wrench className="h-3.5 w-3.5" />
                    <span>Surabaya</span>
                  </button>

                  <button
                    id="role-switch-jakarta"
                    onClick={() => onRoleChange(LocationTeam.JAKARTA)}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-[10px] font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                      currentRole === LocationTeam.JAKARTA
                        ? "bg-purple-600 text-white font-bold shadow-md shadow-purple-600/15"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                    }`}
                  >
                    <Wrench className="h-3.5 w-3.5" />
                    <span>Jakarta</span>
                  </button>

                  <button
                    id="role-switch-admin"
                    onClick={() => onRoleChange("Admin")}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-[10px] font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                      currentRole === "Admin"
                        ? "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/15"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                    }`}
                  >
                    <Layers className="h-3.5 w-3.5" />
                    <span>{t.roleMonitor}</span>
                  </button>
                </div>
              )}

              {/* Language Toggle Button */}
              <button
                onClick={onLanguageToggle}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs transition-colors border border-slate-800 cursor-pointer font-bold shadow-sm"
                title="Change Language / Ubah Bahasa"
              >
                <Globe className="h-3.5 w-3.5 text-blue-400" />
                <span className="font-mono tracking-tight text-[11px]">{language}</span>
              </button>

              {/* Manual Sync */}
              <button
                onClick={onRefresh}
                className={`p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors border border-slate-800 cursor-pointer shadow-sm ${
                  isPolling ? "animate-spin text-amber-500" : ""
                }`}
                title="Manually sync requests"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>

              {/* Profile Info and Logout on the FAR RIGHT */}
              {loggedInUser && (
                <div className="flex items-center space-x-3 bg-slate-900 hover:bg-slate-800/80 transition-all pl-3 pr-1 py-1 rounded-lg border border-slate-800 text-xs shadow-md shrink-0">
                  <div className="flex items-center space-x-2 font-sans">
                    <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-md flex items-center justify-center font-bold text-[10px] uppercase shadow-sm shrink-0">
                      {loggedInUser.name.charAt(0)}
                    </div>
                    <div className="text-left leading-tight">
                      <span className="block text-[8px] text-slate-400 uppercase tracking-widest font-extrabold font-mono">
                        {loggedInUser.email === "mpigome44@gmail.com" ? "Admin" : loggedInUser.location}
                      </span>
                      <span className="block text-[11px] font-bold text-slate-200 max-w-[90px] truncate">
                        {loggedInUser.name}
                      </span>
                    </div>
                  </div>
                  
                  <div className="h-5 w-[1px] bg-slate-800 shrink-0" />
                  
                  <button
                    onClick={onLogOut}
                    className="flex items-center space-x-1 px-2.5 py-1.5 hover:bg-rose-500/10 hover:text-rose-400 text-slate-400 transition-colors rounded-md text-[10px] font-mono uppercase font-bold cursor-pointer shrink-0"
                    title={t.logOut}
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline-block">Logout</span>
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Header Bar */}
      <header className="block sm:hidden fixed bottom-0 left-0 right-0 w-full bg-slate-950 border-t border-slate-800 z-50 h-16 shadow-2xl pb-safe text-white">
        <div className="grid grid-cols-5 h-full w-full px-2">
          {/* Button 1: Role Switcher / Indicator */}
          {loggedInUser?.email === "mpigome44@gmail.com" ? (
            <button
              onClick={() => {
                const roles: Array<LocationTeam | "Admin"> = [LocationTeam.TIMIKA, LocationTeam.SURABAYA, LocationTeam.JAKARTA, "Admin"];
                const currentIndex = roles.indexOf(currentRole);
                const nextIndex = (currentIndex + 1) % roles.length;
                onRoleChange(roles[nextIndex]);
              }}
              className="flex flex-col items-center justify-center h-full text-slate-400 hover:text-white cursor-pointer select-none"
              title="Switch Role"
            >
              {currentRole === LocationTeam.TIMIKA && <HardHat className="h-5 w-5 text-amber-400" />}
              {currentRole === LocationTeam.SURABAYA && <Wrench className="h-5 w-5 text-blue-400" />}
              {currentRole === LocationTeam.JAKARTA && <Wrench className="h-5 w-5 text-purple-400" />}
              {currentRole === "Admin" && <Layers className="h-5 w-5 text-indigo-400" />}
              <span className="text-[8px] font-bold font-mono tracking-wider uppercase mt-1 text-slate-400">
                {currentRole === "Admin" ? "Monitor" : currentRole}
              </span>
            </button>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 select-none">
              {currentRole === LocationTeam.TIMIKA && <HardHat className="h-5 w-5 text-amber-400" />}
              {currentRole === LocationTeam.SURABAYA && <Wrench className="h-5 w-5 text-blue-400" />}
              {currentRole === LocationTeam.JAKARTA && <Wrench className="h-5 w-5 text-purple-400" />}
              <span className="text-[8px] font-bold font-mono tracking-wider uppercase mt-1 text-slate-400">
                {currentRole}
              </span>
            </div>
          )}

          {/* Button 2: Language Toggle */}
          <button
            onClick={onLanguageToggle}
            className="flex flex-col items-center justify-center h-full text-slate-400 hover:text-white cursor-pointer select-none"
            title="Change Language"
          >
            <Globe className="h-5 w-5 text-slate-400" />
            <span className="text-[8px] font-bold font-mono tracking-wider uppercase mt-1 text-slate-400">
              {language}
            </span>
          </button>

          {/* Button 3: Scan Camera */}
          <button
            id="mobile-scan-btn"
            onClick={() => mobileFileInputRef.current?.click()}
            className="flex flex-col items-center justify-center h-full text-slate-400 hover:text-white cursor-pointer select-none"
            title="Scan container"
          >
            <Camera className="h-5 w-5 text-slate-400" />
            <span className="text-[8px] font-bold font-mono tracking-wider uppercase mt-1 text-slate-400">
              SCAN
            </span>
            <input
              type="file"
              ref={mobileFileInputRef}
              onChange={handleMobilePhotoSelected}
              accept="image/*"
              capture="environment"
              className="hidden"
            />
          </button>

          {/* Button 4: Sync / Refresh */}
          <button
            onClick={onRefresh}
            className="flex flex-col items-center justify-center h-full text-slate-400 hover:text-white cursor-pointer select-none"
            title="Sync requests"
          >
            <RefreshCw className={`h-5 w-5 text-slate-400 ${isPolling ? "animate-spin text-amber-500" : ""}`} />
            <span className="text-[8px] font-bold font-mono tracking-wider uppercase mt-1 text-slate-400">
              SYNC
            </span>
          </button>

          {/* Button 5: Logout */}
          {loggedInUser ? (
            <button
              onClick={onLogOut}
              className="flex flex-col items-center justify-center h-full text-slate-400 hover:text-rose-400 cursor-pointer select-none"
              title={t.logOut}
            >
              <LogOut className="h-5 w-5 text-slate-400" />
              <span className="text-[8px] font-bold font-mono tracking-wider uppercase mt-1 text-slate-400">
                LOGOUT
              </span>
            </button>
          ) : (
            <div className="h-full" />
          )}
        </div>
      </header>
    </>
  );
}
