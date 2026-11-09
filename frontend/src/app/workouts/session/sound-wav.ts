function createWavDataUri(samples: Float32Array, sampleRate = 44100): string {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = samples.length * (bitsPerSample / 8);
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  function writeString(offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    const int16 = s < 0 ? s * 0x8000 : s * 0x7fff;
    view.setInt16(offset, int16, true);
    offset += 2;
  }

  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return "data:audio/wav;base64," + btoa(binary);
}

export function getChimeWavUri(): string {
  const sampleRate = 44100;
  const totalDuration = 0.85;
  const samples = new Float32Array(Math.floor(sampleRate * totalDuration));
  const notes = [
    { freq: 659.25, duration: 0.12, delay: 0 },
    { freq: 830.61, duration: 0.12, delay: 0.1 },
    { freq: 987.77, duration: 0.12, delay: 0.2 },
    { freq: 1318.51, duration: 0.45, delay: 0.32 },
  ];

  notes.forEach((note) => {
    const startIdx = Math.floor(note.delay * sampleRate);
    const len = Math.floor(note.duration * sampleRate);
    for (let i = 0; i < len; i++) {
      const t = i / sampleRate;
      const progress = i / len;
      const attack = Math.min(1, progress / 0.05);
      const decay = Math.exp(-progress * 3.5);
      const env = attack * decay;

      const fundamental = Math.sin(2 * Math.PI * note.freq * t) * 0.7;
      const harmonic = Math.sin(2 * Math.PI * note.freq * 2 * t) * 0.25;
      const val = (fundamental + harmonic) * env;

      if (startIdx + i < samples.length) {
        samples[startIdx + i] += val;
      }
    }
  });

  return createWavDataUri(samples, sampleRate);
}

export function getBeepWavUri(): string {
  const sampleRate = 44100;
  const totalDuration = 0.18;
  const freq = 750;
  const samples = new Float32Array(Math.floor(sampleRate * totalDuration));
  
  for (let i = 0; i < samples.length; i++) {
    const t = i / sampleRate;
    const progress = i / samples.length;
    // Fast attack (10ms), linear decay
    const attack = Math.min(1, t / 0.01);
    const decay = 1 - progress;
    const env = attack * decay;

    const fundamental = Math.sin(2 * Math.PI * freq * t) * 0.7;
    const harmonic = Math.sin(2 * Math.PI * freq * 2 * t) * 0.25;
    
    samples[i] = (fundamental + harmonic) * env;
  }
  
  return createWavDataUri(samples, sampleRate);
}
