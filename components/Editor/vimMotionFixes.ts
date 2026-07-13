import { Vim } from "@replit/codemirror-vim";

function firstNonBlank(line: string): number {
  const match = /\S/.exec(line);
  return match ? match.index : line.length;
}

/**
 * @replit/codemirror-vim's stock `moveByLines` (used by `j`/`k`) jumps the
 * cursor to the start/end of the line when it's already at the first/last
 * buffer line - a CM5-vim-addon quirk that doesn't match real Vim/Neovim,
 * where `j`/`k` at a buffer boundary is a no-op. This overrides it via the
 * library's public `defineMotion` API to clamp instead of jump.
 *
 * Params are `any`-typed on purpose: importing this library's own motion
 * types (`Pos`, `MotionArgs`, `vimState`, `CodeMirrorV`) into this file
 * crashes Next's production type-checking pass (reproducible even with a
 * single type import), while plain `tsc --noEmit` handles them fine. This
 * is the only file where that trade-off is made.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export function patchVimBoundaryMotions() {
  Vim.defineMotion("moveByLines", function (this: any, cm: any, head: any, motionArgs: any, vim: any) {
    const cur = head;
    let endCh = cur.ch;
    switch (vim.lastMotion) {
      case this.moveByLines:
      case this.moveByDisplayLines:
      case this.moveByScroll:
      case this.moveToColumn:
      case this.moveToEol:
        endCh = vim.lastHPos;
        break;
      default:
        vim.lastHPos = endCh;
    }

    const repeat = motionArgs.repeat + (motionArgs.repeatOffset || 0);
    const first = cm.firstLine();
    const last = cm.lastLine();
    const line = Math.max(
      first,
      Math.min(last, motionArgs.forward ? cur.line + repeat : cur.line - repeat)
    );

    if (motionArgs.toFirstChar) {
      endCh = firstNonBlank(cm.getLine(line));
      vim.lastHPos = endCh;
    }

    const pos = { line, ch: endCh };
    vim.lastHSPos = cm.charCoords(pos, "div").left;
    return pos;
  });
}
