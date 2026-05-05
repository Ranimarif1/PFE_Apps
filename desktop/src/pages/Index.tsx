import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sun, Moon, Mic, ShieldCheck, Activity, Building2,
  Mail, MapPin, Phone, ArrowRight, ExternalLink,
  Stethoscope, BookOpen, GraduationCap, Globe2, User,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import hospitalImg from "@/assets/téléchargement.jpeg";
import lightModeImg from "@/assets/light mode.png";
import darkModeImg from "@/assets/dark mode.png";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { LoginForm } from "@/components/auth/LoginForm";
import { RegisterForm } from "@/components/auth/RegisterForm";

type AuthMode = "login" | "register" | null;

/* ── Animation variants ───────────────────────────────────── */
const heroVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.11, delayChildren: 0.15 } },
};
const heroItem = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] } },
};

const sectionVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};
const sectionItem = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
};

/* ── Data ─────────────────────────────────────────────────── */
const navLinks = [
  { href: "#about",    label: "À propos" },
  { href: "#features", label: "Fonctionnalités" },
  { href: "#studies",  label: "Études" },
  { href: "#contact",  label: "Contact" },
];

const features = [
  {
    icon: Mic,
    title: "Dictée vocale intelligente",
    desc: "Transcription IA en temps réel adaptée au vocabulaire radiologique francophone.",
    color: "from-primary/20 to-primary/8",
    accent: "#4A7BBE",
    num: "01",
  },
  {
    icon: Activity,
    title: "Synchronisation multi-appareils",
    desc: "Connexion smartphone par QR code pour enregistrer où que vous soyez dans le service.",
    color: "from-success/20 to-success/8",
    accent: "hsl(var(--success))",
    num: "02",
  },
  {
    icon: ShieldCheck,
    title: "Sécurité hospitalière",
    desc: "Authentification JWT, contrôle d'accès par rôle et stockage chiffré des comptes rendus.",
    color: "from-warning/20 to-warning/8",
    accent: "hsl(var(--warning))",
    num: "03",
  },
];

const studies = [
  {
    icon: BookOpen,
    org: "RSNA",
    title: "Radiological Society of North America",
    desc: "Recherche, éducation et publications de référence en imagerie médicale (Radiology, RadioGraphics).",
    href: "https://www.rsna.org/",
  },
  {
    icon: Globe2,
    org: "ESR",
    title: "European Society of Radiology",
    desc: "Recommandations européennes, livres blancs sur l'IA en radiologie et le futur de la profession.",
    href: "https://www.myesr.org/",
  },
  {
    icon: GraduationCap,
    org: "SFR",
    title: "Société Française de Radiologie",
    desc: "Référentiels francophones, formation continue et bonnes pratiques en imagerie diagnostique.",
    href: "https://www.sfrnet.org/",
  },
  {
    icon: Stethoscope,
    org: "OMS",
    title: "Organisation Mondiale de la Santé — Imagerie diagnostique",
    desc: "Publications sur l'accès équitable à l'imagerie médicale et standards internationaux.",
    href: "https://www.who.int/health-topics/diagnostic-imaging",
  },
];

export default function Index() {
  const { theme, toggleTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const isDark = theme === "dark";

  const [authMode, setAuthMode] = useState<AuthMode>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // Auto-open the modal when arriving via /?auth=login or /?auth=register
  // (e.g. from the legacy /login & /register redirects, RouteGuard, or
  // any in-app link). The query param is stripped so refreshing the page
  // doesn't keep popping the modal.
  useEffect(() => {
    const auth = searchParams.get("auth");
    if (auth === "login" || auth === "register") {
      setAuthMode(auth);
      const next = new URLSearchParams(searchParams);
      next.delete("auth");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ───────── NAVBAR ───────── */}
      <motion.nav
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        aria-label="Navigation principale"
        className="fixed top-0 inset-x-0 z-50 transition-all duration-500"
        style={{
          background: scrolled
            ? (isDark ? "rgba(13,19,33,0.92)" : "rgba(255,255,255,0.93)")
            : "transparent",
          backdropFilter: scrolled ? "blur(16px)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(16px)" : "none",
          borderBottom: scrolled ? "1px solid hsl(var(--border))" : "1px solid transparent",
          boxShadow: scrolled
            ? (isDark ? "0 1px 0 rgba(255,255,255,0.04)" : "0 2px 16px rgba(0,0,0,0.08)")
            : "none",
        }}
      >
        <div className="w-full px-4 lg:px-6 h-16 flex items-center">

          {/* Logo */}
          <div className="flex-1 flex items-center justify-start">
            <a href="#top" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 ring-1 transition-all duration-200 group-hover:ring-primary/40"
                style={{ ringColor: scrolled ? "hsl(var(--border))" : "rgba(255,255,255,0.3)" }}>
                <img src="/ReportEase.png" alt="ReportEase" className="w-full h-full object-cover" />
              </div>
              <div className="leading-tight">
                <span className="font-bold text-base tracking-tight transition-colors duration-500"
                  style={{ color: scrolled ? "hsl(var(--foreground))" : "#ffffff" }}>
                  ReportEase
                </span>
                <p className="text-[10.5px] -mt-0.5 transition-colors duration-500"
                  style={{ color: scrolled ? "hsl(var(--muted-foreground))" : "rgba(255,255,255,0.6)" }}>
                  Speech-to-Text Platform
                </p>
              </div>
            </a>
          </div>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-7 shrink-0">
            {navLinks.map(l => (
              <a
                key={l.href}
                href={l.href}
                className="text-sm font-medium transition-all duration-300 relative group"
                style={{ color: scrolled ? "hsl(var(--muted-foreground))" : "rgba(255,255,255,0.75)" }}
                onMouseEnter={e => (e.currentTarget.style.color = scrolled ? "hsl(var(--foreground))" : "#ffffff")}
                onMouseLeave={e => (e.currentTarget.style.color = scrolled ? "hsl(var(--muted-foreground))" : "rgba(255,255,255,0.75)")}
              >
                {l.label}
                <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-primary group-hover:w-full transition-all duration-300" />
              </a>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex-1 flex items-center justify-end gap-2">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              aria-label="Basculer le thème"
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-300"
              style={{
                color: scrolled ? "hsl(var(--muted-foreground))" : "rgba(255,255,255,0.75)",
                border: scrolled ? "1px solid hsl(var(--border))" : "1px solid rgba(255,255,255,0.25)",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = scrolled ? "hsl(var(--foreground))" : "#ffffff";
                e.currentTarget.style.borderColor = scrolled ? "rgba(74,123,190,0.4)" : "rgba(255,255,255,0.5)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = scrolled ? "hsl(var(--muted-foreground))" : "rgba(255,255,255,0.75)";
                e.currentTarget.style.borderColor = scrolled ? "hsl(var(--border))" : "rgba(255,255,255,0.25)";
              }}
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {/* Se connecter */}
            <button
              type="button"
              onClick={() => setAuthMode("login")}
              className="hidden sm:inline-flex items-center gradient-hero text-white text-sm font-semibold px-4 py-2 rounded-lg"
            >
              Se connecter
            </button>

            {/* S'inscrire */}
            <button
              type="button"
              onClick={() => setAuthMode("register")}
              className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg transition-all duration-200"
              style={{
                background: isDark ? "hsl(var(--accent))" : "#FDE68A",
                color: isDark ? "hsl(var(--accent-foreground))" : "#1F3D5C",
                boxShadow: "0 2px 8px rgba(253,230,138,0.35)",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = isDark ? "hsl(32deg 95% 65%)" : "#FCD34D"; }}
              onMouseLeave={e => { e.currentTarget.style.background = isDark ? "hsl(var(--accent))" : "#FDE68A"; }}
            >
              S'inscrire
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </motion.nav>

      {/* ───────── HERO ───────── */}
      <section id="top" className="relative overflow-hidden" style={{ minHeight: "700px" }}>

        {/* Full-bleed background image */}
        <img
          src={isDark ? darkModeImg : lightModeImg}
          alt=""
          aria-hidden
          className="absolute top-0 left-0 w-full"
          style={{ height: "auto", minHeight: "100%" }}
        />

        {/* Gradient overlays */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(105deg, rgba(8,14,26,0.92) 0%, rgba(8,14,26,0.72) 45%, rgba(8,14,26,0.10) 75%, rgba(8,14,26,0.00) 100%)",
          }}
        />
        {/* Bottom fade */}
        <div
          className="absolute bottom-0 inset-x-0 h-24"
          style={{ background: "linear-gradient(to bottom, transparent, hsl(var(--background)))" }}
        />

        {/* Content grid */}
        <div className="relative z-10 w-full min-h-[700px] px-6 sm:px-10 lg:px-16 xl:px-24 py-20 lg:py-28 flex items-center">

          {/* ── Left: text ── */}
          <motion.div variants={heroVariants} initial="hidden" animate="visible" className="flex flex-col">

            {/* Headline */}
            <motion.h1
              variants={heroItem}
              className="text-[2.6rem] sm:text-[3.2rem] lg:text-[3.8rem] font-extrabold leading-[1.05] tracking-tight mb-6 text-white"
            >
              La transcription médicale,<br />
              <span style={{ color: "#7EB8F7" }}>simple et intelligente.</span>
            </motion.h1>

            {/* Body */}
            <motion.p
              variants={heroItem}
              className="text-base lg:text-[1.05rem] max-w-[520px] leading-relaxed mb-9"
              style={{ color: "rgba(255,255,255,0.72)" }}
            >
              Chaque minute passée à dicter est une minute de moins au chevet du patient.
              ReportEase transcrit, structure et signe vos comptes rendus radiologiques en temps réel —
              sans cloud, sans interruption, sans compromis sur la précision.
            </motion.p>

            {/* CTAs */}
            <motion.div variants={heroItem} className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setAuthMode("login")}
                className="inline-flex items-center gap-2 gradient-hero text-white font-semibold px-5 py-3 rounded-xl"
                style={{ boxShadow: "0 4px 20px rgba(74,123,190,0.45)" }}
              >
                Se connecter
                <ArrowRight size={16} />
              </button>
              <button
                type="button"
                onClick={() => setAuthMode("register")}
                className="inline-flex items-center gap-2 font-semibold px-5 py-3 rounded-xl border transition-all duration-200 text-white"
                style={{ background: "rgba(255,255,255,0.10)", borderColor: "rgba(255,255,255,0.22)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.18)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.10)")}
              >
                Créer un compte
              </button>
              <a
                href="#about"
                className="inline-flex items-center gap-2 font-semibold px-5 py-3 rounded-xl transition-colors duration-200"
                style={{ color: "rgba(255,255,255,0.60)" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.60)")}
              >
                En savoir plus
              </a>
            </motion.div>

          </motion.div>

        </div>
      </section>

      {/* ───────── FEATURES ───────── */}
      <section id="features" className="py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            className="max-w-2xl mb-12"
          >
            <p className="text-eyebrow mb-3">Ce que nous offrons</p>
            <h2 className="text-display-lg lg:text-display-xl mb-4">
              Une plateforme conçue pour le quotidien des radiologues
            </h2>
            <p className="text-muted-foreground">
              Trois piliers techniques pensés autour des contraintes réelles d'un service
              d'imagerie médicale.
            </p>
          </motion.div>

          <motion.div
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {features.map(({ icon: Icon, title, desc, color, accent, num }) => (
              <motion.div
                key={title}
                variants={sectionItem}
                className="bg-card rounded-2xl p-6 hover-lift relative overflow-hidden flex flex-col"
                style={{ borderTop: `2px solid ${accent}` }}
              >
                {/* Number watermark */}
                <span
                  className="absolute top-4 right-5 text-[2.8rem] font-black leading-none select-none pointer-events-none"
                  style={{ color: accent, opacity: 0.07 }}
                >
                  {num}
                </span>

                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-5 shrink-0`}
                  style={{ boxShadow: `0 4px 14px ${accent}26` }}
                >
                  <Icon size={22} style={{ color: accent }} />
                </div>
                <h3 className="text-base font-bold mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ───────── ABOUT ───────── */}
      <section id="about" className="py-20 lg:py-24 bg-secondary/40 border-y border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
          >
            <p className="text-eyebrow mb-3">Notre histoire</p>
            <h2 className="text-display-lg lg:text-display-xl mb-5">
              Née d'un besoin clinique, construite avec les soignants.
            </h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                ReportEase est née d'un constat simple : les radiologues passent une part
                considérable de leur journée à dicter, corriger et structurer des comptes rendus.
                Le temps gagné sur la transcription, c'est du temps rendu au patient.
              </p>
              <p>
                Le projet a été imaginé en collaboration avec le service de radiologie de
                l'Hôpital Fattouma-Bourguiba de Monastir. L'objectif : combiner la rigueur d'un
                outil hospitalier — sécurité, traçabilité, gestion des rôles — avec la fluidité
                d'une expérience moderne basée sur l'intelligence artificielle.
              </p>
              <p>
                Nous croyons qu'un bon outil ne s'impose pas, il s'efface. ReportEase tient ce
                principe : une dictée naturelle, une transcription corrigée, un compte rendu prêt
                à signer — le tout sans rupture dans le flux de travail.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-8">
              {[
                { value: "3 rôles",    label: "Médecin · Admin · IT" },
                { value: "Temps réel", label: "Streaming audio mobile" },
                { value: "Francophone", label: "Vocabulaire radiologique" },
              ].map(s => (
                <div key={s.value} className="bg-card rounded-xl px-4 py-3 hover-lift">
                  <p className="text-sm font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            transition={{ delay: 0.1 }}
            className="relative"
          >
            <div className="aspect-[4/5] rounded-3xl overflow-hidden shadow-lg-custom">
              <img
                src={hospitalImg}
                alt="Hôpital Fattouma-Bourguiba"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0D1119]/65 via-transparent to-transparent" />
            </div>
            <div className="absolute bottom-5 left-5 right-5 bg-card/95 backdrop-blur-md rounded-2xl p-5 border border-border">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Building2 size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold">CHU Fattouma-Bourguiba</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Monastir, Tunisie — Partenaire pilote du projet ReportEase.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ───────── STUDIES ───────── */}
      <section id="studies" className="py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            className="max-w-2xl mb-12"
          >
            <p className="text-eyebrow mb-3">Études & Références</p>
            <h2 className="text-display-lg lg:text-display-xl mb-4">
              Sources de confiance en radiologie et transcription médicale
            </h2>
            <p className="text-muted-foreground">
              Une sélection d'organisations et de publications reconnues qui éclairent notre
              démarche scientifique et nos choix de conception.
            </p>
          </motion.div>

          <motion.div
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            className="grid md:grid-cols-2 gap-5"
          >
            {studies.map(({ icon: Icon, org, title, desc, href }) => (
              <motion.a
                key={title}
                variants={sectionItem}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-card rounded-2xl p-6 hover-lift flex gap-4 border border-border hover:border-primary/40 transition-all duration-300 relative overflow-hidden"
              >
                {/* Hover shine */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/8 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200">
                  <Icon size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold tracking-wider uppercase text-primary">
                      {org}
                    </span>
                    <ExternalLink
                      size={13}
                      className="text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-200"
                    />
                  </div>
                  <h3 className="text-base font-bold mb-1.5 leading-tight">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </motion.a>
            ))}
          </motion.div>

          <motion.p
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-xs text-muted-foreground mt-8 italic"
          >
            Les liens ci-dessus pointent vers les sites officiels des organisations citées.
            Veuillez vérifier que les ressources renvoyées correspondent à votre usage.
          </motion.p>
        </div>
      </section>

      {/* ───────── CONTACT ───────── */}
      <section id="contact" className="py-20 lg:py-24 bg-secondary/40 border-t border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 grid lg:grid-cols-2 gap-12 items-start">

          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
          >
            <p className="text-eyebrow mb-3">Contact</p>
            <h2 className="text-display-lg lg:text-display-xl mb-4">
              Une question, un retour, un partenariat ?
            </h2>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              ReportEase est un projet ouvert au dialogue avec les services hospitaliers, les
              équipes IT et la communauté académique. N'hésitez pas à nous écrire.
            </p>

            <div className="space-y-4">
              {[
                { icon: Mail,   label: "Email",     value: "contact@reportease.health", href: "mailto:contact@reportease.health" },
                { icon: MapPin, label: "Adresse",   value: "Hôpital Fattouma-Bourguiba, 5000 Monastir, Tunisie", href: undefined },
                { icon: Phone,  label: "Téléphone", value: "+216 73 461 144", href: "tel:+21673461144" },
              ].map(({ icon: Icon, label, value, href }) => {
                const inner = (
                  <div className="group flex items-center gap-4 bg-card rounded-xl px-5 py-4 hover-lift border border-border hover:border-primary/30 transition-all duration-200">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/8 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200">
                      <Icon size={18} />
                    </div>
                    <div>
                      <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold">
                        {label}
                      </p>
                      <p className="text-sm font-semibold mt-0.5 group-hover:text-primary transition-colors duration-200">{value}</p>
                    </div>
                  </div>
                );
                return href ? (
                  <a key={label} href={href} className="block">{inner}</a>
                ) : (
                  <div key={label}>{inner}</div>
                );
              })}
            </div>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            className="bg-card rounded-2xl overflow-hidden border border-border"
            style={{ boxShadow: "var(--shadow-xl)" }}
          >
            {/* Branded header strip */}
            <div
              className="px-7 py-5 flex items-center gap-3"
              style={{
                background: "linear-gradient(135deg, rgba(74,123,190,0.12) 0%, rgba(37,99,235,0.06) 100%)",
                borderBottom: "1px solid hsl(var(--border))",
              }}
            >
              <div className="w-9 h-9 rounded-lg gradient-hero flex items-center justify-center shrink-0">
                <Mail size={16} className="text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold leading-none">Envoyer un message</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Ouvre votre client mail avec le contenu pré-rempli.
                </p>
              </div>
            </div>
            <div className="p-7">
              <ContactForm />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ───────── FOOTER ───────── */}
      <footer className="border-t border-border relative overflow-hidden">
        {/* Subtle gradient wash */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(135deg, rgba(74,123,190,0.04) 0%, transparent 60%)" }}
        />

        <div className="relative max-w-7xl mx-auto px-6 lg:px-10 py-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">

            {/* Brand */}
            <a href="#top" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl overflow-hidden ring-1 ring-border group-hover:ring-primary/40 transition-all duration-200">
                <img src="/ReportEase.png" alt="ReportEase" className="w-full h-full object-cover" />
              </div>
              <div className="leading-tight">
                <p className="text-sm font-bold group-hover:text-primary transition-colors duration-200">ReportEase</p>
                <p className="text-[10.5px] text-muted-foreground">CHU Fattouma-Bourguiba · Monastir</p>
              </div>
            </a>

            {/* Nav */}
            <nav className="hidden sm:flex items-center gap-1">
              {navLinks.map(l => (
                <a
                  key={l.href}
                  href={l.href}
                  className="text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 px-3 py-1.5 rounded-lg transition-all duration-200"
                >
                  {l.label}
                </a>
              ))}
            </nav>

            {/* Copyright */}
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} ReportEase. Tous droits réservés.
            </p>
          </div>

          {/* Bottom rule */}
          <div
            className="mt-8 pt-6 flex items-center justify-center"
            style={{ borderTop: "1px solid hsl(var(--border))" }}
          >
            <p className="text-[10.5px] text-muted-foreground/60 text-center">
              Plateforme de transcription médicale dédiée au service de radiologie — usage hospitalier interne uniquement.
            </p>
          </div>
        </div>
      </footer>

      {/* ───────── AUTH MODAL ───────── */}
      <Dialog open={authMode !== null} onOpenChange={(open) => { if (!open) setAuthMode(null); }}>
        <DialogContent
          className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto p-6 sm:p-8 bg-card border-border rounded-3xl"
          style={{ boxShadow: "var(--shadow-xl)" }}
        >
          {authMode === "login" && (
            <LoginForm
              onSuccess={() => setAuthMode(null)}
              onSwitchToRegister={() => setAuthMode("register")}
            />
          )}
          {authMode === "register" && (
            <RegisterForm
              onSwitchToLogin={() => setAuthMode("login")}
              onAfterSuccess={() => setAuthMode("login")}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── Contact form ─────────────────────────────────────────── */
function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(`[ReportEase] Message de ${name || "Visiteur"}`);
    const body = encodeURIComponent(`Nom : ${name}\nEmail : ${email}\n\n${message}`);
    window.location.href = `mailto:contact@reportease.health?subject=${subject}&body=${body}`;
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-1.5 block">Nom</label>
        <div className="relative">
          <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            placeholder="Votre nom"
            className="w-full pl-10 pr-4 py-2.5 text-sm"
          />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium mb-1.5 block">Email</label>
        <div className="relative">
          <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            placeholder="votre@email.com"
            className="w-full pl-10 pr-4 py-2.5 text-sm"
          />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium mb-1.5 block">Message</label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          required
          rows={5}
          placeholder="Votre message…"
          className="w-full px-4 py-2.5 text-sm resize-none"
        />
      </div>
      <button
        type="submit"
        className="w-full gradient-hero text-white font-semibold py-3 rounded-xl inline-flex items-center justify-center gap-2"
      >
        Envoyer
        <ArrowRight size={16} />
      </button>
    </form>
  );
}
