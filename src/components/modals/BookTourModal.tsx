import React, { useRef, useState } from "react";
import { SCHOOL_CLASSES, schoolConfig, type SchoolClass } from "../../data/school";
import { X, CheckCircle2, ArrowRight } from "lucide-react";
import type { VisitTourFormData } from "../../types";
import { SchoolDialog } from "./SchoolDialog";

interface BookTourModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BookTourModal: React.FC<BookTourModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [formData, setFormData] = useState<VisitTourFormData>({
    fullName: "",
    email: "",
    phone: "",
    preferredDate: "",
    interestedClass: "Transition",
    message: "",
  });

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [reference, setReference] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const saving = useRef(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving.current || isSubmitted) return;
    saving.current = true;
    setIsSaving(true);
    setSubmitError("");
    try {
      const response = await fetch("/api/tours", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || "Your tour request could not be saved. Please try again.");
      if (!result?.id || !result?.reference) throw new Error("The school did not return a tour reference. Please contact the office before resubmitting.");
      setReference(result.reference);
      setIsSubmitted(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to reach the school. Please try again.");
    } finally {
      saving.current = false;
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (saving.current) return;
    setIsSubmitted(false);
    setSubmitError("");
    onClose();
  };

  return (
    <SchoolDialog label="Request a school visit" onClose={handleClose} className="max-w-lg p-6 sm:p-8">
        <button
          onClick={handleClose}
          disabled={isSaving}
          aria-label="Close dialog"
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#F7F4FA] hover:bg-[#EDE8F5] text-[#29166F] flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {isSubmitted ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-extrabold text-[#29166F] mb-2">
              Tour Request Received
            </h3>
            <p className="mb-4 text-sm font-bold text-[#581C87]">Reference: {reference}</p>
            <p className="text-xs sm:text-sm text-[#625B69] mb-6">
              Thank you, <strong>{formData.fullName}</strong>. Wait for the admissions office to confirm a date before visiting. If your preferred date is approaching, <a className="font-bold underline" href={`tel:${schoolConfig.phone.replace(/[^+\d]/g, "")}`}>call the school</a> and quote your reference.
            </p>
            <button
              onClick={handleClose}
              className="px-6 py-2.5 rounded-xl bg-[#581C87] text-white text-xs font-bold hover:bg-[#29166F] cursor-pointer"
            >
              Done
            </button>
          </div>
        ) : (
          <div>
            <div className="mb-6">
              <span className="text-xs font-bold uppercase tracking-wider text-[#581C87] block mb-1">
                Surulere Campus
              </span>
              <h3 className="text-2xl font-extrabold text-[#29166F]">
                Schedule a School Visit
              </h3>
              <p className="text-xs text-[#625B69] mt-1">
                Experience our welcoming classrooms, library, and play areas in person.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <fieldset disabled={isSaving} className="space-y-4 border-0 p-0 m-0 min-w-0" aria-busy={isSaving}>
              <div>
                <label className="block text-xs font-bold text-[#27232D] mb-1">
                  Parent / Guardian Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mrs. Funke Adeyemi"
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E8E2ED] text-xs sm:text-sm focus:outline-none focus:border-[#581C87]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#27232D] mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+234 800 000 0000"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E8E2ED] text-xs sm:text-sm focus:outline-none focus:border-[#581C87]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#27232D] mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="parent@example.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E8E2ED] text-xs sm:text-sm focus:outline-none focus:border-[#581C87]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#27232D] mb-1">
                    Preferred Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.preferredDate}
                    onChange={(e) =>
                      setFormData({ ...formData, preferredDate: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E8E2ED] text-xs sm:text-sm focus:outline-none focus:border-[#581C87]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#27232D] mb-1">
                    Class of Interest *
                  </label>
                  <select
                    value={formData.interestedClass}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        interestedClass: e.target.value as SchoolClass,
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E8E2ED] text-xs sm:text-sm focus:outline-none focus:border-[#581C87]"
                  >
                    {SCHOOL_CLASSES.map((cls) => (
                      <option key={cls} value={cls}>
                        {cls}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#27232D] mb-1">
                  Specific Questions or Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Any particular questions about Early Years or Primary routines?"
                  value={formData.message}
                  onChange={(e) =>
                    setFormData({ ...formData, message: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E8E2ED] text-xs sm:text-sm focus:outline-none focus:border-[#581C87]"
                />
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-3.5 rounded-xl bg-[#581C87] text-white font-bold text-xs sm:text-sm hover:bg-[#29166F] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{isSaving ? "Saving tour request…" : "Request a visit"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              {submitError ? <p role="alert" className="text-sm font-semibold text-red-700">{submitError}</p> : null}
              </fieldset>
            </form>
          </div>
        )}
    </SchoolDialog>
  );
};
