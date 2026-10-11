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

export async function downloadFile(url: string, filename: string) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error('Download failed:', error);
    // Fallback: Open in new window if fetch fails
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.click();
  }
}
