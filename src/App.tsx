import { useState, useEffect } from "react";
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
import { AdmissionModal } from "./components/modals/AdmissionModal";
import { ParentPortalPage } from "./components/portal/ParentPortalPage";
import { BookTourModal } from "./components/modals/BookTourModal";
import type { NavTab } from "./types";
import type { SchoolClass } from "./data/school";

const isPortalPath = () => {
  const path = window.location.pathname.replace(/\/$/, "");
  return path === "/parent-portal";
};

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>("home");
  const [isAdmissionOpen, setIsAdmissionOpen] = useState(false);
  const [isParentPortalPage, setIsParentPortalPage] = useState(isPortalPath);
  const [isBookTourOpen, setIsBookTourOpen] = useState(false);
  const [selectedClassForAdmission, setSelectedClassForAdmission] = useState<SchoolClass | undefined>();

  useEffect(() => {
    const handlePopState = () => setIsParentPortalPage(isPortalPath());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const openParentPortal = () => {
    if (window.location.pathname.replace(/\/$/, "") !== "/parent-portal") {
      window.history.pushState({}, "", "/parent-portal");
    }
    window.scrollTo({ top: 0 });
    setIsParentPortalPage(true);
  };

  const closeParentPortal = () => {
    if (window.location.pathname !== "/" || window.location.hash) {
      window.history.pushState({}, "", "/");
    }
    window.scrollTo({ top: 0 });
    setIsParentPortalPage(false);
  };

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
      const el = document.getElementById("admissions");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    } else if (tab === "parent-portal") {
      openParentPortal();
    }
  };

  if (isParentPortalPage) {
    return <ParentPortalPage onBackToSchool={closeParentPortal} />;
  }

  const handleOpenAdmissions = (preselectedClass?: SchoolClass) => {
    setSelectedClassForAdmission(preselectedClass);
    setIsAdmissionOpen(true);
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
          onSelectClassForAdmission={(cls) => handleOpenAdmissions(cls)}
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
          onStartApplication={(cls) => handleOpenAdmissions(cls)}
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
          onContactSchool={() => setIsBookTourOpen(true)}
        />
      </main>

      {/* Deep Purple Editorial Footer */}
      <Footer
        onNavigate={handleNavigate}
        onOpenAdmissions={() => handleOpenAdmissions()}
        onOpenParentPortal={openParentPortal}
      />

      {/* Interactive Modals */}
      <AdmissionModal
        isOpen={isAdmissionOpen}
        onClose={() => {
          setIsAdmissionOpen(false);
          setSelectedClassForAdmission(undefined);
        }}
        preselectedClass={selectedClassForAdmission}
      />

      <BookTourModal
        isOpen={isBookTourOpen}
        onClose={() => setIsBookTourOpen(false)}
      />
    </div>
  );
}
