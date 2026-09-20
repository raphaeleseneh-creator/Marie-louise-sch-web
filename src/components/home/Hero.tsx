import React from "react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

interface HeroProps {
  onExploreAdmissions: () => void;
  onDiscoverSchool: () => void;
}

const reveal = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

export const Hero: React.FC<HeroProps> = ({
  onExploreAdmissions,
  onDiscoverSchool,
}) => {
  const reduceMotion = useReducedMotion();
  const initial = reduceMotion ? false : "hidden";

  return (
    <section className="relative mt-[76px] min-h-[calc(92svh-76px)] overflow-hidden bg-[#1d1047] text-white">
      <motion.img
        src="/images/school/early-years-classroom.jpg"
        alt="Marie Louise School early years pupils learning together"
        className="absolute inset-0 h-full w-full object-cover object-[62%_center] sm:object-center"
        initial={reduceMotion ? false : { scale: 1.06 }}
        animate={{ scale: 1 }}
        transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        loading="eager"
        fetchPriority="high"
      />

      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(22,9,55,0.96)_0%,rgba(31,13,70,0.85)_38%,rgba(31,13,70,0.28)_70%,rgba(31,13,70,0.08)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(18,8,46,0.68)_0%,transparent_45%)]" />

      <div className="relative z-10 mx-auto flex min-h-[calc(92svh-76px)] max-w-7xl flex-col justify-center px-5 pb-32 pt-14 sm:px-8 lg:px-10 lg:pb-36 lg:pt-16">
        <motion.div
          className="max-w-[660px]"
          initial={initial}
          animate="visible"
          transition={{ staggerChildren: reduceMotion ? 0 : 0.11, delayChildren: 0.12 }}
        >
          <motion.div
            variants={reveal}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mb-6 flex flex-wrap items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-white/82"
          >
            <span className="h-px w-8 bg-[#E9DB3D]" />
            <span>Nursery &amp; Primary School</span>
            <span className="h-1 w-1 rounded-full bg-[#E9DB3D]" />
            <span>Surulere, Lagos</span>
          </motion.div>

          <motion.h1
            variants={reveal}
            transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-[650px] text-[3.35rem] font-extrabold leading-[0.96] sm:text-[4.6rem] lg:text-[5.75rem]"
          >
            Strong roots.
            <br />
            <span className="text-[#F3E44C]">Bright minds.</span>
          </motion.h1>

          <motion.p
            variants={reveal}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mt-7 max-w-[580px] text-base leading-relaxed text-white/82 sm:text-lg"
          >
            A joyful, values-led education where every child is known, challenged,
            and prepared to thrive from their very first classroom.
          </motion.p>

          <motion.div
            variants={reveal}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <button
              onClick={onExploreAdmissions}
              className="group inline-flex min-h-12 items-center justify-center gap-3 rounded-lg bg-[#E9DB3D] px-6 text-sm font-extrabold text-[#29166F] transition-all hover:bg-white active:scale-[0.98]"
            >
              Explore Admissions
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
            <button
              onClick={onDiscoverSchool}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/35 bg-white/10 px-6 text-sm font-bold text-white backdrop-blur-md transition-all hover:bg-white hover:text-[#29166F] active:scale-[0.98]"
            >
              Discover Our School
              <ChevronDown className="h-4 w-4" />
            </button>
          </motion.div>
        </motion.div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: reduceMotion ? 0 : 0.65 }}
          className="absolute bottom-6 left-5 right-5 flex items-end justify-between border-t border-white/25 pt-5 sm:left-8 sm:right-8 lg:left-10 lg:right-10"
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-white/78">
            <span className="h-2 w-2 rounded-full bg-[#E9DB3D] shrink-0" />
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/82 sm:text-xs">
              Admissions Open &bull; Early Years &amp; Primary
            </span>
          </div>
          <button
            onClick={onDiscoverSchool}
            className="group hidden items-center gap-3 text-[11px] font-bold uppercase tracking-[0.16em] text-white/70 transition-colors hover:text-white sm:flex"
          >
            Scroll to explore
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/30 transition-transform group-hover:translate-y-1">
              <ChevronDown className="h-4 w-4" />
            </span>
          </button>
        </motion.div>
      </div>
    </section>
  );
};
