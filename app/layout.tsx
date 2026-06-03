import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "CadTube",
  description: "Download videos from YouTube.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" >
      <body className="w-full h-full bg-[#e2e1dc]">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
