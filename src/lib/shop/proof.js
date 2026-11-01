// Gets the buyer's InstaPay screenshot small enough to send: phone screenshots
// can be several MB, and a function request is capped at about 4.5 MB.
export const MAX_SIDE = 1600;
export const TARGET_BYTES = 1_800_000;
export const ACCEPT = ["image/jpeg", "image/png", "image/webp"];

/** The size an image shrinks to so its longer side is at most `max` (never enlarged). */
export function fitSize(w, h, max = MAX_SIDE) {
  const scale = Math.min(1, max / Math.max(w, h));
  return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) };
}

const toBase64 = (blob) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result).replace(/^data:[^,]*,/, ""));
  r.onerror = () => reject(r.error);
  r.readAsDataURL(blob);
});

/**
 * The screenshot as base64 JPEG (re-drawn on a canvas, which also strips its
 * metadata). Falls back to the original file when the browser can't decode it
 * and the file is already small. Throws { code: "proof_too_big" | "bad_proof" }.
 */
export async function prepareProof(file) {
  if (!file || !ACCEPT.includes(file.type)) throw { code: "bad_proof" };
  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = fitSize(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    canvas.getContext("2d").drawImage(bitmap, 0, 0, width, height);
    for (const q of [0.85, 0.7, 0.55]) {
      const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", q));
      if (blob && blob.size <= TARGET_BYTES) return await toBase64(blob);
    }
    throw { code: "proof_too_big" };
  } catch (err) {
    if (err?.code) throw err;
    if (file.size <= TARGET_BYTES) return toBase64(file);
    throw { code: "proof_too_big" };
  }
}
