import type { Metadata } from "next";
import { Geist, Geist_Mono, VT323 } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

const pixelFont = VT323({
  variable: "--font-pixel",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "YourWay — Custom AI Academic Roadmap Builder",
  description: "Conquer academic information overload. Forge learning paths through peer-reviewed STEM literature, node by node, like an RPG.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${pixelFont.variable} h-full antialiased`}
    >
      <body className="min-h-[100dvh] bg-bg-dark text-foreground selection:bg-retro-cyan/30 selection:text-retro-cyan font-sans flex flex-col">
        {children}
      </body>
    </html>
  );
}
