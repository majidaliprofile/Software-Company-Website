import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AS Code Assess",
  description: "Secure assessments for practical learning.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
