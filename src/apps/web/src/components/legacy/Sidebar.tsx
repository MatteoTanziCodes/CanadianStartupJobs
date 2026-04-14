"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import FAQModal from "./FAQModal";
import JobList from "@/components/legacy/jobs/jobList";
import Header from "@/components/legacy/layout/header";
import BuildCanada from "../common/svg/BuildCanada";

function Sidebar({ pageTitle }: { pageTitle: string }) {
  const [isFAQModalOpen, setIsFAQModalOpen] = useState(false);
  const listViewportRef = useRef<HTMLDivElement>(null);
  const [listMaxHeight, setListMaxHeight] = useState<number>();

  useEffect(() => {
    const update = () => {
      const node = listViewportRef.current;
      if (!node) return;
      const { top } = node.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const gutter = 40; // leave room for the border and footer gap
      setListMaxHeight(Math.max(160, viewportHeight - top - gutter));
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);

    let observer: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(update);
      if (listViewportRef.current) {
        observer.observe(listViewportRef.current);
      }
    }

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      observer?.disconnect();
    };
  }, []);

  return (
    <div className="col-span-1 flex h-full min-h-0 flex-col overflow-hidden">
      <div className="mb-4 shrink-0">
        <Link href="https://buildcanada.com" className="block bg-[#8b2332] p-3 w-fit pr-8">
          <BuildCanada />
        </Link>
      </div>
      <Link href="/" className="text-4xl lg:text-5xl font-bold mb-6 text-[#8b2332]">{pageTitle}</Link>
      <div className="mb-6 shrink-0">
        <p className="text-gray-900 mb-4">
          A community-driven job board connecting top talent with Canadian-owned and operated startups.
        </p>
        <button
          onClick={() => setIsFAQModalOpen(true)}
          className="font-mono text-sm text-[#8b2332] cursor-pointer hover:text-[#721c28] transition-colors"
        >
          FAQ
        </button>
      </div>
      <FAQModal
        isOpen={isFAQModalOpen}
        onClose={() => setIsFAQModalOpen(false)}
      />
      <div className="mb-4 shrink-0">
        <Header className="rounded-2xl border border-black/10 shadow-sm" />
      </div>
      <div ref={listViewportRef} className="flex-1 min-h-0 overflow-hidden">
        <JobList maxHeight={listMaxHeight} />
      </div>
    </div>
  );
}

export default Sidebar;
