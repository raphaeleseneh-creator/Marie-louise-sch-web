import React, { useState } from "react";
import { ACADEMIC_STAGES, type SchoolClass } from "../../data/school";
import { ArrowRight, Check, Sparkles, BookOpen, Layers } from "lucide-react";

interface AcademicJourneyProps {
  onSelectClassForAdmission: (className: SchoolClass) => void;
}

export const AcademicJourney: React.FC<AcademicJourneyProps> = ({
  onSelectClassForAdmission,
}) => {
  const [selectedStage, setSelectedStage] = useState<"earlyYears" | "primary">(
    "earlyYears"
  );

  return (
    <section id="academics" className="py-20 lg:py-28 bg-[#F7F4FA]/60 border-y border-[#E8E2ED]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Headline */}
        <div className="max-w-3xl mb-14 sm:mb-20">
          <div className="inline-flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-widest text-[#581C87]">
            <Layers className="w-3.5 h-3.5" />
            <span>Structured Academic Progression</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold text-[#29166F] leading-tight tracking-tight">
            FROM FIRST DISCOVERIES
            <br />
            <span className="text-[#581C87]">TO CONFIDENT</span> LEARNERS.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#625B69] leading-relaxed">
            Our academic structure is carefully sequenced into two cohesive
            formative stages. Every class builds purposefully upon the next,
            ensuring mastery of literacy, numeracy, social maturity, and independent reasoning.
          </p>
        </div>

        {/* Visual Stage Selector Tabs for Highlighting Details */}
        <div className="flex items-center gap-3 mb-10 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedStage("earlyYears")}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              selectedStage === "earlyYears"
                ? "bg-[#581C87] text-white shadow-xs"
                : "bg-white text-[#29166F] border border-[#E8E2ED] hover:bg-[#F7F4FA]"
            }`}
          >
            Stage 01: Early Years (Ages 1.5 – 5)
          </button>
          <button
            onClick={() => setSelectedStage("primary")}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              selectedStage === "primary"
                ? "bg-[#581C87] text-white shadow-xs"
                : "bg-white text-[#29166F] border border-[#E8E2ED] hover:bg-[#F7F4FA]"
            }`}
          >
            Stage 02: Primary School (Ages 5 – 11)
          </button>
        </div>

        {/* Two-Stage Connected Visual Pathway */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 items-stretch">
          {/* STAGE 01: EARLY YEARS */}
          <div
            className={`relative rounded-3xl p-8 sm:p-10 transition-all flex flex-col justify-between ${
              selectedStage === "earlyYears"
                ? "bg-white border-2 border-[#581C87] shadow-[0_12px_36px_rgba(88,28,135,0.08)]"
                : "bg-white/80 border border-[#E8E2ED] hover:border-[#581C87]/40"
            }`}
          >
            <div>
              {/* Stage Tag */}
              <div className="flex items-center justify-between gap-4 mb-6">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#581C87] bg-[#F7F4FA] px-3 py-1 rounded-md border border-[#E8E2ED]">
                  Stage 01 &bull; Early Years
                </span>
                <span className="text-xs font-semibold text-[#625B69]">
                  4 Developmental Levels
                </span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-extrabold text-[#29166F] mb-3">
                Early Years Foundation
              </h3>

              <p className="text-sm sm:text-base text-[#625B69] leading-relaxed mb-8">
                Where curiosity, communication and confidence begin through engaging,
                nurturing learning experiences. Children master social interaction,
                early speech, phonemic awareness, and tactile exploration.
              </p>

              {/* Authentic Photo Crop */}
              <div className="w-full h-48 sm:h-56 rounded-2xl overflow-hidden mb-8 relative border border-[#E8E2ED]">
                <img
                  src="https://images.unsplash.com/photo-1587691592099-24045742c181?auto=format&fit=crop&w=900&q=80"
                  alt="Early years pupils engaged in sensory play and early discovery"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#29166F]/60 via-transparent to-transparent" />
                <span className="absolute bottom-3 left-4 text-xs font-bold text-white uppercase tracking-wider bg-[#29166F]/80 px-2 py-0.5 rounded-xs">
                  Discovery &bull; Wonder &bull; Phonics
                </span>
              </div>

              {/* Classes in Stage 01 - Single Source of Truth */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#29166F] mb-3">
                  Early Years Classes:
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  {ACADEMIC_STAGES.earlyYears.map((cls) => (
                    <button
                      key={cls}
                      onClick={() => onSelectClassForAdmission(cls)}
                      className="flex items-center justify-between p-3 rounded-xl border border-[#E8E2ED] bg-[#F7F4FA] hover:bg-[#581C87] hover:text-white hover:border-[#581C87] transition-all text-left group cursor-pointer text-xs sm:text-sm font-semibold text-[#29166F]"
                      title={`Apply for ${cls}`}
                    >
                      <span>{cls}</span>
                      <ArrowRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-[#E8E2ED] flex items-center justify-between">
              <span className="text-xs text-[#625B69]">Ages ~1.5 to 5 years</span>
              <button
                onClick={() => onSelectClassForAdmission("Transition")}
                className="text-xs font-bold text-[#581C87] hover:text-[#29166F] inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Enrol into Early Years</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* STAGE 02: PRIMARY SCHOOL */}
          <div
            className={`relative rounded-3xl p-8 sm:p-10 transition-all flex flex-col justify-between ${
              selectedStage === "primary"
                ? "bg-white border-2 border-[#581C87] shadow-[0_12px_36px_rgba(88,28,135,0.08)]"
                : "bg-white/80 border border-[#E8E2ED] hover:border-[#581C87]/40"
            }`}
          >
            <div>
              {/* Stage Tag */}
              <div className="flex items-center justify-between gap-4 mb-6">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#581C87] bg-[#F7F4FA] px-3 py-1 rounded-md border border-[#E8E2ED]">
                  Stage 02 &bull; Primary School
                </span>
                <span className="text-xs font-semibold text-[#625B69]">
                  6 Progressive Grades
                </span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-extrabold text-[#29166F] mb-3">
                Primary Education
              </h3>

              <p className="text-sm sm:text-base text-[#625B69] leading-relaxed mb-8">
                Where strong academic foundations develop alongside independence,
                character and critical thinking. Pupils master mathematics, language arts,
                science, civic responsibility, and digital fluency.
              </p>

              {/* Authentic Photo Crop */}
              <div className="w-full h-48 sm:h-56 rounded-2xl overflow-hidden mb-8 relative border border-[#E8E2ED]">
                <img
                  src="https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=900&q=80"
                  alt="Primary pupils engaged in problem solving and collaborative reading"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#29166F]/60 via-transparent to-transparent" />
                <span className="absolute bottom-3 left-4 text-xs font-bold text-white uppercase tracking-wider bg-[#29166F]/80 px-2 py-0.5 rounded-xs">
                  Intellectual Discipline &bull; Critical Thinking
                </span>
              </div>

              {/* Classes in Stage 02 - Single Source of Truth */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#29166F] mb-3">
                  Primary School Classes:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {ACADEMIC_STAGES.primary.map((cls) => (
                    <button
                      key={cls}
                      onClick={() => onSelectClassForAdmission(cls)}
                      className="flex items-center justify-between p-3 rounded-xl border border-[#E8E2ED] bg-[#F7F4FA] hover:bg-[#581C87] hover:text-white hover:border-[#581C87] transition-all text-left group cursor-pointer text-xs sm:text-sm font-semibold text-[#29166F]"
                      title={`Apply for ${cls}`}
                    >
                      <span>{cls}</span>
                      <ArrowRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-[#E8E2ED] flex items-center justify-between">
              <span className="text-xs text-[#625B69]">Ages ~5 to 11 years</span>
              <button
                onClick={() => onSelectClassForAdmission("Primary 1")}
                className="text-xs font-bold text-[#581C87] hover:text-[#29166F] inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Enrol into Primary School</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
