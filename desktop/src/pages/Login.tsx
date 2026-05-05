import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { PublicNavbar } from "@/components/PublicNavbar";
import { LoginForm } from "@/components/auth/LoginForm";
import hospitalImg from "@/assets/téléchargement.jpeg";

export default function Login() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 pt-24 pb-8 sm:pt-28 sm:pb-12">
      <PublicNavbar />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-5xl bg-card rounded-3xl overflow-hidden grid lg:grid-cols-2"
        style={{ boxShadow: "var(--shadow-xl)" }}
      >
        {/* Left — clean photo */}
        <div className="hidden lg:block relative min-h-[560px]">
          <img
            src={hospitalImg}
            alt="Hôpital Fattouma-Bourguiba"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0D1119]/45 via-transparent to-transparent" />

          <Link to="/" className="absolute top-6 left-6 flex items-center gap-2.5 z-10">
            <div className="w-10 h-10 rounded-xl overflow-hidden ring-1 ring-white/30">
              <img src="/ReportEase.png" alt="ReportEase" className="w-full h-full object-cover" />
            </div>
            <span className="text-white font-bold text-base tracking-tight">ReportEase</span>
          </Link>
        </div>

        {/* Right — form */}
        <div className="px-6 sm:px-10 py-10 sm:py-12 flex flex-col justify-center">
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-xl overflow-hidden ring-1 ring-border">
              <img src="/ReportEase.png" alt="ReportEase" className="w-full h-full object-cover" />
            </div>
            <span className="font-bold text-lg text-foreground">ReportEase</span>
          </div>

          <LoginForm />
        </div>
      </motion.div>
    </div>
  );
}
