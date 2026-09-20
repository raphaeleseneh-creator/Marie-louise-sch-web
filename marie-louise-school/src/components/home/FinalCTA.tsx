import React from "react";
import { ArrowRight, PhoneCall, Mail, MapPin } from "lucide-react";
import { schoolConfig } from "../../data/school";

interface FinalCTAProps {
  onExploreAdmissions: () => void;
  onContactSchool: () => void;
}

export const FinalCTA: React.FC<FinalCTAProps> = ({
  onExploreAdmissions,
  onContactSchool,
}) => {
  return (
    <section className="py-20 lg:py-28 bg-[#F7F4FA] border-t border-[#E8E2ED]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl p-8 sm:p-14 lg:p-16 border border-[#E8E2ED] shadow-sm relative overflow-hidden">
          {/* Subtle Accent Edge */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#581C87]" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-8">
              <span className="text-xs font-bold uppercase tracking-widest text-[#581C87] mb-3 block">
                Begin The Academic Journey
              </span>

              <h2 className="text-3xl sm:text-4xl lg:text-[2.85rem] font-extrabold text-[#29166F] leading-tight tracking-tight mb-4">
                GIVE YOUR CHILD
                <br />
                A STRONG FOUNDATION.
              </h2>

              <p className="text-base sm:text-lg text-[#625B69] max-w-2xl leading-relaxed mb-8">
                Discover a learning environment where children are seen, supported,
                and encouraged to grow. Experience the difference a values-led
                nursery and primary education makes.
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <button
                  onClick={onExploreAdmissions}
                  className="inline-flex items-center gap-2.5 px-7 py-4 rounded-xl text-sm sm:text-base font-bold text-white bg-[#581C87] hover:bg-[#29166F] transition-all shadow-[0_4px_14px_rgba(88,28,135,0.22)] cursor-pointer group"
                >
                  <span>Explore Admissions</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>

                <button
                  onClick={onContactSchool}
                  className="inline-flex items-center gap-2 px-6 py-4 rounded-xl text-sm sm:text-base font-semibold text-[#581C87] hover:text-[#29166F] hover:bg-[#F7F4FA] border border-[#E8E2ED] transition-all cursor-pointer"
                >
                  <PhoneCall className="w-4 h-4 text-[#581C87]" />
                  <span>Contact the School</span>
                </button>
              </div>
            </div>

            {/* Contact Quick Snapshot */}
            <div className="lg:col-span-4 bg-[#F7F4FA] rounded-2xl p-6 border border-[#E8E2ED] text-xs text-[#27232D] space-y-3.5">
              <p className="font-bold text-[#29166F] text-sm uppercase tracking-wider">
                Visit Us in Surulere
              </p>
              <div className="flex items-start gap-2.5 text-[#625B69]">
                <MapPin className="w-4 h-4 text-[#581C87] flex-shrink-0 mt-0.5" />
                <span>{schoolConfig.address}</span>
              </div>
              <div className="flex items-center gap-2.5 text-[#625B69]">
                <Mail className="w-4 h-4 text-[#581C87] flex-shrink-0" />
                <span>{schoolConfig.email}</span>
              </div>
              <div className="flex items-center gap-2.5 text-[#625B69]">
                <PhoneCall className="w-4 h-4 text-[#581C87] flex-shrink-0" />
                <span>{schoolConfig.phone}</span>
              </div>
              <div className="pt-2 border-t border-[#E8E2ED] text-[11px] text-[#625B69]">
                Tours available Monday to Friday by appointment.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
