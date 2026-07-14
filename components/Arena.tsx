// TODO(phase-3): frameless placeholder for the Monster Assault Arena until real
// combat gameplay is built. It occupies the visuals zone above the editor and
// blends into the page background (no frame) per the embedded, centered design.
export function Arena() {
  return (
    <div className="h-full w-full flex items-center justify-center">
      <p className="text-zinc-600 font-mono text-sm tracking-widest uppercase">
        Monster Assault Arena - Coming Soon
      </p>
    </div>
  );
}
