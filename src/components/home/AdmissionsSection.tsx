import React, { useState } from "react";
import {
  SCHOOL_CLASSES,
  schoolConfig,
  type SchoolClass,
} from "../../data/school";
import { ArrowRight, CheckCircle2, Calendar, FileText, HelpCircle, Sparkles } from "lucide-react";

interface AdmissionsSectionProps {
  onStartApplication: (preselectedClass?: SchoolClass) => void;
  onBookTour: () => void;
}

export const AdmissionsSection: React.FC<AdmissionsSectionProps> = ({
  onStartApplication,
  onBookTour,
}) => {
  const [selectedClass, setSelectedClass] = useState<SchoolClass | "">("");

  // Evergreen session display
  const sessionHeading = schoolConfig.currentAcademicSession
    ? `Academic Session: ${schoolConfig.currentAcademicSession}`
    : "Admissions Are Currently Open";

  return (
    <section id="admissions" className="py-20 lg:py-28 bg-white border-t border-[#E8E2ED]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* Left Column: Context, Steps, and Evergreen Admissions Notice */}
          <div className="lg:col-span-6">
            <div className="inline-flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-widest text-[#581C87]">
              <span>Enrolment &amp; Admissions</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold text-[#29166F] leading-tight tracking-tight mb-4">
              READY TO BEGIN
              <br />
              <span className="text-[#581C87]">THE JOURNEY?</span>
            </h2>

            <p className="text-base sm:text-lg text-[#625B69] leading-relaxed mb-6">
              Discover the admission process and find the right starting point for
              your child. We welcome families who value academic dedication,
              moral grounding, and a caring school atmosphere.
            </p>

            {/* Evergreen Session Notice */}
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-lg bg-[#F7F4FA] border border-[#E8E2ED] text-xs font-semibold text-[#29166F] mb-8">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{sessionHeading} &bull; Early Years &amp; Primary</span>
            </div>

            {/* 3 Step Transparent Admissions Workflow */}
            <div className="space-y-6 mb-8">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-[#581C87] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#29166F]">
                    Submit Application &amp; Student Records
                  </h4>
                  <p className="text-xs text-[#625B69] mt-0.5 leading-relaxed">
                    Complete the school&apos;s Google Form with your child&apos;s details.
                    The school will review your submission and contact you.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-[#581C87] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#29166F]">
                    Friendly Interactive Assessment &amp; Tour
                  </h4>
                  <p className="text-xs text-[#625B69] mt-0.5 leading-relaxed">
                    A warm, gentle readiness assessment for early years, or foundational
                    literacy/numeracy check for primary pupils, along with a campus walk.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-[#581C87] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#29166F]">
                    Offer &amp; Welcoming Induction
                  </h4>
                  <p className="text-xs text-[#625B69] mt-0.5 leading-relaxed">
                    Upon successful review, an official letter of admission and
                    onboarding pack is issued for immediate or forthcoming term entry.
                  </p>
                </div>
              </div>
            </div>

            {/* Direct Tour Booking Link */}
            <div className="flex items-center gap-4">
              <button
                onClick={onBookTour}
                className="inline-flex items-center gap-2 text-sm font-bold text-[#581C87] hover:text-[#29166F] transition-colors cursor-pointer"
              >
                <Calendar className="w-4 h-4" />
                <span>Schedule a School Tour First</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right Column: Class Selection & Application Box */}
          <div className="lg:col-span-6 bg-[#F7F4FA] rounded-3xl p-8 sm:p-10 border border-[#E8E2ED] shadow-xs">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl sm:text-2xl font-extrabold text-[#29166F]">
                Select Class of Interest
              </h3>
              <span className="text-xs font-semibold text-[#581C87] bg-white px-2.5 py-1 rounded-sm border border-[#E8E2ED]">
                Single Select
              </span>
            </div>

            <p className="text-xs sm:text-sm text-[#625B69] mb-6">
              Browse the classes below, then continue to the school&apos;s Google Form.
              You will need to enter the class on the form.
            </p>

            {/* Single Select Radio/Button Matrix using SCHOOL_CLASSES - strict scope */}
            <div className="space-y-4 mb-8">
              {/* Early Years Subsection */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#581C87] mb-2">
                  Early Years (Foundation)
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {SCHOOL_CLASSES.slice(0, 4).map((cls) => {
                    const isSelected = selectedClass === cls;
                    return (
                      <button
                        key={cls}
                        type="button"
                        onClick={() => setSelectedClass(cls)}
                        className={`py-3 px-3.5 rounded-xl text-left text-xs sm:text-sm font-semibold transition-all border cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? "bg-[#581C87] text-white border-[#581C87] shadow-xs"
                            : "bg-white text-[#27232D] border-[#E8E2ED] hover:bg-[#EDE8F5]"
                        }`}
                      >
                        <span>{cls}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-[#E9DB3D]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Primary Subsection */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#581C87] mb-2">
                  Primary School (Grades 1 – 6)
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {SCHOOL_CLASSES.slice(4).map((cls) => {
                    const isSelected = selectedClass === cls;
                    return (
                      <button
                        key={cls}
                        type="button"
                        onClick={() => setSelectedClass(cls)}
                        className={`py-3 px-3 rounded-xl text-left text-xs sm:text-sm font-semibold transition-all border cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? "bg-[#581C87] text-white border-[#581C87] shadow-xs"
                            : "bg-white text-[#27232D] border-[#E8E2ED] hover:bg-[#EDE8F5]"
                        }`}
                      >
                        <span>{cls}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-[#E9DB3D]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Selected feedback */}
            {selectedClass ? (
              <div className="p-4 rounded-xl bg-white border border-[#581C87]/20 mb-6 flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#625B69]">Selected for Application:</p>
                  <p className="text-sm font-bold text-[#29166F]">{selectedClass}</p>
                </div>
                <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-xs">
                  Space Available
                </span>
              </div>
            ) : (
              <p className="text-xs text-[#625B69] italic mb-6">
                Review the classes above, then complete your details on the Google Form.
              </p>
            )}

            {/* Conversion Buttons */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => onStartApplication(selectedClass || undefined)}
                className="w-full py-4 px-6 rounded-xl bg-[#581C87] hover:bg-[#29166F] text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer group"
              >
                <span>Apply using Google Form</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>

              <a
                href={`mailto:${schoolConfig.email}?subject=Admissions%20prospectus%20request`}
                className="block w-full py-3 px-4 rounded-xl bg-white border border-[#E8E2ED] text-center text-[#29166F] hover:bg-[#F7F4FA] font-semibold text-xs sm:text-sm transition-all"
              >
                Email us for the admissions prospectus
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
