import React, { useState, useEffect } from "react";
import { SchoolLogo } from "../ui/SchoolLogo";
import { Menu, X, ArrowRight, ShieldCheck } from "lucide-react";
import type { NavTab } from "../../types";

interface HeaderProps {
  activeTab: NavTab;
  onNavigate: (tab: NavTab) => void;
  onOpenAdmissions: () => void;
  onOpenParentPortal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onNavigate,
  onOpenAdmissions,
  onOpenParentPortal,
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 24);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks: { label: string; tab: NavTab }[] = [
    { label: "Home", tab: "home" },
    { label: "About", tab: "about" },
    { label: "Academics", tab: "academics" },
    { label: "Admissions", tab: "admissions" },
    { label: "News & Events", tab: "news-events" },
    { label: "Contact", tab: "contact" },
  ];

  const handleNavClick = (tab: NavTab) => {
    setIsMobileMenuOpen(false);
    onNavigate(tab);
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
          isScrolled
            ? "bg-white/95 backdrop-blur-md shadow-[0_2px_12px_rgba(41,22,111,0.06)] border-b border-[#E8E2ED]/80 py-3"
            : "bg-white border-b border-[#E8E2ED]/50 py-4.5"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Brand Logo */}
          <SchoolLogo
            variant="light"
            onClick={() => handleNavClick("home")}
          />

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            {navLinks.map((link) => {
              const isActive = activeTab === link.tab;
              return (
                <button
                  key={link.tab}
                  onClick={() => handleNavClick(link.tab)}
                  className={`relative px-3.5 py-2 text-[14px] font-medium transition-colors cursor-pointer rounded-md ${
                    isActive
                      ? "text-[#581C87] font-semibold"
                      : "text-[#27232D] hover:text-[#581C87] hover:bg-[#F7F4FA]"
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-3.5 right-3.5 h-[2px] bg-[#581C87] rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Action CTAs */}
          <div className="hidden md:flex items-center gap-3">
            {/* Parent Portal */}
            <button
              onClick={onOpenParentPortal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-semibold text-[#29166F] bg-[#F7F4FA] hover:bg-[#EDE8F5] border border-[#E8E2ED] rounded-lg transition-all cursor-pointer group"
              title="Parent Portal access"
            >
              <ShieldCheck className="w-4 h-4 text-[#581C87] transition-transform group-hover:scale-105" />
              <span>Parent Portal</span>
            </button>

            {/* Apply Now */}
            <button
              onClick={onOpenAdmissions}
              className="inline-flex items-center gap-2 px-4.5 py-2 text-[13px] font-semibold text-white bg-[#581C87] hover:bg-[#29166F] rounded-lg shadow-xs transition-all cursor-pointer group active:scale-[0.98]"
            >
              <span>Apply Now</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>

          {/* Mobile Menu Trigger */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={onOpenParentPortal}
              className="p-2 text-[#29166F] bg-[#F7F4FA] border border-[#E8E2ED] rounded-md text-xs font-semibold flex items-center gap-1"
              aria-label="Parent Portal"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#581C87]" />
              <span className="text-[11px]">Portal</span>
            </button>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2.5 text-[#27232D] hover:text-[#581C87] rounded-md hover:bg-[#F7F4FA] transition-colors"
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-xs md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div
            className="fixed top-[69px] left-0 right-0 bg-white border-b border-[#E8E2ED] shadow-xl p-6 transition-transform animate-in slide-in-from-top duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-2">
              <div className="text-[11px] font-bold text-[#625B69] uppercase tracking-wider px-3 py-1">
                Navigation
              </div>
              {navLinks.map((link) => {
                const isActive = activeTab === link.tab;
                return (
                  <button
                    key={link.tab}
                    onClick={() => handleNavClick(link.tab)}
                    className={`flex items-center justify-between w-full px-4 py-3 text-base rounded-lg text-left transition-colors ${
                      isActive
                        ? "bg-[#F7F4FA] text-[#581C87] font-bold"
                        : "text-[#27232D] hover:bg-[#F7F4FA] font-medium"
                    }`}
                  >
                    <span>{link.label}</span>
                    {isActive && (
                      <span className="w-2 h-2 rounded-full bg-[#581C87]" />
                    )}
                  </button>
                );
              })}

              <div className="pt-4 mt-2 border-t border-[#E8E2ED] flex flex-col gap-3">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenParentPortal();
                  }}
                  className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-lg bg-[#F7F4FA] border border-[#E8E2ED] text-[#29166F] font-semibold text-sm"
                >
                  <ShieldCheck className="w-4 h-4 text-[#581C87]" />
                  <span>Access Parent Portal</span>
                </button>

                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenAdmissions();
                  }}
                  className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-lg bg-[#581C87] text-white font-semibold text-sm shadow-xs"
                >
                  <span>Start Admission Application</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 pt-3 text-center text-xs text-[#625B69]">
                <p className="font-medium text-[#29166F]">Marie Louise School</p>
                <p>Surulere, Lagos • &ldquo;Be Truthful&rdquo;</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
