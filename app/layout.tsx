import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: {
    default: "Business Partner · Brincolines Bambinos",
    template: "%s · Brincolines Bambinos",
  },
  description: "Programa de Socios Comerciales de Brincolines Bambinos. Añade renta de brincolines a tus servicios sin inversión.",
  openGraph: {
    siteName: 'Brincolines Bambinos Partners',
    images: [
      {
        url: 'https://www.rentaunbrincolin.com/og-default.png',
        width: 1080,
        height: 1080,
        alt: 'Business Partner · Brincolines Bambinos',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['https://www.rentaunbrincolin.com/og-default.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${dmSans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className={`${dmSans.className} min-h-full flex flex-col`}>{children}</body>
    </html>
  );
}
