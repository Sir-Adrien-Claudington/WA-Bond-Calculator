// ---------------------------------------------------------------------------
// GeoScape — Scratch Test (Phase 3.2)
// ---------------------------------------------------------------------------
// Tap one mineral, then tap another: the harder mineral scratches the softer.
// This is how mineral hardness is *actually* tested in the field — so we work
// over the canonical MINERALS reference set (the real Mohs scale, talc=1 …
// diamond=10), not the player's mined collection. That means the lab is useful
// even before you've mined anything.
//
// Interaction is TAP-TO-PICK (same pattern as CombineLab), NOT drag — touch
// drag is unreliable on iOS Safari (page-scroll / text-selection callout fire
// mid-gesture). Tap → select; tap the same chip → deselect; tap a different
// chip → resolve the scratch, record it, and show the outcome.
// ---------------------------------------------------------------------------
import { useState, type CSSProperties } from 'react';
import '../../styles/geology.css';
import { GeoNav } from './GeoNav';
import { MINERALS } from '@data/geology';
import { parseMohs } from '@data/specimen';
import { scratchTest, type Scratchable } from '../../utils/mohs';
import { useMineGameStore } from '../../store/mineGameStore';

interface ScratchTestProps {
  pathname: string;
  onNavigate: (path: string) => void;
}

interface ScratchMineral extends Scratchable {
  color: string;
}

// Canonical reference set, sorted softest → hardest for a tidy tray.
const SCRATCH_MINERALS: ScratchMineral[] = MINERALS
  .map(m => ({ id: m.id, name: m.name, mohs: parseMohs(m.mohs), color: m.color }))
  .sort((a, b) => a.mohs - b.mohs);

const byId = (id: string) => SCRATCH_MINERALS.find(m => m.id === id);

interface Outcome {
  tie: boolean;
  harderId?: string;
  softerId?: string;
}

export function ScratchTest({ pathname, onNavigate }: ScratchTestProps) {
  const testedMinerals = useMineGameStore(s => s.testedMinerals);
  const recordScratch  = useMineGameStore(s => s.recordScratch);
  const clearTested    = useMineGameStore(s => s.clearTested);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [outcome,    setOutcome]    = useState<Outcome | null>(null);

  // Tap-to-pick: first tap selects, same tap deselects, different tap resolves.
  const pick = (m: ScratchMineral) => {
    if (!selectedId) {
      setSelectedId(m.id);
      setOutcome(null);
      return;
    }
    if (selectedId === m.id) {
      setSelectedId(null);
      return;
    }
    const a = byId(selectedId);
    const b = m;
    if (a) {
      const r = scratchTest(a, b);
      setOutcome({ tie: r.tie, harderId: r.harder?.id, softerId: r.softer?.id });
      recordScratch(a.id, b.id);
    }
    setSelectedId(null);
  };

  // Empirically-tested minerals, ranked softest → hardest (the payoff ladder).
  const ladder = testedMinerals
    .map(byId)
    .filter((m): m is ScratchMineral => !!m)
    .sort((a, b) => a.mohs - b.mohs);

  let resultText = '';
  if (outcome) {
    if (outcome.tie) {
      resultText = 'Same hardness — neither leaves a mark. It’s a draw.';
    } else {
      const h = byId(outcome.harderId!);
      const s = byId(outcome.softerId!);
      resultText = `${h?.name} scratched ${s?.name} — ${s?.name} is softer.`;
    }
  }

  return (
    <div className="cl-root">
      <GeoNav pathname={pathname} onNavigate={onNavigate} />

      <div className="cl-wrap">
        <header className="cl-head">
          <span className="cl-eyebrow">⛏ Scratch Test</span>
          <h1 className="cl-title">Test the Hardness</h1>
          <p className="cl-sub">
            Tap one mineral, then tap another. The harder one scratches the
            softer — exactly how geologists rank the Mohs scale in the field.
          </p>
        </header>

        {/* Result banner */}
        <div className={`st-result${outcome ? (outcome.tie ? ' st-result-tie' : ' st-result-win') : ''}`}>
          {resultText
            || (selectedId
              ? `${byId(selectedId)?.name} selected — tap another mineral to scratch it.`
              : 'Tap a mineral to begin.')}
        </div>

        {/* Mineral tray — tap two to scratch */}
        <section className="cl-section">
          <h2 className="cl-section-head">Minerals <span>(softest → hardest)</span></h2>
          <div className="cl-grid">
            {SCRATCH_MINERALS.map(m => {
              const isSelected = selectedId === m.id;
              const justSofter = outcome && !outcome.tie && outcome.softerId === m.id;
              const justHarder = outcome && !outcome.tie && outcome.harderId === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  className={
                    'cl-card st-chip' +
                    (isSelected ? ' cl-card-active' : '') +
                    (justSofter ? ' st-chip-softer' : '') +
                    (justHarder ? ' st-chip-harder' : '')
                  }
                  style={{ '--mc': m.color } as CSSProperties}
                  onClick={() => pick(m)}
                  aria-pressed={isSelected}
                  aria-label={`${m.name}, hardness ${m.mohs} Mohs. Tap to scratch against another mineral.`}
                >
                  <span className="cl-card-gem" />
                  <span className="cl-card-name">{m.name}</span>
                  <span className="cl-card-purity">{m.mohs}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Hardness ladder — what you've empirically placed on the scale */}
        <section className="cl-section">
          <h2 className="cl-section-head st-ladder-head">
            <span className="st-ladder-title">
              Your Hardness Ladder <span>({ladder.length}/{SCRATCH_MINERALS.length} tested)</span>
            </span>
            {ladder.length > 0 && (
              <button
                type="button"
                className="st-reset-btn"
                onClick={() => { clearTested(); setOutcome(null); setSelectedId(null); }}
                aria-label="Reset the hardness ladder and clear all tested minerals"
              >
                Reset ladder
              </button>
            )}
          </h2>
          {ladder.length === 0 ? (
            <p className="cl-empty">Nothing tested yet. Scratch a few minerals together and they’ll line up here, softest at the bottom.</p>
          ) : (
            <ol className="st-ladder">
              {ladder.map(m => (
                <li key={m.id} className="st-rung" style={{ '--mc': m.color } as CSSProperties}>
                  <span className="st-rung-dot" />
                  <span className="st-rung-name">{m.name}</span>
                  <span className="st-rung-mohs">{m.mohs} Mohs</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
