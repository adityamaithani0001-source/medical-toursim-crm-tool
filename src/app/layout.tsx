import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "./components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Medical Tourism CRM",
  description: "Patient pipeline management for medical tourism coordinators",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: -1,
            backgroundColor: '#f8faff',
            backgroundImage: [
              'radial-gradient(ellipse at 20% 20%, rgba(99,102,241,0.35) 0%, transparent 55%)',
              'radial-gradient(ellipse at 80% 80%, rgba(16,185,129,0.28) 0%, transparent 55%)',
              'radial-gradient(ellipse at 55% 45%, rgba(59,130,246,0.22) 0%, transparent 60%)',
            ].join(', '),
          }}
        />
        <Navbar />
        {children}
      </body>
    </html>
  );
}
