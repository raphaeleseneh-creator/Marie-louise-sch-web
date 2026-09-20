import React, { useState, useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock,
  CreditCard,
  Download,
  Eye,
  EyeOff,
  FileText,
  GraduationCap,
  HelpCircle,
  Home,
  LockKeyhole,
  LogOut,
  Menu,
  Plus,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { SchoolLogo } from "../ui/SchoolLogo";
import { portalService } from "../../services/portalService";
import type {
  ParentDashboardData,
  PortalView,
  AbsenceReason,
} from "../../types/portal";

interface ParentPortalPageProps {
  onBackToSchool: () => void;
}

const portalNavigation: { id: PortalView; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Overview", icon: Home },
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
  const [selectedPupilId, setSelectedPupilId] = useState<string | undefined>(undefined);
  const [isAbsenceModalOpen, setIsAbsenceModalOpen] = useState(false);
  const [isProofModalOpen, setIsProofModalOpen] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();

  // Load portal data via the service layer
  const loadPortalData = async (pupilId?: string) => {
    try {
      const data = await portalService.getDashboardData(dashboardData?.parent.id, pupilId);
      setDashboardData(data);
      if (pupilId) {
        setSelectedPupilId(pupilId);
      } else if (!selectedPupilId && data.selectedPupil) {
        setSelectedPupilId(data.selectedPupil.id);
      }
    } catch (err) {
      console.error("Failed to load portal data:", err);
    }
  };

  useEffect(() => {
    if (isSignedIn) {
      loadPortalData(selectedPupilId);
    }
  }, [isSignedIn, selectedPupilId]);

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
    await loadPortalData();
    setIsSignedIn(true);
  };

  const handleDemoSignIn = async () => {
    setFormError("");
    await loadPortalData();
    setIsSignedIn(true);
  };

  const handleSwitchPupil = (pupilId: string) => {
    setSelectedPupilId(pupilId);
    loadPortalData(pupilId);
    setIsPupilMenuOpen(false);
  };

  const handleAbsenceSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!dashboardData) return;
    const form = new FormData(e.currentTarget);
    const startDate = form.get("startDate") as string;
    const endDate = form.get("endDate") as string;
    const reason = form.get("reason") as AbsenceReason;
    const notes = form.get("notes") as string;

    await portalService.submitAbsenceReport({
      pupilId: dashboardData.selectedPupil.id,
      parentId: dashboardData.parent.id,
      startDate,
      endDate,
      reason,
      notes,
    });

    await loadPortalData(dashboardData.selectedPupil.id);
    setIsAbsenceModalOpen(false);
    setActionSuccess("Absence notice submitted to the school administration.");
    setTimeout(() => setActionSuccess(null), 5000);
  };

  const handleProofSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!dashboardData) return;
    const form = new FormData(e.currentTarget);
    const invoiceId = form.get("invoiceId") as string;
    const amount = Number(form.get("amount")) || 0;
    const bankName = form.get("bankName") as string;
    const paymentDate = form.get("paymentDate") as string;
    const referenceNumber = form.get("referenceNumber") as string;
    const notes = form.get("notes") as string;

    await portalService.submitPaymentProof({
      invoiceId,
      pupilId: dashboardData.selectedPupil.id,
      parentId: dashboardData.parent.id,
      amount,
      bankName,
      paymentDate,
      referenceNumber,
      notes,
    });

    await loadPortalData(dashboardData.selectedPupil.id);
    setIsProofModalOpen(false);
    setActionSuccess("Payment proof uploaded for verification.");
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
              Parent partnership
            </div>
            <h1 className="max-w-xl text-5xl font-extrabold leading-[1.02] text-white xl:text-6xl">
              Every milestone, closer to home.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-white/76">
              Follow your child&apos;s learning, attendance, school notices and fee records from one calm, private space.
            </p>

            <div className="mt-12 grid max-w-xl grid-cols-3 border-y border-white/18 py-6">
              <div>
                <p className="text-2xl font-extrabold text-white">98.2%</p>
                <p className="mt-1 text-xs text-white/60">Demo attendance</p>
              </div>
              <div className="border-x border-white/18 px-7">
                <p className="text-2xl font-extrabold text-white">4</p>
                <p className="mt-1 text-xs text-white/60">Core services</p>
              </div>
              <div className="pl-7">
                <p className="text-2xl font-extrabold text-white">1 place</p>
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
              View demo dashboard
            </button>
            <p className="mt-3 text-center text-[11px] leading-5 text-[#817887]">
              Demonstration data only. Live family records require a secure school account.
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
  const parent = dashboardData?.parent;
  const pupils = dashboardData?.pupils || [];
  const CurrentIcon = portalNavigation.find((item) => item.id === activeView)?.icon ?? Home;

  return (
    <main className="min-h-[100dvh] bg-[#F5F3F7] text-[#27232D]">
      {/* Action Notification Toast */}
      <AnimatePresence>
        {actionSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-4 sm:right-8 z-50 flex items-center gap-3 rounded-xl bg-[#087A50] px-5 py-3 text-sm font-bold text-white shadow-xl"
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
              aria-label="Open portal menu"
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
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {(dashboardData?.notices.length ?? 0) > 0 && (
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-[#E0CA1D]" />
              )}
            </button>

            {/* Pupil Profile Switcher */}
            <div className="relative">
              <button
                onClick={() => setIsPupilMenuOpen((open) => !open)}
                className="flex items-center gap-2 rounded-lg border border-[#E5DFE9] bg-white px-2 py-1.5 text-left transition hover:bg-[#F8F6FA] cursor-pointer"
                aria-label="Switch child profile"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#581C87] text-xs font-extrabold text-white">
                  {selectedPupil?.avatarInitials || "KC"}
                </span>
                <span className="hidden pr-1 sm:block">
                  <span className="block text-xs font-extrabold text-[#29166F]">
                    {selectedPupil?.firstName || "Kamsiyochukwu"}
                  </span>
                  <span className="block text-[10px] text-[#817887]">
                    {selectedPupil?.class || "Primary 3"}
                  </span>
                </span>
                <ChevronDown
                  className={`hidden h-3.5 w-3.5 text-[#817887] transition-transform sm:block ${
                    isPupilMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {isPupilMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-[#E5DFE9] bg-white p-2 shadow-xl z-50">
                  <p className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[#9A929F]">
                    Switch enrolled pupil
                  </p>
                  {pupils.map((pupil) => (
                    <button
                      key={pupil.id}
                      onClick={() => handleSwitchPupil(pupil.id)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-xs transition cursor-pointer ${
                        pupil.id === selectedPupil?.id
                          ? "bg-[#F0EBF5] font-bold text-[#581C87]"
                          : "text-[#4C4652] hover:bg-[#F7F4FA]"
                      }`}
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#581C87] text-[11px] font-extrabold text-white">
                        {pupil.avatarInitials}
                      </span>
                      <div>
                        <span className="block font-bold text-[#29166F]">{pupil.fullName}</span>
                        <span className="block text-[10px] text-[#817887]">{pupil.class} · {pupil.admissionNumber}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="sticky top-[72px] hidden h-[calc(100dvh-72px)] border-r border-[#E5DFE9] bg-white px-4 py-6 lg:flex lg:flex-col">
          <PortalMenu activeView={activeView} onSelect={setActiveView} />
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
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.15em] text-[#581C87]">
                <CurrentIcon className="h-4 w-4" /> {portalNavigation.find((item) => item.id === activeView)?.label}
              </p>
              <h1 className="mt-2 text-3xl font-extrabold text-[#29166F] sm:text-4xl">
                {activeView === "overview"
                  ? `Good afternoon, ${parent?.firstName || "Chidinma"}.`
                  : portalNavigation.find((item) => item.id === activeView)?.label}
              </h1>
              <p className="mt-2 text-sm text-[#625B69]">
                {selectedPupil?.academicTerm || "First term · 2026/2027 academic session"}
              </p>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[#E5F7ED] px-3 py-1.5 text-xs font-extrabold text-[#087A50]">
              <CheckCircle2 className="h-3.5 w-3.5" /> All records up to date
            </span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeView + (selectedPupil?.id || "")}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -5 }}
              transition={{ duration: 0.22 }}
            >
              {activeView === "overview" && dashboardData ? (
                <Overview data={dashboardData} onNavigate={setActiveView} />
              ) : null}
              {activeView === "reports" && dashboardData ? (
                <Reports
                  data={dashboardData}
                  onOpenAbsenceModal={() => setIsAbsenceModalOpen(true)}
                />
              ) : null}
              {activeView === "fees" && dashboardData ? (
                <Fees
                  data={dashboardData}
                  onOpenProofModal={() => setIsProofModalOpen(true)}
                />
              ) : null}
              {activeView === "notices" && dashboardData ? (
                <Notices data={dashboardData} />
              ) : null}
            </motion.div>
          </AnimatePresence>
        </section>
      </div>

      {/* Mobile Drawer Menu */}
      <AnimatePresence>
        {isMenuOpen ? (
          <motion.div
            className="fixed inset-0 z-50 bg-[#160B35]/45 backdrop-blur-sm lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMenuOpen(false)}
          >
            <motion.aside
              className="absolute inset-y-0 left-0 flex w-[min(86vw,340px)] flex-col bg-white p-5"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-8 flex items-center justify-between">
                <SchoolLogo onClick={onBackToSchool} />
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#E5DFE9] text-[#29166F] cursor-pointer"
                  aria-label="Close portal menu"
                >
                  <X className="h-5 w-5" />
                </button>
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
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleAbsenceSubmit} className="mt-5 space-y-4">
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
                    <option value="Illness">Illness / Unwell</option>
                    <option value="Medical Appointment">Medical / Dental Appointment</option>
                    <option value="Family Event">Family Event</option>
                    <option value="Travel">Travel / Relocation</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-[#342D3A]">Notes for School Admin</label>
                  <textarea
                    name="notes"
                    required
                    rows={3}
                    placeholder="Provide brief details for the class teacher and attendance officer..."
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
                    {dashboardData?.invoices.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNumber} — {inv.title} (₦{inv.amountDue.toLocaleString()})
                      </option>
                    ))}
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

const Overview: React.FC<{ data: ParentDashboardData; onNavigate: (view: PortalView) => void }> = ({
  data,
  onNavigate,
}) => {
  const pupil = data.selectedPupil;
  const totalBalance = data.invoices.reduce((acc, inv) => acc + inv.balance, 0);

  return (
    <div className="space-y-7">
      <section className="grid overflow-hidden rounded-xl bg-[#29166F] text-white lg:grid-cols-[1.35fr_0.65fr]">
        <div className="p-6 sm:p-8">
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#E9DB3D]">Student profile</p>
          <div className="mt-5 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white/12 text-xl font-extrabold">
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

      <section className="grid divide-y divide-[#E5DFE9] overflow-hidden rounded-xl border border-[#E5DFE9] bg-white sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <Metric
          label="Current average"
          value={`${pupil.currentAverage}%`}
          note="Excellent progress"
          icon={GraduationCap}
        />
        <Metric
          label="Fees status"
          value={totalBalance === 0 ? "Settled" : `₦${totalBalance.toLocaleString()}`}
          note={totalBalance === 0 ? "No outstanding balance" : "Invoice due"}
          icon={CreditCard}
        />
        <Metric
          label="New notices"
          value={String(data.notices.length).padStart(2, "0")}
          note="School communications"
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

const Reports: React.FC<{ data: ParentDashboardData; onOpenAbsenceModal: () => void }> = ({
  data,
  onOpenAbsenceModal,
}) => {
  const pupil = data.selectedPupil;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-[#E5DFE9] bg-white">
        <div className="flex flex-col justify-between gap-4 border-b border-[#EEE9F1] p-5 sm:flex-row sm:items-center sm:p-6">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#581C87]">First term snapshot</p>
            <h2 className="mt-1 text-xl font-extrabold text-[#29166F]">Continuous assessment</h2>
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
          “{pupil.teacherRemarks}”
        </blockquote>
        <p className="mt-4 text-xs text-[#817887]">
          {pupil.classTeacher} · {pupil.teacherRole || `${pupil.class} Lead Teacher`}
        </p>
      </section>

      {/* Attendance & Absence Management */}
      <section className="rounded-xl border border-[#E5DFE9] bg-white p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#581C87]">Attendance Register</p>
            <h3 className="mt-1 text-lg font-extrabold text-[#29166F]">Recent Morning Attendance</h3>
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
    </div>
  );
};

const Fees: React.FC<{ data: ParentDashboardData; onOpenProofModal: () => void }> = ({
  data,
  onOpenProofModal,
}) => {
  const totalBalance = data.invoices.reduce((acc, inv) => acc + inv.balance, 0);

  return (
    <div className="space-y-6">
      <section className="grid overflow-hidden rounded-xl bg-[#29166F] text-white sm:grid-cols-[1fr_auto]">
        <div className="p-6 sm:p-8">
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#E9DB3D]">First term balance</p>
          <p className="mt-3 text-4xl font-extrabold">₦{totalBalance.toLocaleString("en-NG", { minimumFractionDigits: 2 })}</p>
          <p className="mt-2 text-sm text-white/65">
            {totalBalance === 0 ? "All current invoices have been settled." : "Outstanding balance on current term invoice."}
          </p>
        </div>
        <div className="flex items-center border-t border-white/12 bg-[#351A7D] px-8 py-6 sm:border-l sm:border-t-0">
          <span className="inline-flex items-center gap-2 text-sm font-extrabold">
            <CheckCircle2 className="h-5 w-5 text-[#E9DB3D]" />
            {totalBalance === 0 ? "Payment complete" : "Due for payment"}
          </span>
        </div>
      </section>

      <section className="rounded-xl border border-[#E5DFE9] bg-white">
        <div className="flex flex-col justify-between gap-4 border-b border-[#EEE9F1] p-5 sm:flex-row sm:items-center sm:p-6">
          <h2 className="text-xl font-extrabold text-[#29166F]">Receipts & Payment History</h2>
          <button
            onClick={onOpenProofModal}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#DCD5E1] bg-[#F8F6FA] px-4 text-xs font-extrabold text-[#581C87] hover:bg-[#F1ECF6] transition cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Upload payment receipt
          </button>
        </div>
        <div className="divide-y divide-[#EEE9F1]">
          {data.payments.map((pmt) => (
            <div
              key={pmt.id}
              className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center sm:px-6"
            >
              <div>
                <p className="text-sm font-extrabold text-[#342D3A]">{pmt.itemDescription}</p>
                <p className="mt-1 text-xs text-[#817887]">
                  {pmt.receiptNumber} · {pmt.paymentDate} · ₦{pmt.amount.toLocaleString()} ({pmt.paymentMethod})
                </p>
              </div>
              <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#DCD5E1] px-4 text-xs font-extrabold text-[#581C87] hover:bg-[#F8F6FA] transition cursor-pointer">
                <Download className="h-4 w-4" /> Receipt
              </button>
            </div>
          ))}
        </div>

        {data.paymentProofs.length > 0 && (
          <div className="border-t border-[#EEE9F1] p-5 bg-[#FBF9FD]">
            <p className="text-xs font-extrabold uppercase tracking-wider text-[#581C87] mb-3">
              Submitted Payment Proofs
            </p>
            <div className="space-y-2">
              {data.paymentProofs.map((proof) => (
                <div
                  key={proof.id}
                  className="flex items-center justify-between rounded-lg border border-[#E8E2ED] bg-white p-3 text-xs"
                >
                  <div>
                    <span className="font-bold text-[#29166F]">{proof.bankName}</span> · Ref: {proof.referenceNumber}
                    <p className="text-[11px] text-[#817887]">
                      ₦{proof.amount.toLocaleString()} on {proof.paymentDate}
                    </p>
                  </div>
                  <span className="rounded-full bg-[#E5F7ED] px-3 py-1 font-extrabold text-[#087A50]">
                    {proof.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

const Notices: React.FC<{ data: ParentDashboardData }> = ({ data }) => (
  <div className="overflow-hidden rounded-xl border border-[#E5DFE9] bg-white">
    {data.notices.map((notice, index) => (
      <article
        key={notice.id}
        className="grid gap-4 border-b border-[#EEE9F1] p-5 last:border-0 sm:grid-cols-[110px_1fr_auto] sm:items-start sm:p-6"
      >
        <p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-[#581C87]">
          {notice.category}
        </p>
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
