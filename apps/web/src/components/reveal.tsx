'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

/** Scroll-reveal wrapper: 12px rise + fade, once. */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
      {...(className ? { className } : {})}
    >
      {children}
    </motion.div>
  );
}
