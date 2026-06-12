// ---------------------------------------------------------------------------
// StarScape — Quiz game engine
// ---------------------------------------------------------------------------
// Runs a multiple-choice question set: shuffled options, immediate feedback
// with an explanation, running score, progress bar, and a results screen with
// replay. Used by most learning games across all three tiers.
// ---------------------------------------------------------------------------

import { useMemo, useState } from 'react';
import type { GameDef, QuizQuestion } from '@data/games';

interface ShuffledQuestion {
  q: string;
  explain: string;
  options: string[];
  answer: number;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function prepare(questions: QuizQuestion[]): ShuffledQuestion[] {
  return shuffle(questions).map((item) => {
    const correct = item.options[item.answer];
    const options = shuffle(item.options);
    return { q: item.q, explain: item.explain, options, answer: options.indexOf(correct) };
  });
}

interface QuizGameProps {
  game: GameDef;
  questions: QuizQuestion[];
  onExit: () => void;
}

export function QuizGame({ game, questions, onExit }: QuizGameProps) {
  const [run, setRun] = useState(0); // bump to reshuffle on replay
  const deck = useMemo(() => prepare(questions), [questions, run]);

  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const current = deck[index];
  const total = deck.length;

  const choose = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    if (i === current.answer) setScore((s) => s + 1);
  };

  const next = () => {
    if (index + 1 >= total) {
      setDone(true);
      return;
    }
    setIndex((n) => n + 1);
    setPicked(null);
  };

  const replay = () => {
    setRun((r) => r + 1);
    setIndex(0);
    setPicked(null);
    setScore(0);
    setDone(false);
  };

  if (done) {
    const pct = Math.round((score / total) * 100);
    const verdict =
      pct === 100 ? 'Perfect! You’re a star.' :
      pct >= 70 ? 'Great work — orbit achieved!' :
      pct >= 40 ? 'Good effort — keep exploring.' :
      'Every astronaut starts somewhere. Try again!';
    return (
      <div className="game-shell">
        <GameHeader game={game} onExit={onExit} />
        <div className="game-results">
          <div className="results-emoji" aria-hidden="true">{pct >= 70 ? '🚀' : pct >= 40 ? '🌟' : '🌑'}</div>
          <div className="results-score" style={{ color: game.accent }}>
            {score} / {total}
          </div>
          <div className="results-pct">{pct}%</div>
          <p className="results-verdict">{verdict}</p>
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

      <div className="quiz-progress" aria-hidden="true">
        <div
          className="quiz-progress-fill"
          style={{ width: `${(index / total) * 100}%`, background: game.accent }}
        />
      </div>
      <div className="quiz-meta">
        <span>Question {index + 1} of {total}</span>
        <span>Score {score}</span>
      </div>

      <h2 className="quiz-question">{current.q}</h2>

      <div className="quiz-options" role="group" aria-label="Answer choices">
        {current.options.map((opt, i) => {
          const isAnswer = i === current.answer;
          const isPicked = i === picked;
          let cls = 'quiz-option';
          if (picked !== null) {
            if (isAnswer) cls += ' quiz-option-correct';
            else if (isPicked) cls += ' quiz-option-wrong';
            else cls += ' quiz-option-dim';
          }
          return (
            <button
              key={i}
              className={cls}
              onClick={() => choose(i)}
              disabled={picked !== null}
            >
              {opt}
              {picked !== null && isAnswer && <span className="quiz-tick"> ✓</span>}
              {picked !== null && isPicked && !isAnswer && <span className="quiz-cross"> ✕</span>}
            </button>
          );
        })}
      </div>

      {picked !== null && (
        <div className="quiz-feedback">
          <div className={picked === current.answer ? 'quiz-verdict-good' : 'quiz-verdict-bad'}>
            {picked === current.answer ? 'Correct!' : 'Not quite.'}
          </div>
          <p>{current.explain}</p>
          <button className="game-btn game-btn-primary" onClick={next} style={{ background: game.accent }}>
            {index + 1 >= total ? 'See results' : 'Next question'}
          </button>
        </div>
      )}
    </div>
  );
}

export function GameHeader({ game, onExit }: { game: GameDef; onExit: () => void }) {
  return (
    <div className="game-header">
      <button className="game-back" onClick={onExit} aria-label="Back to games">← Games</button>
      <div className="game-title">
        <span className="game-title-icon" aria-hidden="true">{game.icon}</span>
        {game.title}
      </div>
      <span className="game-tier-badge" style={{ borderColor: game.accent, color: game.accent }}>
        {game.tier}
      </span>
    </div>
  );
}
