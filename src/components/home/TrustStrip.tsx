import React from "react";
import { schoolConfig } from "../../data/school";

const identityPoints = [
  ["Academic journey", "Nursery to Primary 6"],
  ["Our home", schoolConfig.location],
  ["Our promise", `\u201c${schoolConfig.motto}\u201d`],
  ["Whole-child focus", "Learning, character, confidence"],
];

export const TrustStrip: React.FC = () => {
  return (
    <section className="bg-[#29166F] text-white" aria-label="School identity">
      <div className="mx-auto grid max-w-7xl grid-cols-2 px-5 sm:px-8 lg:grid-cols-4 lg:px-10">
        {identityPoints.map(([label, value], index) => (
          <div
            key={label}
            className={`py-6 sm:py-7 lg:px-7 ${
              index % 2 === 1 ? "border-l border-white/15 pl-5" : "pr-5"
            } ${index > 1 ? "border-t border-white/15 lg:border-t-0" : ""} ${
              index > 0 ? "lg:border-l lg:border-white/15" : "lg:pl-0"
            }`}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#E9DB3D]">
              {label}
            </p>
            <p className="mt-1.5 text-sm font-bold leading-snug text-white sm:text-[15px]">
              {value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};
