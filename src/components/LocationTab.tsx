import React, { useState, useEffect, useMemo } from "react";
import { Database, Loader2, Search } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase.js";

interface LocationTabProps {
  isAdmin: boolean;
}

export default function LocationTab({ isAdmin }: LocationTabProps) {
  const [fleetData, setFleetData] = useState<any[]>([]);
  const [isLoadingFleet, setIsLoadingFleet] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch the global fleet data from Firestore (synced automatically via Google Sheets Apps Script)
  const fetchFleetData = async () => {
    setIsLoadingFleet(true);
    try {
      const fleetDoc = await getDoc(doc(db, "app_data", "fleet_inventory"));
      if (fleetDoc.exists()) {
        setFleetData(fleetDoc.data().items || []);
      }
    } catch (error) {
      console.error("Error fetching fleet data:", error);
    } finally {
      setIsLoadingFleet(false);
    }
  };

  useEffect(() => {
    fetchFleetData();
  }, []);

  // Filter fleet inventory in real-time based on the search term across all specific categories
  const filteredFleet = useMemo(() => {
    if (!searchTerm.trim()) return fleetData;
    const term = searchTerm.toLowerCase();
    
    return fleetData.filter(row => {
      const checkMatch = (val: any) => String(val || "").toLowerCase().includes(term);
      
      return (
        checkMatch(row["NO"]) ||
        checkMatch(row["CONTAINER_NUMBER"]) ||
        checkMatch(row["Mfg"]) ||
        checkMatch(row["GAS_TYPE"]) ||
        checkMatch(row["VOYAGE_NO"]) ||
        checkMatch(row["DATE_TO"]) ||
        checkMatch(row["Diff Day"]) ||
        checkMatch(row["Product_"]) ||
        checkMatch(row["Location_Category"]) ||
        checkMatch(row["Location Detail"] || row["location_detail"])
      );
    });
  }, [fleetData, searchTerm]);

  // Helper function to format long JS Date strings into DD-MMM-YYYY format
  const formatDate = (dateStr: string) => {
    if (!dateStr || dateStr === "-") return "-";
    // If it is a long timestamp format from Apps Script
    if (dateStr.includes("GMT") || dateStr.length > 20) {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const day = String(d.getDate()).padStart(2, '0');
        const month = months[d.getMonth()];
        const year = d.getFullYear();
        return `${day}-${month}-${year}`;
      }
    }
    return dateStr;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-4 gap-4">
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
          <Database className="h-6 w-6 text-indigo-600" />
          <span>FLEET LOCATION DATABASE</span>
        </h2>
        <button
          onClick={fetchFleetData}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-all self-start md:self-auto cursor-pointer"
        >
          Refresh Data
        </button>
      </div>

      {/* SEARCH BAR & FLEET TABLE SECTION - VISIBLE TO ALL USERS */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm space-y-6">
        
        {/* Header and Search Container */}
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm font-mono uppercase tracking-widest flex items-center space-x-2">
              <Database className="h-4 w-4 text-indigo-500" />
              <span>Shared Company Fleet Inventory</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Search across any category. Showing {filteredFleet.length} of {fleetData.length} total units.
            </p>
          </div>

          {/* Stretched Search Bar */}
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Container Number, Gas Type, Voyage No, Location, Date, Product..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>
        </div>

        {isLoadingFleet ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            <p className="text-xs font-mono uppercase tracking-widest">Loading Global Fleet Data...</p>
          </div>
        ) : filteredFleet.length > 0 ? (
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
                {filteredFleet.map((row, idx) => {
                  const diffDay = Number(row["Diff Day"]);
                  const isHighDiff = !isNaN(diffDay) && diffDay > 50;

                  return (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-mono text-slate-400">{row["NO"] || idx + 1}</td>
                      <td className="p-3 font-bold text-slate-900">{row["CONTAINER_NUMBER"] || "-"}</td>
                      <td className="p-3">{formatDate(String(row["Mfg"] || "-"))}</td>
                      <td className="p-3">{row["GAS_TYPE"] || "-"}</td>
                      <td className="p-3 text-[11px] truncate max-w-[150px]">{row["VOYAGE_NO"] || "-"}</td>
                      <td className="p-3">{formatDate(String(row["DATE_TO"] || "-"))}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-md font-mono font-bold ${isHighDiff ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {row["Diff Day"] ?? "0"}
                        </span>
                      </td>
                      <td className="p-3">{row["Product_"] || "-"}</td>
                      <td className="p-3">{row["Location_Category"] || "-"}</td>
                      <td className="p-3 font-mono text-[10px] text-blue-700 bg-blue-50/50">{row["Location Detail"] || row["location_detail"] || "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400 space-y-4 border-2 border-dashed border-slate-200 rounded-2xl">
            <Database className="h-8 w-8 text-slate-300" />
            <p className="text-xs font-mono uppercase tracking-widest">No Fleet Data Found Matching Your Search</p>
          </div>
        )}
      </div>
    </div>
  );
}
