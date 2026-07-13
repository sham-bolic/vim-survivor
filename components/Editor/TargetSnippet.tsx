import { diffRange } from "./challengeField";
import type { VimChallenge } from "@/lib/challenges";

export function TargetSnippet({ challenge }: { challenge: VimChallenge | null }) {
  if (!challenge) return null;

  const { from, hint } = diffRange(challenge.initialCode, challenge.targetCode);
  const target = challenge.targetCode;
  const prefix = target.slice(0, from);
  const changed = hint.length > 0 ? target.slice(from, from + hint.length) : "";
  const suffix = target.slice(from + changed.length);

  return (
    <div className="flex-none border-b border-zinc-800 bg-zinc-950 px-4 py-3">
      <p className="mb-1 text-xs uppercase tracking-widest text-zinc-500">Target</p>
      <pre className="whitespace-pre-wrap font-mono text-sm text-zinc-400">
        {prefix}
        {changed && <span className="target-diff-highlight">{changed}</span>}
        {suffix}
      </pre>
    </div>
  );
}
