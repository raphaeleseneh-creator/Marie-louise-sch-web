import React, { useState } from "react";
import { Header } from "./components/layout/Header";
import { Footer } from "./components/layout/Footer";
import { Hero } from "./components/home/Hero";
import { TrustStrip } from "./components/home/TrustStrip";
import { SchoolIntroduction } from "./components/home/SchoolIntroduction";
import { AcademicJourney } from "./components/home/AcademicJourney";
import { LearningExperience } from "./components/home/LearningExperience";
import { WhyMarieLouise } from "./components/home/WhyMarieLouise";
import { SchoolLife } from "./components/home/SchoolLife";
import { LeadershipWelcome } from "./components/home/LeadershipWelcome";
import { AdmissionsSection } from "./components/home/AdmissionsSection";
import { NewsEvents } from "./components/home/NewsEvents";
import { ParentPortalSection } from "./components/home/ParentPortalSection";
import { FinalCTA } from "./components/home/FinalCTA";
import { BookTourModal } from "./components/modals/BookTourModal";
import type { NavTab } from "./types";
import { schoolConfig } from "./data/school";

export default function SchoolWebsite({openParentPortal}:{openParentPortal:()=>void}) {
  const [activeTab, setActiveTab] = useState<NavTab>("home");
  const [isBookTourOpen, setIsBookTourOpen] = useState(false);

  // Smooth Navigation Handler
  const handleNavigate = (tab: NavTab) => {
    setActiveTab(tab);

    if (tab === "home") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (tab === "about") {
      const el = document.getElementById("about");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    } else if (tab === "academics") {
      const el = document.getElementById("academics");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    } else if (tab === "admissions") {
      const el = document.getElementById("admissions");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    } else if (tab === "news-events") {
      const el = document.getElementById("news-events");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    } else if (tab === "contact") {
      const el = document.getElementById("contact");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    } else if (tab === "parent-portal") {
      openParentPortal();
    }
  };

  const handleOpenAdmissions = () => {
    window.location.assign(schoolConfig.admissionsFormUrl);
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#27232D]">
      {/* Sticky Header Navigation */}
      <Header
        activeTab={activeTab}
        onNavigate={handleNavigate}
        onOpenAdmissions={() => handleOpenAdmissions()}
        onOpenParentPortal={openParentPortal}
      />

      {/* Main Homepage Editorial Narrative */}
      <main className="flex-1">
        {/* 01. Hero Section */}
        <Hero
          onExploreAdmissions={() => handleNavigate("admissions")}
          onDiscoverSchool={() => handleNavigate("about")}
        />

        {/* 02. Restrained Trust & Identity Strip */}
        <TrustStrip />

        {/* 03. School Introduction & Foundational Values */}
        <SchoolIntroduction />

        {/* 04. Academic Journey (Strictly Early Years & Primary) */}
        <AcademicJourney
          onSelectClassForAdmission={handleOpenAdmissions}
        />

        {/* 05. Pedagogical Learning Experiences (Beyond the Classroom) */}
        <LearningExperience />

        {/* 06. Why Marie Louise (Confident, Curious, Compassionate, Capable) */}
        <WhyMarieLouise />

        {/* 07. Authentic School Life Photographic Mosaic */}
        <SchoolLife />

        {/* 08. Warm Leadership Welcome */}
        <LeadershipWelcome />

        {/* 09. Admissions & Single-Select Class Inquiry */}
        <AdmissionsSection
          onStartApplication={handleOpenAdmissions}
          onBookTour={() => setIsBookTourOpen(true)}
        />

        {/* 10. News & Events Chronicle */}
        <NewsEvents />

        {/* 11. Dedicated Parent Portal Section */}
        <ParentPortalSection
          onOpenPortal={openParentPortal}
        />

        {/* 12. Final Emotional Call to Action */}
        <FinalCTA
          onExploreAdmissions={() => handleOpenAdmissions()}
          onContactSchool={() => handleNavigate("contact")}
        />
      </main>

      {/* Deep Purple Editorial Footer */}
      <Footer
        onNavigate={handleNavigate}
        onOpenAdmissions={() => handleOpenAdmissions()}
        onOpenParentPortal={openParentPortal}
      />

      {/* Interactive Modals */}
      <BookTourModal
        isOpen={isBookTourOpen}
        onClose={() => setIsBookTourOpen(false)}
      />
    </div>
  );
}
