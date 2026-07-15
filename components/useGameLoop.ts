"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// --- Tunable constants (the tuning surface for difficulty) ---
const START_HEALTH = 100; // Player Health at run start
const START_DISTANCE = 100; // Monster Distance (%) at run start / after a Repel
const COLLISION_DAMAGE = 20; // Health lost per Collision -> 5 lives
const WAVE_SECONDS = 30; // seconds of PLAYING time per Wave
const BASE_SPEED = 8; // %/sec at wave 1 (~12.5s to cross)
const SPEED_STEP = 2; // added %/sec per wave
const MAX_FRAME_DT = 0.1; // clamp dt (s) so a backgrounded tab can't one-frame-kill

// speed(wave) = BASE_SPEED + (wave - 1) * SPEED_STEP. Linear ramp, no cap.
function speed(wave: number): number {
  return BASE_SPEED + (wave - 1) * SPEED_STEP;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export type GameState = "IDLE" | "PLAYING" | "GAME_OVER";

// The read-only view rendered ~60x/sec into the Arena/HUD.
export interface GameSnapshot {
  playerHealth: number; // integer, steps of 20
  monsterDistance: number; // float internally; DISPLAY floored to int
  wave: number;
  score: number;
  playingSeconds: number; // drives the HUD timer too (single clock)
}

// The authoritative mutable numbers. They live in a ref (not state) so the rAF
// loop never reads a stale closure; a snapshot is mirrored to state to render.
interface GameNumbers {
  health: number;
  distance: number;
  wave: number;
  score: number;
  playingMs: number;
}

function initialNumbers(): GameNumbers {
  return {
    health: START_HEALTH,
    distance: START_DISTANCE,
    wave: 1,
    score: 0,
    playingMs: 0,
  };
}

function toSnapshot(n: GameNumbers): GameSnapshot {
  return {
    playerHealth: n.health,
    monsterDistance: n.distance,
    wave: n.wave,
    score: n.score,
    playingSeconds: Math.floor(n.playingMs / 1000),
  };
}

const INITIAL_SNAPSHOT: GameSnapshot = toSnapshot(initialNumbers());

export interface GameLoop {
  gameState: GameState;
  snapshot: GameSnapshot;
  start: () => void;
  restart: () => void;
  registerSolve: () => void;
}

/**
 * Standalone additive survival layer. It owns only the survival numbers and the
 * loop that advances the Monster; it never reaches into the editor. It reacts to
 * the editor's existing success signal via `registerSolve` (see ADR 0004).
 */
export function useGameLoop(): GameLoop {
  const [gameState, setGameState] = useState<GameState>("IDLE");
  const numbersRef = useRef<GameNumbers>(initialNumbers());
  const [snapshot, setSnapshot] = useState<GameSnapshot>(INITIAL_SNAPSHOT);

  // Mirror of gameState for the rAF loop / registerSolve to read without a
  // stale closure, and without re-creating the stable callbacks below.
  const gameStateRef = useRef<GameState>(gameState);
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const publishSnapshot = useCallback(() => {
    setSnapshot(toSnapshot(numbersRef.current));
  }, []);

  const start = useCallback(() => {
    numbersRef.current = initialNumbers();
    publishSnapshot();
    setGameState("PLAYING");
  }, [publishSnapshot]);

  const restart = useCallback(() => {
    numbersRef.current = initialNumbers();
    publishSnapshot();
    setGameState("PLAYING");
  }, [publishSnapshot]);

  // Called from GameLayout when the editor reports a solve. A Repel resets the
  // Monster and bumps Score. Ignored unless PLAYING so a solve landing as the
  // run ends can't resurrect it.
  const registerSolve = useCallback(() => {
    if (gameStateRef.current !== "PLAYING") return;
    const s = numbersRef.current;
    s.distance = START_DISTANCE;
    s.score += 1;
    publishSnapshot();
  }, [publishSnapshot]);

  // The loop runs only while PLAYING; the effect (keyed on gameState) tears it
  // down on any transition out of PLAYING, and cancels the frame on unmount.
  useEffect(() => {
    if (gameState !== "PLAYING") return;

    let rafId = 0;
    let last = performance.now();

    const loop = (now: number) => {
      const s = numbersRef.current;
      // Clamp dt so returning to a backgrounded tab can't drain health at once.
      const dt = Math.min((now - last) / 1000, MAX_FRAME_DT);
      last = now;

      s.playingMs += dt * 1000;
      s.wave = 1 + Math.floor(s.playingMs / 1000 / WAVE_SECONDS);
      s.distance -= speed(s.wave) * dt;

      if (s.distance <= 0) {
        // COLLISION: cost health, then either end the run or Repel the Monster.
        s.health -= COLLISION_DAMAGE;
        if (s.health <= 0) {
          s.health = 0;
          s.distance = 0;
          setGameState("GAME_OVER"); // loop effect tears down
          publishSnapshot();
          return; // do not schedule another frame
        }
        s.distance = START_DISTANCE; // repelled; same drill continues
      }

      s.distance = clamp(s.distance, 0, 100);
      publishSnapshot();
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [gameState, publishSnapshot]);

  return { gameState, snapshot, start, restart, registerSolve };
}
