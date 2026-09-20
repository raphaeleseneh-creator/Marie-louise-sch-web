import React, { useState } from "react";
import { SCHOOL_CLASSES, type SchoolClass, schoolConfig } from "../../data/school";
import { X, Calendar, CheckCircle2, Clock, MapPin, ArrowRight } from "lucide-react";
import type { VisitTourFormData } from "../../types";

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

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
  };

  const handleClose = () => {
    setIsSubmitted(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6">
      <div
        className="relative bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-[#E8E2ED]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
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
            <p className="text-xs sm:text-sm text-[#625B69] mb-6">
              Thank you, <strong>{formData.fullName}</strong>. Our Admissions team will contact you shortly to confirm your tour appointment at our Surulere campus for <strong>{formData.interestedClass}</strong>.
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
                className="w-full py-3.5 rounded-xl bg-[#581C87] text-white font-bold text-xs sm:text-sm hover:bg-[#29166F] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Confirm School Visit Request</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
