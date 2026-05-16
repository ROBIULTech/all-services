import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function compressImageAsBase64(file: File, maxSizeKb: number = 700): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      // If it's not an image, just convert to base64 directly but check size
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const sizeKb = (result.length * 3) / 4 / 1024;
        if (sizeKb > maxSizeKb) {
          reject(new Error(`ফাইল সাইজ অনেক বড় (${Math.round(sizeKb)}KB)। দয়া করে ${maxSizeKb}KB এর নিচের ফাইল দিন।`));
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
        
        let quality = 0.9;
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        
        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        const tryCompress = (q: number): string => {
           return canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', q);
        };

        let result = tryCompress(quality);
        let sizeKb = (result.length * 3) / 4 / 1024;

        if (file.type !== 'image/png') {
            while (sizeKb > maxSizeKb && quality > 0.1) {
              quality -= 0.1;
              result = tryCompress(quality);
              sizeKb = (result.length * 3) / 4 / 1024;
            }
        }
        
        if (sizeKb > maxSizeKb) {
          reject(new Error(`File is too large (${Math.round(sizeKb)}KB). Please upload a smaller file under ${maxSizeKb}KB.`));
        } else {
          resolve(result);
        }
      };
      img.onerror = reject;
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
