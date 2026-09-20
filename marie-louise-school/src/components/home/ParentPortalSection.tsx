import React from "react";
import { ShieldCheck, ArrowRight, Lock, CheckCircle, FileText, Calendar, CreditCard, Bell } from "lucide-react";

interface ParentPortalSectionProps {
  onOpenPortal: () => void;
}

export const ParentPortalSection: React.FC<ParentPortalSectionProps> = ({
  onOpenPortal,
}) => {
  const portalFeatures = [
    {
      icon: FileText,
      title: "Term Reports & Academic Progress",
      desc: "Continuous assessments, teacher remarks, and term examination grades.",
    },
    {
      icon: Calendar,
      title: "Daily Attendance & School Calendar",
      desc: "Live morning clock-in records, holidays, and upcoming school activities.",
    },
    {
      icon: CreditCard,
      title: "Fee Invoices & Digital Receipts",
      desc: "Clear termly bill statements, instant payment verification, and past receipts.",
    },
    {
      icon: Bell,
      title: "Direct Notices & Circulars",
      desc: "Official school bulletins, field trip consent forms, and teacher messaging.",
    },
  ];

  return (
    <section id="parent-portal" className="py-20 lg:py-28 bg-white border-t border-[#E8E2ED]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#29166F] rounded-3xl p-8 sm:p-12 lg:p-16 text-white relative overflow-hidden shadow-[0_20px_50px_rgba(41,22,111,0.25)]">
          {/* Subtle Graphic Accents */}
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#581C87] rounded-full blur-3xl opacity-50 pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-[#581C87] rounded-full blur-3xl opacity-30 pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            {/* Left Narrative (6 cols) */}
            <div className="lg:col-span-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-white/10 border border-white/15 text-xs font-semibold uppercase tracking-wider text-[#E9DB3D] mb-4">
                <Lock className="w-3.5 h-3.5" />
                <span>Dedicated Family Service</span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-[2.65rem] font-extrabold text-white leading-tight tracking-tight mb-5">
                EVERYTHING PARENTS NEED.
                <br />
                <span className="text-[#E9DB3D]">ONE SECURE</span> PLACE.
              </h2>

              <p className="text-sm sm:text-base text-white/80 leading-relaxed mb-8 max-w-lg">
                We respect your time and value seamless communication. The Marie
                Louise Parent Portal provides an encrypted, centralised hub for
                tracking your child&apos;s academic milestones, attendance, and administrative
                records.
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <button
                  onClick={onOpenPortal}
                  className="inline-flex items-center gap-2.5 px-6 sm:px-7 py-3.5 rounded-xl font-bold text-sm sm:text-base bg-[#E9DB3D] text-[#29166F] hover:bg-white transition-all shadow-xs cursor-pointer group"
                >
                  <ShieldCheck className="w-4 h-4 text-[#29166F]" />
                  <span>Open Parent Portal</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>

                <span className="text-xs text-white/70">
                  Protected &bull; 256-bit SSL Encrypted
                </span>
              </div>
            </div>

            {/* Right Feature Grid (6 cols) */}
            <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {portalFeatures.map((feat) => {
                const Icon = feat.icon;
                return (
                  <div
                    key={feat.title}
                    className="p-5 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/15 hover:bg-white/15 transition-all"
                  >
                    <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center text-[#E9DB3D] mb-3">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-bold text-white mb-1.5 leading-snug">
                      {feat.title}
                    </h3>
                    <p className="text-xs text-white/70 leading-relaxed">
                      {feat.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
