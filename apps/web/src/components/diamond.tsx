'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const ALPHABET = 'WTYUIAHXVMEKBSZN';
const INITIAL = 'NHMYYM';

function randomLetter(): string {
  return ALPHABET[Math.floor(Math.random() * ALPHABET.length)] ?? 'N';
}

/** Animated SVG diamond with six inscription letters that mutate slowly. */
export function Diamond() {
  const [letters, setLetters] = useState<string[]>(INITIAL.split(''));

  useEffect(() => {
    const id = setInterval(() => {
      setLetters((prev) => {
        const next = [...prev];
        const i = Math.floor(Math.random() * 6);
        next[i] = randomLetter();
        return next;
      });
    }, 600);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative flex aspect-square w-full max-w-md items-center justify-center">
      <motion.div
        className="absolute inset-0"
        animate={{ rotate: 360 }}
        transition={{ duration: 90, repeat: Infinity, ease: 'linear' }}
      >
        <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden>
          <defs>
            <linearGradient id="goldStroke" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#D4A24B" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#D4A24B" stopOpacity="0.2" />
            </linearGradient>
          </defs>
          <polygon
            points="100,8 168,70 100,192 32,70"
            fill="none"
            stroke="url(#goldStroke)"
            strokeWidth="1.5"
          />
          <polygon points="100,8 168,70 32,70" fill="#D4A24B" fillOpacity="0.04" />
          <line x1="32" y1="70" x2="168" y2="70" stroke="#D4A24B" strokeOpacity="0.3" />
          <line x1="100" y1="8" x2="100" y2="192" stroke="#D4A24B" strokeOpacity="0.15" />
          <line x1="66" y1="70" x2="100" y2="192" stroke="#D4A24B" strokeOpacity="0.15" />
          <line x1="134" y1="70" x2="100" y2="192" stroke="#D4A24B" strokeOpacity="0.15" />
        </svg>
      </motion.div>

      <div className="relative z-10 flex gap-1.5">
        {letters.map((letter, i) => (
          <motion.span
            key={i}
            initial={false}
            animate={{ opacity: [0.4, 1] }}
            transition={{ duration: 0.4 }}
            className="font-display text-2xl font-semibold text-gold sm:text-3xl"
          >
            {letter}
          </motion.span>
        ))}
      </div>
    </div>
  );
}
