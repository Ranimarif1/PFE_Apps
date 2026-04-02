import { useState, useRef } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Save, Camera } from "lucide-react";
import { updateProfileApi } from "@/services/authService";

function UserAvatar({ photo, genre, prénom, nom, size = 16 }: { photo: string; genre: string; prénom: string; nom: string; size?: number }) {
  if (photo) {
    return (
      <img
        src={photo}
        alt="Photo de profil"
        className={`w-${size} h-${size} rounded-2xl object-cover`}
      />
    );
  }
  if (genre === "femme") {
    return (
      <div className={`w-${size} h-${size} rounded-2xl bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center`}>
        <svg viewBox="0 0 64 64" className="w-10 h-10" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="20" r="12" fill="#f9a8d4" />
          <path d="M12 56c0-11.046 8.954-20 20-20s20 8.954 20 20" fill="#f9a8d4" />
          <circle cx="32" cy="20" r="10" fill="#fbcfe8" />
          <ellipse cx="32" cy="56" rx="18" ry="10" fill="#f9a8d4" />
        </svg>
      </div>
    );
  }
  if (genre === "homme") {
    return (
      <div className={`w-${size} h-${size} rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center`}>
        <svg viewBox="0 0 64 64" className="w-10 h-10" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="20" r="12" fill="#93c5fd" />
          <path d="M12 56c0-11.046 8.954-20 20-20s20 8.954 20 20" fill="#93c5fd" />
          <circle cx="32" cy="20" r="10" fill="#bfdbfe" />
          <ellipse cx="32" cy="56" rx="18" ry="10" fill="#93c5fd" />
        </svg>
      </div>
    );
  }
  return (
    <div className={`w-${size} h-${size} rounded-2xl gradient-hero flex items-center justify-center text-white text-2xl font-bold`}>
      {prénom?.[0]}{nom?.[0]}
    </div>
  );
}

export default function Profil() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({
    nom: user?.nom || "", prénom: user?.prénom || "", email: user?.email || "",
    password: "", confirm: "",
  });
  const [photo, setPhoto] = useState(user?.photo || "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPhoto(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password && form.password !== form.confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (form.password && form.password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    setLoading(true);
    try {
      const payload: Record<string, string> = {
        nom: form.nom,
        prenom: form.prénom,
        email: form.email,
        photo,
      };
      if (form.password) payload.password = form.password;
      const updated = await updateProfileApi(payload);
      updateUser(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de la mise à jour.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout title="Mon profil">
      <div className="max-w-lg mx-auto">
        <div className="bg-card rounded-2xl border border-border shadow-card p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="relative">
              <UserAvatar photo={photo} genre={user?.genre || ""} prénom={form.prénom} nom={form.nom} size={16} />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-md hover:opacity-90 transition-opacity"
                title="Changer la photo"
              >
                <Camera size={12} className="text-white" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </div>
            <div>
              <p className="font-bold text-foreground text-lg">
                Dr. {form.prénom} {form.nom}
              </p>
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
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Confirmer le mot de passe</label>
              <input type="password" value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="••••••••" />
            </div>


            {error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3 text-destructive text-sm">{error}</div>
            )}
            {saved && (
              <div className="bg-success/10 border border-success/30 rounded-xl px-4 py-3 text-success text-sm">
                ✅ Profil mis à jour avec succès.
              </div>
            )}

            <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 gradient-hero text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-all disabled:opacity-60">
              <Save size={16} /> {loading ? "Sauvegarde..." : "Sauvegarder"}
            </button>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
