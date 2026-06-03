import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Sun, Moon, Mic, ShieldCheck, Activity, Building2,
  Mail, MapPin, Phone, ArrowRight, ExternalLink,
  Stethoscope, BookOpen, GraduationCap, Globe2, User,
  Star, MessageSquareQuote,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import hospitalImg from "@/assets/téléchargement.jpeg";
import lightModeImg from "@/assets/light mode.png";
import darkModeImg from "@/assets/dark mode.png";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { LoginForm } from "@/components/auth/LoginForm";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { getAvis, type Avis } from "@/services/avisService";

type AuthMode = "login" | "register" | "forgot-password" | null;


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
  { href: "#avis",     label: "Avis" },
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
    href: "https://www.radiologie.fr/la-sfr",
  },
  {
    icon: Stethoscope,
    org: "OMS",
    title: "Organisation Mondiale de la Santé — Imagerie diagnostique",
    desc: "Publications sur l'accès équitable à l'imagerie médicale et standards internationaux.",
    href: "https://www.who.int/health-topics/diagnostics",
  },
];

export default function Index() {
  const { theme, toggleTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const isDark = theme === "dark";

  const [authMode, setAuthMode] = useState<AuthMode>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [avisList, setAvisList] = useState<Avis[]>([]);
  const [avisError, setAvisError] = useState<string | null>(null);

  useEffect(() => {
    getAvis()
      .then(data => { setAvisList(data); setAvisError(null); })
      .catch(err => setAvisError(String(err)));
  }, []);

  // Auto-open the modal when arriving via /?auth=login or /?auth=register
  // (e.g. from the legacy /login & /register redirects, RouteGuard, or
  // any in-app link). The query param is stripped so refreshing the page
  // doesn't keep popping the modal.
  useEffect(() => {
    const auth = searchParams.get("auth");
    if (auth === "login" || auth === "register" || auth === "forgot-password") {
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
            <a href="#top" className="flex items-center gap-3 group">
              <div className="w-11 h-11 shrink-0">
                <img src="/logo-icon.png" alt="ReportEase" className="w-full h-full object-contain" />
              </div>
              <span className="font-extrabold text-2xl tracking-tight transition-colors duration-500"
                style={{ color: scrolled ? "hsl(var(--foreground))" : "#ffffff" }}>
                ReportEase
              </span>
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
                background: "#E5E7EB",
                color: "#1F2937",
                border: "1px solid #D1D5DB",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "#D1D5DB"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#E5E7EB"; }}
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
              La rédaction des comptes rendus, c'est du temps pris sur l'essentiel.
              ReportEase ferme cette boucle : votre dictée devient un compte rendu structuré et signé,
              en temps réel, sans quitter votre poste et sans envoyer vos données quelque part.
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
              ReportEase est née sur le terrain, au plus près des soignants.
            </h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                En échangeant avec des radiologues, nous avons vite compris une réalité simple :
                une grande partie de leur journée est consacrée à dicter, corriger et structurer
                des comptes rendus. Derrière chaque minute passée sur la transcription, c'est du
                temps en moins pour les patients.
              </p>
              <p>Alors nous avons voulu faire mieux.</p>
              <p>
                Avec l'équipe du service de radiologie de l'Hôpital Fattouma-Bourguiba de
                Monastir, nous avons construit ReportEase main dans la main. Le projet est dédié
                à l'hôpital et s'inscrit dans le cadre du Laboratoire Technologie et Imagerie
                Médicale de Monastir.
              </p>
              <p>
                Notre objectif était de créer un outil à la fois fiable, sécurisé et conforme
                aux exigences hospitalières, tout en restant simple, fluide et agréable à
                utiliser.
              </p>
              <p>
                Nous croyons profondément qu'un bon outil doit savoir se faire oublier. Il ne
                doit pas ajouter de complexité, mais en enlever.
              </p>
              <p>
                C'est dans cet esprit que nous avons conçu ReportEase : une dictée naturelle,
                une transcription qui se corrige presque d'elle-même, et un compte rendu prêt à
                être signé, sans jamais interrompre le flux de travail.
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

      {/* ───────── AVIS ───────── */}
      <AvisSection avisList={avisList} avisError={avisError} />

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
                { icon: Mail,   label: "Email",     value: "contact.reportease@gmail.com", href: "mailto:contact.reportease@gmail.com" },
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

        <div className="relative max-w-7xl mx-auto px-6 lg:px-10 py-8">
          <div className="flex items-center justify-center">
            <p className="text-xs text-muted-foreground/70 text-center">
              © {new Date().getFullYear()} ReportEase. Tous droits réservés.
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
              onForgotPassword={() => setAuthMode("forgot-password")}
            />
          )}
          {authMode === "register" && (
            <RegisterForm
              onSwitchToLogin={() => setAuthMode("login")}
              onAfterSuccess={() => setAuthMode("login")}
            />
          )}
          {authMode === "forgot-password" && (
            <ForgotPasswordForm
              onSwitchToLogin={() => setAuthMode("login")}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── Avis section ─────────────────────────────────────────── */
interface DisplayAvis {
  id: string;
  doctorName: string;
  specialty: string;
  content: string;
  rating: number;
  createdAt: string;
}


function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "D";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_COLORS = [
  { bg: "rgba(37,99,235,0.12)", text: "#2563EB" },
  { bg: "rgba(16,185,129,0.12)", text: "#059669" },
  { bg: "rgba(139,92,246,0.12)", text: "#7C3AED" },
  { bg: "rgba(245,158,11,0.12)", text: "#D97706" },
  { bg: "rgba(239,68,68,0.12)",  text: "#DC2626" },
];

function AvisSection({ avisList, avisError }: { avisList: Avis[]; avisError: string | null }) {
  const displayed: DisplayAvis[] = avisList.map(a => ({
    id: a.id,
    doctorName: a.doctorName,
    specialty: "Médecin radiologue",
    content: a.content,
    rating: a.rating ?? 5,
    createdAt: a.createdAt,
  }));

  const avgRating = displayed.length > 0
    ? parseFloat((displayed.reduce((s, a) => s + a.rating, 0) / displayed.length).toFixed(1)).toString()
    : null;
  const totalCount = displayed.length;
  const recommendPct = displayed.length > 0
    ? Math.round((displayed.filter(a => a.rating >= 4).length / displayed.length) * 100)
    : 0;

  const [selected, setSelected] = useState<DisplayAvis | null>(null);

  return (
    <section id="avis" className="py-20 lg:py-24 border-t border-border"
      style={{ background: "hsl(var(--secondary) / 0.35)" }}>
      <div className="max-w-7xl mx-auto px-6 lg:px-10">

        {/* ── Header (centered) ── */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          className="text-center max-w-2xl mx-auto mb-10"
        >
          <p className="text-eyebrow mb-3">Ce que disent les médecins</p>
          <h2 className="text-display-lg lg:text-display-xl mb-4">Avis de nos utilisateurs</h2>
          <p className="text-muted-foreground">
            Les retours authentiques des médecins qui utilisent ReportEase au quotidien.
          </p>
        </motion.div>

        {/* ── Summary bar (only when there are avis) ── */}
        {totalCount > 0 && (
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            className="flex flex-wrap justify-center gap-3 mb-12"
          >
            {[
              { value: `${avgRating} / 5`, label: "Note moyenne" },
              { value: `${totalCount} avis`, label: "Témoignages" },
              { value: `${recommendPct}%`, label: "recommandent ReportEase" },
            ].map(chip => (
              <div
                key={chip.label}
                className="flex items-center gap-2.5 bg-card border border-border rounded-full px-5 py-2.5 shadow-sm"
              >
                <span className="text-base font-bold" style={{ color: "#2563EB" }}>{chip.value}</span>
                <span className="text-xs text-muted-foreground">{chip.label}</span>
              </div>
            ))}
          </motion.div>
        )}

        {/* ── Cards grid / empty state ── */}
        {avisError ? (
          <p className="text-center text-sm text-muted-foreground">Impossible de charger les avis.</p>
        ) : totalCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <MessageSquareQuote size={28} className="text-primary/40" />
            </div>
            <p className="text-muted-foreground text-sm">Aucun avis pour le moment.<br />Connectez-vous pour laisser le vôtre.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayed.map((avis, idx) => {
              const color = AVATAR_COLORS[idx % AVATAR_COLORS.length];
              const initials = getInitials(avis.doctorName);
              return (
                <motion.div
                  key={avis.id}
                  initial={{ opacity: 0, y: 28 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: idx * 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
                  onClick={() => setSelected(avis)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelected(avis); } }}
                  className="group relative bg-card rounded-2xl flex flex-col overflow-hidden cursor-pointer"
                  style={{
                    border: "1px solid hsl(var(--border))",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)",
                    transition: "box-shadow 0.3s ease, transform 0.3s ease",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.boxShadow =
                      "0 8px 32px rgba(37,99,235,0.12), 0 2px 8px rgba(0,0,0,0.06)";
                    (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.boxShadow =
                      "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)";
                    (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                  }}
                >
                  {/* Top accent bar */}
                  <div className="h-1 w-full" style={{ background: color.text, opacity: 0.7 }} />

                  <div className="p-6 flex flex-col gap-5 flex-1">
                    {/* Stars */}
                    <div className="flex gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          size={16}
                          className={i < avis.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/20"}
                        />
                      ))}
                    </div>

                    {/* Quote */}
                    <div className="relative flex-1">
                      <span
                        className="absolute -top-3 -left-1 text-[72px] font-serif leading-none select-none pointer-events-none"
                        style={{ color: "#2563EB", opacity: 0.10 }}
                      >
                        "
                      </span>
                      <p className="relative text-[0.9rem] leading-relaxed text-foreground/80 italic font-serif line-clamp-4 pt-1">
                        {avis.content}
                      </p>
                      {avis.content.length > 180 && (
                        <span className="relative inline-block mt-2 text-xs font-semibold text-primary group-hover:underline">
                          Lire la suite →
                        </span>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center gap-3 pt-4 border-t border-border mt-auto">
                      {/* Avatar */}
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold"
                        style={{ background: color.bg, color: color.text }}
                      >
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">Dr. {avis.doctorName}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{avis.specialty}</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground/60 shrink-0 ml-auto">
                        {new Date(avis.createdAt).toLocaleDateString("fr-FR", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Full-avis popup ── */}
      <Dialog open={selected !== null} onOpenChange={open => { if (!open) setSelected(null); }}>
        <DialogContent className="max-w-lg w-[92vw] max-h-[85vh] overflow-y-auto p-6 sm:p-8 bg-card border-border rounded-3xl">
          {selected && (
            <div className="flex flex-col gap-5">
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={18}
                    className={i < selected.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/20"}
                  />
                ))}
              </div>
              <p className="text-[0.95rem] leading-relaxed text-foreground/90 italic font-serif whitespace-pre-line">
                {selected.content}
              </p>
              <div className="flex items-center gap-3 pt-4 border-t border-border">
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold bg-primary/10 text-primary">
                  {getInitials(selected.doctorName)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">Dr. {selected.doctorName}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{selected.specialty}</p>
                </div>
                <p className="text-[10px] text-muted-foreground/60 shrink-0 ml-auto">
                  {new Date(selected.createdAt).toLocaleDateString("fr-FR", {
                    day: "numeric", month: "short", year: "numeric",
                  })}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

/* ── Contact form ─────────────────────────────────────────── */
function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
    setSending(true);
    try {
      const res = await fetch(`${BASE_URL}/api/contact/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || "Échec de l'envoi.");
      toast.success("Message envoyé", { description: "Nous vous répondrons dès que possible." });
      setName(""); setEmail(""); setMessage("");
    } catch (err) {
      toast.error("Échec de l'envoi du message", {
        description: err instanceof Error ? err.message : "Veuillez réessayer.",
      });
    } finally {
      setSending(false);
    }
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
        disabled={sending}
        className="w-full gradient-hero text-white font-semibold py-3 rounded-xl inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {sending ? "Envoi…" : "Envoyer"}
        <ArrowRight size={16} />
      </button>
    </form>
  );
}
