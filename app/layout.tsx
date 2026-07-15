import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "./providers";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WhatsApp Otomasyon",
  description: "Toplu mesaj, otomasyon ve CRM için WhatsApp masaüstü uygulaması",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full flex flex-col overflow-hidden">
        <Providers>
          <div className="flex flex-1 h-full min-h-0">
            <SidebarNav />
            <main className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-muted/25">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
