import { diffRange } from "./challengeField";
import type { VimChallenge } from "@/lib/challenges";

export function TargetSnippet({ challenge }: { challenge: VimChallenge | null }) {
  if (!challenge) return null;

  const hunks = diffRange(challenge.initialCode, challenge.targetCode);
  const target = challenge.targetCode;

  const segments: { text: string; changed: boolean }[] = [];
  let cursor = 0;
  for (const hunk of hunks) {
    if (hunk.hintTo <= hunk.hintFrom) continue;
    segments.push({ text: target.slice(cursor, hunk.hintFrom), changed: false });
    segments.push({ text: target.slice(hunk.hintFrom, hunk.hintTo), changed: true });
    cursor = hunk.hintTo;
  }
  segments.push({ text: target.slice(cursor), changed: false });

  return (
    <div>
      <p className="mb-2 text-xs uppercase tracking-widest text-zinc-500">Target</p>
      <pre className="whitespace-pre-wrap font-mono text-base leading-relaxed text-zinc-400">
        {segments.map((segment, index) =>
          segment.changed ? (
            <span key={index} className="target-diff-highlight">
              {segment.text}
            </span>
          ) : (
            <span key={index}>{segment.text}</span>
          )
        )}
      </pre>
    </div>
  );
}
