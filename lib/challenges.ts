export type ChallengeCategory =
  | "delete"
  | "change"
  | "yank-paste"
  | "visual"
  | "line"
  | "search"
  | "count"
  | "case";

export interface VimChallenge {
  id: string;
  initialCode: string;
  targetCode: string;
  category?: ChallengeCategory;
  /**
   * A known-correct key sequence solving the challenge, in vim notation
   * (e.g. "<Esc>", "<C-a>"). Used as the baseline a player's own recorded
   * keystrokes are compared against - not necessarily the shortest
   * possible solution, just a reasonable reference one.
   */
  optimalKeys: string[];
}

export const CHALLENGES: VimChallenge[] = [
  // --- delete ---
  {
    id: "delete-inner-word",
    initialCode: "const foo = badWord;",
    targetCode: "const foo = ;",
    category: "delete",
    optimalKeys: ["w", "w", "w", "d", "i", "w"],
  },
  {
    id: "delete-line",
    initialCode: "const a = 1;\nconst debug = true;\nconst b = 2;",
    targetCode: "const a = 1;\nconst b = 2;",
    category: "delete",
    optimalKeys: ["j", "d", "d"],
  },
  {
    id: "delete-char",
    initialCode: "const value = 100x;",
    targetCode: "const value = 100;",
    category: "delete",
    optimalKeys: ["$", "h", "x"],
  },
  {
    id: "delete-to-end-of-line",
    initialCode: 'const name = "Alice"; // TODO remove',
    targetCode: 'const name = "Alice";',
    category: "delete",
    optimalKeys: ["f", ";", "l", "D"],
  },
  {
    id: "delete-around-word",
    initialCode: "const status = pending active;",
    targetCode: "const status = active;",
    category: "delete",
    optimalKeys: ["w", "w", "w", "d", "a", "w"],
  },
  {
    id: "delete-word-forward",
    initialCode: "let x = foo bar;",
    targetCode: "let x = bar;",
    category: "delete",
    optimalKeys: ["w", "w", "w", "d", "w"],
  },

  // --- change ---
  {
    id: "replace-char",
    initialCode: "const total = 5 + 3;",
    targetCode: "const total = 5 - 3;",
    category: "change",
    optimalKeys: ["f", "+", "r", "-"],
  },
  {
    id: "change-inner-word",
    initialCode: "let count = 10;",
    targetCode: "let count = 42;",
    category: "change",
    optimalKeys: ["w", "w", "w", "c", "i", "w", "4", "2", "<Esc>"],
  },
  {
    id: "change-to-end-of-line",
    initialCode: "const port = 3000;",
    targetCode: "const port = 8080;",
    category: "change",
    optimalKeys: ["w", "w", "w", "c", "i", "w", "8", "0", "8", "0", "<Esc>"],
  },
  {
    id: "change-a-word",
    initialCode: "let status = idle now;",
    targetCode: "let status = busy now;",
    category: "change",
    optimalKeys: ["w", "w", "w", "c", "i", "w", "b", "u", "s", "y", "<Esc>"],
  },
  {
    id: "change-inner-quotes",
    initialCode: 'const name = "Alice";',
    targetCode: 'const name = "Bob";',
    category: "change",
    optimalKeys: ["f", '"', "c", "i", '"', "B", "o", "b", "<Esc>"],
  },

  // --- yank-paste ---
  {
    id: "duplicate-line",
    initialCode: "const x = 1;",
    targetCode: "const x = 1;\nconst x = 1;",
    category: "yank-paste",
    optimalKeys: ["y", "y", "p"],
  },
  {
    id: "swap-lines",
    initialCode: "const b = 2;\nconst a = 1;",
    targetCode: "const a = 1;\nconst b = 2;",
    category: "yank-paste",
    optimalKeys: ["d", "d", "p"],
  },
  {
    id: "yank-into-parens",
    initialCode: "const pair = (1, );",
    targetCode: "const pair = (1, 1);",
    category: "yank-paste",
    optimalKeys: ["f", "1", "y", "l", "f", ")", "P"],
  },
  {
    id: "paste-before-cursor",
    initialCode: "const first = John;\nconst full = Smith;",
    targetCode: "const first = John;\nconst full = JohnSmith;",
    category: "yank-paste",
    optimalKeys: ["w", "w", "w", "y", "i", "w", "j", "0", "w", "w", "w", "P"],
  },
  {
    id: "duplicate-two-lines",
    initialCode: "const a = 1;\nconst b = 2;",
    targetCode: "const a = 1;\nconst b = 2;\nconst a = 1;\nconst b = 2;",
    category: "yank-paste",
    optimalKeys: ["2", "y", "y", "G", "p"],
  },

  // --- visual ---
  {
    id: "visual-delete-partial-word",
    initialCode: "const message = Hello World!;",
    targetCode: "const message = World!;",
    category: "visual",
    optimalKeys: ["w", "w", "w", "v", "w", "d"],
  },
  {
    id: "visual-delete-line",
    initialCode:
      "function run() {\n  console.log('debug');\n  return true;\n}",
    targetCode: "function run() {\n  return true;\n}",
    category: "visual",
    optimalKeys: ["j", "V", "d"],
  },
  {
    id: "visual-change-word",
    initialCode: "const className = btn-primary;",
    targetCode: "const className = btn-secondary;",
    category: "visual",
    optimalKeys: [
      "w",
      "w",
      "w",
      "w",
      "w",
      "v",
      "e",
      "c",
      "s",
      "e",
      "c",
      "o",
      "n",
      "d",
      "a",
      "r",
      "y",
      "<Esc>",
    ],
  },
  {
    id: "visual-block-delete-column",
    initialCode: "1) const a = 1;\n2) const b = 2;\n3) const c = 3;",
    targetCode: "const a = 1;\nconst b = 2;\nconst c = 3;",
    category: "visual",
    optimalKeys: ["<C-v>", "2", "j", "2", "l", "d"],
  },
  {
    id: "swap-two-values",
    initialCode: "const point = (10, 20);",
    targetCode: "const point = (20, 10);",
    category: "visual",
    optimalKeys: [
      "w",
      "w",
      "w",
      "w",
      "c",
      "i",
      "w",
      "2",
      "0",
      "<Esc>",
      "w",
      "w",
      "c",
      "i",
      "w",
      "1",
      "0",
      "<Esc>",
    ],
  },

  // --- line ---
  {
    id: "join-lines",
    initialCode: "const first =\n  1;",
    targetCode: "const first = 1;",
    category: "line",
    optimalKeys: ["J"],
  },
  {
    id: "open-line-below",
    initialCode: "function greet() {\n}",
    targetCode: 'function greet() {\n  return "hi";\n}',
    category: "line",
    optimalKeys: [
      "o",
      " ",
      " ",
      "r",
      "e",
      "t",
      "u",
      "r",
      "n",
      " ",
      '"',
      "h",
      "i",
      '"',
      ";",
      "<Esc>",
    ],
  },
  {
    id: "join-three-lines",
    initialCode: "const parts =\n  a +\n  b;",
    targetCode: "const parts = a + b;",
    category: "line",
    optimalKeys: ["J", "J"],
  },
  {
    id: "open-line-above",
    initialCode: 'function greet() {\n  return "hi";\n}',
    targetCode:
      'function greet() {\n  console.log("start");\n  return "hi";\n}',
    category: "line",
    optimalKeys: [
      "j",
      "O",
      "c",
      "o",
      "n",
      "s",
      "o",
      "l",
      "e",
      ".",
      "l",
      "o",
      "g",
      "(",
      '"',
      "s",
      "t",
      "a",
      "r",
      "t",
      '"',
      ")",
      ";",
      "<Esc>",
    ],
  },

  // --- search ---
  {
    id: "delete-after-find",
    initialCode: "const greeting = 'hello!';",
    targetCode: "const greeting = 'hello';",
    category: "search",
    optimalKeys: ["f", "!", "x"],
  },
  {
    id: "delete-till-char",
    initialCode: "const email = user@example.com;",
    targetCode: "const email = @example.com;",
    category: "search",
    optimalKeys: ["w", "w", "w", "d", "t", "@"],
  },
  {
    id: "search-and-delete-line",
    initialCode: "let x = 1;\nlet y = 2;\nlet flag = true;\nlet z = 3;",
    targetCode: "let x = 1;\nlet y = 2;\nlet z = 3;",
    category: "search",
    optimalKeys: ["/", "f", "l", "a", "g", "<CR>", "d", "d"],
  },
  {
    id: "change-till-char",
    initialCode: "const message = Hello, World!;",
    targetCode: "const message = Hi, World!;",
    category: "search",
    optimalKeys: ["w", "w", "w", "c", "t", ",", "H", "i", "<Esc>"],
  },

  // --- count ---
  {
    id: "delete-three-chars",
    initialCode: "const num = 123456;",
    targetCode: "const num = 456;",
    category: "count",
    optimalKeys: ["w", "w", "w", "3", "x"],
  },
  {
    id: "delete-two-lines",
    initialCode: "const a = 1;\nconst b = 2;\nconst c = 3;\nconst d = 4;",
    targetCode: "const c = 3;\nconst d = 4;",
    category: "count",
    optimalKeys: ["2", "d", "d"],
  },
  {
    id: "delete-three-words",
    initialCode: "const path = one two three four;",
    targetCode: "const path = four;",
    category: "count",
    optimalKeys: ["w", "w", "w", "3", "d", "w"],
  },

  // --- case ---
  {
    id: "toggle-case-char",
    initialCode: "let Name = 'x';",
    targetCode: "let name = 'x';",
    category: "case",
    optimalKeys: ["w", "~"],
  },
  {
    id: "uppercase-inner-word",
    initialCode: "const level = warning;",
    targetCode: "const level = WARNING;",
    category: "case",
    optimalKeys: ["w", "w", "w", "g", "U", "i", "w"],
  },
  {
    id: "increment-number",
    initialCode: "const retries = 3;",
    targetCode: "const retries = 4;",
    category: "case",
    optimalKeys: ["w", "w", "w", "<C-a>"],
  },
];

export interface ShuffledBag {
  next(): VimChallenge;
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function createShuffledBag(challenges: VimChallenge[]): ShuffledBag {
  let queue: VimChallenge[] = [];
  let lastServed: VimChallenge | null = null;

  function refill() {
    queue = shuffle(challenges);
    if (queue.length > 1 && queue[0] === lastServed) {
      [queue[0], queue[1]] = [queue[1], queue[0]];
    }
  }

  return {
    next(): VimChallenge {
      if (queue.length === 0) refill();
      const challenge = queue.shift()!;
      lastServed = challenge;
      return challenge;
    },
  };
}
