import React, { useState, useEffect, useMemo, ChangeEvent } from 'react';
import { 
  MapPin, 
  Upload, 
  Search, 
  AlertTriangle, 
  Database, 
  FileSpreadsheet, 
  ShieldCheck,
  RefreshCw 
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  getDocs, 
  writeBatch 
} from 'firebase/firestore';
import { db } from '../firebase';
import { FleetItem, RepairItem } from '../types/fleet';

interface LocationTabProps {
  currentUserEmail: string;
}

export const LocationTab: React.FC<LocationTabProps> = ({ currentUserEmail }) => {
  const isAdmin = currentUserEmail === 'mpigome44@gmail.com';

  const [fleetData, setFleetData] = useState<FleetItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [uploadMessage, setUploadMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchFleetData = async () => {
    setLoading(true);
    try {
      const docRef = doc(db, 'app_data', 'fleet_inventory');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data && Array.isArray(data.items)) {
          setFleetData(data.items);
        }
      }
    } catch (error) {
      console.error('Error fetching fleet inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFleetData();
  }, []);

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSyncing(true);
    setUploadMessage(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const wsname = workbook.SheetNames[0];
        const ws = workbook.Sheets[wsname];
        
        // Convert to array of arrays to find the actual header row dynamically
        const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });
        
        let headerRowIndex = 0;
        for (let i = 0; i < rows.length; i++) {
          const rowStr = JSON.stringify(rows[i]);
          if (rowStr.includes('CONTAINER_NUMBER')) {
            headerRowIndex = i;
            break;
          }
        }

        // Re-parse sheet starting from the correct header row
        const rawData = XLSX.utils.sheet_to_json<FleetItem>(ws, { range: headerRowIndex });

        if (!rawData || rawData.length === 0) {
          throw new Error('Spreadsheet contains no valid records after the header row.');
        }

        // 1. Save global inventory JSON array to Firestore
        const fleetDocRef = doc(db, 'app_data', 'fleet_inventory');
        await setDoc(fleetDocRef, { 
          items: rawData, 
          updatedAt: new Date().toISOString(),
          updatedBy: currentUserEmail 
        });

        // 2. Perform Automated VLookup & Status Guardrail on Repair Pipelines
        const repairsRef = collection(db, 'repairs');
        const repairSnap = await getDocs(repairsRef);
        const batch = writeBatch(db);
        let updateCount = 0;

        const locationMap = new Map<string, string>();
        rawData.forEach((row) => {
          const containerNo = String(row.CONTAINER_NUMBER || '').trim().toUpperCase();
          const locationDetail = String(row['Location Detail'] || row.location_detail || '').trim();
          if (containerNo) {
            locationMap.set(containerNo, locationDetail);
          }
        });

        repairSnap.forEach((repairDoc) => {
          const repairData = repairDoc.data() as RepairItem;
          const containerNum = String(repairData.containerNumber || '').trim().toUpperCase();
          const currentStatus = repairData.status;

          if (currentStatus === 'WAITING' && locationMap.has(containerNum)) {
            const newLocation = locationMap.get(containerNum);
            batch.update(repairDoc.ref, { locationDetail: newLocation });
            updateCount++;
          }
        });

        await batch.commit();

        setFleetData(rawData);
        setUploadMessage({ 
          type: 'success', 
          text: `Successfully synced inventory matrix! Updated ${updateCount} active 'WAITING' repair pipeline records.` 
        });
      } catch (error: any) {
        console.error('Error processing spreadsheet:', error);
        setUploadMessage({ type: 'error', text: `Failed to process file: ${error.message}` });
      } finally {
        setSyncing(false);
        e.target.value = '';
      }
    };

    reader.readAsBinaryString(file);
  };

  const filteredFleet = useMemo(() => {
    return fleetData.filter((item) => {
      const containerNo = String(item.CONTAINER_NUMBER || '').toLowerCase();
      const matchesSearch = containerNo.includes(searchTerm.toLowerCase()) || 
                            String(item.Mfg || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'ALL' || String(item.Location_Category || '') === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [fleetData, searchTerm, selectedCategory]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    fleetData.forEach((item) => {
      if (item.Location_Category) cats.add(String(item.Location_Category));
    });
    return Array.from(cats);
  }, [fleetData]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200 gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-600 font-semibold text-sm uppercase tracking-wider">
            <MapPin className="w-4 h-4" /> Port Connect Infrastructure
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Fleet Location & VLookup Inventory Sync</h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time tracking and automated movement report synchronization across Timika, Surabaya, and Jakarta hubs.
          </p>
        </div>

        <button 
          onClick={fetchFleetData} 
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors shadow-xs"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {isAdmin ? (
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-2xl shadow-md border border-slate-700 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                Admin Movement Spreadsheet Importer
                <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-400/30 flex items-center gap-1 font-normal">
                  <ShieldCheck className="w-3 h-3" /> Admin Authorized
                </span>
              </h2>
              <p className="text-xs text-slate-400">Upload REEFER MOVEMENT (.xlsx, .xls) files directly. Auto-detects table headers.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
            <label className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl cursor-pointer transition-all shadow-sm ${syncing ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <Upload className="w-4 h-4" />
              {syncing ? 'Processing & Syncing...' : 'Upload Movement Report'}
              <input 
                type="file" 
                accept=".xlsx, .xls, .csv" 
                className="hidden" 
                onChange={handleFileUpload} 
                disabled={syncing}
              />
            </label>
            <div className="text-xs text-slate-400">
              * Guardrail Active: Automatically syncs location details exclusively for containers in <span className="text-amber-400 font-semibold">WAITING</span> status.
            </div>
          </div>

          {uploadMessage && (
            <div className={`p-4 rounded-xl text-sm flex items-center gap-2 ${uploadMessage.type === 'success' ? 'bg-emerald-900/50 text-emerald-200 border border-emerald-500/30' : 'bg-rose-900/50 text-rose-200 border border-rose-500/30'}`}>
              {uploadMessage.type === 'success' ? <ShieldCheck className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
              {uploadMessage.text}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center gap-3 text-amber-800 text-sm">
          <ShieldCheck className="w-5 h-5 shrink-0 text-amber-600" />
          <span><strong>Read-Only Mode:</strong> File upload capabilities are restricted to system administrators.</span>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search Container No or Mfg..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <span className="text-xs text-slate-500 font-medium">Category:</span>
            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="ALL">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
              <p className="text-sm font-medium">Loading company fleet database...</p>
            </div>
          ) : filteredFleet.length === 0 ? (
            <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <Database className="w-8 h-8 text-slate-300" />
              <p className="text-sm font-medium">No fleet inventory records found.</p>
              <p className="text-xs text-slate-400">Admin must upload a valid movement report spreadsheet to initialize database.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">No</th>
                  <th className="py-3 px-4">Container Number</th>
                  <th className="py-3 px-4">Mfg</th>
                  <th className="py-3 px-4">Gas Type</th>
                  <th className="py-3 px-4">Voyage No</th>
                  <th className="py-3 px-4">Date To</th>
                  <th className="py-3 px-4">Diff Day</th>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Location Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm text-slate-700">
                {filteredFleet.map((item, idx) => {
                  const diffDayNum = Number(item["Diff Day"]) || 0;
                  const isHighDiff = diffDayNum > 50;

                  return (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 text-slate-500">{item.NO || idx + 1}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900 font-mono">{item.CONTAINER_NUMBER || '-'}</td>
                      <td className="py-3 px-4">{String(item.Mfg || '-')}</td>
                      <td className="py-3 px-4">{item.GAS_TYPE || '-'}</td>
                      <td className="py-3 px-4 font-mono text-xs">{item.VOYAGE_NO || '-'}</td>
                      <td className="py-3 px-4 text-xs">{String(item.DATE_TO || '-')}</td>
                      <td className="py-3 px-4 font-mono">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${isHighDiff ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-slate-100 text-slate-700'}`}>
                          {isHighDiff && <AlertTriangle className="w-3 h-3 text-rose-600" />}
                          {item["Diff Day"] ?? '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4">{item.Product_ || '-'}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium border border-blue-100">
                          {item.Location_Category || '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">{item["Location Detail"] || item.location_detail || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex justify-between items-center text-xs text-slate-500">
          <span>Showing {filteredFleet.length} of {fleetData.length} total units</span>
          <span className="font-medium text-slate-600">PT. Panjasa-Intradin Port Connect Infrastructure</span>
        </div>
      </div>
    </div>
  );
};
