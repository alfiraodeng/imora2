import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import { WeatherProvider } from "@/context/WeatherContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://imora.indexim.id"),
  title: "IMORA | Mining Rain Intelligence",
  description:
    "Pantau cuaca, curah hujan, dan risiko operasional tambang secara real-time.",
  openGraph: {
    title: "IMORA | Mining Rain Intelligence",
    description:
      "Pantau cuaca, curah hujan, dan risiko operasional tambang secara real-time.",
    url: "https://imora.indexim.id",
    siteName: "IMORA",
    images: [
      {
        url: "/app-image.png",
        width: 1200,
        height: 630,
        alt: "IMORA Mining Rain Intelligence dashboard",
      },
    ],
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "IMORA | Mining Rain Intelligence",
    description:
      "Pantau cuaca, curah hujan, dan risiko operasional tambang secara real-time.",
    images: ["/app-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preload" as="image" href="/imora-login-weather-hero.webp" type="image/webp" fetchPriority="high" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <WeatherProvider>
        {children}
        </WeatherProvider>
      </body>
    </html>
  );
}
