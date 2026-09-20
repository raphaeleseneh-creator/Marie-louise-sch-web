import React, { useState } from "react";
import {
  SCHOOL_CLASSES,
  ACADEMIC_STAGES,
  schoolConfig,
  type SchoolClass,
} from "../../data/school";
import { X, CheckCircle2, ArrowRight, ShieldCheck, Calendar, Sparkles } from "lucide-react";
import type { AdmissionFormData } from "../../types";

interface AdmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedClass?: SchoolClass;
}

export const AdmissionModal: React.FC<AdmissionModalProps> = ({
  isOpen,
  onClose,
  preselectedClass,
}) => {
  const [formData, setFormData] = useState<AdmissionFormData>({
    parentFullName: "",
    parentEmail: "",
    parentPhone: "",
    childFullName: "",
    childDateOfBirth: "",
    selectedClass: preselectedClass || "Transition",
    notes: "",
    preferredTourDate: "",
  });

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [applicationId, setApplicationId] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const generatedId = `MLS-${Math.floor(100000 + Math.random() * 900000)}`;
    setApplicationId(generatedId);
    setIsSubmitted(true);
  };

  const resetAndClose = () => {
    setIsSubmitted(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6">
      <div
        className="relative bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-10 shadow-2xl border border-[#E8E2ED] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={resetAndClose}
          className="absolute top-6 right-6 w-9 h-9 rounded-full bg-[#F7F4FA] hover:bg-[#EDE8F5] text-[#29166F] flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {isSubmitted ? (
          /* Confirmation State */
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <span className="text-xs font-bold uppercase tracking-widest text-[#581C87] mb-1 block">
              Application Received
            </span>

            <h3 className="text-2xl sm:text-3xl font-extrabold text-[#29166F] mb-2">
              Thank You, {formData.parentFullName || "Parent"}
            </h3>

            <p className="text-sm text-[#625B69] max-w-md mx-auto mb-6">
              Your application for <strong>{formData.childFullName || "your child"}</strong> seeking entry into <strong>{formData.selectedClass}</strong> has been logged with Marie Louise School Admissions.
            </p>

            <div className="bg-[#F7F4FA] rounded-2xl p-5 border border-[#E8E2ED] text-left max-w-md mx-auto mb-8 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-[#E8E2ED]">
                <span className="text-[#625B69]">Application Ref:</span>
                <span className="font-bold text-[#29166F]">{applicationId}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E8E2ED]">
                <span className="text-[#625B69]">Selected Class:</span>
                <span className="font-bold text-[#581C87]">{formData.selectedClass}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E8E2ED]">
                <span className="text-[#625B69]">Status:</span>
                <span className="font-bold text-emerald-700">Under Review</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#625B69]">Location:</span>
                <span className="font-bold text-[#29166F]">Surulere, Lagos</span>
              </div>
            </div>

            <p className="text-xs text-[#625B69] mb-6">
              Our Admissions Officer will contact you within 24–48 business hours via phone ({formData.parentPhone}) or email ({formData.parentEmail}) to arrange your family visit and readiness assessment.
            </p>

            <button
              onClick={resetAndClose}
              className="px-8 py-3.5 rounded-xl bg-[#581C87] text-white font-bold text-sm hover:bg-[#29166F] transition-all cursor-pointer"
            >
              Return to Website
            </button>
          </div>
        ) : (
          /* Application Form */
          <div>
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 mb-2 text-xs font-semibold uppercase tracking-wider text-[#581C87]">
                <Sparkles className="w-3.5 h-3.5 text-[#E9DB3D] fill-[#E9DB3D]" />
                <span>Marie Louise School &bull; Surulere</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-[#29166F] tracking-tight">
                Admission Application Form
              </h3>
              <p className="text-xs sm:text-sm text-[#625B69] mt-1">
                Begin your child&apos;s journey with us. Strictly for Early Years and Primary classes.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* SECTION: CHILD INFORMATION */}
              <div className="p-5 rounded-2xl bg-[#F7F4FA] border border-[#E8E2ED]">
                <p className="text-xs font-bold uppercase tracking-wider text-[#29166F] mb-4">
                  1. Child Information
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#27232D] mb-1.5">
                      Child&apos;s Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Adanna Nicole Eze"
                      value={formData.childFullName}
                      onChange={(e) =>
                        setFormData({ ...formData, childFullName: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E8E2ED] text-xs sm:text-sm focus:outline-none focus:border-[#581C87]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#27232D] mb-1.5">
                      Date of Birth *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.childDateOfBirth}
                      onChange={(e) =>
                        setFormData({ ...formData, childDateOfBirth: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E8E2ED] text-xs sm:text-sm focus:outline-none focus:border-[#581C87]"
                    />
                  </div>
                </div>

                {/* Class Single Select - Single Source of Truth */}
                <div className="mt-4">
                  <label className="block text-xs font-bold text-[#27232D] mb-2">
                    Class Applying For * (Single Select Only)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {SCHOOL_CLASSES.map((cls) => {
                      const isSelected = formData.selectedClass === cls;
                      return (
                        <button
                          key={cls}
                          type="button"
                          onClick={() => setFormData({ ...formData, selectedClass: cls })}
                          className={`py-2 px-2.5 rounded-lg text-xs font-semibold text-center border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-[#581C87] text-white border-[#581C87] shadow-xs"
                              : "bg-white text-[#27232D] border-[#E8E2ED] hover:bg-[#EDE8F5]"
                          }`}
                        >
                          {cls}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-[#625B69] mt-2">
                    Selected: <strong className="text-[#581C87]">{formData.selectedClass}</strong>
                  </p>
                </div>
              </div>

              {/* SECTION: PARENT / GUARDIAN INFORMATION */}
              <div className="p-5 rounded-2xl bg-[#F7F4FA] border border-[#E8E2ED]">
                <p className="text-xs font-bold uppercase tracking-wider text-[#29166F] mb-4">
                  2. Parent / Guardian Contact Details
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#27232D] mb-1.5">
                      Parent / Guardian Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dr. / Mr. / Mrs. Babatunde"
                      value={formData.parentFullName}
                      onChange={(e) =>
                        setFormData({ ...formData, parentFullName: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E8E2ED] text-xs sm:text-sm focus:outline-none focus:border-[#581C87]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#27232D] mb-1.5">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="parent@example.com"
                        value={formData.parentEmail}
                        onChange={(e) =>
                          setFormData({ ...formData, parentEmail: e.target.value })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E8E2ED] text-xs sm:text-sm focus:outline-none focus:border-[#581C87]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#27232D] mb-1.5">
                        Telephone Number *
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="+234 800 000 0000"
                        value={formData.parentPhone}
                        onChange={(e) =>
                          setFormData({ ...formData, parentPhone: e.target.value })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E8E2ED] text-xs sm:text-sm focus:outline-none focus:border-[#581C87]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Inquiries & Tour preference */}
              <div>
                <label className="block text-xs font-bold text-[#27232D] mb-1.5">
                  Additional Notes or Special Learning Considerations (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Tell us about previous nursery or primary experiences, languages spoken, etc."
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E8E2ED] text-xs sm:text-sm focus:outline-none focus:border-[#581C87]"
                />
              </div>

              {/* Submit CTA */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-4 rounded-xl bg-[#581C87] hover:bg-[#29166F] text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer group"
                >
                  <span>Submit Application for {formData.selectedClass}</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>
                <p className="text-center text-[11px] text-[#625B69] mt-3">
                  All admissions at Marie Louise School are governed by academic readiness and adherence to our school code of truthfulness and respect.
                </p>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
