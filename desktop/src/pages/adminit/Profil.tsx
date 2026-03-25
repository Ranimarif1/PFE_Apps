import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Save, Radio } from "lucide-react";

export default function AdminITProfil() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    nom: user?.nom || "", prénom: user?.prénom || "", email: user?.email || "",
    password: "", confirm: "",
  });
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await new Promise(r => setTimeout(r, 800));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <AppLayout title="Mon profil">
      <div className="max-w-lg mx-auto">
        <div className="bg-card rounded-2xl border border-border shadow-card p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-2xl gradient-hero flex items-center justify-center text-white text-2xl font-bold">
              {user?.prénom?.[0]}{user?.nom?.[0]}
            </div>
            <div>
              <p className="font-bold text-foreground text-lg">{user?.prénom} {user?.nom}</p>
              <div className="flex items-center gap-2 mt-1">
                <Radio size={12} className="text-primary" />
                <span className="text-xs font-semibold text-primary">🩻 Service Radiologie — Admin IT</span>
              </div>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Prénom</label>
                <input value={form.prénom} onChange={e => setForm(f => ({ ...f, prénom: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Nom</label>
                <input value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Nouveau mot de passe</label>
              <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Laisser vide pour ne pas modifier" />
            </div>
            {saved && (
              <div className="bg-success/10 border border-success/30 rounded-xl px-4 py-3 text-success text-sm">
                ✅ Profil mis à jour avec succès.
              </div>
            )}
            <button type="submit" className="w-full flex items-center justify-center gap-2 gradient-hero text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-all">
              <Save size={16} /> Sauvegarder
            </button>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
