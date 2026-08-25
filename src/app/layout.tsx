import type { Metadata } from "next";
import { PMBMusic } from "@/components/PMBMusic";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "PMB League Manager",
  description: "Professional football league management for the PMB organization.",
  other: {
    monetag: "88b435aea520a594f9d18d82cfc78c94",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="monetag" content="88b435aea520a594f9d18d82cfc78c94" />
      </head>
      <body className="min-h-screen bg-pmb-black font-sans text-white antialiased">
        <PMBMusic />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
