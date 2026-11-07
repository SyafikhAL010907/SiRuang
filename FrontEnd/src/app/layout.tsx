import type { Metadata } from "next";
import { Geist, Geist_Mono, Montserrat } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import "../styles/globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["700", "800"],
});

export const metadata: Metadata = {
  title: "𝓢𝓲𝓡𝓾𝓪𝓷𝓰",
  description: "Sistem Pengajuan Ruang Dan Visualisasi Denah",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/LogoSiRuangPolos.png?v=2", sizes: "any" },
      { url: "/LogoSiRuangPolos.png?v=2", sizes: "192x192", type: "image/png" },
      { url: "/LogoSiRuangPolos.png?v=2", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/LogoSiRuangPolos.png?v=2",
    apple: [
      { url: "/LogoSiRuangPolos.png?v=2", sizes: "180x180", type: "image/png" },
    ],
  },
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${montserrat.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NextTopLoader
          color="#588CBC"
          height={3}
          showSpinner={false}
          crawl={true}
          crawlSpeed={200}
          speed={200}
          shadow="0 0 10px #588CBC,0 0 5px #588CBC"
        />
        {children}
      </body>
    </html>
  );
}