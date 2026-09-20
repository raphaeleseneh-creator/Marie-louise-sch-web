import React from "react";

interface SchoolLogoProps {
  variant?: "light" | "dark" | "compact";
  className?: string;
  onClick?: () => void;
}

export const SchoolLogo: React.FC<SchoolLogoProps> = ({
  variant = "light",
  className = "",
  onClick,
}) => {
  const isDark = variant === "dark";

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-3 select-none cursor-pointer transition-opacity hover:opacity-95 ${className}`}
    >
      <img
        src="/images/school/marie-louise-crest.jpg"
        alt="Marie Louise School crest"
        className="h-12 w-9 sm:h-14 sm:w-11 flex-shrink-0 object-contain mix-blend-multiply"
        width="477"
        height="631"
      />

      {/* Typography */}
      <div className="flex flex-col text-left">
        <span
          className={`text-[15px] sm:text-[17px] font-extrabold tracking-tight leading-none ${
            isDark ? "text-white" : "text-[#29166F]"
          }`}
        >
          MARIE LOUISE SCHOOL
        </span>
        <div className="flex items-center gap-2 mt-1">
          <span
            className={`text-[10px] sm:text-[11px] font-semibold tracking-wider uppercase ${
              isDark ? "text-[#E9DB3D]" : "text-[#581C87]"
            }`}
          >
            Surulere, Lagos
          </span>
          <span
            className={`text-[9px] px-1.5 py-0.5 rounded-xs font-medium tracking-wide ${
              isDark
                ? "bg-white/10 text-white/90"
                : "bg-[#F7F4FA] text-[#625B69] border border-[#E8E2ED]"
            }`}
          >
            Be Truthful
          </span>
        </div>
      </div>
    </div>
  );
};
