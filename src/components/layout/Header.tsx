import React, { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, Menu, ShieldCheck, X } from "lucide-react";
import { SchoolLogo } from "../ui/SchoolLogo";
import type { NavTab } from "../../types";

interface HeaderProps {
  activeTab: NavTab;
  onNavigate: (tab: NavTab) => void;
  onOpenAdmissions: () => void;
  onOpenParentPortal: () => void;
}

const navLinks: { label: string; tab: NavTab }[] = [
  { label: "Home", tab: "home" },
  { label: "About", tab: "about" },
  { label: "Academics", tab: "academics" },
  { label: "Admissions", tab: "admissions" },
  { label: "News & Events", tab: "news-events" },
  { label: "Contact", tab: "contact" },
];

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onNavigate,
  onOpenAdmissions,
  onOpenParentPortal,
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 24);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileMenuOpen]);

  const handleNavClick = (tab: NavTab) => {
    setIsMobileMenuOpen(false);
    onNavigate(tab);
  };

  return (
    <>
      <header
        className={`fixed top-0 z-40 bg-white/95 transition-[padding,box-shadow,background-color] duration-300 ${
          isScrolled
            ? "py-2 shadow-[0_10px_35px_rgba(41,22,111,0.08)] backdrop-blur-xl"
            : "py-3.5"
        }`}
        style={{ left: 0, right: 0 }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-4 sm:px-6 lg:px-8">
          <SchoolLogo variant="light" onClick={() => handleNavClick("home")} />

          <nav
            className="hidden items-center gap-0.5 rounded-xl border border-[#E8E2ED] bg-[#F7F4FA]/70 p-1 lg:flex"
            aria-label="Primary navigation"
          >
            {navLinks.map((link) => {
              const isActive = activeTab === link.tab;
              return (
                <button
                  key={link.tab}
                  onClick={() => handleNavClick(link.tab)}
                  className={`group relative min-h-9 px-3.5 text-[13px] font-semibold transition-colors xl:px-4 ${
                    isActive
                      ? "text-[#29166F]"
                      : "text-[#4C4652] hover:text-[#581C87]"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span className="relative z-10">{link.label}</span>
                  {isActive ? (
                    <motion.span
                      layoutId="active-navigation"
                      className="absolute inset-0 rounded-lg border border-[#DED4E8] bg-white shadow-[0_2px_8px_rgba(41,22,111,0.08)]"
                      transition={
                        reduceMotion
                          ? { duration: 0 }
                          : { type: "spring", stiffness: 430, damping: 34 }
                      }
                    />
                  ) : null}
                  <span className="absolute bottom-1 left-1/2 h-0.5 w-0 -translate-x-1/2 rounded-full bg-[#E9DB3D] transition-all duration-200 hover:w-5 group-hover:w-5" />
                </button>
              );
            })}
          </nav>

          <div className="hidden items-center gap-2.5 md:flex">
            <button
              onClick={onOpenParentPortal}
              className="group inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#DED4E8] bg-white px-3.5 text-[13px] font-bold text-[#29166F] transition-all hover:border-[#BFAFD1] hover:bg-[#F7F4FA] active:scale-[0.98]"
              title="Parent Portal access"
            >
              <ShieldCheck className="h-4 w-4 text-[#581C87] transition-transform group-hover:scale-110" />
              <span>Parent Portal</span>
            </button>

            <button
              onClick={onOpenAdmissions}
              className="group inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#E9DB3D] px-4 text-[13px] font-extrabold text-[#29166F] shadow-[0_6px_18px_rgba(88,28,135,0.12)] transition-all hover:-translate-y-0.5 hover:bg-[#F3E44C] hover:shadow-[0_10px_24px_rgba(88,28,135,0.18)] active:translate-y-0 active:scale-[0.98]"
            >
              <span>Apply Now</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={onOpenParentPortal}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[#DED4E8] bg-[#F7F4FA] px-3 text-[11px] font-bold text-[#29166F]"
              aria-label="Open Parent Portal"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-[#581C87]" />
              <span>Portal</span>
            </button>
            <button
              onClick={() => setIsMobileMenuOpen((open) => !open)}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-[#29166F] transition-colors hover:bg-[#F7F4FA]"
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,transparent_3%,#581C87_38%,#E9DB3D_64%,transparent_97%)] opacity-45" />
      </header>

      <AnimatePresence>
        {isMobileMenuOpen ? (
          <motion.div
            className="fixed inset-0 z-30 bg-[#160b35]/45 backdrop-blur-sm md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <motion.aside
              className="absolute bottom-0 right-0 flex flex-col bg-white px-5 pb-6 pt-7 shadow-[-18px_0_60px_rgba(28,12,66,0.18)]"
              style={{ top: 72, width: "min(88vw, 390px)" }}
              initial={reduceMotion ? false : { x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
              onClick={(event) => event.stopPropagation()}
              aria-label="Mobile navigation"
            >
              <div className="mb-4 flex items-center justify-between border-b border-[#E8E2ED] pb-4">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#625B69]">
                  Explore the school
                </p>
                <span className="h-2 w-2 rounded-full bg-[#E9DB3D]" />
              </div>

              <nav className="flex flex-col" aria-label="Mobile primary navigation">
                {navLinks.map((link, index) => {
                  const isActive = activeTab === link.tab;
                  return (
                    <button
                      key={link.tab}
                      onClick={() => handleNavClick(link.tab)}
                      className={`group flex min-h-14 items-center justify-between border-b border-[#E8E2ED] text-left transition-colors ${
                        isActive ? "text-[#581C87]" : "text-[#27232D] hover:text-[#581C87]"
                      }`}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <span className="flex items-center gap-4">
                        <span className="w-5 text-[10px] font-bold text-[#9A929F]">0{index + 1}</span>
                        <span className="text-lg font-bold">{link.label}</span>
                      </span>
                      <ArrowRight
                        className={`h-4 w-4 transition-transform group-hover:translate-x-1 ${
                          isActive ? "text-[#E0CA1D]" : "text-[#B9B1BD]"
                        }`}
                      />
                    </button>
                  );
                })}
              </nav>

              <div className="mt-auto space-y-3 pt-6">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenAdmissions();
                  }}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#E9DB3D] px-5 text-sm font-extrabold text-[#29166F] active:scale-[0.98]"
                >
                  Start an Application
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenParentPortal();
                  }}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-[#DED4E8] px-5 text-sm font-bold text-[#29166F] active:scale-[0.98]"
                >
                  <ShieldCheck className="h-4 w-4 text-[#581C87]" />
                  Parent Portal
                </button>
                <p className="pt-2 text-center text-[11px] font-semibold text-[#77707C]">
                  Surulere, Lagos &middot; Be Truthful
                </p>
              </div>
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
};
