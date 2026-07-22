// src/components/AdminProfile.tsx
import React from 'react';

interface AdminProfileProps {
  name?: string;
  initials?: string;
  email?: string;
  onLogout?: () => void;
}

export const AdminProfile: React.FC<AdminProfileProps> = ({
  name = "Mark Pigome",
  initials = "M.P",
  email = "admin@service-request.internal",
  onLogout,
}) => {
  return (
    <div className="flex items-center space-x-3 bg-slate-800/60 border border-slate-700/60 px-3 py-2 rounded-xl backdrop-blur-md shadow-sm">
      {/* Avatar / Initials Bubble */}
      <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-white text-sm shadow-inner tracking-wider">
        {initials}
      </div>

      {/* Admin Details */}
      <div className="flex flex-col text-left">
        <span className="text-sm font-semibold text-slate-100 leading-tight">{name}</span>
        <span className="text-xs text-slate-400 font-mono truncate max-w-[140px]">{email}</span>
      </div>

      {/* Optional Logout/Settings action */}
      {onLogout && (
        <button
          onClick={onLogout}
          className="ml-auto text-slate-400 hover:text-red-400 transition-colors p-1"
          title="Sign Out"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      )}
    </div>
  );
};
