"use client"

import type React from "react"
import { useRef, useEffect, useState } from "react"
import { motion } from "framer-motion"
import WaveSurfer from "wavesurfer.js"
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, RotateCcw } from "lucide-react"

interface AudioPlayerProps {
  audioBuffer: AudioBuffer | null
  onError?: (error: string) => void
}

export function AudioPlayer({ audioBuffer, onError }: AudioPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const waveRef = useRef<HTMLDivElement>(null)
  const wavesurferRef = useRef<WaveSurfer | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isDragging, setIsDragging] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const prevVolumeRef = useRef(1)

  useEffect(() => {
    if (!waveRef.current || !audioBuffer) return

    try {
      wavesurferRef.current = WaveSurfer.create({
        container: waveRef.current,
        waveColor: "#3b82f6",
        progressColor: "#1e40af",
        cursorColor: "#1e3a8a",
        barWidth: 2,
        barRadius: 3,
        cursorWidth: 2,
        height: 24,
        normalize: true,
        fillParent: true,
      })

      const offlineContext = new OfflineAudioContext(
        audioBuffer.numberOfChannels,
        audioBuffer.length,
        audioBuffer.sampleRate,
      )
      const source = offlineContext.createBufferSource()
      source.buffer = audioBuffer
      source.connect(offlineContext.destination)
      source.start(0)

      offlineContext.startRendering().then((renderedBuffer) => {
        const blob = bufferToWave(renderedBuffer)
        const url = URL.createObjectURL(blob)
        const peaks = Array.from({ length: renderedBuffer.numberOfChannels }, (_, i) =>
          renderedBuffer.getChannelData(i),
        )
        wavesurferRef.current?.load(url, peaks, renderedBuffer.duration)
      })

      wavesurferRef.current.on("play", () => setIsPlaying(true))
      wavesurferRef.current.on("pause", () => setIsPlaying(false))
      wavesurferRef.current.on("ready", () => {
        const dur = wavesurferRef.current?.getDuration() || 0
        setDuration(dur)
      })
      wavesurferRef.current.on("timeupdate", (currentTime) => {
        if (!isDragging) {
          setCurrentTime(currentTime)
        }
      })

      return () => {
        wavesurferRef.current?.destroy()
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load audio"
      onError?.(errorMessage)
      console.error("WaveSurfer initialization error:", error)
    }
  }, [audioBuffer, onError])

  useEffect(() => {
    if (wavesurferRef.current) {
      wavesurferRef.current.setVolume(volume)
    }
  }, [volume])

  const togglePlayPause = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.playPause()
    }
  }

  const skipBackward = () => {
    if (wavesurferRef.current) {
      const newTime = Math.max(0, currentTime - 10)
      wavesurferRef.current.seekTo(newTime / duration)
      setCurrentTime(newTime)
    }
  }

  const skipForward = () => {
    if (wavesurferRef.current) {
      const newTime = Math.min(duration, currentTime + 10)
      wavesurferRef.current.seekTo(newTime / duration)
      setCurrentTime(newTime)
    }
  }

  const replay = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.seekTo(0)
      setCurrentTime(0)
      wavesurferRef.current.play()
    }
  }

  const toggleMute = () => {
    if (isMuted) {
      setVolume(prevVolumeRef.current)
      setIsMuted(false)
    } else {
      prevVolumeRef.current = volume
      setVolume(0)
      setIsMuted(true)
    }
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true)
    seekToPosition(e)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return
    seekToPosition(e)
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    if (wavesurferRef.current) {
      wavesurferRef.current.seekTo(currentTime / duration)
    }
  }

  const seekToPosition = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!wavesurferRef.current || !waveRef.current) return

    const rect = waveRef.current.getBoundingClientRect()
    const percentage = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const newTime = percentage * duration

    wavesurferRef.current.seekTo(percentage)
    setCurrentTime(newTime)
  }

  const handleWaveClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!wavesurferRef.current || !waveRef.current) return

    const rect = waveRef.current.getBoundingClientRect()
    const percentage = (e.clientX - rect.left) / rect.width
    const newTime = percentage * duration

    wavesurferRef.current.seekTo(percentage)
    setCurrentTime(newTime)
  }

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return "0:00"
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const bufferToWave = (audioBuffer: AudioBuffer) => {
    const numberOfChannels = audioBuffer.numberOfChannels
    const sampleRate = audioBuffer.sampleRate
    const format = 1 // PCM
    const bitDepth = 16

    const bytesPerSample = bitDepth / 8
    const arrayLength = numberOfChannels * audioBuffer.length * bytesPerSample + 44

    const arrayBuffer = new ArrayBuffer(arrayLength)
    const view = new DataView(arrayBuffer)

    const channels: Float32Array[] = []
    for (let i = 0; i < numberOfChannels; i++) {
      channels.push(audioBuffer.getChannelData(i))
    }

    let offset = 0
    const setUint16 = (data: number) => {
      view.setUint16(offset, data, true)
      offset += 2
    }
    const setUint32 = (data: number) => {
      view.setUint32(offset, data, true)
      offset += 4
    }

    // RIFF identifier
    setUint32(0x46464952) // "RIFF"
    setUint32(arrayLength - 8) // file length - 8
    setUint32(0x45564157) // "WAVE"

    // fmt sub-chunk
    setUint32(0x20746d66) // "fmt " chunk
    setUint32(16) // chunk size
    setUint16(format)
    setUint16(numberOfChannels)
    setUint32(sampleRate)
    setUint32(sampleRate * bytesPerSample * numberOfChannels) // avg. byte rate
    setUint16(bytesPerSample * numberOfChannels) // block-align
    setUint16(bitDepth)

    // data sub-chunk
    setUint32(0x61746164) // "data" - chunk
    setUint32(arrayLength - offset - 4) // chunk length

    let index = offset


    for (let i = 0; i < audioBuffer.length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        let sample = Math.max(-1, Math.min(1, channels[channel][i]))
        sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff
        view.setInt16(index, sample, true)
        index += 2
      }
    }

    return new Blob([arrayBuffer], { type: "audio/wav" })
  }

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full bg-card border border-border rounded-lg shadow-lg"
      style={{ height: "100px" }}
    >
      <div className="flex flex-col h-full p-2 gap-1">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="flex-1 min-h-0"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div
            ref={waveRef}
            onClick={handleWaveClick}
            className={`h-full cursor-pointer hover:opacity-80 transition-opacity ${isDragging ? "opacity-100" : ""}`}
            style={{ backgroundColor: "rgba(59, 130, 246, 0.05)" }}
          />
        </motion.div>

        <div className="flex items-center justify-between gap-1.5">
          {/* Time display */}
          <div className="flex gap-0.5 text-xs text-muted-foreground min-w-32 whitespace-nowrap">
            <p className="min-w-8 text-blue-900">{formatTime(currentTime)}</p>
            <span>/</span>
            <p className="min-w-8">{formatTime(duration)}</p>
          </div>

          {/* Control buttons */}
          <div className="flex items-center gap-1">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={skipBackward}
              className="p-1.5 rounded-full bg-secondary hover:bg-accent transition-colors"
              aria-label="Skip backward 10 seconds"
            >
              <SkipBack size={14} className="text-secondary-foreground" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={togglePlayPause}
              className="p-1.5 rounded-full bg-primary hover:bg-primary/90 transition-colors shadow-lg"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause size={16} className="text-primary-foreground" />
              ) : (
                <Play size={16} className="text-primary-foreground ml-0.5" />
              )}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={skipForward}
              className="p-1.5 rounded-full bg-secondary hover:bg-accent transition-colors"
              aria-label="Skip forward 10 seconds"
            >
              <SkipForward size={14} className="text-secondary-foreground" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={replay}
              className="p-1.5 rounded-full bg-secondary hover:bg-accent transition-colors"
              aria-label="Replay from start"
            >
              <RotateCcw size={14} className="text-secondary-foreground" />
            </motion.button>
          </div>

          {/* Volume control - compact */}
          <div className="flex items-center gap-1 min-w-fit">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleMute}
              className="p-1.5 rounded-full hover:bg-secondary transition-colors flex-shrink-0"
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? (
                <motion.div
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <VolumeX size={14} className="text-muted-foreground" />
                </motion.div>
              ) : (
                <motion.div
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <Volume2 size={14} className="text-muted-foreground" />
                </motion.div>
              )}
            </motion.button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => {
                const newVolume = Number.parseFloat(e.target.value)
                setVolume(newVolume)
                if (newVolume > 0 && isMuted) {
                  setIsMuted(false)
                }
              }}
              className="w-12 h-1.5 bg-secondary rounded-full cursor-pointer accent-primary flex-shrink-0"
              aria-label="Volume control"
            />
            <span className="text-xs text-muted-foreground w-6 text-right flex-shrink-0">
              {Math.round(volume * 100)}%
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
