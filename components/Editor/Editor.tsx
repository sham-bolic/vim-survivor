"use client";

import { useState } from "react";
import { useVimEditor, type VimMode } from "./useVimEditor";
import { StatusBar } from "./StatusBar";
import { TargetSnippet } from "./TargetSnippet";
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
  const containerRef = useVimEditor(active, setMode, onChallengeChange);

  return (
    <div className="h-full w-full flex flex-col bg-zinc-950">
      <TargetSnippet challenge={challenge} />
      <div ref={containerRef} className="flex-1 overflow-auto" />
      <StatusBar mode={mode} />
    </div>
  );
}
