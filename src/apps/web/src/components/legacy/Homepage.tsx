// components/Homepage.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import Header from "@/components/legacy/layout/header";
import HeroSection from "@/components/legacy/layout/heroSection";
import { COLOURS } from "@/utils/constants";

const Homepage: React.FC = () => {
  const heroViewportRef = useRef<HTMLDivElement | null>(null);
  const [heroMaxHeight, setHeroMaxHeight] = useState<number | undefined>();
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mediaQuery.matches);

    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const update = () => {
      setHeroMaxHeight(() => {
        if (!isDesktop) return undefined;
        const node = heroViewportRef.current;
        if (!node) return undefined;

        const { top } = node.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const gutter = 40;
        return Math.max(200, viewportHeight - top - gutter);
      });
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update);

    let observer: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(update);
      if (heroViewportRef.current) {
        observer.observe(heroViewportRef.current);
      }
    }

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update);
      observer?.disconnect();
    };
  }, [isDesktop]);

  return (
    <div className="flex min-h-0 flex-col overflow-visible">
      <div className="shrink-0">
        <Header />
      </div>
      {isDesktop && (
        <div className="flex min-h-0 flex-col overflow-visible">
          <div
            ref={heroViewportRef}
            className="flex-1 min-h-0 overflow-hidden px-4 pb-6 sm:px-6 lg:px-8"
            style={{ backgroundColor: COLOURS.background }}
          >
            <HeroSection maxHeight={heroMaxHeight} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Homepage;
