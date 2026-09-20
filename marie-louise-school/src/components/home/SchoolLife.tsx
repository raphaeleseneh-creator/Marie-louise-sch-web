import React, { useState } from "react";
import { SCHOOL_LIFE_MOMENTS, type SchoolLifeMoment } from "../../data/school";
import { ArrowRight, Camera, X } from "lucide-react";

export const SchoolLife: React.FC = () => {
  const [activeModalMoment, setActiveModalMoment] = useState<SchoolLifeMoment | null>(null);

  return (
    <section className="py-20 lg:py-28 bg-white border-t border-[#E8E2ED]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 sm:mb-16">
          <div>
            <div className="inline-flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-widest text-[#581C87]">
              <Camera className="w-3.5 h-3.5" />
              <span>Campus Culture &amp; Daily Vibrancy</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold text-[#29166F] leading-tight tracking-tight">
              LIFE AT MARIE LOUISE.
            </h2>
            <p className="mt-2 text-base text-[#625B69] max-w-xl">
              A vibrant community where pupils learn with joy, play with enthusiasm,
              and build lifelong friendships.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#581C87]">
              Surulere Campus
            </span>
          </div>
        </div>

        {/* Magazine-style Asymmetrical Mosaic */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {SCHOOL_LIFE_MOMENTS.map((moment, index) => {
            // Give varied height to break monotony
            const isTall = index === 1 || index === 3;
            return (
              <div
                key={moment.title}
                onClick={() => setActiveModalMoment(moment)}
                className={`group relative rounded-2xl overflow-hidden shadow-xs cursor-pointer border border-[#E8E2ED] transition-all hover:shadow-[0_12px_32px_rgba(41,22,111,0.12)] ${
                  isTall ? "h-80 sm:h-96" : "h-72 sm:h-80"
                }`}
              >
                <img
                  src={moment.image}
                  alt={moment.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#29166F]/85 via-[#29166F]/30 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-[#E9DB3D] text-[#29166F] px-2 py-0.5 rounded-xs mb-1.5 shadow-2xs">
                    {moment.category}
                  </span>
                  <h3 className="text-base sm:text-lg font-bold leading-tight">
                    {moment.title}
                  </h3>
                  <p className="text-xs text-white/80 line-clamp-2 mt-1">
                    {moment.caption}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Explore School Life Bar */}
        <div className="mt-12 p-6 rounded-2xl bg-[#F7F4FA] border border-[#E8E2ED] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-[#29166F]">
              Experience our classrooms in person
            </p>
            <p className="text-xs text-[#625B69]">
              Schedule a personalized school tour to witness our learning community in action.
            </p>
          </div>
          <a
            href="#admissions"
            className="inline-flex items-center gap-2 text-sm font-bold text-[#581C87] hover:text-[#29166F] transition-colors"
          >
            <span>Explore School Life &amp; Book Tour</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Lightbox Preview Modal */}
      {activeModalMoment && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setActiveModalMoment(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setActiveModalMoment(null)}
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="h-72 sm:h-96 w-full relative">
              <img
                src={activeModalMoment.image}
                alt={activeModalMoment.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-6">
              <span className="text-xs font-bold uppercase tracking-wider text-[#581C87]">
                {activeModalMoment.category}
              </span>
              <h4 className="text-xl font-bold text-[#29166F] mt-1 mb-2">
                {activeModalMoment.title}
              </h4>
              <p className="text-sm text-[#625B69] leading-relaxed">
                {activeModalMoment.caption}
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
