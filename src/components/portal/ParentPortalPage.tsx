import React, { useState, useEffect, useRef, useId, useMemo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  Bell,
  BookMarked,
  BookOpen,
  Calendar,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Coffee,
  CreditCard,
  Download,
  Eye,
  EyeOff,
  FileCheck2,
  FileText,
  Filter,
  GraduationCap,
  HelpCircle,
  Home,
  Info,
  LockKeyhole,
  LogOut,
  MapPin,
  Menu,
  Paperclip,
  Plus,
  Receipt,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Tag,
  UserRound,
  Users,
  Utensils,
  X,
} from "lucide-react";
import { SchoolLogo } from "../ui/SchoolLogo";
import { portalService } from "../../services/portalService";
import { PaymentProofModal } from "./PaymentProofModal";
import type {
  ParentDashboardData,
  PortalView,
  AbsenceReason,
  AbsenceReport,
  AbsenceStatus,
  Assignment,
  Pupil,
  Invoice,
  Payment,
  FeeCategory,
  InvoiceItem,
  InvoiceStatus,
  PaymentProof,
  PaymentProofStatus,
  PaymentProofMethod,
  CalendarEvent,
  CalendarEventCategory,
  TimetableEntry,
  DayOfWeek,
  InitiateOnlinePaymentRequest,
  OnlinePaymentItemBreakdown,
  OnlinePaymentSessionResponse,
  PaymentGatewayProvider,
} from "../../types/portal";

interface ParentPortalPageProps {
  onBackToSchool: () => void;
}

const portalNavigation: { id: PortalView; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Overview", icon: Home },
  { id: "homework", label: "Homework", icon: BookOpen },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "timetable", label: "Timetable", icon: Clock },
  { id: "reports", label: "Reports & attendance", icon: FileText },
  { id: "fees", label: "Fees & receipts", icon: CreditCard },
  { id: "requests", label: "Requests", icon: FileCheck2 },
  { id: "notices", label: "Notices", icon: Bell },
];

export const ParentPortalPage: React.FC<ParentPortalPageProps> = ({ onBackToSchool }) => {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [activeView, setActiveView] = useState<PortalView>("overview");
  const [showPassword, setShowPassword] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPupilMenuOpen, setIsPupilMenuOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [dashboardData, setDashboardData] = useState<ParentDashboardData | null>(null);
  const [activePupilId, setActivePupilId] = useState<string>("recPup001Kamsi");
  const [isAbsenceModalOpen, setIsAbsenceModalOpen] = useState(false);
  const [isProofModalOpen, setIsProofModalOpen] = useState(false);
  const [proofModalInitialInvoiceId, setProofModalInitialInvoiceId] = useState<string | undefined>(undefined);
  const [proofModalInitialPupilId, setProofModalInitialPupilId] = useState<string | undefined>(undefined);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();

  const selectorButtonRef = useRef<HTMLButtonElement>(null);
  const selectorDropdownRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  // Load portal data via the service layer
  const loadPortalData = async (targetId: string = activePupilId) => {
    try {
      const data = await portalService.getDashboardData(dashboardData?.parent.id, targetId);
      setDashboardData(data);
      setActivePupilId(targetId);
    } catch (err) {
      console.error("Failed to load portal data:", err);
    }
  };

  useEffect(() => {
    if (isSignedIn) {
      loadPortalData(activePupilId);
    }
  }, [isSignedIn, activePupilId]);

  // Handle clicking outside the pupil dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        selectorDropdownRef.current &&
        !selectorDropdownRef.current.contains(event.target as Node) &&
        selectorButtonRef.current &&
        !selectorButtonRef.current.contains(event.target as Node)
      ) {
        setIsPupilMenuOpen(false);
      }
    };
    if (isPupilMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isPupilMenuOpen]);

  // Handle Escape dismissal
  const handleDropdownKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsPupilMenuOpen(false);
      selectorButtonRef.current?.focus();
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const identity = (data.get("identity") as string) || "";
    const password = (data.get("password") as string) || "";

    if (!identity || !password) {
      setFormError("Enter your parent email or admission number and password.");
      return;
    }

    const auth = await portalService.authenticate(identity, password);
    if (!auth.success) {
      setFormError(auth.error || "Invalid sign-in credentials.");
      return;
    }

    setFormError("");
    await loadPortalData(activePupilId);
    setIsSignedIn(true);
  };

  const handleDemoSignIn = async () => {
    setFormError("");
    await loadPortalData("recPup001Kamsi");
    setIsSignedIn(true);
  };

  const handleSwitchPupil = (pupilId: string) => {
    setActivePupilId(pupilId);
    loadPortalData(pupilId);
    setIsPupilMenuOpen(false);
  };

  const handleToggleHomeworkCompletion = async (assignmentId: string, completed: boolean) => {
    try {
      await portalService.toggleAssignmentCompletion(assignmentId, completed);
      await loadPortalData(activePupilId);
      setActionSuccess(
        completed
          ? "Homework marked as completed by parent."
          : "Homework status changed back to pending."
      );
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err) {
      console.error("Failed to toggle completion:", err);
    }
  };

  const handleAbsenceSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!dashboardData) return;
    const form = new FormData(e.currentTarget);
    const targetPupilId =
      (form.get("pupilId") as string) ||
      dashboardData.selectedPupil?.id ||
      dashboardData.pupils[0].id;
    const startDate = form.get("startDate") as string;
    const endDate = form.get("endDate") as string;
    const reason = form.get("reason") as AbsenceReason;
    const notes = form.get("notes") as string;

    await portalService.submitAbsenceReport({
      pupilId: targetPupilId,
      parentId: dashboardData.parent.id,
      startDate,
      endDate,
      reason,
      notes,
    });

    await loadPortalData(activePupilId);
    setIsAbsenceModalOpen(false);
    setActionSuccess("Absence notice submitted to the school administration.");
    setTimeout(() => setActionSuccess(null), 5000);
  };

  // Payment proof submissions are managed via PaymentProofModal directly

  if (!isSignedIn) {
    return (
      <main className="min-h-[100dvh] bg-[#F4F1F7] text-[#27232D] lg:grid lg:grid-cols-[minmax(0,1.08fr)_minmax(430px,0.92fr)]">
        <section className="relative hidden min-h-[100dvh] overflow-hidden bg-[#29166F] lg:flex lg:flex-col lg:justify-between">
          <img
            src="/images/school/outdoor-learning-circle.jpg"
            alt="Marie Louise School pupils learning outdoors"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-[#1D0E4B]/80" />
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(41,22,111,0.98)_8%,rgba(41,22,111,0.68)_58%,rgba(20,9,49,0.48)_100%)]" />

          <div className="relative z-10 flex items-center justify-between p-10 xl:p-14">
            <SchoolLogo variant="dark" onClick={onBackToSchool} />
            <button
              onClick={onBackToSchool}
              className="inline-flex items-center gap-2 text-sm font-bold text-white/80 transition-colors hover:text-white cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              School website
            </button>
          </div>

          <div className="relative z-10 max-w-2xl px-10 pb-16 xl:px-14 xl:pb-20">
            <div className="mb-6 flex items-center gap-3 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#E9DB3D]">
              <span className="h-px w-10 bg-[#E9DB3D]" />
              Parent partnership & Multi-Child Hub
            </div>
            <h1 className="max-w-xl text-5xl font-extrabold leading-[1.02] text-white xl:text-6xl">
              Every milestone, closer to home.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-white/76">
              Follow your children&apos;s daily homework, continuous assessments, attendance, and fee statements from one private family hub.
            </p>

            <div className="mt-12 grid max-w-xl grid-cols-3 border-y border-white/18 py-6">
              <div>
                <p className="text-2xl font-extrabold text-white">98.4%</p>
                <p className="mt-1 text-xs text-white/60">Family attendance</p>
              </div>
              <div className="border-x border-white/18 px-7">
                <p className="text-2xl font-extrabold text-white">3</p>
                <p className="mt-1 text-xs text-white/60">Linked pupils</p>
              </div>
              <div className="pl-7">
                <p className="text-2xl font-extrabold text-white">1 login</p>
                <p className="mt-1 text-xs text-white/60">For your family</p>
              </div>
            </div>
          </div>
        </section>

        <section className="flex min-h-[100dvh] flex-col bg-white px-5 py-5 sm:px-10 lg:px-12 xl:px-20">
          <div className="flex items-center justify-between lg:hidden">
            <SchoolLogo onClick={onBackToSchool} />
            <button
              onClick={onBackToSchool}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#E8E2ED] text-[#29166F]"
              aria-label="Back to school website"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          </div>

          <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12">
            <div className="mb-9">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#F1ECF6] text-[#581C87]">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#581C87]">Parent portal</p>
              <h2 className="mt-2 text-3xl font-extrabold text-[#29166F] sm:text-4xl">Welcome back.</h2>
              <p className="mt-3 text-sm leading-6 text-[#625B69]">
                Sign in with the details supplied by the school office.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div>
                <label htmlFor="portal-identity" className="mb-2 block text-sm font-bold text-[#342D3A]">
                  Email or admission number
                </label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#817887]" />
                  <input
                    id="portal-identity"
                    name="identity"
                    autoComplete="username"
                    defaultValue="parent@email.com"
                    className="h-13 w-full rounded-lg border border-[#DCD5E1] bg-white pl-11 pr-4 text-sm outline-none transition focus:border-[#581C87] focus:ring-3 focus:ring-[#581C87]/10"
                    placeholder="parent@email.com or MLS-0012"
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label htmlFor="portal-password" className="text-sm font-bold text-[#342D3A]">Password</label>
                  <button type="button" className="text-xs font-bold text-[#581C87] hover:underline cursor-pointer">
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#817887]" />
                  <input
                    id="portal-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    defaultValue="demoPassword123"
                    className="h-13 w-full rounded-lg border border-[#DCD5E1] bg-white pl-11 pr-12 text-sm outline-none transition focus:border-[#581C87] focus:ring-3 focus:ring-[#581C87]/10"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-[#625B69] cursor-pointer"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <label className="flex items-center gap-3 text-sm text-[#625B69]">
                <input type="checkbox" defaultChecked className="h-4 w-4 accent-[#581C87]" />
                Keep me signed in on this device
              </label>

              {formError ? <p className="text-sm font-semibold text-red-700" role="alert">{formError}</p> : null}

              <button
                type="submit"
                className="group flex h-13 w-full items-center justify-center gap-2 rounded-lg bg-[#581C87] px-5 text-sm font-extrabold text-white shadow-[0_10px_24px_rgba(88,28,135,0.18)] transition hover:bg-[#29166F] active:scale-[0.99] cursor-pointer"
              >
                Sign in securely
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            </form>

            <div className="my-7 flex items-center gap-4 text-[10px] font-bold uppercase tracking-[0.14em] text-[#9A929F]">
              <span className="h-px flex-1 bg-[#E8E2ED]" />
              Preview mode
              <span className="h-px flex-1 bg-[#E8E2ED]" />
            </div>

            <button
              onClick={handleDemoSignIn}
              className="flex h-13 w-full items-center justify-center gap-2 rounded-lg border border-[#DCD5E1] bg-[#F8F6FA] px-5 text-sm font-extrabold text-[#29166F] transition hover:border-[#BBAFC4] hover:bg-[#F1ECF6] active:scale-[0.99] cursor-pointer"
            >
              <BookOpen className="h-4 w-4 text-[#581C87]" />
              View demo family dashboard
            </button>
            <p className="mt-3 text-center text-[11px] leading-5 text-[#817887]">
              Demonstration data only. One parent account accessing multiple linked pupils.
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 border-t border-[#EEE9F1] pt-5 text-[11px] text-[#817887]">
            <ShieldCheck className="h-3.5 w-3.5" />
            Private access for Marie Louise School families
          </div>
        </section>
      </main>
    );
  }

  const selectedPupil = dashboardData?.selectedPupil;
  const isFamilyView = dashboardData?.isFamilyView ?? false;
  const parent = dashboardData?.parent;
  const pupils = dashboardData?.pupils || [];
  const CurrentIcon = portalNavigation.find((item) => item.id === activeView)?.icon ?? Home;

  return (
    <main className="min-h-[100dvh] bg-[#F5F3F7] text-[#27232D]">
      {/* Demonstration Notice Strip */}
      <div className="bg-[#29166F] text-white px-4 py-2 text-xs border-b border-white/10 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded bg-[#E9DB3D] px-2 py-0.5 text-[10px] font-extrabold uppercase text-[#29166F]">
            Demonstration data
          </span>
          <span className="text-white/80 hidden sm:inline">
            Fictional parent account linked to {pupils.length} enrolled pupils. No live Airtable database connected yet.
          </span>
        </div>
        <span className="text-[11px] text-white/70 font-medium">
          Logged in as: <strong className="text-white">{parent?.fullName}</strong> ({parent?.admissionIdentity})
        </span>
      </div>

      {/* Action Notification Toast */}
      <AnimatePresence>
        {actionSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 right-4 sm:right-8 z-50 flex items-center gap-3 rounded-xl bg-[#087A50] px-5 py-3 text-sm font-bold text-white shadow-xl"
          >
            <CheckCircle2 className="h-5 w-5" />
            <span>{actionSuccess}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="sticky top-0 z-30 border-b border-[#E5DFE9] bg-white/95 backdrop-blur-xl">
        <div className="flex h-[72px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsMenuOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#E5DFE9] text-[#29166F] lg:hidden cursor-pointer"
              aria-label="Open portal navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <SchoolLogo onClick={onBackToSchool} />
            <span className="hidden h-7 w-px bg-[#E5DFE9] sm:block" />
            <span className="hidden text-xs font-extrabold uppercase tracking-[0.14em] text-[#581C87] sm:block">
              Parent portal
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveView("notices")}
              className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-[#E5DFE9] text-[#4C4652] hover:bg-[#F7F4FA] cursor-pointer"
              aria-label="Notifications bulletin"
            >
              <Bell className="h-4 w-4" />
              {(dashboardData?.notices.length ?? 0) > 0 && (
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-[#E0CA1D]" />
              )}
            </button>

            {/* Polished Accessible Child Selector in Header */}
            <div className="relative">
              <button
                ref={selectorButtonRef}
                onClick={() => setIsPupilMenuOpen((open) => !open)}
                aria-haspopup="listbox"
                aria-expanded={isPupilMenuOpen}
                aria-controls={listboxId}
                aria-label={
                  isFamilyView
                    ? "Active view: Family overview covering all children. Click to switch child."
                    : `Active pupil: ${selectedPupil?.fullName}, ${selectedPupil?.class}. Click to switch child.`
                }
                className="flex items-center gap-2.5 rounded-xl border border-[#E5DFE9] bg-white px-2.5 py-1.5 text-left transition hover:border-[#BBAFC4] hover:bg-[#FBF9FD] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#581C87]/20"
              >
                {isFamilyView ? (
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#29166F] text-xs font-extrabold text-[#E9DB3D]">
                    <Users className="h-4 w-4" />
                  </span>
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#581C87] text-xs font-extrabold text-white">
                    {selectedPupil?.avatarInitials}
                  </span>
                )}
                <div className="hidden sm:block">
                  <span className="block text-xs font-extrabold text-[#29166F] leading-tight">
                    {isFamilyView ? "Family Overview" : selectedPupil?.firstName}
                  </span>
                  <span className="block text-[10px] text-[#817887] leading-tight">
                    {isFamilyView ? `${pupils.length} Children` : selectedPupil?.class}
                  </span>
                </div>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-[#817887] transition-transform ${
                    isPupilMenuOpen ? "rotate-180 text-[#581C87]" : ""
                  }`}
                />
              </button>

              {/* Accessible Dropdown Listbox */}
              {isPupilMenuOpen && (
                <div
                  ref={selectorDropdownRef}
                  id={listboxId}
                  role="listbox"
                  aria-label="Linked children selection"
                  onKeyDown={handleDropdownKeyDown}
                  className="absolute right-0 top-full mt-2 w-72 sm:w-80 rounded-2xl border border-[#E5DFE9] bg-white p-2.5 shadow-[0_20px_45px_rgba(41,22,111,0.18)] z-50 focus:outline-none"
                >
                  <div className="px-3 py-1.5 border-b border-[#EEE9F1] mb-1 flex items-center justify-between">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#9A929F]">
                      Family Selection
                    </p>
                    <span className="text-[10px] font-bold text-[#581C87] bg-[#F1ECF6] px-2 py-0.5 rounded-full">
                      {pupils.length} linked
                    </span>
                  </div>

                  {/* Family Overview Option */}
                  <button
                    role="option"
                    aria-selected={isFamilyView}
                    onClick={() => handleSwitchPupil("family")}
                    className={`w-full flex items-center gap-3 rounded-xl p-2.5 text-left text-xs transition cursor-pointer mb-1 ${
                      isFamilyView
                        ? "bg-[#29166F] text-white shadow-sm"
                        : "text-[#342D3A] hover:bg-[#F8F6FA]"
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg font-extrabold shrink-0 ${
                        isFamilyView ? "bg-white/20 text-[#E9DB3D]" : "bg-[#29166F]/10 text-[#29166F]"
                      }`}
                    >
                      <Users className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className={`font-extrabold truncate ${isFamilyView ? "text-white" : "text-[#29166F]"}`}>
                          Family Overview
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shrink-0 ${
                            isFamilyView ? "bg-[#E9DB3D] text-[#29166F]" : "bg-[#EEE9F1] text-[#625B69]"
                          }`}
                        >
                          All Pupils
                        </span>
                      </div>
                      <p className={`text-[11px] truncate mt-0.5 ${isFamilyView ? "text-white/80" : "text-[#817887]"}`}>
                        Consolidated homework, fees & attendance
                      </p>
                    </div>
                  </button>

                  <div className="px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-[#9A929F]">
                    Individual Pupil Records
                  </div>

                  {/* Individual Pupil Options */}
                  <div className="space-y-1">
                    {pupils.map((pupil) => {
                      const isSelected = !isFamilyView && pupil.id === activePupilId;
                      return (
                        <button
                          key={pupil.id}
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => handleSwitchPupil(pupil.id)}
                          className={`w-full flex items-center gap-3 rounded-xl p-2.5 text-left text-xs transition cursor-pointer ${
                            isSelected
                              ? "bg-[#F0EBF5] text-[#581C87] border border-[#581C87]/20 shadow-xs"
                              : "text-[#342D3A] hover:bg-[#F8F6FA]"
                          }`}
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#581C87] text-white font-extrabold text-sm shrink-0">
                            {pupil.avatarInitials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-extrabold text-[#29166F] truncate">
                                {pupil.fullName}
                              </span>
                              <span className="inline-flex items-center gap-1 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-[#E5F7ED] text-[#087A50] shrink-0">
                                <CheckCircle2 className="h-2.5 w-2.5" />
                                {pupil.status}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#817887]">
                              <span className="font-semibold text-[#581C87]">{pupil.class}</span>
                              <span>&bull;</span>
                              <span>{pupil.admissionNumber}</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="sticky top-[72px] hidden h-[calc(100dvh-72px)] border-r border-[#E5DFE9] bg-white px-4 py-6 lg:flex lg:flex-col">
          <PortalMenu activeView={activeView} onSelect={setActiveView} />

          {/* Quick Switcher in Sidebar */}
          <div className="my-6 rounded-xl border border-[#EEE9F1] bg-[#FAF8FC] p-3">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#9A929F] mb-2">
              Viewing profile
            </p>
            <div className="flex items-center gap-2.5">
              {isFamilyView ? (
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#29166F] text-xs font-bold text-[#E9DB3D]">
                  <Users className="h-4 w-4" />
                </div>
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#581C87] text-xs font-bold text-white">
                  {selectedPupil?.avatarInitials}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#29166F] truncate">
                  {isFamilyView ? "Family Overview" : selectedPupil?.fullName}
                </p>
                <p className="text-[10px] text-[#817887] truncate">
                  {isFamilyView
                    ? "All Enrolled Children"
                    : `${selectedPupil?.class} · ${selectedPupil?.admissionNumber}`}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-auto space-y-1 border-t border-[#EEE9F1] pt-4">
            <button
              onClick={onBackToSchool}
              className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-bold text-[#625B69] hover:bg-[#F7F4FA] hover:text-[#29166F] cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" /> School website
            </button>
            <button
              onClick={() => setIsSignedIn(false)}
              className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-bold text-[#625B69] hover:bg-[#F7F4FA] hover:text-[#29166F] cursor-pointer"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </aside>

        <section className="min-w-0 px-4 py-7 sm:px-6 lg:px-9 lg:py-9 xl:px-12">
          {/* Section Header */}
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.15em] text-[#581C87]">
                <CurrentIcon className="h-4 w-4" /> {portalNavigation.find((item) => item.id === activeView)?.label}
              </p>
              <h1 className="mt-2 text-3xl font-extrabold text-[#29166F] sm:text-4xl">
                {activeView === "overview"
                  ? isFamilyView
                    ? `Welcome, ${parent?.firstName || "Chidinma"} · Family Hub`
                    : `Good afternoon, ${parent?.firstName || "Chidinma"}.`
                  : isFamilyView
                  ? `${portalNavigation.find((item) => item.id === activeView)?.label} · All Children`
                  : `${portalNavigation.find((item) => item.id === activeView)?.label} · ${selectedPupil?.firstName}`}
              </h1>
              <p className="mt-2 text-sm text-[#625B69]">
                {isFamilyView
                  ? `Comprehensive view across ${pupils.length} enrolled siblings · 2026/2027 academic session`
                  : `${selectedPupil?.academicTerm || "First term · 2026/2027 academic session"} · ${selectedPupil?.class}`}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[#E5F7ED] px-3 py-1.5 text-xs font-extrabold text-[#087A50]">
                <CheckCircle2 className="h-3.5 w-3.5" /> All records up to date
              </span>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeView + activePupilId}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -5 }}
              transition={{ duration: 0.22 }}
            >
              {activeView === "overview" && dashboardData ? (
                isFamilyView ? (
                  <FamilyOverview
                    data={dashboardData}
                    onSelectChild={handleSwitchPupil}
                    onNavigate={setActiveView}
                  />
                ) : (
                  <PupilOverview
                    data={dashboardData}
                    onNavigate={setActiveView}
                    onSwitchToFamily={() => handleSwitchPupil("family")}
                  />
                )
              ) : null}

              {activeView === "homework" && dashboardData ? (
                <Homework
                  data={dashboardData}
                  onSelectChild={handleSwitchPupil}
                  onToggleCompletion={handleToggleHomeworkCompletion}
                />
              ) : null}

              {activeView === "reports" && dashboardData ? (
                <Reports
                  data={dashboardData}
                  onOpenAbsenceModal={() => setActiveView("requests")}
                  onSelectChild={handleSwitchPupil}
                />
              ) : null}

              {activeView === "calendar" && dashboardData ? (
                <CalendarView
                  data={dashboardData}
                  onSelectChild={handleSwitchPupil}
                  onNavigate={setActiveView}
                />
              ) : null}

              {activeView === "timetable" && dashboardData ? (
                <Timetable
                  data={dashboardData}
                  onSelectChild={handleSwitchPupil}
                />
              ) : null}

              {activeView === "fees" && dashboardData ? (
                <Fees
                  data={dashboardData}
                  onOpenProofModal={(invoiceId, pupilId) => {
                    setProofModalInitialInvoiceId(invoiceId);
                    setProofModalInitialPupilId(pupilId);
                    setIsProofModalOpen(true);
                  }}
                  onSelectChild={handleSwitchPupil}
                  onNotify={(msg) => setActionSuccess(msg)}
                />
              ) : null}

              {activeView === "requests" && dashboardData ? (
                <RequestsView
                  data={dashboardData}
                  onSelectChild={handleSwitchPupil}
                  onRefreshData={() => loadPortalData(activePupilId)}
                  onNotify={(msg) => setActionSuccess(msg)}
                />
              ) : null}

              {activeView === "notices" && dashboardData ? (
                <Notices data={dashboardData} />
              ) : null}
            </motion.div>
          </AnimatePresence>
        </section>
      </div>

      {/* Ergonomic Mobile Drawer Menu with Mobile Child Selector */}
      <AnimatePresence>
        {isMenuOpen ? (
          <motion.div
            className="fixed inset-0 z-50 bg-[#160B35]/50 backdrop-blur-sm lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMenuOpen(false)}
          >
            <motion.aside
              className="absolute inset-y-0 left-0 flex w-[min(88vw,360px)] flex-col bg-white p-5 overflow-y-auto"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-6 flex items-center justify-between border-b border-[#EEE9F1] pb-4">
                <SchoolLogo onClick={onBackToSchool} />
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#E5DFE9] text-[#29166F] cursor-pointer"
                  aria-label="Close navigation menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Dedicated Mobile Child Selector */}
              <div className="mb-6 rounded-2xl bg-[#F8F6FA] border border-[#E5DFE9] p-3.5">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#581C87] mb-2.5">
                  Select Child or Family View
                </p>
                <div className="space-y-1.5">
                  <button
                    onClick={() => {
                      handleSwitchPupil("family");
                      setIsMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl text-left text-xs font-bold transition cursor-pointer ${
                      isFamilyView
                        ? "bg-[#29166F] text-white shadow-sm"
                        : "bg-white text-[#29166F] border border-[#E8E2ED]"
                    }`}
                  >
                    <Users className="h-4 w-4" />
                    <span>Family Overview (All {pupils.length} Children)</span>
                  </button>

                  {pupils.map((pupil) => (
                    <button
                      key={pupil.id}
                      onClick={() => {
                        handleSwitchPupil(pupil.id);
                        setIsMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs transition cursor-pointer ${
                        !isFamilyView && pupil.id === activePupilId
                          ? "bg-[#581C87] text-white font-bold"
                          : "bg-white text-[#342D3A] border border-[#E8E2ED]"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-extrabold ${
                            !isFamilyView && pupil.id === activePupilId
                              ? "bg-white/20 text-white"
                              : "bg-[#581C87]/15 text-[#581C87]"
                          }`}
                        >
                          {pupil.avatarInitials}
                        </span>
                        <span>{pupil.fullName}</span>
                      </div>
                      <span className="text-[10px] opacity-80">{pupil.class}</span>
                    </button>
                  ))}
                </div>
              </div>

              <PortalMenu
                activeView={activeView}
                onSelect={(view) => {
                  setActiveView(view);
                  setIsMenuOpen(false);
                }}
              />

              <div className="mt-auto space-y-2 border-t border-[#EEE9F1] pt-4">
                <button
                  onClick={onBackToSchool}
                  className="flex min-h-11 w-full items-center gap-3 px-3 text-sm font-bold text-[#625B69] cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" /> School website
                </button>
                <button
                  onClick={() => {
                    setIsSignedIn(false);
                    setIsMenuOpen(false);
                  }}
                  className="flex min-h-11 w-full items-center gap-3 px-3 text-sm font-bold text-[#625B69] cursor-pointer"
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </div>
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Absence Notification Modal */}
      <AnimatePresence>
        {isAbsenceModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#160B35]/50 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-[#EEE9F1] pb-4">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wider text-[#581C87]">Attendance Notice</p>
                  <h3 className="text-lg font-extrabold text-[#29166F]">Report Pupil Absence</h3>
                </div>
                <button
                  onClick={() => setIsAbsenceModalOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5DFE9] text-[#625B69] hover:bg-[#F8F6FA] cursor-pointer"
                  aria-label="Close modal"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleAbsenceSubmit} className="mt-5 space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-bold text-[#342D3A]">Select Child</label>
                  <select
                    name="pupilId"
                    defaultValue={dashboardData?.selectedPupil?.id || dashboardData?.pupils[0].id}
                    required
                    className="h-11 w-full rounded-lg border border-[#DCD5E1] px-3 text-sm outline-none focus:border-[#581C87]"
                  >
                    {dashboardData?.pupils.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.fullName} ({p.class} · {p.admissionNumber})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-[#342D3A]">Start Date</label>
                    <input
                      type="date"
                      name="startDate"
                      required
                      defaultValue={new Date().toISOString().split("T")[0]}
                      className="h-11 w-full rounded-lg border border-[#DCD5E1] px-3 text-sm outline-none focus:border-[#581C87]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-[#342D3A]">Expected Return Date</label>
                    <input
                      type="date"
                      name="endDate"
                      required
                      defaultValue={new Date().toISOString().split("T")[0]}
                      className="h-11 w-full rounded-lg border border-[#DCD5E1] px-3 text-sm outline-none focus:border-[#581C87]"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-[#342D3A]">Reason</label>
                  <select
                    name="reason"
                    required
                    className="h-11 w-full rounded-lg border border-[#DCD5E1] px-3 text-sm outline-none focus:border-[#581C87]"
                  >
                    <option value="Illness">Illness / Medical Issue</option>
                    <option value="Medical Appointment">Scheduled Doctor / Dental Visit</option>
                    <option value="Family Event">Family Engagement</option>
                    <option value="Travel">Travel / Relocation</option>
                    <option value="Other">Other Reason</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-[#342D3A]">Notes for Class Teacher & Office</label>
                  <textarea
                    name="notes"
                    required
                    rows={3}
                    placeholder="Provide relevant information for the school office register..."
                    className="w-full rounded-lg border border-[#DCD5E1] p-3 text-sm outline-none focus:border-[#581C87]"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsAbsenceModalOpen(false)}
                    className="h-11 rounded-lg border border-[#DCD5E1] px-4 text-xs font-bold text-[#625B69] hover:bg-[#F8F6FA] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="h-11 rounded-lg bg-[#581C87] px-5 text-xs font-extrabold text-white hover:bg-[#29166F] cursor-pointer"
                  >
                    Submit Absence Notice
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Payment Proof 3-Step Submission Modal */}
      {dashboardData && (
        <PaymentProofModal
          isOpen={isProofModalOpen}
          onClose={() => setIsProofModalOpen(false)}
          data={dashboardData}
          initialInvoiceId={proofModalInitialInvoiceId}
          initialPupilId={proofModalInitialPupilId}
          onSuccess={async (newProof) => {
            await loadPortalData(activePupilId);
            setActionSuccess(`Payment proof ${newProof.referenceNumber} recorded for Bursary verification.`);
            setTimeout(() => setActionSuccess(null), 6000);
          }}
        />
      )}
    </main>
  );
};

const PortalMenu: React.FC<{ activeView: PortalView; onSelect: (view: PortalView) => void }> = ({
  activeView,
  onSelect,
}) => (
  <nav className="space-y-1" aria-label="Parent portal navigation">
    <p className="mb-3 px-3 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#9A929F]">
      Family workspace
    </p>
    {portalNavigation.map((item) => {
      const Icon = item.icon;
      const active = activeView === item.id;
      return (
        <button
          key={item.id}
          onClick={() => onSelect(item.id)}
          className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-bold transition cursor-pointer ${
            active
              ? "bg-[#F0EBF5] text-[#581C87]"
              : "text-[#625B69] hover:bg-[#F7F4FA] hover:text-[#29166F]"
          }`}
          aria-current={active ? "page" : undefined}
        >
          <Icon className="h-[18px] w-[18px]" /> {item.label}
        </button>
      );
    })}
    <div className="mt-6 border-t border-[#EEE9F1] pt-5">
      <p className="mb-3 px-3 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#9A929F]">Support</p>
      <button className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-bold text-[#625B69] hover:bg-[#F7F4FA] hover:text-[#29166F] cursor-pointer">
        <HelpCircle className="h-[18px] w-[18px]" /> Get help
      </button>
    </div>
  </nav>
);

/**
 * 1. Family Overview Component: Shown when "Family overview" is selected.
 */
const FamilyOverview: React.FC<{
  data: ParentDashboardData;
  onSelectChild: (pupilId: string) => void;
  onNavigate: (view: PortalView) => void;
}> = ({ data, onSelectChild, onNavigate }) => {
  const totalBalance = data.invoices.reduce((acc, inv) => acc + inv.balance, 0);
  const avgAttendance = (
    data.pupils.reduce((acc, p) => acc + p.attendanceRate, 0) / data.pupils.length
  ).toFixed(1);

  // Group pending assignments by child for the family view
  const pendingByChild = data.pupils.map((pupil) => ({
    pupil,
    assignments: data.assignments.filter(
      (a) => a.pupilId === pupil.id && a.status === "Pending"
    ),
  }));

  return (
    <div className="space-y-7">
      {/* Family Banner Card */}
      <section className="overflow-hidden rounded-2xl bg-[#29166F] text-white p-6 sm:p-8 relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="rounded bg-[#E9DB3D] px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-[#29166F]">
                Family Hub
              </span>
              <span className="text-xs text-white/70">
                {data.parent.fullName}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Chukwuma Family Overview
            </h2>
            <p className="mt-2 text-sm text-white/80 max-w-xl leading-relaxed">
              Monitoring {data.pupils.length} enrolled children across Nursery and Primary school. Select any child card below for their dedicated academic file.
            </p>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 sm:border-l border-white/15 pt-4 sm:pt-0 sm:pl-8">
            <div className="text-left sm:text-right">
              <p className="text-3xl font-extrabold text-[#E9DB3D]">{avgAttendance}%</p>
              <p className="text-xs text-white/70">Family Attendance</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E5F7ED] px-3 py-1 text-xs font-bold text-[#087A50] mt-2">
              <CheckCircle2 className="h-3.5 w-3.5" /> All In Good Standing
            </span>
          </div>
        </div>
      </section>

      {/* Aggregate Family Metrics */}
      <section className="grid divide-y divide-[#E5DFE9] overflow-hidden rounded-xl border border-[#E5DFE9] bg-white sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <Metric
          label="Enrolled children"
          value={`${data.pupils.length} Pupils`}
          note="Nursery & Primary"
          icon={Users}
        />
        <Metric
          label="Total family balance"
          value={totalBalance === 0 ? "₦0.00 Settled" : `₦${totalBalance.toLocaleString()}`}
          note={totalBalance === 0 ? "All term invoices clear" : "Invoice payment pending"}
          icon={CreditCard}
        />
        <Metric
          label="Active bulletins"
          value={String(data.notices.length).padStart(2, "0")}
          note="Circulars & announcements"
          icon={Bell}
        />
      </section>

      {/* Upcoming Homework Summary by Child */}
      <section className="rounded-2xl border border-[#E5DFE9] bg-white p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EEE9F1] pb-4 mb-5">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-[#581C87]">
              Homework & Tasks
            </p>
            <h3 className="text-lg font-extrabold text-[#29166F]">
              Active Assignments Grouped by Child
            </h3>
          </div>
          <button
            onClick={() => onNavigate("homework")}
            className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#581C87] hover:underline cursor-pointer"
          >
            <span>Open homework manager</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {pendingByChild.map(({ pupil, assignments }) => (
            <div
              key={pupil.id}
              className="rounded-xl border border-[#EEE9F1] bg-[#FBF9FD] p-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 border-b border-[#EEE9F1] pb-2.5 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#581C87] text-white text-xs font-bold">
                      {pupil.avatarInitials}
                    </span>
                    <div>
                      <p className="font-extrabold text-xs text-[#29166F]">{pupil.fullName}</p>
                      <p className="text-[10px] text-[#817887]">{pupil.class}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#F0EBF5] text-[#581C87]">
                    {assignments.length} due
                  </span>
                </div>

                {assignments.length > 0 ? (
                  <div className="space-y-2">
                    {assignments.slice(0, 2).map((asg) => (
                      <div key={asg.id} className="rounded-lg bg-white p-2.5 border border-[#E8E2ED] text-xs">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-bold text-[#29166F] truncate">{asg.title}</span>
                          {asg.isDueSoon && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-[#FEF9C3] text-[#854D0E] shrink-0">
                              <Clock className="h-2.5 w-2.5" /> Soon
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#817887] flex items-center justify-between">
                          <span>{asg.subject}</span>
                          <span className="font-semibold text-[#581C87]">Due {asg.dueDate}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-4 text-center text-xs text-[#817887]">
                    <CheckCircle2 className="h-5 w-5 text-[#087A50] mx-auto mb-1" />
                    <span>No pending assignments!</span>
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  onSelectChild(pupil.id);
                  onNavigate("homework");
                }}
                className="mt-3 pt-2.5 border-t border-[#EEE9F1] text-[11px] font-bold text-[#581C87] hover:underline flex items-center justify-between cursor-pointer w-full"
              >
                <span>View all {pupil.firstName}&apos;s tasks</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Children Cards Grid */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#581C87]">
              Enrolled children profiles
            </p>
            <h3 className="text-lg font-extrabold text-[#29166F]">
              Select a pupil to open their individual workspace
            </h3>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {data.familyCards.map(({ pupil, attendanceRate, currentAverage, unpaidBalance }) => (
            <div
              key={pupil.id}
              className="group rounded-2xl border border-[#E5DFE9] bg-white p-6 shadow-sm hover:border-[#581C87]/40 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#581C87] text-white font-extrabold text-base shadow-sm">
                      {pupil.avatarInitials}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-base text-[#29166F] group-hover:text-[#581C87] transition-colors">
                        {pupil.fullName}
                      </h4>
                      <p className="text-xs font-bold text-[#581C87]">
                        {pupil.class} · {pupil.admissionNumber}
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#E5F7ED] px-2 py-0.5 text-[10px] font-extrabold text-[#087A50]">
                    {pupil.status}
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2 border-y border-[#EEE9F1] py-3 text-xs">
                  <div>
                    <span className="block text-[10px] font-bold text-[#817887]">Attendance</span>
                    <span className="font-extrabold text-[#29166F] text-base">{attendanceRate}%</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-[#817887]">Average Score</span>
                    <span className="font-extrabold text-[#29166F] text-base">{currentAverage}%</span>
                  </div>
                </div>

                <div className="mt-3 text-xs text-[#625B69] space-y-1">
                  <p><strong className="text-[#342D3A]">House:</strong> {pupil.house}</p>
                  <p><strong className="text-[#342D3A]">Teacher:</strong> {pupil.classTeacher}</p>
                  <p className="text-[11px] text-[#817887] italic line-clamp-2 mt-2">
                    &ldquo;{pupil.teacherRemarks}&rdquo;
                  </p>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-[#EEE9F1] flex items-center justify-between">
                <span className="text-xs font-bold text-[#087A50]">
                  {unpaidBalance === 0 ? "Fees fully settled" : `₦${unpaidBalance.toLocaleString()} Due`}
                </span>
                <button
                  onClick={() => onSelectChild(pupil.id)}
                  className="inline-flex items-center gap-1 text-xs font-extrabold text-[#581C87] hover:text-[#29166F] group-hover:underline cursor-pointer"
                >
                  <span>Open {pupil.firstName}&apos;s file</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Family Calendar & Combined Notices */}
      <div className="grid gap-7 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-xl border border-[#E5DFE9] bg-white p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#581C87]">School Calendar</p>
              <h3 className="mt-1 text-lg font-extrabold text-[#29166F]">Upcoming Key Dates</h3>
            </div>
            <CalendarDays className="h-5 w-5 text-[#817887]" />
          </div>
          <div className="divide-y divide-[#EEE9F1]">
            {data.calendarEvents.map((event) => (
              <div key={event.id} className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0">
                <div className="w-11 text-center">
                  <span className="block text-lg font-extrabold text-[#29166F]">{event.day}</span>
                  <span className="block text-[9px] font-extrabold tracking-wider text-[#817887]">{event.month}</span>
                </div>
                <span className="h-8 w-px bg-[#E5DFE9]" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-[#3E3744] truncate">{event.title}</p>
                  <p className="text-xs text-[#817887]">{event.category} · {event.targetClass || "All School"}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-[#E5DFE9] bg-white p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#581C87]">Family Directives</p>
              <h3 className="mt-1 text-lg font-extrabold text-[#29166F]">School Bulletins</h3>
            </div>
            <button
              onClick={() => onNavigate("notices")}
              className="text-xs font-extrabold text-[#581C87] hover:underline cursor-pointer"
            >
              View all
            </button>
          </div>
          <div className="space-y-3">
            {data.notices.slice(0, 3).map((notice) => (
              <div key={notice.id} className="rounded-lg bg-[#FAF8FC] border border-[#EEE9F1] p-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-extrabold text-[#581C87] text-[10px] uppercase">
                    {notice.category}
                  </span>
                  <span className="text-[11px] text-[#817887]">{notice.date}</span>
                </div>
                <h4 className="font-bold text-[#29166F] mt-1 text-sm">{notice.title}</h4>
                <p className="text-[#625B69] mt-1 line-clamp-2 leading-relaxed">{notice.copy}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

/**
 * 2. Individual Pupil Overview Component
 */
const PupilOverview: React.FC<{
  data: ParentDashboardData;
  onNavigate: (view: PortalView) => void;
  onSwitchToFamily: () => void;
}> = ({ data, onNavigate, onSwitchToFamily }) => {
  const pupil = data.selectedPupil || data.pupils[0];
  const totalBalance = data.invoices.reduce((acc, inv) => acc + inv.balance, 0);

  return (
    <div className="space-y-7">
      {/* Student Profile Card */}
      <section className="grid overflow-hidden rounded-xl bg-[#29166F] text-white lg:grid-cols-[1.35fr_0.65fr]">
        <div className="p-6 sm:p-8">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#E9DB3D]">
              Student profile
            </p>
            <button
              onClick={onSwitchToFamily}
              className="inline-flex items-center gap-1.5 text-xs text-white/80 hover:text-white bg-white/10 px-2.5 py-1 rounded-lg transition cursor-pointer"
            >
              <Users className="h-3.5 w-3.5" />
              <span>Switch to family view</span>
            </button>
          </div>

          <div className="mt-5 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white/12 text-xl font-extrabold text-[#E9DB3D] border border-white/20">
              {pupil.avatarInitials}
            </div>
            <div>
              <h2 className="text-xl font-extrabold sm:text-2xl">{pupil.fullName}</h2>
              <p className="mt-1 text-sm text-white/68">
                {pupil.class} · {pupil.admissionNumber}
              </p>
            </div>
          </div>
          <div className="mt-7 flex flex-wrap gap-x-8 gap-y-3 border-t border-white/15 pt-5 text-xs text-white/70">
            <span>
              <strong className="block text-white">{pupil.classTeacher}</strong>
              Class teacher
            </span>
            <span>
              <strong className="block text-white">{pupil.house}</strong>
              School house
            </span>
            <span>
              <strong className="block text-white">{pupil.status}</strong>
              Current status
            </span>
          </div>
        </div>

        <div className="flex items-center justify-center border-t border-white/12 bg-[#351A7D] p-7 lg:border-l lg:border-t-0">
          <div className="text-center">
            <div className="relative mx-auto flex h-28 w-28 items-center justify-center rounded-full border-[9px] border-white/12">
              <div className="absolute inset-[-9px] rounded-full border-[9px] border-transparent border-r-[#E9DB3D] border-t-[#E9DB3D] rotate-45" />
              <span className="text-2xl font-extrabold">{pupil.attendanceRate}%</span>
            </div>
            <p className="mt-4 text-xs font-bold text-white/68">Term attendance</p>
          </div>
        </div>
      </section>

      {/* Key Metrics */}
      <section className="grid divide-y divide-[#E5DFE9] overflow-hidden rounded-xl border border-[#E5DFE9] bg-white sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <Metric
          label="Current average"
          value={`${pupil.currentAverage}%`}
          note="Continuous assessment progress"
          icon={GraduationCap}
        />
        <Metric
          label="Fees status"
          value={totalBalance === 0 ? "Settled" : `₦${totalBalance.toLocaleString()}`}
          note={totalBalance === 0 ? "No outstanding balance" : "Invoice payment due"}
          icon={CreditCard}
        />
        <Metric
          label="School circulars"
          value={String(data.notices.length).padStart(2, "0")}
          note="Active bulletins"
          icon={Bell}
        />
      </section>

      <div className="grid gap-7 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-xl border border-[#E5DFE9] bg-white p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#581C87]">Learning snapshot</p>
              <h3 className="mt-1 text-lg font-extrabold text-[#29166F]">Academic progress</h3>
            </div>
            <button
              onClick={() => onNavigate("reports")}
              className="text-xs font-extrabold text-[#581C87] hover:underline cursor-pointer"
            >
              View report
            </button>
          </div>
          <div className="space-y-5">
            {data.academicProgress.map((item) => (
              <Progress key={item.subject} label={item.subject} score={item.score} />
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-[#E5DFE9] bg-white p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#581C87]">Coming up</p>
              <h3 className="mt-1 text-lg font-extrabold text-[#29166F]">School calendar</h3>
            </div>
            <CalendarDays className="h-5 w-5 text-[#817887]" />
          </div>
          <div className="divide-y divide-[#EEE9F1]">
            {data.calendarEvents.slice(0, 3).map((event) => (
              <div key={event.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                <div className="w-11 text-center">
                  <span className="block text-lg font-extrabold text-[#29166F]">{event.day}</span>
                  <span className="block text-[9px] font-extrabold tracking-wider text-[#817887]">{event.month}</span>
                </div>
                <span className="h-8 w-px bg-[#E5DFE9]" />
                <p className="text-sm font-bold text-[#3E3744]">{event.title}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

const Metric: React.FC<{ label: string; value: string; note: string; icon: React.ElementType }> = ({
  label,
  value,
  note,
  icon: Icon,
}) => (
  <div className="p-5 sm:p-6">
    <div className="flex items-start justify-between">
      <p className="text-xs font-bold text-[#817887]">{label}</p>
      <Icon className="h-4 w-4 text-[#581C87]" />
    </div>
    <p className="mt-3 text-2xl font-extrabold text-[#29166F]">{value}</p>
    <p className="mt-1 text-[11px] font-semibold text-[#087A50]">{note}</p>
  </div>
);

const Progress: React.FC<{ label: string; score: number }> = ({ label, score }) => (
  <div>
    <div className="mb-2 flex justify-between text-xs font-bold">
      <span className="text-[#4C4652]">{label}</span>
      <span className="text-[#29166F]">{score}%</span>
    </div>
    <div className="h-2 overflow-hidden rounded-full bg-[#EEE9F1]">
      <div className="h-full rounded-full bg-[#581C87]" style={{ width: `${score}%` }} />
    </div>
  </div>
);

/**
 * 3. Complete Homework & Assignments Component
 */
const Homework: React.FC<{
  data: ParentDashboardData;
  onSelectChild: (pupilId: string) => void;
  onToggleCompletion: (assignmentId: string, completed: boolean) => void;
}> = ({ data, onSelectChild, onToggleCompletion }) => {
  const [statusFilter, setStatusFilter] = useState<"all" | "upcoming" | "completed" | "overdue">("all");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"due-soon" | "due-late" | "subject-az">("due-soon");
  const [detailAssignment, setDetailAssignment] = useState<Assignment | null>(null);

  const pupil = data.selectedPupil;
  const isFamily = data.isFamilyView;

  // Extract unique subjects for dropdown
  const availableSubjects = useMemo(() => {
    const set = new Set<string>();
    data.assignments.forEach((a) => set.add(a.subject));
    return Array.from(set).sort();
  }, [data.assignments]);

  // Counts for filters
  const counts = useMemo(() => {
    let upcoming = 0;
    let completed = 0;
    let overdue = 0;
    data.assignments.forEach((a) => {
      if (a.status === "Pending") upcoming++;
      else if (a.status === "Completed" || a.status === "Graded" || a.status === "Submitted") completed++;
      else if (a.status === "Overdue") overdue++;
    });
    return { all: data.assignments.length, upcoming, completed, overdue };
  }, [data.assignments]);

  // Filter and sort assignments
  const filteredAssignments = useMemo(() => {
    return data.assignments
      .filter((a) => {
        // Status filter
        if (statusFilter === "upcoming" && a.status !== "Pending") return false;
        if (
          statusFilter === "completed" &&
          a.status !== "Completed" &&
          a.status !== "Graded" &&
          a.status !== "Submitted"
        )
          return false;
        if (statusFilter === "overdue" && a.status !== "Overdue") return false;

        // Subject filter
        if (subjectFilter !== "all" && a.subject !== subjectFilter) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortOrder === "due-soon") {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        if (sortOrder === "due-late") {
          return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
        }
        if (sortOrder === "subject-az") {
          return a.subject.localeCompare(b.subject);
        }
        return 0;
      });
  }, [data.assignments, statusFilter, subjectFilter, sortOrder]);

  const resetFilters = () => {
    setStatusFilter("all");
    setSubjectFilter("all");
    setSortOrder("due-soon");
  };

  return (
    <div className="space-y-6">
      {/* Overview & Quick Info Strip */}
      <section className="rounded-2xl border border-[#E5DFE9] bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#EEE9F1] pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-[#F1ECF6] px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-[#581C87]">
                Curriculum & Homework
              </span>
              <span className="text-xs text-[#817887]">
                {isFamily ? "All Enrolled Children" : `${pupil?.fullName} (${pupil?.class})`}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#29166F] mt-1">
              Homework & Course Tasks
            </h2>
            <p className="text-xs sm:text-sm text-[#625B69] mt-1">
              {isFamily
                ? "Oversee coursework across all children. Filter by status or select an individual pupil profile above."
                : `Active homework assignments set by ${pupil?.classTeacher || "class teachers"}. Review instructions and mark tasks complete.`}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-[#FAF8FC] border border-[#E8E2ED] px-3.5 py-2 text-xs font-extrabold text-[#29166F]">
              <BookMarked className="h-4 w-4 text-[#581C87]" />
              <span>{counts.upcoming} Upcoming</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-[#E5F7ED] px-3.5 py-2 text-xs font-extrabold text-[#087A50]">
              <CheckCircle2 className="h-4 w-4" />
              <span>{counts.completed} Done</span>
            </span>
          </div>
        </div>

        {/* Filter and Sort Controls */}
        <div className="mt-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Status Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {[
              { id: "all", label: "All Tasks", count: counts.all },
              { id: "upcoming", label: "Upcoming", count: counts.upcoming },
              { id: "completed", label: "Completed", count: counts.completed },
              { id: "overdue", label: "Overdue", count: counts.overdue },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition cursor-pointer ${
                  statusFilter === tab.id
                    ? "bg-[#581C87] text-white shadow-xs"
                    : "bg-[#F8F6FA] text-[#625B69] hover:bg-[#F1ECF6] hover:text-[#29166F]"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-extrabold ${
                    statusFilter === tab.id
                      ? "bg-white/20 text-white"
                      : "bg-[#E8E2ED] text-[#581C87]"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Secondary Controls: Subject filter & Sort */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <select
                aria-label="Filter by subject"
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="h-10 rounded-xl border border-[#DCD5E1] bg-white pl-3 pr-8 text-xs font-bold text-[#342D3A] outline-none transition focus:border-[#581C87] cursor-pointer"
              >
                <option value="all">All Subjects</option>
                {availableSubjects.map((subj) => (
                  <option key={subj} value={subj}>
                    {subj}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative">
              <select
                aria-label="Sort assignments"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
                className="h-10 rounded-xl border border-[#DCD5E1] bg-white pl-3 pr-8 text-xs font-bold text-[#342D3A] outline-none transition focus:border-[#581C87] cursor-pointer"
              >
                <option value="due-soon">Due Date: Soonest first</option>
                <option value="due-late">Due Date: Latest first</option>
                <option value="subject-az">Subject: A to Z</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Assignment Cards List / Mobile Ergonomics */}
      {filteredAssignments.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredAssignments.map((asg) => {
            const child = data.pupils.find((p) => p.id === asg.pupilId);
            const isCompleted =
              asg.status === "Completed" || asg.status === "Graded" || asg.status === "Submitted";
            const isOverdue = asg.status === "Overdue";

            return (
              <div
                key={asg.id}
                className={`rounded-2xl border bg-white p-5 shadow-xs transition-all flex flex-col justify-between ${
                  asg.isDueSoon && !isCompleted
                    ? "border-[#E9DB3D]/80 bg-[linear-gradient(180deg,#FFFEF7_0%,#FFFFFF_100%)] shadow-sm"
                    : isOverdue
                    ? "border-[#FCA5A5]/60 bg-[linear-gradient(180deg,#FFFDFD_0%,#FFFFFF_100%)]"
                    : "border-[#E5DFE9] hover:border-[#BBAFC4]"
                }`}
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="rounded-md bg-[#F1ECF6] px-2 py-0.5 text-[10px] font-extrabold uppercase text-[#581C87]">
                        {asg.subject}
                      </span>
                      {isFamily && child && (
                        <span className="rounded-md bg-[#29166F]/10 px-2 py-0.5 text-[10px] font-bold text-[#29166F]">
                          {child.firstName} ({child.class})
                        </span>
                      )}
                    </div>

                    {/* Status Pill with Visual Prioritization for Due Soon */}
                    {isCompleted ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#E5F7ED] px-2.5 py-0.5 text-[10px] font-extrabold text-[#087A50]">
                        <CheckCircle2 className="h-3 w-3" />
                        {asg.status === "Graded" ? `Graded: ${asg.score}%` : "Completed"}
                      </span>
                    ) : isOverdue ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#FEE2E2] px-2.5 py-0.5 text-[10px] font-extrabold text-[#991B1B]">
                        <AlertCircle className="h-3 w-3" />
                        Overdue
                      </span>
                    ) : asg.isDueSoon ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF9C3] border border-[#FDE047]/60 px-2.5 py-0.5 text-[10px] font-extrabold text-[#854D0E]">
                        <Clock className="h-3 w-3 text-[#A16207]" />
                        Due soon
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#F8F6FA] px-2.5 py-0.5 text-[10px] font-extrabold text-[#625B69]">
                        Upcoming
                      </span>
                    )}
                  </div>

                  {/* Title & Description */}
                  <h3 className="font-extrabold text-base text-[#29166F] leading-snug">
                    {asg.title}
                  </h3>
                  {asg.description && (
                    <p className="text-xs text-[#625B69] mt-1.5 line-clamp-2 leading-relaxed">
                      {asg.description}
                    </p>
                  )}

                  {/* Dates and Teacher Metadata */}
                  <div className="mt-4 border-t border-[#EEE9F1] pt-3 text-xs text-[#817887] space-y-1">
                    <div className="flex items-center justify-between">
                      <span>Teacher:</span>
                      <strong className="text-[#342D3A] font-semibold">{asg.teacher}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Due date:</span>
                      <strong
                        className={`font-bold ${
                          isOverdue
                            ? "text-[#991B1B]"
                            : asg.isDueSoon
                            ? "text-[#854D0E]"
                            : "text-[#29166F]"
                        }`}
                      >
                        {asg.dueDate}
                      </strong>
                    </div>
                    {asg.attachmentName && (
                      <div className="flex items-center justify-between text-[11px] pt-1">
                        <span className="inline-flex items-center gap-1 text-[#581C87]">
                          <Paperclip className="h-3 w-3" /> Resource attached
                        </span>
                        <span className="text-[#817887] font-medium">{asg.attachmentSize}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-5 pt-3.5 border-t border-[#EEE9F1] flex items-center justify-between gap-2">
                  <button
                    onClick={() => setDetailAssignment(asg)}
                    className="text-xs font-extrabold text-[#581C87] hover:underline cursor-pointer"
                  >
                    View instructions &rarr;
                  </button>

                  <button
                    onClick={() => onToggleCompletion(asg.id, !isCompleted)}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                      isCompleted
                        ? "bg-[#FAF8FC] border border-[#DCD5E1] text-[#625B69] hover:bg-[#F1ECF6]"
                        : "bg-[#581C87] text-white hover:bg-[#29166F]"
                    }`}
                  >
                    {isCompleted ? (
                      <>
                        <RotateCcw className="h-3 w-3" />
                        <span>Reopen</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Mark done</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="rounded-2xl border border-dashed border-[#DCD5E1] bg-white p-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F1ECF6] text-[#581C87] mb-4">
            <BookOpen className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-extrabold text-[#29166F]">
            No homework matches your filter
          </h3>
          <p className="mt-1.5 text-sm text-[#625B69] max-w-md mx-auto">
            {statusFilter === "overdue"
              ? "All clear! There are no overdue assignments on this file."
              : statusFilter === "upcoming"
              ? "No pending assignments due under this criteria."
              : "Try adjusting your subject filter or view all assignments."}
          </p>
          <button
            onClick={resetFilters}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#581C87] px-5 py-2.5 text-xs font-extrabold text-white transition hover:bg-[#29166F] cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Clear all filters</span>
          </button>
        </div>
      )}

      {/* Assignment Detail Responsive Modal / Drawer */}
      <AnimatePresence>
        {detailAssignment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#160B35]/50 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 sm:p-7 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4 border-b border-[#EEE9F1] pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="rounded-md bg-[#F1ECF6] px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-[#581C87]">
                      {detailAssignment.subject}
                    </span>
                    {detailAssignment.isDueSoon && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded bg-[#FEF9C3] text-[#854D0E]">
                        <Clock className="h-3 w-3" /> Due Soon
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-extrabold text-[#29166F]">
                    {detailAssignment.title}
                  </h3>
                  <p className="text-xs text-[#817887] mt-0.5">
                    Set by {detailAssignment.teacher} &bull; Assigned {detailAssignment.assignedDate}
                  </p>
                </div>
                <button
                  onClick={() => setDetailAssignment(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5DFE9] text-[#625B69] hover:bg-[#F8F6FA] cursor-pointer shrink-0"
                  aria-label="Close details"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-5 space-y-5 text-sm text-[#342D3A]">
                {/* Due Date Card */}
                <div className="rounded-xl bg-[#FAF8FC] border border-[#EEE9F1] p-4 flex items-center justify-between">
                  <div>
                    <span className="block text-[10px] font-extrabold uppercase tracking-wider text-[#817887]">
                      Submission Deadline
                    </span>
                    <span className="font-extrabold text-base text-[#29166F]">
                      {detailAssignment.dueDate}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] font-extrabold uppercase tracking-wider text-[#817887]">
                      Status
                    </span>
                    <span
                      className={`inline-block text-xs font-extrabold ${
                        detailAssignment.status === "Completed" || detailAssignment.status === "Graded"
                          ? "text-[#087A50]"
                          : detailAssignment.status === "Overdue"
                          ? "text-[#991B1B]"
                          : "text-[#854D0E]"
                      }`}
                    >
                      {detailAssignment.status}
                    </span>
                  </div>
                </div>

                {/* Instructions */}
                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#581C87] mb-2">
                    Assignment Instructions & Tasks
                  </h4>
                  <div className="rounded-xl border border-[#EEE9F1] bg-white p-4 text-xs leading-relaxed text-[#4C4652] whitespace-pre-line">
                    {detailAssignment.instructions || detailAssignment.description}
                  </div>
                </div>

                {/* Downloadable Worksheet Placeholder */}
                {detailAssignment.attachmentName && (
                  <div>
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#581C87] mb-2">
                      Coursework Resource Sheet
                    </h4>
                    <div className="flex items-center justify-between rounded-xl border border-[#DCD5E1] bg-[#FBF9FD] p-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#581C87]/15 text-[#581C87]">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#29166F]">
                            {detailAssignment.attachmentName}
                          </p>
                          <p className="text-[10px] text-[#817887]">
                            PDF Worksheet &bull; {detailAssignment.attachmentSize}
                          </p>
                        </div>
                      </div>
                      <a
                        href={detailAssignment.attachmentUrl || "#"}
                        onClick={(e) => {
                          e.preventDefault();
                          alert(`Downloading demo worksheet: ${detailAssignment.attachmentName}`);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#581C87] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#29166F] cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Download</span>
                      </a>
                    </div>
                  </div>
                )}

                {/* Teacher Feedback if Graded */}
                {detailAssignment.teacherFeedback && (
                  <div className="rounded-xl border border-[#E5F7ED] bg-[#F5FCF8] p-4">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#087A50]">
                      Teacher Feedback & Score ({detailAssignment.score}%)
                    </p>
                    <p className="text-xs font-bold text-[#29166F] italic mt-1">
                      &ldquo;{detailAssignment.teacherFeedback}&rdquo;
                    </p>
                  </div>
                )}

                {/* Parent Toggle Action */}
                <div className="border-t border-[#EEE9F1] pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span className="text-xs text-[#817887]">
                    Confirm your child has reviewed and completed this homework.
                  </span>
                  <button
                    onClick={() => {
                      const isDone =
                        detailAssignment.status === "Completed" ||
                        detailAssignment.status === "Graded" ||
                        detailAssignment.status === "Submitted";
                      onToggleCompletion(detailAssignment.id, !isDone);
                      setDetailAssignment((prev) =>
                        prev
                          ? {
                              ...prev,
                              status: isDone ? "Pending" : "Completed",
                              completedByParent: !isDone,
                            }
                          : null
                      );
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#581C87] px-5 py-3 text-xs font-extrabold text-white transition hover:bg-[#29166F] cursor-pointer shrink-0"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>
                      {detailAssignment.status === "Completed" ||
                      detailAssignment.status === "Graded" ||
                      detailAssignment.status === "Submitted"
                        ? "Mark as Pending (Reopen)"
                        : "Mark as Completed"}
                    </span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * 4. Reports & Attendance View
 */
const Reports: React.FC<{
  data: ParentDashboardData;
  onOpenAbsenceModal: () => void;
  onSelectChild: (pupilId: string) => void;
}> = ({ data, onOpenAbsenceModal, onSelectChild }) => {
  const isFamily = data.isFamilyView;
  const pupil = data.selectedPupil || data.pupils[0];

  return (
    <div className="space-y-6">
      {isFamily ? (
        <div className="space-y-6">
          <div className="rounded-xl bg-[#FAF8FC] border border-[#EEE9F1] p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase text-[#581C87]">Family Reports</p>
              <h2 className="text-lg font-extrabold text-[#29166F]">
                Continuous Assessments for All Children
              </h2>
            </div>
            <button
              onClick={onOpenAbsenceModal}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#581C87] px-4 text-xs font-extrabold text-white cursor-pointer hover:bg-[#29166F] transition"
            >
              <Plus className="h-4 w-4" /> Report Absence
            </button>
          </div>

          {data.pupils.map((child) => (
            <section key={child.id} className="rounded-xl border border-[#E5DFE9] bg-white overflow-hidden shadow-xs">
              <div className="border-b border-[#EEE9F1] p-5 flex items-center justify-between bg-[#FDFCFE]">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#581C87] text-white font-extrabold text-sm">
                    {child.avatarInitials}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-[#29166F]">{child.fullName}</h3>
                    <p className="text-xs text-[#817887]">{child.class} · {child.classTeacher}</p>
                  </div>
                </div>
                <button
                  onClick={() => onSelectChild(child.id)}
                  className="text-xs font-extrabold text-[#581C87] hover:underline cursor-pointer"
                >
                  View full report &rarr;
                </button>
              </div>

              <div className="p-5">
                <blockquote className="text-sm font-bold text-[#342D3A] italic mb-4">
                  &ldquo;{child.teacherRemarks}&rdquo;
                </blockquote>
                <div className="flex items-center justify-between text-xs text-[#625B69] border-t border-[#EEE9F1] pt-3">
                  <span>Term Attendance: <strong className="text-[#29166F]">{child.attendanceRate}%</strong></span>
                  <span>Average Mark: <strong className="text-[#29166F]">{child.currentAverage}%</strong></span>
                  <span className="font-bold text-[#087A50]">{child.status}</span>
                </div>
              </div>
            </section>
          ))}
        </div>
      ) : (
        <>
          <section className="rounded-xl border border-[#E5DFE9] bg-white">
            <div className="flex flex-col justify-between gap-4 border-b border-[#EEE9F1] p-5 sm:flex-row sm:items-center sm:p-6">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#581C87]">
                  First term snapshot · {pupil.class}
                </p>
                <h2 className="mt-1 text-xl font-extrabold text-[#29166F]">
                  Continuous assessment: {pupil.fullName}
                </h2>
              </div>
              <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#581C87] px-4 text-xs font-extrabold text-white cursor-pointer hover:bg-[#29166F] transition">
                <Download className="h-4 w-4" /> Download report
              </button>
            </div>
            <div className="divide-y divide-[#EEE9F1] px-5 sm:px-6">
              {data.academicProgress.map((item) => (
                <div key={item.subject} className="grid gap-2 py-5 sm:grid-cols-[1fr_100px_120px] sm:items-center">
                  <p className="text-sm font-bold text-[#3E3744]">{item.subject}</p>
                  <p className="text-2xl font-extrabold text-[#29166F]">{item.score}%</p>
                  <p className="text-xs font-bold text-[#087A50]">{item.grade}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-[#E5DFE9] bg-white p-5 sm:p-6">
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#581C87]">Teacher&apos;s note</p>
            <blockquote className="mt-4 max-w-3xl text-lg font-bold leading-8 text-[#342D3A]">
              &ldquo;{pupil.teacherRemarks}&rdquo;
            </blockquote>
            <p className="mt-4 text-xs text-[#817887]">
              {pupil.classTeacher} · {pupil.teacherRole || `${pupil.class} Lead Teacher`}
            </p>
          </section>

          {/* Attendance Register for Selected Child */}
          <section className="rounded-xl border border-[#E5DFE9] bg-white p-5 sm:p-6">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#581C87]">Attendance Register</p>
                <h3 className="mt-1 text-lg font-extrabold text-[#29166F]">
                  Recent Clock-in Records: {pupil.firstName}
                </h3>
              </div>
              <button
                onClick={onOpenAbsenceModal}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#DCD5E1] bg-[#F8F6FA] px-4 text-xs font-extrabold text-[#581C87] hover:bg-[#F1ECF6] transition cursor-pointer"
              >
                <Plus className="h-4 w-4" /> Inform school of absence
              </button>
            </div>

            <div className="mt-5 divide-y divide-[#EEE9F1]">
              {data.attendanceRecords.slice(0, 5).map((att) => (
                <div key={att.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-[#817887]" />
                    <span className="text-sm font-semibold text-[#342D3A]">{att.date}</span>
                    {att.timeIn && <span className="text-xs text-[#817887]">({att.timeIn})</span>}
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E5F7ED] px-2.5 py-0.5 text-xs font-bold text-[#087A50]">
                    <CheckCircle2 className="h-3 w-3" /> {att.status}
                  </span>
                </div>
              ))}
            </div>

            {data.absenceReports.length > 0 && (
              <div className="mt-6 border-t border-[#EEE9F1] pt-4">
                <p className="mb-3 text-xs font-bold text-[#625B69]">Submitted Absence Notices</p>
                <div className="space-y-2">
                  {data.absenceReports.map((report) => (
                    <div key={report.id} className="flex items-center justify-between rounded-lg bg-[#F8F6FA] p-3 text-xs">
                      <div>
                        <span className="font-bold text-[#29166F]">{report.reason}</span>: {report.startDate} to {report.endDate}
                        <p className="text-[11px] text-[#625B69] mt-0.5">{report.notes}</p>
                      </div>
                      <span className="rounded-full bg-[#E8E2ED] px-2.5 py-1 font-extrabold text-[#581C87]">
                        {report.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};

/**
 * 4. Calendar & School Events View
 */
const CalendarView: React.FC<{
  data: ParentDashboardData;
  onSelectChild: (pupilId: string) => void;
  onNavigate: (view: PortalView) => void;
}> = ({ data, onSelectChild, onNavigate }) => {
  const isFamily = data.isFamilyView;
  const pupils = data.pupils;
  const activePupil = data.selectedPupil;

  // Initial date set to September 2026 (matching school session demo context)
  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 8, 20));
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedChildFilter, setSelectedChildFilter] = useState<string>(
    isFamily ? "all" : activePupil?.id || "all"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"calendar" | "agenda">("calendar");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Synchronize child filter if activePupil changes
  useEffect(() => {
    if (!isFamily && activePupil) {
      setSelectedChildFilter(activePupil.id);
    }
  }, [activePupil, isFamily]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Month navigation handlers
  const handlePrevMonth = () => {
    setIsLoading(true);
    setTimeout(() => {
      setCurrentDate(new Date(year, month - 1, 1));
      setIsLoading(false);
    }, 150);
  };

  const handleNextMonth = () => {
    setIsLoading(true);
    setTimeout(() => {
      setCurrentDate(new Date(year, month + 1, 1));
      setIsLoading(false);
    }, 150);
  };

  const handleToday = () => {
    setIsLoading(true);
    setTimeout(() => {
      setCurrentDate(new Date(2026, 8, 20));
      setIsLoading(false);
    }, 150);
  };

  // Category styling helper
  const getCategoryStyles = (category: CalendarEventCategory) => {
    switch (category) {
      case "School Event":
        return {
          badge: "bg-[#F1ECF6] text-[#581C87] border-[#D8C7E8]",
          dot: "bg-[#581C87]",
          card: "border-l-4 border-l-[#581C87]",
        };
      case "Holiday":
        return {
          badge: "bg-[#FEF9C3] text-[#854D0E] border-[#FDE68A]",
          dot: "bg-[#EAB308]",
          card: "border-l-4 border-l-[#EAB308]",
        };
      case "Test / Exam":
      case "Academic":
        return {
          badge: "bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]",
          dot: "bg-[#EF4444]",
          card: "border-l-4 border-l-[#EF4444]",
        };
      case "Assignment Deadline":
        return {
          badge: "bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]",
          dot: "bg-[#3B82F6]",
          card: "border-l-4 border-l-[#3B82F6]",
        };
      case "Fee Deadline":
        return {
          badge: "bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]",
          dot: "bg-[#10B981]",
          card: "border-l-4 border-l-[#10B981]",
        };
      case "Sports":
        return {
          badge: "bg-[#F0FDFA] text-[#0F766E] border-[#99F6E4]",
          dot: "bg-[#14B8A6]",
          card: "border-l-4 border-l-[#14B8A6]",
        };
      case "Arts & Culture":
      default:
        return {
          badge: "bg-[#FAF5FF] text-[#7E22CE] border-[#E9D5FF]",
          dot: "bg-[#A855F7]",
          card: "border-l-4 border-l-[#A855F7]",
        };
    }
  };

  // Filter events based on active category, child, and search
  const filteredEvents = useMemo(() => {
    return data.calendarEvents.filter((ev) => {
      // Category filter
      if (selectedCategory !== "all" && ev.category !== selectedCategory) {
        return false;
      }

      // Child filter: if specific child selected, event must either be applicable to all (empty pupilIds) or include child's ID
      if (selectedChildFilter !== "all") {
        if (ev.pupilIds && ev.pupilIds.length > 0 && !ev.pupilIds.includes(selectedChildFilter)) {
          return false;
        }
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = ev.title.toLowerCase().includes(q);
        const matchesDesc = ev.description?.toLowerCase().includes(q);
        const matchesLoc = ev.location?.toLowerCase().includes(q);
        const matchesTarget = ev.targetClass?.toLowerCase().includes(q);
        const matchesChild = ev.affectedPupilNames?.some((n) => n.toLowerCase().includes(q));

        if (!matchesTitle && !matchesDesc && !matchesLoc && !matchesTarget && !matchesChild) {
          return false;
        }
      }

      return true;
    });
  }, [data.calendarEvents, selectedCategory, selectedChildFilter, searchQuery]);

  // Generate calendar grid days for current month
  const calendarGrid = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const cells: {
      dateString: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      events: CalendarEvent[];
    }[] = [];

    // Previous month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i;
      const prevDate = new Date(year, month - 1, dayNum);
      const dateString = prevDate.toISOString().split("T")[0];
      const evs = filteredEvents.filter((e) => e.date === dateString);
      cells.push({
        dateString,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: false,
        events: evs,
      });
    }

    // Current month days
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const thisDate = new Date(year, month, day);
      const dateString = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const isToday = year === 2026 && month === 8 && day === 20; // 20 Sep 2026
      const evs = filteredEvents.filter((e) => {
        if (e.date === dateString) return true;
        if (e.endDate && dateString >= e.date && dateString <= e.endDate) return true;
        return false;
      });

      cells.push({
        dateString,
        dayNumber: day,
        isCurrentMonth: true,
        isToday,
        events: evs,
      });
    }

    // Next month padding to fill a complete 35 or 42 grid
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(year, month + 1, i);
      const dateString = nextDate.toISOString().split("T")[0];
      const evs = filteredEvents.filter((e) => e.date === dateString);
      cells.push({
        dateString,
        dayNumber: i,
        isCurrentMonth: false,
        isToday: false,
        events: evs,
      });
    }

    return cells;
  }, [year, month, filteredEvents]);

  // Events sorted chronologically for Agenda View
  const agendaEvents = useMemo(() => {
    return [...filteredEvents].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [filteredEvents]);

  const monthName = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      {/* Demonstration Notice */}
      <div className="rounded-xl border border-[#29166F]/15 bg-[#F8F6FA] p-4 text-xs text-[#581C87] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2.5">
          <CalendarDays className="h-4 w-4 text-[#581C87] shrink-0" />
          <span>
            <strong>Official Academic Calendar:</strong> Displays scheduled school events, assessments, homework
            deadlines, and fee payment milestones formatted for Airtable integration.
          </span>
        </div>
        <span className="text-[11px] font-bold text-[#817887]">
          {isFamily ? `Combined family schedule (${pupils.length} pupils)` : `Schedule for ${activePupil?.fullName}`}
        </span>
      </div>

      {/* Calendar Header & Controls Bar */}
      <section className="rounded-2xl border border-[#E5DFE9] bg-white p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#EEE9F1] pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#E9DB3D] px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-[#29166F]">
                Academic Year 2026/2027
              </span>
              <span className="text-xs font-bold text-[#817887]">First Term</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#29166F] mt-1">
              School & Family Events Calendar
            </h2>
          </div>

          {/* Month Navigation & View Switcher */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex items-center rounded-xl border border-[#DCD5E1] bg-[#FAF8FC] p-1 shadow-2xs">
              <button
                onClick={handlePrevMonth}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#581C87] hover:bg-white transition cursor-pointer"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-[140px] text-center text-xs font-extrabold text-[#29166F]">
                {monthName}
              </span>
              <button
                onClick={handleNextMonth}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#581C87] hover:bg-white transition cursor-pointer"
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <button
              onClick={handleToday}
              className="h-10 rounded-xl border border-[#DCD5E1] bg-white px-3 text-xs font-extrabold text-[#581C87] hover:bg-[#F8F6FA] transition cursor-pointer"
            >
              Today
            </button>

            {/* View Mode Toggle (Grid vs Agenda) */}
            <div className="inline-flex rounded-xl bg-[#EFEBF2] p-1 border border-[#E2DBE7]">
              <button
                onClick={() => setViewMode("calendar")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-extrabold transition cursor-pointer ${
                  viewMode === "calendar"
                    ? "bg-white text-[#29166F] shadow-xs"
                    : "text-[#625B69] hover:text-[#29166F]"
                }`}
              >
                <Calendar className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Monthly Grid</span>
              </button>
              <button
                onClick={() => setViewMode("agenda")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-extrabold transition cursor-pointer ${
                  viewMode === "agenda"
                    ? "bg-white text-[#29166F] shadow-xs"
                    : "text-[#625B69] hover:text-[#29166F]"
                }`}
              >
                <Clock className="h-3.5 w-3.5" />
                <span>Agenda / List</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filters Bar: Event Type & Child Selector & Search */}
        <div className="space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Child Filter (in Family Mode or multi-child access) */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-xs font-bold text-[#817887] whitespace-nowrap">Filter Child:</span>
              <button
                onClick={() => setSelectedChildFilter("all")}
                className={`rounded-full px-3 py-1 text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                  selectedChildFilter === "all"
                    ? "bg-[#29166F] text-white shadow-xs"
                    : "bg-[#F1ECF6] text-[#581C87] hover:bg-[#E8E2ED]"
                }`}
              >
                All Children ({pupils.length})
              </button>

              {pupils.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedChildFilter(p.id)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                    selectedChildFilter === p.id
                      ? "bg-[#581C87] text-white shadow-xs"
                      : "bg-[#F1ECF6] text-[#581C87] hover:bg-[#E8E2ED]"
                  }`}
                >
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/25 text-[9px]">
                    {p.avatarInitials}
                  </span>
                  <span>{p.firstName}</span>
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#817887]" />
              <input
                type="text"
                placeholder="Search event, exam, deadline..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-full rounded-lg border border-[#DCD5E1] bg-white pl-8 pr-3 text-xs outline-none transition focus:border-[#581C87] focus:ring-2 focus:ring-[#581C87]/15"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#817887] hover:text-[#29166F]"
                >
                  &times;
                </button>
              )}
            </div>
          </div>

          {/* Event Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-xs font-bold text-[#817887] mr-1">Event Type:</span>
            {(
              [
                { id: "all", label: "All Events" },
                { id: "School Event", label: "School Events" },
                { id: "Holiday", label: "Holidays" },
                { id: "Test / Exam", label: "Tests & Exams" },
                { id: "Assignment Deadline", label: "Assignment Deadlines" },
                { id: "Fee Deadline", label: "Fee Deadlines" },
                { id: "Sports", label: "Sports" },
              ] as const
            ).map((cat) => {
              const count = cat.id === "all"
                ? data.calendarEvents.length
                : data.calendarEvents.filter((e) => e.category === cat.id).length;

              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition cursor-pointer ${
                    selectedCategory === cat.id
                      ? "bg-[#581C87] text-white shadow-xs"
                      : "border border-[#E5DFE9] bg-white text-[#625B69] hover:bg-[#F8F6FA]"
                  }`}
                >
                  <span>{cat.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-extrabold ${
                      selectedCategory === cat.id ? "bg-white/25 text-white" : "bg-[#F1ECF6] text-[#581C87]"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4 py-8">
          <div className="h-64 w-full animate-pulse rounded-2xl bg-white/70 border border-[#E5DFE9]" />
        </div>
      )}

      {/* Error State */}
      {hasError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <h4 className="font-extrabold text-base text-red-900">Failed to load calendar events</h4>
          <p className="mt-1 text-xs text-red-600">Please retry or refresh your portal session.</p>
          <button
            onClick={() => setHasError(false)}
            className="mt-3 inline-flex items-center gap-1 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Try Again
          </button>
        </div>
      )}

      {/* VIEW 1: MONTHLY CALENDAR GRID (Responsive desktop/tablet) */}
      {!isLoading && !hasError && viewMode === "calendar" && (
        <div className="rounded-2xl border border-[#E5DFE9] bg-white shadow-xs overflow-hidden">
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 border-b border-[#EEE9F1] bg-[#F8F6FA] text-center text-xs font-extrabold uppercase tracking-wider text-[#581C87] py-3">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Calendar Grid Days */}
          <div className="grid grid-cols-7 divide-x divide-y divide-[#EEE9F1]">
            {calendarGrid.map((cell, idx) => {
              const hasEvents = cell.events.length > 0;

              return (
                <div
                  key={`${cell.dateString}-${idx}`}
                  className={`min-h-[100px] sm:min-h-[120px] p-1.5 sm:p-2 flex flex-col justify-between transition ${
                    !cell.isCurrentMonth
                      ? "bg-[#FAF9FB]/60 text-[#BBAFC4]"
                      : cell.isToday
                      ? "bg-[#FEF9C3]/25"
                      : "bg-white hover:bg-[#FDFCFE]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-extrabold ${
                        cell.isToday
                          ? "bg-[#29166F] text-[#E9DB3D]"
                          : cell.isCurrentMonth
                          ? "text-[#29166F]"
                          : "text-[#BBAFC4]"
                      }`}
                    >
                      {cell.dayNumber}
                    </span>
                    {cell.isToday && (
                      <span className="hidden sm:inline text-[9px] font-extrabold text-[#581C87] uppercase">
                        Today
                      </span>
                    )}
                  </div>

                  {/* Day Events Indicators */}
                  <div className="mt-1 space-y-1">
                    {cell.events.slice(0, 2).map((ev) => {
                      const style = getCategoryStyles(ev.category);
                      return (
                        <button
                          key={ev.id}
                          onClick={() => setSelectedEvent(ev)}
                          className={`w-full text-left truncate rounded px-1.5 py-0.5 text-[10px] font-bold border transition cursor-pointer ${style.badge}`}
                          title={`${ev.title} (${ev.time || ""})`}
                        >
                          <span className="truncate block">{ev.title}</span>
                        </button>
                      );
                    })}

                    {cell.events.length > 2 && (
                      <button
                        onClick={() => setSelectedEvent(cell.events[0])}
                        className="w-full text-center text-[10px] font-extrabold text-[#581C87] hover:underline cursor-pointer"
                      >
                        +{cell.events.length - 2} more
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: MOBILE-ERGONOMIC AGENDA VIEW */}
      {!isLoading && !hasError && (viewMode === "agenda" || calendarGrid.length === 0) && (
        <div className="space-y-4">
          <div className="rounded-xl border border-[#EEE9F1] bg-white p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase text-[#581C87]">Chronological Schedule</p>
              <h3 className="text-base font-extrabold text-[#29166F]">
                Upcoming School Milestones & Deadlines
              </h3>
            </div>
            <span className="text-xs font-bold text-[#817887]">
              {agendaEvents.length} Event{agendaEvents.length === 1 ? "" : "s"} Listed
            </span>
          </div>

          {agendaEvents.length > 0 ? (
            <div className="space-y-3">
              {agendaEvents.map((ev) => {
                const style = getCategoryStyles(ev.category);
                return (
                  <article
                    key={ev.id}
                    onClick={() => setSelectedEvent(ev)}
                    className={`rounded-2xl border border-[#E5DFE9] bg-white p-4 sm:p-5 shadow-xs hover:border-[#581C87]/40 hover:shadow-sm transition cursor-pointer ${style.card}`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3.5">
                        {/* Date badge */}
                        <div className="flex flex-col items-center justify-center rounded-xl bg-[#F8F6FA] border border-[#E8E2ED] px-3 py-2 text-center shrink-0 w-16">
                          <span className="text-lg font-extrabold text-[#29166F] leading-tight">
                            {ev.day || ev.date.split("-")[2]}
                          </span>
                          <span className="text-[10px] font-extrabold uppercase text-[#581C87] tracking-wider">
                            {ev.month || "SEP"}
                          </span>
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold border ${style.badge}`}>
                              {ev.category}
                            </span>
                            {ev.targetClass && (
                              <span className="text-[10px] font-bold text-[#817887] bg-[#F1F5F9] px-2 py-0.5 rounded">
                                {ev.targetClass}
                              </span>
                            )}
                          </div>

                          <h4 className="text-base font-extrabold text-[#29166F] leading-snug">
                            {ev.title}
                          </h4>

                          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#625B69]">
                            {ev.time && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5 text-[#817887]" />
                                <span>{ev.time}</span>
                              </span>
                            )}
                            {ev.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5 text-[#817887]" />
                                <span>{ev.location}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Affected Pupils Pill */}
                      <div className="flex items-center justify-between sm:justify-end gap-2 border-t sm:border-t-0 pt-2 sm:pt-0 border-[#EEE9F1]">
                        {ev.affectedPupilNames && ev.affectedPupilNames.length > 0 && (
                          <div className="flex items-center gap-1 text-[11px] font-bold text-[#581C87]">
                            <Users className="h-3.5 w-3.5" />
                            <span>{ev.affectedPupilNames.join(", ")}</span>
                          </div>
                        )}
                        <span className="text-xs font-bold text-[#581C87] hover:underline">
                          View details &rarr;
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-[#E5DFE9] bg-white p-12 text-center">
              <CalendarDays className="h-12 w-12 text-[#BBAFC4] mx-auto mb-3" />
              <h4 className="text-base font-extrabold text-[#29166F]">No events found</h4>
              <p className="mt-1 text-xs text-[#817887]">
                No scheduled activities match your current filter settings.
              </p>
              <button
                onClick={() => {
                  setSelectedCategory("all");
                  setSelectedChildFilter("all");
                  setSearchQuery("");
                }}
                className="mt-4 inline-flex items-center gap-1 rounded-lg border border-[#DCD5E1] bg-[#F8F6FA] px-4 py-2 text-xs font-extrabold text-[#581C87] hover:bg-[#F1ECF6] cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset all filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* EVENT DETAIL MODAL / PANEL */}
      <AnimatePresence>
        {selectedEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#160B35]/60 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl overflow-hidden"
            >
              <div className="flex items-start justify-between border-b border-[#EEE9F1] pb-4">
                <div>
                  <span className={`inline-block rounded-md px-2.5 py-0.5 text-[10px] font-extrabold border mb-1.5 ${getCategoryStyles(selectedEvent.category).badge}`}>
                    {selectedEvent.category}
                  </span>
                  <h3 className="text-lg font-extrabold text-[#29166F] leading-snug">
                    {selectedEvent.title}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5DFE9] text-[#625B69] hover:bg-[#F8F6FA] cursor-pointer shrink-0"
                  aria-label="Close detail modal"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 space-y-4 text-xs">
                {/* Date and Time */}
                <div className="flex items-center gap-3 rounded-xl bg-[#F8F6FA] p-3 border border-[#EEE9F1]">
                  <Clock className="h-4 w-4 text-[#581C87] shrink-0" />
                  <div>
                    <strong className="block text-sm text-[#29166F]">{selectedEvent.date}</strong>
                    <span className="text-[#817887]">{selectedEvent.time || "All day scheduled activity"}</span>
                  </div>
                </div>

                {/* Location */}
                {selectedEvent.location && (
                  <div className="flex items-center gap-3 rounded-xl bg-[#F8F6FA] p-3 border border-[#EEE9F1]">
                    <MapPin className="h-4 w-4 text-[#581C87] shrink-0" />
                    <div>
                      <span className="text-[#817887] block text-[10px] uppercase font-bold">Venue / Location</span>
                      <strong className="text-sm text-[#29166F]">{selectedEvent.location}</strong>
                    </div>
                  </div>
                )}

                {/* Affected Pupils */}
                <div className="rounded-xl border border-[#EEE9F1] p-3.5 bg-[#FAF8FC]">
                  <span className="text-[#817887] block text-[10px] uppercase font-bold mb-1.5">
                    Target Class & Affected Pupils
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-[#29166F] bg-white border border-[#E5DFE9] px-2.5 py-1 rounded-md">
                      {selectedEvent.targetClass || "All School Families"}
                    </span>
                    {selectedEvent.affectedPupilNames?.map((name) => (
                      <span
                        key={name}
                        className="font-extrabold text-[#581C87] bg-[#F1ECF6] border border-[#DDD6E5] px-2.5 py-1 rounded-md"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Description */}
                {selectedEvent.description && (
                  <div>
                    <span className="text-[#817887] block text-[10px] uppercase font-bold mb-1">
                      Event Overview
                    </span>
                    <p className="text-sm leading-relaxed text-[#342D3A] bg-[#FDFCFE] p-3 rounded-lg border border-[#EEE9F1]">
                      {selectedEvent.description}
                    </p>
                  </div>
                )}

                {/* Preparation / Notes */}
                {selectedEvent.notes && (
                  <div className="rounded-xl border border-[#D97706]/30 bg-[#FFFBEB] p-3 text-xs text-[#92400E]">
                    <strong className="block text-[11px] uppercase tracking-wider font-extrabold mb-1">
                      Parent Instructions & Notes:
                    </strong>
                    <p className="leading-relaxed">{selectedEvent.notes}</p>
                  </div>
                )}
              </div>

              <div className="mt-6 border-t border-[#EEE9F1] pt-4 flex items-center justify-end gap-2">
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="rounded-lg border border-[#DCD5E1] bg-white px-4 py-2 text-xs font-extrabold text-[#29166F] hover:bg-[#F8F6FA] cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * 5. Weekly Class Timetable Component
 */
const Timetable: React.FC<{
  data: ParentDashboardData;
  onSelectChild: (pupilId: string) => void;
}> = ({ data, onSelectChild }) => {
  const pupils = data.pupils;
  const activePupil = data.selectedPupil || pupils[0];

  const [selectedPupilId, setSelectedPupilId] = useState<string>(activePupil.id);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek | "All">("Monday");
  const [searchSubject, setSearchSubject] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Active pupil derived from state
  const currentPupil = pupils.find((p) => p.id === selectedPupilId) || activePupil;

  // Handle pupil switcher
  const handlePupilChange = (pupilId: string) => {
    setIsLoading(true);
    setHasError(false);
    setTimeout(() => {
      setSelectedPupilId(pupilId);
      onSelectChild(pupilId);
      setIsLoading(false);
    }, 200);
  };

  // Get timetable entries for current pupil's class
  const classEntries = useMemo(() => {
    return data.timetable.filter((t) => t.class === currentPupil.class);
  }, [data.timetable, currentPupil.class]);

  // Filter entries for selected day and optional search
  const displayedEntries = useMemo(() => {
    return classEntries.filter((entry) => {
      if (selectedDay !== "All" && entry.dayOfWeek !== selectedDay) {
        return false;
      }
      if (searchSubject.trim()) {
        const q = searchSubject.toLowerCase();
        const matchesSubj = entry.subject.toLowerCase().includes(q);
        const matchesTeacher = entry.teacher?.toLowerCase().includes(q);
        const matchesRoom = (entry.classroom || entry.room)?.toLowerCase().includes(q);
        if (!matchesSubj && !matchesTeacher && !matchesRoom) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      // Sort by period/time
      return a.startTime.localeCompare(b.startTime);
    });
  }, [classEntries, selectedDay, searchSubject]);

  // Distinct weekdays in schedule
  const weekdays: DayOfWeek[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

  // Subject color styling helper
  const getSubjectColor = (subject: string, isBreak?: boolean) => {
    if (isBreak) {
      return {
        card: "bg-[#F8F6FA] border-[#E8E2ED] text-[#581C87]",
        pill: "bg-[#EFEBF2] text-[#581C87]",
      };
    }
    const s = subject.toLowerCase();
    if (s.includes("math")) {
      return { card: "bg-[#EFF6FF] border-[#BFDBFE] text-[#1E40AF]", pill: "bg-[#DBEAFE] text-[#1D4ED8]" };
    }
    if (s.includes("english") || s.includes("literacy") || s.includes("phonics")) {
      return { card: "bg-[#FAF5FF] border-[#E9D5FF] text-[#6B21A8]", pill: "bg-[#F3E8FF] text-[#7E22CE]" };
    }
    if (s.includes("science") || s.includes("physics") || s.includes("biology")) {
      return { card: "bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]", pill: "bg-[#D1FAE5] text-[#047857]" };
    }
    if (s.includes("french")) {
      return { card: "bg-[#FFF7ED] border-[#FED7AA] text-[#9A3412]", pill: "bg-[#FFEDD5] text-[#C2410C]" };
    }
    if (s.includes("ict") || s.includes("robotics") || s.includes("python") || s.includes("coding")) {
      return { card: "bg-[#F0FDFA] border-[#99F6E4] text-[#0F766E]", pill: "bg-[#CCFBF1] text-[#0D9488]" };
    }
    if (s.includes("art") || s.includes("music") || s.includes("creative")) {
      return { card: "bg-[#FDF2F8] border-[#FBCFE8] text-[#9D174D]", pill: "bg-[#FCE7F3] text-[#BE185D]" };
    }
    if (s.includes("sports") || s.includes("physical") || s.includes("gym")) {
      return { card: "bg-[#FEF9C3] border-[#FDE68A] text-[#854D0E]", pill: "bg-[#FEF08A] text-[#A16207]" };
    }
    return { card: "bg-white border-[#E5DFE9] text-[#29166F]", pill: "bg-[#F1ECF6] text-[#581C87]" };
  };

  return (
    <div className="space-y-6">
      {/* Pupil & Class Banner */}
      <section className="overflow-hidden rounded-2xl bg-[#29166F] text-white p-6 sm:p-7 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#581C87] text-xl font-extrabold text-white border-2 border-white/20 shadow-inner">
              {currentPupil.avatarInitials}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#E9DB3D] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#29166F]">
                  {currentPupil.class} Class Schedule
                </span>
                <span className="text-xs text-white/70">
                  Admission No: <strong className="text-white">{currentPupil.admissionNumber}</strong>
                </span>
              </div>
              <h2 className="mt-1 text-2xl font-extrabold text-white">
                {currentPupil.fullName}
              </h2>
              <p className="text-xs text-white/75 mt-0.5">
                Lead Teacher: <strong>{currentPupil.classTeacher}</strong> &bull; House: {currentPupil.house}
              </p>
            </div>
          </div>

          {/* Quick Child Switcher Buttons */}
          <div className="rounded-xl bg-[#22105F] p-2 border border-white/10 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase text-white/60 px-2">Switch Child:</span>
            {pupils.map((p) => (
              <button
                key={p.id}
                onClick={() => handlePupilChange(p.id)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-extrabold transition cursor-pointer ${
                  p.id === currentPupil.id
                    ? "bg-[#E9DB3D] text-[#29166F] shadow-xs"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                <span>{p.firstName}</span>
                <span className="text-[10px] opacity-75">({p.class})</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Controls Bar: Day Selector Tabs & Search */}
      <section className="rounded-2xl border border-[#E5DFE9] bg-white p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Day Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedDay("Monday")}
            className={`rounded-xl px-3.5 py-2 text-xs font-extrabold transition cursor-pointer whitespace-nowrap ${
              selectedDay === "Monday"
                ? "bg-[#581C87] text-white shadow-xs"
                : "border border-[#E5DFE9] bg-white text-[#625B69] hover:bg-[#F8F6FA]"
            }`}
          >
            Today (Mon)
          </button>

          {weekdays.map((day) => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`rounded-xl px-3.5 py-2 text-xs font-extrabold transition cursor-pointer whitespace-nowrap ${
                selectedDay === day
                  ? "bg-[#581C87] text-white shadow-xs"
                  : "border border-[#E5DFE9] bg-white text-[#625B69] hover:bg-[#F8F6FA]"
              }`}
            >
              {day}
            </button>
          ))}

          <button
            onClick={() => setSelectedDay("All")}
            className={`rounded-xl px-3.5 py-2 text-xs font-extrabold transition cursor-pointer whitespace-nowrap ${
              selectedDay === "All"
                ? "bg-[#29166F] text-white shadow-xs"
                : "border border-[#E5DFE9] bg-white text-[#625B69] hover:bg-[#F8F6FA]"
            }`}
          >
            Full Week
          </button>
        </div>

        {/* Subject Filter */}
        <div className="relative sm:w-60">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#817887]" />
          <input
            type="text"
            placeholder="Search subject or teacher..."
            value={searchSubject}
            onChange={(e) => setSearchSubject(e.target.value)}
            className="h-9 w-full rounded-lg border border-[#DCD5E1] bg-white pl-8 pr-3 text-xs outline-none transition focus:border-[#581C87] focus:ring-2 focus:ring-[#581C87]/15"
          />
        </div>
      </section>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-3 py-6">
          <div className="h-20 w-full animate-pulse rounded-2xl bg-white border border-[#E5DFE9]" />
          <div className="h-20 w-full animate-pulse rounded-2xl bg-white border border-[#E5DFE9]" />
        </div>
      )}

      {/* Error State */}
      {hasError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <h4 className="font-extrabold text-base text-red-900">Unable to load timetable</h4>
          <p className="mt-1 text-xs text-red-600">Please retry or select another child.</p>
          <button
            onClick={() => setHasError(false)}
            className="mt-3 inline-flex items-center gap-1 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Try Again
          </button>
        </div>
      )}

      {/* TIMETABLE CONTENT: DAY VIEW & FULL WEEK VIEW */}
      {!isLoading && !hasError && (
        <div className="space-y-4">
          {displayedEntries.length > 0 ? (
            <div className="space-y-3">
              {displayedEntries.map((entry) => {
                const colors = getSubjectColor(entry.subject, entry.isBreak);

                return (
                  <article
                    key={entry.id}
                    className={`rounded-2xl border p-4 sm:p-5 shadow-xs transition hover:shadow-sm ${colors.card}`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start sm:items-center gap-3.5">
                        {/* Period Time Badge */}
                        <div className="rounded-xl bg-white border border-[#E5DFE9] px-3 py-2 text-center shrink-0 w-28 shadow-2xs">
                          <span className="block text-xs font-mono font-extrabold text-[#29166F]">
                            {entry.startTime}
                          </span>
                          <span className="block text-[10px] text-[#817887]">to {entry.endTime}</span>
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            {entry.isBreak ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-[#FAF5FF] px-2 py-0.5 text-[10px] font-extrabold text-[#581C87] border border-[#DDD6E5]">
                                <Coffee className="h-3 w-3" /> Interval Recess
                              </span>
                            ) : (
                              <span className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold ${colors.pill}`}>
                                Period {entry.period} &bull; {entry.dayOfWeek}
                              </span>
                            )}
                          </div>

                          <h3 className="text-base font-extrabold leading-snug">
                            {entry.subject}
                          </h3>

                          {/* Teacher and Room Info */}
                          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs opacity-85">
                            {entry.teacher && (
                              <span className="flex items-center gap-1">
                                <GraduationCap className="h-3.5 w-3.5" />
                                <span>{entry.teacher}</span>
                              </span>
                            )}
                            {(entry.classroom || entry.room) && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" />
                                <span>{entry.classroom || entry.room}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Tag */}
                      <div className="flex items-center gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-[#EEE9F1]">
                        <span className="text-xs font-bold text-[#817887]">
                          {entry.class}
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-[#E5DFE9] bg-white p-12 text-center">
              <Clock className="h-12 w-12 text-[#BBAFC4] mx-auto mb-3" />
              <h4 className="text-base font-extrabold text-[#29166F]">No scheduled periods</h4>
              <p className="mt-1 text-xs text-[#817887]">
                No timetable entries found for {selectedDay} matching &ldquo;{searchSubject}&rdquo;.
              </p>
              <button
                onClick={() => {
                  setSelectedDay("Monday");
                  setSearchSubject("");
                }}
                className="mt-4 inline-flex items-center gap-1 rounded-lg border border-[#DCD5E1] bg-[#F8F6FA] px-4 py-2 text-xs font-extrabold text-[#581C87] hover:bg-[#F1ECF6] cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset filter
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Consistent Nigerian Naira currency formatter
 */
const formatNaira = (amount: number, showKobo = true): string => {
  return `₦${amount.toLocaleString("en-NG", {
    minimumFractionDigits: showKobo ? 2 : 0,
    maximumFractionDigits: showKobo ? 2 : 0,
  })}`;
};

/**
 * 5. Fees & Receipts View (Airtable-Ready Architecture)
 */
const Fees: React.FC<{
  data: ParentDashboardData;
  onOpenProofModal: (invoiceId?: string, pupilId?: string) => void;
  onSelectChild: (pupilId: string) => void;
  onNotify?: (message: string) => void;
}> = ({ data, onOpenProofModal, onSelectChild, onNotify }) => {
  const isFamily = data.isFamilyView;
  const pupils = data.pupils;
  const activePupil = data.selectedPupil;

  // Navigation & filtering states
  const [activeTab, setActiveTab] = useState<"invoices" | "payments" | "proofs">("invoices");
  const [selectedTerm, setSelectedTerm] = useState<string>("First Term 2026/2027");
  const [statusFilter, setStatusFilter] = useState<"all" | "Outstanding" | "Part-paid" | "Overdue" | "Paid">("all");
  const [proofStatusFilter, setProofStatusFilter] = useState<"all" | "Pending Review" | "Verified" | "Rejected">("all");
  const [proofPupilFilter, setProofPupilFilter] = useState<string>("all");
  const [proofSearchQuery, setProofSearchQuery] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"due-soon" | "due-late" | "amount-high" | "amount-low">("due-soon");
  const [expandedInvoiceIds, setExpandedInvoiceIds] = useState<Set<string>>(new Set(["recInv001Term1"]));
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [isLoadingTerm, setIsLoadingTerm] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Online Payment Placeholder Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);
  const [isSimulatingGateway, setIsSimulatingGateway] = useState(false);
  const [gatewayResult, setGatewayResult] = useState<OnlinePaymentSessionResponse | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<PaymentGatewayProvider>("paystack");

  // Available terms derived from invoice records
  const availableTerms = useMemo(() => {
    const terms = Array.from(new Set(data.invoices.map((inv) => inv.term)));
    return terms.length > 0 ? terms : ["First Term 2026/2027"];
  }, [data.invoices]);

  // Unpaid invoices across current records
  const unpaidInvoices = useMemo(() => {
    return data.invoices.filter((inv) => inv.balance > 0);
  }, [data.invoices]);

  // Open online payment placeholder modal
  const handleOpenOnlinePayment = (specificInvoiceId?: string) => {
    if (specificInvoiceId) {
      setSelectedInvoiceIds([specificInvoiceId]);
    } else {
      const candidateInvoices =
        selectedTerm === "all"
          ? unpaidInvoices
          : unpaidInvoices.filter((i) => i.term === selectedTerm);
      const ids = candidateInvoices.length > 0
        ? candidateInvoices.map((i) => i.id)
        : unpaidInvoices.map((i) => i.id);
      setSelectedInvoiceIds(ids);
    }
    setGatewayResult(null);
    setIsPaymentModalOpen(true);
  };

  const handleToggleInvoiceSelection = (invId: string) => {
    setSelectedInvoiceIds((prev) =>
      prev.includes(invId) ? prev.filter((id) => id !== invId) : [...prev, invId]
    );
  };

  const handleSelectAllUnpaid = () => {
    setSelectedInvoiceIds(unpaidInvoices.map((i) => i.id));
  };

  const handleDeselectAll = () => {
    setSelectedInvoiceIds([]);
  };

  // Selected invoices for payment breakdown
  const selectedPaymentInvoices = useMemo(() => {
    return data.invoices.filter((inv) => selectedInvoiceIds.includes(inv.id));
  }, [data.invoices, selectedInvoiceIds]);

  const totalAmountSelected = useMemo(() => {
    return selectedPaymentInvoices.reduce((sum, inv) => sum + inv.balance, 0);
  }, [selectedPaymentInvoices]);

  // Handle future gateway simulation handshake
  const handleSimulateGateway = async () => {
    if (selectedPaymentInvoices.length === 0) return;
    setIsSimulatingGateway(true);
    setGatewayResult(null);

    try {
      const breakdown: OnlinePaymentItemBreakdown[] = selectedPaymentInvoices.map((inv) => {
        const child = pupils.find((p) => p.id === inv.pupilId);
        return {
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          invoiceReference: inv.invoiceReference,
          pupilId: inv.pupilId,
          pupilName: child?.fullName || "Pupil",
          pupilClass: child?.class || "Class",
          term: inv.term,
          title: inv.title,
          amountDue: inv.amountDue,
          amountSelected: inv.balance,
          items: inv.items || [],
        };
      });

      const request: InitiateOnlinePaymentRequest = {
        parentId: data.parent.id,
        parentEmail: data.parent.email,
        parentName: data.parent.fullName,
        invoices: breakdown,
        totalAmountSelected,
        currency: "NGN",
        suggestedProvider: selectedProvider,
        callbackUrl: window.location.href,
        metadata: {
          sessionContext: isFamily ? "family_multi_child" : "individual_child",
          selectedPupilId: activePupil?.id || "family",
        },
      };

      const res = await portalService.prepareOnlinePaymentSession(request);
      setGatewayResult(res);
      onNotify?.("Gateway simulation complete. Online payment integration boundary verified.");
    } catch {
      onNotify?.("Simulation completed with demo placeholder response.");
    } finally {
      setIsSimulatingGateway(false);
    }
  };

  // Handle simulated term switching with loading effect
  const handleTermChange = (term: string) => {
    setIsLoadingTerm(true);
    setHasError(false);
    setTimeout(() => {
      setSelectedTerm(term);
      setIsLoadingTerm(false);
    }, 250);
  };

  // Toggle invoice itemized breakdown expansion
  const toggleInvoiceExpand = (invoiceId: string) => {
    setExpandedInvoiceIds((prev) => {
      const next = new Set(prev);
      if (next.has(invoiceId)) {
        next.delete(invoiceId);
      } else {
        next.add(invoiceId);
      }
      return next;
    });
  };

  // Simulate downloading invoice PDF
  const handleDownloadInvoice = async (inv: Invoice) => {
    setDownloadingId(inv.id);
    try {
      await portalService.downloadInvoice(inv.id);
      onNotify?.(`Downloaded invoice ${inv.invoiceNumber} (${inv.title})`);
    } catch {
      onNotify?.(`Simulated download for ${inv.invoiceNumber}.pdf completed.`);
    } finally {
      setTimeout(() => setDownloadingId(null), 400);
    }
  };

  // Simulate downloading receipt PDF
  const handleDownloadReceipt = async (pmt: Payment) => {
    setDownloadingId(pmt.id);
    try {
      await portalService.downloadReceipt(pmt.id);
      onNotify?.(`Official receipt ${pmt.receiptNumber} downloaded successfully.`);
    } catch {
      onNotify?.(`Simulated download for ${pmt.receiptNumber}.pdf completed.`);
    } finally {
      setTimeout(() => setDownloadingId(null), 400);
    }
  };

  // Filter invoices by term, status, and search query
  const filteredInvoices = useMemo(() => {
    return data.invoices.filter((inv) => {
      // Term filter
      if (selectedTerm !== "all" && inv.term !== selectedTerm) {
        return false;
      }

      // Status filter
      if (statusFilter !== "all") {
        const normalizedStatus =
          inv.status === "Settled" ? "Paid" :
          inv.status === "Partially Paid" ? "Part-paid" :
          inv.status === "Pending" ? "Outstanding" : inv.status;

        if (normalizedStatus !== statusFilter) {
          return false;
        }
      }

      // Search query (invoice number, reference, pupil name, or title)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const child = pupils.find((p) => p.id === inv.pupilId);
        const matchesRef = inv.invoiceReference?.toLowerCase().includes(q);
        const matchesNum = inv.invoiceNumber.toLowerCase().includes(q);
        const matchesTitle = inv.title.toLowerCase().includes(q);
        const matchesChild = child?.fullName.toLowerCase().includes(q) || child?.firstName.toLowerCase().includes(q);

        if (!matchesRef && !matchesNum && !matchesTitle && !matchesChild) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === "due-soon") {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      if (sortBy === "due-late") {
        return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
      }
      if (sortBy === "amount-high") {
        return b.amountDue - a.amountDue;
      }
      if (sortBy === "amount-low") {
        return a.amountDue - b.amountDue;
      }
      return 0;
    });
  }, [data.invoices, selectedTerm, statusFilter, searchQuery, sortBy, pupils]);

  // Filter payments by term and search
  const filteredPayments = useMemo(() => {
    return data.payments.filter((pmt) => {
      const inv = data.invoices.find((i) => i.id === pmt.invoiceId);
      if (selectedTerm !== "all" && inv && inv.term !== selectedTerm) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const child = pupils.find((p) => p.id === pmt.pupilId);
        const matchesRec = pmt.receiptNumber.toLowerCase().includes(q);
        const matchesRef = pmt.reference.toLowerCase().includes(q);
        const matchesDesc = pmt.itemDescription.toLowerCase().includes(q);
        const matchesChild = child?.fullName.toLowerCase().includes(q);
        if (!matchesRec && !matchesRef && !matchesDesc && !matchesChild) {
          return false;
        }
      }
      return true;
    });
  }, [data.payments, data.invoices, selectedTerm, searchQuery, pupils]);

  // Status counts for Payment Proof submissions
  const proofStatusCounts = useMemo(() => {
    return {
      all: data.paymentProofs.length,
      "Pending Review": data.paymentProofs.filter(
        (p) => p.status === "Pending Review" || p.status === "Submitted" || p.status === "Under Verification"
      ).length,
      Verified: data.paymentProofs.filter((p) => p.status === "Verified" || p.status === "Approved").length,
      Rejected: data.paymentProofs.filter((p) => p.status === "Rejected" || p.status === "Declined").length,
    };
  }, [data.paymentProofs]);

  // Filtered payment proofs
  const filteredProofs = useMemo(() => {
    return data.paymentProofs.filter((proof) => {
      // Child filter
      if (proofPupilFilter !== "all" && proof.pupilId !== proofPupilFilter) {
        return false;
      }

      // Status filter
      if (proofStatusFilter !== "all") {
        const normalized =
          proof.status === "Approved"
            ? "Verified"
            : proof.status === "Declined"
            ? "Rejected"
            : proof.status === "Submitted" || proof.status === "Under Verification"
            ? "Pending Review"
            : proof.status;

        if (normalized !== proofStatusFilter) {
          return false;
        }
      }

      // Search query
      if (proofSearchQuery.trim()) {
        const q = proofSearchQuery.toLowerCase();
        const child = pupils.find((p) => p.id === proof.pupilId);
        const inv = data.invoices.find((i) => i.id === proof.invoiceId);
        const matchesRef = proof.referenceNumber?.toLowerCase().includes(q);
        const matchesTrx = proof.transactionReference?.toLowerCase().includes(q);
        const matchesBank = proof.bankName?.toLowerCase().includes(q);
        const matchesNotes = proof.notes?.toLowerCase().includes(q);
        const matchesChild = child?.fullName?.toLowerCase().includes(q);
        const matchesInv =
          inv?.invoiceNumber?.toLowerCase().includes(q) ||
          inv?.title?.toLowerCase().includes(q);

        if (!matchesRef && !matchesTrx && !matchesBank && !matchesNotes && !matchesChild && !matchesInv) {
          return false;
        }
      }

      return true;
    });
  }, [data.paymentProofs, data.invoices, proofPupilFilter, proofStatusFilter, proofSearchQuery, pupils]);

  // Aggregate financial metrics for current view
  const aggregateMetrics = useMemo(() => {
    const activeInvoices = selectedTerm === "all"
      ? data.invoices
      : data.invoices.filter((i) => i.term === selectedTerm);

    const totalBilled = activeInvoices.reduce((acc, inv) => acc + inv.amountDue, 0);
    const totalPaid = activeInvoices.reduce((acc, inv) => acc + inv.amountPaid, 0);
    const totalBalance = activeInvoices.reduce((acc, inv) => acc + inv.balance, 0);
    const overdueCount = activeInvoices.filter((i) => i.status === "Overdue" || (new Date(i.dueDate) < new Date("2026-09-20") && i.balance > 0)).length;

    // Category breakdown totals across all invoices
    const categoryTotals: Record<FeeCategory, number> = {
      Tuition: 0,
      Books: 0,
      Uniform: 0,
      Meals: 0,
      Transport: 0,
      Clubs: 0,
      Other: 0,
    };

    activeInvoices.forEach((inv) => {
      if (inv.items && inv.items.length > 0) {
        inv.items.forEach((item) => {
          if (categoryTotals[item.category] !== undefined) {
            categoryTotals[item.category] += item.amount;
          } else {
            categoryTotals.Other += item.amount;
          }
        });
      } else {
        // Fallback to tuition
        categoryTotals.Tuition += inv.amountDue;
      }
    });

    return {
      totalBilled,
      totalPaid,
      totalBalance,
      overdueCount,
      categoryTotals,
    };
  }, [data.invoices, selectedTerm]);

  // Status count badges
  const statusCounts = useMemo(() => {
    const termInvoices = selectedTerm === "all"
      ? data.invoices
      : data.invoices.filter((i) => i.term === selectedTerm);

    return {
      all: termInvoices.length,
      Outstanding: termInvoices.filter((i) => i.status === "Outstanding" || i.status === "Pending").length,
      "Part-paid": termInvoices.filter((i) => i.status === "Part-paid" || i.status === "Partially Paid").length,
      Overdue: termInvoices.filter((i) => i.status === "Overdue").length,
      Paid: termInvoices.filter((i) => i.status === "Paid" || i.status === "Settled").length,
    };
  }, [data.invoices, selectedTerm]);

  // Visual status badge helper
  const renderStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case "Paid":
      case "Settled":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E5F7ED] px-2.5 py-0.5 text-xs font-bold text-[#087A50] border border-[#087A50]/20">
            <CheckCircle2 className="h-3.5 w-3.5" /> Paid in full
          </span>
        );
      case "Part-paid":
      case "Partially Paid":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EFF6FF] px-2.5 py-0.5 text-xs font-bold text-[#1D4ED8] border border-[#1D4ED8]/20">
            <RotateCcw className="h-3.5 w-3.5" /> Part-paid
          </span>
        );
      case "Overdue":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FEF2F2] px-2.5 py-0.5 text-xs font-bold text-[#B91C1C] border border-[#B91C1C]/25">
            <AlertCircle className="h-3.5 w-3.5" /> Overdue
          </span>
        );
      case "Outstanding":
      case "Pending":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FEF9C3] px-2.5 py-0.5 text-xs font-bold text-[#854D0E] border border-[#854D0E]/20">
            <Clock className="h-3.5 w-3.5" /> Outstanding
          </span>
        );
    }
  };

  // Category visual metadata
  const getCategoryBadge = (category: FeeCategory) => {
    switch (category) {
      case "Tuition":
        return { label: "Tuition", icon: GraduationCap, bg: "bg-[#F3E8FF] text-[#6B21A8]" };
      case "Books":
        return { label: "Books & Study", icon: BookMarked, bg: "bg-[#EFF6FF] text-[#1E40AF]" };
      case "Uniform":
        return { label: "Uniform & Sport", icon: Tag, bg: "bg-[#ECFDF5] text-[#065F46]" };
      case "Meals":
        return { label: "Midday Meals", icon: Sparkles, bg: "bg-[#FEF3C7] text-[#92400E]" };
      case "Transport":
        return { label: "Bus Shuttle", icon: Clock, bg: "bg-[#E0F2FE] text-[#0369A1]" };
      case "Clubs":
        return { label: "Clubs & STEAM", icon: CheckCircle2, bg: "bg-[#EDE9FE] text-[#5B21B6]" };
      case "Other":
      default:
        return { label: "Administrative / Levies", icon: FileText, bg: "bg-[#F1F5F9] text-[#475569]" };
    }
  };

  return (
    <div className="space-y-6">
      {/* Demonstration Data Banner */}
      <div className="rounded-xl border border-[#D97706]/30 bg-[#FFFBEB] p-4 text-xs text-[#92400E] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-start sm:items-center gap-2.5">
          <Info className="h-4 w-4 text-[#D97706] shrink-0 mt-0.5 sm:mt-0" />
          <span>
            <strong>Demonstration Financial Records:</strong> All tuition schedules, invoice numbers, and receipts
            follow Airtable linked-record schemas. Real payment gateway transactions are intentionally disabled in preview mode.
          </span>
        </div>
        <button
          onClick={() => onOpenProofModal()}
          className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[#B45309] hover:underline cursor-pointer shrink-0"
        >
          <Plus className="h-3 w-3" /> Submit offline transfer proof
        </button>
      </div>

      {/* Primary Financial Summary Hero Banner */}
      <section className="overflow-hidden rounded-2xl bg-[#29166F] text-white shadow-md">
        <div className="grid lg:grid-cols-[1.4fr_1fr] border-b border-white/10">
          <div className="p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#E9DB3D] px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-[#29166F]">
                {isFamily ? "Family Fee Portfolio" : `${activePupil?.firstName}'s Fee Statement`}
              </span>
              <span className="text-xs text-white/70">
                Academic Term: <strong className="text-white">{selectedTerm === "all" ? "All Sessions" : selectedTerm}</strong>
              </span>
            </div>

            <div className="mt-4">
              <p className="text-xs font-bold text-white/60 uppercase tracking-wider">Total Outstanding Balance</p>
              <div className="mt-1 flex flex-wrap items-baseline gap-3">
                <p className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
                  {formatNaira(aggregateMetrics.totalBalance)}
                </p>
                {aggregateMetrics.totalBalance === 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#E9DB3D] px-3 py-1 text-xs font-extrabold text-[#29166F]">
                    <CheckCircle2 className="h-3.5 w-3.5" /> All Settled
                  </span>
                ) : aggregateMetrics.overdueCount > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#EF4444] px-3 py-1 text-xs font-extrabold text-white">
                    <AlertTriangle className="h-3.5 w-3.5" /> {aggregateMetrics.overdueCount} Overdue Bill
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-extrabold text-white">
                    <Clock className="h-3.5 w-3.5" /> Payment Pending
                  </span>
                )}
              </div>
              <p className="mt-2 text-xs sm:text-sm text-white/70">
                {isFamily
                  ? `Combined balance across all ${pupils.length} enrolled pupils for ${selectedTerm === "all" ? "all recorded terms" : selectedTerm}.`
                  : `Total pending charges for ${activePupil?.fullName} (${activePupil?.class}).`}
              </p>
            </div>
          </div>

          {/* Quick Metrics Summary */}
          <div className="grid grid-cols-2 divide-x divide-white/10 bg-[#22105F] p-6 sm:p-8">
            <div className="pr-4 flex flex-col justify-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-white/60">Total Billed</span>
              <span className="mt-1 text-xl sm:text-2xl font-extrabold text-white">
                {formatNaira(aggregateMetrics.totalBilled)}
              </span>
              <span className="mt-1 text-[11px] text-white/60">
                {filteredInvoices.length} invoice{filteredInvoices.length === 1 ? "" : "s"} issued
              </span>
            </div>
            <div className="pl-4 flex flex-col justify-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#E9DB3D]">Total Settled</span>
              <span className="mt-1 text-xl sm:text-2xl font-extrabold text-[#E9DB3D]">
                {formatNaira(aggregateMetrics.totalPaid)}
              </span>
              <span className="mt-1 text-[11px] text-white/60">
                {aggregateMetrics.totalBilled > 0
                  ? `${Math.round((aggregateMetrics.totalPaid / aggregateMetrics.totalBilled) * 100)}% payment rate`
                  : "0%"}
              </span>
            </div>
          </div>
        </div>

        {/* Action strip inside hero */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#1C0D4F] px-6 py-3.5 text-xs">
          <div className="flex items-center gap-2 text-white/70">
            <ShieldCheck className="h-4 w-4 text-[#E9DB3D]" />
            <span>Official Marie Louise School Electronic Fee Billing System</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {aggregateMetrics.totalBalance > 0 && (
              <button
                onClick={() => handleOpenOnlinePayment()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#E9DB3D] px-3.5 py-1.5 text-xs font-extrabold text-[#29166F] shadow-xs hover:bg-[#F2E85A] transition cursor-pointer"
              >
                <CreditCard className="h-3.5 w-3.5" /> Pay fees online
              </button>
            )}
            <button
              onClick={() => onNotify?.("Statement of Account generated as PDF. Download initiated.")}
              className="inline-flex items-center gap-1.5 font-bold text-white/90 hover:text-white transition cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" /> Download Full Statement
            </button>
            <span className="text-white/30 hidden sm:inline">|</span>
            <button
              onClick={() => onOpenProofModal()}
              className="inline-flex items-center gap-1.5 font-bold text-white/80 hover:text-[#E9DB3D] hover:underline cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Upload Bank Proof
            </button>
          </div>
        </div>
      </section>

      {/* Family Overview: Individual Child Fee Balance Cards */}
      {isFamily && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-[#581C87]">
                Family Balance Distribution
              </p>
              <h3 className="text-base font-extrabold text-[#29166F]">
                Combined Breakdown by Linked Child
              </h3>
            </div>
            <span className="text-xs text-[#817887]">{pupils.length} Enrolled Children</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pupils.map((child) => {
              const childInvoices = data.invoices.filter((i) => i.pupilId === child.id && (selectedTerm === "all" || i.term === selectedTerm));
              const childBilled = childInvoices.reduce((sum, i) => sum + i.amountDue, 0);
              const childPaid = childInvoices.reduce((sum, i) => sum + i.amountPaid, 0);
              const childBalance = childInvoices.reduce((sum, i) => sum + i.balance, 0);

              return (
                <div
                  key={child.id}
                  className="rounded-xl border border-[#E5DFE9] bg-white p-4 shadow-xs hover:border-[#581C87]/40 transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#581C87] text-white font-extrabold text-xs">
                          {child.avatarInitials}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-sm text-[#29166F] leading-tight">{child.fullName}</h4>
                          <p className="text-[11px] text-[#817887]">{child.class} · {child.admissionNumber}</p>
                        </div>
                      </div>
                      {childBalance === 0 ? (
                        <span className="rounded-full bg-[#E5F7ED] px-2 py-0.5 text-[10px] font-extrabold text-[#087A50]">
                          Settled
                        </span>
                      ) : (
                        <span className="rounded-full bg-[#FEF9C3] px-2 py-0.5 text-[10px] font-extrabold text-[#854D0E]">
                          Pending
                        </span>
                      )}
                    </div>

                    <div className="mt-3.5 space-y-1.5 border-t border-[#EEE9F1] pt-3 text-xs">
                      <div className="flex justify-between text-[#625B69]">
                        <span>Amount Billed:</span>
                        <strong className="text-[#342D3A]">{formatNaira(childBilled, false)}</strong>
                      </div>
                      <div className="flex justify-between text-[#625B69]">
                        <span>Amount Paid:</span>
                        <strong className="text-[#087A50]">{formatNaira(childPaid, false)}</strong>
                      </div>
                      <div className="flex justify-between border-t border-[#F1ECF6] pt-1.5 text-sm">
                        <span className="font-bold text-[#29166F]">Outstanding:</span>
                        <strong className={childBalance > 0 ? "text-[#B91C1C] font-extrabold" : "text-[#087A50] font-extrabold"}>
                          {formatNaira(childBalance)}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3.5 pt-2.5 border-t border-[#EEE9F1] flex items-center justify-between gap-2">
                    <button
                      onClick={() => onSelectChild(child.id)}
                      className="text-xs font-bold text-[#581C87] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>View {child.firstName}&apos;s history</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                    {childBalance > 0 && (
                      <button
                        onClick={() => {
                          const childFirstUnpaid = data.invoices.find((i) => i.pupilId === child.id && i.balance > 0);
                          handleOpenOnlinePayment(childFirstUnpaid?.id);
                        }}
                        className="inline-flex items-center gap-1 rounded-md bg-[#F1ECF6] px-2 py-1 text-[11px] font-extrabold text-[#581C87] hover:bg-[#581C87] hover:text-white transition cursor-pointer"
                      >
                        <CreditCard className="h-3 w-3" /> Pay online
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Fee Category Breakdown Summary Bar */}
      <section className="rounded-xl border border-[#E5DFE9] bg-white p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-[#581C87]">
              Fee Category Allocation
            </p>
            <h3 className="text-base font-extrabold text-[#29166F]">
              Breakdown by Component & Service
            </h3>
          </div>
          <span className="text-xs text-[#817887]">
            Total Invoiced: <strong>{formatNaira(aggregateMetrics.totalBilled)}</strong>
          </span>
        </div>

        {/* 7 Itemized Categories Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {(
            [
              { cat: "Tuition", label: "Tuition", icon: GraduationCap, color: "text-[#581C87] bg-[#F1ECF6] border-[#D8C7E8]" },
              { cat: "Books", label: "Books", icon: BookMarked, color: "text-[#1E40AF] bg-[#EFF6FF] border-[#BFDBFE]" },
              { cat: "Uniform", label: "Uniform", icon: Tag, color: "text-[#065F46] bg-[#ECFDF5] border-[#A7F3D0]" },
              { cat: "Meals", label: "Meals", icon: Sparkles, color: "text-[#92400E] bg-[#FEF3C7] border-[#FDE68A]" },
              { cat: "Transport", label: "Transport", icon: Clock, color: "text-[#0369A1] bg-[#E0F2FE] border-[#BAE6FD]" },
              { cat: "Clubs", label: "Clubs", icon: CheckCircle2, color: "text-[#4C1D95] bg-[#EDE9FE] border-[#DDD6FE]" },
              { cat: "Other", label: "Other", icon: FileText, color: "text-[#334155] bg-[#F1F5F9] border-[#CBD5E1]" },
            ] as const
          ).map((item) => {
            const amount = aggregateMetrics.categoryTotals[item.cat];
            const Icon = item.icon;
            return (
              <div
                key={item.cat}
                className={`rounded-xl border p-3 flex flex-col justify-between ${item.color}`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-[11px] font-extrabold uppercase">{item.label}</span>
                  <Icon className="h-3.5 w-3.5 opacity-80 shrink-0" />
                </div>
                <p className="text-sm font-extrabold leading-tight">
                  {formatNaira(amount, false)}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Controls Bar: Term Selector, Search, Filter Tabs, and View Switcher */}
      <section className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Section Tabs (Invoices vs Payments) */}
          <div className="inline-flex rounded-xl bg-[#EFEBF2] p-1 border border-[#E2DBE7]">
            <button
              onClick={() => setActiveTab("invoices")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-extrabold transition cursor-pointer ${
                activeTab === "invoices"
                  ? "bg-white text-[#29166F] shadow-xs"
                  : "text-[#625B69] hover:text-[#29166F]"
              }`}
            >
              <FileText className="h-4 w-4" />
              <span>Invoices & Fee Schedules</span>
              <span className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] ${
                activeTab === "invoices" ? "bg-[#581C87] text-white" : "bg-[#DDD6E5] text-[#581C87]"
              }`}>
                {filteredInvoices.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("payments")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-extrabold transition cursor-pointer ${
                activeTab === "payments"
                  ? "bg-white text-[#29166F] shadow-xs"
                  : "text-[#625B69] hover:text-[#29166F]"
              }`}
            >
              <Receipt className="h-4 w-4" />
              <span>Recorded Payments & Receipts</span>
              <span className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] ${
                activeTab === "payments" ? "bg-[#087A50] text-white" : "bg-[#DDD6E5] text-[#087A50]"
              }`}>
                {filteredPayments.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("proofs")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-extrabold transition cursor-pointer ${
                activeTab === "proofs"
                  ? "bg-white text-[#29166F] shadow-xs"
                  : "text-[#625B69] hover:text-[#29166F]"
              }`}
            >
              <FileCheck2 className="h-4 w-4" />
              <span>Payment Proof Submissions</span>
              <span className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] ${
                activeTab === "proofs" ? "bg-[#B45309] text-white" : "bg-[#DDD6E5] text-[#B45309]"
              }`}>
                {data.paymentProofs.length}
              </span>
            </button>
          </div>

          {/* Term Selector Dropdown */}
          <div className="flex items-center gap-2">
            <label htmlFor="fees-term-select" className="text-xs font-bold text-[#625B69] whitespace-nowrap">
              Academic Term:
            </label>
            <div className="relative min-w-[200px]">
              <select
                id="fees-term-select"
                value={selectedTerm}
                onChange={(e) => handleTermChange(e.target.value)}
                className="h-10 w-full appearance-none rounded-lg border border-[#DCD5E1] bg-white pl-3 pr-8 text-xs font-bold text-[#29166F] shadow-2xs outline-none transition focus:border-[#581C87] focus:ring-2 focus:ring-[#581C87]/15 cursor-pointer"
              >
                {availableTerms.map((term) => (
                  <option key={term} value={term}>
                    {term}
                  </option>
                ))}
                <option value="all">All Academic Terms</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#817887]" />
            </div>
          </div>
        </div>

        {/* Secondary Bar: Status Filters (when on invoices tab), Search & Sort */}
        {activeTab === "invoices" && (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2">
            {/* Filter Chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: "all", label: "All", count: statusCounts.all },
                  { id: "Outstanding", label: "Outstanding", count: statusCounts.Outstanding },
                  { id: "Part-paid", label: "Part-paid", count: statusCounts["Part-paid"] },
                  { id: "Overdue", label: "Overdue", count: statusCounts.Overdue },
                  { id: "Paid", label: "Paid", count: statusCounts.Paid },
                ] as const
              ).map((chip) => (
                <button
                  key={chip.id}
                  onClick={() => setStatusFilter(chip.id)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                    statusFilter === chip.id
                      ? "bg-[#581C87] text-white shadow-xs"
                      : "border border-[#E5DFE9] bg-white text-[#625B69] hover:bg-[#F8F6FA]"
                  }`}
                >
                  <span>{chip.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-extrabold ${
                      statusFilter === chip.id ? "bg-white/25 text-white" : "bg-[#F1ECF6] text-[#581C87]"
                    }`}
                  >
                    {chip.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Search and Sort */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#817887]" />
                <input
                  type="text"
                  placeholder="Search invoice or reference..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 w-full rounded-lg border border-[#DCD5E1] bg-white pl-8 pr-3 text-xs outline-none transition focus:border-[#581C87] focus:ring-2 focus:ring-[#581C87]/15"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#817887] hover:text-[#29166F]"
                  >
                    &times;
                  </button>
                )}
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                aria-label="Sort invoices by"
                className="h-9 rounded-lg border border-[#DCD5E1] bg-white px-2.5 text-xs font-semibold text-[#342D3A] outline-none cursor-pointer"
              >
                <option value="due-soon">Due: Soonest first</option>
                <option value="due-late">Due: Latest first</option>
                <option value="amount-high">Amount: Highest first</option>
                <option value="amount-low">Amount: Lowest first</option>
              </select>
            </div>
          </div>
        )}
      </section>

      {/* Loading State Skeleton */}
      {isLoadingTerm && (
        <div className="space-y-4 py-8">
          <div className="h-28 w-full animate-pulse rounded-2xl bg-white/70 border border-[#E5DFE9]" />
          <div className="h-28 w-full animate-pulse rounded-2xl bg-white/70 border border-[#E5DFE9]" />
        </div>
      )}

      {/* Error State */}
      {hasError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <h4 className="font-extrabold text-base text-red-900">Unable to load fee schedules</h4>
          <p className="mt-1 text-xs text-red-600 max-w-md mx-auto">
            A temporary connection issue prevented the portal service from loading invoices. Please retry or contact the bursary.
          </p>
          <button
            onClick={() => {
              setIsLoadingTerm(true);
              setTimeout(() => {
                setIsLoadingTerm(false);
                setHasError(false);
              }, 300);
            }}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Retry loading records
          </button>
        </div>
      )}

      {/* TAB 1: Invoices & Fee Schedules */}
      {!isLoadingTerm && !hasError && activeTab === "invoices" && (
        <div className="space-y-4">
          {filteredInvoices.length > 0 ? (
            filteredInvoices.map((inv) => {
              const child = pupils.find((p) => p.id === inv.pupilId);
              const isExpanded = expandedInvoiceIds.has(inv.id);
              const isDownloading = downloadingId === inv.id;

              return (
                <article
                  key={inv.id}
                  className="rounded-2xl border border-[#E5DFE9] bg-white p-5 sm:p-6 shadow-xs transition hover:border-[#581C87]/30 hover:shadow-sm"
                >
                  {/* Top Bar: Reference, Child Tag, Status, Term */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EEE9F1] pb-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-extrabold text-[#581C87] bg-[#F1ECF6] px-2 py-0.5 rounded-md">
                        {inv.invoiceReference || inv.invoiceNumber}
                      </span>
                      {child && (
                        <span className="text-xs bg-[#E8E2ED] text-[#29166F] font-bold px-2 py-0.5 rounded-md">
                          {child.fullName} ({child.class})
                        </span>
                      )}
                      <span className="text-xs text-[#817887] hidden sm:inline">&bull; {inv.term}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {renderStatusBadge(inv.status)}
                    </div>
                  </div>

                  {/* Main Invoice Header & Financial Metrics Grid */}
                  <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr] items-start">
                    <div>
                      <h3 className="text-base sm:text-lg font-extrabold text-[#29166F]">
                        {inv.title}
                      </h3>
                      {inv.notes && (
                        <p className="mt-1 text-xs text-[#625B69] leading-relaxed">
                          {inv.notes}
                        </p>
                      )}

                      {/* Included Categories Badges */}
                      {inv.items && inv.items.length > 0 && (
                        <div className="mt-3 flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#817887]">Includes:</span>
                          {Array.from(new Set(inv.items.map((it) => it.category))).map((cat) => {
                            const badge = getCategoryBadge(cat);
                            return (
                              <span
                                key={cat}
                                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold ${badge.bg}`}
                              >
                                {badge.label}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Financial Figures Card */}
                    <div className="rounded-xl bg-[#FAF8FC] border border-[#EEE9F1] p-4 text-xs">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-[#817887]">Amount Billed</span>
                          <p className="text-base font-extrabold text-[#29166F] mt-0.5">
                            {formatNaira(inv.amountDue)}
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase text-[#817887]">Amount Paid</span>
                          <p className="text-base font-extrabold text-[#087A50] mt-0.5">
                            {formatNaira(inv.amountPaid)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 border-t border-[#EEE9F1] pt-2.5 flex items-baseline justify-between">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-[#817887]">Outstanding Balance</span>
                          <p className={`text-lg font-extrabold ${inv.balance > 0 ? "text-[#B91C1C]" : "text-[#087A50]"}`}>
                            {formatNaira(inv.balance)}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-bold uppercase text-[#817887]">Payment Due Date</span>
                          <p className="text-xs font-extrabold text-[#342D3A] mt-0.5">{inv.dueDate}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expandable Itemized Breakdown Section */}
                  {inv.items && inv.items.length > 0 && (
                    <div className="mt-4 border-t border-[#EEE9F1] pt-3">
                      <button
                        onClick={() => toggleInvoiceExpand(inv.id)}
                        className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#581C87] hover:underline cursor-pointer"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="h-3.5 w-3.5" />
                            <span>Hide itemized fee breakdown ({inv.items.length} items)</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-3.5 w-3.5" />
                            <span>View itemized fee breakdown ({inv.items.length} items)</span>
                          </>
                        )}
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-3 overflow-hidden"
                          >
                            <div className="rounded-xl border border-[#EEE9F1] bg-[#FDFCFE] divide-y divide-[#EEE9F1] text-xs">
                              <div className="grid grid-cols-[120px_1fr_120px] bg-[#F8F6FA] px-4 py-2 font-extrabold text-[#581C87] uppercase text-[10px]">
                                <span>Category</span>
                                <span>Item Description</span>
                                <span className="text-right">Amount (NGN)</span>
                              </div>

                              {inv.items.map((item) => {
                                const badge = getCategoryBadge(item.category);
                                return (
                                  <div
                                    key={item.id}
                                    className="grid grid-cols-[120px_1fr_120px] items-center px-4 py-2.5 hover:bg-[#F9F7FA]"
                                  >
                                    <span className={`inline-block w-fit rounded px-2 py-0.5 text-[10px] font-bold ${badge.bg}`}>
                                      {item.category}
                                    </span>
                                    <span className="font-medium text-[#342D3A] pr-2">{item.description}</span>
                                    <span className="font-extrabold text-[#29166F] text-right">
                                      {formatNaira(item.amount, false)}
                                    </span>
                                  </div>
                                );
                              })}

                              {/* Total line */}
                              <div className="grid grid-cols-[120px_1fr_120px] bg-[#F1ECF6]/60 px-4 py-2.5 font-extrabold text-[#29166F]">
                                <span>Subtotal</span>
                                <span>Total Itemized Charges</span>
                                <span className="text-right">{formatNaira(inv.amountDue)}</span>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Actions Footer */}
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#EEE9F1] pt-4">
                    <span className="text-[11px] text-[#817887]">
                      Issued on: <strong>{inv.issueDate}</strong> &bull; Invoice Record: <strong>{inv.id}</strong>
                    </span>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => handleDownloadInvoice(inv)}
                        disabled={isDownloading}
                        className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-[#DCD5E1] bg-white px-3.5 text-xs font-extrabold text-[#29166F] hover:bg-[#F8F6FA] hover:border-[#BBAFC4] transition cursor-pointer"
                      >
                        {isDownloading ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#581C87]" />
                        ) : (
                          <Download className="h-3.5 w-3.5 text-[#581C87]" />
                        )}
                        <span>Download Invoice (PDF)</span>
                      </button>

                      {inv.balance > 0 && (
                        <>
                          <button
                            onClick={() => handleOpenOnlinePayment(inv.id)}
                            className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-[#29166F] px-4 text-xs font-extrabold text-[#E9DB3D] hover:bg-[#1C0D4F] shadow-xs transition cursor-pointer"
                          >
                            <CreditCard className="h-3.5 w-3.5" />
                            <span>Pay fees online</span>
                          </button>
                          <button
                            onClick={() => onOpenProofModal(inv.id, inv.pupilId)}
                            className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-[#DCD5E1] bg-[#F8F6FA] px-3.5 text-xs font-extrabold text-[#581C87] hover:bg-[#F1ECF6] transition cursor-pointer"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Submit Transfer Proof</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            /* Empty State for Invoices */
            <div className="rounded-2xl border border-[#E5DFE9] bg-white p-12 text-center shadow-xs">
              <FileText className="h-12 w-12 text-[#BBAFC4] mx-auto mb-3" />
              <h3 className="text-lg font-extrabold text-[#29166F]">No Invoices Found</h3>
              <p className="mt-1 text-xs text-[#817887] max-w-sm mx-auto">
                No invoices match the selected status filter <strong>&ldquo;{statusFilter}&rdquo;</strong> for{" "}
                <strong>{selectedTerm === "all" ? "all terms" : selectedTerm}</strong>.
              </p>
              <button
                onClick={() => {
                  setStatusFilter("all");
                  setSearchQuery("");
                  setSelectedTerm("all");
                }}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-[#DCD5E1] bg-[#F8F6FA] px-4 py-2 text-xs font-extrabold text-[#581C87] hover:bg-[#F1ECF6] transition cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset all filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Recorded Payments & Receipts */}
      {!isLoadingTerm && !hasError && activeTab === "payments" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-[#E5DFE9] bg-white overflow-hidden shadow-xs">
            <div className="border-b border-[#EEE9F1] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-extrabold text-[#29166F]">Verified Payments & Receipts</h3>
                <p className="text-xs text-[#817887] mt-0.5">
                  Official bank transfer settlements cleared and credited by Marie Louise School registry.
                </p>
              </div>
              <button
                onClick={() => onOpenProofModal()}
                className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-[#DCD5E1] bg-[#F8F6FA] px-3.5 text-xs font-extrabold text-[#581C87] hover:bg-[#F1ECF6] transition cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> Submit payment proof
              </button>
            </div>

            {filteredPayments.length > 0 ? (
              <div className="divide-y divide-[#EEE9F1]">
                {filteredPayments.map((pmt) => {
                  const child = pupils.find((p) => p.id === pmt.pupilId);
                  const isDownloading = downloadingId === pmt.id;

                  return (
                    <div
                      key={pmt.id}
                      className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#FDFCFE] transition"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-mono text-xs font-extrabold text-[#087A50] bg-[#E5F7ED] px-2 py-0.5 rounded-md">
                            {pmt.receiptNumber}
                          </span>
                          {child && (
                            <span className="text-xs bg-[#E8E2ED] text-[#29166F] font-bold px-2 py-0.5 rounded-md">
                              {child.fullName} ({child.class})
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#E5F7ED] px-2 py-0.5 text-[10px] font-extrabold text-[#087A50]">
                            <CheckCircle2 className="h-3 w-3" /> {pmt.status}
                          </span>
                        </div>

                        <h4 className="text-sm font-extrabold text-[#29166F] mt-1.5">
                          {pmt.itemDescription}
                        </h4>

                        <p className="text-xs text-[#817887] mt-1">
                          Payment Date: <strong>{pmt.paymentDate}</strong> &bull; Bank Reference:{" "}
                          <span className="font-mono font-bold text-[#342D3A]">{pmt.reference}</span> &bull;{" "}
                          {pmt.paymentMethod}
                        </p>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3">
                        <p className="text-lg font-extrabold text-[#087A50]">
                          {formatNaira(pmt.amount)}
                        </p>
                        <button
                          onClick={() => handleDownloadReceipt(pmt)}
                          disabled={isDownloading}
                          className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-[#DCD5E1] bg-white px-3 text-xs font-extrabold text-[#581C87] hover:bg-[#F8F6FA] hover:border-[#BBAFC4] transition cursor-pointer"
                        >
                          {isDownloading ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#581C87]" />
                          ) : (
                            <Download className="h-3.5 w-3.5 text-[#581C87]" />
                          )}
                          <span>Official Receipt (PDF)</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 text-center">
                <Receipt className="h-10 w-10 text-[#BBAFC4] mx-auto mb-2" />
                <p className="text-sm font-extrabold text-[#29166F]">No payments recorded for this term</p>
                <p className="text-xs text-[#817887] mt-1">
                  Once bank transfers are confirmed by the finance office, official receipts appear here.
                </p>
              </div>
            )}
          </div>

          {/* Submitted Payment Proofs Section */}
          <div className="rounded-2xl border border-[#E5DFE9] bg-white p-5 sm:p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#EEE9F1] pb-4 gap-2">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-[#581C87]">
                  Electronic Transfer Submissions
                </p>
                <h3 className="text-base font-extrabold text-[#29166F]">
                  Submitted Bank Proofs Awaiting Verification
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveTab("proofs")}
                  className="text-xs font-extrabold text-[#581C87] hover:underline cursor-pointer"
                >
                  View full submission history &rarr;
                </button>
                <button
                  onClick={() => onOpenProofModal()}
                  className="inline-flex items-center gap-1 text-xs font-extrabold text-[#581C87] hover:underline cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" /> Submit another proof
                </button>
              </div>
            </div>

            {data.paymentProofs.length > 0 ? (
              <div className="mt-4 space-y-3">
                {data.paymentProofs.map((proof) => {
                  const child = pupils.find((p) => p.id === proof.pupilId);
                  const isVerified = proof.status === "Verified" || proof.status === "Approved";
                  const isRejected = proof.status === "Rejected" || proof.status === "Declined";

                  return (
                    <div
                      key={proof.id}
                      className="rounded-xl border border-[#E8E2ED] bg-[#FBF9FD] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-[#29166F]">{proof.bankName}</span>
                          <span className="font-mono text-[11px] font-bold text-[#581C87] bg-[#F3E8FF] px-1.5 py-0.2 rounded">
                            {proof.referenceNumber}
                          </span>
                          {child && (
                            <span className="text-[10px] bg-[#E8E2ED] text-[#581C87] font-bold px-2 py-0.5 rounded">
                              {child.firstName} ({child.class})
                            </span>
                          )}
                        </div>
                        <p className="text-[#625B69] mt-1">
                          Transfer Ref: <strong className="font-mono text-[#29166F]">{proof.transactionReference}</strong> &bull; Amount:{" "}
                          <strong className="text-[#087A50]">{formatNaira(proof.amount)}</strong> on {proof.paymentDate}
                        </p>
                        {proof.notes && (
                          <p className="text-[11px] text-[#817887] italic mt-0.5">{proof.notes}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`rounded-full px-3 py-1 font-extrabold text-[11px] inline-flex items-center gap-1 ${
                            isVerified
                              ? "bg-[#E5F7ED] text-[#087A50] border border-[#087A50]/20"
                              : isRejected
                              ? "bg-[#FEF2F2] text-[#B91C1C] border border-[#EF4444]/25"
                              : "bg-[#FEF3C7] text-[#92400E] border border-[#D97706]/20"
                          }`}
                        >
                          {isVerified ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : isRejected ? (
                            <AlertCircle className="h-3 w-3" />
                          ) : (
                            <Clock className="h-3 w-3" />
                          )}
                          {proof.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-4 text-xs text-[#817887]">No pending transfer proofs under review.</p>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Payment Proofs Submissions & History */}
      {!isLoadingTerm && !hasError && activeTab === "proofs" && (
        <div className="space-y-6">
          {/* Critical Demonstration & Storage Notice */}
          <div className="rounded-xl border border-[#D97706]/30 bg-[#FFFBEB] p-4 text-xs text-[#92400E] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start sm:items-center gap-2.5">
              <ShieldAlert className="h-5 w-5 text-[#D97706] shrink-0 mt-0.5 sm:mt-0" />
              <span>
                <strong>Demonstration Payment Proofs Pipeline:</strong> These submissions model the Airtable <code>PaymentProofs</code> table. Documents and references are stored in local demonstration memory and <strong>have not been sent</strong> to live bursary servers or cloud storage.
              </span>
            </div>
            <button
              onClick={() => onOpenProofModal()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#581C87] px-3.5 py-1.5 text-xs font-extrabold text-white hover:bg-[#29166F] transition cursor-pointer shrink-0"
            >
              <Plus className="h-3.5 w-3.5" /> Submit New Proof
            </button>
          </div>

          {/* Proof Filters and Controls */}
          <div className="rounded-2xl border border-[#E5DFE9] bg-white p-5 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Status Filter Tabs */}
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { id: "all", label: "All Proofs", count: proofStatusCounts.all, color: "" },
                    { id: "Pending Review", label: "Pending Review", count: proofStatusCounts["Pending Review"], color: "bg-[#FEF3C7] text-[#92400E]" },
                    { id: "Verified", label: "Verified", count: proofStatusCounts.Verified, color: "bg-[#E5F7ED] text-[#087A50]" },
                    { id: "Rejected", label: "Rejected", count: proofStatusCounts.Rejected, color: "bg-[#FEF2F2] text-[#B91C1C]" },
                  ] as const
                ).map((tab) => {
                  const isActive = proofStatusFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setProofStatusFilter(tab.id)}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                        isActive
                          ? "bg-[#29166F] text-white shadow-xs"
                          : "bg-[#F4F1F7] text-[#625B69] hover:bg-[#EAE4F0] hover:text-[#29166F]"
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span
                        className={`rounded-full px-1.5 py-0.2 text-[10px] font-extrabold ${
                          isActive ? "bg-white/20 text-white" : tab.color || "bg-white text-[#625B69]"
                        }`}
                      >
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Child Filter Dropdown */}
              <div className="flex items-center gap-2">
                <label htmlFor="proof-child-filter" className="text-xs font-bold text-[#625B69] whitespace-nowrap">
                  Child:
                </label>
                <div className="relative min-w-[180px]">
                  <select
                    id="proof-child-filter"
                    value={proofPupilFilter}
                    onChange={(e) => setProofPupilFilter(e.target.value)}
                    className="h-9 w-full appearance-none rounded-lg border border-[#DCD5E1] bg-white pl-3 pr-8 text-xs font-bold text-[#29166F] shadow-2xs outline-none transition focus:border-[#581C87] cursor-pointer"
                  >
                    <option value="all">All Linked Pupils</option>
                    {pupils.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.fullName} ({p.class})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#817887]" />
                </div>
              </div>
            </div>

            {/* Search Input Bar */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#817887]" />
              <input
                type="text"
                value={proofSearchQuery}
                onChange={(e) => setProofSearchQuery(e.target.value)}
                placeholder="Search by reference (e.g. PRF-2026-9281), bank name, transaction ID, or student..."
                className="h-10 w-full rounded-xl border border-[#DCD5E1] bg-[#FDFCFE] pl-9 pr-8 text-xs text-[#29166F] placeholder-[#817887] outline-none transition focus:border-[#581C87] focus:bg-white"
              />
              {proofSearchQuery && (
                <button
                  type="button"
                  onClick={() => setProofSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#817887] hover:text-[#29166F]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Proof Cards List */}
          {filteredProofs.length > 0 ? (
            <div className="space-y-4">
              {filteredProofs.map((proof) => {
                const child = pupils.find((p) => p.id === proof.pupilId);
                const inv = data.invoices.find((i) => i.id === proof.invoiceId);
                const isPending = proof.status === "Pending Review" || proof.status === "Submitted" || proof.status === "Under Verification";
                const isVerified = proof.status === "Verified" || proof.status === "Approved";
                const isRejected = proof.status === "Rejected" || proof.status === "Declined";

                return (
                  <article
                    key={proof.id}
                    className="rounded-2xl border border-[#E5DFE9] bg-white overflow-hidden shadow-xs hover:border-[#D0C4DB] transition"
                  >
                    {/* Header Strip with Reference & Status */}
                    <div className="bg-[#F8F6FA] px-5 py-3.5 border-b border-[#EEE9F1] flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-mono text-xs font-extrabold text-[#29166F] bg-white px-2.5 py-1 rounded-md border border-[#DCD5E1] shadow-2xs">
                          {proof.referenceNumber}
                        </span>
                        {child && (
                          <span className="text-xs bg-[#E8E2ED] text-[#29166F] font-bold px-2.5 py-0.5 rounded-md">
                            {child.fullName} ({child.class})
                          </span>
                        )}
                        <span className="text-[11px] text-[#817887]">
                          Submitted {new Date(proof.uploadedAt).toLocaleDateString("en-NG", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {isVerified && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E5F7ED] border border-[#087A50]/20 px-3 py-1 text-xs font-extrabold text-[#087A50]">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Verified &amp; Settled
                          </span>
                        )}
                        {isPending && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FEF3C7] border border-[#D97706]/20 px-3 py-1 text-xs font-extrabold text-[#92400E]">
                            <Clock className="h-3.5 w-3.5" /> Pending Bursary Review
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FEF2F2] border border-[#EF4444]/25 px-3 py-1 text-xs font-extrabold text-[#B91C1C]">
                            <AlertCircle className="h-3.5 w-3.5" /> Proof Rejected
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Content Grid */}
                    <div className="p-5 sm:p-6 grid md:grid-cols-2 gap-6">
                      {/* Left Column: Pupil, Invoice, File */}
                      <div className="space-y-3.5">
                        <div>
                          <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#817887]">
                            Allocated Bill / Invoice
                          </p>
                          <p className="text-sm font-extrabold text-[#29166F] mt-0.5">
                            {inv ? `${inv.invoiceNumber} — ${inv.title}` : "General School Fee Schedule"}
                          </p>
                          {inv && (
                            <p className="text-xs text-[#817887] mt-0.5">
                              Term: {inv.term} &bull; Total Billed: {formatNaira(inv.amountDue)}
                            </p>
                          )}
                        </div>

                        {/* Attached Proof Document Card */}
                        <div>
                          <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#817887] mb-1">
                            Attached Proof Document
                          </p>
                          <div className="flex items-center gap-3 rounded-xl border border-[#DCD5E1] bg-[#FBF9FD] p-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#581C87] text-white">
                              <FileText className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-extrabold text-[#29166F] truncate">
                                {proof.receiptFileName || "Bank_Transfer_Advice.pdf"}
                              </p>
                              <p className="text-[11px] text-[#817887]">
                                {proof.receiptFileSize || "480 KB"} &bull; Local demonstration placeholder
                              </p>
                            </div>
                            <span className="text-[11px] font-bold text-[#581C87] bg-white px-2 py-0.5 rounded border border-[#DCD5E1]">
                              Attached
                            </span>
                          </div>
                        </div>

                        {proof.notes && (
                          <div className="rounded-lg bg-[#F8F6FA] p-2.5 text-xs text-[#625B69]">
                            <span className="font-bold text-[#342D3A]">Depositor Note: </span>
                            <span className="italic">&ldquo;{proof.notes}&rdquo;</span>
                          </div>
                        )}
                      </div>

                      {/* Right Column: Financial Details & Bursary Remarks */}
                      <div className="space-y-3.5 flex flex-col justify-between">
                        <div className="grid grid-cols-2 gap-3 bg-[#FBF9FD] p-3.5 rounded-xl border border-[#EEE9F1]">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#817887]">
                              Amount Paid
                            </span>
                            <p className="text-lg font-extrabold text-[#087A50] mt-0.5">
                              {formatNaira(proof.amount)}
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#817887]">
                              Payment Date
                            </span>
                            <p className="text-xs font-bold text-[#29166F] mt-0.5">
                              {proof.paymentDate}
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#817887]">
                              Payment Method
                            </span>
                            <p className="text-xs font-bold text-[#29166F] mt-0.5">
                              {proof.paymentMethod || "Bank Transfer"}
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#817887]">
                              Bank Reference
                            </span>
                            <p className="text-xs font-mono font-bold text-[#581C87] truncate mt-0.5" title={proof.transactionReference}>
                              {proof.transactionReference}
                            </p>
                          </div>
                        </div>

                        {/* Status Specific Bursary Remark Box */}
                        {isVerified && (
                          <div className="rounded-xl border border-[#087A50]/20 bg-[#E5F7ED]/60 p-3.5 text-xs text-[#087A50]">
                            <div className="flex items-start gap-2">
                              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                              <div>
                                <p className="font-extrabold">
                                  {proof.verifiedBy || "Verified by Senior Bursar"}
                                  {proof.verifiedAt ? ` on ${new Date(proof.verifiedAt).toLocaleDateString("en-NG", { month: "short", day: "numeric" })}` : ""}
                                </p>
                                <p className="mt-0.5 text-[11px] leading-relaxed">
                                  {proof.reviewRemarks || "Verified against school bank clearing ledger. Official receipt credited."}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {isRejected && (
                          <div className="rounded-xl border border-[#EF4444]/30 bg-[#FEF2F2] p-3.5 text-xs text-[#B91C1C] space-y-2">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-[#EF4444]" />
                              <div>
                                <p className="font-extrabold">Bursary Clearing Desk Remark:</p>
                                <p className="mt-0.5 text-[11px] leading-relaxed text-[#7F1D1D]">
                                  {proof.reviewRemarks || "Payment could not be verified on the bank statement. Please verify transaction reference."}
                                </p>
                              </div>
                            </div>
                            <div className="pt-1 flex justify-end">
                              <button
                                onClick={() => onOpenProofModal(proof.invoiceId, proof.pupilId)}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-[#B91C1C] px-3 py-1.5 text-xs font-extrabold text-white hover:bg-[#991B1B] transition cursor-pointer shadow-xs"
                              >
                                <RotateCcw className="h-3.5 w-3.5" /> Submit Revised Proof
                              </button>
                            </div>
                          </div>
                        )}

                        {isPending && (
                          <div className="rounded-xl border border-[#D97706]/20 bg-[#FFFBEB] p-3.5 text-xs text-[#92400E]">
                            <div className="flex items-start gap-2">
                              <Clock className="h-4 w-4 shrink-0 mt-0.5 text-[#D97706]" />
                              <div>
                                <p className="font-extrabold">Queued for Bank Reconciliation</p>
                                <p className="mt-0.5 text-[11px] leading-relaxed text-[#78350F]">
                                  {proof.reviewRemarks || "Proof received. The accounts team reconciles references with school statement credits within 24 hours."}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            /* Empty State for Proofs */
            <div className="rounded-2xl border border-[#E5DFE9] bg-white p-12 text-center shadow-xs">
              <FileCheck2 className="h-12 w-12 text-[#BBAFC4] mx-auto mb-3" />
              <h3 className="text-lg font-extrabold text-[#29166F]">No Payment Proofs Found</h3>
              <p className="mt-1 text-xs text-[#817887] max-w-sm mx-auto">
                No payment proof submissions match your current filter selection.
              </p>
              <button
                onClick={() => {
                  setProofStatusFilter("all");
                  setProofPupilFilter("all");
                  setProofSearchQuery("");
                }}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-[#DCD5E1] bg-[#F8F6FA] px-4 py-2 text-xs font-extrabold text-[#581C87] hover:bg-[#F1ECF6] transition cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset proof filters
              </button>
            </div>
          )}
        </div>
      )}
      {/* Online Payment Placeholder Modal */}
      <AnimatePresence>
        {isPaymentModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#160B35]/60 p-3 sm:p-4 backdrop-blur-sm overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="online-payment-modal-title"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white shadow-2xl border border-[#D8C7E8]"
            >
              {/* Modal Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#EEE9F1] bg-white/95 px-6 py-4 backdrop-blur-md">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-[#E9DB3D] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#29166F]">
                      Sandbox Preview
                    </span>
                    <span className="text-[11px] font-bold text-[#817887]">
                      Airtable Electronic Billing
                    </span>
                  </div>
                  <h3 id="online-payment-modal-title" className="mt-1 text-lg sm:text-xl font-extrabold text-[#29166F]">
                    Pay School Fees Online
                  </h3>
                </div>

                <button
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E5DFE9] text-[#625B69] hover:bg-[#F8F6FA] hover:text-[#29166F] transition cursor-pointer"
                  aria-label="Cancel and close payment modal"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6">
                {/* 1. Prominent "Online payments coming soon" state banner */}
                <div className="rounded-2xl border-2 border-[#581C87]/20 bg-gradient-to-br from-[#FAF8FD] to-[#F1ECF6] p-5 shadow-xs">
                  <div className="flex items-start gap-3.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#581C87] text-[#E9DB3D] shadow-sm">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="rounded-md bg-[#581C87] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white">
                          Online Payments Coming Soon (Term 2)
                        </span>
                        <span className="text-[11px] font-bold text-[#625B69]">
                          Gateway Evaluation Phase
                        </span>
                      </div>
                      <h4 className="text-sm sm:text-base font-extrabold text-[#29166F]">
                        Automated Card &amp; Direct Debit Clearing in Progress
                      </h4>
                      <p className="text-xs text-[#524959] leading-relaxed">
                        Marie Louise School is preparing direct online fee settlement through licensed Nigerian payment gateways (Paystack and Flutterwave). This preview demonstrates the future checkout workflow and multi-invoice settlement. <strong>No real financial charges will be debited today.</strong>
                      </p>
                    </div>
                  </div>

                  {/* Security Guarantee Notice - Absolutely no card details collected */}
                  <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-[#D97706]/25 bg-[#FFFBEB] p-3 text-xs text-[#92400E]">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-[#D97706] mt-0.5" />
                    <p className="leading-snug">
                      <strong>Security Policy:</strong> To protect our families, Marie Louise School will <u>never</u> request your 16-digit debit card number, CVV code, card PIN, online banking password, or OTP anywhere on this portal.
                    </p>
                  </div>
                </div>

                {/* 2. Unpaid Invoice Selection (with Multi-Invoice support in Family Overview) */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#581C87]">
                        {isFamily ? "Select Unpaid Invoices Across Children" : "Select Invoice to Settle"}
                      </h4>
                      <p className="text-xs text-[#817887]">
                        {isFamily
                          ? "Select one or multiple child invoices to combine in this payment session."
                          : "Choose which outstanding term charges to settle."}
                      </p>
                    </div>

                    {unpaidInvoices.length > 1 && (
                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <button
                          type="button"
                          onClick={handleSelectAllUnpaid}
                          className="text-[11px] font-extrabold text-[#581C87] hover:underline cursor-pointer"
                        >
                          Select All ({unpaidInvoices.length})
                        </button>
                        <span className="text-[#D1C7D8]">&bull;</span>
                        <button
                          type="button"
                          onClick={handleDeselectAll}
                          className="text-[11px] font-bold text-[#817887] hover:underline cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>

                  {unpaidInvoices.length > 0 ? (
                    <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                      {unpaidInvoices.map((inv) => {
                        const child = pupils.find((p) => p.id === inv.pupilId);
                        const isSelected = selectedInvoiceIds.includes(inv.id);

                        return (
                          <div
                            key={inv.id}
                            onClick={() => handleToggleInvoiceSelection(inv.id)}
                            className={`flex items-center justify-between gap-3 rounded-xl border p-3.5 transition cursor-pointer ${
                              isSelected
                                ? "border-[#581C87] bg-[#F9F7FB] shadow-xs"
                                : "border-[#E5DFE9] bg-white hover:border-[#D1C7D8]"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {/* Custom accessible checkbox */}
                              <div
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                                  isSelected
                                    ? "border-[#581C87] bg-[#581C87] text-white"
                                    : "border-[#C5BACD] bg-white"
                                }`}
                              >
                                {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                              </div>

                              <div className="space-y-0.5">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {child && (
                                    <span className="rounded bg-[#E8E2ED] px-1.5 py-0.2 text-[10px] font-extrabold text-[#29166F]">
                                      {child.fullName} ({child.class})
                                    </span>
                                  )}
                                  <span className="font-mono text-xs font-extrabold text-[#581C87]">
                                    {inv.invoiceReference || inv.invoiceNumber}
                                  </span>
                                </div>
                                <p className="text-xs font-bold text-[#29166F] line-clamp-1">
                                  {inv.title}
                                </p>
                                <p className="text-[11px] text-[#817887]">
                                  {inv.term} &bull; Due {inv.dueDate}
                                </p>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="text-[10px] font-bold uppercase text-[#817887]">
                                Amount Due
                              </span>
                              <p className="text-sm font-extrabold text-[#B91C1C]">
                                {formatNaira(inv.balance)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-[#E5DFE9] bg-[#FAF8FC] p-4 text-center text-xs text-[#817887]">
                      No outstanding invoices found. All fee bills for this account are settled.
                    </div>
                  )}
                </div>

                {/* 3. Payment Summary with Breakdown, Amount Due, and Amount Selected */}
                {selectedPaymentInvoices.length > 0 ? (
                  <div className="rounded-2xl border border-[#E5DFE9] bg-white p-4 sm:p-5 shadow-xs space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EEE9F1] pb-3">
                      <div>
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#29166F]">
                          Payment Summary
                        </h4>
                        <p className="text-xs text-[#817887]">
                          {selectedPaymentInvoices.length} invoice{selectedPaymentInvoices.length === 1 ? "" : "s"} selected
                          {isFamily && ` across linked pupils`}
                        </p>
                      </div>

                      <span className="rounded-full bg-[#E5F7ED] px-2.5 py-0.5 text-xs font-extrabold text-[#087A50]">
                        Ready to preview
                      </span>
                    </div>

                    {/* Breakdown by Selected Invoices */}
                    <div className="space-y-3">
                      {selectedPaymentInvoices.map((inv) => {
                        const child = pupils.find((p) => p.id === inv.pupilId);
                        return (
                          <div key={inv.id} className="rounded-xl bg-[#FAF8FC] border border-[#EEE9F1] p-3 text-xs">
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-[#EEE9F1]">
                              <div className="flex items-center gap-2">
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#581C87] text-[10px] font-extrabold text-white">
                                  {child?.avatarInitials || "P"}
                                </div>
                                <span className="font-extrabold text-[#29166F]">
                                  {child?.fullName} ({child?.class})
                                </span>
                              </div>
                              <span className="font-mono text-[11px] font-bold text-[#581C87]">
                                {inv.invoiceReference || inv.invoiceNumber}
                              </span>
                            </div>

                            {/* Itemized Charge Breakdown */}
                            {inv.items && inv.items.length > 0 ? (
                              <div className="space-y-1.5">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-[#817887]">
                                  Charge Breakdown:
                                </span>
                                <div className="grid gap-1 sm:grid-cols-2">
                                  {inv.items.map((item) => (
                                    <div
                                      key={item.id}
                                      className="flex items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-1 text-[11px] border border-[#EFEBF2]"
                                    >
                                      <span className="text-[#625B69] truncate">{item.description}</span>
                                      <strong className="text-[#29166F] shrink-0">{formatNaira(item.amount, false)}</strong>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="flex justify-between text-[#625B69]">
                                <span>{inv.title}</span>
                                <strong>{formatNaira(inv.amountDue)}</strong>
                              </div>
                            )}

                            <div className="mt-2.5 pt-2 border-t border-[#EEE9F1] flex items-center justify-between text-xs">
                              <span className="text-[#817887]">Total Outstanding for this Invoice:</span>
                              <strong className="text-[#29166F]">{formatNaira(inv.balance)}</strong>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Grand Total Amount Selected Card */}
                    <div className="rounded-xl bg-[#29166F] text-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#E9DB3D]">
                          Total Amount Selected for Payment
                        </span>
                        <p className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                          {formatNaira(totalAmountSelected)}
                        </p>
                        <p className="text-[11px] text-white/70">
                          Sum of {selectedPaymentInvoices.length} selected fee obligation{selectedPaymentInvoices.length === 1 ? "" : "s"}
                        </p>
                      </div>

                      <div className="sm:text-right">
                        <span className="text-[10px] font-bold uppercase text-white/60">Payer Account</span>
                        <p className="text-xs font-extrabold text-white">{data.parent.fullName}</p>
                        <p className="text-[11px] text-white/70">{data.parent.email}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center text-xs text-amber-800">
                    Please select at least one unpaid invoice above to preview the payment breakdown and amount.
                  </div>
                )}

                {/* 4. Future Payment Provider Boundary Preview */}
                <div className="rounded-2xl border border-[#DCD5E1] bg-[#FAF8FC] p-4 sm:p-5 space-y-3 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <LockKeyhole className="h-4 w-4 text-[#581C87]" />
                      <h4 className="font-extrabold text-[#29166F]">
                        Future Payment Provider Integration Boundary
                      </h4>
                    </div>
                    <span className="rounded-full bg-[#E8E2ED] px-2 py-0.5 text-[10px] font-extrabold text-[#581C87]">
                      Server API Hook Ready
                    </span>
                  </div>

                  <p className="text-[#625B69] leading-relaxed">
                    When live gateway keys are connected to our secure server backend, checkout will be handled directly through licensed providers. Select your preferred provider below to test the integration handshake contract:
                  </p>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedProvider("paystack")}
                      className={`flex items-start gap-3 rounded-xl border p-3 text-left transition cursor-pointer ${
                        selectedProvider === "paystack"
                          ? "border-[#581C87] bg-white ring-2 ring-[#581C87]/15 shadow-xs"
                          : "border-[#E5DFE9] bg-white/60 hover:bg-white"
                      }`}
                    >
                      <CreditCard className="h-5 w-5 text-[#581C87] shrink-0 mt-0.5" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <strong className="text-[#29166F] font-extrabold">Paystack Gateway</strong>
                          {selectedProvider === "paystack" && (
                            <span className="text-[9px] bg-[#E9DB3D] text-[#29166F] font-extrabold px-1.5 py-0.2 rounded">
                              Selected
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#817887] mt-0.5">
                          Debit Cards (Mastercard, Visa, Verve), USSD, Direct Bank Transfer &amp; Virtual NUBAN.
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedProvider("flutterwave")}
                      className={`flex items-start gap-3 rounded-xl border p-3 text-left transition cursor-pointer ${
                        selectedProvider === "flutterwave"
                          ? "border-[#581C87] bg-white ring-2 ring-[#581C87]/15 shadow-xs"
                          : "border-[#E5DFE9] bg-white/60 hover:bg-white"
                      }`}
                    >
                      <Sparkles className="h-5 w-5 text-[#D97706] shrink-0 mt-0.5" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <strong className="text-[#29166F] font-extrabold">Flutterwave Checkout</strong>
                          {selectedProvider === "flutterwave" && (
                            <span className="text-[9px] bg-[#E9DB3D] text-[#29166F] font-extrabold px-1.5 py-0.2 rounded">
                              Selected
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#817887] mt-0.5">
                          Cards, Bank Accounts, Mobile Money, and Diaspora International Payments.
                        </p>
                      </div>
                    </button>
                  </div>

                  {/* Gateway simulation result display */}
                  {gatewayResult && (
                    <div className="mt-3 rounded-xl border border-[#581C87]/30 bg-[#F1ECF6] p-3 text-xs text-[#29166F]">
                      <div className="flex items-center gap-2 font-extrabold">
                        <CheckCircle2 className="h-4 w-4 text-[#087A50]" />
                        <span>Integration Handshake Simulated Successfully</span>
                      </div>
                      <p className="mt-1 text-[11px] text-[#524959]">
                        {gatewayResult.message}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-mono font-bold text-[#581C87]">
                        <span>Status: {gatewayResult.status}</span> &bull;
                        <span>Session Ref: {gatewayResult.reference}</span> &bull;
                        <span>Target: {gatewayResult.provider.toUpperCase()}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 5. Current Payment Instructions Reminder */}
                <div className="rounded-xl border border-[#EEE9F1] bg-[#FBF9FD] p-4 text-xs">
                  <h4 className="font-extrabold text-[#29166F] flex items-center gap-1.5">
                    <Info className="h-3.5 w-3.5 text-[#581C87]" />
                    <span>How to settle fees right now:</span>
                  </h4>
                  <p className="mt-1 text-[#625B69]">
                    Please make a direct electronic transfer to the school&apos;s registered bursary account, then click <strong>&ldquo;Submit Transfer Proof&rdquo;</strong> to attach your deposit reference:
                  </p>
                  <div className="mt-2.5 rounded-lg border border-[#E5DFE9] bg-white p-3 font-mono text-[11px] space-y-1">
                    <div className="flex justify-between">
                      <span className="text-[#817887]">Bank:</span>
                      <strong className="text-[#29166F]">Zenith Bank PLC</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#817887]">Account Name:</span>
                      <strong className="text-[#29166F]">Marie Louise School - Tuition &amp; Billing</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#817887]">Account Number:</span>
                      <strong className="text-[#581C87] text-xs">1012345678</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer with Cancel and Return-to-Fees actions */}
              <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 border-t border-[#EEE9F1] bg-white/95 px-6 py-4 backdrop-blur-md">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#DCD5E1] bg-white px-4 text-xs font-extrabold text-[#625B69] hover:bg-[#F8F6FA] hover:text-[#29166F] transition cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
                  Cancel &amp; Return to Fees
                </button>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPaymentModalOpen(false);
                      onOpenProofModal();
                    }}
                    className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#581C87] bg-[#F8F6FA] px-4 text-xs font-extrabold text-[#581C87] hover:bg-[#F1ECF6] transition cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Submit Offline Transfer Proof
                  </button>

                  <button
                    type="button"
                    onClick={handleSimulateGateway}
                    disabled={isSimulatingGateway || selectedInvoiceIds.length === 0}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#29166F] px-5 text-xs font-extrabold text-[#E9DB3D] hover:bg-[#1C0D4F] disabled:opacity-50 disabled:pointer-events-none transition cursor-pointer shadow-sm"
                  >
                    {isSimulatingGateway ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>Connecting to Gateway Sandbox...</span>
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-3.5 w-3.5" />
                        <span>Simulate Gateway Handshake (Coming Soon)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * 6. Requests & Absence Management View (Airtable-Ready Architecture)
 */
interface RequestsViewProps {
  data: ParentDashboardData;
  onSelectChild: (pupilId: string) => void;
  onRefreshData?: () => void;
  onNotify?: (message: string) => void;
}

const RequestsView: React.FC<RequestsViewProps> = ({
  data,
  onSelectChild,
  onRefreshData,
  onNotify,
}) => {
  const [activeTab, setActiveTab] = useState<"new-request" | "history">("new-request");

  // Step state: 1 = Form details, 2 = Review & Verify, 3 = Confirmation
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form Fields
  const [selectedPupilId, setSelectedPupilId] = useState<string>(
    data.selectedPupil?.id || data.pupils[0]?.id || ""
  );

  // Default dates: tomorrow as default absence start date
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  });

  const [reason, setReason] = useState<AbsenceReason>("Illness");
  const [notes, setNotes] = useState<string>("");
  const [supportingDocName, setSupportingDocName] = useState<string>("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedReport, setSubmittedReport] = useState<AbsenceReport | null>(null);

  // History filters
  const [historyStatusFilter, setHistoryStatusFilter] = useState<
    "all" | "Submitted" | "Reviewed" | "Approved" | "More Information Required"
  >("all");
  const [historyPupilFilter, setHistoryPupilFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Sync selected pupil if parent changed active child from global header
  useEffect(() => {
    if (data.selectedPupil) {
      setSelectedPupilId(data.selectedPupil.id);
    }
  }, [data.selectedPupil]);

  // Selected pupil object for the form
  const activePupil = useMemo(() => {
    return data.pupils.find((p) => p.id === selectedPupilId) || data.pupils[0];
  }, [data.pupils, selectedPupilId]);

  // Calculate duration in days
  const calculateDays = (start: string, end: string): number => {
    if (!start || !end) return 1;
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    if (isNaN(s) || isNaN(e) || e < s) return 0;
    const diff = Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(diff, 1);
  };

  const durationDays = useMemo(() => {
    return calculateDays(startDate, endDate);
  }, [startDate, endDate]);

  // Step 1 Validation
  const handleProceedToReview = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedPupilId) {
      setFormError("Please select a linked child.");
      return;
    }
    if (!startDate) {
      setFormError("Please select the absence start date.");
      return;
    }
    if (!endDate) {
      setFormError("Please select the absence end date.");
      return;
    }
    if (endDate < startDate) {
      setFormError("The absence end date cannot be earlier than the start date.");
      return;
    }
    if (!reason) {
      setFormError("Please select a reason category.");
      return;
    }
    if (!notes.trim() || notes.trim().length < 8) {
      setFormError(
        "Please provide an explanatory message describing the reason for absence (minimum 8 characters)."
      );
      return;
    }

    setStep(2);
  };

  // Step 2 Submission to Data Service
  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);
    setFormError(null);

    try {
      const newReport = await portalService.submitAbsenceReport({
        pupilId: selectedPupilId,
        parentId: data.parent.id,
        startDate,
        endDate,
        reason,
        notes: notes.trim(),
        supportingDocName: supportingDocName || undefined,
        supportingDocUrl: supportingDocName ? `/documents/absence/${supportingDocName}` : undefined,
      });

      setSubmittedReport(newReport);
      setStep(3);
      onRefreshData?.();
      onNotify?.(
        `Absence notice ${newReport.referenceNumber} recorded in local demonstration state.`
      );
    } catch {
      setFormError("An unexpected error occurred while saving the absence notice. Please retry.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form to start a new request
  const handleResetForm = () => {
    setStep(1);
    setNotes("");
    setSupportingDocName("");
    setFormError(null);
    setSubmittedReport(null);
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const def = d.toISOString().split("T")[0];
    setStartDate(def);
    setEndDate(def);
  };

  // Reason categories
  const reasonOptions: { id: AbsenceReason; label: string; desc: string }[] = [
    { id: "Illness", label: "Illness / Health", desc: "Fever, contagious illness, bed rest, or medical recovery" },
    { id: "Medical Appointment", label: "Medical Appointment", desc: "Pediatric clinic, dentist, optometrist, hospital visit" },
    { id: "Family Event", label: "Family Event", desc: "Milestone celebration, bereavement, or family occasion" },
    { id: "Travel", label: "Travel / Relocation", desc: "Interstate or international travel, school visa visit" },
    { id: "Other", label: "Other / Official Competition", desc: "Special sports trials, STEAM Olympiad, or school representation" },
  ];

  // Document templates for fast demo testing
  const sampleDocuments = [
    "Lagoon_Hospital_Medical_Certificate.pdf",
    "Dentist_Appointment_Confirmation_Card.pdf",
    "Official_Invitation_Letter.pdf",
    "Pediatric_Doctor_Prescription_Slip.pdf",
  ];

  // Filtered History Reports
  const filteredReports = useMemo(() => {
    return data.absenceReports
      .filter((rep) => {
        if (historyPupilFilter !== "all" && rep.pupilId !== historyPupilFilter) {
          return false;
        }
        if (historyStatusFilter !== "all" && rep.status !== historyStatusFilter) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const child = data.pupils.find((p) => p.id === rep.pupilId);
          const matchRef = rep.referenceNumber?.toLowerCase().includes(q);
          const matchId = rep.id.toLowerCase().includes(q);
          const matchReason = rep.reason.toLowerCase().includes(q);
          const matchNotes = rep.notes.toLowerCase().includes(q);
          const matchChild = child?.fullName.toLowerCase().includes(q);
          if (!matchRef && !matchId && !matchReason && !matchNotes && !matchChild) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  }, [data.absenceReports, historyPupilFilter, historyStatusFilter, searchQuery, data.pupils]);

  // History status counts
  const statusCounts = useMemo(() => {
    const list =
      historyPupilFilter === "all"
        ? data.absenceReports
        : data.absenceReports.filter((r) => r.pupilId === historyPupilFilter);

    return {
      all: list.length,
      Submitted: list.filter((r) => r.status === "Submitted").length,
      Reviewed: list.filter((r) => r.status === "Reviewed").length,
      Approved: list.filter((r) => r.status === "Approved").length,
      "More Information Required": list.filter(
        (r) => r.status === "More Information Required"
      ).length,
    };
  }, [data.absenceReports, historyPupilFilter]);

  // Status badge styling helper
  const renderStatusBadge = (status: AbsenceStatus) => {
    switch (status) {
      case "Approved":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E5F7ED] px-2.5 py-0.5 text-xs font-extrabold text-[#087A50] border border-[#087A50]/20">
            <CheckCircle2 className="h-3.5 w-3.5" /> Approved &bull; Excused on Register
          </span>
        );
      case "Reviewed":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EFF6FF] px-2.5 py-0.5 text-xs font-extrabold text-[#1D4ED8] border border-[#1D4ED8]/20">
            <Eye className="h-3.5 w-3.5" /> Reviewed &bull; Being Processed by Teacher
          </span>
        );
      case "More Information Required":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FEF2F2] px-2.5 py-0.5 text-xs font-extrabold text-[#B91C1C] border border-[#B91C1C]/25">
            <AlertTriangle className="h-3.5 w-3.5" /> Action Required &bull; More Information Required
          </span>
        );
      case "Submitted":
      case "Under Review":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FEF9C3] px-2.5 py-0.5 text-xs font-extrabold text-[#854D0E] border border-[#854D0E]/20">
            <Clock className="h-3.5 w-3.5" /> Submitted &bull; Pending Initial Review
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Demonstration Data & Local State Disclaimer Banner */}
      <div className="rounded-xl border border-[#D97706]/30 bg-[#FFFBEB] p-4 text-xs text-[#92400E] shadow-xs">
        <div className="flex items-start sm:items-center gap-2.5">
          <Info className="h-4 w-4 text-[#D97706] shrink-0 mt-0.5 sm:mt-0" />
          <span>
            <strong>Demonstration Workflow Notice:</strong> Absence notices submitted in this Parent Portal update
            local demonstration state and conform to Airtable-ready Absence Reports records. They have not been sent to the physical school office until a live backend is connected.
          </span>
        </div>
      </div>

      {/* Main Section Header */}
      <section className="overflow-hidden rounded-2xl bg-[#29166F] text-white p-6 sm:p-8 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#E9DB3D] px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-[#29166F]">
                Attendance Administration
              </span>
              <span className="text-xs text-white/70">
                Airtable Schema Ready &bull; Session 2026/2027
              </span>
            </div>
            <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight">
              Requests &amp; Absence Notices
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm text-white/75 max-w-2xl leading-relaxed">
              Notify Marie Louise School in advance regarding planned medical appointments, family travel, or sudden illness. Official excused absence marks are recorded directly on the register.
            </p>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex flex-wrap items-center gap-3 bg-[#1C0D4F] rounded-xl p-3 sm:p-4 border border-white/10 shrink-0">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/60">Total Notices</span>
              <p className="text-xl font-extrabold text-white">{data.absenceReports.length}</p>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#E9DB3D]">Approved</span>
              <p className="text-xl font-extrabold text-[#E9DB3D]">
                {data.absenceReports.filter((r) => r.status === "Approved").length}
              </p>
            </div>
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
          <button
            onClick={() => setActiveTab("new-request")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold transition cursor-pointer ${
              activeTab === "new-request"
                ? "bg-white text-[#29166F] shadow-sm"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            <Plus className="h-4 w-4" />
            <span>Report an Absence</span>
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold transition cursor-pointer ${
              activeTab === "history"
                ? "bg-white text-[#29166F] shadow-sm"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            <FileCheck2 className="h-4 w-4" />
            <span>Request History &amp; Status</span>
            <span
              className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] ${
                activeTab === "history" ? "bg-[#581C87] text-white" : "bg-white/25 text-white"
              }`}
            >
              {data.absenceReports.length}
            </span>
          </button>
        </div>
      </section>

      {/* TAB 1: REPORT AN ABSENCE WORKFLOW */}
      {activeTab === "new-request" && (
        <div className="rounded-2xl border border-[#E5DFE9] bg-white p-5 sm:p-8 shadow-xs space-y-6">
          {/* Step Progress Bar */}
          <div className="border-b border-[#EEE9F1] pb-6">
            <div className="grid grid-cols-3 gap-2 text-center text-xs font-extrabold">
              <div
                className={`rounded-xl py-2 px-3 border transition ${
                  step === 1
                    ? "border-[#581C87] bg-[#F1ECF6] text-[#581C87]"
                    : step > 1
                    ? "border-[#E5F7ED] bg-[#E5F7ED] text-[#087A50]"
                    : "border-[#E5DFE9] bg-[#FAF8FC] text-[#817887]"
                }`}
              >
                <span className="block text-[10px] font-bold uppercase tracking-wider text-[#817887]">
                  Step 1
                </span>
                <span>Absence Details</span>
              </div>

              <div
                className={`rounded-xl py-2 px-3 border transition ${
                  step === 2
                    ? "border-[#581C87] bg-[#F1ECF6] text-[#581C87]"
                    : step > 2
                    ? "border-[#E5F7ED] bg-[#E5F7ED] text-[#087A50]"
                    : "border-[#E5DFE9] bg-[#FAF8FC] text-[#817887]"
                }`}
              >
                <span className="block text-[10px] font-bold uppercase tracking-wider text-[#817887]">
                  Step 2
                </span>
                <span>Review &amp; Verify</span>
              </div>

              <div
                className={`rounded-xl py-2 px-3 border transition ${
                  step === 3
                    ? "border-[#087A50] bg-[#E5F7ED] text-[#087A50]"
                    : "border-[#E5DFE9] bg-[#FAF8FC] text-[#817887]"
                }`}
              >
                <span className="block text-[10px] font-bold uppercase tracking-wider text-[#817887]">
                  Step 3
                </span>
                <span>Confirmation</span>
              </div>
            </div>
          </div>

          {/* Inline Error Alert */}
          {formError && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-700"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {/* STEP 1: FORM DETAILS */}
          {step === 1 && (
            <form onSubmit={handleProceedToReview} className="space-y-6">
              {/* 1. Child Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-[#29166F]">
                  1. Select Linked Child <span className="text-red-500">*</span>
                </label>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {data.pupils.map((child) => {
                    const isSelected = selectedPupilId === child.id;
                    return (
                      <div
                        key={child.id}
                        onClick={() => setSelectedPupilId(child.id)}
                        className={`flex items-center gap-3 rounded-xl border p-3.5 transition cursor-pointer ${
                          isSelected
                            ? "border-[#581C87] bg-[#F9F7FB] ring-2 ring-[#581C87]/15 shadow-xs"
                            : "border-[#E5DFE9] bg-white hover:border-[#D1C7D8]"
                        }`}
                      >
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-extrabold text-xs text-white ${
                            isSelected ? "bg-[#581C87]" : "bg-[#817887]"
                          }`}
                        >
                          {child.avatarInitials}
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-xs font-extrabold text-[#29166F] leading-snug">
                            {child.fullName}
                          </p>
                          <p className="text-[11px] text-[#817887]">
                            {child.class} &bull; {child.admissionNumber}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. Date Pickers & Duration Indicator */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-[#29166F]">
                    2. Absence Period <span className="text-red-500">*</span>
                  </label>
                  {durationDays > 0 ? (
                    <span className="rounded-full bg-[#F1ECF6] px-2.5 py-0.5 text-[11px] font-extrabold text-[#581C87]">
                      {durationDays === 1 ? "1 School Day" : `${durationDays} School Days`}
                    </span>
                  ) : (
                    <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-extrabold text-red-600">
                      Invalid date range
                    </span>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="absence-start-date" className="block text-[11px] font-bold text-[#625B69] mb-1">
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="absence-start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                      className="h-11 w-full rounded-xl border border-[#DCD5E1] bg-white px-3 text-xs font-bold text-[#29166F] outline-none focus:border-[#581C87] focus:ring-2 focus:ring-[#581C87]/15 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label htmlFor="absence-end-date" className="block text-[11px] font-bold text-[#625B69] mb-1">
                      End Date (Expected Return) <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="absence-end-date"
                      type="date"
                      value={endDate}
                      min={startDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                      className="h-11 w-full rounded-xl border border-[#DCD5E1] bg-white px-3 text-xs font-bold text-[#29166F] outline-none focus:border-[#581C87] focus:ring-2 focus:ring-[#581C87]/15 cursor-pointer"
                    />
                  </div>
                </div>

                {endDate < startDate && (
                  <p className="text-[11px] font-bold text-red-600 flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3.5 w-3.5" /> End date cannot be earlier than start date.
                  </p>
                )}
              </div>

              {/* 3. Reason Category Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-[#29166F]">
                  3. Reason Category <span className="text-red-500">*</span>
                </label>
                <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {reasonOptions.map((opt) => {
                    const isSelected = reason === opt.id;
                    return (
                      <div
                        key={opt.id}
                        onClick={() => setReason(opt.id)}
                        className={`rounded-xl border p-3.5 transition cursor-pointer ${
                          isSelected
                            ? "border-[#581C87] bg-[#F1ECF6] ring-2 ring-[#581C87]/15 shadow-xs"
                            : "border-[#E5DFE9] bg-white hover:border-[#D1C7D8]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold text-[#29166F]">{opt.label}</span>
                          <div
                            className={`flex h-4 w-4 rounded-full border items-center justify-center ${
                              isSelected ? "border-[#581C87] bg-[#581C87]" : "border-[#C5BACD]"
                            }`}
                          >
                            {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                          </div>
                        </div>
                        <p className="mt-1 text-[11px] text-[#817887] leading-relaxed">{opt.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 4. Explanatory Message */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="absence-notes" className="block text-xs font-extrabold uppercase tracking-wider text-[#29166F]">
                    4. Explanatory Message / Symptoms / Details <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] text-[#817887]">{notes.length} characters</span>
                </div>
                <textarea
                  id="absence-notes"
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Please describe the illness symptoms, medical clinic name, or reason for travel so the lead teacher and school nurse can provide appropriate support..."
                  required
                  className="w-full rounded-xl border border-[#DCD5E1] bg-white p-3.5 text-xs text-[#29166F] placeholder-[#817887] outline-none focus:border-[#581C87] focus:ring-2 focus:ring-[#581C87]/15 leading-relaxed"
                />
              </div>

              {/* 5. Optional Supporting Document Placeholder */}
              <div className="space-y-2">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-[#29166F]">
                  5. Optional Supporting Document Placeholder
                </label>
                <div className="rounded-xl border border-dashed border-[#DCD5E1] bg-[#FAF8FC] p-4 text-xs">
                  {supportingDocName ? (
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-[#581C87]/25 bg-white p-3">
                      <div className="flex items-center gap-2.5">
                        <Paperclip className="h-4 w-4 text-[#581C87]" />
                        <div>
                          <p className="text-xs font-extrabold text-[#29166F]">{supportingDocName}</p>
                          <p className="text-[10px] text-[#817887]">Ready for demonstration submission (248 KB)</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSupportingDocName("")}
                        className="text-xs font-extrabold text-red-600 hover:underline cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5 text-center">
                      <Paperclip className="h-6 w-6 text-[#BBAFC4] mx-auto" />
                      <div>
                        <p className="text-xs font-bold text-[#29166F]">
                          Attach Doctor&apos;s Note, Medical Certificate, or Travel Slip (Optional)
                        </p>
                        <p className="text-[11px] text-[#817887] mt-0.5">
                          PDF, PNG, or JPEG up to 5MB. Click a sample below to attach instantly:
                        </p>
                      </div>

                      {/* Quick demo presets */}
                      <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                        {sampleDocuments.map((doc) => (
                          <button
                            key={doc}
                            type="button"
                            onClick={() => setSupportingDocName(doc)}
                            className="rounded-lg border border-[#E5DFE9] bg-white px-2.5 py-1 text-[11px] font-bold text-[#581C87] hover:bg-[#F1ECF6] transition cursor-pointer"
                          >
                            + {doc.replace(".pdf", "")}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="submit"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#581C87] px-6 text-xs font-extrabold text-white hover:bg-[#29166F] shadow-sm transition cursor-pointer"
                >
                  <span>Continue to Review</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: REVIEW & VERIFY */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="rounded-xl border border-[#D8C7E8] bg-[#FDFCFE] p-5 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EEE9F1] pb-3">
                  <h3 className="text-base font-extrabold text-[#29166F]">
                    Review Absence Notice Before Submission
                  </h3>
                  <span className="rounded-full bg-[#FEF9C3] px-2.5 py-0.5 text-xs font-bold text-[#854D0E]">
                    Draft Review
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 text-xs">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase text-[#817887]">Pupil</span>
                    <p className="text-sm font-extrabold text-[#29166F]">
                      {activePupil?.fullName} ({activePupil?.class})
                    </p>
                    <p className="text-[11px] text-[#817887]">
                      Admission: {activePupil?.admissionNumber} &bull; Teacher: {activePupil?.classTeacher}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase text-[#817887]">Absence Period</span>
                    <p className="text-sm font-extrabold text-[#29166F]">
                      {startDate} &mdash; {endDate}
                    </p>
                    <p className="text-[11px] font-bold text-[#581C87]">
                      {durationDays} School Day{durationDays === 1 ? "" : "s"} Total
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase text-[#817887]">Reason Category</span>
                    <p className="text-xs font-extrabold text-[#29166F] bg-[#F1ECF6] w-fit px-2.5 py-1 rounded-md">
                      {reason}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase text-[#817887]">Supporting Document</span>
                    <p className="text-xs text-[#625B69] flex items-center gap-1 font-semibold">
                      <Paperclip className="h-3.5 w-3.5 text-[#581C87]" />
                      {supportingDocName || "None provided"}
                    </p>
                  </div>
                </div>

                <div className="border-t border-[#EEE9F1] pt-3 text-xs space-y-1">
                  <span className="text-[10px] font-bold uppercase text-[#817887]">Explanatory Message</span>
                  <div className="rounded-lg bg-[#FAF8FC] border border-[#EFEBF2] p-3 text-xs text-[#342D3A] leading-relaxed">
                    &ldquo;{notes}&rdquo;
                  </div>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-900 leading-snug">
                  <strong>Local Sandbox Verification:</strong> Confirming this submission will generate an official Airtable-formatted Absence Report with status <strong>&ldquo;Submitted&rdquo;</strong> in your local demo history.
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={isSubmitting}
                  className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-[#DCD5E1] bg-white px-5 text-xs font-extrabold text-[#625B69] hover:bg-[#F8F6FA] cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Edit</span>
                </button>

                <button
                  type="button"
                  onClick={handleConfirmSubmit}
                  disabled={isSubmitting}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#581C87] px-6 text-xs font-extrabold text-white hover:bg-[#29166F] shadow-sm cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Recording Notice...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Confirm &amp; Submit Notice</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: CONFIRMATION */}
          {step === 3 && submittedReport && (
            <div className="rounded-2xl border border-[#087A50]/30 bg-[#F6FBF8] p-6 sm:p-8 text-center space-y-5">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E5F7ED] text-[#087A50] mx-auto shadow-xs">
                <CheckCircle2 className="h-8 w-8" />
              </div>

              <div>
                <span className="rounded-full bg-[#E5F7ED] px-3 py-0.5 text-xs font-extrabold text-[#087A50]">
                  Notice Successfully Logged
                </span>
                <h3 className="mt-2 text-xl font-extrabold text-[#29166F]">
                  Absence Notice Received
                </h3>
                <p className="mt-1 text-xs text-[#625B69] max-w-md mx-auto leading-relaxed">
                  Your pupil absence notice has been recorded in the local portal demo service.
                </p>
              </div>

              {/* Reference Number Box */}
              <div className="rounded-xl border border-[#D8C7E8] bg-white p-5 max-w-md mx-auto shadow-xs space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#817887]">
                  Generated Tracking Reference
                </span>
                <p className="font-mono text-2xl font-extrabold text-[#581C87]">
                  {submittedReport.referenceNumber}
                </p>
                <div className="flex items-center justify-center gap-2 text-[11px] text-[#817887]">
                  <span>Airtable ID: <strong>{submittedReport.id}</strong></span>
                  <span>&bull;</span>
                  <span>Status: <strong>{submittedReport.status}</strong></span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("history");
                    setStep(1);
                  }}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#581C87] px-5 text-xs font-extrabold text-white hover:bg-[#29166F] shadow-sm cursor-pointer"
                >
                  <FileCheck2 className="h-4 w-4" />
                  <span>View in Request History</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetForm}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#DCD5E1] bg-white px-5 text-xs font-extrabold text-[#29166F] hover:bg-[#F8F6FA] cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>Submit Another Absence Notice</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: REQUEST HISTORY & STATUS */}
      {activeTab === "history" && (
        <div className="space-y-5">
          {/* Filter Bar */}
          <div className="rounded-2xl border border-[#E5DFE9] bg-white p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EEE9F1] pb-4">
              <div>
                <h3 className="text-base font-extrabold text-[#29166F]">
                  Absence Notice History &amp; Workflow Status
                </h3>
                <p className="text-xs text-[#817887] mt-0.5">
                  Track administrative review endorsements and teacher remarks for all reported pupil absences.
                </p>
              </div>

              <button
                onClick={() => {
                  setActiveTab("new-request");
                  setStep(1);
                }}
                className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-[#581C87] px-3.5 text-xs font-extrabold text-white hover:bg-[#29166F] shadow-xs cursor-pointer shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Absence Notice</span>
              </button>
            </div>

            {/* Status Filter Chips */}
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  { id: "all", label: "All Notices", count: statusCounts.all },
                  { id: "Submitted", label: "Submitted", count: statusCounts.Submitted },
                  { id: "Reviewed", label: "Reviewed", count: statusCounts.Reviewed },
                  { id: "Approved", label: "Approved", count: statusCounts.Approved },
                  {
                    id: "More Information Required",
                    label: "More Info Required",
                    count: statusCounts["More Information Required"],
                  },
                ] as const
              ).map((chip) => {
                const isActive = historyStatusFilter === chip.id;
                return (
                  <button
                    key={chip.id}
                    onClick={() => setHistoryStatusFilter(chip.id as any)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                      isActive
                        ? "bg-[#581C87] text-white shadow-xs"
                        : "border border-[#E5DFE9] bg-white text-[#625B69] hover:bg-[#F8F6FA]"
                    }`}
                  >
                    <span>{chip.label}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[10px] font-extrabold ${
                        isActive ? "bg-white/25 text-white" : "bg-[#F1ECF6] text-[#581C87]"
                      }`}
                    >
                      {chip.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Child Selector & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <label htmlFor="history-child-filter" className="text-xs font-bold text-[#625B69] whitespace-nowrap">
                  Filter by Child:
                </label>
                <select
                  id="history-child-filter"
                  value={historyPupilFilter}
                  onChange={(e) => setHistoryPupilFilter(e.target.value)}
                  className="h-9 rounded-lg border border-[#DCD5E1] bg-white px-2.5 text-xs font-bold text-[#29166F] outline-none cursor-pointer"
                >
                  <option value="all">All Linked Children ({data.pupils.length})</option>
                  {data.pupils.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName} ({p.class})
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative flex-1 sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#817887]" />
                <input
                  type="text"
                  placeholder="Search reference, reason, or pupil..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 w-full rounded-lg border border-[#DCD5E1] bg-white pl-8 pr-3 text-xs outline-none focus:border-[#581C87] focus:ring-2 focus:ring-[#581C87]/15"
                />
              </div>
            </div>
          </div>

          {/* History Cards List */}
          {filteredReports.length > 0 ? (
            <div className="space-y-4">
              {filteredReports.map((report) => {
                const child = data.pupils.find((p) => p.id === report.pupilId);
                const days = calculateDays(report.startDate, report.endDate);

                return (
                  <article
                    key={report.id}
                    className="rounded-2xl border border-[#E5DFE9] bg-white p-5 sm:p-6 shadow-xs transition hover:border-[#581C87]/30 hover:shadow-sm space-y-4"
                  >
                    {/* Top Row: Reference, Pupil, Status */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EEE9F1] pb-3.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-extrabold text-[#581C87] bg-[#F1ECF6] px-2.5 py-0.5 rounded-md">
                          {report.referenceNumber || report.id}
                        </span>
                        {child && (
                          <span className="text-xs bg-[#E8E2ED] text-[#29166F] font-bold px-2 py-0.5 rounded-md">
                            {child.fullName} ({child.class})
                          </span>
                        )}
                        <span className="rounded bg-[#F8F6FA] text-[#625B69] font-extrabold text-[10px] px-2 py-0.5">
                          {report.reason}
                        </span>
                      </div>

                      <div>{renderStatusBadge(report.status)}</div>
                    </div>

                    {/* Dates & Duration Banner */}
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-xs bg-[#FAF8FC] p-3.5 rounded-xl border border-[#EEE9F1]">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-[#817887]">Absence Dates</span>
                        <p className="text-xs font-extrabold text-[#29166F] mt-0.5">
                          {report.startDate} &mdash; {report.endDate}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-[#817887]">Estimated Duration</span>
                        <p className="text-xs font-extrabold text-[#581C87] mt-0.5">
                          {days} School Day{days === 1 ? "" : "s"}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-[#817887]">Submitted On</span>
                        <p className="text-xs text-[#625B69] mt-0.5">
                          {new Date(report.submittedAt).toLocaleDateString("en-NG", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Explanatory Message */}
                    <div className="space-y-1 text-xs">
                      <span className="text-[10px] font-bold uppercase text-[#817887]">Explanatory Note</span>
                      <p className="text-xs text-[#342D3A] leading-relaxed bg-white border border-[#EEE9F1] p-3 rounded-lg">
                        {report.notes}
                      </p>
                    </div>

                    {/* Attached Supporting Document */}
                    {report.supportingDocName && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-[10px] font-bold uppercase text-[#817887]">Attachment:</span>
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-[#F1ECF6] px-2.5 py-1 text-xs font-bold text-[#581C87]">
                          <Paperclip className="h-3.5 w-3.5" />
                          {report.supportingDocName}
                        </span>
                      </div>
                    )}

                    {/* School Review Feedback Box */}
                    {report.acknowledgementNote && (
                      <div
                        className={`rounded-xl p-3.5 text-xs space-y-1 border ${
                          report.status === "Approved"
                            ? "bg-[#F4FAF6] border-[#A7F3D0] text-[#065F46]"
                            : report.status === "More Information Required"
                            ? "bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]"
                            : "bg-[#F0F7FF] border-[#BAE6FD] text-[#075985]"
                        }`}
                      >
                        <div className="flex items-center justify-between font-extrabold text-[11px]">
                          <span>
                            School Review Remarks &bull; {report.reviewedBy || "Administration Desk"}
                          </span>
                          {report.reviewedAt && (
                            <span className="text-[10px] opacity-75">
                              {new Date(report.reviewedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <p className="text-xs leading-relaxed">{report.acknowledgementNote}</p>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-[#E5DFE9] bg-white p-12 text-center shadow-xs space-y-3">
              <FileCheck2 className="h-10 w-10 text-[#BBAFC4] mx-auto" />
              <h3 className="text-base font-extrabold text-[#29166F]">No Absence Notices Found</h3>
              <p className="text-xs text-[#817887] max-w-sm mx-auto">
                No absence records match the current status filter &ldquo;{historyStatusFilter}&rdquo;
                {historyPupilFilter !== "all" && " for the selected child"}.
              </p>
              <button
                onClick={() => {
                  setHistoryStatusFilter("all");
                  setHistoryPupilFilter("all");
                  setSearchQuery("");
                }}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-[#DCD5E1] bg-[#F8F6FA] px-4 py-2 text-xs font-bold text-[#581C87] hover:bg-[#F1ECF6] cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset Filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};


/**
 * 6. Notices View
 */
const Notices: React.FC<{ data: ParentDashboardData }> = ({ data }) => (
  <div className="overflow-hidden rounded-xl border border-[#E5DFE9] bg-white">
    {data.notices.map((notice, index) => (
      <article
        key={notice.id}
        className="grid gap-4 border-b border-[#EEE9F1] p-5 last:border-0 sm:grid-cols-[130px_1fr_auto] sm:items-start sm:p-6"
      >
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-[#581C87]">
            {notice.category}
          </p>
          {notice.targetAudience && (
            <span className="inline-block mt-1 text-[9px] font-bold text-[#817887] bg-[#F1ECF6] px-2 py-0.5 rounded">
              {notice.targetAudience}
            </span>
          )}
        </div>
        <div>
          <h2 className="text-base font-extrabold text-[#29166F]">{notice.title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#625B69]">{notice.copy}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-[#817887]">{notice.date}</span>
          {index === 0 || notice.isPriority ? (
            <span className="h-2 w-2 rounded-full bg-[#E0CA1D]" />
          ) : null}
        </div>
      </article>
    ))}
  </div>
);
