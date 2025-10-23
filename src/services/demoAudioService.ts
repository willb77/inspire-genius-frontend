class DemoAudioService {
  private audioContext: AudioContext | null = null;
  private audioQueue: (Blob | ArrayBuffer)[] = [];
  private isPlaying = false;
  private scheduledTime = 0;
  private initialDelayApplied = false;
  private minBufferSize = 3;
  private activeSources: AudioBufferSourceNode[] = [];

  private safeStopDisconnect(src: AudioBufferSourceNode): void {
    try { src.stop(); } catch { void 0 }
    try { src.disconnect(); } catch { void 0 }
  }

  async initializeAudioContext(): Promise<boolean> {
    try {
      if (!this.audioContext || this.audioContext.state === 'closed') {
        const AudioContextClass: typeof AudioContext | undefined =
          (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextClass) throw new Error('AudioContext not supported');
        this.audioContext = new AudioContextClass();
      }
      return true;
    } catch (e) {
      console.error('AudioContext not supported!', e);
      return false;
    }
  }

  resetAudioState(): void {
    // stop any in-flight or scheduled sources
    for (const src of this.activeSources) this.safeStopDisconnect(src);
    this.activeSources = [];
    this.audioQueue = [];
    this.isPlaying = false;
    this.initialDelayApplied = false;
    if (this.audioContext) {
      this.scheduledTime = this.audioContext.currentTime;
    } else {
      this.scheduledTime = 0;
    }
    try {
      if (!this.audioContext || this.audioContext.state === 'closed') {
        const AudioContextClass: typeof AudioContext | undefined =
          (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextClass) throw new Error('AudioContext not supported');
        this.audioContext = new AudioContextClass();
      } else if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch((err) => {
          console.error('Failed to resume AudioContext:', err);
        });
      }
    } catch (e) {
      console.error('AudioContext not supported!', e);
    }
  }

  addAudioChunk(audioData: Blob | ArrayBuffer): void {
    this.audioQueue.push(audioData);
    this.processAudioQueue();
  }

  private processAudioQueue(): void {
    if (!this.isPlaying && this.audioQueue.length > 0) {
      if (!this.initialDelayApplied && this.audioQueue.length < this.minBufferSize) {
        return;
      }
      if (!this.initialDelayApplied) {
        this.initialDelayApplied = true;
        setTimeout(() => {
          this.isPlaying = true;
          this.playNextInQueue();
        }, 100);
      } else {
        this.isPlaying = true;
        this.playNextInQueue();
      }
    }
  }

  private async playNextInQueue(): Promise<void> {
    if (this.audioQueue.length === 0) {
      this.isPlaying = false;
      return;
    }
    try {
      const chunk = this.audioQueue.shift()!;
      const pcmData = await (chunk instanceof Blob ? chunk.arrayBuffer() : chunk);
      const wavBuffer = this.createWavFile(pcmData, 1, 24000, 2);
      try {
        const audioBuffer = await this.audioContext!.decodeAudioData(wavBuffer);
        const now = this.audioContext!.currentTime;
        if (this.scheduledTime < now) this.scheduledTime = now + 0.01;
        const source = this.audioContext!.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.audioContext!.destination);
        source.start(this.scheduledTime);
        const gapReduction = 0.0;
        this.scheduledTime += audioBuffer.duration - gapReduction;
        this.activeSources.push(source);
        source.onended = () => {
          // remove from active list
          this.activeSources = this.activeSources.filter((s) => s !== source);
          this.playNextInQueue();
        };
      } catch (e) {
        console.error('Error decoding audio data', e);
        this.playNextInQueue();
      }
    } catch (e) {
      console.error('Error processing audio chunk', e);
      this.playNextInQueue();
    }
  }

  private createWavFile(
    pcmData: ArrayBuffer,
    numChannels: number,
    sampleRate: number,
    bytesPerSample: number
  ): ArrayBuffer {
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = pcmData.byteLength;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    this.writeString(view, 8, 'WAVE');
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bytesPerSample * 8, true);
    this.writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);
    const pcm = new Uint8Array(pcmData);
    for (let i = 0; i < pcm.length; i++) {
      view.setUint8(44 + i, pcm[i]);
    }
    return buffer;
  }

  private writeString(view: DataView, offset: number, str: string): void {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  }

  stopAudio(): void {
    // cancel all scheduled and currently playing sources
    for (const src of this.activeSources) this.safeStopDisconnect(src);
    this.activeSources = [];
    this.audioQueue = [];
    this.isPlaying = false;
    if (this.audioContext) {
      this.scheduledTime = this.audioContext.currentTime;
    } else {
      this.scheduledTime = 0;
    }
  }

  get speaking(): boolean {
    return this.isPlaying || this.audioQueue.length > 0;
  }

  getStatus(): { isPlaying: boolean; queueLength: number; scheduledTime: number; buffered: boolean } {
    return {
      isPlaying: this.isPlaying,
      queueLength: this.audioQueue.length,
      scheduledTime: this.scheduledTime,
      buffered: this.initialDelayApplied,
    };
  }

  forceStart(): void {
    if (!this.isPlaying && this.audioQueue.length > 0) {
      this.initialDelayApplied = true;
      this.isPlaying = true;
      this.playNextInQueue();
    }
  }

  dispose(): void {
    this.stopAudio();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  pauseAudio(): void {
    if (this.audioContext && this.audioContext.state === 'running') {
      this.audioContext.suspend();
    }
  }

  resumeAudio(): void {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }
}

export default DemoAudioService;
