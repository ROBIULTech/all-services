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
