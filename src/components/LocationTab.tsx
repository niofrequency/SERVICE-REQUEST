// src/components/LocationTab.tsx
import React, { useState, useEffect, useMemo } from "react";
import { FileSpreadsheet, Upload, CheckCircle2, AlertTriangle, Database, Loader2, Search } from "lucide-react";
import * as XLSX from "xlsx";
import { doc, updateDoc, collection, getDocs, setDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase.js";
import { RequestStatus } from "../types.js";

interface LocationTabProps {
  isAdmin: boolean;
}

export default function LocationTab({ isAdmin }: LocationTabProps) {
  const [isUploadingExcel, setIsUploadingExcel] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  const [fleetData, setFleetData] = useState<any[]>([]);
  const [isLoadingFleet, setIsLoadingFleet] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch the global fleet data from Firestore so all users see the exact same file
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
        
        // Convert sheet to array of rows to dynamically find the header row containing "CONTAINER_NUMBER"
        const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });
        let headerRowIndex = 0;
        for (let i = 0; i < rows.length; i++) {
          const rowValues = rows[i].map(val => String(val || "").trim());
          if (rowValues.includes("CONTAINER_NUMBER")) {
            headerRowIndex = i;
            break;
          }
        }

        // Re-parse sheet starting precisely from the detected header row
        const data: any[] = XLSX.utils.sheet_to_json(ws, { range: headerRowIndex });

        if (!data || data.length === 0) {
          throw new Error("Spreadsheet contains no valid container rows after the header.");
        }

        let updatedCount = 0;

        // Fetch all current Firestore requests to update WAITING containers only
        const querySnapshot = await getDocs(collection(db, "requests"));
        const existingDocs = querySnapshot.docs;

        for (const row of data) {
          const containerNo = String(row["CONTAINER_NUMBER"] || "").toUpperCase().trim();
          const newLocationDetail = row["Location Detail"] || row["location_detail"];

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

        // Save the parsed JSON to Firestore under app_data/fleet_inventory so ALL users share this exact view
        await setDoc(doc(db, "app_data", "fleet_inventory"), {
          items: data,
          lastUpdated: new Date().toISOString()
        });
        
        setFleetData(data);
        setUploadMessage(`Successfully synced! Updated locations for ${updatedCount} container(s) awaiting repair and published global fleet list.`);
      } catch (err: any) {
        setUploadError(`VLookup sync failed: ${err.message}`);
      } finally {
        setIsUploadingExcel(false);
        e.target.value = ""; // Reset file input
      }
    };
    reader.readAsBinaryString(file);
  };

  // Filter fleet inventory in real-time based on the search term (Container Number, Mfg, or Location)
  const filteredFleet = useMemo(() => {
    if (!searchTerm.trim()) return fleetData;
    const term = searchTerm.toLowerCase();
    return fleetData.filter(row => {
      const containerNo = String(row["CONTAINER_NUMBER"] || "").toLowerCase();
      const mfg = String(row["Mfg"] || "").toLowerCase();
      const location = String(row["Location Detail"] || "").toLowerCase();
      const category = String(row["Location_Category"] || "").toLowerCase();
      return containerNo.includes(term) || mfg.includes(term) || location.includes(term) || category.includes(term);
    });
  }, [fleetData, searchTerm]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-4 gap-4">
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
          <Database className="h-6 w-6 text-indigo-600" />
          <span>FLEET LOCATION DATABASE</span>
        </h2>
        <button
          onClick={fetchFleetData}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-all self-start md:self-auto"
        >
          Refresh Data
        </button>
      </div>

      {/* STRICT ADMIN-ONLY UPLOAD CONTROLS (Hidden completely from non-admin users) */}
      {isAdmin && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Bulk VLookup Location Sync (Admin Control)
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Upload movement spreadsheets to publish the master inventory globally to all users. <br/>
                <span className="font-bold text-amber-600">Note: Only containers in 'AWAITING' status will have active repair logs updated.</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <label className={`flex items-center space-x-2 px-5 py-2.5 bg-[#00966A] hover:bg-[#007A55] text-white rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer transition-all shadow-sm ${isUploadingExcel ? "opacity-50 pointer-events-none" : ""}`}>
              {isUploadingExcel ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              <span>{isUploadingExcel ? "PROCESSING..." : "UPLOAD EXCEL"}</span>
              <input type="file" accept=".xlsx, .xls, .csv" onChange={handleExcelVLookupUpload} className="hidden" disabled={isUploadingExcel} />
            </label>
          </div>
        </div>
      )}

      {uploadMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-medium flex items-center space-x-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{uploadMessage}</span>
        </div>
      )}

      {uploadError && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-sm font-medium flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* SEARCH BAR & FLEET TABLE SECTION - VISIBLE TO ALL USERS */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h3 className="font-extrabold text-slate-900 text-xs font-mono uppercase tracking-widest flex items-center space-x-2">
              <Database className="h-4 w-4 text-indigo-500" />
              <span>Shared Company Fleet Inventory</span>
            </h3>
            <p className="text-[10px] text-slate-500 mt-1 uppercase">
              Showing {filteredFleet.length} of {fleetData.length} total units
            </p>
          </div>

          {/* Search Bar for all users */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search container number, location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
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
                      <td className="p-3">{String(row["Mfg"] || "-")}</td>
                      <td className="p-3">{row["GAS_TYPE"] || "-"}</td>
                      <td className="p-3 text-[11px] truncate max-w-[150px]">{row["VOYAGE_NO"] || "-"}</td>
                      <td className="p-3">{String(row["DATE_TO"] || "-")}</td>
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
