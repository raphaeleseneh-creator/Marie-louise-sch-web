import React from "react";
import { schoolConfig } from "../../data/school";
import { Compass, BookOpen, Shield, Award } from "lucide-react";

export const TrustStrip: React.FC = () => {
  return (
    <section className="border-y border-[#E8E2ED] bg-[#F7F4FA]/70 py-6 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 items-center divide-y md:divide-y-0 md:divide-x divide-[#E8E2ED]/80">
          {/* Item 1: Scope */}
          <div className="flex items-center gap-3.5 pt-4 md:pt-0 first:pt-0">
            <div className="w-10 h-10 rounded-lg bg-white border border-[#E8E2ED] flex items-center justify-center flex-shrink-0 text-[#581C87] shadow-2xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#625B69]">
                Academic Structure
              </p>
              <p className="text-sm sm:text-[15px] font-bold text-[#29166F]">
                Nursery to Primary 6
              </p>
            </div>
          </div>

          {/* Item 2: Location */}
          <div className="flex items-center gap-3.5 pt-4 md:pt-0 md:pl-8">
            <div className="w-10 h-10 rounded-lg bg-white border border-[#E8E2ED] flex items-center justify-center flex-shrink-0 text-[#581C87] shadow-2xs">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#625B69]">
                Location
              </p>
              <p className="text-sm sm:text-[15px] font-bold text-[#29166F]">
                {schoolConfig.location}
              </p>
            </div>
          </div>

          {/* Item 3: School Motto */}
          <div className="flex items-center gap-3.5 pt-4 md:pt-0 md:pl-8">
            <div className="w-10 h-10 rounded-lg bg-white border border-[#E8E2ED] flex items-center justify-center flex-shrink-0 text-[#581C87] shadow-2xs">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#625B69]">
                School Motto
              </p>
              <p className="text-sm sm:text-[15px] font-bold text-[#29166F]">
                &ldquo;{schoolConfig.motto}&rdquo;
              </p>
            </div>
          </div>

          {/* Item 4: Educational Focus */}
          <div className="flex items-center gap-3.5 pt-4 md:pt-0 md:pl-8">
            <div className="w-10 h-10 rounded-lg bg-white border border-[#E8E2ED] flex items-center justify-center flex-shrink-0 text-[#581C87] shadow-2xs">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#625B69]">
                Core Focus
              </p>
              <p className="text-sm sm:text-[15px] font-bold text-[#29166F]">
                Early Years &amp; Primary
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
