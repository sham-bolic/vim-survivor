"use client";

import { useState } from "react";
import { useVimEditor, type KeystrokeComparison, type VimMode } from "./useVimEditor";
import { ModeChip } from "./ModeChip";
import { TargetSnippet } from "./TargetSnippet";
import { UndoPrompt } from "./UndoPrompt";
import type { VimChallenge } from "@/lib/challenges";

export function Editor({
  active,
  challenge,
  onChallengeChange,
  onKeystrokeComparison,
}: {
  active: boolean;
  challenge: VimChallenge | null;
  onChallengeChange: (challenge: VimChallenge, isInitial: boolean) => void;
  onKeystrokeComparison?: (comparison: KeystrokeComparison) => void;
}) {
  const [mode, setMode] = useState<VimMode>("NORMAL");
  const [showUndoPrompt, setShowUndoPrompt] = useState(false);
  const containerRef = useVimEditor(
    active,
    setMode,
    onChallengeChange,
    setShowUndoPrompt,
    onKeystrokeComparison
  );

  return (
    <div className="w-full flex flex-col">
      {/* The editor is the one framed element - a bordered, slightly elevated
          card so it stands out against the blended HUD/Arena. Its own background
          stays transparent (see useVimEditor's embeddedTheme) so this card's fill
          shows through. Capped height so a tall snippet scrolls internally
          instead of pushing the mode chip and target - and the whole centered
          composition - out of place. */}
      <div className="relative min-h-[20vh] max-h-[45vh] overflow-auto rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-4 py-3 shadow-lg">
        <div ref={containerRef} className="w-full" />
        {/* Corner badge anchored to the editor box rather than the mistake's
            text position, which could land off-screen in the scroller. */}
        {showUndoPrompt && <UndoPrompt />}
      </div>
      <div className="mt-3 flex justify-center">
        <ModeChip mode={mode} />
      </div>
      {/* Target snippet sits below the editor in the centered redesign. */}
      <div className="mt-5">
        <TargetSnippet challenge={challenge} />
      </div>
    </div>
  );
}
