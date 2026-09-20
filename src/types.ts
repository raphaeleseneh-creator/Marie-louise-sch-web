import type { SchoolClass } from "./data/school";

export type NavTab = 
  | "home"
  | "about"
  | "academics"
  | "admissions"
  | "news-events"
  | "contact"
  | "parent-portal";

export interface AdmissionFormData {
  parentFullName: string;
  parentEmail: string;
  parentPhone: string;
  childFullName: string;
  childDateOfBirth: string;
  selectedClass: SchoolClass | "";
  notes?: string;
  preferredTourDate?: string;
}

export interface VisitTourFormData {
  fullName: string;
  email: string;
  phone: string;
  preferredDate: string;
  interestedClass: SchoolClass | "";
  message?: string;
}

export * from "./types/portal";
