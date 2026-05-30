import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import {
  Mic, Smartphone, Upload, FileAudio, FilePlus, Sparkles,
  AlertCircle, Trash2, History, Users, MessageSquare,
  Download, Brain, Database, ArrowRight, Eraser, CornerDownLeft,
  Quote, Languages, ScanLine, Stethoscope,
} from "lucide-react";

/* ── Reusable bits ───────────────────────────────────────────────────────── */

function Section({
  id, title, subtitle, icon: Icon, children,
}: {
  id?: string;
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="bg-card rounded-2xl border border-border shadow-card p-6 sm:p-7">
      <div className="flex items-start gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Icon size={20} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground leading-tight">{title}</h2>
          {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function CommandRow({
  spoken, result, note,
}: {
  spoken: React.ReactNode;
  result: React.ReactNode;
  note?: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] sm:items-center gap-2 sm:gap-4 py-2.5 border-b border-border last:border-0">
      <div className="flex items-center gap-2">
        <Quote size={11} className="text-muted-foreground shrink-0" />
        <span className="text-sm font-medium text-foreground italic">{spoken}</span>
      </div>
      <ArrowRight size={14} className="text-muted-foreground hidden sm:block shrink-0" />
      <div>
        <span className="text-sm font-mono bg-muted/60 text-foreground px-2 py-1 rounded border border-border">
          {result}
        </span>
        {note && <p className="text-[11px] text-muted-foreground mt-1">{note}</p>}
      </div>
    </div>
  );
}

function StepRow({
  n, title, children, icon: Icon,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
  icon: React.ElementType;
}) {
  return (
    <div className="flex gap-4 py-3">
      <div className="flex flex-col items-center shrink-0">
        <div className="w-8 h-8 rounded-full gradient-hero text-white text-sm font-bold flex items-center justify-center">
          {n}
        </div>
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <Icon size={15} className="text-primary" />
          <h3 className="font-semibold text-foreground text-sm">{title}</h3>
        </div>
        <div className="text-sm text-muted-foreground leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default function Aide() {
  const { user } = useAuth();
  const isMédecin = user?.rôle === "médecin";
  const isAdmin   = user?.rôle === "admin";
  const isAdminIT = user?.rôle === "adminIT";

  return (
    <AppLayout title="Aide & guide d'utilisation">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Intro */}
        <div className="bg-card rounded-2xl border border-border shadow-card p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center text-white">
              <Sparkles size={20} />
            </div>
            <h1 className="text-xl font-bold text-foreground">Bienvenue sur ReportEase</h1>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Cette page rassemble les principales fonctionnalités de la plateforme et,
            surtout, <span className="text-foreground font-medium">toutes les commandes vocales</span>{" "}
            disponibles pendant la dictée. Vous pouvez à tout moment revenir ici depuis
            la barre latérale.
          </p>

          {/* Quick anchors */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-5">
            {[
              { id: "dictee",      label: "Dictée vocale",     icon: Mic },
              { id: "rapport",     label: "Créer un rapport",  icon: FilePlus },
              { id: "categories",  label: "Catégories",        icon: ScanLine },
              { id: "statuts",     label: "Statuts",           icon: Stethoscope },
            ].map(({ id, label, icon: I }) => (
              <a key={id} href={`#${id}`}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/30 hover:bg-muted/60 hover:border-primary/40 text-xs font-medium text-foreground transition-colors">
                <I size={13} className="text-primary shrink-0" />
                {label}
              </a>
            ))}
          </div>
        </div>

        {/* ═══ DICTÉE VOCALE — section principale ═══ */}
        <Section
          id="dictee"
          title="Dictée vocale & commandes"
          subtitle="Les mots-clés que ReportEase reconnaît automatiquement pendant la dictée."
          icon={Mic}
        >
          <p className="text-sm text-muted-foreground mb-5">
            Le médecin parle naturellement en français. Le système reconnaît certaines
            expressions et les transforme en ponctuation, sauts de ligne ou actions.
          </p>

          {/* Sections du compte-rendu */}
          <div className="mb-6">
            <h3 className="text-xs font-bold tracking-wider uppercase text-muted-foreground mb-2">
              Mots-clés de structure
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              Dites le nom de la section et tout ce qui suit ira dans cette zone du rapport.
            </p>
            <div className="bg-muted/30 rounded-xl p-3">
              <CommandRow
                spoken="Indication"
                result="→ section Indication"
                note={<>Alias accepté : <span className="font-mono">renseignement clinique</span>.</>}
              />
              <CommandRow
                spoken="Technique"
                result="→ section Technique"
                note="Visible uniquement pour les rapports IRM et Scanner."
              />
              <CommandRow
                spoken="Résultat"
                result="→ section Résultat"
              />
              <CommandRow
                spoken="Conclusion"
                result="→ section Conclusion"
              />
            </div>
          </div>

          {/* Ponctuation dictée */}
          <div className="mb-6">
            <h3 className="text-xs font-bold tracking-wider uppercase text-muted-foreground mb-2">
              Ponctuation dictée
            </h3>
            <div className="bg-muted/30 rounded-xl p-3">
              <CommandRow
                spoken="à la ligne"
                result={<>retour à la ligne <CornerDownLeft size={11} className="inline" /></>}
                note={<>Si vous oubliez de dire « point » avant, un point est ajouté automatiquement.</>}
              />
              <CommandRow
                spoken="point à la ligne"
                result={<>. <CornerDownLeft size={11} className="inline" /></>}
              />
              <CommandRow
                spoken="deux points à la ligne"
                result={<>retour à la ligne <CornerDownLeft size={11} className="inline" /></>}
                note="Le « deux points » est consommé par la commande de saut de ligne."
              />
              <CommandRow
                spoken={<>deux points <span className="text-muted-foreground">(suivi d'une majuscule)</span></>}
                result=":"
                note="Pratique pour séparer un intitulé de son contenu (ex. « Indication deux points HTA »)."
              />
            </div>
          </div>

          {/* Commande efface */}
          <div className="mb-6">
            <h3 className="text-xs font-bold tracking-wider uppercase text-muted-foreground mb-2 flex items-center gap-1.5">
              <Eraser size={12} /> Effacer la dernière phrase
            </h3>
            <div className="bg-muted/30 rounded-xl p-3">
              <CommandRow
                spoken="effacer ça"
                result="supprime la phrase précédente"
                note="Variantes acceptées : « efface ça », « effacez ça », « effaces ça » (avec ou sans cédille)."
              />
            </div>
          </div>

          {/* Normalisation auto */}
          <div className="mb-6">
            <h3 className="text-xs font-bold tracking-wider uppercase text-muted-foreground mb-2 flex items-center gap-1.5">
              <Languages size={12} /> Normalisation automatique
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              Le système réécrit certaines expressions sans que vous ayez à y penser.
            </p>
            <div className="bg-muted/30 rounded-xl p-3">
              <CommandRow spoken="vingt-cinq milligrammes" result="25 mg" />
              <CommandRow spoken="cent vingt sur quatre-vingts" result="120/80" />
              <CommandRow spoken="trente-sept degrés celsius" result="37 °C" />
              <CommandRow spoken="treize avril deux mille vingt-six" result="13/04/2026" />
              <CommandRow
                spoken="i.r.m."
                result="IRM"
                note="Les abréviations médicales (IRM, TDM, FLAIR, T1, ECG…) sont auto-mises en majuscules."
              />
            </div>
          </div>

          {/* Tip box */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex gap-3">
            <Sparkles size={16} className="text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground mb-1">Conseil</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Une fois la transcription faite, cliquez sur <span className="font-semibold">Modifier</span>
                {" "}pour que l'<span className="font-medium text-foreground">Assistance IA</span> propose
                des corrections orthographiques sur le vocabulaire radiologique. Vous pouvez accepter
                ou ignorer en un clic.
              </p>
            </div>
          </div>
        </Section>

        {/* ═══ CRÉER UN RAPPORT ═══ */}
        <Section
          id="rapport"
          title="Créer un rapport"
          subtitle="Trois étapes, trois méthodes d'enregistrement."
          icon={FilePlus}
        >
          <StepRow n={1} title="Identifier l'examen" icon={ScanLine}>
            Saisissez l'<span className="font-mono font-medium text-foreground">ID Exam</span>{" "}
            (commençant par l'année en cours) puis choisissez le <span className="font-medium text-foreground">type d'examen</span>{" "}
            (Scanner, IRM, Radiographie, Échographie). Le système vérifie que l'ID
            n'est pas déjà pris.
          </StepRow>
          <StepRow n={2} title="Choisir une méthode d'enregistrement" icon={Mic}>
            Trois options :
            <ul className="mt-1.5 ml-3 space-y-0.5">
              <li>• <span className="text-foreground"><Mic size={11} className="inline" /> Microphone</span> — directement depuis l'ordinateur.</li>
              <li>• <span className="text-foreground"><Upload size={11} className="inline" /> Importer</span> — un fichier audio existant (MP3, WAV, M4A).</li>
              <li>• <span className="text-foreground"><Smartphone size={11} className="inline" /> Smartphone</span> — scannez le QR code avec votre téléphone pour enregistrer à distance.</li>
            </ul>
          </StepRow>
          <StepRow n={3} title="Dicter, valider, enregistrer" icon={Sparkles}>
            La transcription IA s'affiche automatiquement. Modifiez si nécessaire,
            puis choisissez : <span className="text-warning font-medium">Brouillon</span> (à reprendre plus tard),{" "}
            <span className="text-success font-medium">Valider</span> (correct mais à finaliser), ou{" "}
            <span className="text-primary font-medium">Enregistrer</span> (archivage définitif → CSV global).
          </StepRow>

          <div className="mt-4 bg-warning/10 border border-warning/30 rounded-xl p-4 flex gap-3">
            <AlertCircle size={16} className="text-warning shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground mb-1">Audios en attente</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Si la transcription échoue (problème réseau, modèle…), l'audio reste dans
                la file <FileAudio size={11} className="inline" /> <span className="font-medium text-foreground">Audios en attente</span>{" "}
                (barre latérale). Vous pouvez relancer la transcription, ou supprimer
                définitivement l'audio et son rapport associé via la corbeille.
              </p>
            </div>
          </div>
        </Section>

        {/* ═══ CATÉGORIES ═══ */}
        <Section
          id="categories"
          title="Catégories d'examen"
          subtitle="Quatre types reconnus, organisation automatique du dataset d'entraînement."
          icon={ScanLine}
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            {["Scanner", "IRM", "Radiographie", "Échographie"].map(c => (
              <div key={c} className="px-3 py-2 rounded-lg border border-border bg-muted/40 text-center">
                <p className="text-sm font-semibold text-foreground">{c}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="text-foreground font-medium">Scanner</span> et{" "}
            <span className="text-foreground font-medium">IRM</span> incluent automatiquement
            une section <span className="font-medium">Technique</span> dans le rapport.
            Les autres catégories n'affichent que <span className="font-medium">Indication</span>,{" "}
            <span className="font-medium">Résultat</span> et{" "}
            <span className="font-medium">Conclusion</span>.
          </p>
        </Section>

        {/* ═══ STATUTS ═══ */}
        <Section
          id="statuts"
          title="Statuts d'un rapport"
          subtitle="Le cycle de vie d'un compte-rendu."
          icon={Stethoscope}
        >
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="status-badge status-tone-warning shrink-0 mt-0.5">Brouillon</span>
              <p className="text-sm text-muted-foreground">
                Le rapport est encore en cours de rédaction. Visible uniquement par son auteur.
                L'<span className="text-foreground">ID Exam</span> et le{" "}
                <span className="text-foreground">type</span> peuvent être modifiés à ce stade.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="status-badge status-tone-success shrink-0 mt-0.5">Validé</span>
              <p className="text-sm text-muted-foreground">
                Le contenu a été validé mais n'est pas encore archivé. Le médecin auteur et
                l'administrateur peuvent le remettre en <span className="text-foreground">Brouillon</span> pour y apporter des corrections,
                puis le revalider.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="status-badge status-tone-info shrink-0 mt-0.5">Enregistré</span>
              <p className="text-sm text-muted-foreground">
                Archivé définitivement. Une copie part dans le CSV global accessible aux
                administrateurs. Le rapport devient en lecture seule.
              </p>
            </div>
          </div>
        </Section>

        {/* ═══ Pour les médecins ═══ */}
        {isMédecin && (
          <Section
            title="Côté médecin"
            subtitle="Les actions disponibles dans votre espace."
            icon={Mic}
          >
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <History size={14} className="text-primary mt-0.5 shrink-0" />
                <span><span className="text-foreground font-medium">Historique</span> — filtrez par statut, type d'examen, date ou ID. Bouton corbeille pour supprimer un rapport.</span>
              </li>
              <li className="flex items-start gap-2">
                <MessageSquare size={14} className="text-primary mt-0.5 shrink-0" />
                <span><span className="text-foreground font-medium">Réclamations</span> — signaler un problème technique à l'équipe IT.</span>
              </li>
            </ul>
          </Section>
        )}

        {/* ═══ Pour les admins ═══ */}
        {isAdmin && (
          <Section
            title="Côté administrateur"
            subtitle="Vos outils de gestion."
            icon={Users}
          >
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <Users size={14} className="text-primary mt-0.5 shrink-0" />
                <span><span className="text-foreground font-medium">Gérer médecins</span> — valider les nouvelles inscriptions, refuser, ou supprimer un compte.</span>
              </li>
              <li className="flex items-start gap-2">
                <Download size={14} className="text-primary mt-0.5 shrink-0" />
                <span><span className="text-foreground font-medium">Exporter Rapports</span> — télécharger un CSV des rapports archivés (filtrable par période).</span>
              </li>
              <li className="flex items-start gap-2">
                <History size={14} className="text-primary mt-0.5 shrink-0" />
                <span><span className="text-foreground font-medium">Historique</span> — vue globale (vos rapports + tous les rapports « enregistrés » des autres médecins).</span>
              </li>
            </ul>
          </Section>
        )}

        {/* ═══ Pour les admin IT ═══ */}
        {isAdminIT && (
          <Section
            title="Côté Admin IT"
            subtitle="Maintenance et entraînement du modèle."
            icon={Brain}
          >
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <Database size={14} className="text-primary mt-0.5 shrink-0" />
                <span><span className="text-foreground font-medium">Données d'entraînement</span> — exporter les paires audio + texte en ZIP, avec un dossier par catégorie (Scanner, IRM, …) prêt pour le ré-entraînement.</span>
              </li>
              <li className="flex items-start gap-2">
                <AlertCircle size={14} className="text-primary mt-0.5 shrink-0" />
                <span><span className="text-foreground font-medium">Réclamations</span> — traiter les signalements des médecins.</span>
              </li>
              <li className="flex items-start gap-2">
                <Users size={14} className="text-primary mt-0.5 shrink-0" />
                <span><span className="text-foreground font-medium">Comptes Admin</span> — valider ou refuser les nouveaux administrateurs.</span>
              </li>
            </ul>
          </Section>
        )}

        {/* Session */}
        <div className="bg-warning/10 border border-warning/30 rounded-2xl p-5 flex gap-3">
          <AlertCircle size={18} className="text-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground mb-1">Déconnexion automatique</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Pour des raisons de sécurité (poste partagé), si vous restez{" "}
              <span className="text-foreground font-medium">30 minutes sans activité</span>,
              un avertissement apparaît à l'écran. Vous avez alors{" "}
              <span className="text-foreground font-medium">1 minute</span> pour cliquer sur{" "}
              <span className="font-medium text-foreground">« Rester connecté »</span>, sinon
              vous serez déconnecté automatiquement.
            </p>
          </div>
        </div>

        {/* Contact */}
        <div className="bg-card rounded-2xl border border-border shadow-card p-6 text-center">
          <p className="text-xs text-muted-foreground">
            Une question ou un bug ? Utilisez l'onglet{" "}
            <span className="text-foreground font-medium">Réclamations</span> de la barre
            latérale, ou contactez l'équipe Admin IT.
          </p>
        </div>

        {/* Spacer */}
        <div className="h-8" />
      </div>
    </AppLayout>
  );
}
