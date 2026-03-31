'use client';

import { useEffect, useState } from 'react';
import { useSpring, useTransform } from 'framer-motion';

interface AnimateNumberProps {
  children: number;
  transition?: { type?: string; bounce?: number; duration?: number };
}

export default function AnimateNumber({ children, transition }: AnimateNumberProps) {
  const spring = useSpring(children, {
    bounce: transition?.bounce ?? 0,
    duration: (transition?.duration ?? 0.4) * 1000,
  });
  const rounded = useTransform(spring, v => Math.round(v));
  const [display, setDisplay] = useState(children);

  useEffect(() => rounded.on('change', setDisplay), [rounded]);
  useEffect(() => { spring.set(children); }, [children, spring]);

  return <span>{display}</span>;
}
