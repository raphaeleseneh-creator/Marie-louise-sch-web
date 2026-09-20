import React from "react";
import { SCHOOL_VALUES } from "../../data/school";
import { CheckCircle2 } from "lucide-react";

export const SchoolIntroduction: React.FC = () => {
  return (
    <section id="about" className="py-20 lg:py-28 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header with Asymmetric Editorial Balance */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* Left Column: Headline and Philosophical Premise */}
          <div className="lg:col-span-6">
            <div className="inline-flex items-center gap-2 mb-4 text-xs font-semibold uppercase tracking-widest text-[#581C87]">
              <span>Who We Are</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-[2.85rem] font-extrabold text-[#29166F] leading-[1.12] tracking-tight mb-6">
              MORE THAN A SCHOOL.
              <br />
              <span className="text-[#581C87]">A FOUNDATION</span> FOR LIFE.
            </h2>

            <p className="text-base sm:text-lg text-[#625B69] leading-relaxed mb-8">
              At Marie Louise School, we believe that education in the formative
              years must be deliberate, joyful, and grounded in truth. Located in
              Surulere, Lagos, our school provides an intentional atmosphere where
              curiosity is celebrated, moral values are cultivated, and foundational
              knowledge is systematically mastered.
            </p>

            <div className="p-6 rounded-2xl bg-[#F7F4FA] border border-[#E8E2ED] mb-8">
              <p className="text-sm font-semibold text-[#29166F] uppercase tracking-wider mb-2">
                Our Educational Vision
              </p>
              <p className="text-[#27232D] text-sm sm:text-base leading-relaxed italic">
                &ldquo;To shape well-rounded, truthful, and intellectually curious
                boys and girls who step forward into their future with moral clarity,
                scholarly confidence, and genuine kindness.&rdquo;
              </p>
            </div>
          </div>

          {/* Right Column: Authentic Editorial Photography with layered quote */}
          <div className="lg:col-span-6 relative">
            <div className="relative rounded-2xl overflow-hidden shadow-[0_16px_44px_rgba(41,22,111,0.08)] border border-[#E8E2ED]">
              <img
                src="/images/school/outdoor-learning-circle.jpg"
                alt="Marie Louise School teacher guiding pupils during an outdoor reading lesson"
                className="w-full h-[380px] sm:h-[460px] object-cover object-center"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#29166F]/80 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 text-white">
                <span className="inline-block px-2.5 py-1 rounded-sm bg-[#E9DB3D] text-[#29166F] text-[11px] font-bold uppercase tracking-wider mb-2">
                  Care &amp; Guidance
                </span>
                <p className="text-sm sm:text-base font-medium text-white/95 leading-snug">
                  Every child is individually known, supported, and challenged to achieve their personal best.
                </p>
              </div>
            </div>

            {/* Editorial Label Box */}
            <div className="hidden sm:block absolute -top-4 -left-6 bg-white p-4 rounded-xl border border-[#E8E2ED] shadow-sm max-w-[210px]">
              <p className="text-xs font-bold text-[#29166F]">Individualised Care</p>
              <p className="text-[11px] text-[#625B69] mt-0.5">
                Thoughtful teacher-to-pupil engagement in early childhood.
              </p>
            </div>
          </div>
        </div>

        {/* School Values Displayed via Typography & Layout — NOT 5 Identical Cards */}
        <div className="mt-16 sm:mt-24 pt-12 border-t border-[#E8E2ED]">
          <div className="max-w-2xl mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-[#581C87] mb-2">
              Our Guiding Pillars
            </p>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-[#29166F] tracking-tight">
              Values We Live By Everyday
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10">
            {SCHOOL_VALUES.map((val, idx) => (
              <div
                key={val.name}
                className="relative flex flex-col group"
              >
                {/* Visual Accent Number */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-extrabold text-[#581C87] bg-[#F7F4FA] px-2 py-0.5 rounded-sm border border-[#E8E2ED]">
                    0{idx + 1}
                  </span>
                  <h4 className="text-lg font-bold text-[#29166F] group-hover:text-[#581C87] transition-colors">
                    {val.name}
                  </h4>
                </div>

                <p className="text-xs font-semibold text-[#581C87] mb-2">
                  {val.title}
                </p>
                <p className="text-sm text-[#625B69] leading-relaxed mb-2">
                  {val.description}
                </p>
                <p className="text-xs text-[#27232D]/70 font-medium italic mt-auto">
                  {val.editorialDetail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
