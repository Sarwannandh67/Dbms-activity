import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IPL Ticket Booking",
  description: "IPL Ticket Booking Demo — DBMS Concurrency Activity",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-[#0A0E1A] text-white">
        {children}
      </body>
    </html>
  );
}
