// src/components/LocationTab.tsx
import React, { useState, useEffect, useMemo } from "react";
import { Database, Loader2, Search, Filter } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase.js";

interface LocationTabProps {
  isAdmin: boolean;
}

export default function LocationTab({ isAdmin }: LocationTabProps) {
  const [fleetData, setFleetData] = useState<any[]>([]);
  const [isLoadingFleet, setIsLoadingFleet] = useState(true);
  
  // Global search and column-specific filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [colFilters, setColFilters] = useState<Record<string, string>>({});

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

  // Helper function to format long JS Date strings into DD-MMM-YYYY format
  const formatDate = (dateStr: string) => {
    if (!dateStr || dateStr === "-") return "-";
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

  // Update specific column filter
  const handleColFilterChange = (column: string, value: string) => {
    setColFilters(prev => ({
      ...prev,
      [column]: value
    }));
  };

  // Filter fleet inventory based on global search AND individual column filters
  const filteredFleet = useMemo(() => {
    return fleetData.filter(row => {
      // 1. Process Global Search
      let matchesGlobal = true;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const rowValues = Object.values(row).map(v => String(v || "").toLowerCase());
        matchesGlobal = rowValues.some(val => val.includes(term));
      }

      // 2. Process Excel-like Column Filters
      let matchesColumns = true;
      for (const [colKey, filterVal] of Object.entries(colFilters)) {
        if (filterVal.trim() !== "") {
          let cellVal = "";
          
          // Handle specific column mapping safely
          if (colKey === "Location Detail") {
            cellVal = String(row["Location Detail"] || row["location_detail"] || "");
          } else if (colKey === "Mfg" || colKey === "DATE_TO") {
            cellVal = formatDate(String(row[colKey] || ""));
          } else {
            cellVal = String(row[colKey] || "");
          }

          if (!cellVal.toLowerCase().includes(filterVal.toLowerCase())) {
            matchesColumns = false;
            break; 
          }
        }
      }

      return matchesGlobal && matchesColumns;
    });
  }, [fleetData, searchTerm, colFilters]);

  return (
    // Removed max-w constraints to stretch full width like the History tab
    <div className="space-y-6 w-full pb-12">
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

      <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm space-y-6">
        
        {/* Top Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm font-mono uppercase tracking-widest flex items-center space-x-2">
              <Database className="h-5 w-5 text-indigo-500" />
              <span>SHARED COMPANY FLEET INVENTORY</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Search global fleet locations, voyage assignments, and product statuses.
            </p>
          </div>
          <div className="bg-slate-100 text-slate-600 font-mono text-xs px-3 py-1.5 rounded-md border border-slate-200 font-bold whitespace-nowrap">
            {filteredFleet.length} Records Found
          </div>
        </div>

        {/* Global Search Bar (Stretched) */}
        <div className="flex flex-col md:flex-row items-center w-full border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all bg-white shadow-sm">
          <div className="pl-4 py-3 hidden md:block">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Global search across all fields..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 w-full px-4 py-3 text-sm bg-transparent border-none focus:ring-0 outline-none text-slate-700"
          />
        </div>

        {/* Data Table */}
        {isLoadingFleet ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            <p className="text-xs font-mono uppercase tracking-widest">Loading Global Fleet Data...</p>
          </div>
        ) : filteredFleet.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                {/* Column Titles */}
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
                {/* Excel-Style Column Filter Inputs */}
                <tr className="bg-slate-100/50 border-b border-slate-200">
                  <th className="px-2 py-1"><input type="text" placeholder="Filter..." className="w-full text-[10px] px-2 py-1 border border-slate-200 rounded outline-none focus:border-indigo-400 bg-white" onChange={(e) => handleColFilterChange("NO", e.target.value)} /></th>
                  <th className="px-2 py-1"><input type="text" placeholder="Filter..." className="w-full text-[10px] px-2 py-1 border border-slate-200 rounded outline-none focus:border-indigo-400 bg-white" onChange={(e) => handleColFilterChange("CONTAINER_NUMBER", e.target.value)} /></th>
                  <th className="px-2 py-1"><input type="text" placeholder="Filter..." className="w-full text-[10px] px-2 py-1 border border-slate-200 rounded outline-none focus:border-indigo-400 bg-white" onChange={(e) => handleColFilterChange("Mfg", e.target.value)} /></th>
                  <th className="px-2 py-1"><input type="text" placeholder="Filter..." className="w-full text-[10px] px-2 py-1 border border-slate-200 rounded outline-none focus:border-indigo-400 bg-white" onChange={(e) => handleColFilterChange("GAS_TYPE", e.target.value)} /></th>
                  <th className="px-2 py-1"><input type="text" placeholder="Filter..." className="w-full text-[10px] px-2 py-1 border border-slate-200 rounded outline-none focus:border-indigo-400 bg-white" onChange={(e) => handleColFilterChange("VOYAGE_NO", e.target.value)} /></th>
                  <th className="px-2 py-1"><input type="text" placeholder="Filter..." className="w-full text-[10px] px-2 py-1 border border-slate-200 rounded outline-none focus:border-indigo-400 bg-white" onChange={(e) => handleColFilterChange("DATE_TO", e.target.value)} /></th>
                  <th className="px-2 py-1"><input type="text" placeholder="Filter..." className="w-full text-[10px] px-2 py-1 border border-slate-200 rounded outline-none focus:border-indigo-400 bg-white" onChange={(e) => handleColFilterChange("Diff Day", e.target.value)} /></th>
                  <th className="px-2 py-1"><input type="text" placeholder="Filter..." className="w-full text-[10px] px-2 py-1 border border-slate-200 rounded outline-none focus:border-indigo-400 bg-white" onChange={(e) => handleColFilterChange("Product_", e.target.value)} /></th>
                  <th className="px-2 py-1"><input type="text" placeholder="Filter..." className="w-full text-[10px] px-2 py-1 border border-slate-200 rounded outline-none focus:border-indigo-400 bg-white" onChange={(e) => handleColFilterChange("Location_Category", e.target.value)} /></th>
                  <th className="px-2 py-1"><input type="text" placeholder="Filter..." className="w-full text-[10px] px-2 py-1 border border-slate-200 rounded outline-none focus:border-indigo-400 bg-white" onChange={(e) => handleColFilterChange("Location Detail", e.target.value)} /></th>
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
            <Filter className="h-8 w-8 text-slate-300" />
            <p className="text-xs font-mono uppercase tracking-widest">No Fleet Data Found Matching Your Filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
