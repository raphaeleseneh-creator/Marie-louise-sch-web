import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion } from "motion/react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  FileCheck2,
  FileText,
  Image as ImageIcon,
  Info,
  ShieldAlert,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import type {
  ParentDashboardData,
  PaymentProof,
  PaymentProofMethod,
} from "../../types/portal";
import { portalService } from "../../services/portalService";

interface PaymentProofModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ParentDashboardData;
  initialInvoiceId?: string;
  initialPupilId?: string;
  onSuccess: (newProof: PaymentProof) => void;
}

const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"];
const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const PAYMENT_METHODS: PaymentProofMethod[] = [
  "Bank Transfer",
  "Mobile Banking App",
  "USSD",
  "POS / Branch Teller",
  "Direct Debit",
];

const formatNaira = (amount: number): string => {
  return `₦${amount.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const PaymentProofModal: React.FC<PaymentProofModalProps> = ({
  isOpen,
  onClose,
  data,
  initialInvoiceId,
  initialPupilId,
  onSuccess,
}) => {
  // 1: Form & File Upload | 2: Review & Verify | 3: Confirmation
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form states
  const [selectedPupilId, setSelectedPupilId] = useState<string>(
    initialPupilId || data.selectedPupil?.id || data.pupils[0]?.id || ""
  );
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(
    initialInvoiceId || ""
  );
  const [amount, setAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentProofMethod>("Bank Transfer");
  const [bankName, setBankName] = useState<string>("Guaranty Trust Bank");
  const [transactionRef, setTransactionRef] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // File upload states
  const [selectedFileName, setSelectedFileName] = useState<string>("");
  const [selectedFileSize, setSelectedFileSize] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploadingDemonstration, setIsUploadingDemonstration] = useState<boolean>(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validation and submit states
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [createdProof, setCreatedProof] = useState<PaymentProof | null>(null);
  const [hasCopiedRef, setHasCopiedRef] = useState<boolean>(false);

  // Invoices filtered by selected pupil
  const pupilInvoices = useMemo(() => {
    return data.invoices.filter((inv) => inv.pupilId === selectedPupilId);
  }, [data.invoices, selectedPupilId]);

  // Selected pupil object
  const currentPupil = useMemo(() => {
    return data.pupils.find((p) => p.id === selectedPupilId) || data.pupils[0];
  }, [data.pupils, selectedPupilId]);

  // Selected invoice object
  const currentInvoice = useMemo(() => {
    return (
      pupilInvoices.find((inv) => inv.id === selectedInvoiceId) ||
      pupilInvoices[0] ||
      data.invoices[0]
    );
  }, [pupilInvoices, selectedInvoiceId, data.invoices]);

  // Initialize or reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setFormError(null);
      setFileError(null);
      setCreatedProof(null);
      setHasCopiedRef(false);

      const targetPupilId =
        initialPupilId || data.selectedPupil?.id || data.pupils[0]?.id || "";
      setSelectedPupilId(targetPupilId);

      const matchingInvoices = data.invoices.filter((i) => i.pupilId === targetPupilId);
      const targetInvoice =
        initialInvoiceId && matchingInvoices.some((i) => i.id === initialInvoiceId)
          ? initialInvoiceId
          : matchingInvoices[0]?.id || data.invoices[0]?.id || "";

      setSelectedInvoiceId(targetInvoice);

      const foundInv = data.invoices.find((i) => i.id === targetInvoice);
      if (foundInv) {
        setAmount(foundInv.balance > 0 ? foundInv.balance : foundInv.amountDue);
      }
    }
  }, [isOpen, initialPupilId, initialInvoiceId, data.pupils, data.invoices, data.selectedPupil]);

  // When pupil selection changes in the form, adjust invoice and default amount
  const handlePupilChange = (newPupilId: string) => {
    setSelectedPupilId(newPupilId);
    const availableForChild = data.invoices.filter((i) => i.pupilId === newPupilId);
    if (availableForChild.length > 0) {
      setSelectedInvoiceId(availableForChild[0].id);
      setAmount(
        availableForChild[0].balance > 0
          ? availableForChild[0].balance
          : availableForChild[0].amountDue
      );
    } else {
      setSelectedInvoiceId("");
      setAmount(0);
    }
  };

  // When invoice selection changes, update amount to balance
  const handleInvoiceChange = (newInvoiceId: string) => {
    setSelectedInvoiceId(newInvoiceId);
    const found = data.invoices.find((i) => i.id === newInvoiceId);
    if (found) {
      setAmount(found.balance > 0 ? found.balance : found.amountDue);
    }
  };

  // Format file size nicely
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Handle file validation and simulated upload progress
  const processSelectedFile = (file: File) => {
    setFileError(null);

    // Validate file extension
    const extension = `.${file.name.split(".").pop()?.toLowerCase()}`;
    const hasValidExt = ALLOWED_EXTENSIONS.includes(extension);
    const hasValidMime =
      ALLOWED_MIME_TYPES.includes(file.type) ||
      (extension === ".png" && file.type.includes("png")) ||
      (extension === ".jpg" && file.type.includes("jpeg")) ||
      (extension === ".jpeg" && file.type.includes("jpeg")) ||
      (extension === ".pdf" && file.type.includes("pdf"));

    if (!hasValidExt && !hasValidMime) {
      setFileError(
        `Invalid file type "${extension}". Please upload a PDF, JPG, JPEG, or PNG document only.`
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Validate file size (5MB max)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setFileError(
        `File exceeds the 5 MB limit. Selected file size is ${(file.size / (1024 * 1024)).toFixed(2)} MB. Please choose a smaller file.`
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Valid file
    setSelectedFileName(file.name);
    setSelectedFileSize(formatFileSize(file.size));

    // Demonstrate upload progress (0% -> 100%)
    setIsUploadingDemonstration(true);
    setUploadProgress(15);
    setTimeout(() => setUploadProgress(48), 120);
    setTimeout(() => setUploadProgress(82), 260);
    setTimeout(() => {
      setUploadProgress(100);
      setIsUploadingDemonstration(false);
    }, 450);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFileName("");
    setSelectedFileSize("");
    setUploadProgress(0);
    setIsUploadingDemonstration(false);
    setFileError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Step 1 Validation -> Proceed to Review Step 2
  const handleProceedToReview = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedPupilId) {
      setFormError("Please select the relevant child.");
      return;
    }
    if (!selectedInvoiceId) {
      setFormError("Please select an invoice to allocate this payment to.");
      return;
    }
    if (!amount || amount <= 0) {
      setFormError("Please specify a valid payment amount greater than zero.");
      return;
    }
    if (!paymentDate) {
      setFormError("Please provide the date of the payment transaction.");
      return;
    }
    if (!bankName.trim()) {
      setFormError("Please enter the sending or receiving bank name.");
      return;
    }
    if (!transactionRef.trim()) {
      setFormError("Please enter the bank transaction or session reference.");
      return;
    }
    if (!selectedFileName) {
      setFormError("Please attach a payment receipt or transfer advice document (PDF, JPG, or PNG).");
      return;
    }

    setStep(2);
  };

  // Step 2 Review -> Final Demo Submission
  const handleConfirmSubmission = async () => {
    setIsSubmitting(true);
    setFormError(null);

    try {
      const newProof = await portalService.submitPaymentProof({
        invoiceId: selectedInvoiceId,
        pupilId: selectedPupilId,
        parentId: data.parent.id,
        amount,
        bankName: bankName.trim(),
        paymentDate,
        paymentMethod,
        referenceNumber: transactionRef.trim(),
        receiptFileName: selectedFileName,
        receiptFileSize: selectedFileSize,
        receiptFileUrl: `/documents/proofs/${selectedFileName}`,
        notes: notes.trim() || undefined,
      });

      setCreatedProof(newProof);
      setStep(3);
      onSuccess(newProof);
    } catch {
      setFormError("Failed to record payment proof. Please verify all details and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Copy tracking reference helper
  const handleCopyReference = () => {
    if (createdProof?.referenceNumber) {
      navigator.clipboard?.writeText(createdProof.referenceNumber);
      setHasCopiedRef(true);
      setTimeout(() => setHasCopiedRef(false), 3000);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#160B35]/60 p-4 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-proof-modal-title"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden my-6 border border-[#E5DFE9]"
      >
        {/* Modal Header */}
        <div className="bg-[#29166F] p-5 sm:p-6 text-white flex items-center justify-between border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#E9DB3D] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#29166F]">
                Bursary & Accounts
              </span>
              <span className="text-xs text-white/70">Airtable Linked-Record Pipeline</span>
            </div>
            <h2 id="payment-proof-modal-title" className="mt-1 text-lg sm:text-xl font-extrabold text-white">
              {step === 1 && "Submit Bank Payment Proof"}
              {step === 2 && "Review Payment Details Before Submission"}
              {step === 3 && "Payment Proof Submitted for Verification"}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Stepper Progress Bar */}
        <div className="bg-[#F8F6FA] px-6 py-3 border-b border-[#EEE9F1] flex items-center justify-between text-xs font-bold text-[#625B69]">
          <div className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-extrabold ${
                step >= 1 ? "bg-[#581C87] text-white" : "bg-[#E5DFE9] text-[#625B69]"
              }`}
            >
              1
            </span>
            <span className={step === 1 ? "text-[#581C87] font-extrabold" : ""}>Details & Proof</span>
          </div>

          <ArrowRight className="h-3.5 w-3.5 text-[#BBAFC4]" />

          <div className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-extrabold ${
                step >= 2 ? "bg-[#581C87] text-white" : "bg-[#E5DFE9] text-[#625B69]"
              }`}
            >
              2
            </span>
            <span className={step === 2 ? "text-[#581C87] font-extrabold" : ""}>Review & Verify</span>
          </div>

          <ArrowRight className="h-3.5 w-3.5 text-[#BBAFC4]" />

          <div className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-extrabold ${
                step === 3 ? "bg-[#087A50] text-white" : "bg-[#E5DFE9] text-[#625B69]"
              }`}
            >
              3
            </span>
            <span className={step === 3 ? "text-[#087A50] font-extrabold" : ""}>Confirmation</span>
          </div>
        </div>

        {/* STEP 1: Form & File Upload */}
        {step === 1 && (
          <form onSubmit={handleProceedToReview} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            {formError && (
              <div
                role="alert"
                className="rounded-xl border border-[#EF4444]/30 bg-[#FEF2F2] p-3.5 text-xs text-[#B91C1C] flex items-start gap-2.5"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {/* Child and Invoice Selectors */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-[#342D3A] mb-1.5">
                  1. Select Enrolled Child <span className="text-[#EF4444]">*</span>
                </label>
                <select
                  value={selectedPupilId}
                  onChange={(e) => handlePupilChange(e.target.value)}
                  className="h-11 w-full rounded-xl border border-[#DCD5E1] bg-white px-3.5 text-sm font-bold text-[#29166F] outline-none focus:border-[#581C87] focus:ring-2 focus:ring-[#581C87]/15 transition"
                  required
                >
                  {data.pupils.map((pupil) => (
                    <option key={pupil.id} value={pupil.id}>
                      {pupil.fullName} ({pupil.class} · {pupil.admissionNumber})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-[#817887]">
                  Fees will be credited to this pupil&apos;s ledger.
                </p>
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-[#342D3A] mb-1.5">
                  2. Allocate to Invoice <span className="text-[#EF4444]">*</span>
                </label>
                <select
                  value={selectedInvoiceId}
                  onChange={(e) => handleInvoiceChange(e.target.value)}
                  className="h-11 w-full rounded-xl border border-[#DCD5E1] bg-white px-3.5 text-sm font-bold text-[#29166F] outline-none focus:border-[#581C87] focus:ring-2 focus:ring-[#581C87]/15 transition"
                  required
                >
                  {pupilInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} — {inv.title} (Bal: {formatNaira(inv.balance)})
                    </option>
                  ))}
                  {pupilInvoices.length === 0 && (
                    <option value="" disabled>
                      No active invoices for this pupil
                    </option>
                  )}
                </select>
                <p className="mt-1 text-[11px] text-[#817887]">
                  {currentInvoice
                    ? `Term: ${currentInvoice.term} · Due: ${currentInvoice.dueDate}`
                    : "Select child to view invoices."}
                </p>
              </div>
            </div>

            {/* Amount and Payment Date */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-[#342D3A] mb-1.5">
                  3. Amount Paid (₦) <span className="text-[#EF4444]">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-extrabold text-[#581C87]">
                    ₦
                  </span>
                  <input
                    type="number"
                    min="100"
                    step="500"
                    value={amount || ""}
                    onChange={(e) => setAmount(Number(e.target.value) || 0)}
                    placeholder="e.g. 250000"
                    required
                    className="h-11 w-full rounded-xl border border-[#DCD5E1] bg-white pl-8 pr-3.5 text-sm font-extrabold text-[#29166F] outline-none focus:border-[#581C87] focus:ring-2 focus:ring-[#581C87]/15 transition"
                  />
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px]">
                  <span className="text-[#817887]">
                    Formatted: <strong className="text-[#087A50]">{formatNaira(amount)}</strong>
                  </span>
                  {currentInvoice && (
                    <button
                      type="button"
                      onClick={() => setAmount(currentInvoice.balance)}
                      className="text-[#581C87] hover:underline font-bold cursor-pointer"
                    >
                      Fill balance ({formatNaira(currentInvoice.balance)})
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-[#342D3A] mb-1.5">
                  4. Payment Date <span className="text-[#EF4444]">*</span>
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  required
                  className="h-11 w-full rounded-xl border border-[#DCD5E1] bg-white px-3.5 text-sm font-bold text-[#29166F] outline-none focus:border-[#581C87] focus:ring-2 focus:ring-[#581C87]/15 transition"
                />
                <p className="mt-1 text-[11px] text-[#817887]">
                  Date the transfer left your account.
                </p>
              </div>
            </div>

            {/* Payment Method and Bank Name */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-[#342D3A] mb-1.5">
                  5. Payment Method <span className="text-[#EF4444]">*</span>
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentProofMethod)}
                  className="h-11 w-full rounded-xl border border-[#DCD5E1] bg-white px-3.5 text-sm font-bold text-[#29166F] outline-none focus:border-[#581C87] focus:ring-2 focus:ring-[#581C87]/15 transition"
                >
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-[#817887]">Channel used for transaction.</p>
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-[#342D3A] mb-1.5">
                  6. Bank Name <span className="text-[#EF4444]">*</span>
                </label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. Access Bank, Zenith Bank, GTBank"
                  required
                  className="h-11 w-full rounded-xl border border-[#DCD5E1] bg-white px-3.5 text-sm font-bold text-[#29166F] outline-none focus:border-[#581C87] focus:ring-2 focus:ring-[#581C87]/15 transition"
                />
                <p className="mt-1 text-[11px] text-[#817887]">Originating financial institution.</p>
              </div>
            </div>

            {/* Bank Reference and Notes */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-[#342D3A] mb-1.5">
                  7. Bank / Transaction Reference <span className="text-[#EF4444]">*</span>
                </label>
                <input
                  type="text"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  placeholder="e.g. FT-GTB-8921441 or 0902671881"
                  required
                  className="h-11 w-full rounded-xl border border-[#DCD5E1] bg-white px-3.5 text-sm font-mono font-bold text-[#29166F] outline-none focus:border-[#581C87] focus:ring-2 focus:ring-[#581C87]/15 transition"
                />
                <p className="mt-1 text-[11px] text-[#817887]">
                  Required for bank statement matching.
                </p>
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-[#342D3A] mb-1.5">
                  8. Depositor Name / Remarks
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Paid by Chidinma Chukwuma via mobile app"
                  className="h-11 w-full rounded-xl border border-[#DCD5E1] bg-white px-3.5 text-sm text-[#29166F] outline-none focus:border-[#581C87] focus:ring-2 focus:ring-[#581C87]/15 transition"
                />
                <p className="mt-1 text-[11px] text-[#817887]">Name on sender account or memo.</p>
              </div>
            </div>

            {/* PROOF FILE UPLOAD ZONE */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-[#342D3A]">
                  9. Upload Transfer Proof / Receipt File <span className="text-[#EF4444]">*</span>
                </label>
                <span className="text-[11px] font-bold text-[#581C87] bg-[#F3E8FF] px-2 py-0.5 rounded">
                  Max size: 5 MB
                </span>
              </div>

              {/* Notice Banner for file requirements */}
              <div className="mb-2.5 rounded-lg border border-[#DCD5E1] bg-[#FBF9FD] p-2.5 text-[11px] text-[#625B69] flex items-center justify-between">
                <span>
                  <strong>Accepted Formats:</strong> PDF, JPG, JPEG, and PNG placeholders only.
                </span>
                <span className="font-extrabold text-[#581C87]">Strictly enforced (≤ 5MB)</span>
              </div>

              {fileError && (
                <div
                  role="alert"
                  className="mb-2.5 rounded-xl border border-[#EF4444]/30 bg-[#FEF2F2] p-3 text-xs text-[#B91C1C] flex items-start gap-2"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{fileError}</span>
                </div>
              )}

              {/* Selected File Card with Demonstration Progress */}
              {selectedFileName ? (
                <div className="rounded-xl border border-[#087A50]/30 bg-[#E5F7ED]/40 p-4 transition">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#087A50] text-white">
                        {selectedFileName.toLowerCase().endsWith(".pdf") ? (
                          <FileText className="h-5 w-5" />
                        ) : (
                          <ImageIcon className="h-5 w-5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold text-[#29166F] truncate">
                          {selectedFileName}
                        </p>
                        <p className="text-[11px] text-[#087A50] font-bold mt-0.5">
                          {selectedFileSize} &bull; Validated format
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#B91C1C] hover:bg-[#FEF2F2] px-2.5 py-1.5 rounded-lg border border-[#EF4444]/20 transition cursor-pointer"
                      title="Remove selected file"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </button>
                  </div>

                  {/* Upload Progress Demonstration Bar */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[10px] font-bold text-[#087A50] mb-1">
                      <span>
                        {uploadProgress < 100
                          ? `Simulating upload progress: ${uploadProgress}%`
                          : "Upload demonstration ready (100%)"}
                      </span>
                      {uploadProgress === 100 && (
                        <span className="inline-flex items-center gap-1 text-[#087A50]">
                          <CheckCircle2 className="h-3 w-3" /> Attached for demo review
                        </span>
                      )}
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[#D1FAE5]">
                      <div
                        className="h-full bg-[#087A50] transition-all duration-300 ease-out"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* Drag and Drop Zone */
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${
                    isDragOver
                      ? "border-[#581C87] bg-[#F3E8FF]/30"
                      : "border-[#DCD5E1] hover:border-[#581C87] hover:bg-[#FBF9FD]"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <UploadCloud className="h-10 w-10 text-[#581C87] mx-auto mb-2" />
                  <p className="text-xs font-extrabold text-[#29166F]">
                    Click to browse or drag and drop payment advice / receipt
                  </p>
                  <p className="text-[11px] text-[#817887] mt-1">
                    Accepts <strong>PDF, JPG, JPEG, and PNG</strong> placeholders only (Maximum 5 MB)
                  </p>
                </div>
              )}
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-4 border-t border-[#EEE9F1]">
              <button
                type="button"
                onClick={onClose}
                className="h-11 rounded-xl border border-[#DCD5E1] px-5 text-xs font-bold text-[#625B69] hover:bg-[#F8F6FA] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUploadingDemonstration}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#581C87] px-6 text-xs font-extrabold text-white hover:bg-[#29166F] shadow-sm transition cursor-pointer disabled:opacity-50"
              >
                <span>Proceed to Review Step</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: Review & Verify Step */}
        {step === 2 && (
          <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            {/* Critical Demonstration / Storage Warning */}
            <div
              role="alert"
              className="rounded-xl border-2 border-[#D97706] bg-[#FFFBEB] p-4 text-xs text-[#92400E] shadow-xs"
            >
              <div className="flex items-start gap-3">
                <ShieldAlert className="h-5 w-5 text-[#D97706] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#B45309]">
                    Demonstration Mode — Proof Not Transmitted to Live Backend
                  </h4>
                  <p className="text-[12px] leading-relaxed">
                    This proof submission is recorded in the local portal demonstration store.
                    Payment advice files and bank references <strong>have NOT been transmitted to the live school bursary or Airtable database</strong> until secure cloud storage and authenticated webhook endpoints are connected.
                  </p>
                </div>
              </div>
            </div>

            {/* Summary Review Card */}
            <div className="rounded-xl border border-[#E5DFE9] bg-[#FDFCFE] overflow-hidden">
              <div className="bg-[#F3E8FF] px-5 py-3 border-b border-[#E5DFE9] flex items-center justify-between">
                <span className="text-xs font-extrabold text-[#581C87] uppercase tracking-wider">
                  Payment Verification Summary
                </span>
                <span className="text-[11px] font-bold text-[#581C87]">
                  {currentPupil.fullName} &bull; {currentPupil.class}
                </span>
              </div>

              <div className="p-5 divide-y divide-[#EEE9F1] text-xs">
                <div className="py-2.5 grid grid-cols-3 gap-2">
                  <span className="text-[#817887] font-bold">Enrolled Pupil:</span>
                  <span className="col-span-2 font-extrabold text-[#29166F]">
                    {currentPupil.fullName} ({currentPupil.admissionNumber} &bull; {currentPupil.class})
                  </span>
                </div>

                <div className="py-2.5 grid grid-cols-3 gap-2">
                  <span className="text-[#817887] font-bold">Allocated Invoice:</span>
                  <span className="col-span-2 font-extrabold text-[#29166F]">
                    {currentInvoice?.invoiceNumber} — {currentInvoice?.title}
                    <span className="block text-[11px] font-normal text-[#817887]">
                      Term: {currentInvoice?.term} &bull; Current Balance: {formatNaira(currentInvoice?.balance || 0)}
                    </span>
                  </span>
                </div>

                <div className="py-2.5 grid grid-cols-3 gap-2">
                  <span className="text-[#817887] font-bold">Payment Amount:</span>
                  <span className="col-span-2 text-base font-extrabold text-[#087A50]">
                    {formatNaira(amount)}
                  </span>
                </div>

                <div className="py-2.5 grid grid-cols-3 gap-2">
                  <span className="text-[#817887] font-bold">Payment Date:</span>
                  <span className="col-span-2 font-bold text-[#29166F]">
                    {new Date(paymentDate).toLocaleDateString("en-NG", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>

                <div className="py-2.5 grid grid-cols-3 gap-2">
                  <span className="text-[#817887] font-bold">Payment Method:</span>
                  <span className="col-span-2 font-bold text-[#29166F]">{paymentMethod}</span>
                </div>

                <div className="py-2.5 grid grid-cols-3 gap-2">
                  <span className="text-[#817887] font-bold">Bank Name:</span>
                  <span className="col-span-2 font-bold text-[#29166F]">{bankName}</span>
                </div>

                <div className="py-2.5 grid grid-cols-3 gap-2">
                  <span className="text-[#817887] font-bold">Transaction Reference:</span>
                  <span className="col-span-2 font-mono font-extrabold text-[#581C87] bg-[#F3E8FF] px-2 py-0.5 rounded w-fit">
                    {transactionRef}
                  </span>
                </div>

                {notes && (
                  <div className="py-2.5 grid grid-cols-3 gap-2">
                    <span className="text-[#817887] font-bold">Depositor Notes:</span>
                    <span className="col-span-2 text-[#342D3A] italic">&ldquo;{notes}&rdquo;</span>
                  </div>
                )}

                <div className="py-2.5 grid grid-cols-3 gap-2">
                  <span className="text-[#817887] font-bold">Attached Proof Document:</span>
                  <span className="col-span-2 flex items-center gap-2 font-bold text-[#29166F]">
                    <FileCheck2 className="h-4 w-4 text-[#087A50]" />
                    <span>{selectedFileName}</span>
                    <span className="text-[11px] text-[#817887]">({selectedFileSize})</span>
                  </span>
                </div>
              </div>
            </div>

            {formError && (
              <div
                role="alert"
                className="rounded-xl border border-[#EF4444]/30 bg-[#FEF2F2] p-3 text-xs text-[#B91C1C] flex items-start gap-2"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-[#EEE9F1]">
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={isSubmitting}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#DCD5E1] px-5 text-xs font-bold text-[#625B69] hover:bg-[#F8F6FA] transition cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Edit</span>
              </button>

              <button
                type="button"
                onClick={handleConfirmSubmission}
                disabled={isSubmitting}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#087A50] px-6 text-xs font-extrabold text-white hover:bg-[#066140] shadow-sm transition cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Recording Submission...</span>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Confirm &amp; Submit Proof</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Confirmation Step */}
        {step === 3 && createdProof && (
          <div className="p-6 sm:p-8 space-y-6 text-center max-h-[75vh] overflow-y-auto">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#E5F7ED] text-[#087A50] mx-auto shadow-sm">
              <CheckCircle2 className="h-10 w-10" />
            </div>

            <div>
              <span className="rounded-full bg-[#FEF3C7] text-[#92400E] px-3 py-1 text-xs font-extrabold uppercase tracking-wider inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> Status: Pending Review
              </span>
              <h3 className="mt-2 text-xl font-extrabold text-[#29166F]">
                Payment Proof Recorded Successfully
              </h3>
              <p className="mt-1 text-xs text-[#625B69] max-w-md mx-auto">
                Your payment advice has been logged into the local demo registry. The reference number below tracks this transaction.
              </p>
            </div>

            {/* Prominent Generated Reference Number Box */}
            <div className="rounded-2xl border-2 border-[#581C87]/20 bg-[#F8F5FB] p-5 max-w-md mx-auto">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#581C87]">
                Proof Tracking Reference
              </span>
              <div className="mt-1.5 flex items-center justify-center gap-3">
                <span className="font-mono text-2xl sm:text-3xl font-extrabold text-[#29166F] tracking-tight">
                  {createdProof.referenceNumber}
                </span>
                <button
                  type="button"
                  onClick={handleCopyReference}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#DCD5E1] bg-white text-[#581C87] hover:bg-[#F3E8FF] transition cursor-pointer"
                  title="Copy reference number"
                  aria-label="Copy reference number"
                >
                  {hasCopiedRef ? (
                    <Check className="h-4 w-4 text-[#087A50]" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
              {hasCopiedRef && (
                <p className="mt-1 text-[11px] font-bold text-[#087A50]">
                  Reference copied to clipboard!
                </p>
              )}
            </div>

            {/* Details Summary */}
            <div className="rounded-xl border border-[#EEE9F1] bg-[#FDFCFE] p-4 text-xs text-left max-w-md mx-auto space-y-2">
              <div className="flex justify-between">
                <span className="text-[#817887]">Pupil:</span>
                <span className="font-bold text-[#29166F]">{currentPupil.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#817887]">Amount:</span>
                <span className="font-extrabold text-[#087A50]">{formatNaira(createdProof.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#817887]">Bank / Ref:</span>
                <span className="font-mono text-[#581C87] font-bold">
                  {createdProof.bankName} ({createdProof.transactionReference})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#817887]">Proof Document:</span>
                <span className="font-bold text-[#29166F] truncate max-w-[200px]">
                  {createdProof.receiptFileName}
                </span>
              </div>
            </div>

            {/* Storage Notice */}
            <div className="rounded-xl border border-[#D97706]/30 bg-[#FFFBEB] p-3 text-xs text-[#92400E] max-w-md mx-auto text-left flex items-start gap-2">
              <Info className="h-4 w-4 shrink-0 text-[#D97706] mt-0.5" />
              <span>
                <strong>Demonstration Warning:</strong> Proof was registered in local state. No files were transferred to external cloud services or Airtable.
              </span>
            </div>

            {/* Next Steps Guidance */}
            <div className="rounded-xl border border-[#EEE9F1] bg-[#FBF9FD] p-4 text-xs text-left max-w-md mx-auto">
              <h5 className="font-extrabold text-[#29166F] mb-1">What happens next?</h5>
              <ul className="list-disc list-inside space-y-1 text-[#625B69] text-[11px]">
                <li>School accounts registry reconciles your bank reference with the daily clearing sheet.</li>
                <li>Once verified, your fee balance updates and an official PDF receipt will be generated.</li>
                <li>You can track review progress anytime under the <strong>Payment Proofs</strong> tab.</li>
              </ul>
            </div>

            {/* Confirmation Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setSelectedFileName("");
                  setSelectedFileSize("");
                  setTransactionRef("");
                  setNotes("");
                }}
                className="w-full sm:w-auto h-11 rounded-xl border border-[#DCD5E1] bg-white px-5 text-xs font-bold text-[#625B69] hover:bg-[#F8F6FA] transition cursor-pointer"
              >
                Submit Another Proof
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto h-11 rounded-xl bg-[#29166F] px-7 text-xs font-extrabold text-white hover:bg-[#1C0D4F] shadow-sm transition cursor-pointer"
              >
                Done &amp; View in History
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
