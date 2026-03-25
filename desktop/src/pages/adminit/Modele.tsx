import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Brain, Upload, Rocket, CheckCircle } from "lucide-react";

const mockModèles = [
  { id: "m1", version: "v2.4.1", date: "2024-01-10", uploadéPar: "Admin IT", actif: true },
  { id: "m2", version: "v2.3.0", date: "2023-11-20", uploadéPar: "Admin IT", actif: false },
  { id: "m3", version: "v2.2.5", date: "2023-09-05", uploadéPar: "Admin IT", actif: false },
];

export default function AdminITModele() {
  const [modèles, setModèles] = useState(mockModèles);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);

  const handleUpload = async () => {
    setUploading(true);
    await new Promise(r => setTimeout(r, 2000));
    setModèles(prev => [
      { id: `m${Date.now()}`, version: "v2.5.0", date: new Date().toLocaleDateString("fr-FR"), uploadéPar: "Admin IT", actif: false },
      ...prev,
    ]);
    setUploading(false);
    setUploaded(true);
    setTimeout(() => setUploaded(false), 3000);
  };

  const activate = (id: string) => {
    setModèles(prev => prev.map(m => ({ ...m, actif: m.id === id })));
  };

  return (
    <AppLayout title="Gestion du modèle IA">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Upload */}
        <div className="bg-card rounded-xl border border-border shadow-card p-6">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Upload size={18} className="text-primary" /> Uploader une nouvelle version
          </h3>
          <label className="block cursor-pointer">
            <div className="border-2 border-dashed border-primary/40 rounded-2xl p-10 text-center hover:border-primary hover:bg-primary/5 transition-all">
              <Brain className="w-12 h-12 text-primary/60 mx-auto mb-3" />
              <p className="font-semibold text-foreground mb-1">Sélectionner le fichier du modèle</p>
              <p className="text-sm text-muted-foreground">.pt, .onnx, .bin — Envoyé vers FastAPI /model/update</p>
            </div>
            <input type="file" className="hidden" onChange={handleUpload} />
          </label>
          {uploading && (
            <div className="mt-4 flex items-center gap-2 text-primary text-sm">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              Upload en cours vers FastAPI...
            </div>
          )}
          {uploaded && (
            <div className="mt-4 flex items-center gap-2 bg-success/10 border border-success/30 rounded-xl px-4 py-3 text-success text-sm">
              <CheckCircle size={16} /> Modèle v2.5.0 uploadé avec succès.
            </div>
          )}
        </div>

        {/* History */}
        <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="font-semibold text-foreground">Historique des versions</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {["Version", "Date", "Uploadé par", "Statut", "Action"].map(h => (
                  <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {modèles.map(m => (
                <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 font-mono font-bold text-foreground">{m.version}</td>
                  <td className="px-6 py-4 text-muted-foreground">{m.date}</td>
                  <td className="px-6 py-4 text-muted-foreground">{m.uploadéPar}</td>
                  <td className="px-6 py-4">
                    {m.actif ? (
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-success/10 text-success">✅ Actif</span>
                    ) : (
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground">Inactif</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {!m.actif && (
                      <button onClick={() => activate(m.id)}
                        className="flex items-center gap-1.5 text-primary hover:text-primary/80 text-xs font-medium transition-colors">
                        <Rocket size={13} /> Activer
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
