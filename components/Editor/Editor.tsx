"use client";

import { useState } from "react";
import { useVimEditor, type VimMode } from "./useVimEditor";
import { StatusBar } from "./StatusBar";
import { TargetSnippet } from "./TargetSnippet";
import { UndoPrompt } from "./UndoPrompt";
import type { VimChallenge } from "@/lib/challenges";

export function Editor({
  active,
  challenge,
  onChallengeChange,
}: {
  active: boolean;
  challenge: VimChallenge | null;
  onChallengeChange: (challenge: VimChallenge, isInitial: boolean) => void;
}) {
  const [mode, setMode] = useState<VimMode>("NORMAL");
  const [showUndoPrompt, setShowUndoPrompt] = useState(false);
  const containerRef = useVimEditor(
    active,
    setMode,
    onChallengeChange,
    setShowUndoPrompt
  );

  return (
    <div className="h-full w-full flex flex-col bg-zinc-950">
      <TargetSnippet challenge={challenge} />
      <div className="relative flex-1 overflow-auto">
        <div ref={containerRef} className="h-full w-full" />
        {/* Fixed to the editor panel rather than floated above the mistake
            itself - anchoring to text position meant it could land off the
            left edge of the scroller and be clipped, or off the right edge
            of a long line. A corner badge is always visible regardless of
            where in the doc (or how far scrolled) the mistake is. */}
        {showUndoPrompt && <UndoPrompt />}
      </div>
      <StatusBar mode={mode} />
    </div>
  );
}
