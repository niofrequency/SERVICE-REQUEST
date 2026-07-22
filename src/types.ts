/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum PriorityLevel {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  URGENT = "URGENT",
}

export enum IssueCategory {
  ELECTRICAL = "Electrical",
  STRUCTURAL = "Structural",
  REFRIGERATION_TELEMATICS = "Refrigeration/Telematics",
  MECHANICAL = "Mechanical",
}

export enum RequestStatus {
  WAITING = "WAITING",
  IN_PROGRESS = "IN_PROGRESS",
  DONE = "DONE",
  CANCELLED = "CANCELLED",
}

export enum LocationTeam {
  TIMIKA = "Timika",
  SURABAYA = "Surabaya",
  JAKARTA = "Jakarta",
}

export interface AuditLog {
  id: string;
  requestId: string;
  fromStatus: RequestStatus | "NONE";
  toStatus: RequestStatus;
  operator: string;
  location: LocationTeam;
  timestamp: string;
  notes?: string;
}

export interface ServiceRequest {
  id: string;
  containerNumber: string;
  priority: PriorityLevel;
  category: IssueCategory;
  description: string;
  photoUrl: string | null; // Base64 or placeholder image path (Legacy support)
  photoUrls?: string[]; // Array supporting up to 3 intake damage photos
  reporterName: string;
  timestamp: string;
  status: RequestStatus;
  location: LocationTeam;
  repairPhotoUrl?: string; // Legacy support
  repairPhotoUrls?: string[]; // Array supporting up to 3 repair completion photos
  resolutionNotes?: string; // Filled by Surabaya/Jakarta
  cancellationReason?: string; // Mandatory if CANCELLED
  updatedAt: string;
  auditLogs: AuditLog[];
}
