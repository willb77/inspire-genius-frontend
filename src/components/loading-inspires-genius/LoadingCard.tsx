"use client"

import { motion } from "framer-motion"
import AINeuralLoader from "./ai-neural-loader"

export default function LoadingPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 overflow-hidden relative">
      <div className="absolute inset-0 overflow-hidden">
        {/* AI-themed gradient orbs */}
        <motion.div
          className="absolute w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl"
          animate={{
            x: [0, 150, -100, 0],
            y: [0, -120, 80, 0],
          }}
          transition={{
            duration: 18,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
          style={{ left: "-200px", top: "-200px" }}
        />
        <motion.div
          className="absolute w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"
          animate={{
            x: [0, -150, 100, 0],
            y: [0, 120, -80, 0],
          }}
          transition={{
            duration: 18,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
          style={{ right: "-200px", bottom: "-200px" }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center gap-12">
        <AINeuralLoader />

        {/* AI-themed Text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="text-center"
        >
          <h1 className="text-5xl md:text-6xl font-bold text-pretty tracking-tight">
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-500 bg-clip-text text-transparent">
              INSPIRES GENIUS
            </span>
          </h1>
          <p className="text-cyan-200/60 mt-4 text-lg font-light">Initializing AI Intelligence...</p>
        </motion.div>

        <motion.div className="flex items-center gap-3">
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
            className="text-sm text-cyan-300 font-semibold tracking-widest"
          >
            PROCESSING
          </motion.div>
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 bg-cyan-400 rounded-full"
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                transition={{
                  duration: 0.8,
                  repeat: Number.POSITIVE_INFINITY,
                  delay: i * 0.15,
                }}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </main>
  )
}
