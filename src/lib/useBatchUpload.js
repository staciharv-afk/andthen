import { useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";
import { uid } from "./utils";
import { detectCropPosition } from "../components/CropAdjuster";
import {
  isMediaFile, isVideoFile, isAudioFile, prepareImage, readTakenOn, shareVideoWithinCap, compressVideo,
  generateVideoPoster, uploadFileWithProgress, uploadResumable,
} from "./media";

const BUCKET = "memorial-media";
const ACCEPTS = {
  media: isMediaFile,
  image: (f) => isMediaFile(f) && !isVideoFile(f),
  audio: isAudioFile,
};
const UPLOADS_AT_ONCE = 3;
const AUTO_RETRY_DELAY_MS = 1500;

// The upload queue behind MediaBatchUploader and ShareMemoryModal. Files
// start uploading the moment they're picked, so by the time someone has
// looked them over (or filled in their name) most of the work is done.
//
// Two stages per file:
//   prepare — one at a time, in pick order: read the EXIF date, resize the
//             photo (or check a video's length and grab its poster), make a
//             thumbnail. Quick, and it's what fills in the review grid.
//   upload  — three at a time. A failed upload is retried once on its own;
//             after that the item is marked "error" and waits for retry().
//
// Audio (a recording, a saved voicemail) skips prepare's work and uploads
// as it is.
//
// Item shape: { id, kind: 'photo'|'video'|'audio', name, status, progress, error,
// canRetry, thumbUrl, takenOn, text, cropPos, mediaUrl, posterUrl }.
// status: preparing → queued → uploading → uploaded, or error.
//
// The queue's working state lives in a ref (uploads outlive any one render)
// and is mirrored into React state for display.
export function useBatchUpload({ pathPrefix }) {
  const [items, setItems] = useState([]);
  const q = useRef({ items: [], files: new Map(), active: 0, preparing: false, seq: 0, waiters: [], alive: true }).current;

  useEffect(() => {
    q.alive = true;
    return () => { q.alive = false; };
  }, []);

  const busy = (it) => it.status === "preparing" || it.status === "queued" || it.status === "uploading";

  const commit = (next) => {
    q.items = next;
    if (q.alive) setItems(next);
    if (!next.some(busy)) q.waiters.splice(0).forEach((resolve) => resolve());
  };
  const patch = (id, changes) => commit(q.items.map((it) => (it.id === id ? { ...it, ...changes } : it)));
  const has = (id) => q.items.some((it) => it.id === id);

  // Dated photos first, oldest to newest, then everything undated in the
  // order it was picked. Applied once each time preparing catches up, not on
  // every edit, so tiles don't jump around under someone who's typing.
  const sortByDate = () => {
    commit([...q.items].sort((a, b) => {
      if (a.takenOn && b.takenOn) return a.takenOn.localeCompare(b.takenOn) || a.seq - b.seq;
      if (a.takenOn || b.takenOn) return a.takenOn ? -1 : 1;
      return a.seq - b.seq;
    }));
  };

  const prepareOne = async (item) => {
    const src = q.files.get(item.id)?.src;
    if (!src) return;
    try {
      if (item.kind === "audio") {
        q.files.set(item.id, { src, upload: src });
        patch(item.id, { status: "queued" });
      } else if (item.kind === "video") {
        if (!(await shareVideoWithinCap(src))) {
          patch(item.id, { status: "error", error: "Videos must be 60 seconds or less.", canRetry: false });
          return;
        }
        const poster = await generateVideoPoster(src);
        q.files.set(item.id, { src, poster });
        patch(item.id, { status: "queued", thumbUrl: poster ? URL.createObjectURL(poster) : null });
      } else {
        const takenOn = await readTakenOn(src);
        const { file, thumb } = await prepareImage(src);
        const cropPos = await detectCropPosition(file);
        q.files.set(item.id, { src, upload: file });
        patch(item.id, { status: "queued", thumbUrl: thumb ? URL.createObjectURL(thumb) : null, takenOn, cropPos });
      }
    } catch (e) {
      patch(item.id, { status: "error", error: e?.message || "This file couldn't be read.", canRetry: false });
    }
  };

  const runPrepare = async () => {
    if (q.preparing) return;
    q.preparing = true;
    for (;;) {
      const next = q.items.find((it) => it.status === "preparing");
      if (!next) break;
      await prepareOne(next);
      pump();
    }
    q.preparing = false;
    sortByDate();
  };

  const uploadOne = async (item, attempt = 0) => {
    const files = q.files.get(item.id);
    if (!files) return;
    const onProgress = (p) => {
      const cur = q.items.find((it) => it.id === item.id);
      // Only re-render on a visible step, not on every progress event.
      if (cur && (p - cur.progress >= 0.05 || p === 1)) patch(item.id, { progress: p });
    };
    try {
      let mediaUrl, posterUrl = null;
      if (item.kind === "video") {
        if (!files.upload) q.files.set(item.id, { ...files, upload: await compressVideo(files.src) });
        const file = q.files.get(item.id).upload;
        const id = files.objectId || uid();
        q.files.set(item.id, { ...q.files.get(item.id), objectId: id });
        const ext = file.name?.includes(".") ? file.name.split(".").pop() : "mp4";
        mediaUrl = await uploadResumable(BUCKET, `${pathPrefix}/${id}.${ext}`, file, file.type || "video/mp4", onProgress);
        if (files.poster) {
          const posterPath = `${pathPrefix}/${id}-poster.jpg`;
          const { error } = await supabase.storage.from(BUCKET).upload(posterPath, files.poster);
          if (!error) posterUrl = supabase.storage.from(BUCKET).getPublicUrl(posterPath).data?.publicUrl;
        }
      } else {
        const file = files.upload;
        const fallbackExt = item.kind === "audio" ? "m4a" : "jpg";
        const ext = file.name?.includes(".") ? file.name.split(".").pop().toLowerCase() : fallbackExt;
        mediaUrl = await uploadFileWithProgress(BUCKET, `${pathPrefix}/${uid()}.${ext}`, file, file.type || (item.kind === "audio" ? "audio/mp4" : "image/jpeg"), onProgress);
      }
      if (!mediaUrl) throw new Error("Upload failed.");
      q.files.delete(item.id); // the originals aren't needed again — let them be collected
      patch(item.id, { status: "uploaded", progress: 1, mediaUrl, posterUrl });
    } catch {
      if (!has(item.id)) return; // removed while uploading
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, AUTO_RETRY_DELAY_MS));
        if (has(item.id)) return uploadOne(item, 1);
        return;
      }
      patch(item.id, { status: "error", error: "This one didn't upload.", canRetry: true, progress: 0 });
    }
  };

  const pump = () => {
    while (q.active < UPLOADS_AT_ONCE) {
      const next = q.items.find((it) => it.status === "queued");
      if (!next) return;
      q.active += 1;
      patch(next.id, { status: "uploading", progress: 0, error: null });
      uploadOne(next).finally(() => { q.active -= 1; pump(); });
    }
  };

  // `accept` is which kinds this pick takes ("media" = photos + videos,
  // "image", or "audio"); `max` caps how many of them are kept. Returns how
  // the pick was handled so the caller can say so plainly:
  // { ids (the new items), overLimit (picked past max), unsupported }.
  const addFiles = (fileList, { accept = "media", max = Infinity } = {}) => {
    const picked = Array.from(fileList || []);
    const wanted = picked.filter(ACCEPTS[accept]);
    const accepted = wanted.slice(0, Math.max(0, max));
    const fresh = accepted.map((file) => {
      const id = uid();
      q.files.set(id, { src: file });
      return {
        id, seq: q.seq++, kind: isAudioFile(file) ? "audio" : isVideoFile(file) ? "video" : "photo", name: file.name || "",
        status: "preparing", progress: 0, error: null, canRetry: false,
        thumbUrl: null, takenOn: "", text: "", cropPos: null, mediaUrl: null, posterUrl: null,
      };
    });
    if (fresh.length) {
      commit([...q.items, ...fresh]);
      runPrepare();
    }
    return { ids: fresh.map((it) => it.id), overLimit: wanted.length - accepted.length, unsupported: picked.length - wanted.length };
  };

  const removeItem = (id) => {
    const it = q.items.find((x) => x.id === id);
    if (it?.thumbUrl) URL.revokeObjectURL(it.thumbUrl);
    q.files.delete(id);
    commit(q.items.filter((x) => x.id !== id));
  };

  const removeMany = (ids) => ids.forEach(removeItem);

  const updateItem = (id, changes) => patch(id, changes);

  const retry = (id) => {
    const it = q.items.find((x) => x.id === id);
    if (!it || it.status !== "error" || !it.canRetry) return;
    patch(id, { status: "queued", error: null, progress: 0 });
    pump();
  };

  // Resolves once nothing is preparing, queued or uploading.
  const whenIdle = () => new Promise((resolve) => {
    if (!q.items.some(busy)) resolve();
    else q.waiters.push(resolve);
  });

  // The latest items, for code that runs after an await (state from the
  // render that started it would be stale).
  const current = () => q.items;

  return { items, addFiles, removeItem, removeMany, updateItem, retry, whenIdle, current };
}
