import type { Metadata } from "next";
import { Source_Sans_3 } from "next/font/google";
import { OfflineSupport } from "@/components/OfflineSupport";
import "./globals.css";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source",
});

export const metadata: Metadata = {
  title: "Pumzi Care",
  description: "Offline pediatric danger-sign support: intake, WHO IMCI rules and care handoff.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${sourceSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <OfflineSupport />
      </body>
    </html>
  );
}
