// Browser-side helpers so uploads stay small and the AI can "watch" videos.

const canvasToFile = (canvas, name, quality = 0.85) => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => (blob ? resolve(new File([blob], name, { type: 'image/jpeg' })) : reject(new Error('Could not process the image'))), 'image/jpeg', quality);
});

// Shrink big photos/screenshots (max 1568px on the longest side) and convert to JPEG.
export async function shrinkImage(file, maxDim = 1568) {
  if (file.type === 'image/gif') return file; // keep animated gifs as they are
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => reject(new Error(`Could not read image "${file.name}"`));
      im.src = url;
    });
    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const base = file.name.replace(/\.[^.]+$/, '') || 'image';
    return await canvasToFile(canvas, `${base}.jpg`);
  } finally { URL.revokeObjectURL(url); }
}

// Take evenly spaced still frames from a video (audio is not analyzed).
export async function extractVideoFrames(file, count = 4, maxDim = 1024) {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement('video');
    video.muted = true; video.preload = 'auto'; video.playsInline = true; video.src = url;
    await new Promise((resolve, reject) => {
      video.onloadedmetadata = resolve;
      video.onerror = () => reject(new Error(`Could not read video "${file.name}". Try an MP4 or WebM file.`));
      setTimeout(() => reject(new Error('The video took too long to load')), 20000);
    });
    const duration = isFinite(video.duration) && video.duration > 0 ? video.duration : 1;
    const scale = Math.min(1, maxDim / Math.max(video.videoWidth || maxDim, video.videoHeight || maxDim));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round((video.videoWidth || 640) * scale));
    canvas.height = Math.max(1, Math.round((video.videoHeight || 360) * scale));
    const ctx = canvas.getContext('2d');
    const frames = [];
    const base = file.name.replace(/\.[^.]+$/, '') || 'video';
    for (let i = 1; i <= count; i++) {
      await new Promise((resolve, reject) => {
        video.onseeked = resolve;
        video.onerror = () => reject(new Error('Could not read a frame from the video'));
        video.currentTime = Math.min(duration - 0.05, (duration * i) / (count + 1));
      });
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      frames.push(await canvasToFile(canvas, `${base}-frame${i}.jpg`));
    }
    return frames;
  } finally { URL.revokeObjectURL(url); }
}

export const humanSize = (b) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
