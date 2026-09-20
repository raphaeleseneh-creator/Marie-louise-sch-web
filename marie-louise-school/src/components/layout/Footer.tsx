import React from "react";
import { SchoolLogo } from "../ui/SchoolLogo";
import { schoolConfig, ACADEMIC_STAGES } from "../../data/school";
import { MapPin, Phone, Mail, ShieldCheck, ArrowRight, Heart } from "lucide-react";
import type { NavTab } from "../../types";

interface FooterProps {
  onNavigate: (tab: NavTab) => void;
  onOpenAdmissions: () => void;
  onOpenParentPortal: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onNavigate,
  onOpenAdmissions,
  onOpenParentPortal,
}) => {
  return (
    <footer className="bg-[#29166F] text-white pt-16 pb-12 border-t border-[#581C87]/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-12 pb-14 border-b border-white/10">
          {/* Col 1: Brand & Philosophy (4 cols) */}
          <div className="lg:col-span-4">
            <SchoolLogo variant="dark" onClick={() => onNavigate("home")} />
            
            <p className="mt-4 text-xs sm:text-sm text-white/75 leading-relaxed max-w-sm">
              Marie Louise School is a premier Nursery and Primary educational
              institution in Surulere, Lagos. Grounded in our motto &ldquo;{schoolConfig.motto}&rdquo;,
              we nurture confident, curious, and morally sound children.
            </p>

            <div className="mt-6 flex items-center gap-2">
              <span className="text-xs text-[#E9DB3D] font-bold uppercase tracking-wider">
                Motto:
              </span>
              <span className="text-xs text-white/90 italic font-medium">
                &ldquo;{schoolConfig.motto}&rdquo;
              </span>
            </div>
          </div>

          {/* Col 2: Navigation Links (2 cols) */}
          <div className="lg:col-span-2">
            <p className="text-xs font-bold uppercase tracking-wider text-[#E9DB3D] mb-4">
              Explore
            </p>
            <ul className="space-y-2.5 text-xs sm:text-sm text-white/75">
              <li>
                <button
                  onClick={() => onNavigate("home")}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Home
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate("about")}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  About Our School
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate("academics")}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Academic Curriculum
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate("admissions")}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Admissions Process
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate("news-events")}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  News &amp; Events
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate("contact")}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Contact Us
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Academic Classes - Single Source of Truth (3 cols) */}
          <div className="lg:col-span-3">
            <p className="text-xs font-bold uppercase tracking-wider text-[#E9DB3D] mb-4">
              Academic Stages
            </p>
            <div className="space-y-4 text-xs text-white/75">
              <div>
                <p className="font-bold text-white mb-1">Early Years</p>
                <p className="text-white/60">
                  {ACADEMIC_STAGES.earlyYears.join(" • ")}
                </p>
              </div>
              <div>
                <p className="font-bold text-white mb-1">Primary School</p>
                <p className="text-white/60">
                  {ACADEMIC_STAGES.primary.join(" • ")}
                </p>
              </div>
              <div className="pt-2">
                <button
                  onClick={onOpenAdmissions}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#E9DB3D] hover:underline cursor-pointer"
                >
                  <span>Apply for an Academic Class</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Col 4: Contact & Parent Portal (3 cols) */}
          <div className="lg:col-span-3">
            <p className="text-xs font-bold uppercase tracking-wider text-[#E9DB3D] mb-4">
              Surulere Campus
            </p>
            <div className="space-y-3 text-xs text-white/75">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#E9DB3D] flex-shrink-0 mt-0.5" />
                <span>{schoolConfig.address}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-[#E9DB3D] flex-shrink-0" />
                <span>{schoolConfig.email}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-[#E9DB3D] flex-shrink-0" />
                <span>{schoolConfig.phone}</span>
              </div>
            </div>

            {/* Parent Portal Fast Access */}
            <div className="mt-6 pt-4 border-t border-white/10">
              <button
                onClick={onOpenParentPortal}
                className="w-full py-2.5 px-3 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold text-white flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <ShieldCheck className="w-4 h-4 text-[#E9DB3D]" />
                <span>Parent Portal Sign-In</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/50">
          <p>
            &copy; {new Date().getFullYear()} Marie Louise School, Surulere, Lagos. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <span>Nursery &bull; Primary Education</span>
            <span>&bull;</span>
            <span>&ldquo;Be Truthful&rdquo;</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
