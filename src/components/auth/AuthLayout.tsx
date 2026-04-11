import { type AuthLayoutProps } from "@/types/auth";
import LanguageSwitcher from "@/components/LanguageSwitcher";

/**
 * AuthLayout — Design B: Immersive Brand Wall
 *
 * Split layout used by Login, Sign Up, OTP, and password-reset screens.
 * Left: Dark gradient brand wall with animated mesh, headline + testimonial.
 * Right: White form panel with centered content.
 * Mobile: Brand wall hidden, form only.
 */
export default function AuthLayout({
  children,
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[1.4fr_1fr]">
      {/* ── Brand Wall (left) ────────────────────────────────── */}
      <div className="relative hidden lg:flex flex-col justify-end overflow-hidden p-14 pt-[104px]"
        style={{ background: "linear-gradient(135deg, #0c1629 0%, #162040 40%, #1a2f5a 70%, #0f172a 100%)" }}
      >
        {/* Animated mesh blobs */}
        <div className="absolute -top-[10%] -right-[10%] w-[500px] h-[500px] rounded-full blur-[80px] opacity-50 animate-[float_8s_ease-in-out_infinite]"
          style={{ background: "radial-gradient(circle, rgba(70,107,196,0.5) 0%, transparent 70%)" }}
        />
        <div className="absolute bottom-[10%] -left-[5%] w-[400px] h-[400px] rounded-full blur-[80px] opacity-50 animate-[float_8s_ease-in-out_infinite_-3s]"
          style={{ background: "radial-gradient(circle, rgba(45,212,191,0.35) 0%, transparent 70%)" }}
        />
        <div className="absolute top-[40%] left-[30%] w-[300px] h-[300px] rounded-full blur-[80px] opacity-50 animate-[float_8s_ease-in-out_infinite_-5s]"
          style={{ background: "radial-gradient(circle, rgba(96,165,250,0.3) 0%, transparent 70%)" }}
        />

        {/* Logo */}
        <div className="absolute top-14 left-14 z-10">
          <img src="/Logo-Light.png" alt="Inspire Genius" className="h-8" />
        </div>

        {/* Content */}
        <div className="relative z-10">
          <h2 className="text-[48px] font-extrabold text-white leading-[1.08] tracking-[-0.04em] mb-5">
            Unlock your<br />full{" "}
            <span className="bg-gradient-to-r from-teal-400 to-blue-400 bg-clip-text text-transparent">
              potential
            </span>
          </h2>
          <p className="text-base text-white/55 leading-relaxed max-w-[420px]">
            AI-powered coaching grounded in the PRISM behavioral framework.
            Personalized guidance for every role in your organization.
          </p>

          {/* Testimonial */}
          <div className="mt-12 bg-white/[0.06] border border-white/[0.08] rounded-2xl p-6 px-7 max-w-[420px] backdrop-blur-xl">
            <p className="text-sm text-white/75 leading-relaxed italic">
              "Inspire Genius completely changed how our team approaches
              professional development. The AI coaching feels genuinely
              personal."
            </p>
            <div className="flex items-center gap-3 mt-4">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#466bc4] to-teal-400 flex items-center justify-center text-white font-bold text-sm">
                SR
              </div>
              <div className="text-[13px] text-white/50">
                <strong className="text-white/85 block">Sarah Reynolds</strong>
                VP People Operations
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Form Panel (right) ───────────────────────────────── */}
      <div className="bg-white flex items-center justify-center px-5 sm:px-10 py-12 pt-24 lg:pt-12 relative">
        {/* Language switcher — top right */}
        <div className="absolute top-4 right-4">
          <LanguageSwitcher />
        </div>
        <div className="w-full max-w-[360px]">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 flex justify-center">
            <img src="/Logo-Dark.png" alt="Inspire Genius" className="h-8" />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
