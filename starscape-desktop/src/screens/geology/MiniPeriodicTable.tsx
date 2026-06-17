// Phase 3.4 — mini periodic table for the assay card.
// Elements present in the specimen's formula glow and are tappable; tapping one
// opens a popover with its number/group/period, electron config and a fact.
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PERIODIC_LAYOUT, ELEMENT_DETAILS } from '@data/periodicElements';

export function MiniPeriodicTable({ activeSymbols }: { activeSymbols: string[] }) {
  const active = new Set(activeSymbols);
  const [sel, setSel] = useState<string | null>(null);
  const selEl = sel ? PERIODIC_LAYOUT.find(e => e.symbol === sel) ?? null : null;
  const selDetail = sel ? ELEMENT_DETAILS[sel] ?? null : null;

  return (
    <div className="pt-wrap">
      <div className="pt-grid" role="group" aria-label="Periodic table">
        {PERIODIC_LAYOUT.map(el => {
          const isActive = active.has(el.symbol);
          return (
            <button
              key={el.symbol}
              type="button"
              className={`pt-cell${isActive ? ' pt-cell-active' : ''}`}
              style={{ gridColumn: el.group, gridRow: el.period }}
              onClick={isActive ? () => setSel(el.symbol) : undefined}
              disabled={!isActive}
              aria-label={isActive ? `${el.symbol}, element ${el.number}` : el.symbol}
            >
              <span className="pt-num">{el.number}</span>
              <span className="pt-sym">{el.symbol}</span>
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {sel && selEl && (
          <motion.div
            className="pt-pop-overlay"
            onClick={() => setSel(null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="pt-pop"
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 24 }}
            >
              <div className="pt-pop-head">
                <span className="pt-pop-num">{selEl.number}</span>
                <span className="pt-pop-sym">{selEl.symbol}</span>
              </div>
              <div className="pt-pop-name">{selDetail?.name ?? selEl.symbol}</div>
              <div className="pt-pop-meta">Group {selEl.group} · Period {selEl.period}</div>
              {selDetail && <div className="pt-pop-config">{selDetail.config}</div>}
              {selDetail && <p className="pt-pop-fact">{selDetail.fact}</p>}
              <button type="button" className="pt-pop-close" onClick={() => setSel(null)}>Close</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
