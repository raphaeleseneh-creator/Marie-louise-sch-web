import React, { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
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
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { SchoolLogo } from "../ui/SchoolLogo";

type PortalView = "overview" | "reports" | "fees" | "notices";

interface ParentPortalPageProps {
  onBackToSchool: () => void;
}

const portalNavigation: { id: PortalView; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Overview", icon: Home },
  { id: "reports", label: "Reports & attendance", icon: FileText },
  { id: "fees", label: "Fees & receipts", icon: CreditCard },
  { id: "notices", label: "Notices", icon: Bell },
];

const notices = [
  {
    category: "School office",
    title: "Science exhibition preparation",
    date: "18 Sep",
    copy: "Primary pupils should bring their labelled project folders to school by Thursday morning.",
  },
  {
    category: "Class update",
    title: "Reading circle this Friday",
    date: "16 Sep",
    copy: "Pupils may bring one favourite storybook for the class reading exchange.",
  },
  {
    category: "Calendar",
    title: "Mid-term break reminder",
    date: "12 Sep",
    copy: "School closes after lessons on Friday and resumes the following Wednesday.",
  },
];

export const ParentPortalPage: React.FC<ParentPortalPageProps> = ({ onBackToSchool }) => {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [activeView, setActiveView] = useState<PortalView>("overview");
  const [showPassword, setShowPassword] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const reduceMotion = useReducedMotion();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (!data.get("identity") || !data.get("password")) {
      setFormError("Enter your parent email or admission number and password.");
      return;
    }
    setFormError("");
    setIsSignedIn(true);
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
              className="inline-flex items-center gap-2 text-sm font-bold text-white/80 transition-colors hover:text-white"
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
                    className="h-13 w-full rounded-lg border border-[#DCD5E1] bg-white pl-11 pr-4 text-sm outline-none transition focus:border-[#581C87] focus:ring-3 focus:ring-[#581C87]/10"
                    placeholder="parent@email.com or MLS-0012"
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label htmlFor="portal-password" className="text-sm font-bold text-[#342D3A]">Password</label>
                  <button type="button" className="text-xs font-bold text-[#581C87] hover:underline">Forgot password?</button>
                </div>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#817887]" />
                  <input
                    id="portal-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    className="h-13 w-full rounded-lg border border-[#DCD5E1] bg-white pl-11 pr-12 text-sm outline-none transition focus:border-[#581C87] focus:ring-3 focus:ring-[#581C87]/10"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-[#625B69]"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <label className="flex items-center gap-3 text-sm text-[#625B69]">
                <input type="checkbox" className="h-4 w-4 accent-[#581C87]" />
                Keep me signed in on this device
              </label>

              {formError ? <p className="text-sm font-semibold text-red-700" role="alert">{formError}</p> : null}

              <button
                type="submit"
                className="group flex h-13 w-full items-center justify-center gap-2 rounded-lg bg-[#581C87] px-5 text-sm font-extrabold text-white shadow-[0_10px_24px_rgba(88,28,135,0.18)] transition hover:bg-[#29166F] active:scale-[0.99]"
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
              onClick={() => setIsSignedIn(true)}
              className="flex h-13 w-full items-center justify-center gap-2 rounded-lg border border-[#DCD5E1] bg-[#F8F6FA] px-5 text-sm font-extrabold text-[#29166F] transition hover:border-[#BBAFC4] hover:bg-[#F1ECF6] active:scale-[0.99]"
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

  const CurrentIcon = portalNavigation.find((item) => item.id === activeView)?.icon ?? Home;

  return (
    <main className="min-h-[100dvh] bg-[#F5F3F7] text-[#27232D]">
      <header className="sticky top-0 z-30 border-b border-[#E5DFE9] bg-white/95 backdrop-blur-xl">
        <div className="flex h-[72px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsMenuOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#E5DFE9] text-[#29166F] lg:hidden"
              aria-label="Open portal menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <SchoolLogo onClick={onBackToSchool} />
            <span className="hidden h-7 w-px bg-[#E5DFE9] sm:block" />
            <span className="hidden text-xs font-extrabold uppercase tracking-[0.14em] text-[#581C87] sm:block">Parent portal</span>
          </div>

          <div className="flex items-center gap-3">
            <button className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-[#E5DFE9] text-[#4C4652] hover:bg-[#F7F4FA]" aria-label="Notifications">
              <Bell className="h-4 w-4" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-[#E0CA1D]" />
            </button>
            <button className="flex items-center gap-2 rounded-lg border border-[#E5DFE9] bg-white px-2 py-1.5 text-left">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#581C87] text-xs font-extrabold text-white">KC</span>
              <span className="hidden pr-1 sm:block">
                <span className="block text-xs font-extrabold text-[#29166F]">Kamsiyochukwu</span>
                <span className="block text-[10px] text-[#817887]">Primary 3</span>
              </span>
              <ChevronDown className="hidden h-3.5 w-3.5 text-[#817887] sm:block" />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="sticky top-[72px] hidden h-[calc(100dvh-72px)] border-r border-[#E5DFE9] bg-white px-4 py-6 lg:flex lg:flex-col">
          <PortalMenu activeView={activeView} onSelect={setActiveView} />
          <div className="mt-auto space-y-1 border-t border-[#EEE9F1] pt-4">
            <button onClick={onBackToSchool} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-bold text-[#625B69] hover:bg-[#F7F4FA] hover:text-[#29166F]">
              <ArrowLeft className="h-4 w-4" /> School website
            </button>
            <button onClick={() => setIsSignedIn(false)} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-bold text-[#625B69] hover:bg-[#F7F4FA] hover:text-[#29166F]">
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
                {activeView === "overview" ? "Good afternoon, Chidinma." : portalNavigation.find((item) => item.id === activeView)?.label}
              </h1>
              <p className="mt-2 text-sm text-[#625B69]">First term · 2026/2027 academic session</p>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[#E5F7ED] px-3 py-1.5 text-xs font-extrabold text-[#087A50]">
              <CheckCircle2 className="h-3.5 w-3.5" /> All records up to date
            </span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -5 }}
              transition={{ duration: 0.22 }}
            >
              {activeView === "overview" ? <Overview onNavigate={setActiveView} /> : null}
              {activeView === "reports" ? <Reports /> : null}
              {activeView === "fees" ? <Fees /> : null}
              {activeView === "notices" ? <Notices /> : null}
            </motion.div>
          </AnimatePresence>
        </section>
      </div>

      <AnimatePresence>
        {isMenuOpen ? (
          <motion.div className="fixed inset-0 z-50 bg-[#160B35]/45 backdrop-blur-sm lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMenuOpen(false)}>
            <motion.aside className="absolute inset-y-0 left-0 flex w-[min(86vw,340px)] flex-col bg-white p-5" initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} onClick={(event) => event.stopPropagation()}>
              <div className="mb-8 flex items-center justify-between">
                <SchoolLogo onClick={onBackToSchool} />
                <button onClick={() => setIsMenuOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#E5DFE9] text-[#29166F]" aria-label="Close portal menu"><X className="h-5 w-5" /></button>
              </div>
              <PortalMenu activeView={activeView} onSelect={(view) => { setActiveView(view); setIsMenuOpen(false); }} />
              <div className="mt-auto space-y-2 border-t border-[#EEE9F1] pt-4">
                <button onClick={onBackToSchool} className="flex min-h-11 w-full items-center gap-3 px-3 text-sm font-bold text-[#625B69]"><ArrowLeft className="h-4 w-4" /> School website</button>
                <button onClick={() => { setIsSignedIn(false); setIsMenuOpen(false); }} className="flex min-h-11 w-full items-center gap-3 px-3 text-sm font-bold text-[#625B69]"><LogOut className="h-4 w-4" /> Sign out</button>
              </div>
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
};

const PortalMenu: React.FC<{ activeView: PortalView; onSelect: (view: PortalView) => void }> = ({ activeView, onSelect }) => (
  <nav className="space-y-1" aria-label="Parent portal navigation">
    <p className="mb-3 px-3 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#9A929F]">Family workspace</p>
    {portalNavigation.map((item) => {
      const Icon = item.icon;
      const active = activeView === item.id;
      return (
        <button key={item.id} onClick={() => onSelect(item.id)} className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-bold transition ${active ? "bg-[#F0EBF5] text-[#581C87]" : "text-[#625B69] hover:bg-[#F7F4FA] hover:text-[#29166F]"}`} aria-current={active ? "page" : undefined}>
          <Icon className="h-[18px] w-[18px]" /> {item.label}
        </button>
      );
    })}
    <div className="mt-6 border-t border-[#EEE9F1] pt-5">
      <p className="mb-3 px-3 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#9A929F]">Support</p>
      <button className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-bold text-[#625B69] hover:bg-[#F7F4FA] hover:text-[#29166F]"><HelpCircle className="h-[18px] w-[18px]" /> Get help</button>
    </div>
  </nav>
);

const Overview: React.FC<{ onNavigate: (view: PortalView) => void }> = ({ onNavigate }) => (
  <div className="space-y-7">
    <section className="grid overflow-hidden rounded-xl bg-[#29166F] text-white lg:grid-cols-[1.35fr_0.65fr]">
      <div className="p-6 sm:p-8">
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#E9DB3D]">Student profile</p>
        <div className="mt-5 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white/12 text-xl font-extrabold">KC</div>
          <div>
            <h2 className="text-xl font-extrabold sm:text-2xl">Kamsiyochukwu Chukwuma</h2>
            <p className="mt-1 text-sm text-white/68">Primary 3 · MLS-P3-042</p>
          </div>
        </div>
        <div className="mt-7 flex flex-wrap gap-x-8 gap-y-3 border-t border-white/15 pt-5 text-xs text-white/70">
          <span><strong className="block text-white">Mrs A. Adeyemi</strong>Class teacher</span>
          <span><strong className="block text-white">Blue House</strong>School house</span>
          <span><strong className="block text-white">Good standing</strong>Current status</span>
        </div>
      </div>
      <div className="flex items-center justify-center border-t border-white/12 bg-[#351A7D] p-7 lg:border-l lg:border-t-0">
        <div className="text-center">
          <div className="relative mx-auto flex h-28 w-28 items-center justify-center rounded-full border-[9px] border-white/12">
            <div className="absolute inset-[-9px] rounded-full border-[9px] border-transparent border-r-[#E9DB3D] border-t-[#E9DB3D] rotate-45" />
            <span className="text-2xl font-extrabold">98.2%</span>
          </div>
          <p className="mt-4 text-xs font-bold text-white/68">Term attendance</p>
        </div>
      </div>
    </section>

    <section className="grid divide-y divide-[#E5DFE9] overflow-hidden rounded-xl border border-[#E5DFE9] bg-white sm:grid-cols-3 sm:divide-x sm:divide-y-0">
      <Metric label="Current average" value="90.3%" note="Excellent progress" icon={GraduationCap} />
      <Metric label="Fees status" value="Settled" note="No outstanding balance" icon={CreditCard} />
      <Metric label="New notices" value="03" note="One requires attention" icon={Bell} />
    </section>

    <div className="grid gap-7 xl:grid-cols-[1.15fr_0.85fr]">
      <section className="rounded-xl border border-[#E5DFE9] bg-white p-5 sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <div><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#581C87]">Learning snapshot</p><h3 className="mt-1 text-lg font-extrabold text-[#29166F]">Academic progress</h3></div>
          <button onClick={() => onNavigate("reports")} className="text-xs font-extrabold text-[#581C87] hover:underline">View report</button>
        </div>
        <div className="space-y-5">
          <Progress label="Mathematics" score={92} />
          <Progress label="Literacy & reading" score={88} />
          <Progress label="Science & discovery" score={86} />
          <Progress label="Civic values" score={95} />
        </div>
      </section>

      <section className="rounded-xl border border-[#E5DFE9] bg-white p-5 sm:p-6">
        <div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#581C87]">Coming up</p><h3 className="mt-1 text-lg font-extrabold text-[#29166F]">School calendar</h3></div><CalendarDays className="h-5 w-5 text-[#817887]" /></div>
        <div className="divide-y divide-[#EEE9F1]">
          {[['23','SEP','Science exhibition'],['27','SEP','Parent reading circle'],['02','OCT','Inter-house sports']].map(([day, month, title]) => <div key={title} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0"><div className="w-11 text-center"><span className="block text-lg font-extrabold text-[#29166F]">{day}</span><span className="block text-[9px] font-extrabold tracking-wider text-[#817887]">{month}</span></div><span className="h-8 w-px bg-[#E5DFE9]" /><p className="text-sm font-bold text-[#3E3744]">{title}</p></div>)}
        </div>
      </section>
    </div>
  </div>
);

const Metric: React.FC<{ label: string; value: string; note: string; icon: React.ElementType }> = ({ label, value, note, icon: Icon }) => <div className="p-5 sm:p-6"><div className="flex items-start justify-between"><p className="text-xs font-bold text-[#817887]">{label}</p><Icon className="h-4 w-4 text-[#581C87]" /></div><p className="mt-3 text-2xl font-extrabold text-[#29166F]">{value}</p><p className="mt-1 text-[11px] font-semibold text-[#087A50]">{note}</p></div>;

const Progress: React.FC<{ label: string; score: number }> = ({ label, score }) => <div><div className="mb-2 flex justify-between text-xs font-bold"><span className="text-[#4C4652]">{label}</span><span className="text-[#29166F]">{score}%</span></div><div className="h-2 overflow-hidden rounded-full bg-[#EEE9F1]"><div className="h-full rounded-full bg-[#581C87]" style={{ width: `${score}%` }} /></div></div>;

const Reports = () => <div className="space-y-6"><section className="rounded-xl border border-[#E5DFE9] bg-white"><div className="flex flex-col justify-between gap-4 border-b border-[#EEE9F1] p-5 sm:flex-row sm:items-center sm:p-6"><div><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#581C87]">First term snapshot</p><h2 className="mt-1 text-xl font-extrabold text-[#29166F]">Continuous assessment</h2></div><button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#581C87] px-4 text-xs font-extrabold text-white"><Download className="h-4 w-4" /> Download report</button></div><div className="divide-y divide-[#EEE9F1] px-5 sm:px-6">{[['Mathematics & problem solving','92%','Distinction'],['Literacy & reading comprehension','88%','Excellent'],['Science & agricultural discovery','86%','Excellent'],['Civic values & character studies','95%','Distinction']].map(([subject,score,grade]) => <div key={subject} className="grid gap-2 py-5 sm:grid-cols-[1fr_100px_120px] sm:items-center"><p className="text-sm font-bold text-[#3E3744]">{subject}</p><p className="text-2xl font-extrabold text-[#29166F]">{score}</p><p className="text-xs font-bold text-[#087A50]">{grade}</p></div>)}</div></section><section className="rounded-xl border border-[#E5DFE9] bg-white p-5 sm:p-6"><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#581C87]">Teacher&apos;s note</p><blockquote className="mt-4 max-w-3xl text-lg font-bold leading-8 text-[#342D3A]">“Kamsiyochukwu approaches new concepts with curiosity and contributes thoughtful ideas during group work.”</blockquote><p className="mt-4 text-xs text-[#817887]">Mrs A. Adeyemi · Primary 3 Lead Teacher</p></section></div>;

const Fees = () => <div className="space-y-6"><section className="grid overflow-hidden rounded-xl bg-[#29166F] text-white sm:grid-cols-[1fr_auto]"><div className="p-6 sm:p-8"><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#E9DB3D]">First term balance</p><p className="mt-3 text-4xl font-extrabold">₦0.00</p><p className="mt-2 text-sm text-white/65">All current invoices have been settled.</p></div><div className="flex items-center border-t border-white/12 bg-[#351A7D] px-8 py-6 sm:border-l sm:border-t-0"><span className="inline-flex items-center gap-2 text-sm font-extrabold"><CheckCircle2 className="h-5 w-5 text-[#E9DB3D]" /> Payment complete</span></div></section><section className="rounded-xl border border-[#E5DFE9] bg-white"><div className="border-b border-[#EEE9F1] p-5 sm:p-6"><h2 className="text-xl font-extrabold text-[#29166F]">Receipts</h2></div>{[['MLS-RCP-8921','Tuition & learning materials','08 Sep 2026'],['MLS-RCP-8764','Co-curricular clubs & library','02 Sep 2026']].map(([id,item,date]) => <div key={id} className="flex flex-col justify-between gap-4 border-b border-[#EEE9F1] p-5 last:border-0 sm:flex-row sm:items-center sm:px-6"><div><p className="text-sm font-extrabold text-[#342D3A]">{item}</p><p className="mt-1 text-xs text-[#817887]">{id} · {date}</p></div><button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#DCD5E1] px-4 text-xs font-extrabold text-[#581C87]"><Download className="h-4 w-4" /> Receipt</button></div>)}</section></div>;

const Notices = () => <div className="overflow-hidden rounded-xl border border-[#E5DFE9] bg-white">{notices.map((notice, index) => <article key={notice.title} className="grid gap-4 border-b border-[#EEE9F1] p-5 last:border-0 sm:grid-cols-[110px_1fr_auto] sm:items-start sm:p-6"><p className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-[#581C87]">{notice.category}</p><div><h2 className="text-base font-extrabold text-[#29166F]">{notice.title}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#625B69]">{notice.copy}</p></div><div className="flex items-center gap-3"><span className="text-xs font-bold text-[#817887]">{notice.date}</span>{index === 0 ? <span className="h-2 w-2 rounded-full bg-[#E0CA1D]" /> : null}</div></article>)}</div>;
