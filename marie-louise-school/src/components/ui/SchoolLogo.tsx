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
      {/* Traditional Academic Crest Shield */}
      <div className="relative w-10 h-11 sm:w-11 sm:h-12 flex-shrink-0 flex items-center justify-center">
        <svg
          viewBox="0 0 44 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-xs"
        >
          {/* Shield Outline */}
          <path
            d="M22 2L40 7V24C40 36.5 22 46 22 46C22 46 4 36.5 4 24V7L22 2Z"
            fill={isDark ? "#29166F" : "#29166F"}
            stroke={isDark ? "#E9DB3D" : "#581C87"}
            strokeWidth="1.5"
          />
          {/* Inner Accent Line */}
          <path
            d="M22 5.5L37 9.5V23C37 33.5 22 42 22 42C22 42 7 33.5 7 23V9.5L22 5.5Z"
            fill="none"
            stroke="#E9DB3D"
            strokeWidth="1"
            strokeOpacity="0.85"
          />
          {/* Open Book of Knowledge */}
          <path
            d="M22 17C20 15.5 16 15.5 14 16.5V26C16 25 20 25 22 26.5M22 17C24 15.5 28 15.5 30 16.5V26C28 25 24 25 22 26.5M22 17V26.5"
            stroke="#FFFFFF"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Small Star of Truth */}
          <circle cx="22" cy="11.5" r="1.5" fill="#E9DB3D" />
          {/* Small Initials ML */}
          <text
            x="22"
            y="34"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="7"
            fontFamily="Manrope, sans-serif"
            fontWeight="700"
            letterSpacing="0.8"
          >
            MLS
          </text>
        </svg>
      </div>

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
            Nursery &amp; Primary
          </span>
        </div>
      </div>
    </div>
  );
};
