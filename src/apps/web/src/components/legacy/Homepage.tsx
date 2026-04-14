// components/Homepage.tsx
"use client";

import React from "react";
import HeroSection from "@/components/legacy/layout/heroSection";

const Homepage: React.FC = () => {
  return (
    <div className="flex min-h-0 flex-col overflow-visible">
      <div className="flex min-h-0 flex-col overflow-visible px-4 pb-6 sm:px-6 lg:px-8">
        <HeroSection />
      </div>
    </div>
  );
};

export default Homepage;
