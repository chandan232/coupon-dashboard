import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import Navbar from "@/components/Navbar";
import AuthGuard from "@/components/AuthGuard";

const geist = Inter({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Coupon Dashboard",
  description: "Coupon performance management dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${geist.variable} h-full antialiased`}>
        <body className="min-h-screen flex flex-col bg-gradient-to-br from-purple-50 via-purple-50 to-purple-100 text-gray-900">
          <AuthGuard />
          <Navbar />
          <main className="flex-1 w-full">{children}</main>
        </body>
      </html>
    </ClerkProvider>
  );
}
