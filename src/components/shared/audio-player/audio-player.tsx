"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { motion } from "framer-motion"
import WaveSurfer from "wavesurfer.js"
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, RotateCcw } from "lucide-react"

interface AudioPlayerProps {
  audioBuffer: AudioBuffer | null
  onError?: (error: string) => void
  autoPlay?: boolean
  deferReloadWhilePlaying?: boolean
}

export function AudioPlayer({ audioBuffer, onError, autoPlay = false, deferReloadWhilePlaying = true }: AudioPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const waveRef = useRef<HTMLDivElement>(null)
  const wavesurferRef = useRef<WaveSurfer | null>(null)
  const isDraggingRef = useRef(false)
  const loadSeqRef = useRef(0)
  const pendingPlayRef = useRef(false)
  const pendingBufferRef = useRef<AudioBuffer | null>(null)
  const userPausedRef = useRef(false)
  const autoPlayRef = useRef(autoPlay)
  const deferReloadRef = useRef(deferReloadWhilePlaying)
  const playbackRateRef = useRef(1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const prevVolumeRef = useRef(1)

  useEffect(() => {
    autoPlayRef.current = autoPlay
  }, [autoPlay])

  useEffect(() => {
    deferReloadRef.current = deferReloadWhilePlaying
  }, [deferReloadWhilePlaying])

  useEffect(() => {
    playbackRateRef.current = playbackRate
    const ws = wavesurferRef.current as unknown as { setPlaybackRate?: (rate: number) => void } | null
    if (ws?.setPlaybackRate) ws.setPlaybackRate(playbackRate)
  }, [playbackRate])

  const bufferToWave = useCallback((audioBuffer: AudioBuffer) => {
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
  }, [])

  const applyBuffer = useCallback((buf: AudioBuffer, preferPlay: boolean) => {
    const ws = wavesurferRef.current
    if (!ws) return

    const prevTime = ws.getCurrentTime() || 0
    const wasPlaying = ws.isPlaying()
    const seq = ++loadSeqRef.current

    try {
      const url = URL.createObjectURL(bufferToWave(buf))

      ws.once("ready", () => {
        if (seq !== loadSeqRef.current) {
          URL.revokeObjectURL(url)
          return
        }
        try {
          const dur = ws.getDuration() || 0
          const safeTime = Math.min(prevTime, dur)
          if (dur > 0) {
            ws.seekTo(safeTime / dur)
            setCurrentTime(safeTime)
          }

          const wsRate = wavesurferRef.current as unknown as { setPlaybackRate?: (rate: number) => void } | null
          if (wsRate?.setPlaybackRate) wsRate.setPlaybackRate(playbackRateRef.current)

          const shouldPlay = (preferPlay || wasPlaying || pendingPlayRef.current || autoPlayRef.current) && !userPausedRef.current
          pendingPlayRef.current = false
          if (shouldPlay) ws.play()
        } catch {
          // ignore
        }
        URL.revokeObjectURL(url)
      })

      ws.load(url)
    } catch {
      // ignore
    }
  }, [bufferToWave])

  useEffect(() => {
    if (!waveRef.current) return
    if (wavesurferRef.current) return

    try {
      const ws = WaveSurfer.create({
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
      wavesurferRef.current = ws

      ws.on("play", () => setIsPlaying(true))
      ws.on("pause", () => setIsPlaying(false))
      ws.on("ready", () => {
        const dur = ws.getDuration() || 0
        setDuration(dur)
      })
      ws.on("error", (e) => {
        const msg = typeof e === "string" ? e : "Failed to load audio"
        onError?.(msg)
      })
      ws.on("timeupdate", (t) => {
        if (!isDraggingRef.current) {
          setCurrentTime(t)
        }

        const pending = pendingBufferRef.current
        if (!pending) return
        if (!deferReloadRef.current) return

        const dur = ws.getDuration() || 0
        const nearEnd = dur > 0 && dur - t <= 0.35
        if (!ws.isPlaying() || nearEnd) {
          pendingBufferRef.current = null
          applyBuffer(pending, false)
        }
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load audio"
      onError?.(errorMessage)
      console.error("WaveSurfer initialization error:", error)
    }

    return () => {
      wavesurferRef.current?.destroy()
      wavesurferRef.current = null
    }
  }, [applyBuffer, onError])

  useEffect(() => {
    const ws = wavesurferRef.current
    if (!ws) return

    if (!audioBuffer) {
      setDuration(0)
      setCurrentTime(0)
      return
    }

    const isPlayingNow = ws.isPlaying()
    const dur = ws.getDuration() || 0
    const t = ws.getCurrentTime() || 0
    const nearEnd = dur > 0 && dur - t <= 0.35

    if (deferReloadRef.current && isPlayingNow && !nearEnd) {
      pendingBufferRef.current = audioBuffer
      return
    }

    pendingBufferRef.current = null
    applyBuffer(audioBuffer, autoPlayRef.current)
  }, [applyBuffer, audioBuffer])

  useEffect(() => {
    if (wavesurferRef.current) {
      wavesurferRef.current.setVolume(volume)
    }
  }, [volume])

  const seekToTime = (t: number) => {
    const ws = wavesurferRef.current
    if (!ws) return
    if (duration <= 0) return
    const safe = Math.max(0, Math.min(duration, t))
    ws.seekTo(safe / duration)
    setCurrentTime(safe)
  }

  const togglePlayPause = () => {
    const ws = wavesurferRef.current
    if (!ws) return

    const dur = ws.getDuration() || 0
    if (dur <= 0) {
      // User clicked play before WaveSurfer is ready.
      pendingPlayRef.current = true
      userPausedRef.current = false
      return
    }

    pendingPlayRef.current = false
    if (ws.isPlaying()) {
      userPausedRef.current = true
      ws.pause()
    } else {
      userPausedRef.current = false
      ws.play()
    }
  }

  const skipBackward = () => {
    if (wavesurferRef.current) {
      if (duration <= 0) return
      const newTime = Math.max(0, currentTime - 10)
      wavesurferRef.current.seekTo(newTime / duration)
      setCurrentTime(newTime)
    }
  }

  const skipForward = () => {
    if (wavesurferRef.current) {
      if (duration <= 0) return
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

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return "0:00"
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full rounded-2xl shadow-lg border border-white/20"
      style={{ background: "linear-gradient(135deg, #5b5ad6, #7250c7)", height: "83px" }}
    >
      <div className="relative flex flex-col h-full px-3 py-2 gap-1.5">
        <div ref={waveRef} className="absolute left-[-9999px] top-0 h-0 w-0 overflow-hidden" />

        <div className="flex items-center gap-3">
          {/* Control buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={skipBackward}
              aria-label="Skip backward 10 seconds"
              className="h-7 w-7 rounded-full bg-white/15 hover:bg-white/20 text-white grid place-items-center"
            >
              <SkipBack className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={togglePlayPause}
              aria-label={isPlaying ? "Pause" : "Play"}
              className="h-9 w-9 rounded-full bg-white text-indigo-700 grid place-items-center shadow ring-2 ring-white/50"
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
            </button>

            <button
              type="button"
              onClick={skipForward}
              aria-label="Skip forward 10 seconds"
              className="h-7 w-7 rounded-full bg-white/15 hover:bg-white/20 text-white grid place-items-center"
            >
              <SkipForward className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 min-w-0">
            {/* Time display */}
            <div className="flex flex-col items-center gap-1">
              <input
                type="range"
                min={0}
                max={Math.max(0, duration)}
                step={0.01}
                value={Math.min(currentTime, duration || 0)}
                onMouseDown={() => {
                  isDraggingRef.current = true
                }}
                onMouseUp={() => {
                  isDraggingRef.current = false
                }}
                onTouchStart={() => {
                  isDraggingRef.current = true
                }}
                onTouchEnd={() => {
                  isDraggingRef.current = false
                }}
                onChange={(e) => {
                  const t = Number.parseFloat(e.target.value)
                  if (!isFinite(t)) return
                  seekToTime(t)
                }}
                className="w-full h-1.5 rounded-full bg-white/25 accent-white cursor-pointer"
                aria-label="Seek"
                disabled={duration <= 0}
              />
              <div className="text-white/90 text-xs font-semibold whitespace-nowrap">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={replay}
            aria-label="Replay from start"
            className="h-7 w-7 rounded-full bg-white/15 hover:bg-white/20 text-white grid place-items-center"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center justify-between gap-3">
          {/* Volume control - compact */}
          <div className="flex items-center gap-2 min-w-[160px]">
            <button
              type="button"
              onClick={toggleMute}
              aria-label={isMuted ? "Unmute" : "Mute"}
              className="h-7 w-7 rounded-full bg-white/15 hover:bg-white/20 text-white grid place-items-center"
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => {
                const newVolume = Number.parseFloat(e.target.value)
                if (!isFinite(newVolume)) return
                setVolume(newVolume)
                if (newVolume <= 0) {
                  setIsMuted(true)
                } else {
                  prevVolumeRef.current = newVolume
                  setIsMuted(false)
                }
              }}
              className="w-full h-1.5 rounded-full bg-white/25 accent-white cursor-pointer"
              aria-label="Volume control"
            />
          </div>

          <div className="flex items-center gap-2 text-white/90 text-xs font-semibold whitespace-nowrap">
            <span className={`h-1.5 w-1.5 rounded-full ${isPlaying ? "bg-green-400" : "bg-yellow-300"}`} />
            {isPlaying ? "PLAYING" : "PAUSED"}
          </div>

          <div className="flex items-center gap-2">
            {([0.5, 1, 1.5, 2] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setPlaybackRate(r)}
                className={
                  "px-2 py-0.5 rounded-full border text-xs font-semibold transition-colors " +
                  (playbackRate === r
                    ? "bg-white text-indigo-700 border-white"
                    : "bg-white/10 text-white border-white/25 hover:bg-white/15")
                }
                aria-pressed={playbackRate === r}
              >
                {r}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
