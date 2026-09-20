import React from "react";
import { DEVELOPMENT_PILLARS } from "../../data/school";
import { Heart, Sparkles } from "lucide-react";

export const WhyMarieLouise: React.FC = () => {
  return (
    <section className="py-20 lg:py-28 bg-[#F7F4FA]/50 border-t border-[#E8E2ED]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <div className="inline-flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-widest text-[#581C87]">
            <Heart className="w-3.5 h-3.5 text-[#581C87]" />
            <span>Formative Outcomes</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold text-[#29166F] leading-tight tracking-tight">
            WHAT WE WANT
            <br />
            EVERY CHILD <span className="text-[#581C87]">TO BECOME.</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-[#625B69] leading-relaxed">
            Education during early childhood and primary years is not merely about
            passing tests—it is about forming an articulate, inquisitive, and
            principled human being.
          </p>
        </div>

        {/* 4 Distinctive Pillars with Large Typography and Emotional Resonance */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
          {DEVELOPMENT_PILLARS.map((pillar) => (
            <div
              key={pillar.pillar}
              className="bg-white rounded-3xl p-8 sm:p-10 border border-[#E8E2ED] hover:border-[#581C87]/40 shadow-xs transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Pillar Tag & Subtitle */}
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#581C87] bg-[#F7F4FA] px-3 py-1 rounded-md border border-[#E8E2ED]">
                    {pillar.tag}
                  </span>
                  <Sparkles className="w-4 h-4 text-[#E9DB3D] fill-[#E9DB3D]" />
                </div>

                {/* Big Bold Characteristic Typography */}
                <h3 className="text-3xl sm:text-4xl font-extrabold text-[#29166F] tracking-tight group-hover:text-[#581C87] transition-colors mb-2">
                  {pillar.pillar}.
                </h3>

                <p className="text-sm font-semibold text-[#581C87] mb-4">
                  {pillar.subtitle}
                </p>

                <p className="text-sm sm:text-base text-[#625B69] leading-relaxed mb-6">
                  {pillar.statement}
                </p>
              </div>

              {/* Real Educational Philosophy Quote */}
              <div className="pt-6 border-t border-[#E8E2ED]/80">
                <blockquote className="text-xs sm:text-sm text-[#27232D]/80 italic pl-3 border-l-2 border-[#581C87]">
                  &ldquo;{pillar.quote}&rdquo;
                </blockquote>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
