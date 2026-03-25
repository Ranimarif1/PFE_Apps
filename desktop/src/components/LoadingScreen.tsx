import { motion } from "framer-motion";

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 gradient-hero flex flex-col items-center justify-center z-50">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center gap-6"
      >
        <div className="relative">
          <div className="w-24 h-24 rounded-2xl gradient-hero border-2 border-white/30 flex items-center justify-center shadow-elevated">
            <span className="text-5xl">🩻</span>
          </div>
          <div className="absolute inset-0 rounded-2xl border-2 border-white/50 animate-pulse-ring" />
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-1">RadioAI</h1>
          <p className="text-white/70 text-sm">Plateforme de Transcription Médicale</p>
        </div>
        <div className="flex gap-1.5 mt-4">
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              className="w-2.5 h-2.5 rounded-full bg-white/60"
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}