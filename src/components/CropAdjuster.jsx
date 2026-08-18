import { useState, useEffect, useRef } from "react";

export const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

// object-fit: cover's rendered size for a natural image inside a box —
// used to convert a pixel drag distance into an object-position percentage.
export function coverSize({ w, h }, boxW, boxH) {
  const scale = Math.max(boxW / w, boxH / h);
  return { w: w * scale, h: h * scale };
}

// Smart default crop anchor for a freshly-selected photo, run at upload
// time (before the file is even uploaded). Tries the browser's built-in
// Shape Detection API where it exists — support is spotty (mainly older
// Android Chrome; Safari and Firefox never implemented it, and it's not a
// dependency worth adding a real face-detection library for) — and falls
// back to a plain center crop everywhere else, silently, never blocking
// the upload.
export async function detectCropPosition(file) {
  try {
    if (!("FaceDetector" in window)) return { x: 50, y: 50 };
    const bitmap = await createImageBitmap(file);
    const detector = new window.FaceDetector({ maxDetectedFaces: 5, fastMode: true });
    const faces = await detector.detect(bitmap);
    if (!faces?.length) return { x: 50, y: 50 };
    const largest = faces.reduce((a, b) =>
      a.boundingBox.width * a.boundingBox.height >= b.boundingBox.width * b.boundingBox.height ? a : b
    );
    const { x, y, width, height } = largest.boundingBox;
    return {
      x: clamp(((x + width / 2) / bitmap.width) * 100, 10, 90),
      y: clamp(((y + height / 2) / bitmap.height) * 100, 10, 90),
    };
  } catch {
    return { x: 50, y: 50 }; // detection failing is never a reason to block the upload
  }
}

// Manual crop reposition — drag the full photo behind a fixed window (no
// zoom/rotate, matching a Facebook/LinkedIn profile-photo repositioner).
// Renders the same object-fit: cover + object-position the final image
// uses, so what's shown while dragging is exactly what gets saved — the
// drag math just needs to convert a pixel offset into the object-position
// percentage that would produce that same view.
//
// aspectRatio defaults to 1 (the original per-memory-photo square use).
// Pass secondaryAspectRatio/secondaryLabel to also show a small read-only
// live preview at a different shape — the header photo's banner isn't a
// fixed aspect ratio (it's a fluid clamp() that runs wider on desktop than
// mobile), so a single crop position can frame differently at each
// extreme; the secondary preview lets whoever's cropping catch that before
// saving, without doubling the stored data into two separate positions.
// Pass exactly one of `file` (a freshly-selected File, not uploaded yet —
// the original per-memory-photo and fresh-header-photo case) or `imageUrl`
// (an already-uploaded photo's URL — repositioning a header photo that's
// already live, with no new file involved).
export function CropAdjuster({
  file,
  imageUrl,
  initialPos,
  aspectRatio = 1,
  wide = false,
  title = "Reposition photo",
  subtitle = "Drag to choose what shows in the square.",
  secondaryAspectRatio,
  secondaryLabel,
  onCancel,
  onConfirm,
}) {
  const [pos, setPos] = useState(initialPos);
  const [naturalSize, setNaturalSize] = useState(null);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef(null);
  const [imgUrl, setImgUrl] = useState(file ? null : imageUrl);
  const windowRef = useRef(null);
  const [boxSize, setBoxSize] = useState({ w: 300, h: 300 / aspectRatio });

  // Create and revoke the object URL in the same effect (keyed to `file`,
  // not a lazily-initialized ref) — StrictMode double-invokes effects in
  // dev (mount, cleanup, mount again), and a ref-cached "create once" URL
  // would get revoked by the first synthetic cleanup and never recreated.
  // No-ops when working from an already-uploaded imageUrl instead.
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImgUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Measures the crop window's actual rendered size rather than assuming a
  // fixed pixel value — needed now that aspectRatio/card width vary by
  // caller, and more accurate than the old hardcoded guess even for the
  // original square case.
  useEffect(() => {
    const measure = () => {
      const el = windowRef.current;
      if (el) setBoxSize({ w: el.clientWidth, h: el.clientHeight });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [aspectRatio]);

  const rendered = naturalSize ? coverSize(naturalSize, boxSize.w, boxSize.h) : null;
  const overflowX = rendered ? Math.max(0, rendered.w - boxSize.w) : 0;
  const overflowY = rendered ? Math.max(0, rendered.h - boxSize.h) : 0;

  const beginDrag = (clientX, clientY) => {
    dragStart.current = { x: clientX, y: clientY, posX: pos.x, posY: pos.y };
    setDragging(true);
  };
  const onMouseDown = (e) => beginDrag(e.clientX, e.clientY);
  const onTouchStart = (e) => beginDrag(e.touches[0].clientX, e.touches[0].clientY);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => {
      const point = e.touches ? e.touches[0] : e;
      if (e.touches) e.preventDefault(); // don't let the page scroll while repositioning
      const dx = point.clientX - dragStart.current.x;
      const dy = point.clientY - dragStart.current.y;
      // Dragging the photo right reveals more of its left side, i.e. the
      // object-position anchor moves the opposite direction of the drag.
      setPos({
        x: overflowX ? clamp(dragStart.current.posX - (dx / overflowX) * 100, 0, 100) : 50,
        y: overflowY ? clamp(dragStart.current.posY - (dy / overflowY) * 100, 0, 100) : 50,
      });
    };
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [dragging, overflowX, overflowY]);

  return (
    <div className="crop-adjust-overlay fade-in" role="dialog" aria-label="Adjust photo crop">
      <div className={`crop-adjust-card${wide ? " crop-adjust-card-wide" : ""}`}>
        <h3 className="crop-adjust-title">{title}</h3>
        <p className="crop-adjust-sub">{subtitle}</p>
        <div
          ref={windowRef}
          className="crop-adjust-window"
          style={{ aspectRatio }}
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
        >
          {imgUrl && (
            <img
              src={imgUrl}
              alt=""
              className="crop-adjust-img"
              draggable={false}
              onLoad={(e) => setNaturalSize({ w: e.target.naturalWidth, h: e.target.naturalHeight })}
              style={{ objectPosition: `${pos.x}% ${pos.y}%` }}
            />
          )}
        </div>

        {secondaryAspectRatio && imgUrl && (
          <div className="crop-adjust-secondary">
            <span className="crop-adjust-secondary-label">{secondaryLabel}</span>
            <div className="crop-adjust-secondary-window" style={{ aspectRatio: secondaryAspectRatio }}>
              <img
                src={imgUrl}
                alt=""
                className="crop-adjust-img"
                draggable={false}
                style={{ objectPosition: `${pos.x}% ${pos.y}%` }}
              />
            </div>
          </div>
        )}

        <div className="crop-adjust-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button type="button" className="btn btn-rust" onClick={() => onConfirm(pos)}>Save position</button>
        </div>
      </div>
    </div>
  );
}
