/**
 * Safe photo types the picker and uploader allow. Some Android browsers treat
 * `image/*` as JPEG-only, so PNG/WebP/GIF must be listed by MIME and extension.
 */
export const ACCEPT_SAFE_IMAGES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "image/avif",
  "image/bmp",
  "image/tiff",
  ".jpg",
  ".jpeg",
  ".jfif",
  ".png",
  ".webp",
  ".gif",
  ".heic",
  ".heif",
  ".avif",
  ".bmp",
  ".tif",
  ".tiff",
].join(",");

export const SAFE_IMAGE_NAME = /\.(jpe?g|jfif|png|webp|gif|heic|heif|avif|bmp|tiff?)$/i;
