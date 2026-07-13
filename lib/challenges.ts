export interface VimChallenge {
  id: string;
  initialCode: string;
  targetCode: string;
}

export const CHALLENGES: VimChallenge[] = [
  {
    id: "delete-inner-word",
    initialCode: "const foo = badWord;",
    targetCode: "const foo = ;",
  },
  {
    id: "replace-char",
    initialCode: "const total = 5 + 3;",
    targetCode: "const total = 5 - 3;",
  },
  {
    id: "delete-line",
    initialCode: "const a = 1;\nconst debug = true;\nconst b = 2;",
    targetCode: "const a = 1;\nconst b = 2;",
  },
  {
    id: "change-inner-word",
    initialCode: "let count = 10;",
    targetCode: "let count = 42;",
  },
  {
    id: "delete-char",
    initialCode: "const value = 100x;",
    targetCode: "const value = 100;",
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
