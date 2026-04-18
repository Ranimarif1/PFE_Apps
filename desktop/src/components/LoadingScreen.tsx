import { motion } from "framer-motion";

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center z-50"
      style={{
        background: `
          radial-gradient(ellipse 60% 50% at 60% 10%, rgba(74,123,190,0.08), transparent 60%),
          radial-gradient(ellipse 50% 60% at 20% 80%, rgba(217,119,6,0.05), transparent 60%),
          hsl(220, 17%, 98%)
        `
      }}>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center gap-6"
      >
        <div className="relative">
          <div className="w-24 h-24 rounded-3xl overflow-hidden"
            style={{ border: '2px solid rgba(255,255,255,0.40)', boxShadow: '0 8px 32px rgba(74,123,190,0.18)' }}>
            <img src="/ReportEase.png" alt="ReportEase" className="w-full h-full object-cover" />
          </div>
          <div className="absolute inset-0 rounded-3xl animate-pulse-ring"
            style={{ border: '2px solid rgba(74,123,190,0.45)' }} />
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full"
            style={{ background: '#4A7BBE', boxShadow: '0 0 12px rgba(74,123,190,0.50)' }} />
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-1"
            style={{ fontFamily: 'Inter, sans-serif', color: '#0B0D12', letterSpacing: '-0.03em' }}>
            ReportEase
          </h1>
          <p className="text-sm" style={{ color: '#5C6573' }}>
            Plateforme de Transcription Médicale
          </p>
        </div>
        <div className="flex gap-2 mt-2">
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full"
              style={{ background: i === 1 ? '#4A7BBE' : '#6B97D0' }}
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
