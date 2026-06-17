// ---------------------------------------------------------------------------
// GeoScape — Combine Lab (Phase 2)
// Tap-to-place (no HTML5 drag — broken on iOS Safari): pick two specimens from
// your collection, smelt them into an alloy or doped gem. Purity-gated yield.
// ---------------------------------------------------------------------------
import { useState, type CSSProperties } from 'react';
import '../../styles/geology.css';
import { GeoNav } from './GeoNav';
import { MINERALS } from '@data/geology';
import type { Specimen } from '@data/specimen';
import { ALL_RECIPES } from '@data/recipes';
import { matchRecipe } from '../../utils/combine';
import { PURITY_BANDS } from '../../utils/purity';
import { useMineGameStore } from '../../store/mineGameStore';

interface CombineLabProps {
  pathname: string;
  onNavigate: (path: string) => void;
}

const mineralName = (id: string) => MINERALS.find(m => m.id === id)?.name ?? id;
const bandColor = (band: string) =>
  PURITY_BANDS.find(b => b.band === band)?.color ?? '#d4af52';

function SlotView({ specimen, label, onClear }: {
  specimen: Specimen | null; label: string; onClear: () => void;
}) {
  if (!specimen) {
    return <div className="cl-slot cl-slot-empty"><span>{label}</span></div>;
  }
  return (
    <button type="button" className="cl-slot cl-slot-filled" onClick={onClear} aria-label={`Remove ${specimen.name} from ${label}`}>
      <span className="cl-slot-gem" style={{ background: specimen.colour }} />
      <span className="cl-slot-name">{specimen.name}</span>
      <span className="cl-slot-purity" style={{ color: bandColor(specimen.purityBand) }}>
        {specimen.purityScore}%
      </span>
    </button>
  );
}

export function CombineLab({ pathname, onNavigate }: CombineLabProps) {
  const collection        = useMineGameStore(s => s.collection);
  const slotA             = useMineGameStore(s => s.slotA);
  const slotB             = useMineGameStore(s => s.slotB);
  const discoveredRecipes = useMineGameStore(s => s.discoveredRecipes);
  const setSlot           = useMineGameStore(s => s.setSlot);
  const smelt             = useMineGameStore(s => s.smelt);

  const [reveal, setReveal] = useState<Specimen | null>(null); // smelt result overlay
  const [shown,  setShown]  = useState(false);                 // result revealed vs molten
  const [noRecipe, setNoRecipe] = useState(false);

  const preview = slotA && slotB ? matchRecipe([slotA.mineralId, slotB.mineralId]) : null;

  const place = (s: Specimen) => {
    setNoRecipe(false);
    if (slotA?.id === s.id) { setSlot('A', null); return; }
    if (slotB?.id === s.id) { setSlot('B', null); return; }
    if (!slotA) setSlot('A', s);
    else if (!slotB) setSlot('B', s);
    else setSlot('A', s);
  };

  const doSmelt = () => {
    if (!slotA || !slotB) return;
    const result = smelt();
    if (!result) { setNoRecipe(true); return; }
    setReveal(result);
    setShown(false);
    window.setTimeout(() => setShown(true), 1500);
  };

  const closeReveal = () => { setReveal(null); setShown(false); };

  const inSlot = (id: string) => slotA?.id === id || slotB?.id === id;

  return (
    <div className="cl-root">
      <GeoNav pathname={pathname} onNavigate={onNavigate} />

      <div className="cl-wrap">
        <header className="cl-head">
          <span className="cl-eyebrow">⚗ Combine Lab</span>
          <h1 className="cl-title">Smelt &amp; Synthesise</h1>
          <p className="cl-sub">Fuse two specimens into an alloy or a doped gem. Output quality follows input purity.</p>
        </header>

        {/* Bench: A + B → result */}
        <div className="cl-bench">
          <SlotView specimen={slotA} label="Slot A" onClear={() => setSlot('A', null)} />
          <span className="cl-op">+</span>
          <SlotView specimen={slotB} label="Slot B" onClear={() => setSlot('B', null)} />
          <span className="cl-op">→</span>
          <div className={`cl-result-preview${preview ? ' cl-result-live' : ''}`}>
            {preview ? (
              <>
                <span className="cl-slot-gem" style={{ background: preview.outputColor }} />
                <span className="cl-slot-name">{preview.outputName}</span>
                <span className="cl-preview-type">{preview.type}</span>
              </>
            ) : (
              <span className="cl-result-q">?</span>
            )}
          </div>
        </div>

        <button
          type="button"
          className="cl-smelt-btn"
          disabled={!preview}
          onClick={doSmelt}
        >
          {preview ? `Smelt → ${preview.outputName}` : slotA && slotB ? 'No known recipe' : 'Select two specimens'}
        </button>
        {noRecipe && <p className="cl-msg">These two don’t form a known alloy or gem — try another pair.</p>}

        {/* Collection */}
        <section className="cl-section">
          <h2 className="cl-section-head">Collection <span>({collection.length})</span></h2>
          {collection.length === 0 ? (
            <p className="cl-empty">
              Nothing here yet. Head to the <a href="/mine-game" onClick={(e) => { e.preventDefault(); onNavigate('/mine-game'); }}>Mine Game</a>,
              extract some specimens, and they’ll appear here to combine.
            </p>
          ) : (
            <div className="cl-grid">
              {collection.map(s => (
                <button
                  key={s.id}
                  type="button"
                  className={`cl-card${inSlot(s.id) ? ' cl-card-active' : ''}`}
                  onClick={() => place(s)}
                  style={{ '--mc': s.colour } as CSSProperties}
                >
                  <span className="cl-card-gem" />
                  <span className="cl-card-name">{s.name}</span>
                  <span className="cl-card-purity" style={{ color: bandColor(s.purityBand) }}>{s.purityScore}%</span>
                  {(s.isAlloy || s.isSynthetic) && <span className="cl-card-tag">{s.isAlloy ? 'alloy' : 'synth'}</span>}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Recipe book */}
        <section className="cl-section">
          <h2 className="cl-section-head">Recipe Book <span>({discoveredRecipes.length}/{ALL_RECIPES.length})</span></h2>
          <div className="cl-recipes">
            {ALL_RECIPES.map(r => {
              const found = discoveredRecipes.includes(r.id);
              return (
                <div key={r.id} className={`cl-recipe${found ? ' cl-recipe-found' : ''}`}>
                  <span className="cl-recipe-io">
                    {r.inputs.map(mineralName).join(' + ')}
                    <span className="cl-recipe-arrow"> → </span>
                    <b style={{ color: r.outputColor }}>{found ? r.outputName : '? ? ?'}</b>
                  </span>
                  <span className="cl-recipe-unlocks">{found ? r.unlocks : 'Undiscovered'}</span>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Smelt animation overlay */}
      {reveal && (
        <div className="cl-smelt-overlay" role="dialog" aria-label="Smelting">
          {!shown ? (
            <div className="cl-crucible">
              <div className="cl-molten" />
              <div className="cl-smelt-label">Smelting…</div>
              <button type="button" className="cl-skip" onClick={() => setShown(true)}>Skip</button>
            </div>
          ) : (
            <div className="cl-reveal-card" style={{ '--mc': reveal.colour } as CSSProperties}>
              <div className="cl-reveal-gem" />
              <div className="cl-reveal-name">{reveal.name}</div>
              <div className="cl-reveal-formula">{reveal.formula}</div>
              <div className="cl-reveal-purity" style={{ color: bandColor(reveal.purityBand) }}>
                Purity {reveal.purityScore}% · {reveal.purityBand}
              </div>
              {reveal.inclusions.length > 0 && (
                <div className="cl-reveal-flaw">⚠ {reveal.inclusions.length} structural flaw{reveal.inclusions.length > 1 ? 's' : ''}</div>
              )}
              <button type="button" className="cl-reveal-btn" onClick={closeReveal}>Add to Collection ✓</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
