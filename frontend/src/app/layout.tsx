import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CryptoTrace AI — Blockchain Fraud Investigation Platform",
  description: "Real-Time Blockchain Fraud Investigation & VASP Attribution Platform for law enforcement and cybercrime investigators.",
  keywords: "blockchain, fraud, investigation, cryptocurrency, VASP, tracing, forensics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
