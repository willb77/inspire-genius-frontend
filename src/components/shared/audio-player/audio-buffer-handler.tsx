"use client"

import type React from "react"
import { useRef, useState } from "react"
import { motion } from "framer-motion"
import { Upload, AlertCircle } from "lucide-react"
import { AudioPlayer } from "./audio-player"

export function AudioBufferHandler() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string>("")
  const audioContextRef = useRef<AudioContext | null>(null)

  // Initialize audio context
  const getAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (
        window.AudioContext ||
        (window as unknown as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext!
      )()
    }
    return audioContextRef.current
  }

  const processFile = async (file: File) => {
    setIsLoading(true)
    setError(null)
    setFileName(file.name)

    try {
      const arrayBuffer = await file.arrayBuffer()
      const audioContext = getAudioContext()
      const decodedBuffer = await audioContext.decodeAudioData(arrayBuffer)
      setAudioBuffer(decodedBuffer)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load audio file"
      setError(errorMessage)
      setAudioBuffer(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    await processFile(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.add("bg-accent")
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove("bg-accent")
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.remove("bg-accent")

    const file = e.dataTransfer.files?.[0]
    if (file) {
      if (fileInputRef.current) {
        const dataTransfer = new DataTransfer()
        dataTransfer.items.add(file)
        fileInputRef.current.files = dataTransfer.files
        await processFile(file)
      }
    }
  }

  return (
    <div className="w-full space-y-6">
      {/* Upload area */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className="w-full border-2 border-dashed border-border rounded-lg p-8 cursor-pointer hover:bg-accent/5 transition-colors"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileUpload}
          className="hidden"
          aria-label="Upload audio file"
        />

        <div className="flex flex-col items-center justify-center gap-3">
          <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}>
            <Upload size={40} className="text-primary" />
          </motion.div>
          <div className="text-center">
            <p className="font-semibold text-foreground">
              {isLoading ? "Loading audio..." : "Drag and drop your audio file here"}
            </p>
            <p className="text-sm text-muted-foreground">or click to browse • Supports MP3, WAV, FLAC, and more</p>
          </div>
        </div>
      </motion.div>

      {/* File info */}
      {fileName && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="p-3 bg-card border border-border rounded-lg"
        >
          <p className="text-sm font-medium text-foreground">Loaded: {fileName}</p>
        </motion.div>
      )}

      {/* Error message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-destructive/10 border border-destructive rounded-lg flex gap-3"
        >
          <AlertCircle size={20} className="text-destructive flex-shrink-0" />
          <p className="text-sm text-destructive">{error}</p>
        </motion.div>
      )}

      {/* Audio player */}
      {audioBuffer && <AudioPlayer audioBuffer={audioBuffer} onError={setError} />}
    </div>
  )
}
