// ---------------------------------------------------------------------------
// StarScape — Learning Games hub
// ---------------------------------------------------------------------------
// Lands on a tiered catalogue (beginner / intermediate / knowledgeable). Pick
// a game and the matching engine (quiz or ordering) takes over; exit returns
// to the hub. An optional `level` filter lets EduTrack deep-link a single tier
// (e.g. /games?level=beginner), and `embed` trims the chrome for in-frame use.
// ---------------------------------------------------------------------------

import { useState } from 'react';
import {
  GAMES,
  QUIZZES,
  ORDERS,
  TIER_META,
  type GameDef,
  type Tier,
} from '@data/games';
import { QuizGame } from './games/QuizGame';
import { OrderGame } from './games/OrderGame';
import '../styles/games.css';

const TIER_ORDER: Tier[] = ['beginner', 'intermediate', 'knowledgeable'];

interface GamesHubProps {
  level?: Tier | null;
  embed?: boolean;
}

export function GamesHub({ level = null, embed = false }: GamesHubProps) {
  const [active, setActive] = useState<GameDef | null>(null);

  if (active) {
    const exit = () => setActive(null);
    if (active.kind === 'quiz') {
      return (
        <div className={`games-root${embed ? ' games-embed' : ''}`}>
          <QuizGame game={active} questions={QUIZZES[active.id]} onExit={exit} />
        </div>
      );
    }
    return (
      <div className={`games-root${embed ? ' games-embed' : ''}`}>
        <OrderGame game={active} challenge={ORDERS[active.id]} onExit={exit} />
      </div>
    );
  }

  const tiers = level ? [level] : TIER_ORDER;

  return (
    <div className={`games-root${embed ? ' games-embed' : ''}`}>
      <header className="games-hero">
        <div className="games-kicker">StarScape · Learning Games</div>
        <h1 className="games-h1">Explore the Universe by Playing</h1>
        <p className="games-sub">
          Bite-sized space games sorted by level. Start gentle, then work your way out
          to black holes and the edge of the galaxy.
        </p>
      </header>

      {tiers.map((tier) => {
        const meta = TIER_META[tier];
        const games = GAMES.filter((g) => g.tier === tier);
        return (
          <section className="tier-section" key={tier} aria-labelledby={`tier-${tier}`}>
            <div className="tier-head">
              <span className="tier-pill" style={{ background: meta.color }}>{meta.level}</span>
              <h2 className="tier-title" id={`tier-${tier}`}>{meta.label}</h2>
              <p className="tier-note">{meta.note}</p>
            </div>
            <div className="game-grid">
              {games.map((g) => (
                <button
                  key={g.id}
                  className="game-card"
                  onClick={() => setActive(g)}
                  style={{ ['--accent' as string]: g.accent }}
                >
                  <span className="game-card-icon" aria-hidden="true">{g.icon}</span>
                  <span className="game-card-title">{g.title}</span>
                  <span className="game-card-blurb">{g.blurb}</span>
                  <span className="game-card-kind">{g.kind === 'quiz' ? 'Quiz' : 'Ordering'} ›</span>
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
