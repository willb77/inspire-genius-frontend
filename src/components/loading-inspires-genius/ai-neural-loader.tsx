"use client"

import { motion } from "framer-motion"

export default function AINeuralLoader() {
  // Generate particles that flow and connect like neural networks
  const particles = Array.from({ length: 12 }, (_, i) => i)
  const orbitParticles = Array.from({ length: 8 }, (_, i) => i)

  const pulseVariants = {
    animate: {
      scale: [1, 1.5, 1],
      opacity: [0.3, 1, 0.3],
      transition: {
        duration: 2,
        repeat: Number.POSITIVE_INFINITY,
        ease: [0.42, 0, 0.58, 1] as const,
      },
    },
  }



  return (
    <div className="relative w-80 h-80 flex items-center justify-center">
      {/* Central Core */}
      <motion.div
        className="absolute w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-full blur-xl shadow-2xl"
        animate={{
          scale: [1, 1.2, 1],
          boxShadow: [
            "0 0 20px rgba(34, 211, 238, 0.8)",
            "0 0 40px rgba(34, 211, 238, 1)",
            "0 0 20px rgba(34, 211, 238, 0.8)",
          ],
        }}
        transition={{
          duration: 1.5,
          repeat: Number.POSITIVE_INFINITY,
          ease: [0.42, 0, 0.58, 1] as const,
        }}
      />

      {/* Orbital Ring Lines */}
      {[0, 1, 2].map((ring) => (
        <motion.svg
          key={ring}
          className="absolute w-full h-full"
          style={{
            filter: "drop-shadow(0 0 2px rgba(34, 211, 238, 0.3))",
          }}
          animate={{
            rotate: ring % 2 === 0 ? 360 : -360,
          }}
          transition={{
            duration: 12 + ring * 2,
            repeat: Number.POSITIVE_INFINITY,
            ease: [0, 0, 1, 1] as const,
          }}
        >
          <circle
            cx="160"
            cy="160"
            r={40 + ring * 40}
            fill="none"
            stroke="rgba(34, 211, 238, 0.2)"
            strokeWidth="1"
            strokeDasharray="4 6"
          />
        </motion.svg>
      ))}

      {/* Orbiting Neural Nodes */}
      {orbitParticles.map((i) => (
        <motion.div
          key={`orbit-${i}`}
          className="absolute w-3 h-3 bg-cyan-400 rounded-full shadow-lg"
          style={{
            filter: "drop-shadow(0 0 6px rgba(34, 211, 238, 0.8))",
          }}
          animate={{
            x: Math.cos((i * Math.PI) / 4) * 120,
            y: Math.sin((i * Math.PI) / 4) * 120,
          }}
          transition={{
            duration: 12,
            repeat: Number.POSITIVE_INFINITY,
            ease: [0, 0, 1, 1] as const,
            delay: i * 0.1,
          }}
        />
      ))}

      {/* Pulsing Data Points */}
      {particles.map((i) => (
        <motion.div
          key={`pulse-${i}`}
          className="absolute w-2 h-2 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full"
          style={{
            left: `${50 + Math.cos((i * Math.PI) / 6) * 45}%`,
            top: `${50 + Math.sin((i * Math.PI) / 6) * 45}%`,
            filter: "drop-shadow(0 0 4px rgba(34, 211, 238, 0.6))",
          }}
          variants={pulseVariants}
          animate="animate"
          transition={{
            delay: i * 0.1,
          }}
        />
      ))}

      {/* Data Flow Lines */}
      <motion.svg
        className="absolute inset-0 w-full h-full"
        style={{
          filter: "drop-shadow(0 0 4px rgba(34, 211, 238, 0.5))",
        }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <motion.line
            key={i}
            x1="160"
            y1="160"
            x2={160 + Math.cos((i * Math.PI) / 3) * 100}
            y2={160 + Math.sin((i * Math.PI) / 3) * 100}
            stroke="rgba(34, 211, 238, 0.3)"
            strokeWidth="1"
            strokeDasharray="4 6"
            animate={{
              strokeDashoffset: [0, -100],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{
              duration: 3,
              repeat: Number.POSITIVE_INFINITY,
              ease: [0, 0, 1, 1] as const,
              delay: i * 0.2,
            }}
          />
        ))}
      </motion.svg>
    </div>
  )
}
