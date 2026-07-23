// src/components/LocationTab.tsx
import React, { useState, useEffect } from "react";
import { FileSpreadsheet, Upload, CheckCircle2, AlertTriangle, Database, Loader2 } from "lucide-react";
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
  const [showFleet, setShowFleet] = useState(true);

  // Fetch the global fleet data from Firestore so everyone can see it
  useEffect(() => {
    const fetchFleetData = async () => {
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
        
        // Convert to JSON
        const data: any[] = XLSX.utils.sheet_to_json(ws);

        let updatedCount = 0;

        // Fetch all current Firestore requests to update WAITING containers only
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

        // Save the parsed JSON to Firestore so everyone can view the updated Fleet List
        await setDoc(doc(db, "app_data", "fleet_inventory"), {
          items: data,
          lastUpdated: new Date().toISOString()
        });
        
        setFleetData(data);
        setShowFleet(true);
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
    <div className="space-y-6 max-w-7xl mx-auto w-full pb-12">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
          <Database className="h-6 w-6 text-indigo-600" />
          <span>FLEET LOCATION DATABASE</span>
        </h2>
      </div>

      {/* Admin Only: Bulk VLookup Excel Upload Widget */}
      {isAdmin && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Bulk VLookup Location Sync
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Upload movement spreadsheets (e.g., 20 JULY 2026 Reefer Movement PSU and PRIMO.xlsx). <br/>
                <span className="font-bold text-amber-600">Note: Only containers in 'AWAITING' status will have their locations updated.</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {fleetData.length > 0 && (
              <button
                onClick={() => setShowFleet(!showFleet)}
                className="flex items-center space-x-2 px-5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border border-indigo-200"
              >
                <Database className="h-4 w-4" />
                <span>{showFleet ? "HIDE FLEET DATA" : "VIEW FLEET DATA"}</span>
              </button>
            )}
            <label className={`flex items-center space-x-2 px-5 py-2.5 bg-[#00966A] hover:bg-[#007A55] text-white rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer transition-all shadow-sm ${isUploadingExcel ? "opacity-50 pointer-events-none" : ""}`}>
              {isUploadingExcel ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              <span>{isUploadingExcel ? "PROCESSING..." : "UPLOAD EXCEL"}</span>
              <input type="file" accept=".xlsx, .xls, .csv" onChange={handleExcelVLookupUpload} className="hidden" disabled={isUploadingExcel} />
            </label>
          </div>
        </div>
      )}

      {uploadMessage && isAdmin && (
        <div className="p-4 bg-[#ECFDF5] border border-[#A7F3D0] text-[#047857] rounded-xl text-sm font-medium flex items-center space-x-2">
          <CheckCircle2 className="h-5 w-5 text-[#059669] shrink-0" />
          <span>{uploadMessage}</span>
        </div>
      )}

      {uploadError && isAdmin && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-sm font-medium flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Fleet Inventory Table Section - Visible to EVERYONE */}
      {isLoadingFleet ? (
        <div className="flex flex-col items-center justify-center p-12 text-slate-400 space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-xs font-mono uppercase tracking-widest">Loading Global Fleet Data...</p>
        </div>
      ) : showFleet && fleetData.length > 0 ? (
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm animate-in fade-in duration-300">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-extrabold text-slate-900 text-xs font-mono uppercase tracking-widest flex items-center space-x-2">
                <Database className="h-4 w-4 text-indigo-500" />
                <span>Company Fleet Database</span>
              </h3>
              <p className="text-[10px] text-slate-500 mt-1 uppercase">Showing {fleetData.length} total active units from latest sheet</p>
            </div>
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
      ) : (
        <div className="flex flex-col items-center justify-center p-12 text-slate-400 space-y-4 border-2 border-dashed border-slate-200 rounded-2xl">
          <Database className="h-8 w-8 text-slate-300" />
          <p className="text-xs font-mono uppercase tracking-widest">No Fleet Data Uploaded Yet</p>
        </div>
      )}
    </div>
  );
}
