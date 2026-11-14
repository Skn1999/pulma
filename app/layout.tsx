import type { Metadata } from "next";
import { Work_Sans, Lato } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

// Type inspired by espoo.fi: Work Sans for text and UI, Lato for headings (see DESIGN.md).
// Neither has Cyrillic; Ukrainian text falls back to the system sans-serif.
const workSans = Work_Sans({ variable: "--font-work-sans", subsets: ["latin", "latin-ext"] });
const lato = Lato({ variable: "--font-lato", subsets: ["latin", "latin-ext"], weight: ["400", "700", "900"] });

export const metadata: Metadata = {
  title: "Pulma — bring a problem, not a job ad",
  description:
    "Companies bring a real problem. Talent answers in their own words. Blind first round, kept promises, booked conversations. Synthetic demo data.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${workSans.variable} ${lato.variable} h-full antialiased`}>
      <body className="h-full">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          Skip to content
        </a>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
