import type React from "react";
import type { Metadata } from "next";
import "./globals.css";
import { COLOURS } from "@/utils/constants";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/Providers";
import Sidebar from "@/components/legacy/Sidebar";
import JobList from "@/components/legacy/jobs/jobList";
import { Footer } from "@/components/legacy/layout/footer";

const canadianFlagEmoji = "\u{1F1E8}\u{1F1E6}";
const emojiFaviconSvg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>
    <text x='5' y='65' font-size='45'>🏗️</text>
    <text x='50' y='65' font-size='45'>${canadianFlagEmoji}</text>
  </svg>`;
const faviconDataUrl = `data:image/svg+xml,${encodeURIComponent(emojiFaviconSvg)}`;
const title = `Canadian Startup Jobs - Build Canada 🏗️${canadianFlagEmoji}`;
const description = "Apply to jobs at Canadian owned and operated startups";

// ensure metadataBase is always a valid absolute URL
const rawBase = process.env.NEXT_PUBLIC_BASE_URL;
const normalizedBase =
  rawBase && !/^https?:\/\//i.test(rawBase) ? `https://${rawBase}` : rawBase || "https://buildcanada.com";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const metadata: Metadata = {
  metadataBase: new URL(normalizedBase),
  title,
  description,
  icons: {
    icon: faviconDataUrl,
    apple: faviconDataUrl,
    shortcut: faviconDataUrl,
  },
  openGraph: {
    title,
    description,
    images: [
      {
        url: `${basePath}/canadian-startup-jobs-og.png`,
        width: 1200,
        height: 630,
        alt: "Canadian Startup Jobs board preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [`${basePath}/canadian-startup-jobs-og.png`],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        style={{ backgroundColor: COLOURS.background }}
        className="text-neutral-900"
      >
        <div
          className="flex min-h-screen flex-col px-4 py-5 md:px-5"
          style={{ backgroundColor: COLOURS.background }}
        >
          <div
            className="mx-auto flex w-full max-w-6xl flex-1 flex-col border-2 border-black"
            style={{ backgroundColor: COLOURS.background }}
          >
            <main
              className="flex-1 overflow-hidden px-4 py-4 sm:px-5 lg:px-8"
              style={{ backgroundColor: COLOURS.background }}
            >
              <Providers>
                <div className="grid h-full gap-6 overflow-visible lg:grid-cols-[340px_minmax(0,1fr)]">
                  {/* On desktop: full sidebar (filters + job list) in left column */}
                  <Sidebar pageTitle="Canadian Startup Jobs" />
                  {/* On desktop: job detail in right column. On mobile: between sidebar-top and job list */}
                  <div
                    className="min-h-0 overflow-visible"
                    style={{ backgroundColor: COLOURS.background }}
                  >
                    {children}
                  </div>
                  {/* Mobile-only job list rendered after job detail so order is: filters → posting → list */}
                  <div className="lg:hidden">
                    <JobList />
                  </div>
                </div>
              </Providers>
            </main>
            <Footer />
          </div>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
