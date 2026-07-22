import React, { useState, useEffect, useRef } from "react";
import { ServiceRequest, RequestStatus, LocationTeam, PriorityLevel, IssueCategory } from "./types.js";
import Header from "./components/Header.js";
import TimikaForm from "./components/TimikaForm.js";
import SurabayaDashboard from "./components/SurabayaDashboard.js";
import JakartaDashboard from "./components/JakartaDashboard.js";
import AuditTrailModal from "./components/AuditTrailModal.js";
import { 
  ClipboardList, 
  BarChart3, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Info,
  Lock,
  UserCheck,
  FileSpreadsheet,
  Printer,
  Database,
  Search,
  History,
  LayoutDashboard,
  Filter,
  FileText,
  Trash2
} from "lucide-react";
import { locales } from "./locales.js";

// Firebase Integration imports
import { db, auth } from "./firebase.js";
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User as FirebaseUser
} from "firebase/auth";
import { 
  collection, 
  doc, 
  getDoc, 
  onSnapshot, 
  setDoc, 
  query, 
  orderBy,
  deleteDoc
} from "firebase/firestore";

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

// Helper to compress/resize images below Firestore 1MB limit
const compressImage = (base64Str: string, maxWidth = 800, quality = 0.6): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
  });
};

export default function App() {
  // Localization state (Durable persistence)
  const [language, setLanguage] = useState<"ENG" | "IND">(() => {
    const saved = localStorage.getItem("lang");
    return (saved === "IND" || saved === "ENG") ? saved : "ENG";
  });

  const t = locales[language];

  // Top-Level Navigation State ("dashboard" vs "in-progress" vs "history")
  const [currentTab, setCurrentTab] = useState<"dashboard" | "in-progress" | "history">("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "DONE" | "CANCELLED">("ALL");

  // Firebase Auth & setup states
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  // Normal login/signup configuration (including Signature Capture)
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [signupFirstName, setSignupFirstName] = useState("");
  const [signupLastName, setSignupLastName] = useState("");
  const [signupLocation, setSignupLocation] = useState<LocationTeam>(LocationTeam.TIMIKA);
  const [signatureInput, setSignatureInput] = useState("");

  // Role switching configuration
  const [currentRole, setCurrentRole] = useState<LocationTeam | "Admin">("Admin");
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isRegisteringRef = useRef(false);

  // Direct Mobile Photo Upload States
  const [isMobileScanning, setIsMobileScanning] = useState(false);
  const [mobileScanStatus, setMobileScanStatus] = useState<string | null>(null);
  const [mobileScanError, setMobileScanError] = useState<string | null>(null);
  const [prefilledContainerNumber, setPrefilledContainerNumber] = useState("");
  const [prefilledPhoto, setPrefilledPhoto] = useState<string | null>(null);

  // Authenticated technician state (Mapped local profile)
  const [loggedInUser, setLoggedInUser] = useState<{ name: string; location: LocationTeam; email?: string; signature?: string } | null>(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });

  const timikaTechs = ["Anis Matta", "Yoppy Kogoya", "Eko Tabuni", "Custom Name"];
  const surabayaTechs = ["Bambang Santoso", "Hendra Wijaya", "Syarifuddin", "Custom Name"];
  const jakartaTechs = ["Dimas Prasetyo", "Siti Nurhayati", "Custom Name"];

  // Error logging function required by firebase-integration skill
  const handleFirestoreError = (err: unknown, operationType: OperationType, path: string | null) => {
    const errInfo: FirestoreErrorInfo = {
      error: err instanceof Error ? err.message : String(err),
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified,
        isAnonymous: auth.currentUser?.isAnonymous,
      },
      operationType,
      path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    setError(`Firebase Error: ${errInfo.error}`);
    throw new Error(JSON.stringify(errInfo));
  };

  // Listen to Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        if (isRegisteringRef.current) {
          setAuthChecking(false);
          return;
        }

        // 1. Instant visual feedback: load existing localStorage cache if available
        const savedUserStr = localStorage.getItem("user");
        let loadedFromCache = false;
        if (savedUserStr) {
          try {
            const savedUser = JSON.parse(savedUserStr);
            if (savedUser && savedUser.name && savedUser.location) {
              setLoggedInUser(savedUser);
              if (user.email === "mpigome44@gmail.com") {
                setCurrentRole("Admin");
              } else {
                setCurrentRole(savedUser.location);
              }
              loadedFromCache = true;
            }
          } catch (e) {
            console.warn("Invalid localStorage cache format", e);
          }
        }

        // 2. Fallback default profile if cache is not available, so we never block or get stuck
        if (!loadedFromCache) {
          const isAdmin = user.email === "mpigome44@gmail.com";
          const defaultName = isAdmin ? "Mark Pigome" : (user.displayName || user.email?.split("@")[0] || "Operator");
          const defaultLoc = isAdmin ? LocationTeam.TIMIKA : LocationTeam.TIMIKA;
          const defaultProfile = { 
            name: defaultName, 
            location: defaultLoc, 
            email: user.email || "", 
            signature: isAdmin ? "M.PIGOME" : "" 
          };
          setLoggedInUser(defaultProfile);
          if (isAdmin) {
            setCurrentRole("Admin");
          } else {
            setCurrentRole(defaultLoc);
          }
        }

        // Unblock UI immediately so the portal opens right away!
        setAuthChecking(false);

        // 3. Fetch actual profile in the background
        try {
          const userDocRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            const profile = docSnap.data();
            const loggedIn = { 
              name: profile.name, 
              location: profile.location as LocationTeam, 
              email: user.email || "",
              signature: profile.signature || ""
            };
            setLoggedInUser(loggedIn);
            localStorage.setItem("user", JSON.stringify(loggedIn));
            if (user.email === "mpigome44@gmail.com") {
              setCurrentRole("Admin");
            } else {
              setCurrentRole(profile.location as LocationTeam);
            }
          } else {
            // Profile doesn't exist yet (e.g., first-time Google/Email sign-up completed in background)
            const isAdmin = user.email === "mpigome44@gmail.com";
            const defaultName = isAdmin ? "Mark Pigome" : (user.displayName || user.email?.split("@")[0] || "Operator");
            const defaultLoc = LocationTeam.TIMIKA;
            const defaultProfile = { 
              name: defaultName, 
              location: defaultLoc, 
              email: user.email || "", 
              signature: isAdmin ? "M.PIGOME" : "" 
            };
            
            try {
              await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                name: defaultName,
                location: defaultLoc,
                email: user.email || "",
                signature: isAdmin ? "M.PIGOME" : ""
              });
            } catch (writeErr) {
              console.warn("Failed to create profile in Firestore (offline), using local defaults:", writeErr);
            }

            setLoggedInUser(defaultProfile);
            localStorage.setItem("user", JSON.stringify(defaultProfile));
            if (isAdmin) {
              setCurrentRole("Admin");
            } else {
              setCurrentRole(defaultLoc);
            }
          }
        } catch (err: any) {
          console.warn("Firestore profile fetch notice (offline fallback active):", err.message || err);
        }
      } else {
        setLoggedInUser(null);
        localStorage.removeItem("user");
        setAuthChecking(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to real-time updates from Firestore
  useEffect(() => {
    if (!firebaseUser) {
      setRequests([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const q = query(collection(db, "requests"), orderBy("timestamp", "desc"));
    
    // Safety timeout: if Firestore takes too long (e.g., 3.5 seconds) to return the initial snapshot,
    // unblock the UI so the user can operate in offline fallback or cached mode.
    const timeoutId = setTimeout(() => {
      setIsLoading(false);
    }, 3500);

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      clearTimeout(timeoutId);
      let data: ServiceRequest[] = [];
      snapshot.forEach((docSnap) => {
        data.push(docSnap.data() as ServiceRequest);
      });
      
      setRequests(data);
      if (selectedRequest) {
        const updated = data.find((r) => r.id === selectedRequest.id);
        if (updated) {
          setSelectedRequest(updated);
        }
      }
      setIsLoading(false);
      setError(null);
    }, (err) => {
      clearTimeout(timeoutId);
      try {
        handleFirestoreError(err, OperationType.LIST, "requests");
      } catch (e) {
        console.warn("Handled snapshot subscription error:", e);
      }
      setIsLoading(false);
    });

    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [firebaseUser, selectedRequest]);

  // Handle Firebase Email/Password Sign In
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    if (!emailInput || !passwordInput) {
      setAuthError("Email and Password are required.");
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, emailInput.trim(), passwordInput);
      setAuthSuccess("Successfully logged in!");
    } catch (err: any) {
      const isTargetAdmin = emailInput.trim().toLowerCase() === "mpigome44@gmail.com" && 
                            (passwordInput === "admintim" || passwordInput === "admtim");

      if (isTargetAdmin && (err.code === "auth/user-not-found" || err.message?.includes("user-not-found") || err.code === "auth/invalid-credential" || err.message?.includes("invalid-credential"))) {
        // Auto register admin if not found or password mismatch on first run
        try {
          isRegisteringRef.current = true;
          const userCredential = await createUserWithEmailAndPassword(auth, emailInput.trim().toLowerCase(), passwordInput);
          const user = userCredential.user;
          const newUser = { name: "Mark Pigome", location: LocationTeam.TIMIKA, email: "mpigome44@gmail.com", signature: "M.PIGOME" };
          
          await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            name: "Mark Pigome",
            location: LocationTeam.TIMIKA,
            email: "mpigome44@gmail.com",
            signature: "M.PIGOME"
          });
          
          setLoggedInUser(newUser);
          localStorage.setItem("user", JSON.stringify(newUser));
          setCurrentRole("Admin");
          isRegisteringRef.current = false;
          setAuthSuccess("Admin account automatically provisioned and authenticated!");
          return;
        } catch (signUpErr: any) {
          isRegisteringRef.current = false;
          setAuthError(signUpErr.message || "Failed to auto-create Admin account.");
          return;
        }
      }
      setAuthError(err.message || "Failed to sign in. Please check credentials.");
    }
  };

  // Handle Firebase Email/Password Registration (Sign Up with signature)
  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    if (!emailInput || !passwordInput) {
      setAuthError("Email and Password are required to register.");
      return;
    }
    if (!signupFirstName.trim() || !signupLastName.trim()) {
      setAuthError("Full Name is required to register.");
      return;
    }
    const fullName = `${signupFirstName.trim()} ${signupLastName.trim()}`;
    try {
      isRegisteringRef.current = true;
      // 1. Create the Auth User
      const userCredential = await createUserWithEmailAndPassword(auth, emailInput.trim(), passwordInput);
      const user = userCredential.user;

      // 2. Build the User Session profile state
      const newUser = {
        name: fullName,
        firstName: signupFirstName.trim(),
        lastName: signupLastName.trim(),
        location: signupLocation,
        email: emailInput.trim().toLowerCase(),
        signature: signatureInput.trim()
      };

      // 3. Immediately set state and localStorage so the user can access the portal instantly
      setLoggedInUser(newUser);
      localStorage.setItem("user", JSON.stringify(newUser));
      if (emailInput.trim().toLowerCase() === "mpigome44@gmail.com") {
        setCurrentRole("Admin");
      } else {
        setCurrentRole(signupLocation);
      }

      // Unblock auth gate state
      isRegisteringRef.current = false;
      setAuthChecking(false);

      // 4. Create the User Profile doc in Firestore in the background
      setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name: fullName,
        firstName: signupFirstName.trim(),
        lastName: signupLastName.trim(),
        location: signupLocation,
        email: emailInput.trim().toLowerCase(),
        signature: signatureInput.trim()
      }).catch((writeErr: any) => {
        console.warn("Resilient non-blocking warning: Failed to sync profile to Firestore database:", writeErr);
      });

      setAuthSuccess("Account successfully created and authenticated!");
    } catch (err: any) {
      isRegisteringRef.current = false;
      setAuthError(err.message || "Failed to create account.");
    }
  };

  // Handle Firebase Google Sign In
  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setAuthSuccess(null);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      setAuthSuccess("Logged in with Google!");
    } catch (err: any) {
      setAuthError(err.message || "Failed to authenticate with Google.");
    }
  };

  // Handle Logout from Firebase and local profile
  const handleLogOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Firebase signOut failed:", err);
    }
    setLoggedInUser(null);
    localStorage.removeItem("user");
    setCurrentRole("Admin");
  };

  // Toggle Language
  const toggleLanguage = () => {
    const next = language === "ENG" ? "IND" : "ENG";
    setLanguage(next);
    localStorage.setItem("lang", next);
  };

  // Direct Mobile Photo Upload Trigger (No AI Analysis)
  const handleMobileScanImage = async (base64Data: string) => {
    setIsMobileScanning(true);
    setMobileScanError(null);
    
    // Compress image to prevent Firestore 1MB limits
    const compressedPhoto = await compressImage(base64Data);
    
    if (currentRole === LocationTeam.SURABAYA || currentRole === LocationTeam.JAKARTA) {
      // In Surabaya or Jakarta mode: Attach completion photo to the currently selected active ticket
      if (selectedRequest && (selectedRequest.status === RequestStatus.WAITING || selectedRequest.status === RequestStatus.IN_PROGRESS)) {
        setMobileScanStatus(language === "ENG" ? `Attaching completion photo to ${selectedRequest.id}...` : `Melampirkan foto selesai ke ${selectedRequest.id}...`);
        
        handleStatusUpdate(selectedRequest.id, {
          status: RequestStatus.DONE,
          operator: loggedInUser?.name || "Workshop Technician",
          location: currentRole as LocationTeam,
          notes: "Repair completed with direct mobile photo upload.",
          resolutionNotes: "Structural repair / maintenance completed and verified via mobile photo.",
          repairPhotoUrl: compressedPhoto
        });
        
        setMobileScanStatus(language === "ENG" ? `Success! Photo attached and ${selectedRequest.id} marked as DONE.` : `Sukses! Foto terlampir & ${selectedRequest.id} selesai.`);
      } else {
        setMobileScanError(
          language === "ENG" 
            ? "Please click an active ticket from the list first before capturing a repair completion photo!" 
            : "Silakan klik tiket aktif dari daftar terlebih dahulu sebelum mengambil foto penyelesaian!"
        );
      }
    } else {
      // In Timika / Admin mode: Instantly attach to the intake form
      setPrefilledPhoto(compressedPhoto);
      setMobileScanStatus(language === "ENG" ? "Photo Attached! Please fill in the container details below." : "Foto Terlampir! Silakan lengkapi detail kontainer di bawah.");
      
      setTimeout(() => {
        const el = document.getElementById("form-container-number");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.focus();
        }
      }, 300);
    }

    setTimeout(() => {
      setIsMobileScanning(false);
    }, 3500);
  };

  // Handle Firestore Request Submission (passed to TimikaForm)
  const handleCreateRequest = async (payload: {
    containerNumber: string;
    priority: PriorityLevel;
    category: IssueCategory;
    description: string;
    photoUrl: string | null;
    reporterName: string;
    destinationLocation?: LocationTeam;
  }) => {
    try {
      const numericIds = requests
        .map((r) => {
          const match = r.id.match(/REQ-2026-(\d+)/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter((val) => !isNaN(val));
      const nextNum = numericIds.length > 0 ? Math.max(...numericIds) + 1 : 1;
      const newId = `REQ-2026-${String(nextNum).padStart(3, "0")}`;
      
      const targetLocation = payload.destinationLocation || LocationTeam.SURABAYA;
      const timestamp = new Date().toISOString();

      // Compress photo if provided to ensure it stays below 1 MB
      let finalPhotoUrl = payload.photoUrl;
      if (finalPhotoUrl && finalPhotoUrl.startsWith("data:image")) {
        finalPhotoUrl = await compressImage(finalPhotoUrl);
      }

      const newRequest: ServiceRequest = {
        id: newId,
        containerNumber: payload.containerNumber.toUpperCase().trim().replace(/[\s-]+/g, "-"),
        priority: payload.priority,
        category: payload.category,
        description: payload.description,
        photoUrl: finalPhotoUrl,
        reporterName: payload.reporterName,
        timestamp,
        status: RequestStatus.WAITING,
        location: targetLocation, // Routes specifically to Surabaya or Jakarta
        updatedAt: timestamp,
        auditLogs: [
          {
            id: `LOG-${Date.now()}-001`,
            requestId: newId,
            fromStatus: "NONE",
            toStatus: RequestStatus.WAITING,
            operator: payload.reporterName,
            location: LocationTeam.TIMIKA,
            timestamp,
            notes: `Initial service request submitted by field technician in Timika, routed to ${targetLocation}.`
          }
        ]
      };

      await setDoc(doc(db, "requests", newId), newRequest);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, `requests/${payload.containerNumber}`);
    }
  };

  // Handle status update (Commenced by Surabaya/Jakarta workshop or cancelled)
  const handleStatusUpdate = async (
    id: string,
    updatePayload: {
      status: RequestStatus;
      operator: string;
      location: LocationTeam;
      notes?: string;
      repairPhotoUrl?: string;
      resolutionNotes?: string;
      cancellationReason?: string;
    }
  ) => {
    try {
      const request = requests.find((r) => r.id === id);
      if (!request) throw new Error("Request not found");

      const oldStatus = request.status;
      const timestamp = new Date().toISOString();

      // Enforce strict geographical and role permissions
      if (updatePayload.location === LocationTeam.TIMIKA) {
        if (updatePayload.status === RequestStatus.IN_PROGRESS || updatePayload.status === RequestStatus.DONE) {
          throw new Error("Unauthorized: Timika port inspectors cannot modify or advance workshop repair jobs.");
        }
      } else if (updatePayload.location === LocationTeam.SURABAYA || updatePayload.location === LocationTeam.JAKARTA) {
        if (oldStatus === RequestStatus.DONE && updatePayload.status !== RequestStatus.DONE) {
          throw new Error("Unauthorized: Completed jobs are certified and locked in the ledger.");
        }
      }

      const updatedRequest = { ...request };

      // Compress repair photo if provided
      let finalRepairPhoto = updatePayload.repairPhotoUrl;
      if (finalRepairPhoto && finalRepairPhoto.startsWith("data:image")) {
        finalRepairPhoto = await compressImage(finalRepairPhoto);
      }

      // Specific validation based on state transitions
      if (updatePayload.status === RequestStatus.DONE) {
        if (!updatePayload.resolutionNotes) {
          throw new Error("Resolution notes are required to complete a request.");
        }
        updatedRequest.resolutionNotes = updatePayload.resolutionNotes;
        if (finalRepairPhoto) {
          updatedRequest.repairPhotoUrl = finalRepairPhoto;
        }
      } else if (updatePayload.status === RequestStatus.CANCELLED) {
        if (!updatePayload.cancellationReason) {
          throw new Error("Cancellation reason is required to cancel a request.");
        }
        updatedRequest.cancellationReason = updatePayload.cancellationReason;
      }

      // Update main model
      updatedRequest.status = updatePayload.status;
      updatedRequest.updatedAt = timestamp;

      // Append Audit Log
      const auditLog = {
        id: `LOG-${Date.now()}`,
        requestId: id,
        fromStatus: oldStatus,
        toStatus: updatePayload.status,
        operator: loggedInUser ? loggedInUser.name : updatePayload.operator,
        location: updatePayload.location,
        timestamp,
        notes: updatePayload.notes || `Status changed from ${oldStatus} to ${updatePayload.status}.`
      };

      updatedRequest.auditLogs = [...updatedRequest.auditLogs, auditLog];

      await setDoc(doc(db, "requests", id), updatedRequest);
    } catch (err: any) {
      alert(`Status update failed: ${err.message}`);
    }
  };

  // Interactive Edit & Delete Handlers for Admin Role
  const handleDeleteRequest = async (id: string) => {
    if (window.confirm(language === "ENG" ? "Are you sure you want to delete this service request?" : "Apakah Anda yakin ingin menghapus permintaan layanan ini?")) {
      try {
        await deleteDoc(doc(db, "requests", id));
        setSelectedRequest(null); // Closes modal instantly
      } catch (err: any) {
        alert(`Delete failed: ${err.message}`);
      }
    }
  };

  const handleUpdateRequest = async (id: string, updatedFields: Partial<ServiceRequest>) => {
    try {
      const docRef = doc(db, "requests", id);
      const request = requests.find((r) => r.id === id);
      if (!request) return;

      const timestamp = new Date().toISOString();
      const updated = {
        ...request,
        ...updatedFields,
        updatedAt: timestamp,
      };

      const changes = Object.keys(updatedFields)
        .map((key) => `${key}: ${(updatedFields as any)[key]}`)
        .join(", ");

      const auditLog = {
        id: `LOG-${Date.now()}`,
        requestId: id,
        fromStatus: request.status,
        toStatus: updatedFields.status || request.status,
        operator: loggedInUser ? loggedInUser.name : "Admin",
        location: loggedInUser ? loggedInUser.location : LocationTeam.SURABAYA,
        timestamp,
        notes: `Admin manually updated details: ${changes}.`
      };

      updated.auditLogs = [...updated.auditLogs, auditLog];

      await setDoc(docRef, updated);
      setSelectedRequest(updated);
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    }
  };

  // Printing state
  const [printData, setPrintData] = useState<{ type: "unit" | "history"; data: ServiceRequest | ServiceRequest[] } | null>(null);

  // Auto trigger browser print dialogue
  useEffect(() => {
    if (printData) {
      const timer = setTimeout(() => {
        window.print();
        setPrintData(null);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [printData]);

  // CSV Export handler
  const handleExportCSV = () => {
    const headers = [
      "Ticket ID",
      "Container Number",
      "Status",
      "Priority",
      "Category",
      "Damage Description",
      "Timika Inspector",
      "Reported At",
      "Workshop Repairer",
      "Completed At",
      "Resolution Notes",
      "Cancellation Reason"
    ];

    const rows = requests.map((req) => {
      const completedLog = req.auditLogs.find(l => l.toStatus === RequestStatus.DONE);
      const repairer = completedLog?.operator || (req.resolutionNotes ? "Workshop Tech" : "-");
      
      return [
        req.id,
        req.containerNumber,
        req.status,
        req.priority,
        req.category,
        `"${(req.description || "").replace(/"/g, '""').replace(/\n/g, ' ')}"`,
        req.reporterName,
        new Date(req.timestamp).toLocaleString(),
        repairer,
        req.status === RequestStatus.DONE ? new Date(req.updatedAt).toLocaleString() : "-",
        `"${(req.resolutionNotes || "").replace(/"/g, '""').replace(/\n/g, ' ')}"`,
        `"${(req.cancellationReason || "").replace(/"/g, '""').replace(/\n/g, ' ')}"`
      ];
    });

    const csvContent = "\ufeff" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Panjasa_Service_Request_History_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintHistory = () => {
    setPrintData({ type: "history", data: requests });
  };

  const handlePrintRequest = (req: ServiceRequest) => {
    setPrintData({ type: "unit", data: req });
  };

  // Calculate high-level stats for PT. PANJASA-INTRADIN coordinators
  const totalTickets = requests.length;
  const waitingTickets = requests.filter((r) => r.status === RequestStatus.WAITING).length;
  const activeRepairs = requests.filter((r) => r.status === RequestStatus.IN_PROGRESS).length;
  const completedJobs = requests.filter((r) => r.status === RequestStatus.DONE).length;
  const cancelledJobs = requests.filter((r) => r.status === RequestStatus.CANCELLED).length;

  // Filter historical records for History / Archives list view
  const historicalRequests = requests.filter((r) => {
    const isHistorical = r.status === RequestStatus.DONE || r.status === RequestStatus.CANCELLED;
    if (!isHistorical) return false;
    
    if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
    
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase().trim();
      const matchContainer = r.containerNumber?.toLowerCase().includes(q);
      const matchId = r.id?.toLowerCase().includes(q);
      const matchReporter = r.reporterName?.toLowerCase().includes(q);
      return matchContainer || matchId || matchReporter;
    }
    return true;
  });

  // Auth Loading Screen
  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-3 text-slate-300 font-sans">
        <div className="w-8 h-8 border-3 border-slate-700 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-[10px] font-mono font-bold text-slate-500 tracking-wider uppercase">
          Initializing secure Firebase Authentication session...
        </p>
      </div>
    );
  }

  // Unified Secure login/signup portal (With Signature field)
  if (!firebaseUser || !loggedInUser) {
    return (
      <div className="min-h-screen bg-[#090d16] bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-indigo-950/40 via-[#090d16] to-[#090d16] flex flex-col justify-between text-slate-100 font-sans relative overflow-hidden">
        {/* Subtle decorative grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b12_1px,transparent_1px),linear-gradient(to_bottom,#1e293b12_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[350px] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent blur-3xl pointer-events-none" />

        <header className="p-5 flex items-center justify-between border-b border-slate-900 shrink-0 relative z-10 bg-slate-950/40 backdrop-blur-md">
          <div className="flex items-center space-x-3">
            <img 
              src="/img/panjasa-intradin_logo.png" 
              alt="PT. Panjasa Intradin Logo" 
              className="h-10 w-auto object-contain shrink-0" 
            />
            <div>
              <h1 className="text-sm font-extrabold uppercase tracking-tight text-white leading-none">
                PT. PANJASA-INTRADIN
              </h1>
              <p className="text-[9px] text-slate-500 font-mono tracking-widest uppercase mt-1">
                PORT CONNECT INFRASTRUCTURE
              </p>
            </div>
          </div>

          <button
            onClick={toggleLanguage}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs transition-all border border-slate-800 hover:border-slate-700 cursor-pointer font-bold"
            title="Change Language / Ubah Bahasa"
          >
            <Lock className="h-3.5 w-3.5 text-blue-400" />
            <span>{t.changeLanguage}</span>
          </button>
        </header>

        <main className="flex-1 flex items-center justify-center p-6 relative z-10">
          <div className="bg-slate-950/80 border border-slate-900/80 p-8 rounded-2xl w-full max-w-md shadow-2xl backdrop-blur-xl space-y-6 relative">
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-950/40 text-white border border-blue-400/20">
              <Lock className="h-9 w-9" />
            </div>

            <div className="text-center space-y-2 pt-10">
              <h2 className="text-base font-extrabold uppercase tracking-wider text-white">
                {authMode === "signin"
                  ? (language === "ENG" ? "PORTAL SIGN IN" : "MASUK PORTAL")
                  : (language === "ENG" ? "CREATE OPERATOR PROFILE" : "BUAT PROFIL OPERATOR")}
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                {authMode === "signin"
                  ? (language === "ENG" 
                      ? "Sign in with your email and secure company password." 
                      : "Masuk dengan email dan kata sandi aman perusahaan Anda.")
                  : (language === "ENG"
                      ? "Register your callsign, branch location, and digital signature stamp."
                      : "Daftar callsign, cabang tugas, dan tanda tangan digital Anda.")}
              </p>
            </div>

            {authError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-mono rounded-xl leading-relaxed animate-fade-in">
                <span className="font-bold">Error:</span> {authError}
              </div>
            )}

            {authSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-mono rounded-xl leading-relaxed animate-fade-in">
                {authSuccess}
              </div>
            )}

            {authMode === "signin" ? (
              // Sign In Form
              <form onSubmit={handleEmailSignIn} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono uppercase tracking-wider font-bold text-slate-400">
                    {language === "ENG" ? "EMAIL ADDRESS" : "ALAMAT EMAIL"}
                  </label>
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all font-mono"
                    placeholder="name@panjasa.com"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono uppercase tracking-wider font-bold text-slate-400">
                    {language === "ENG" ? "PASSWORD" : "KATA SANDI"}
                  </label>
                  <input
                    type="password"
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all font-mono"
                    placeholder="••••••••"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-extrabold py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg hover:shadow-blue-500/10 cursor-pointer text-center mt-3"
                >
                  {language === "ENG" ? "SECURE SIGN IN" : "MASUK AMAN"}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("signup");
                      setAuthError(null);
                      setAuthSuccess(null);
                    }}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-semibold uppercase tracking-wide cursor-pointer"
                  >
                    {language === "ENG" ? "New here? Register a branch profile" : "Belum punya akun? Daftar profil cabang"}
                  </button>
                </div>
              </form>
            ) : (
              // Sign Up Form (Includes operator name, branch selection, and signature)
              <form onSubmit={handleEmailSignUp} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-mono uppercase tracking-wider font-bold text-slate-400">
                      {language === "ENG" ? "FIRST NAME" : "NAMA DEPAN"}
                    </label>
                    <input
                      type="text"
                      required
                      value={signupFirstName}
                      onChange={(e) => setSignupFirstName(e.target.value)}
                      className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all font-mono"
                      placeholder="e.g. Yoppy"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-mono uppercase tracking-wider font-bold text-slate-400">
                      {language === "ENG" ? "LAST NAME" : "NAMA BELAKANG"}
                    </label>
                    <input
                      type="text"
                      required
                      value={signupLastName}
                      onChange={(e) => setSignupLastName(e.target.value)}
                      className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all font-mono"
                      placeholder="e.g. Kogoya"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-mono uppercase tracking-wider font-bold text-slate-400">
                    {language === "ENG" ? "SELECT BRANCH LOCATION" : "PILIH LOKASI CABANG"}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setSignupLocation(LocationTeam.TIMIKA)}
                      className={`py-3 px-1 rounded-xl border text-[9px] uppercase font-bold tracking-tight text-center transition-all cursor-pointer ${
                        signupLocation === LocationTeam.TIMIKA
                          ? "bg-amber-600/15 border-amber-500 text-amber-200 shadow-inner"
                          : "bg-slate-900/40 border-slate-800 text-slate-500 hover:border-slate-700"
                      }`}
                    >
                      TIMIKA
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignupLocation(LocationTeam.SURABAYA)}
                      className={`py-3 px-1 rounded-xl border text-[9px] uppercase font-bold tracking-tight text-center transition-all cursor-pointer ${
                        signupLocation === LocationTeam.SURABAYA
                          ? "bg-blue-600/15 border-blue-500 text-blue-200 shadow-inner"
                          : "bg-slate-900/40 border-slate-800 text-slate-500 hover:border-slate-700"
                      }`}
                    >
                      SURABAYA
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignupLocation(LocationTeam.JAKARTA)}
                      className={`py-3 px-1 rounded-xl border text-[9px] uppercase font-bold tracking-tight text-center transition-all cursor-pointer ${
                        signupLocation === LocationTeam.JAKARTA
                          ? "bg-purple-600/15 border-purple-500 text-purple-200 shadow-inner"
                          : "bg-slate-900/40 border-slate-800 text-slate-500 hover:border-slate-700"
                      }`}
                    >
                      JAKARTA
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono uppercase tracking-wider font-bold text-slate-400">
                    {language === "ENG" ? "DIGITAL SIGNATURE / INITIALS" : "TANDA TANGAN / INISIAL"}
                  </label>
                  <input
                    type="text"
                    value={signatureInput}
                    onChange={(e) => setSignatureInput(e.target.value)}
                    className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all font-serif italic"
                    placeholder="e.g. Y. Kogoya (Appears on printouts)"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono uppercase tracking-wider font-bold text-slate-400">
                    {language === "ENG" ? "EMAIL ADDRESS" : "ALAMAT EMAIL"}
                  </label>
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all font-mono"
                    placeholder="name@panjasa.com"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono uppercase tracking-wider font-bold text-slate-400">
                    {language === "ENG" ? "PASSWORD" : "KATA SANDI"}
                  </label>
                  <input
                    type="password"
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all font-mono"
                    placeholder="••••••••"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-extrabold py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg hover:shadow-blue-500/10 cursor-pointer text-center mt-3"
                >
                  {language === "ENG" ? "REGISTER & SIGN IN" : "DAFTAR & MASUK"}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("signin");
                      setAuthError(null);
                      setAuthSuccess(null);
                    }}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-semibold uppercase tracking-wide cursor-pointer"
                  >
                    {language === "ENG" ? "Already have an account? Sign In" : "Sudah punya akun? Masuk"}
                  </button>
                </div>
              </form>
            )}

            <div className="relative flex items-center justify-center py-2">
              <div className="border-t border-slate-900 w-full" />
              <span className="bg-[#0e1320] px-3 text-[10px] text-slate-500 font-mono uppercase absolute">OR</span>
            </div>

            <button
              onClick={handleGoogleSignIn}
              type="button"
              className="w-full bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-900 font-extrabold py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer flex items-center justify-center space-x-2 border border-slate-200"
            >
              <svg className="h-4.5 w-4.5" viewBox="0 0 24 24">
                <path fill="#ea4335" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114A5.952 5.952 0 0 1 8 12.571a5.952 5.952 0 0 1 5.991-5.943c1.554 0 2.964.59 4.038 1.554l3.076-3.076C19.16 3.195 16.713 2 13.99 2 8.125 2 3.333 6.786 3.333 12.57c0 5.786 4.792 10.57 10.658 10.57 6.136 0 10.155-4.312 10.155-10.334 0-.54-.047-1.12-.143-1.524H12.24Z"/>
              </svg>
              <span>{language === "ENG" ? "SIGN IN WITH GOOGLE" : "MASUK DENGAN GOOGLE"}</span>
            </button>
          </div>
        </main>

        <footer className="p-5 border-t border-slate-900 text-center text-[10px] text-slate-600 font-mono uppercase tracking-widest bg-slate-950/20 relative z-10">
          PT. PANJASA-INTRADIN &copy; 2026 • SECURE ENTERPRISE PORT INFRASTRUCTURE
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col text-slate-900 font-sans pb-20 sm:pb-0 w-full overflow-x-hidden print:bg-white print:overflow-visible print:min-h-0 print:pb-0 print:block">
      
      {/* 1. NORMAL APPLICATION UI (HIDDEN IN PRINT MODE) */}
      <div className="print:hidden flex-1 flex flex-col w-full">
        {/* Real-time sync Header */}
        <Header
          currentRole={currentRole}
          onRoleChange={(role) => setCurrentRole(role)}
          isPolling={isPolling}
          onRefresh={() => {}}
          language={language}
          onLanguageToggle={toggleLanguage}
          loggedInUser={loggedInUser}
          onLogOut={handleLogOut}
          onScanImage={handleMobileScanImage}
        />

        {/* PAGE VIEW TAB BAR (Dashboard vs In Progress vs History) - Sticky Header */}
        <div className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between shrink-0 shadow-md">
          <div className="grid grid-cols-3 gap-2 w-full sm:w-auto sm:flex">
            <button
              onClick={() => setCurrentTab("dashboard")}
              className={`flex items-center justify-center space-x-2 px-3 py-2.5 sm:px-4 rounded-xl text-[10px] sm:text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                currentTab === "dashboard"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <LayoutDashboard className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              <span>{language === "ENG" ? "Dashboard" : "Dashboard"}</span>
            </button>
            <button
              onClick={() => setCurrentTab("in-progress")}
              className={`flex items-center justify-center space-x-2 px-3 py-2.5 sm:px-4 rounded-xl text-[10px] sm:text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                currentTab === "in-progress"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              <span>{language === "ENG" ? "In Progress" : "Sedang Proses"} ({requests.filter(r => r.status !== RequestStatus.DONE && r.status !== RequestStatus.CANCELLED).length})</span>
            </button>
            <button
              onClick={() => setCurrentTab("history")}
              className={`flex items-center justify-center space-x-2 px-3 py-2.5 sm:px-4 rounded-xl text-[10px] sm:text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                currentTab === "history"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <History className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              <span>{language === "ENG" ? "History" : "Arsip"}</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center justify-end text-[11px] font-mono text-slate-400">
            <span>{language === "ENG" ? "Active View:" : "Tampilan:"} <strong className="text-slate-200 uppercase">{currentTab}</strong></span>
          </div>
        </div>

        {/* Direct Mobile Upload Notification Toast */}
        {isMobileScanning && (
          <div className="fixed bottom-20 left-4 right-4 bg-slate-950/95 backdrop-blur border border-blue-500/30 text-white rounded-xl p-4 shadow-2xl z-50 flex items-center space-x-3.5 animate-fade-in">
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-mono font-bold tracking-wider text-blue-400 uppercase">
                Direct Photo Attachment
              </p>
              <p className="text-xs font-bold truncate mt-0.5">
                {mobileScanStatus}
              </p>
              {mobileScanError && (
                <p className="text-[10px] text-rose-400 mt-1 leading-normal font-medium">
                  ⚠️ {mobileScanError}
                </p>
              )}
            </div>
            <button 
              onClick={() => setIsMobileScanning(false)}
              className="text-white hover:text-slate-300 font-bold text-xs p-1"
            >
              &times;
            </button>
          </div>
        )}

        <main className="flex-1 max-w-[1920px] w-full mx-auto p-4 sm:p-6 lg:px-8 space-y-6 relative min-h-[500px]">
          {isLoading && (
            <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-white/45 backdrop-blur-md rounded-2xl py-20 space-y-4">
              <div className="w-64 h-1.5 bg-slate-200/80 rounded-full overflow-hidden relative border border-slate-300/40">
                <div className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full w-1/2 animate-load-bar" />
              </div>
              <p className="text-[10px] font-mono font-bold text-slate-500 tracking-wider uppercase">
                {language === "ENG" ? "Synching PT. PANJASA-INTRADIN Port Database..." : "Sinkronisasi Database Pelabuhan PT. PANJASA-INTRADIN..."}
              </p>
            </div>
          )}

          <div className={`space-y-6 ${isLoading ? "blur-sm pointer-events-none opacity-80 select-none" : "animate-fade-in"}`}>
            {/* Error notification banner */}
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-800 p-3.5 rounded-xl flex items-center space-x-3 text-xs animate-pulse shadow-sm">
                <AlertTriangle className="h-4.5 w-4.5 text-rose-600 shrink-0" />
                <div>
                  <span className="font-bold">Sync Error:</span> {error} — Operating in fallback mode.
                </div>
              </div>
            )}

            {/* TAB VIEW SWITCHER */}
            {currentTab === "dashboard" ? (
              <>
                {/* Port Status Scoreboard - Hidden on Mobile */}
                <div className="hidden md:block space-y-3.5">
                  <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-xl">
                    <h3 className="text-xs font-bold font-mono text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                      {language === "ENG" ? "Real-Time Container Service Pipelines" : "Pipa Layanan Kontainer Real-Time"}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      {language === "ENG" 
                        ? "The status counters below track current service requests as they move from intake to completion. They represent:"
                        : "Penghitung status di bawah memantau permintaan layanan saat ini dari mulai masuk hingga selesai. Keterangannya:"}
                    </p>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2 mt-2.5 text-[10px] font-mono text-slate-600">
                      <li className="flex items-center space-x-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        <span><strong>{t.statTotal}:</strong> {language === "ENG" ? "All submitted requests" : "Semua permintaan masuk"}</span>
                      </li>
                      <li className="flex items-center space-x-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        <span><strong>{t.statAwaiting}:</strong> {language === "ENG" ? "Queued / awaiting attention" : "Antrean / menunggu ditindak"}</span>
                      </li>
                      <li className="flex items-center space-x-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        <span><strong>{t.statInProgress}:</strong> {language === "ENG" ? "Currently being repaired" : "Sedang dalam perbaikan fisik"}</span>
                      </li>
                      <li className="flex items-center space-x-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span><strong>{t.statCompleted}:</strong> {language === "ENG" ? "Repairs certified & done" : "Selesai & disertifikasi"}</span>
                      </li>
                      <li className="flex items-center space-x-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        <span><strong>{t.statCancelled}:</strong> {language === "ENG" ? "Voided or cancelled tasks" : "Dibatalkan atau dibatalkan"}</span>
                      </li>
                    </ul>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
                    <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm flex items-center space-x-3.5 hover:border-slate-300 hover:shadow transition-all group">
                      <div className="p-2.5 bg-slate-100 text-slate-700 rounded-lg group-hover:scale-105 transition-transform">
                        <ClipboardList className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="block text-[10px] font-mono text-slate-400 uppercase font-bold tracking-wider">{t.statTotal}</span>
                        <span className="text-xl font-extrabold font-mono text-slate-800 leading-tight">{totalTickets}</span>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm flex items-center space-x-3.5 hover:border-slate-300 hover:shadow transition-all group">
                      <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg group-hover:scale-105 transition-transform">
                        <Clock className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="block text-[10px] font-mono text-amber-500 uppercase font-bold tracking-wider">{t.statAwaiting}</span>
                        <span className="text-xl font-extrabold font-mono text-amber-600 leading-tight">{waitingTickets}</span>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm flex items-center space-x-3.5 hover:border-slate-300 hover:shadow transition-all group">
                      <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg group-hover:scale-105 transition-transform">
                        <BarChart3 className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="block text-[10px] font-mono text-blue-500 uppercase font-bold tracking-wider">{t.statInProgress}</span>
                        <span className="text-xl font-extrabold font-mono text-blue-600 leading-tight">{activeRepairs}</span>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm flex items-center space-x-3.5 hover:border-slate-300 hover:shadow transition-all group">
                      <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg group-hover:scale-105 transition-transform">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="block text-[10px] font-mono text-emerald-500 uppercase font-bold tracking-wider">{t.statCompleted}</span>
                        <span className="text-xl font-extrabold font-mono text-emerald-600 leading-tight">{completedJobs}</span>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm flex items-center space-x-3.5 hover:border-slate-300 hover:shadow transition-all group col-span-2 md:col-span-1">
                      <div className="p-2.5 bg-rose-50 text-rose-600 rounded-lg group-hover:scale-105 transition-transform">
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="block text-[10px] font-mono text-rose-500 uppercase font-bold tracking-wider">{t.statCancelled}</span>
                        <span className="text-xl font-extrabold font-mono text-rose-600 leading-tight">{cancelledJobs}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Data & Export utilities panel - Hidden on Mobile */}
                <div className="hidden md:flex bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                      <Database className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="block text-[11px] font-mono font-extrabold text-slate-900 uppercase tracking-wider">
                        {language === "ENG" ? "Ledger Records & Document Exporters" : "Arsip Ledger & Ekspor Dokumen"}
                      </span>
                      <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
                        {language === "ENG" 
                          ? "Download real-time port logs directly to Excel (CSV) or trigger systemic print templates for audit reporting (PDF)."
                          : "Unduh log pelabuhan langsung ke Excel (CSV) atau cetak riwayat dengan format sistemik untuk laporan audit (PDF)."}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
                    <button
                      onClick={handleExportCSV}
                      className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm hover:shadow-md cursor-pointer"
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      <span>{language === "ENG" ? "Export Excel" : "Ekspor Excel"}</span>
                    </button>
                    <button
                      onClick={handlePrintHistory}
                      className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-slate-100 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm hover:shadow-md cursor-pointer"
                    >
                      <Printer className="h-4 w-4" />
                      <span>{language === "ENG" ? "Print History" : "Cetak Riwayat"}</span>
                    </button>
                  </div>
                </div>

                {/* Main Workspace Layout */}
                {currentRole === LocationTeam.TIMIKA && (
                  <TimikaForm
                    onSubmitSuccess={() => {}}
                    onSubmitRequest={handleCreateRequest}
                    requests={requests}
                    onSelectRequest={(req) => setSelectedRequest(req)}
                    language={language}
                    loggedInUser={loggedInUser}
                    prefilledContainerNumber={prefilledContainerNumber}
                    prefilledPhoto={prefilledPhoto}
                    onClearPrefilled={() => {
                      setPrefilledContainerNumber("");
                      setPrefilledPhoto(null);
                    }}
                    onNavigateHistory={() => setCurrentTab("history")}
                    onNavigateInProgress={() => setCurrentTab("in-progress")}
                  />
                )}

                {currentRole === LocationTeam.SURABAYA && (
                  <SurabayaDashboard
                    requests={requests.filter((r) => r.location === LocationTeam.SURABAYA || (!r.location && r.destinationLocation === LocationTeam.SURABAYA))}
                    onStatusUpdate={handleStatusUpdate}
                    onSelectRequest={(req) => setSelectedRequest(req)}
                    onPrint={handlePrintRequest}
                    language={language}
                    loggedInUser={loggedInUser}
                  />
                )}

                {currentRole === LocationTeam.JAKARTA && (
                  <JakartaDashboard
                    requests={requests.filter((r) => r.location === LocationTeam.JAKARTA || r.destinationLocation === LocationTeam.JAKARTA)}
                    onStatusUpdate={handleStatusUpdate}
                    onSelectRequest={(req) => setSelectedRequest(req)}
                    onPrint={handlePrintRequest}
                    language={language}
                    loggedInUser={loggedInUser}
                  />
                )}

                {currentRole === "Admin" && (
                  <div className="space-y-6">
                    <div className="relative border-b border-slate-200 pb-3 flex items-center justify-between text-[11px] font-mono">
                      <span className="text-amber-600 font-extrabold flex items-center space-x-1.5 uppercase tracking-wider">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                        <span>TIMIKA (PAPUA)</span>
                      </span>
                      <span className="text-purple-600 font-extrabold flex items-center space-x-1.5 uppercase tracking-wider">
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse" />
                        <span>JAKARTA (WEST)</span>
                      </span>
                      <span className="text-blue-600 font-extrabold flex items-center space-x-1.5 uppercase tracking-wider">
                        <span>SURABAYA (JAVA)</span>
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                      </span>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start w-full">
                      <div className="xl:col-span-3 bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm space-y-5">
                        <div className="border-b border-slate-100 pb-3">
                          <div className="flex justify-between items-center">
                            <h3 className="font-extrabold text-slate-900 text-xs font-mono uppercase tracking-widest flex items-center space-x-1.5">
                              <span className="w-2 h-2 rounded-full bg-amber-500" />
                              <span>TIMIKA FIELD OPERATIONS</span>
                            </h3>
                            <span className="text-[10px] bg-blue-500/10 text-blue-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider hidden lg:inline-block">DIRECT UPLOAD</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            Field technicians attach damage documentation directly to incoming container logs.
                          </p>
                        </div>
                        <TimikaForm
                          onSubmitSuccess={() => {}}
                          onSubmitRequest={handleCreateRequest}
                          requests={requests.filter((r) => r.status === RequestStatus.WAITING)}
                          onSelectRequest={(req) => setSelectedRequest(req)}
                          language={language}
                          loggedInUser={loggedInUser}
                          prefilledContainerNumber={prefilledContainerNumber}
                          prefilledPhoto={prefilledPhoto}
                          onClearPrefilled={() => {
                            setPrefilledContainerNumber("");
                            setPrefilledPhoto(null);
                          }}
                          onNavigateHistory={() => setCurrentTab("history")}
                          onNavigateInProgress={() => setCurrentTab("in-progress")}
                        />
                      </div>

                      <div className="xl:col-span-9 space-y-6 w-full">
                        <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm border-l-4 border-l-blue-600 flex items-center justify-between">
                          <div>
                            <h3 className="font-extrabold text-slate-900 text-xs font-mono uppercase tracking-widest flex items-center space-x-1.5">
                              <span className="w-2 h-2 rounded-full bg-blue-500" />
                              <span>SURABAYA & JAKARTA WORKSHOP SYSTEM</span>
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Technicians diagnostic queue, process parts, signoff completion logs, or cancel tickets.
                            </p>
                          </div>
                          <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">LIVE</span>
                        </div>
                        <div className="space-y-6">
                          <SurabayaDashboard
                            requests={requests.filter((r) => r.location === LocationTeam.SURABAYA || (!r.location && r.destinationLocation === LocationTeam.SURABAYA))}
                            onStatusUpdate={handleStatusUpdate}
                            onSelectRequest={(req) => setSelectedRequest(req)}
                            onPrint={handlePrintRequest}
                            language={language}
                            loggedInUser={loggedInUser}
                          />
                          <JakartaDashboard
                            requests={requests.filter((r) => r.location === LocationTeam.JAKARTA || r.destinationLocation === LocationTeam.JAKARTA)}
                            onStatusUpdate={handleStatusUpdate}
                            onSelectRequest={(req) => setSelectedRequest(req)}
                            onPrint={handlePrintRequest}
                            language={language}
                            loggedInUser={loggedInUser}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : currentTab === "in-progress" ? (
              /* TAB VIEW: IN PROGRESS */
              <div className="space-y-6 max-w-5xl mx-auto w-full bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-900 uppercase tracking-tight flex items-center space-x-2.5">
                      <Clock className="h-6 w-6 text-amber-500" />
                      <span>{language === "ENG" ? "Active In-Progress & Waiting Requests" : "Permintaan Aktif & Menunggu"}</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      {language === "ENG" ? "Full ledger of active container service tickets currently deployed across hubs." : "Daftar lengkap tiket layanan kontainer aktif yang sedang berjalan."}
                    </p>
                  </div>
                  <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-mono font-bold">
                    {requests.filter(r => r.status !== RequestStatus.DONE && r.status !== RequestStatus.CANCELLED).length} Active
                  </span>
                </div>

                <div className="space-y-3">
                  {requests.filter(r => r.status !== RequestStatus.DONE && r.status !== RequestStatus.CANCELLED).length === 0 ? (
                    <div className="py-12 text-center text-slate-400 font-mono text-xs uppercase tracking-wider">
                      {language === "ENG" ? "No active service requests found" : "Tidak ada permintaan layanan aktif"}
                    </div>
                  ) : (
                    requests
                      .filter(r => r.status !== RequestStatus.DONE && r.status !== RequestStatus.CANCELLED)
                      .map((req) => (
                        <div key={req.id} onClick={() => setSelectedRequest(req)} className="p-4 rounded-xl border border-slate-200 hover:border-blue-400 transition cursor-pointer bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center space-x-2 font-mono text-xs font-bold text-blue-600">
                              <span>{req.id}</span>
                              <span>•</span>
                              <span className="text-slate-900">{req.containerNumber}</span>
                            </div>
                            <p className="text-xs text-slate-600 mt-1">{req.description}</p>
                          </div>
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase bg-amber-100 text-amber-800 w-fit">
                            {req.status}
                          </span>
                        </div>
                      ))
                  )}
                </div>
              </div>
            ) : (
              /* TAB VIEW: HISTORY */
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <h2 className="text-lg font-extrabold text-slate-900 uppercase tracking-tight flex items-center space-x-2.5">
                        <History className="h-6 w-6 text-blue-600" />
                        <span>{language === "ENG" ? "Historical Service Archives" : "Arsip Riwayat Layanan"}</span>
                      </h2>
                      <p className="text-xs text-slate-500 mt-1">
                        {language === "ENG"
                          ? "Search past completed and voided service requests by container unit number, ticket ID, or technician callsign."
                          : "Cari riwayat permintaan layanan yang telah selesai atau dibatalkan berdasarkan nomor unit kontainer, ID tiket, atau nama teknisi."}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-mono font-bold">
                        {historicalRequests.length} {language === "ENG" ? "Records Found" : "Arsip Ditemukan"}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="relative flex-1 w-full">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={language === "ENG" ? "Search container unit (e.g., FUKU-610012-2) or ID..." : "Cari unit kontainer atau ID tiket..."}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                        >
                          &times;
                        </button>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 w-full sm:w-auto">
                      <Filter className="h-4 w-4 text-slate-400 shrink-0 hidden sm:block" />
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as "ALL" | "DONE" | "CANCELLED")}
                        className="w-full sm:w-auto px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500"
                      >
                        <option value="ALL">{language === "ENG" ? "All Archives" : "Semua Arsip"}</option>
                        <option value="DONE">{language === "ENG" ? "Completed Only" : "Hanya Selesai"}</option>
                        <option value="CANCELLED">{language === "ENG" ? "Cancelled Only" : "Hanya Dibatalkan"}</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100/80 border-b border-slate-200 text-[10px] font-mono font-extrabold uppercase text-slate-600 tracking-wider">
                          <th className="py-3.5 px-4 w-28">Ticket ID</th>
                          <th className="py-3.5 px-4 w-36">Container No</th>
                          <th className="py-3.5 px-4 w-28">Status</th>
                          <th className="py-3.5 px-4 w-32">Category</th>
                          <th className="py-3.5 px-4">Damage &amp; Resolution Summary</th>
                          <th className="py-3.5 px-4 w-32">Reported Date</th>
                          <th className="py-3.5 px-4 w-36 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {historicalRequests.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-12 text-center text-slate-400 font-mono text-xs uppercase tracking-wider">
                              {language === "ENG" ? "No historical records match your search criteria" : "Tidak ada arsip yang cocok dengan kriteria pencarian"}
                            </td>
                          </tr>
                        ) : (
                          historicalRequests.map((req) => {
                            const isDone = req.status === RequestStatus.DONE;
                            return (
                              <tr 
                                key={req.id} 
                                onClick={() => setSelectedRequest(req)}
                                className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                              >
                                <td className="py-3.5 px-4 font-mono font-bold text-blue-600 group-hover:underline">
                                  {req.id}
                                </td>
                                <td className="py-3.5 px-4 font-mono font-extrabold text-slate-900">
                                  {req.containerNumber}
                                </td>
                                <td className="py-3.5 px-4">
                                  <span className={`inline-block font-mono text-[9px] px-2 py-0.5 rounded-full font-bold uppercase border ${
                                    isDone 
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                                      : "bg-rose-50 text-rose-700 border-rose-200"
                                  }`}>
                                    {req.status}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 font-medium text-slate-700">
                                  {req.category}
                                </td>
                                <td className="py-3.5 px-4 text-slate-600 max-w-md">
                                  <div className="line-clamp-1 font-medium text-slate-900">{req.description}</div>
                                  <div className="line-clamp-1 text-[11px] text-slate-400 mt-0.5">
                                    {isDone ? `Resolution: ${req.resolutionNotes}` : `Reason: ${req.cancellationReason}`}
                                  </div>
                                </td>
                                <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">
                                  {new Date(req.timestamp).toLocaleDateString()}
                                </td>
                                <td className="py-3.5 px-4 text-right">
                                  <div className="flex items-center justify-end space-x-2" onClick={(e) => e.stopPropagation()}>
                                    <button
                                      onClick={() => setSelectedRequest(req)}
                                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition flex items-center space-x-1"
                                    >
                                      <FileText className="h-3 w-3" />
                                      <span>View</span>
                                    </button>
                                    {isDone && (
                                      <button
                                        onClick={() => handlePrintRequest(req)}
                                        className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[11px] font-bold transition flex items-center space-x-1"
                                      >
                                        <Printer className="h-3 w-3" />
                                        <span>Print</span>
                                      </button>
                                    )}
                                    {loggedInUser?.email === "mpigome44@gmail.com" && (
                                      <button
                                        onClick={() => {
                                          if (window.confirm(language === "ENG" ? "Are you sure you want to delete this historical record?" : "Apakah Anda yakin ingin menghapus arsip ini?")) {
                                            handleDeleteRequest(req.id);
                                          }
                                        }}
                                        className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[11px] font-bold transition flex items-center space-x-1 cursor-pointer"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                        <span>Delete</span>
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Shared Ledger / Audit Trail Modal */}
        {selectedRequest && (
          <AuditTrailModal
            request={selectedRequest}
            onClose={() => setSelectedRequest(null)}
            language={language}
            onPrint={handlePrintRequest}
            loggedInUser={loggedInUser}
            onDeleteRequest={handleDeleteRequest}
            onUpdateRequest={handleUpdateRequest}
          />
        )}

        {/* High Density Status Footer */}
        <footer className="h-8 bg-slate-200 border-t border-slate-300 flex items-center px-4 justify-between text-[10px] shrink-0 font-mono uppercase tracking-tight text-slate-500 mt-auto">
          <div className="flex gap-6 overflow-hidden">
            <div className="flex items-center gap-1">
              <span className="text-blue-600 font-bold">SYSTEM:</span> REAL-TIME CONNECTED (SYNC: 200ms)
            </div>
            <div className="flex items-center gap-1 hidden md:flex">
              <span className="text-blue-600 font-bold">NODE SECURITY:</span> AES-256 • DIRECT ATTACHMENT v2.5
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline">PT. PANJASA-INTRADIN &copy; 2026</span>
            <span className="text-slate-400">TIMIKA, SURABAYA &amp; JAKARTA HUB</span>
          </div>
        </footer>
      </div>

      {/* 2. ULTRA-COMPACT 1-PAGE GUARANTEE PRINT TEMPLATE (WITH SIGNATURE STAMP) */}
      {printData && (
        <div id="printable-area" className="hidden print:block print:w-full print:h-auto print:overflow-visible print:p-0 print:m-0 text-black font-sans bg-white">
          {printData.type === "unit" ? (
            // Individual PT PANJASA INTRADIN "SERVICE REQUEST" form (Ultra Compact 1-Page Layout)
            (() => {
              const req = printData.data as ServiceRequest;
              const completedLog = req.auditLogs.find(l => l.toStatus === RequestStatus.DONE);
              const repairer = completedLog?.operator || (req.resolutionNotes ? "Workshop Repairer" : "");
              
              return (
                <div className="p-4 max-w-[800px] mx-auto border-2 border-black bg-white text-black font-sans space-y-3 print:w-full print:max-w-none print:border-2 print:border-black print:p-4 print:my-0">
                  
                  {/* Document Header */}
                  <div className="flex items-center justify-between border-b-2 border-black pb-2">
                    <div className="flex items-center space-x-3">
                      {/* Responsive Company Logo without Distortion */}
                      <img 
                        src="/img/panjasa-intradin_logo.png" 
                        alt="PT. Panjasa Intradin Logo" 
                        className="h-14 w-auto object-contain shrink-0" 
                      />
                      <div>
                        <h1 className="text-base font-black uppercase tracking-tight leading-none text-black">PT. PANJASA INTRADIN</h1>
                        <p className="text-[11px] font-semibold text-gray-800 mt-0.5">Container Services &amp; Maintenance</p>
                        <p className="text-[10px] text-gray-600 font-mono">PT Panjasa Intradin Hub</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono font-bold uppercase border border-black px-2 py-0.5 bg-gray-50 block">
                        TICKET ID: {req.id}
                      </span>
                      <p className="text-[9px] text-gray-500 mt-0.5 font-mono">FORMAT: ISO 6346</p>
                    </div>
                  </div>

                  {/* Main Title */}
                  <div className="text-center">
                    <h2 className="text-lg font-black uppercase tracking-widest text-black border-b-2 border-black pb-0.5 inline-block">
                      SERVICE REQUEST
                    </h2>
                  </div>

                  {/* Top Table: TIMIKA Intake */}
                  <div className="border-2 border-black break-inside-avoid">
                    {/* Row 1: Container Number */}
                    <div className="border-b-2 border-black grid grid-cols-4 bg-gray-50 print:bg-transparent">
                      <div className="col-span-1 border-r-2 border-black p-1.5 font-bold text-xs uppercase flex items-center">
                        Container Number :
                      </div>
                      <div className="col-span-3 p-1.5 font-mono font-bold text-sm tracking-wide">
                        {req.containerNumber}
                      </div>
                    </div>

                    {/* Row 2: Damage Report */}
                    <div className="border-b-2 border-black grid grid-cols-4 min-h-[90px]">
                      <div className="col-span-1 border-r-2 border-black p-1.5 bg-gray-50 print:bg-transparent font-bold text-xs uppercase">
                        Damage Report :
                      </div>
                      <div className="col-span-3 p-2 text-xs flex flex-col justify-between">
                        <p className="font-sans font-medium text-black leading-relaxed whitespace-pre-wrap">{req.description || "No description provided."}</p>
                        {/* Compact Photo Preview */}
                        {req.photoUrl && (
                          <div className="mt-2 border border-gray-400 p-1 w-44 inline-block bg-white">
                            <p className="text-[8px] uppercase font-bold font-mono text-gray-500 mb-0.5">Attached Damage Photo (Timika Intake)</p>
                            <img src={req.photoUrl} alt="Timika Intake" className="w-full h-20 object-cover border border-gray-200" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Row 3: Timika Tech details & Sign */}
                    <div className="grid grid-cols-2 text-xs">
                      <div className="border-r-2 border-black p-2 space-y-1">
                        <p><span className="font-bold">Technician Name :</span> {req.reporterName || "Mark Pigome"}</p>
                        <p><span className="font-bold">Location :</span> {req.location || "Timika"}</p>
                        <p><span className="font-bold">Date :</span> {req.timestamp ? new Date(req.timestamp).toLocaleDateString() : "7/21/2026"}</p>
                      </div>
                      <div className="p-2 flex flex-col justify-between items-center text-center h-16">
                        <span className="font-bold uppercase text-[9px] tracking-wider text-gray-400">Sign / Verification Stamp</span>
                        
                        {/* Render Saved User Signature or Initials */}
                        {loggedInUser?.signature ? (
                          <div className="my-auto font-serif italic font-bold text-sm text-black border-b border-gray-400 px-4">
                            {loggedInUser.signature}
                          </div>
                        ) : (
                          <div className="border-t border-dashed border-gray-400 w-44 mx-auto text-center text-[8px] text-gray-500 mt-auto pt-0.5">
                            Authorized Field Inspector
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Workshop Repair Cutline Separator */}
                  <div className="my-2 flex items-center justify-center space-x-2 text-gray-400 select-none print:text-black">
                    <div className="h-[1px] border-t-2 border-dashed border-gray-400 print:border-black flex-grow"></div>
                    <span className="text-[9px] font-mono font-bold uppercase tracking-widest px-2 text-gray-500 print:text-black">
                      WORKSHOP REPAIR CUTLINE
                    </span>
                    <div className="h-[1px] border-t-2 border-dashed border-gray-400 print:border-black flex-grow"></div>
                  </div>

                  {/* Bottom Table: Workshop Repair */}
                  <div className="border-2 border-black break-inside-avoid">
                    {/* Row 1: Corrective Action Report */}
                    <div className="border-b-2 border-black grid grid-cols-4 min-h-[90px]">
                      <div className="col-span-1 border-r-2 border-black p-1.5 bg-gray-50 print:bg-transparent font-bold text-xs uppercase">
                        Corrective Action Report :
                      </div>
                      <div className="col-span-3 p-2 text-xs flex flex-col justify-between">
                        <p className="font-sans font-medium text-black leading-relaxed whitespace-pre-wrap">{req.resolutionNotes || "done"}</p>
                        {req.repairPhotoUrl && (
                          <div className="mt-2 border border-gray-400 p-1 w-44 inline-block bg-white">
                            <p className="text-[8px] uppercase font-bold font-mono text-gray-500 mb-0.5">Attached Repair Photo (Workshop)</p>
                            <img src={req.repairPhotoUrl} alt="Workshop Repair" className="w-full h-20 object-cover border border-gray-200" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Row 2: Verification blocks */}
                    <div className="grid grid-cols-3 text-xs divide-x-2 divide-black bg-gray-50 print:bg-transparent h-20">
                      {/* Repaired by */}
                      <div className="p-2 flex flex-col justify-between">
                        <div>
                          <span className="font-bold block uppercase text-[9px] text-gray-500">Repaired by,</span>
                          <span className="font-bold text-black text-xs block mt-0.5">{req.status === RequestStatus.DONE ? (repairer || "Workshop Tech") : "________________"}</span>
                        </div>
                        <div className="text-[9px] text-gray-600 space-y-0 font-mono">
                          <p>Location : Workshop Hub</p>
                          <p>Date : {req.status === RequestStatus.DONE ? new Date(req.updatedAt).toLocaleDateString() : "7/21/2026"}</p>
                        </div>
                      </div>

                      {/* Recorded by */}
                      <div className="p-2 flex flex-col justify-between">
                        <div>
                          <span className="font-bold block uppercase text-[9px] text-gray-500">Recorded by,</span>
                          <span className="font-bold text-black text-xs block mt-0.5">{req.status === RequestStatus.DONE ? "Administrasi Operasional" : "________________"}</span>
                        </div>
                        <div className="text-[9px] text-gray-600 space-y-0 font-mono">
                          <p>Location : Hub Office</p>
                          <p>Date : {req.status === RequestStatus.DONE ? new Date(req.updatedAt).toLocaleDateString() : "7/21/2026"}</p>
                        </div>
                      </div>

                      {/* Verified by */}
                      <div className="p-2 flex flex-col justify-between">
                        <div>
                          <span className="font-bold block uppercase text-[9px] text-gray-500">Verified by,</span>
                          <span className="font-bold text-black text-xs block mt-0.5">{req.status === RequestStatus.DONE ? "Supervisor / Coordinator" : "________________"}</span>
                        </div>
                        <div className="text-[9px] text-gray-600 space-y-0 font-mono">
                          <p>Location : Hub Office</p>
                          <p>Date : {req.status === RequestStatus.DONE ? new Date(req.updatedAt).toLocaleDateString() : "7/21/2026"}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()
          ) : (
            // Printable History Report
            (() => {
              const list = printData.data as ServiceRequest[];
              return (
                <div className="p-6 bg-white text-black font-sans space-y-4">
                  {/* Header */}
                  <div className="border-b-2 border-black pb-2 flex justify-between items-end">
                    <div className="flex items-center gap-3">
                      <img 
                        src="/img/panjasa-intradin_logo.png" 
                        alt="PT. Panjasa Intradin" 
                        className="h-12 w-auto object-contain shrink-0"
                      />
                      <div>
                        <h1 className="text-base font-bold uppercase tracking-tight text-black">PT. PANJASA INTRADIN</h1>
                        <p className="text-[11px] uppercase font-extrabold tracking-widest text-gray-700">PAST HISTORY SERVICE REPORT</p>
                      </div>
                    </div>
                    <div className="text-right text-[10px] text-gray-500 font-mono">
                      <div>REPORT GENERATED: {new Date().toLocaleString()}</div>
                      <div>TOTAL RECORDS: {list.length}</div>
                    </div>
                  </div>

                  {/* Summary scorecards */}
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div className="border border-black p-2 bg-gray-50">
                      <span className="text-[9px] uppercase font-bold text-gray-500 block">Waiting Repair</span>
                      <span className="text-sm font-bold font-mono">{list.filter(r => r.status === RequestStatus.WAITING).length}</span>
                    </div>
                    <div className="border border-black p-2 bg-gray-50">
                      <span className="text-[9px] uppercase font-bold text-gray-500 block">In Progress</span>
                      <span className="text-sm font-bold font-mono">{list.filter(r => r.status === RequestStatus.IN_PROGRESS).length}</span>
                    </div>
                    <div className="border border-black p-2 bg-gray-50">
                      <span className="text-[9px] uppercase font-bold text-gray-500 block">Completed</span>
                      <span className="text-sm font-bold font-mono">{list.filter(r => r.status === RequestStatus.DONE).length}</span>
                    </div>
                    <div className="border border-black p-2 bg-gray-50">
                      <span className="text-[9px] uppercase font-bold text-gray-500 block">Cancelled</span>
                      <span className="text-sm font-bold font-mono">{list.filter(r => r.status === RequestStatus.CANCELLED).length}</span>
                    </div>
                  </div>

                  {/* History Table */}
                  <table className="w-full text-left text-[10px] border-collapse border border-black">
                    <thead>
                      <tr className="bg-gray-100 border-b border-black text-[9px] font-bold uppercase">
                        <th className="border-r border-black p-1.5 w-16">Ticket ID</th>
                        <th className="border-r border-black p-1.5 w-24">Container No</th>
                        <th className="border-r border-black p-1.5 w-16">Status</th>
                        <th className="border-r border-black p-1.5 w-20">Category</th>
                        <th className="border-r border-black p-1.5 w-24">Timika Tech</th>
                        <th className="border-r border-black p-1.5 w-20">Reported Date</th>
                        <th className="border-r border-black p-1.5 w-24">Workshop Tech</th>
                        <th className="p-1.5">Resolution / Cancellation Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black">
                      {list.map((req) => {
                        const completedLog = req.auditLogs.find(l => l.toStatus === RequestStatus.DONE);
                        const repairer = completedLog?.operator || (req.resolutionNotes ? "Workshop Tech" : "-");
                        
                        return (
                          <tr key={req.id} className="align-top break-inside-avoid">
                            <td className="border-r border-black p-1.5 font-mono font-bold">{req.id}</td>
                            <td className="border-r border-black p-1.5 font-mono">{req.containerNumber}</td>
                            <td className="border-r border-black p-1.5 font-mono font-bold uppercase text-[9px]">{req.status}</td>
                            <td className="border-r border-black p-1.5">{req.category}</td>
                            <td className="border-r border-black p-1.5">{req.reporterName}</td>
                            <td className="border-r border-black p-1.5 font-mono">{new Date(req.timestamp).toLocaleDateString()}</td>
                            <td className="border-r border-black p-1.5">{repairer}</td>
                            <td className="p-1.5 text-gray-700 leading-relaxed max-w-[200px] break-words">
                              {req.resolutionNotes || req.cancellationReason || "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()
          )}
        </div>
      )}
    </div>
  );
}
