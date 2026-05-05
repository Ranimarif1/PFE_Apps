import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Mic,
  ShieldCheck,
  Activity,
  Building2,
  Mail,
  MapPin,
  Phone,
  ArrowRight,
  ExternalLink,
  Stethoscope,
  BookOpen,
  GraduationCap,
  Globe2,
  Sparkles,
} from "lucide-react";
import { PublicNavbar } from "@/components/PublicNavbar";
import hospitalImg from "@/assets/téléchargement.jpeg";

const features = [
  {
    icon: Mic,
    title: "Dictée vocale intelligente",
    desc: "Transcription IA en temps réel adaptée au vocabulaire radiologique francophone.",
  },
  {
    icon: Activity,
    title: "Synchronisation multi-appareils",
    desc: "Connexion smartphone par QR code pour enregistrer où que vous soyez dans le service.",
  },
  {
    icon: ShieldCheck,
    title: "Sécurité hospitalière",
    desc: "Authentification JWT, contrôle d'accès par rôle et stockage chiffré des comptes rendus.",
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
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNavbar />

      {/* ───────── HERO ───────── */}
      <section id="top" className="relative pt-16 overflow-hidden bg-[#0D1119]">
        <div className="absolute inset-0">
          <img
            src={hospitalImg}
            alt="Hôpital Fattouma-Bourguiba Monastir"
            className="w-full h-full object-cover opacity-40"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, rgba(13,17,25,0.96) 0%, rgba(31,61,92,0.88) 45%, rgba(74,123,190,0.72) 100%)",
            }}
          />
          <div className="absolute inset-0 opacity-[0.06]">
            {[...Array(7)].map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full border-2 border-white"
                style={{
                  width: `${(i + 1) * 140}px`,
                  height: `${(i + 1) * 140}px`,
                  bottom: "-12%",
                  right: "-8%",
                }}
              />
            ))}
          </div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 py-20 lg:py-28">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 border border-white/25 backdrop-blur-sm mb-6">
              <Sparkles size={14} className="text-[#FDE68A]" />
              <span className="text-white text-xs font-semibold tracking-wide">
                CHU Fattouma-Bourguiba — Service de Radiologie
              </span>
            </div>

            <h1 className="text-[2.5rem] sm:text-[3.25rem] lg:text-[3.75rem] font-extrabold text-white leading-[1.05] tracking-tight mb-6">
              La transcription médicale,<br />
              <span className="text-[#FDE68A]">simple et intelligente.</span>
            </h1>

            <p className="text-white/85 text-base lg:text-lg max-w-2xl leading-relaxed mb-9">
              ReportEase est une plateforme dédiée aux radiologues et aux services hospitaliers.
              Dictée vocale assistée par IA, comptes rendus structurés, collaboration mobile par QR
              code — pensée pour libérer du temps clinique.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 gradient-hero text-white font-semibold px-5 py-3 rounded-xl"
              >
                Se connecter
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 backdrop-blur-sm text-white font-semibold px-5 py-3 rounded-xl border border-white/20 transition-colors"
              >
                Créer un compte
              </Link>
              <a
                href="#about"
                className="inline-flex items-center gap-2 text-white/80 hover:text-white font-semibold px-5 py-3 rounded-xl transition-colors"
              >
                En savoir plus
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ───────── FEATURES ───────── */}
      <section id="features" className="py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="max-w-2xl mb-12">
            <p className="text-eyebrow mb-3">Ce que nous offrons</p>
            <h2 className="text-display-lg lg:text-display-xl mb-4">
              Une plateforme conçue pour le quotidien des radiologues
            </h2>
            <p className="text-muted-foreground">
              Trois piliers techniques pensés autour des contraintes réelles d'un service
              d'imagerie médicale.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="bg-card rounded-2xl p-6 hover-lift"
              >
                <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <Icon size={20} />
                </div>
                <h3 className="text-base font-bold mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── ABOUT ───────── */}
      <section id="about" className="py-20 lg:py-24 bg-secondary/40 border-y border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div>
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
                { value: "3 rôles", label: "Médecin · Admin · IT" },
                { value: "Temps réel", label: "Streaming audio mobile" },
                { value: "Francophone", label: "Vocabulaire radiologique" },
              ].map((s) => (
                <div key={s.value} className="bg-card rounded-xl px-4 py-3">
                  <p className="text-sm font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
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
          </div>
        </div>
      </section>

      {/* ───────── STUDIES ───────── */}
      <section id="studies" className="py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="max-w-2xl mb-12">
            <p className="text-eyebrow mb-3">Études & Références</p>
            <h2 className="text-display-lg lg:text-display-xl mb-4">
              Sources de confiance en radiologie et transcription médicale
            </h2>
            <p className="text-muted-foreground">
              Une sélection d'organisations et de publications reconnues qui éclairent notre
              démarche scientifique et nos choix de conception.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {studies.map(({ icon: Icon, org, title, desc, href }) => (
              <a
                key={title}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-card rounded-2xl p-6 hover-lift flex gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Icon size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-bold tracking-wider uppercase text-primary">
                      {org}
                    </span>
                    <ExternalLink
                      size={12}
                      className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                  </div>
                  <h3 className="text-base font-bold mb-1.5 leading-tight">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </a>
            ))}
          </div>

          <p className="text-xs text-muted-foreground mt-8 italic">
            Les liens ci-dessus pointent vers les sites officiels des organisations citées.
            Veuillez vérifier que les ressources renvoyées correspondent à votre usage.
          </p>
        </div>
      </section>

      {/* ───────── CONTACT ───────── */}
      <section id="contact" className="py-20 lg:py-24 bg-secondary/40 border-t border-border">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 grid lg:grid-cols-2 gap-12 items-start">
          <div>
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
                {
                  icon: Mail,
                  label: "Email",
                  value: "contact@reportease.health",
                  href: "mailto:contact@reportease.health",
                },
                {
                  icon: MapPin,
                  label: "Adresse",
                  value: "Hôpital Fattouma-Bourguiba, 5000 Monastir, Tunisie",
                  href: undefined,
                },
                {
                  icon: Phone,
                  label: "Téléphone",
                  value: "+216 73 461 144",
                  href: "tel:+21673461144",
                },
              ].map(({ icon: Icon, label, value, href }) => {
                const inner = (
                  <div className="flex items-center gap-4 bg-card rounded-xl px-5 py-4 hover-lift">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Icon size={18} />
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                        {label}
                      </p>
                      <p className="text-sm font-medium mt-0.5">{value}</p>
                    </div>
                  </div>
                );
                return href ? (
                  <a key={label} href={href} className="block">
                    {inner}
                  </a>
                ) : (
                  <div key={label}>{inner}</div>
                );
              })}
            </div>
          </div>

          <div className="bg-card rounded-2xl p-7">
            <h3 className="text-lg font-bold mb-1">Envoyer un message</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Le formulaire ouvre votre client mail avec le contenu pré-rempli.
            </p>

            <ContactForm />
          </div>
        </div>
      </section>

      {/* ───────── FOOTER ───────── */}
      <footer className="border-t border-border py-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg overflow-hidden">
              <img src="/ReportEase.png" alt="ReportEase" className="w-full h-full object-cover" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-bold">ReportEase</p>
              <p className="text-[11px] text-muted-foreground">
                CHU Fattouma-Bourguiba de Monastir
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} ReportEase. Tous droits réservés.
          </p>
        </div>
      </footer>
    </div>
  );
}

function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(`[ReportEase] Message de ${name || "Visiteur"}`);
    const body = encodeURIComponent(
      `Nom : ${name}\nEmail : ${email}\n\n${message}`
    );
    window.location.href = `mailto:contact@reportease.health?subject=${subject}&body=${body}`;
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-1.5 block">Nom</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Votre nom"
          className="w-full px-4 py-2.5 text-sm"
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-1.5 block">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="votre@email.com"
          className="w-full px-4 py-2.5 text-sm"
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-1.5 block">Message</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
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
