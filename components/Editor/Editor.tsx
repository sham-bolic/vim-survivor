"use client";

import { memo, useState } from "react";
import { useVimEditor, type KeystrokeComparison, type VimMode } from "./useVimEditor";
import { ModeChip } from "./ModeChip";
import { EscNudge } from "./EscNudge";
import { TargetSnippet } from "./TargetSnippet";
import { UndoPrompt } from "./UndoPrompt";
import type { VimChallenge } from "@/lib/challenges";

// Memoized because GameLayout re-renders ~60x/sec as the game loop publishes its
// snapshot; with stable props (active, challenge, onChallengeChange) that churn
// must never reach the CodeMirror editor. The editor is rebuilt only when
// `active` actually flips (the useVimEditor effect is keyed on it).
function EditorComponent({
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
  const [awaitingEscape, setAwaitingEscape] = useState(false);
  const containerRef = useVimEditor(
    active,
    setMode,
    onChallengeChange,
    setShowUndoPrompt,
    onKeystrokeComparison,
    setAwaitingEscape
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
      {/* Mode chip stays centered; the Esc nudge is anchored to the chip's
          right edge (absolutely positioned so it never shifts the chip) and
          only shows during the "correct but not yet escaped" window. */}
      <div className="mt-3 flex justify-center">
        <div className="relative">
          <ModeChip mode={mode} />
          {awaitingEscape && (
            <div className="absolute left-full top-1/2 ml-3 -translate-y-1/2">
              <EscNudge />
            </div>
          )}
        </div>
      </div>
      {/* Target snippet sits below the editor in the centered redesign. */}
      <div className="mt-5">
        <TargetSnippet challenge={challenge} />
      </div>
    </div>
  );
}

export const Editor = memo(EditorComponent);
