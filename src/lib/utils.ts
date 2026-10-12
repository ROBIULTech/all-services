import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function compressImageAsBase64(file: File, maxSizeKb: number = 700): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      // If it's not an image, convert to base64 directly
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const sizeKb = (result.length * 3) / 4 / 1024;
        if (sizeKb > maxSizeKb * 1.5) {
          // If slightly large but under 1.5MB, resolve anyway or alert
          resolve(result);
        } else {
          resolve(result);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        let quality = 0.85;
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        
        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round(height * (MAX_WIDTH / width));
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round(width * (MAX_HEIGHT / height));
            height = MAX_HEIGHT;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Use JPEG for lossy compression if PNG is too large or for regular images
        let format = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        let result = canvas.toDataURL(format, quality);
        let sizeKb = (result.length * 3) / 4 / 1024;

        if (sizeKb > maxSizeKb) {
          // Switch to JPEG which supports progressive quality compression
          format = 'image/jpeg';
          while (sizeKb > maxSizeKb && quality > 0.2) {
            quality -= 0.15;
            result = canvas.toDataURL(format, quality);
            sizeKb = (result.length * 3) / 4 / 1024;
          }
        }
        
        // If still large, scale down dimensions
        if (sizeKb > maxSizeKb && (canvas.width > 600 || canvas.height > 600)) {
          const smallCanvas = document.createElement('canvas');
          smallCanvas.width = Math.round(canvas.width * 0.6);
          smallCanvas.height = Math.round(canvas.height * 0.6);
          const sCtx = smallCanvas.getContext('2d');
          sCtx?.drawImage(canvas, 0, 0, smallCanvas.width, smallCanvas.height);
          result = smallCanvas.toDataURL('image/jpeg', 0.65);
        }
        
        resolve(result);
      };
      img.onerror = () => {
        const fallbackReader = new FileReader();
        fallbackReader.onload = () => resolve(fallbackReader.result as string);
        fallbackReader.onerror = reject;
        fallbackReader.readAsDataURL(file);
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function getExtensionFromUrl(url: string): string {
  if (url.startsWith('data:')) {
    const mime = url.match(/data:([^;]+);/)?.[1];
    return mime ? getExtensionFromMime(mime) : 'file';
  }
  return url.split('.').pop()?.split('?')[0] || 'file';
}

export function getExtensionFromMime(mime: string): string {
  if (mime.includes('image/png')) return 'png';
  if (mime.includes('image/jpeg')) return 'jpg';
  if (mime.includes('image/webp')) return 'webp';
  if (mime.includes('application/pdf')) return 'pdf';
  if (mime.includes('spreadsheetml')) return 'xlsx';
  if (mime.includes('wordprocessingml')) return 'docx';
  if (mime.includes('excel')) return 'xls';
  if (mime.includes('word')) return 'doc';
  if (mime.includes('zip') || mime.includes('compressed')) return 'zip';
  if (mime.includes('text/plain')) return 'txt';
  return 'file';
}

export function extractGoogleDriveId(url: string): string | null {
  if (!url) return null;
  const m1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m1) return m1[1];
  const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m2) return m2[1];
  const m3 = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (m3) return m3[1];
  return null;
}

export function getGoogleDriveDirectDownloadUrl(url: string): string {
  const driveId = extractGoogleDriveId(url);
  if (!driveId) return url;
  return `https://drive.usercontent.google.com/download?id=${driveId}&export=download&authuser=0`;
}

export function downloadBase64(dataUrl: string, filename: string): void {
  try {
    const parts = dataUrl.split(',');
    const mimeMatch = parts[0]?.match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    const binaryStr = atob(parts[1] || '');
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: mime });
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 10000);
  } catch (err) {
    console.error('Failed to download base64:', err);
    window.open(dataUrl, '_blank');
  }
}

export async function downloadFile(url: string, filename: string) {
  if (!url) return;

  // 1. Base64 Data URL handling
  if (url.startsWith('data:')) {
    downloadBase64(url, filename);
    return;
  }

  // Ensure clean filename with valid extension
  let cleanName = filename ? filename.trim() : 'document';
  if (!cleanName.includes('.')) {
    const ext = getExtensionFromUrl(url);
    cleanName = `${cleanName}.${ext}`;
  }
  if (cleanName.toLowerCase() === 'index' || cleanName.toLowerCase().startsWith('index.')) {
    cleanName = cleanName.replace(/index/i, 'document');
  }

  // 2. Route all Google Drive & external URLs through our secure proxy
  // This guarantees Content-Disposition header with filename and prevents Chrome from saving 'index'
  const targetProxyUrl = `/api/secure-download/direct?url=${encodeURIComponent(url)}&title=${encodeURIComponent(cleanName)}`;

  try {
    const response = await fetch(targetProxyUrl);
    if (response.ok) {
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html')) {
        const disposition = response.headers.get('content-disposition');
        let downloadName = cleanName;
        if (disposition && disposition.includes('filename=')) {
          const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
          if (match && match[1]) {
            const parsed = decodeURIComponent(match[1].replace(/['"]/g, ''));
            if (parsed && !parsed.toLowerCase().startsWith('index')) {
              downloadName = parsed;
            }
          }
        }

        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = downloadName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => window.URL.revokeObjectURL(blobUrl), 10000);
        return;
      }
    }
  } catch (err) {
    console.warn('Proxy streaming encountered an error, falling back to direct anchor:', err);
  }

  // Fallback: Trigger native browser download directly via same-origin proxy
  const link = document.createElement('a');
  link.href = targetProxyUrl;
  link.setAttribute('download', cleanName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
