"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "الرئيسية", href: "#home" },
  { label: "لماذا جاهز؟", href: "#why" },
  { label: "التطبيق", href: "#app" },
  { label: "انضم إلينا", href: "#join" },
];

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 right-0 left-0 z-50 transition-all duration-300",
        isScrolled
          ? "bg-white/95 backdrop-blur-md shadow-[0_2px_20px_rgba(0,0,0,0.08)]"
          : "bg-transparent",
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF6B00] to-[#E55A00] flex items-center justify-center shadow-[0_4px_12px_rgba(255,107,0,0.35)] group-hover:shadow-[0_6px_16px_rgba(255,107,0,0.45)] transition-shadow">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <span
              className={cn(
                "text-2xl font-black tracking-tight transition-colors",
                isScrolled ? "text-[#FF6B00]" : "text-white",
              )}
            >
              جاهز
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200",
                  isScrolled
                    ? "text-gray-700 hover:bg-[#FF6B00]/10 hover:text-[#FF6B00]"
                    : "text-white/90 hover:bg-white/10 hover:text-white",
                )}
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Button variant={isScrolled ? "outline" : "secondary"} size="sm">
              تسجيل الدخول
            </Button>
            <Button size="sm">حمّل التطبيق</Button>
          </div>

          {/* Mobile menu toggle */}
          <button
            className={cn(
              "md:hidden p-2 rounded-lg transition-colors",
              isScrolled
                ? "text-gray-700 hover:bg-gray-100"
                : "text-white hover:bg-white/10",
            )}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 shadow-lg">
          <nav className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="px-4 py-3 rounded-lg text-gray-700 font-semibold hover:bg-[#FFF3E8] hover:text-[#FF6B00] transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <div className="flex gap-3 pt-3 border-t border-gray-100 mt-2">
              <Button variant="outline" size="sm" className="flex-1">
                تسجيل الدخول
              </Button>
              <Button size="sm" className="flex-1">
                حمّل التطبيق
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
