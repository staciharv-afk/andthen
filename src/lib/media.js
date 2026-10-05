import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase";

// Browser-side media handling shared by the single share-a-memory form
// (Memorial.jsx) and the multi-photo uploader (MediaBatchUploader.jsx):
// the video cap/compress/poster helpers and the storage uploads, plus the
// photo prep the batch uploader adds (resize, HEIC, EXIF date).

export const SHARE_MAX_SECONDS = 60;

// Reject videos longer than the cap (read duration without uploading).
export const shareVideoWithinCap = (file) =>
  new Promise((resolve) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => { URL.revokeObjectURL(v.src); resolve(v.duration <= SHARE_MAX_SECONDS + 0.5); };
    v.onerror = () => resolve(true); // unreadable — let it through rather than block
    v.src = URL.createObjectURL(file);
  });

// Below this, a phone video's raw size is dominated by resolution/bitrate
// choices the source device made, not content — worth re-encoding smaller
// before a slow upload. Above it, re-encoding a already-small file just
// burns the contributor's battery for no real gain.
const VIDEO_COMPRESS_THRESHOLD_BYTES = 12 * 1024 * 1024;
const VIDEO_COMPRESS_MAX_WIDTH = 960;
const VIDEO_COMPRESS_BITRATE = 2_000_000;

const canCompressVideo = () =>
  typeof MediaRecorder !== "undefined" &&
  typeof HTMLVideoElement !== "undefined" &&
  typeof HTMLVideoElement.prototype.captureStream === "function" &&
  (MediaRecorder.isTypeSupported?.("video/webm;codecs=vp9,opus") || MediaRecorder.isTypeSupported?.("video/webm;codecs=vp8,opus"));

// Re-encodes an oversized video to a capped resolution/bitrate by playing it
// muted and redrawing each frame to a smaller canvas while MediaRecorder
// captures that canvas's stream plus the source's own audio track. This
// takes roughly the video's real duration to run (it plays through once),
// which is why it's gated to the 60s share cap and to files worth the
// trouble. Never throws — any failure (unsupported browser, decode error,
// output that isn't actually smaller) falls back to the original file so
// compression can never be the reason an upload doesn't happen.
export const compressVideo = (file, onProgress) => new Promise((resolve) => {
  if (file.size < VIDEO_COMPRESS_THRESHOLD_BYTES || !canCompressVideo()) { resolve(file); return; }

  const cleanupFns = [];
  const cleanup = () => cleanupFns.forEach((fn) => fn());
  const fallback = () => { cleanup(); resolve(file); };

  try {
    const url = URL.createObjectURL(file);
    cleanupFns.push(() => URL.revokeObjectURL(url));
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.src = url;

    video.onerror = fallback;
    video.onloadedmetadata = async () => {
      const scale = Math.min(1, VIDEO_COMPRESS_MAX_WIDTH / video.videoWidth);
      if (scale >= 1) { fallback(); return; } // already small enough resolution-wise

      try {
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);
        const ctx = canvas.getContext("2d");

        const audioTracks = video.captureStream().getAudioTracks();
        const combined = new MediaStream([...canvas.captureStream(30).getVideoTracks(), ...audioTracks]);
        const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus") ? "video/webm;codecs=vp9,opus" : "video/webm;codecs=vp8,opus";
        const recorder = new MediaRecorder(combined, { mimeType, videoBitsPerSecond: VIDEO_COMPRESS_BITRATE });
        const chunks = [];
        recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };

        let raf;
        const draw = () => { ctx.drawImage(video, 0, 0, canvas.width, canvas.height); raf = requestAnimationFrame(draw); };
        cleanupFns.push(() => cancelAnimationFrame(raf));

        recorder.onstop = () => {
          cleanup();
          const blob = new Blob(chunks, { type: "video/webm" });
          if (!blob.size || blob.size >= file.size) { resolve(file); return; } // re-encode didn't help
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webm", { type: "video/webm" }));
        };

        video.ontimeupdate = () => { if (onProgress && video.duration) onProgress(video.currentTime / video.duration); };
        video.onended = () => recorder.state !== "inactive" && recorder.stop();

        recorder.start();
        draw();
        await video.play();
      } catch { fallback(); }
    };
  } catch { fallback(); }
});

// Seeks the (already-compressed) video to a point past any lead-in black
// frame and grabs it as a jpeg, so a video tile never opens on a blank
// frame. Returns null rather than throwing on any failure — a missing
// poster just means the tile falls back to showing nothing until played,
// same as before this existed.
const SHARE_POSTER_SEEK_RATIO = 0.15;
export const generateVideoPoster = (file, seekSeconds) => new Promise((resolve) => {
  try {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    const url = URL.createObjectURL(file);
    const done = (result) => { URL.revokeObjectURL(url); resolve(result); };

    video.onerror = () => done(null);
    video.onloadedmetadata = () => {
      const t = seekSeconds != null ? seekSeconds : Math.min(video.duration * SHARE_POSTER_SEEK_RATIO, Math.max(0, video.duration - 0.1));
      video.currentTime = Math.max(0, t);
    };
    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext("2d").drawImage(video, 0, 0);
        canvas.toBlob((blob) => done(blob ? new File([blob], "poster.jpg", { type: "image/jpeg" }) : null), "image/jpeg", 0.85);
      } catch { done(null); }
    };
    video.src = url;
  } catch { resolve(null); }
});

// supabase-js's storage.upload() has no progress callback (it's a plain
// fetch under the hood), so a large video upload just spins with no
// feedback. This hits the same Storage REST endpoint directly via XHR,
// which does expose upload progress — used only for the video path, where
// the wait is long enough to need it.
export const uploadFileWithProgress = async (bucket, path, file, contentType, onProgress) => {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token || SUPABASE_ANON_KEY;

  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${SUPABASE_URL}/storage/v1/object/${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`, true);
    xhr.setRequestHeader("apikey", SUPABASE_ANON_KEY);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("Content-Type", contentType || file.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => { if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total); };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`)));
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(file);
  });

  return supabase.storage.from(bucket).getPublicUrl(path).data?.publicUrl;
};

// ── batch uploader additions ────────────────────────────────────────────

// Desktop browsers often hand a HEIC over with an empty `type`, so the
// extension counts too.
export const isHeic = (file) => /image\/hei[cf]/i.test(file.type || "") || /\.hei[cf]$/i.test(file.name || "");
export const isVideoFile = (file) => (file.type || "").startsWith("video/");
// Voicemails saved from a phone often arrive with an odd or empty type.
export const isAudioFile = (file) => (file.type || "").startsWith("audio/") || /\.(m4a|mp3|wav|aac|amr|ogg|oga|caf|aiff?)$/i.test(file.name || "");
export const isMediaFile = (file) => (file.type || "").startsWith("image/") || isVideoFile(file) || isHeic(file);

const PHOTO_MAX_EDGE = 2400;
const PHOTO_JPEG_QUALITY = 0.85;
const THUMB_EDGE = 360;

// createImageBitmap applies EXIF orientation itself; the <img> fallback is
// for older Safari, which rejects some inputs createImageBitmap elsewhere
// accepts. Rejects when the browser can't decode the format at all (HEIC
// anywhere but Safari).
const decodeImage = async (blob) => {
  try { return await createImageBitmap(blob); } catch { /* fall through to <img> */ }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("decode failed")); };
    img.src = url;
  });
};

const drawScaled = (source, maxEdge, quality) => new Promise((resolve) => {
  const w = source.width, h = source.height;
  const scale = Math.min(1, maxEdge / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff"; // a transparent PNG flattens onto white, not black
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
});

const jpegName = (name) => `${(name || "photo").replace(/\.[^.]+$/, "")}.jpg`;

// Gets a photo ready to upload: HEIC → JPEG when the browser can't read it
// natively (iOS's picker has usually converted it already), then a resize
// to a 2400px long edge at ~0.85 JPEG. Returns { file, thumb } — `thumb` is
// a small JPEG blob for the review grid, so 50 full-size originals are
// never decoded on screen at once. A photo that's already a small JPEG, or
// a GIF (resizing would freeze its animation), is passed through untouched.
// Throws only when the image can't be read at all.
export async function prepareImage(file) {
  let source = file;
  let bitmap = await decodeImage(source).catch(() => null);
  if (!bitmap && isHeic(file)) {
    const { heicTo } = await import("heic-to");
    source = await heicTo({ blob: file, type: "image/jpeg", quality: 0.92 });
    bitmap = await decodeImage(source).catch(() => null);
  }
  if (!bitmap) throw new Error("This photo couldn't be read.");

  const thumb = await drawScaled(bitmap, THUMB_EDGE, 0.7);
  const longEdge = Math.max(bitmap.width, bitmap.height);
  let out;
  if (file.type === "image/gif") out = file;
  else if (longEdge <= PHOTO_MAX_EDGE && source.type === "image/jpeg") out = source === file ? file : new File([source], jpegName(file.name), { type: "image/jpeg" });
  else {
    const blob = await drawScaled(bitmap, PHOTO_MAX_EDGE, PHOTO_JPEG_QUALITY);
    out = blob ? new File([blob], jpegName(file.name), { type: "image/jpeg" }) : file;
  }
  bitmap.close?.();
  return { file: out, thumb };
}

// The day a photo was taken, from its EXIF data, as "YYYY-MM-DD" — or ""
// when there isn't one (screenshots, scans, most videos). Never throws.
export async function readTakenOn(file) {
  try {
    const { default: exifr } = await import("exifr");
    const tags = await exifr.parse(file, ["DateTimeOriginal", "CreateDate"]);
    const d = tags?.DateTimeOriginal || tags?.CreateDate;
    if (!(d instanceof Date) || isNaN(d)) return "";
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  } catch { return ""; }
}

// Resumable (TUS) upload to Supabase Storage — used for videos, where a
// dropped connection on a phone shouldn't mean starting a large file over.
// tus-js-client retries a failed chunk on its own and picks an interrupted
// upload back up from where it stopped. Supabase requires 6MB chunks.
export async function uploadResumable(bucket, path, file, contentType, onProgress) {
  const { Upload } = await import("tus-js-client");
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token || SUPABASE_ANON_KEY;

  await new Promise((resolve, reject) => {
    const upload = new Upload(file, {
      endpoint: `${SUPABASE_URL}/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000],
      headers: { authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY, "x-upsert": "false" },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: { bucketName: bucket, objectName: path, contentType: contentType || file.type || "video/mp4", cacheControl: "3600" },
      chunkSize: 6 * 1024 * 1024,
      onError: (err) => reject(err),
      onProgress: (sent, total) => onProgress?.(total ? sent / total : 0),
      onSuccess: () => resolve(),
    });
    upload.findPreviousUploads()
      .then((previous) => { if (previous.length) upload.resumeFromPreviousUpload(previous[0]); })
      .catch(() => {})
      .finally(() => upload.start());
  });

  return supabase.storage.from(bucket).getPublicUrl(path).data?.publicUrl;
}
