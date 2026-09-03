import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Genesis Group — Birthday Flyer Generator",
  description: "Turn an HRM export into the monthly birthday celebrants flyer.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen text-slate-800">{children}</body>
    </html>
  );
}
