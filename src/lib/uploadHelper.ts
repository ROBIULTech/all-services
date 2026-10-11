import axios from 'axios';
import { compressImageAsBase64 } from './utils';

export type UploadProgressCallback = (percent: number, statusText: string) => void;

/**
 * Converts any File (PDF, Image, Docx, etc.) to Base64 data URL
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads any file (Image, PDF, Word, Excel, ZIP, etc. up to 300MB) to /api/upload
 * with multi-tier fail-safe resilience (Multipart -> Base64 API -> In-memory DataURL).
 */
export async function uploadFile(
  file: File,
  onProgress?: UploadProgressCallback
): Promise<string> {
  if (onProgress) {
    onProgress(5, 'ফাইল প্রস্তুত করা হচ্ছে...');
  }

  // 1. First Attempt: Standard Multipart Upload via FormData
  // NOTE: Never manually set 'Content-Type': 'multipart/form-data' because it strips the boundary parameter!
  try {
    const formData = new FormData();
    formData.append('file', file, file.name);

    const response = await axios.post('/api/upload', formData, {
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percent = Math.min(95, Math.round((progressEvent.loaded * 100) / progressEvent.total));
          const loadedMb = (progressEvent.loaded / (1024 * 1024)).toFixed(1);
          const totalMb = (progressEvent.total / (1024 * 1024)).toFixed(1);
          onProgress(percent, `আপলোড হচ্ছে... ${percent}% (${loadedMb}MB / ${totalMb}MB)`);
        }
      },
      timeout: 180000, // 3 minutes timeout
    });

    if (response.data && response.data.success && response.data.url) {
      if (onProgress) {
        onProgress(100, 'ফাইল আপলোড সফল!');
      }
      return response.data.url;
    }
  } catch (err: any) {
    console.warn('[uploadFile] Multipart upload failed, attempting fallback...', err.message || err);
  }

  // 2. Second Attempt: If file <= 15MB, try /api/upload-base64
  if (file.size <= 15 * 1024 * 1024) {
    try {
      if (onProgress) {
        onProgress(60, 'সার্ভারে বিকল্প পদ্ধতিতে সংরক্ষণ করা হচ্ছে...');
      }
      const dataUrl = file.type.startsWith('image/')
        ? await compressImageAsBase64(file, 1200)
        : await fileToBase64(file);

      const b64Res = await axios.post('/api/upload-base64', {
        base64: dataUrl,
        filename: file.name
      }, {
        timeout: 60000
      });

      if (b64Res.data && b64Res.data.success && b64Res.data.url) {
        if (onProgress) {
          onProgress(100, 'ফাইল আপলোড সফল!');
        }
        return b64Res.data.url;
      }
    } catch (b64Err: any) {
      console.warn('[uploadFile] /api/upload-base64 failed:', b64Err.message || b64Err);
    }
  }

  // 3. Third Attempt: Direct Data URL for images or documents <= 2MB so order NEVER fails
  if (file.size <= 2 * 1024 * 1024 || file.type.startsWith('image/')) {
    try {
      if (onProgress) {
        onProgress(85, 'ফাইল ডেটা তৈরি করা হচ্ছে...');
      }
      const directBase64 = file.type.startsWith('image/')
        ? await compressImageAsBase64(file, 800)
        : await fileToBase64(file);

      if (onProgress) {
        onProgress(100, 'ফাইল সংরক্ষণ সম্পন্ন!');
      }
      return directBase64;
    } catch (directErr) {
      console.error('[uploadFile] Direct DataURL conversion failed:', directErr);
    }
  }

  throw new Error('ফাইল আপলোড ব্যর্থ হয়েছে। দয়া করে ফাইলের সাইজ চেক করুন অথবা আবার চেষ্টা করুন।');
}
