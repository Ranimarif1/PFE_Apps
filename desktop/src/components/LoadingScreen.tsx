import { motion } from "framer-motion";

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center z-50"
      style={{
        background: `
          radial-gradient(ellipse 60% 50% at 70% 20%, rgba(0,201,167,0.18), transparent 60%),
          radial-gradient(ellipse 50% 60% at 20% 70%, rgba(10,110,245,0.15), transparent 60%),
          linear-gradient(160deg, #dce8f8, #eaf3fb, #d4ecf7)
        `
      }}>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center gap-6"
      >
        <div className="relative">
          <div className="w-24 h-24 rounded-3xl overflow-hidden shadow-elevated"
            style={{ border: '2px solid rgba(255,255,255,0.30)' }}>
            <img src="/ReportEase.png" alt="ReportEase" className="w-full h-full object-cover" />
          </div>
          <div className="absolute inset-0 rounded-3xl animate-pulse-ring"
            style={{ border: '2px solid rgba(0,201,167,0.40)' }} />
          {/* Teal glow dot */}
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full"
            style={{ background: 'var(--nv-teal)', boxShadow: '0 0 12px rgba(0,201,167,0.60)' }} />
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-1"
            style={{ fontFamily: 'Inter, sans-serif', color: 'var(--nv-navy)', letterSpacing: '-0.03em' }}>
            ReportEase
          </h1>
          <p className="text-sm" style={{ color: 'var(--nv-muted)' }}>
            Plateforme de Transcription Médicale
          </p>
        </div>
        <div className="flex gap-2 mt-2">
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full"
              style={{ background: i === 1 ? 'var(--nv-teal)' : 'var(--nv-blue)' }}
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}