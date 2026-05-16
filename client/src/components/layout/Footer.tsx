import Image from "next/image";
import Link from "next/link";
import { Phone, Mail, MapPin } from "lucide-react";

const FOOTER_LINKS = {
  company: [
    { label: "من نحن", href: "/about" },
    { label: "وظائف", href: "/careers" },
    { label: "المدونة", href: "/blog" },
    { label: "اتصل بنا", href: "/contact" },
  ],
  partner: [
    { label: "انضم كمطعم", href: "/#join" },
    { label: "انضم كسائق", href: "/#join" },
    { label: "بوابة الشركاء", href: "/contact" },
  ],
  support: [
    { label: "مركز المساعدة", href: "/help" },
    { label: "سياسة الخصوصية", href: "/privacy" },
    { label: "الشروط والأحكام", href: "/terms" },
    { label: "سياسة الإرجاع", href: "/returns" },
  ],
};

const SOCIAL_LINKS = [
  {
    label: "Facebook",
    href: "#",
    svg: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
        <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
      </svg>
    ),
  },
  {
    label: "Instagram",
    href: "#",
    svg: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    label: "X (Twitter)",
    href: "#",
    svg: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    label: "YouTube",
    href: "#",
    svg: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
        <path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 00-1.95 1.96A29.94 29.94 0 001 12a29.94 29.94 0 00.46 5.58 2.78 2.78 0 001.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.96A29.94 29.94 0 0023 12a29.94 29.94 0 00-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z" />
      </svg>
    ),
  },
];

export function Footer() {
  return (
    <footer className="bg-[#1C0A00] text-white">
      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-5 p-2 group cursor-pointer w-fit bg-white/5 rounded-2xl backdrop-blur-sm transition-all duration-700 ease-out hover:bg-white/10">
              <Image
                src="/jahez-mark.png"
                alt="جاهز"
                width={60}
                height={60}
                unoptimized
                className="object-contain drop-shadow-[0_4px_16px_rgba(255,107,0,0.4)] transition-all duration-700 ease-out group-hover:scale-125 group-hover:-rotate-6 group-hover:drop-shadow-[0_10px_28px_rgba(245,89,5,0.7)]"
              />
              <span className="text-4xl font-black text-[#FF6B00] transition-all duration-700 ease-out group-hover:tracking-wider">جاهز</span>
            </div>
            <p className="text-white/60 leading-relaxed text-sm mb-6">
              أكبر منصة لتوصيل الطعام في فلسطين. نربط بين أفضل المطاعم
              والعملاء من خلال تجربة طلب سهلة وتوصيل سريع.
            </p>

            {/* Contact */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 text-white/60 text-sm">
                <Phone className="w-4 h-4 text-[#FF6B00] shrink-0" />
                <span dir="ltr">+970 59 000 0000</span>
              </div>
              <div className="flex items-center gap-3 text-white/60 text-sm">
                <Mail className="w-4 h-4 text-[#FF6B00] shrink-0" />
                <span>info@jahez.ps</span>
              </div>
              <div className="flex items-center gap-3 text-white/60 text-sm">
                <MapPin className="w-4 h-4 text-[#FF6B00] shrink-0" />
                <span>غزة، فلسطين</span>
              </div>
            </div>

            {/* Social */}
            <div className="flex gap-3 mt-6">
              {SOCIAL_LINKS.map(({ svg, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-10 h-10 rounded-lg bg-white/10 hover:bg-[#FF6B00] flex items-center justify-center transition-colors duration-200 text-white"
                >
                  {svg}
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-white font-bold mb-5 text-base">الشركة</h4>
            <ul className="flex flex-col gap-3">
              {FOOTER_LINKS.company.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-white/60 hover:text-[#FF6B00] text-sm transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-5 text-base">الشراكة</h4>
            <ul className="flex flex-col gap-3">
              {FOOTER_LINKS.partner.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-white/60 hover:text-[#FF6B00] text-sm transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-5 text-base">الدعم</h4>
            <ul className="flex flex-col gap-3">
              {FOOTER_LINKS.support.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-white/60 hover:text-[#FF6B00] text-sm transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* App Download */}
        <div className="mt-14 pt-10 border-t border-white/10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <p className="text-white/50 text-sm">
              © {new Date().getFullYear()} جاهز. جميع الحقوق محفوظة.
            </p>
            <div className="flex gap-3">
              <a
                href="#"
                className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-colors border border-white/20"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98l-.09.06c-.22.14-2.2 1.28-2.18 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.73M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                <div>
                  <div className="text-white/60 text-[10px]">حمّل من</div>
                  <div className="text-white font-semibold text-xs">App Store</div>
                </div>
              </a>
              <a
                href="#"
                className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-colors border border-white/20"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                  <path d="M3.18 23.76c.37.2.8.2 1.18.01l11.62-6.54-2.5-2.5-10.3 9.03zm15.48-9.35L6.04 7.87 3.17.25C2.79.45 2.5.83 2.5 1.34v21.32c0 .5.28.88.67 1.08l10.83-9.33zm2.15-1.2L17.4 11.5l2.41-1.34-2.41-1.35-9.6-5.42 2.79 2.79 8.22 6.03zM4.36.26L16.8 6.78l-2.5 2.5L3.54.24c.25-.13.55-.12.82.02z" />
                </svg>
                <div>
                  <div className="text-white/60 text-[10px]">حمّل من</div>
                  <div className="text-white font-semibold text-xs">Google Play</div>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
