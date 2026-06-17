// Phase 3.3 — "Used in" chain on the specimen card.
// Renders a mineral's path from ground to use as tappable pills; tapping a pill
// opens a bottom sheet with a fuller explanation + a real-world statistic.
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { USES_CHAINS, type UsesStep } from '@data/usesChains';

export function UsesChain({ mineralId, fallbackUses }: { mineralId: string; fallbackUses: string }) {
  const chain: UsesStep[] = USES_CHAINS[mineralId] ?? [
    { label: 'Uses', icon: '🛠️', detail: fallbackUses, stat: '' },
  ];
  const [sel, setSel] = useState<UsesStep | null>(null);

  return (
    <div className="uc-wrap">
      <div className="uc-label">Used in</div>
      <motion.div
        className="uc-chain"
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.08 } } }}
      >
        {chain.map((step, i) => (
          <motion.button
            key={i}
            type="button"
            className="uc-pill"
            variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
            onClick={() => setSel(step)}
          >
            <span className="uc-pill-icon" aria-hidden="true">{step.icon}</span>
            <span className="uc-pill-label">{step.label}</span>
          </motion.button>
        ))}
      </motion.div>

      <AnimatePresence>
        {sel && (
          <motion.div
            className="uc-sheet-overlay"
            onClick={() => setSel(null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="uc-sheet"
              onClick={(e) => e.stopPropagation()}
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            >
              <div className="uc-sheet-icon" aria-hidden="true">{sel.icon}</div>
              <div className="uc-sheet-title">{sel.label}</div>
              <p className="uc-sheet-detail">{sel.detail}</p>
              {sel.stat && <div className="uc-sheet-stat">{sel.stat}</div>}
              <button type="button" className="uc-sheet-close" onClick={() => setSel(null)}>Close</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
