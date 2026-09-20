import React from "react";
import { Quote } from "lucide-react";
import { schoolConfig } from "../../data/school";

export const LeadershipWelcome: React.FC = () => {
  return (
    <section className="py-20 lg:py-28 bg-[#F7F4FA]/70 border-t border-[#E8E2ED]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Portrait Image with Editorial Framing (5 cols) */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-3xl overflow-hidden shadow-[0_16px_40px_rgba(41,22,111,0.09)] border border-white">
              <img
                src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=900&q=80"
                alt="Head of School welcoming parents and pupils"
                className="w-full h-[420px] sm:h-[480px] object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#29166F]/80 via-transparent to-transparent" />
              <div className="absolute bottom-5 left-5 right-5 text-white">
                <p className="text-xs font-bold uppercase tracking-wider text-[#E9DB3D]">
                  Office of the Head of School
                </p>
                <p className="text-lg font-bold">Marie Louise School</p>
                <p className="text-xs text-white/80">Surulere, Lagos</p>
              </div>
            </div>

            {/* Geometric Accent Line */}
            <div className="hidden sm:block absolute -bottom-4 -right-4 w-32 h-32 border-2 border-[#581C87]/20 rounded-2xl -z-10" />
          </div>

          {/* Welcome Message & Quote (7 cols) */}
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 mb-4 text-xs font-semibold uppercase tracking-widest text-[#581C87]">
              <Quote className="w-3.5 h-3.5 text-[#581C87]" />
              <span>A Warm Welcome</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-[2.65rem] font-extrabold text-[#29166F] leading-tight tracking-tight mb-6">
              &ldquo;EVERY CHILD DESERVES
              <br />
              AN UNWAVERING <span className="text-[#581C87]">FOUNDATION.&rdquo;</span>
            </h2>

            <div className="space-y-4 text-base text-[#625B69] leading-relaxed mb-8">
              <p>
                Welcome to Marie Louise School. When parents entrust their child to us
                in Transition or Primary 1, they are not simply choosing a classroom;
                they are choosing partners in shaping their child&apos;s character,
                confidence, and love for knowledge.
              </p>
              <p>
                Our philosophy is simple yet uncompromising: combine rigorous,
                thoughtful academic discipline with genuine warmth and respect.
                Guided by our founding motto, <em>&ldquo;{schoolConfig.motto}&rdquo;</em>,
                we cultivate young minds who know the value of honesty, hard work,
                and kindness to others.
              </p>
              <p>
                Whether in our early years sensory spaces or our bustling primary
                classrooms, our dedicated teachers see every child as an individual
                with immense promise. We invite you to walk our halls and experience
                the spirit of our community.
              </p>
            </div>

            {/* Signature & Leadership Note */}
            <div className="pt-6 border-t border-[#E8E2ED] flex items-center justify-between">
              <div>
                <p className="text-base font-bold text-[#29166F]">
                  The School Leadership
                </p>
                <p className="text-xs text-[#625B69] font-medium">
                  Head of School &bull; Marie Louise School, Surulere
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold text-[#581C87] bg-white px-3 py-1 rounded-md border border-[#E8E2ED]">
                  Founded on Truth
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
