import React, { useState, useEffect, useRef, useId, useMemo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  Bell,
  BookMarked,
  BookOpen,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock,
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
  LockKeyhole,
  LogOut,
  Menu,
  Paperclip,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { SchoolLogo } from "../ui/SchoolLogo";
import { portalService } from "../../services/portalService";
import type {
  ParentDashboardData,
  PortalView,
  AbsenceReason,
  Assignment,
  Pupil,
} from "../../types/portal";

interface ParentPortalPageProps {
  onBackToSchool: () => void;
}

const portalNavigation: { id: PortalView; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Overview", icon: Home },
  { id: "homework", label: "Homework", icon: BookOpen },
  { id: "reports", label: "Reports & attendance", icon: FileText },
  { id: "fees", label: "Fees & receipts", icon: CreditCard },
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

  const handleProofSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!dashboardData) return;
    const form = new FormData(e.currentTarget);
    const invoiceId = form.get("invoiceId") as string;
    const selectedInv =
      dashboardData.invoices.find((i) => i.id === invoiceId) || dashboardData.invoices[0];
    const amount = Number(form.get("amount")) || 0;
    const bankName = form.get("bankName") as string;
    const paymentDate = form.get("paymentDate") as string;
    const referenceNumber = form.get("referenceNumber") as string;
    const notes = form.get("notes") as string;

    await portalService.submitPaymentProof({
      invoiceId: selectedInv?.id || invoiceId,
      pupilId:
        selectedInv?.pupilId ||
        dashboardData.selectedPupil?.id ||
        dashboardData.pupils[0].id,
      parentId: dashboardData.parent.id,
      amount,
      bankName,
      paymentDate,
      referenceNumber,
      notes,
    });

    await loadPortalData(activePupilId);
    setIsProofModalOpen(false);
    setActionSuccess("Payment proof uploaded for bursary verification.");
    setTimeout(() => setActionSuccess(null), 5000);
  };

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
                  onOpenAbsenceModal={() => setIsAbsenceModalOpen(true)}
                  onSelectChild={handleSwitchPupil}
                />
              ) : null}

              {activeView === "fees" && dashboardData ? (
                <Fees
                  data={dashboardData}
                  onOpenProofModal={() => setIsProofModalOpen(true)}
                  onSelectChild={handleSwitchPupil}
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

      {/* Payment Proof Modal */}
      <AnimatePresence>
        {isProofModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#160B35]/50 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-[#EEE9F1] pb-4">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wider text-[#581C87]">Bursary & Accounts</p>
                  <h3 className="text-lg font-extrabold text-[#29166F]">Submit Bank Payment Proof</h3>
                </div>
                <button
                  onClick={() => setIsProofModalOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5DFE9] text-[#625B69] hover:bg-[#F8F6FA] cursor-pointer"
                  aria-label="Close modal"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleProofSubmit} className="mt-5 space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-bold text-[#342D3A]">Select Invoice</label>
                  <select
                    name="invoiceId"
                    required
                    className="h-11 w-full rounded-lg border border-[#DCD5E1] px-3 text-sm outline-none focus:border-[#581C87]"
                  >
                    {dashboardData?.invoices.map((inv) => {
                      const child = dashboardData.pupils.find((p) => p.id === inv.pupilId);
                      return (
                        <option key={inv.id} value={inv.id}>
                          {child ? `${child.firstName}: ` : ""}{inv.invoiceNumber} — {inv.title} (₦{inv.amountDue.toLocaleString()})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-[#342D3A]">Amount Paid (₦)</label>
                    <input
                      type="number"
                      name="amount"
                      required
                      placeholder="e.g. 485000"
                      defaultValue={dashboardData?.invoices[0]?.amountDue || 485000}
                      className="h-11 w-full rounded-lg border border-[#DCD5E1] px-3 text-sm outline-none focus:border-[#581C87]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-[#342D3A]">Payment Date</label>
                    <input
                      type="date"
                      name="paymentDate"
                      required
                      defaultValue={new Date().toISOString().split("T")[0]}
                      className="h-11 w-full rounded-lg border border-[#DCD5E1] px-3 text-sm outline-none focus:border-[#581C87]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-[#342D3A]">Bank Name</label>
                    <input
                      type="text"
                      name="bankName"
                      required
                      placeholder="e.g. GTBank / Access"
                      defaultValue="Guaranty Trust Bank"
                      className="h-11 w-full rounded-lg border border-[#DCD5E1] px-3 text-sm outline-none focus:border-[#581C87]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-[#342D3A]">Bank Reference / Session</label>
                    <input
                      type="text"
                      name="referenceNumber"
                      required
                      placeholder="e.g. FT-GTB-8921441"
                      className="h-11 w-full rounded-lg border border-[#DCD5E1] px-3 text-sm outline-none focus:border-[#581C87]"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-[#342D3A]">Notes / Depositor Name</label>
                  <input
                    type="text"
                    name="notes"
                    placeholder="e.g. Paid by Chidinma Chukwuma via mobile transfer"
                    className="h-11 w-full rounded-lg border border-[#DCD5E1] px-3 text-sm outline-none focus:border-[#581C87]"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsProofModalOpen(false)}
                    className="h-11 rounded-lg border border-[#DCD5E1] px-4 text-xs font-bold text-[#625B69] hover:bg-[#F8F6FA] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="h-11 rounded-lg bg-[#581C87] px-5 text-xs font-extrabold text-white hover:bg-[#29166F] cursor-pointer"
                  >
                    Submit Proof
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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
 * 5. Fees & Receipts View
 */
const Fees: React.FC<{
  data: ParentDashboardData;
  onOpenProofModal: () => void;
  onSelectChild: (pupilId: string) => void;
}> = ({ data, onOpenProofModal, onSelectChild }) => {
  const isFamily = data.isFamilyView;
  const totalBalance = data.invoices.reduce((acc, inv) => acc + inv.balance, 0);

  return (
    <div className="space-y-6">
      <section className="grid overflow-hidden rounded-xl bg-[#29166F] text-white sm:grid-cols-[1fr_auto]">
        <div className="p-6 sm:p-8">
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#E9DB3D]">
            {isFamily
              ? "Total family balance across all children"
              : `First term balance · ${data.selectedPupil?.firstName}`}
          </p>
          <p className="mt-3 text-4xl font-extrabold">
            ₦{totalBalance.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
          </p>
          <p className="mt-2 text-sm text-white/65">
            {totalBalance === 0
              ? "All current invoices for your family have been settled."
              : "Outstanding balance on pending invoice."}
          </p>
        </div>
        <div className="flex items-center border-t border-white/12 bg-[#351A7D] px-8 py-6 sm:border-l sm:border-t-0">
          <span className="inline-flex items-center gap-2 text-sm font-extrabold">
            <CheckCircle2 className="h-5 w-5 text-[#E9DB3D]" />
            {totalBalance === 0 ? "Payment complete" : "Payment pending"}
          </span>
        </div>
      </section>

      {/* Invoices List */}
      <section className="rounded-xl border border-[#E5DFE9] bg-white">
        <div className="flex flex-col justify-between gap-4 border-b border-[#EEE9F1] p-5 sm:flex-row sm:items-center sm:p-6">
          <div>
            <h2 className="text-xl font-extrabold text-[#29166F]">
              {isFamily ? "All Enrolled Pupils Fee Invoices" : `Term Invoices: ${data.selectedPupil?.firstName}`}
            </h2>
            <p className="text-xs text-[#817887] mt-1">First term 2026/2027 academic session</p>
          </div>
          <button
            onClick={onOpenProofModal}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#DCD5E1] bg-[#F8F6FA] px-4 text-xs font-extrabold text-[#581C87] hover:bg-[#F1ECF6] transition cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Upload payment receipt
          </button>
        </div>

        <div className="divide-y divide-[#EEE9F1]">
          {data.invoices.map((inv) => {
            const child = data.pupils.find((p) => p.id === inv.pupilId);
            return (
              <div key={inv.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-[#29166F] text-sm">{inv.title}</span>
                    {child && (
                      <span className="text-[10px] bg-[#F1ECF6] text-[#581C87] font-bold px-2 py-0.5 rounded-md">
                        {child.firstName} ({child.class})
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#817887] mt-1">
                    Invoice: {inv.invoiceNumber} &bull; Due date: {inv.dueDate}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-base font-extrabold text-[#29166F]">
                      ₦{inv.amountDue.toLocaleString()}
                    </p>
                    <span className="text-xs font-bold text-[#087A50]">{inv.status}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Receipts List */}
      <section className="rounded-xl border border-[#E5DFE9] bg-white">
        <div className="border-b border-[#EEE9F1] p-5 sm:p-6">
          <h2 className="text-xl font-extrabold text-[#29166F]">Receipts & Payment History</h2>
        </div>
        <div className="divide-y divide-[#EEE9F1]">
          {data.payments.map((pmt) => {
            const child = data.pupils.find((p) => p.id === pmt.pupilId);
            return (
              <div
                key={pmt.id}
                className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center sm:px-6"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-extrabold text-[#342D3A]">{pmt.itemDescription}</p>
                    {child && (
                      <span className="text-[10px] bg-[#E8E2ED] text-[#29166F] font-bold px-1.5 py-0.5 rounded">
                        {child.firstName}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-[#817887]">
                    {pmt.receiptNumber} · {pmt.paymentDate} · ₦{pmt.amount.toLocaleString()} ({pmt.paymentMethod})
                  </p>
                </div>
                <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#DCD5E1] px-4 text-xs font-extrabold text-[#581C87] hover:bg-[#F8F6FA] transition cursor-pointer">
                  <Download className="h-4 w-4" /> Receipt
                </button>
              </div>
            );
          })}
        </div>

        {data.paymentProofs.length > 0 && (
          <div className="border-t border-[#EEE9F1] p-5 bg-[#FBF9FD]">
            <p className="text-xs font-extrabold uppercase tracking-wider text-[#581C87] mb-3">
              Submitted Payment Proofs
            </p>
            <div className="space-y-2">
              {data.paymentProofs.map((proof) => {
                const child = data.pupils.find((p) => p.id === proof.pupilId);
                return (
                  <div
                    key={proof.id}
                    className="flex items-center justify-between rounded-lg border border-[#E8E2ED] bg-white p-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#29166F]">{proof.bankName}</span>
                        {child && <span className="text-[10px] text-[#581C87] font-semibold">({child.firstName})</span>}
                      </div>
                      <p className="text-[11px] text-[#817887] mt-0.5">
                        Ref: {proof.referenceNumber} &bull; ₦{proof.amount.toLocaleString()} on {proof.paymentDate}
                      </p>
                    </div>
                    <span className="rounded-full bg-[#E5F7ED] px-3 py-1 font-extrabold text-[#087A50]">
                      {proof.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
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
