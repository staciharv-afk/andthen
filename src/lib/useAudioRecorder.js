import { useEffect, useRef, useState } from "react";

// Records the contributor's own voice for "Tell it out loud".
//
//   const rec = useAudioRecorder({ maxSeconds: 300, barsRef });
//   rec.state   — "idle" | "recording" | "done"
//   rec.seconds — elapsed while recording, final length once done
//   rec.file    — the finished recording (a File) once done
//   rec.error   — a plain message when the mic can't be used, else ""
//   rec.start() / rec.stop() / rec.reset()
//
// The microphone is only asked for inside start(), i.e. when the record
// button is tapped — never on mount. Records audio/webm where the browser
// supports it and audio/mp4 where it doesn't (Safari). Stops by itself at
// maxSeconds.
//
// barsRef points at the waveform's container; while recording, its child
// elements' heights are driven straight from the mic level (no re-render per
// frame).
const MIME_TYPES = [["audio/webm", "webm"], ["audio/mp4", "m4a"]];
const BAR_MIN = 6, BAR_MAX = 42;

export function useAudioRecorder({ maxSeconds, barsRef }) {
  const [state, setState] = useState("idle");
  const [seconds, setSeconds] = useState(0);
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const live = useRef({}).current; // recorder, stream, audioCtx, raf, timer — whatever's currently running

  const teardown = () => {
    clearInterval(live.timer);
    cancelAnimationFrame(live.raf);
    live.stream?.getTracks().forEach((t) => t.stop());
    live.audioCtx?.close().catch(() => {});
    live.stream = live.audioCtx = live.timer = live.raf = null;
    Array.from(barsRef?.current?.children || []).forEach((bar) => { bar.style.height = `${BAR_MIN}px`; });
  };

  const stop = () => {
    if (live.recorder && live.recorder.state !== "inactive") live.recorder.stop();
  };

  const reset = () => {
    if (live.recorder) { live.recorder.onstop = null; stop(); live.recorder = null; }
    teardown();
    setState("idle");
    setSeconds(0);
    setFile(null);
    setError("");
  };

  // Leaving the screen (or the page) mid-recording must let go of the mic.
  useEffect(() => () => {
    if (live.recorder) { live.recorder.onstop = null; stop(); }
    teardown();
  }, []);

  const drawLevels = (analyser) => {
    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteFrequencyData(data);
      const bars = Array.from(barsRef?.current?.children || []);
      bars.forEach((bar, i) => {
        const level = data[Math.floor((i / bars.length) * data.length * 0.6)] / 255;
        bar.style.height = `${BAR_MIN + level * (BAR_MAX - BAR_MIN)}px`;
      });
      live.raf = requestAnimationFrame(tick);
    };
    tick();
  };

  const start = async () => {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Recording isn't available in this browser. If you have an audio file saved, you can add it under Voicemail instead.");
      return;
    }
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("We couldn't use your microphone. Allow microphone access for this site in your browser settings, then tap the button again.");
      return;
    }

    const [mimeType, ext] = MIME_TYPES.find(([t]) => MediaRecorder.isTypeSupported?.(t)) || ["", "m4a"];
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks = [];
    const startedAt = Date.now();
    recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    recorder.onstop = () => {
      const type = (recorder.mimeType || mimeType || "audio/mp4").split(";")[0];
      const length = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
      teardown();
      live.recorder = null;
      setSeconds(Math.min(length, maxSeconds));
      setFile(new File([new Blob(chunks, { type })], `recording.${ext}`, { type }));
      setState("done");
    };

    live.recorder = recorder;
    live.stream = stream;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      live.audioCtx = new AudioCtx();
      const analyser = live.audioCtx.createAnalyser();
      analyser.fftSize = 128;
      live.audioCtx.createMediaStreamSource(stream).connect(analyser);
      drawLevels(analyser);
    } catch { /* no waveform — the recording itself is unaffected */ }

    setFile(null);
    setSeconds(0);
    setState("recording");
    recorder.start();
    live.timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      setSeconds(elapsed);
      if (elapsed >= maxSeconds) stop();
    }, 250);
  };

  return { state, seconds, file, error, start, stop, reset };
}
