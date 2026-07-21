import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Firebase Admin SDK initialization
import * as admin from "firebase-admin";

// Initialize Firebase Admin (uses GOOGLE_APPLICATION_CREDENTIALS env var or falls back to embedded config)
let db: any = null;

try {
  if (!admin.apps.length) {
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || "service-request-2e06e",
    });
  }
  db = admin.firestore();
  console.log("✓ Firebase Admin SDK initialized - Firestore connected");
} catch (err: any) {
  console.warn("⚠ Firebase Admin initialization warning:", err.message);
  console.warn("Falling back to file-based persistence. Set GOOGLE_APPLICATION_CREDENTIALS for cloud sync.");
}

import { 
  ServiceRequest, 
  RequestStatus, 
  LocationTeam, 
  PriorityLevel, 
  IssueCategory, 
  AuditLog 
} from "./src/types.js";

const app = express();
const PORT = 3000;

// Set high limits for image uploads
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));

// Initialize Gemini Client
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
} else {
  console.warn("WARNING: GEMINI_API_KEY environment variable is not set. AI OCR features will run in mock mode.");
}

// Persistence setup (fallback for when Firestore is unavailable)
const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "requests.json");

const INITIAL_MOCK_REQUESTS: ServiceRequest[] = [
  {
    id: "REQ-2026-001",
    containerNumber: "MSKU-491028-3",
    priority: PriorityLevel.HIGH,
    category: IssueCategory.REFRIGERATION_TELEMATICS,
    description: "Reefer temperature reading is fluctuating between -12°C and -4°C. Needs sensor calibration and coolant level check.",
    photoUrl: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=400",
    reporterName: "Alfon Pigome",
    timestamp: "2026-07-19T09:30:00Z",
    status: RequestStatus.IN_PROGRESS,
    location: LocationTeam.TIMIKA,
    updatedAt: "2026-07-19T11:00:00Z",
    auditLogs: [
      {
        id: "LOG-001",
        requestId: "REQ-2026-001",
        fromStatus: "NONE",
        toStatus: RequestStatus.WAITING,
        operator: "Alfon Pigome",
        location: LocationTeam.TIMIKA,
        timestamp: "2026-07-19T09:30:00Z",
        notes: "Initial service request submitted for reefer temperature control fluctuation."
      },
      {
        id: "LOG-002",
        requestId: "REQ-2026-001",
        fromStatus: RequestStatus.WAITING,
        toStatus: RequestStatus.IN_PROGRESS,
        operator: "Bambang Santoso",
        location: LocationTeam.SURABAYA,
        timestamp: "2026-07-19T11:00:00Z",
        notes: "Accepted by Surabaya Workshop. Technician assigned to coolant check and calibration."
      }
    ]
  },
  {
    id: "REQ-2026-002",
    containerNumber: "FUKU-610012-2",
    priority: PriorityLevel.URGENT,
    category: IssueCategory.STRUCTURAL,
    description: "Forklift collision dent on the front-right door pillar. Locking bar is misaligned, door cannot close securely.",
    photoUrl: "https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&q=80&w=400",
    reporterName: "Marcus Pigome",
    timestamp: "2026-07-20T08:15:00Z",
    status: RequestStatus.WAITING,
    location: LocationTeam.TIMIKA,
    updatedAt: "2026-07-20T08:15:00Z",
    auditLogs: [
      {
        id: "LOG-003",
        requestId: "REQ-2026-002",
        fromStatus: "NONE",
        toStatus: RequestStatus.WAITING,
        operator: "Marcus Pigome",
        location: LocationTeam.TIMIKA,
        timestamp: "2026-07-20T08:15:00Z",
        notes: "Urgent door pillar damage. Door remains unlatched."
      }
    ]
  },
  {
    id: "REQ-2026-003",
    containerNumber: "HLXU-198273-1",
    priority: PriorityLevel.LOW,
    category: IssueCategory.MECHANICAL,
    description: "Lashing ring inside section B4 is loose and weld has cracked. Needs re-welding.",
    photoUrl: "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&q=80&w=400",
    reporterName: "Alfon Pigome",
    timestamp: "2026-07-18T14:20:00Z",
    status: RequestStatus.DONE,
    location: LocationTeam.TIMIKA,
    updatedAt: "2026-07-19T10:15:00Z",
    repairPhotoUrl: "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&q=80&w=400",
    resolutionNotes: "Re-welded lashing ring using high-strength electrode. Weld seam stress-tested and certified ready for deployment.",
    auditLogs: [
      {
        id: "LOG-004",
        requestId: "REQ-2026-003",
        fromStatus: "NONE",
        toStatus: RequestStatus.WAITING,
        operator: "Alfon Pigome",
        location: LocationTeam.TIMIKA,
        timestamp: "2026-07-18T14:20:00Z",
        notes: "Loose interior lashing ring reported."
      },
      {
        id: "LOG-005",
        requestId: "REQ-2026-003",
        fromStatus: RequestStatus.WAITING,
        toStatus: RequestStatus.IN_PROGRESS,
        operator: "Bambang Santoso",
        location: LocationTeam.SURABAYA,
        timestamp: "2026-07-19T08:00:00Z",
        notes: "Unit queued for workshop welding."
      },
      {
        id: "LOG-006",
        requestId: "REQ-2026-003",
        fromStatus: RequestStatus.IN_PROGRESS,
        toStatus: RequestStatus.DONE,
        operator: "Hendra Wijaya",
        location: LocationTeam.SURABAYA,
        timestamp: "2026-07-19T10:15:00Z",
        notes: "Repair completed. Internal lashing ring re-welded and verified stable."
      }
    ]
  }
];

function loadRequestsSync(): ServiceRequest[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    let loaded: ServiceRequest[] = [];
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, "utf-8");
      loaded = JSON.parse(data);
    } else {
      fs.writeFileSync(DATA_FILE, JSON.stringify(INITIAL_MOCK_REQUESTS, null, 2), "utf-8");
      loaded = INITIAL_MOCK_REQUESTS;
    }
    return loaded.map((req) => ({
      ...req,
      containerNumber: req.containerNumber.toUpperCase().trim().replace(/[\s-]+/g, "-"),
    }));
  } catch (err) {
    console.error("Error reading database file, using in-memory fallback:", err);
    return INITIAL_MOCK_REQUESTS;
  }
}

function saveRequestsSync(data: ServiceRequest[]): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing database file:", err);
  }
}

// Initialize in-memory cache
let requestsCache: ServiceRequest[] = loadRequestsSync();

// Sync cache to Firestore on startup (if Firestore is available)
async function syncCacheToFirestore() {
  if (!db) {
    console.log("Firestore not available - using local file storage only");
    return;
  }

  try {
    console.log("Syncing local cache to Firestore...");
    const batch = db.batch();
    
    for (const req of requestsCache) {
      const docRef = db.collection("requests").doc(req.id);
      batch.set(docRef, req, { merge: true });
    }
    
    await batch.commit();
    console.log("✓ Sync complete: " + requestsCache.length + " requests pushed to Firestore");
  } catch (err: any) {
    console.warn("⚠ Firestore sync warning:", err.message);
  }
}

// --- API Routes ---

// Get all requests (from cache, synced from Firestore)
app.get("/api/requests", (req, res) => {
  res.json(requestsCache);
});

// Create a service request (submitted from Timika)
app.post("/api/requests", async (req, res) => {
  try {
    const { containerNumber, priority, category, description, photoUrl, reporterName } = req.body;

    if (!containerNumber || !priority || !category || !description || !reporterName) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const numericIds = requestsCache
      .map((r) => {
        const match = r.id.match(/REQ-2026-(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((val) => !isNaN(val));
    const nextNum = numericIds.length > 0 ? Math.max(...numericIds) + 1 : 1;
    const newId = `REQ-2026-${String(nextNum).padStart(3, "0")}`;
    const timestamp = new Date().toISOString();

    const newRequest: ServiceRequest = {
      id: newId,
      containerNumber: containerNumber.toUpperCase().trim().replace(/[\s-]+/g, "-"),
      priority: priority as PriorityLevel,
      category: category as IssueCategory,
      description,
      photoUrl: photoUrl || "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=400",
      reporterName,
      timestamp,
      status: RequestStatus.WAITING,
      location: LocationTeam.TIMIKA,
      updatedAt: timestamp,
      auditLogs: [
        {
          id: `LOG-${Date.now()}-001`,
          requestId: newId,
          fromStatus: "NONE",
          toStatus: RequestStatus.WAITING,
          operator: reporterName,
          location: LocationTeam.TIMIKA,
          timestamp,
          notes: "Initial service request submitted by field technician in Timika."
        }
      ]
    };

    // 1. Update cache
    requestsCache.unshift(newRequest);
    
    // 2. Save to local file (backup)
    saveRequestsSync(requestsCache);

    // 3. Write to Firestore (async, non-blocking)
    if (db) {
      db.collection("requests").doc(newId).set(newRequest).catch((err: any) => {
        console.warn("Firestore write warning for " + newId + ":", err.message);
      });
    }

    res.status(201).json(newRequest);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update status (transitioned by Surabaya or Timika depending on action)
app.post("/api/requests/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, operator, location, notes, repairPhotoUrl, resolutionNotes, cancellationReason } = req.body;

    if (!status || !operator || !location) {
      return res.status(400).json({ error: "Missing status, operator or location in request body" });
    }

    const requestIndex = requestsCache.findIndex((r) => r.id === id);
    if (requestIndex === -1) {
      return res.status(404).json({ error: "Request not found" });
    }

    const request = requestsCache[requestIndex];
    const oldStatus = request.status;
    const timestamp = new Date().toISOString();

    // Enforce strict geographical and role permissions
    if (location === LocationTeam.TIMIKA) {
      if (status === RequestStatus.IN_PROGRESS || status === RequestStatus.DONE) {
        return res.status(403).json({ error: "Unauthorized: Timika port inspectors cannot modify or advance workshop repair jobs." });
      }
    } else if (location === LocationTeam.SURABAYA) {
      if (oldStatus === RequestStatus.DONE && status !== RequestStatus.DONE) {
        return res.status(403).json({ error: "Unauthorized: Completed jobs are certified and locked in the ledger." });
      }
    }

    // Specific validation based on state transitions
    if (status === RequestStatus.DONE) {
      if (!resolutionNotes) {
        return res.status(400).json({ error: "Resolution notes are required to complete a request." });
      }
      request.resolutionNotes = resolutionNotes;
      if (repairPhotoUrl) {
        request.repairPhotoUrl = repairPhotoUrl;
      }
    } else if (status === RequestStatus.CANCELLED) {
      if (!cancellationReason) {
        return res.status(400).json({ error: "Cancellation reason is required to cancel a request." });
      }
      request.cancellationReason = cancellationReason;
    }

    // Update main model
    request.status = status as RequestStatus;
    request.updatedAt = timestamp;

    // Append Audit Log
    const auditLog: AuditLog = {
      id: `LOG-${Date.now()}`,
      requestId: id,
      fromStatus: oldStatus,
      toStatus: status as RequestStatus,
      operator,
      location: location as LocationTeam,
      timestamp,
      notes: notes || `Status changed from ${oldStatus} to ${status}.`
    };

    request.auditLogs.push(auditLog);
    requestsCache[requestIndex] = request;

    // 1. Save to local file (backup)
    saveRequestsSync(requestsCache);

    // 2. Write to Firestore (async, non-blocking)
    if (db) {
      db.collection("requests").doc(id).set(request).catch((err: any) => {
        console.warn("Firestore update warning for " + id + ":", err.message);
      });
    }

    res.json(request);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// AI OCR container number extraction using Gemini 3.5 Flash Multimodal Vision
app.post("/api/ocr", async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: "Image data is required" });
    }

    // Handle dummy/mock fallback if key is not set
    if (!ai) {
      console.log("No Gemini API key configured, falling back to mock OCR.");
      const codes = ["MSKU 928310 4", "TGBU 821345 9", "HLXU 198273 1", "SUDU 382910 2", "HDMU 749201 0"];
      const randomCode = codes[Math.floor(Math.random() * codes.length)];
      return res.json({ containerNumber: randomCode, mock: true });
    }

    let base64Data = image;
    let mimeType = "image/jpeg";
    if (image.startsWith("data:")) {
      const matches = image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.*)$/);
      if (matches && matches.length === 3) {
        mimeType = matches[1];
        base64Data = matches[2];
      }
    }

    const imagePart = {
      inlineData: {
        mimeType,
        data: base64Data,
      },
    };

    const textPart = {
      text: `Identify the ISO 6346 Shipping Container Number printed on this container. 
A standard container number has 4 letters (owner code + category identifier, e.g., 'FUKU', 'MSKU', 'TGBU') followed by a hyphen, then 6 digits, and finally 1 check digit (e.g. FUKU-610012-2, MSKU[...]

Look carefully at the image for vertical or horizontal text printed on the doors or sides. 
Respond with ONLY the exact, standardized container number formatted with hyphens/dashes (e.g., 'FUKU-610012-2'). 
If there is no container number visible or you are highly unsure, reply with ONLY 'NOT_FOUND'. 
Do not include any other text, markdown, or explanation.`,
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts: [imagePart, textPart] },
    });

    const resultText = response.text ? response.text.trim() : "NOT_FOUND";
    console.log("Gemini OCR response:", resultText);

    res.json({ containerNumber: resultText === "NOT_FOUND" ? "" : resultText });
  } catch (err: any) {
    console.error("Gemini OCR Error:", err);
    res.status(500).json({ error: `AI OCR failed: ${err.message}` });
  }
});

// Start server and handle production vs dev assets
async function startServer() {
  // Sync to Firestore on startup
  await syncCacheToFirestore();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`PT. PANJASA-INTRADIN Service Request server is running on http://localhost:${PORT}`);
  });
}

startServer();
