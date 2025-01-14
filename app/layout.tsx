import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PHI Community Cred APIs",
  description: "APIs for managing and interacting with community creds",
  keywords: ["PHI", "community", "creds", "APIs", "reputation"],
  authors: [
    {
      name: "PHI Team",
    },
  ],
  openGraph: {
    title: "PHI Community Cred APIs",
    description: "APIs for managing and interacting with community creds",
    type: "website",
    images: [
      {
        url: "/public/preview.png",
        alt: "Phi Protocol API Verification",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
