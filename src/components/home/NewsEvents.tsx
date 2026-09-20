import React, { useState } from "react";
import { SCHOOL_STORIES, type SchoolStory } from "../../data/school";
import { ArrowRight, Calendar, Bookmark, X } from "lucide-react";

export const NewsEvents: React.FC = () => {
  const [activeStoryModal, setActiveStoryModal] = useState<SchoolStory | null>(null);

  const featuredStory = SCHOOL_STORIES.find((s) => s.featured) || SCHOOL_STORIES[0];
  const secondaryStories = SCHOOL_STORIES.filter((s) => s.id !== featuredStory.id);

  return (
    <section id="news-events" className="py-20 lg:py-28 bg-[#F7F4FA]/50 border-t border-[#E8E2ED]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12 sm:mb-16">
          <div>
            <div className="inline-flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-widest text-[#581C87]">
              <Bookmark className="w-3.5 h-3.5" />
              <span>Campus Chronicle &amp; Stories</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold text-[#29166F] leading-tight tracking-tight">
              NEWS &amp; EVENTS.
            </h2>
          </div>

          <button
            onClick={() => setActiveStoryModal(featuredStory)}
            className="inline-flex items-center gap-2 text-sm font-bold text-[#581C87] hover:text-[#29166F] transition-colors cursor-pointer"
          >
            <span>View All News &amp; Events</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Editorial Layout: 1 Dominant Featured Story (7 cols) + 2 Secondary Stories (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Dominant Featured Story */}
          <div
            onClick={() => setActiveStoryModal(featuredStory)}
            className="lg:col-span-7 bg-white rounded-3xl overflow-hidden border border-[#E8E2ED] shadow-xs hover:shadow-[0_12px_36px_rgba(41,22,111,0.08)] transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="relative h-64 sm:h-80 w-full overflow-hidden">
              <img
                src={featuredStory.image}
                alt={featuredStory.headline}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute top-4 left-4">
                <span className="px-3 py-1 rounded-sm text-xs font-bold uppercase tracking-wider bg-[#581C87] text-white">
                  Featured &bull; {featuredStory.category}
                </span>
              </div>
            </div>

            <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between">
              <div>
                <p className="text-xs font-semibold text-[#625B69] mb-2 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#581C87]" />
                  <span>{featuredStory.date}</span>
                </p>
                <h3 className="text-xl sm:text-2xl font-bold text-[#29166F] group-hover:text-[#581C87] transition-colors mb-3 leading-snug">
                  {featuredStory.headline}
                </h3>
                <p className="text-sm text-[#625B69] leading-relaxed">
                  {featuredStory.excerpt}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-[#E8E2ED] flex items-center gap-2 text-xs font-bold text-[#581C87] group-hover:translate-x-1 transition-transform">
                <span>Read Full Article</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* Secondary Stories Stacked Alongside */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {secondaryStories.map((story) => (
              <div
                key={story.id}
                onClick={() => setActiveStoryModal(story)}
                className="bg-white rounded-2xl p-6 border border-[#E8E2ED] hover:border-[#581C87]/40 shadow-xs transition-all cursor-pointer group flex gap-4 items-start"
              >
                <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 border border-[#E8E2ED]">
                  <img
                    src={story.image}
                    alt={story.headline}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-[#625B69] mb-1">
                    <span className="text-[#581C87] font-bold">{story.category}</span>
                    <span>&bull;</span>
                    <span>{story.date}</span>
                  </div>
                  <h4 className="text-sm sm:text-base font-bold text-[#29166F] group-hover:text-[#581C87] transition-colors leading-snug mb-1">
                    {story.headline}
                  </h4>
                  <p className="text-xs text-[#625B69] line-clamp-2">
                    {story.excerpt}
                  </p>
                </div>
              </div>
            ))}

            {/* Quick School Events Notice */}
            <div className="p-6 rounded-2xl bg-white border border-[#E8E2ED] mt-auto">
              <div className="flex items-center gap-2 text-xs font-bold text-[#29166F] uppercase tracking-wider mb-2">
                <Calendar className="w-4 h-4 text-[#581C87]" />
                <span>Term Calendar Highlights</span>
              </div>
              <ul className="text-xs text-[#625B69] space-y-2">
                <li className="flex justify-between items-center py-1 border-b border-[#E8E2ED]/60">
                  <span className="font-medium text-[#27232D]">Open House &amp; Campus Tours</span>
                  <span className="text-[#581C87] font-semibold">Every Wednesday</span>
                </li>
                <li className="flex justify-between items-center py-1 border-b border-[#E8E2ED]/60">
                  <span className="font-medium text-[#27232D]">Inter-House Early Reading Exhibition</span>
                  <span className="text-[#581C87] font-semibold">Mid-Term</span>
                </li>
                <li className="flex justify-between items-center py-1">
                  <span className="font-medium text-[#27232D]">Pupils' Moral Character Awards</span>
                  <span className="text-[#581C87] font-semibold">End of Term</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Story Detail Lightbox Modal */}
      {activeStoryModal && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setActiveStoryModal(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setActiveStoryModal(null)}
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="h-56 w-full relative">
              <img
                src={activeStoryModal.image}
                alt={activeStoryModal.headline}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-6">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#581C87] mb-2">
                <span>{activeStoryModal.category}</span>
                <span>&bull;</span>
                <span className="text-[#625B69]">{activeStoryModal.date}</span>
              </div>
              <h3 className="text-xl font-bold text-[#29166F] mb-3 leading-snug">
                {activeStoryModal.headline}
              </h3>
              <p className="text-sm text-[#625B69] leading-relaxed mb-4">
                {activeStoryModal.excerpt}
              </p>
              <p className="text-xs text-[#27232D]/80 leading-relaxed bg-[#F7F4FA] p-3 rounded-lg border border-[#E8E2ED]">
                Marie Louise School celebrates active pupil engagement, academic milestone achievements, and community values across all Early Years and Primary classrooms.
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
