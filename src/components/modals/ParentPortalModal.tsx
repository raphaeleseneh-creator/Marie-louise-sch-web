import React, { useState } from "react";
import { X, ShieldCheck, FileText, Calendar, CreditCard, Bell, CheckCircle2, ArrowRight, User } from "lucide-react";
import { schoolConfig } from "../../data/school";

interface ParentPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ParentPortalModal: React.FC<ParentPortalModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<"overview" | "academics" | "fees" | "notices">(
    "overview"
  );
  const [isDemoLoggedIn, setIsDemoLoggedIn] = useState(true);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6">
      <div
        className="relative bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-[#E8E2ED] overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Portal Header */}
        <div className="bg-[#29166F] text-white p-6 sm:p-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-[#E9DB3D]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-extrabold tracking-tight">
                  Parent Portal
                </h3>
                <span className="text-[10px] uppercase tracking-wider font-bold bg-[#E9DB3D] text-[#29166F] px-2 py-0.5 rounded-xs">
                  Active Demo
                </span>
              </div>
              <p className="text-xs text-white/70">
                Marie Louise School &bull; Surulere, Lagos
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close portal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Portal Nav Tabs */}
        <div className="flex items-center border-b border-[#E8E2ED] px-6 bg-[#F7F4FA] overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab("overview")}
            className={`py-3.5 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "overview"
                ? "border-[#581C87] text-[#581C87]"
                : "border-transparent text-[#625B69] hover:text-[#27232D]"
            }`}
          >
            Student Overview
          </button>
          <button
            onClick={() => setActiveTab("academics")}
            className={`py-3.5 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "academics"
                ? "border-[#581C87] text-[#581C87]"
                : "border-transparent text-[#625B69] hover:text-[#27232D]"
            }`}
          >
            Term Reports &amp; Attendance
          </button>
          <button
            onClick={() => setActiveTab("fees")}
            className={`py-3.5 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "fees"
                ? "border-[#581C87] text-[#581C87]"
                : "border-transparent text-[#625B69] hover:text-[#27232D]"
            }`}
          >
            Fees &amp; Receipts
          </button>
          <button
            onClick={() => setActiveTab("notices")}
            className={`py-3.5 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "notices"
                ? "border-[#581C87] text-[#581C87]"
                : "border-transparent text-[#625B69] hover:text-[#27232D]"
            }`}
          >
            Circulars &amp; Notices
          </button>
        </div>

        {/* Portal Body Content */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-6">
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Child Profile Card */}
              <div className="bg-[#F7F4FA] rounded-2xl p-6 border border-[#E8E2ED] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#581C87] text-white flex items-center justify-center font-bold text-xl">
                    KC
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-[#29166F]">
                      Kamsiyochukwu Chukwuma
                    </h4>
                    <p className="text-xs text-[#625B69]">
                      Enrolled: <strong className="text-[#581C87]">Primary 3</strong> &bull; Student ID: MLS-P3-042
                    </p>
                    <p className="text-[11px] text-[#29166F] font-semibold mt-0.5">
                      Class Teacher: Primary 3 Lead Instructor
                    </p>
                  </div>
                </div>

                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                  Good Standing
                </span>
              </div>

              {/* Quick Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-white border border-[#E8E2ED]">
                  <p className="text-xs text-[#625B69] mb-1">Term Attendance</p>
                  <p className="text-2xl font-extrabold text-[#29166F]">98.2%</p>
                  <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Present (54/55 days)</p>
                </div>

                <div className="p-4 rounded-xl bg-white border border-[#E8E2ED]">
                  <p className="text-xs text-[#625B69] mb-1">Character Conduct</p>
                  <p className="text-2xl font-extrabold text-[#581C87]">Exemplary</p>
                  <p className="text-[11px] text-[#625B69] mt-0.5">&ldquo;Be Truthful&rdquo; merit awarded</p>
                </div>

                <div className="p-4 rounded-xl bg-white border border-[#E8E2ED]">
                  <p className="text-xs text-[#625B69] mb-1">Term Tuition Status</p>
                  <p className="text-2xl font-extrabold text-emerald-700">Settled</p>
                  <p className="text-[11px] text-[#625B69] mt-0.5">Receipt #MLS-RCP-8921</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "academics" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-white border border-[#E8E2ED]">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-bold text-[#29166F]">Continuous Assessment Snapshot</h4>
                  <span className="text-xs font-bold text-[#581C87]">Primary 3</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-[#E8E2ED]/60">
                    <span>Literacy &amp; Reading Comprehension</span>
                    <span className="font-bold text-[#29166F]">88% &bull; Excellent</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#E8E2ED]/60">
                    <span>Mathematics &amp; Problem Solving</span>
                    <span className="font-bold text-[#29166F]">92% &bull; Distinction</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#E8E2ED]/60">
                    <span>Science &amp; Agricultural Discovery</span>
                    <span className="font-bold text-[#29166F]">86% &bull; Excellent</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>Civic Values &amp; Character Studies</span>
                    <span className="font-bold text-[#29166F]">95% &bull; Distinction</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#F7F4FA] border border-[#E8E2ED] flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[#29166F]">Download Term Report Card</p>
                  <p className="text-[11px] text-[#625B69]">Official signed PDF with Head of School remarks</p>
                </div>
                <button
                  onClick={() => alert("Report card PDF generation simulated for demo pupil.")}
                  className="px-4 py-2 rounded-lg bg-[#581C87] text-white text-xs font-bold hover:bg-[#29166F] cursor-pointer"
                >
                  Download PDF
                </button>
              </div>
            </div>
          )}

          {activeTab === "fees" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-white border border-[#E8E2ED]">
                <p className="text-xs font-bold text-[#29166F] uppercase tracking-wider mb-2">
                  Term Fee Billing Schedule
                </p>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-[#E8E2ED]">
                    <span>Primary 3 Tuition &amp; Learning Materials</span>
                    <span className="font-bold text-[#29166F]">Verified Paid</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#E8E2ED]">
                    <span>School Co-Curricular Clubs &amp; Library</span>
                    <span className="font-bold text-[#29166F]">Verified Paid</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span>Outstanding Balance</span>
                    <span className="font-extrabold text-emerald-700">₦ 0.00</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "notices" && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-[#F7F4FA] border border-[#E8E2ED]">
                <div className="flex justify-between text-xs text-[#581C87] font-semibold mb-1">
                  <span>School Office Notice</span>
                  <span>This Week</span>
                </div>
                <h4 className="text-sm font-bold text-[#29166F] mb-1">
                  Early Phonics and Science Exhibition Preparation
                </h4>
                <p className="text-xs text-[#625B69] leading-relaxed">
                  Parents are kindly reminded of our upcoming pupil exhibitions. Primary 1 through 6 will showcase project displays in the main hall.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#F7F4FA] border border-[#E8E2ED]">
                <div className="flex justify-between text-xs text-[#581C87] font-semibold mb-1">
                  <span>Health &amp; Wellness</span>
                  <span>Ongoing</span>
                </div>
                <h4 className="text-sm font-bold text-[#29166F] mb-1">
                  Morning Arrival &amp; Playground Readiness
                </h4>
                <p className="text-xs text-[#625B69] leading-relaxed">
                  Gates open at 7:15 AM. Assembly begins promptly at 7:45 AM. Thank you for fostering punctual attendance.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-6 bg-[#F7F4FA] border-t border-[#E8E2ED] flex items-center justify-between text-xs text-[#625B69]">
          <span>Security: 256-bit Encrypted Session</span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-[#581C87] text-white font-bold hover:bg-[#29166F] cursor-pointer"
          >
            Close Portal
          </button>
        </div>
      </div>
    </div>
  );
};
