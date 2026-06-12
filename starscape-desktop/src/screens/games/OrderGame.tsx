// ---------------------------------------------------------------------------
// StarScape — Ordering game engine
// ---------------------------------------------------------------------------
// The learner taps items in the correct sequence (e.g. planets from the Sun,
// or objects by distance). Tapping in the right order locks the item in green;
// a wrong tap flashes red and reveals which item was expected. Finishes with a
// score (correct-on-first-try) and replay.
// ---------------------------------------------------------------------------

import { useMemo, useState } from 'react';
import type { GameDef, OrderChallenge } from '@data/games';
import { GameHeader } from './QuizGame';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface OrderGameProps {
  game: GameDef;
  challenge: OrderChallenge;
  onExit: () => void;
}

export function OrderGame({ game, challenge, onExit }: OrderGameProps) {
  const [run, setRun] = useState(0);
  // each item keeps its correct index so we can validate taps in any layout
  const deck = useMemo(
    () => shuffle(challenge.items.map((it, i) => ({ ...it, correct: i }))),
    [challenge, run]
  );

  const [placed, setPlaced] = useState<number[]>([]); // correct indices, in tap order
  const [wrongId, setWrongId] = useState<number | null>(null);
  const [mistakes, setMistakes] = useState(0);

  const total = challenge.items.length;
  const nextExpected = placed.length; // the correct index we want next
  const done = placed.length === total;

  const tap = (correctIdx: number) => {
    if (placed.includes(correctIdx)) return;
    if (correctIdx === nextExpected) {
      setPlaced((p) => [...p, correctIdx]);
      setWrongId(null);
    } else {
      setMistakes((m) => m + 1);
      setWrongId(correctIdx);
      window.setTimeout(() => setWrongId((w) => (w === correctIdx ? null : w)), 600);
    }
  };

  const replay = () => {
    setRun((r) => r + 1);
    setPlaced([]);
    setWrongId(null);
    setMistakes(0);
  };

  if (done) {
    const perfect = mistakes === 0;
    return (
      <div className="game-shell">
        <GameHeader game={game} onExit={onExit} />
        <div className="game-results">
          <div className="results-emoji" aria-hidden="true">{perfect ? '🏆' : '🌟'}</div>
          <div className="results-score" style={{ color: game.accent }}>
            {perfect ? 'Flawless!' : `${mistakes} slip${mistakes === 1 ? '' : 's'}`}
          </div>
          <p className="results-verdict">
            {perfect
              ? 'You placed every object in the right order, first try.'
              : 'Order complete — replay to go for a flawless run.'}
          </p>
          <div className="game-actions">
            <button className="game-btn game-btn-primary" onClick={replay} style={{ background: game.accent }}>
              Play again
            </button>
            <button className="game-btn" onClick={onExit}>Back to games</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="game-shell">
      <GameHeader game={game} onExit={onExit} />
      <p className="order-instruction">{challenge.instruction}</p>

      {/* The sequence built so far */}
      <ol className="order-track" aria-label="Your sequence so far">
        {placed.map((correctIdx, slot) => {
          const item = deck.find((d) => d.correct === correctIdx)!;
          return (
            <li key={correctIdx} className="order-slot order-slot-filled" style={{ borderColor: game.accent }}>
              <span className="order-num">{slot + 1}</span>
              <span className="order-slot-label">{item.label}</span>
              <span className="order-slot-sub">{item.sub}</span>
            </li>
          );
        })}
        {placed.length < total && (
          <li className="order-slot order-slot-next">
            <span className="order-num">{placed.length + 1}</span>
            <span className="order-slot-hint">tap the next one below</span>
          </li>
        )}
      </ol>

      {/* The remaining choices */}
      <div className="order-pool" role="group" aria-label="Remaining objects">
        {deck.map((item) => {
          if (placed.includes(item.correct)) return null;
          const cls = `order-chip${wrongId === item.correct ? ' order-chip-wrong' : ''}`;
          return (
            <button key={item.correct} className={cls} onClick={() => tap(item.correct)}>
              <span className="order-chip-label">{item.label}</span>
              <span className="order-chip-sub">{item.sub}</span>
            </button>
          );
        })}
      </div>

      <div className="quiz-meta">
        <span>{placed.length} of {total} placed</span>
        <span>Mistakes {mistakes}</span>
      </div>
    </div>
  );
}
