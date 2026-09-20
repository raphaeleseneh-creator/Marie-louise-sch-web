import React from "react";
import { ArrowRight, ChevronDown, Sparkles } from "lucide-react";
import { schoolConfig } from "../../data/school";

interface HeroProps {
  onExploreAdmissions: () => void;
  onDiscoverSchool: () => void;
}

export const Hero: React.FC<HeroProps> = ({
  onExploreAdmissions,
  onDiscoverSchool,
}) => {
  return (
    <section className="relative min-h-[85vh] lg:min-h-[90vh] flex items-center pt-24 pb-16 lg:py-0 overflow-hidden bg-white">
      {/* Subtle Architectural Grid Accent (barely perceptible) */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "radial-gradient(#29166F 1px, transparent 1px), radial-gradient(#29166F 1px, #FFFFFF 1px)",
          backgroundSize: "40px 40px",
          backgroundPosition: "0 0, 20px 20px",
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-8 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* LEFT: 42% Column (5 cols on 12-col grid) */}
          <div className="lg:col-span-5 flex flex-col justify-center z-10">
            {/* Subtle Brand Signature Motto */}
            <div className="inline-flex items-center gap-2.5 mb-6 text-xs tracking-wider uppercase text-[#581C87] font-semibold">
              <span className="w-6 h-[1.5px] bg-[#E9DB3D]" />
              <span>Motto: &ldquo;{schoolConfig.motto}&rdquo;</span>
              <span className="text-[#625B69] font-normal">•</span>
              <span className="text-[#625B69] font-medium">Surulere, Lagos</span>
            </div>

            {/* Editorial Headline with deliberate line breaks */}
            <h1 className="text-[2.75rem] sm:text-[3.5rem] lg:text-[4.2rem] xl:text-[4.75rem] font-extrabold text-[#29166F] leading-[1.06] tracking-[-0.03em] mb-6">
              STRONG
              <br />
              <span className="text-[#581C87]">FOUNDATIONS.</span>
              <br />
              BRIGHT FUTURES.
            </h1>

            {/* Supporting Copy (55-65 chars line width) */}
            <p className="text-base sm:text-lg text-[#625B69] leading-relaxed max-w-[34rem] mb-8 font-normal">
              Nurturing confident, curious and compassionate learners through
              strong academics, character development and a warm, supportive
              learning environment in the heart of Surulere.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-5">
              {/* Primary CTA */}
              <button
                onClick={onExploreAdmissions}
                className="inline-flex items-center justify-center gap-2.5 px-6 sm:px-7 py-3.5 sm:py-4 rounded-xl text-[14px] sm:text-[15px] font-bold text-white bg-[#581C87] hover:bg-[#29166F] transition-all shadow-[0_4px_14px_rgba(88,28,135,0.22)] active:scale-[0.98] group cursor-pointer"
              >
                <span>Explore Admissions</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>

              {/* Secondary CTA */}
              <button
                onClick={onDiscoverSchool}
                className="inline-flex items-center justify-center gap-2 px-5 py-3.5 sm:py-4 rounded-xl text-[14px] sm:text-[15px] font-semibold text-[#581C87] hover:text-[#29166F] hover:bg-[#F7F4FA] border border-[#E8E2ED] transition-all group cursor-pointer"
              >
                <span>Discover Our School</span>
                <ChevronDown className="w-4 h-4 transition-transform group-hover:translate-y-0.5 text-[#581C87]" />
              </button>
            </div>

            {/* Restrained Early Years + Primary Badge */}
            <div className="mt-10 pt-6 border-t border-[#E8E2ED] flex items-center gap-6 text-xs text-[#625B69]">
              <div>
                <span className="block font-bold text-[#29166F] text-sm tracking-tight">
                  Early Years
                </span>
                <span>Transition &bull; Nursery 1 &bull; 2 &bull; Prep</span>
              </div>
              <div className="h-7 w-[1px] bg-[#E8E2ED]" />
              <div>
                <span className="block font-bold text-[#29166F] text-sm tracking-tight">
                  Primary School
                </span>
                <span>Primary 1 through Primary 6</span>
              </div>
            </div>
          </div>

          {/* RIGHT: 58% Column (7 cols on 12-col grid) - Editorial Asymmetric Photo Composition */}
          <div className="lg:col-span-7 relative flex items-center justify-center lg:justify-end">
            <div className="relative w-full max-w-[620px] lg:max-w-none h-[420px] sm:h-[500px] lg:h-[560px]">
              {/* Subtle Geometric Framing Layer */}
              <div className="absolute top-2 right-4 w-4/5 h-[90%] border border-[#E8E2ED] rounded-2xl -z-10 translate-x-2 translate-y-2 pointer-events-none" />
              <div className="absolute -top-3 -right-3 w-28 h-28 bg-[#F7F4FA] rounded-full -z-20 blur-xl opacity-80" />

              {/* Dominant Photograph (Primary classroom engagement) */}
              <div className="absolute top-0 right-0 w-[80%] sm:w-[76%] h-[78%] sm:h-[82%] rounded-2xl overflow-hidden shadow-[0_12px_36px_rgba(41,22,111,0.09)] border border-white">
                <img
                  src="/images/school/early-years-classroom.jpg"
                  alt="Marie Louise School early years pupils learning together in their classroom"
                  className="w-full h-full object-cover object-center transition-transform duration-700 hover:scale-105"
                  loading="eager"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#29166F]/30 via-transparent to-transparent opacity-60" />
                <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 text-white">
                  <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider bg-[#29166F]/80 backdrop-blur-xs px-2 py-0.5 rounded-xs">
                    Classroom Inquiries
                  </span>
                </div>
              </div>

              {/* Overlapping Secondary Vertical Image (Early years reading / book moment) */}
              <div className="absolute bottom-2 left-2 sm:left-0 w-[46%] sm:w-[42%] h-[60%] sm:h-[65%] rounded-2xl overflow-hidden shadow-[0_16px_40px_rgba(41,22,111,0.14)] border-4 border-white z-20">
                <img
                  src="/images/school/outdoor-learning-circle.jpg"
                  alt="Marie Louise School pupils reading together with their teacher outdoors"
                  className="w-full h-full object-cover object-center transition-transform duration-700 hover:scale-105"
                />
                <div className="absolute top-3 left-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-[#E9DB3D] text-[#29166F] px-2 py-0.5 rounded-xs shadow-xs">
                    Guided Reading
                  </span>
                </div>
              </div>

              {/* Small Floating Detail Crop (Hands/creative art discovery) */}
              <div className="absolute -bottom-3 right-8 sm:right-16 w-32 sm:w-40 h-24 sm:h-28 rounded-xl overflow-hidden shadow-[0_8px_24px_rgba(41,22,111,0.12)] border-2 border-white z-30 hidden sm:block">
                <img
                  src="/images/school/martial-arts-activity.jpg"
                  alt="Marie Louise School pupils taking part in martial arts activities"
                  className="w-full h-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-[#581C87]/15" />
                <div className="absolute bottom-1.5 right-1.5 bg-white/95 px-1.5 py-0.5 rounded-xs text-[9px] font-semibold text-[#581C87]">
                  Active Learners
                </div>
              </div>

              {/* Elegant Micro Signature Element */}
              <div className="absolute -top-4 left-6 sm:left-12 bg-white px-3.5 py-2 rounded-lg shadow-sm border border-[#E8E2ED] flex items-center gap-2 z-30">
                <Sparkles className="w-3.5 h-3.5 text-[#E9DB3D] fill-[#E9DB3D]" />
                <span className="text-[11px] font-bold text-[#29166F] tracking-wide">
                  Surulere, Lagos
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
