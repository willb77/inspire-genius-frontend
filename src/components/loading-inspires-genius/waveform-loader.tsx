"use client"

import { motion } from "framer-motion"
import type { Variants } from "framer-motion"

export default function WaveformLoader() {
  const bars = Array.from({ length: 20 }, (_, i) => i)

  const containerVariants: Variants = {
    animate: {
      transition: {
        staggerChildren: 0.05,
        repeatDelay: 0.3,
      },
    },
  }

  const barVariants: Variants = {
    animate: (i: number) => ({
      height: ["20%", "100%", "20%"],
      transition: {
        duration: 0.6,
        repeat: Infinity,
        delay: i * 0.05,
        ease: "easeInOut" as const,
      },
    }),
  }

  return (
    <motion.div
      className="flex items-end justify-center gap-1 h-32 w-64"
      variants={containerVariants}
      animate="animate"
    >
      {bars.map((i) => (
        <motion.div
          key={i}
          custom={i}
          variants={barVariants}
          className="w-2 bg-gradient-to-t from-primary via-secondary to-primary rounded-sm shadow-lg"
          style={{
            filter: "drop-shadow(0 0 8px currentColor)",
            opacity: 0.8,
          }}
        />
      ))}
    </motion.div>
  )
}
