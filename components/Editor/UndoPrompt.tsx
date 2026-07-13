export function UndoPrompt() {
  return (
    <div className="pointer-events-none absolute top-3 right-3 z-10 flex items-center gap-1 whitespace-nowrap rounded border border-amber-500/70 bg-zinc-900/90 px-2 py-1 text-xs text-amber-300/90 shadow-lg select-none">
      <span>Press</span>
      <kbd className="rounded border border-amber-500/50 bg-zinc-800 px-1 text-[10px] font-mono text-amber-200">
        Esc
      </kbd>
      <kbd className="rounded border border-amber-500/50 bg-zinc-800 px-1 text-[10px] font-mono text-amber-200">
        u
      </kbd>
      <span>to undo</span>
    </div>
  );
}
