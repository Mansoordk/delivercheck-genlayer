import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DeliverCheck | GenLayer Studionet",
  description: "Trustless milestone verification powered by GenLayer Studionet.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
