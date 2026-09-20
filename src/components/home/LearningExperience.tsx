import React, { useState } from "react";
import { LEARNING_EXPERIENCES, type LearningExperienceItem } from "../../data/school";
import { BookOpen, Sparkles, CheckCircle, ArrowUpRight } from "lucide-react";

export const LearningExperience: React.FC = () => {
  const [activeExperience, setActiveExperience] = useState<LearningExperienceItem>(
    LEARNING_EXPERIENCES[0]
  );

  return (
    <section className="py-20 lg:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end mb-14">
          <div className="lg:col-span-8">
            <div className="inline-flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-widest text-[#581C87]">
              <span>Curriculum &amp; Co-Curricular Pedagogy</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold text-[#29166F] leading-tight tracking-tight">
              LEARNING THAT GOES
              <br />
              <span className="text-[#581C87]">BEYOND</span> THE CLASSROOM.
            </h2>
          </div>
          <div className="lg:col-span-4">
            <p className="text-sm sm:text-base text-[#625B69] leading-relaxed">
              Every subject at Marie Louise School is designed to foster both
              conceptual mastery and character growth. Explore how our core disciplines
              interlock to nurture complete learners.
            </p>
          </div>
        </div>

        {/* Interactive Editorial Subject Selector Pills */}
        <div className="flex flex-wrap gap-2.5 mb-10 pb-2">
          {LEARNING_EXPERIENCES.map((exp) => {
            const isSelected = activeExperience.id === exp.id;
            return (
              <button
                key={exp.id}
                onClick={() => setActiveExperience(exp)}
                className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? "bg-[#29166F] text-white shadow-xs"
                    : "bg-[#F7F4FA] text-[#27232D] hover:bg-[#EDE8F5] border border-[#E8E2ED]"
                }`}
              >
                {exp.name}
              </button>
            );
          })}
        </div>

        {/* Editorial Showcase Mosaic: Asymmetric Feature Presentation */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-[#F7F4FA] rounded-3xl p-6 sm:p-10 border border-[#E8E2ED]">
          {/* Active Experience Narrative (5 cols) */}
          <div className="lg:col-span-5 flex flex-col justify-center">
            <div className="inline-flex items-center gap-2 mb-3">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#581C87] bg-white px-2.5 py-1 rounded-sm border border-[#E8E2ED]">
                {activeExperience.category}
              </span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-extrabold text-[#29166F] mb-3">
              {activeExperience.name}
            </h3>

            <p className="text-xs sm:text-sm font-bold text-[#581C87] uppercase tracking-wide mb-4">
              Focus: {activeExperience.focus}
            </p>

            <p className="text-sm sm:text-base text-[#625B69] leading-relaxed mb-8">
              {activeExperience.description}
            </p>

            <div className="p-4 rounded-xl bg-white border border-[#E8E2ED] text-xs text-[#27232D]">
              <div className="flex items-center gap-2 text-[#581C87] font-bold mb-1">
                <CheckCircle className="w-4 h-4" />
                <span>Pedagogical Principle:</span>
              </div>
              <p className="text-[#625B69] leading-normal">
                Hands-on practice, constructive teacher guidance, and regular reflection ensuring every pupil progresses at a confident pace.
              </p>
            </div>
          </div>

          {/* Editorial Photographic Mosaic (7 cols) */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Primary spotlight photo */}
            <div className="relative rounded-2xl overflow-hidden shadow-sm h-64 sm:h-80 border border-white">
              <img
                src={activeExperience.image}
                alt={activeExperience.name}
                className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#29166F]/70 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-3 text-white">
                <p className="text-xs font-bold uppercase tracking-wider text-[#E9DB3D]">
                  Authentic School Routine
                </p>
                <p className="text-sm font-semibold">{activeExperience.name}</p>
              </div>
            </div>

            {/* Secondary complementary photo */}
            <div className="relative rounded-2xl overflow-hidden shadow-sm h-64 sm:h-80 border border-white hidden sm:block">
              <img
                src="/images/school/outdoor-learning-circle.jpg"
                alt="Marie Louise School teacher supporting pupils during a group lesson"
                className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#29166F]/70 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-3 text-white">
                <p className="text-xs font-bold uppercase tracking-wider text-white/90">
                  Individual Encouragement
                </p>
                <p className="text-sm font-semibold">Teacher-Pupil Guidance</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
