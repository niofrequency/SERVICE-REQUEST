// src/components/LocationTab.tsx
import React, { useState, useEffect, useMemo } from "react";
import { 
  Database, 
  Loader2, 
  Search, 
  Filter, 
  ArrowDownAZ, 
  ArrowUpZA, 
  X
} from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase.js";

interface LocationTabProps {
  isAdmin: boolean;
}

export default function LocationTab({ isAdmin }: LocationTabProps) {
  const [fleetData, setFleetData] = useState<any[]>([]);
  const [isLoadingFleet, setIsLoadingFleet] = useState(true);
  
  // Global search
  const [searchTerm, setSearchTerm] = useState("");
  
  // Excel Filter States
  const [colFilters, setColFilters] = useState<Record<string, string[]>>({});
  const [sortConfig, setSortConfig] = useState<{ key: string, dir: 'asc' | 'desc' } | null>(null);
  const [activeFilterDropdown, setActiveFilterDropdown] = useState<string | null>(null);

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

  const getFormattedValue = (row: any, colKey: string) => {
    if (colKey === "Location Detail") return String(row["Location Detail"] || row["location_detail"] || "");
    if (colKey === "Mfg" || colKey === "DATE_TO") return formatDate(String(row[colKey] || ""));
    if (colKey === "NO") return String(row["NO"] || "");
    return String(row[colKey] || "");
  };

  // 1. Process Global Search & Column Checkbox Filters safely
  const filteredFleet = useMemo(() => {
    return fleetData.filter(row => {
      // Global Search
      let matchesGlobal = true;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const rowValues = Object.values(row).map(v => String(v || "").toLowerCase());
        matchesGlobal = rowValues.some(val => val.includes(term));
      }

      // Column Checkbox Filters
      let matchesColumns = true;
      for (const [colKey, selectedValues] of Object.entries(colFilters)) {
        if (selectedValues && selectedValues.length > 0) {
          const cellVal = getFormattedValue(row, colKey);
          if (!selectedValues.includes(cellVal)) {
            matchesColumns = false;
            break; 
          }
        }
      }

      return matchesGlobal && matchesColumns;
    });
  }, [fleetData, searchTerm, colFilters]);

  // 2. Process Sorting
  const sortedFleet = useMemo(() => {
    let result = [...filteredFleet];
    if (sortConfig) {
      result.sort((a, b) => {
        const valA = getFormattedValue(a, sortConfig.key).toLowerCase();
        const valB = getFormattedValue(b, sortConfig.key).toLowerCase();
        if (valA < valB) return sortConfig.dir === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.dir === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [filteredFleet, sortConfig]);

  // Column definitions with compact sizing rules, shrinking Gas Type down
  const columns = [
    { key: "NO", label: "No", width: "60px" },
    { key: "CONTAINER_NUMBER", label: "Container Number", width: "160px" },
    { key: "Mfg", label: "Mfg", width: "110px" },
    { key: "GAS_TYPE", label: "Gas Type", width: "85px" },
    { key: "VOYAGE_NO", label: "Voyage No", width: "200px" },
    { key: "DATE_TO", label: "Date To", width: "110px" },
    { key: "Diff Day", label: "Diff Day", width: "90px" },
    { key: "Product_", label: "Product", width: "100px" },
    { key: "Location_Category", label: "Location Category", width: "140px" },
    { key: "Location Detail", label: "Location Detail", width: "140px" }
  ];

  // Component for the Excel Dropdown Menu
  const ExcelFilterDropdown = ({ colKey }: { colKey: string }) => {
    const [localSearch, setLocalSearch] = useState("");
    
    const allUniqueValues = useMemo(() => {
      const values = new Set(fleetData.map(row => getFormattedValue(row, colKey)));
      return Array.from(values).sort();
    }, [fleetData, colKey]);

    const activeSelections = colFilters[colKey];
    const isInitialState = !activeSelections;
    const [tempSelections, setTempSelections] = useState<string[]>(isInitialState ? allUniqueValues : activeSelections);

    const filteredOptions = allUniqueValues.filter(val => val.toLowerCase().includes(localSearch.toLowerCase()));

    const handleSort = (dir: 'asc' | 'desc') => {
      setSortConfig({ key: colKey, dir });
      setActiveFilterDropdown(null);
    };

    const handleApply = () => {
      if (tempSelections.length === allUniqueValues.length) {
        const newFilters = { ...colFilters };
        delete newFilters[colKey];
        setColFilters(newFilters);
      } else {
        setColFilters({ ...colFilters, [colKey]: tempSelections });
      }
      setActiveFilterDropdown(null);
    };

    const handleClear = () => {
      const newFilters = { ...colFilters };
      delete newFilters[colKey];
      setColFilters(newFilters);
      setSortConfig(null);
      setActiveFilterDropdown(null);
    };

    const toggleSelection = (val: string) => {
      setTempSelections(prev => 
        prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]
      );
    };

    const toggleAll = () => {
      if (tempSelections.length === filteredOptions.length) {
        setTempSelections([]);
      } else {
        setTempSelections([...filteredOptions]);
      }
    };

    return (
      <div 
        className="absolute top-full left-0 mt-1 w-64 bg-white border border-slate-200 shadow-xl rounded-lg z-50 text-slate-700 font-sans text-left"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex flex-col p-2 space-y-1 border-b border-slate-100">
          <button onClick={() => handleSort('asc')} className="flex items-center px-3 py-2 hover:bg-slate-50 text-xs font-semibold rounded cursor-pointer transition-colors">
            <ArrowDownAZ className="w-4 h-4 mr-2 text-slate-400" /> Sort A to Z
          </button>
          <button onClick={() => handleSort('desc')} className="flex items-center px-3 py-2 hover:bg-slate-50 text-xs font-semibold rounded cursor-pointer transition-colors">
            <ArrowUpZA className="w-4 h-4 mr-2 text-slate-400" /> Sort Z to A
          </button>
          <button onClick={handleClear} className="flex items-center px-3 py-2 hover:bg-slate-50 text-xs font-semibold text-rose-600 rounded cursor-pointer transition-colors">
            <X className="w-4 h-4 mr-2" /> Clear Filter
          </button>
        </div>
        
        <div className="p-3 space-y-3">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search..." 
              value={localSearch}
              onChange={e => setLocalSearch(e.target.value)}
              className="w-full pl-7 pr-2 py-1.5 text-xs border border-slate-300 rounded focus:border-indigo-500 outline-none"
            />
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1.5 border border-slate-200 p-2 rounded bg-slate-50">
            <label className="flex items-center space-x-2 text-xs cursor-pointer">
              <input 
                type="checkbox" 
                checked={tempSelections.length === filteredOptions.length && filteredOptions.length > 0} 
                onChange={toggleAll}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span className="font-bold">(Select All)</span>
            </label>
            {filteredOptions.map((opt, i) => (
              <label key={i} className="flex items-center space-x-2 text-xs cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={tempSelections.includes(opt)}
                  onChange={() => toggleSelection(opt)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="truncate">{opt === "" ? "(Blanks)" : opt}</span>
              </label>
            ))}
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
            <button onClick={() => setActiveFilterDropdown(null)} className="px-3 py-1 text-xs border border-slate-300 rounded hover:bg-slate-50 transition-colors cursor-pointer">Cancel</button>
            <button onClick={handleApply} className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors cursor-pointer">OK</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 w-full pb-32" onClick={() => setActiveFilterDropdown(null)}>
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

      <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm space-y-6 relative">
        
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
            {sortedFleet.length} Records Found
          </div>
        </div>

        {/* Global Search Bar */}
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
        ) : sortedFleet.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-slate-200 min-h-[400px]">
            <table className="w-full text-left border-collapse whitespace-nowrap table-fixed">
              <thead>
                <tr className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 font-mono select-none">
                  {columns.map((col) => {
                    const isFiltered = !!colFilters[col.key] && colFilters[col.key].length > 0;
                    const isSorted = sortConfig?.key === col.key;
                    
                    return (
                      <th 
                        key={col.key} 
                        className="p-3 border-b border-slate-200 relative group overflow-hidden"
                        style={{ width: col.width }}
                      >
                        <div className="flex items-center justify-between space-x-1">
                          <span className="truncate">{col.label}</span>
                          
                          {/* Excel Filter Icon */}
                          <div 
                            className={`p-1 rounded hover:bg-slate-200 cursor-pointer transition-colors shrink-0 ${isFiltered || isSorted ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400'}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveFilterDropdown(activeFilterDropdown === col.key ? null : col.key);
                            }}
                          >
                            <Filter className="w-3 h-3" />
                          </div>
                        </div>

                        {/* Excel Dropdown Popover */}
                        {activeFilterDropdown === col.key && (
                          <ExcelFilterDropdown colKey={col.key} />
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="text-xs text-slate-700">
                {sortedFleet.map((row, idx) => {
                  const diffDay = Number(row["Diff Day"]);
                  const isHighDiff = !isNaN(diffDay) && diffDay > 50;

                  return (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-mono text-slate-400 truncate" style={{ width: columns[0].width }}>{row["NO"] || idx + 1}</td>
                      <td className="p-3 font-bold text-slate-900 truncate" style={{ width: columns[1].width }}>{row["CONTAINER_NUMBER"] || "-"}</td>
                      <td className="p-3 truncate" style={{ width: columns[2].width }}>{formatDate(String(row["Mfg"] || "-"))}</td>
                      <td className="p-3 truncate" style={{ width: columns[3].width }}>{row["GAS_TYPE"] || "-"}</td>
                      <td className="p-3 text-[11px] truncate" style={{ width: columns[4].width }}>{row["VOYAGE_NO"] || "-"}</td>
                      <td className="p-3 truncate" style={{ width: columns[5].width }}>{formatDate(String(row["DATE_TO"] || "-"))}</td>
                      <td className="p-3 truncate" style={{ width: columns[6].width }}>
                        <span className={`px-2 py-1 rounded-md font-mono font-bold ${isHighDiff ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {row["Diff Day"] ?? "0"}
                        </span>
                      </td>
                      <td className="p-3 truncate" style={{ width: columns[7].width }}>{row["Product_"] || "-"}</td>
                      <td className="p-3 truncate" style={{ width: columns[8].width }}>{row["Location_Category"] || "-"}</td>
                      <td className="p-3 font-mono text-[10px] text-blue-700 bg-blue-50/50 truncate" style={{ width: columns[9].width }}>{row["Location Detail"] || row["location_detail"] || "-"}</td>
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
