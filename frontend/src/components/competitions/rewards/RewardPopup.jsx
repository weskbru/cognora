import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, TrendingUp, Zap } from 'lucide-react';

export default function RewardPopup({ popup, onClose }) {
  useEffect(() => {
    if (!popup) return;
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [popup, onClose]);

  return (
    <AnimatePresence>
      {popup && (
        <motion.div
          initial={{ opacity: 0, y: 80, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="fixed bottom-6 right-6 z-50 max-w-xs"
          onClick={onClose}
        >
          <div className={`rounded-2xl shadow-2xl p-4 cursor-pointer border ${
            popup.levelUp
              ? 'bg-gradient-to-br from-primary to-accent text-white border-transparent'
              : 'bg-card border-border'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${
                popup.levelUp ? 'bg-white/20' : 'bg-primary/10'
              }`}>
                {popup.levelUp
                  ? <TrendingUp className="h-5 w-5 text-white" />
                  : <Zap className="h-5 w-5 text-primary" />
                }
              </div>
              <div className="flex-1 min-w-0">
                {popup.levelUp && (
                  <p className="text-xs font-bold uppercase tracking-widest text-white/80 mb-0.5">
                    Level Up! 🎉
                  </p>
                )}
                <p className={`text-sm font-semibold leading-snug ${popup.levelUp ? 'text-white' : 'text-foreground'}`}>
                  {popup.reason}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <Star className={`h-3.5 w-3.5 ${popup.levelUp ? 'text-yellow-300' : 'text-amber-500'}`} />
                  <span className={`text-sm font-bold ${popup.levelUp ? 'text-yellow-300' : 'text-amber-500'}`}>
                    +{popup.xp} XP
                  </span>
                  {popup.levelUp && popup.newLevel && (
                    <span className="text-white/80 text-xs ml-1">→ Nível {popup.newLevel}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}