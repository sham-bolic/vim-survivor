"use client";

import { useCallback, useEffect, useState } from "react";
import { Arena } from "@/components/Arena";
import { Hud } from "@/components/Hud";
import { Editor } from "@/components/Editor/Editor";
import type { VimChallenge } from "@/lib/challenges";

export function GameLayout() {
  const [hasStarted, setHasStarted] = useState(false);
  const [challenge, setChallenge] = useState<VimChallenge | null>(null);
  const [challengeCount, setChallengeCount] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [restartKey, setRestartKey] = useState(0);

  useEffect(() => {
    if (!hasStarted) return;
    const interval = setInterval(() => {
      setElapsedSeconds((seconds) => seconds + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [hasStarted]);

  const handleChallengeChange = useCallback(
    (next: VimChallenge, isInitial: boolean) => {
      setChallenge(next);
      setChallengeCount((count) => (isInitial ? 1 : count + 1));
    },
    []
  );

  const handleRestart = useCallback(() => {
    setElapsedSeconds(0);
    setRestartKey((key) => key + 1);
  }, []);

  return (
    <div className="relative flex min-h-screen w-screen flex-col overflow-y-auto bg-[var(--background)]">
      <Hud
        challengeCount={challengeCount}
        elapsedSeconds={elapsedSeconds}
        onRestart={handleRestart}
      />
      {/* Frameless visuals zone on top; the larger flex weight (vs the bottom
          spacer) drops the editor block just below vertical center. */}
      <div className="flex-[3] min-h-0">
        <Arena />
      </div>
      {/* Centered editor column: editor -> mode chip -> target (see Editor). */}
      <section className="mx-auto w-full max-w-2xl flex-none px-6">
        <Editor
          key={restartKey}
          active={hasStarted}
          challenge={challenge}
          onChallengeChange={handleChallengeChange}
        />
      </section>
      <div className="flex-[2]" />

      {!hasStarted && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/70 backdrop-blur-sm">
          <button
            onClick={() => setHasStarted(true)}
            className="px-8 py-3 bg-red-500/20 text-red-300 border border-red-500 rounded font-mono text-sm tracking-widest uppercase hover:bg-red-500/30 cursor-pointer"
          >
            Start
          </button>
        </div>
      )}
    </div>
  );
}
