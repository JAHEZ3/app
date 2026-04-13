import type { Metadata, Viewport } from "next";
import "./globals.css";
import { QueryProvider } from "@/providers/QueryProvider";

export const metadata: Metadata = {
  title: "جاهز | أكبر منصة توصيل طعام في فلسطين",
  description:
    "اطلب من أفضل المطاعم في فلسطين. توصيل سريع، أكثر من 1200 مطعم، خدمة ممتازة على مدار الساعة.",
  keywords: ["توصيل طعام", "فلسطين", "مطاعم", "جاهز", "طلب طعام أونلاين"],
  authors: [{ name: "جاهز" }],
  openGraph: {
    title: "جاهز | أكبر منصة توصيل طعام في فلسطين",
    description: "اطلب من أفضل المطاعم في فلسطين. توصيل سريع وسهل.",
    type: "website",
    locale: "ar_PS",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FF6B00",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen antialiased" style={{ fontFamily: "'Cairo', Arial, sans-serif" }}>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
