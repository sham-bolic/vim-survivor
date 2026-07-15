"use client";

import { useCallback, useState } from "react";
import { Arena } from "@/components/Arena";
import { Hud } from "@/components/Hud";
import { Editor } from "@/components/Editor/Editor";
import { useGameLoop } from "@/components/useGameLoop";
import type { VimChallenge } from "@/lib/challenges";

export function GameLayout() {
  const { gameState, snapshot, start, restart, registerSolve } = useGameLoop();
  const [challenge, setChallenge] = useState<VimChallenge | null>(null);
  const [restartKey, setRestartKey] = useState(0);

  // The editor owns the challenge bag and reports every change here (see
  // ADR 0004). A non-initial change is a solve: turn it into the game loop's
  // Repel + Score bump. `registerSolve` is stable, so this callback stays
  // stable - which the memoized Editor relies on to ignore the ~60x/sec
  // snapshot re-renders.
  const handleChallengeChange = useCallback(
    (next: VimChallenge, isInitial: boolean) => {
      setChallenge(next);
      if (!isInitial) registerSolve();
    },
    [registerSolve]
  );

  const handleRestart = useCallback(() => {
    // Remount the editor (fresh bag + focus) and reset the survival numbers.
    setRestartKey((key) => key + 1);
    restart();
  }, [restart]);

  const active = gameState === "PLAYING";

  return (
    <div className="relative flex min-h-screen w-screen flex-col overflow-y-auto bg-[var(--background)]">
      <Hud
        score={snapshot.score}
        elapsedSeconds={snapshot.playingSeconds}
        onRestart={handleRestart}
      />
      {/* Frameless visuals zone on top; the larger flex weight (vs the bottom
          spacer) drops the editor block just below vertical center. */}
      <div className="flex-[3] min-h-0">
        <Arena snapshot={snapshot} />
      </div>
      {/* Centered editor column: editor -> mode chip -> target (see Editor). */}
      <section className="mx-auto w-full max-w-2xl flex-none px-6">
        <Editor
          key={restartKey}
          active={active}
          challenge={challenge}
          onChallengeChange={handleChallengeChange}
        />
      </section>
      <div className="flex-[2]" />

      {gameState === "IDLE" && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/70 backdrop-blur-sm">
          <button
            onClick={start}
            className="px-8 py-3 bg-red-500/20 text-red-300 border border-red-500 rounded font-mono text-sm tracking-widest uppercase hover:bg-red-500/30 cursor-pointer"
          >
            Start
          </button>
        </div>
      )}

      {gameState === "GAME_OVER" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-zinc-950/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2 font-mono uppercase tracking-widest">
            <p className="text-red-400 text-lg font-bold">Game Over</p>
            <p className="text-zinc-300 text-sm">
              Score {snapshot.score} - Wave {snapshot.wave}
            </p>
          </div>
          <button
            onClick={handleRestart}
            className="px-8 py-3 bg-red-500/20 text-red-300 border border-red-500 rounded font-mono text-sm tracking-widest uppercase hover:bg-red-500/30 cursor-pointer"
          >
            Restart
          </button>
        </div>
      )}
    </div>
  );
}
