import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import cors from "cors";
import axios from "axios";
import dotenv from "dotenv";
import multer from "multer";
import FormData from "form-data";
import nodemailer from "nodemailer";
import { db, collection, query, where, getDocs, doc, getDoc, addDoc, updateDoc, serverTimestamp } from "./src/firebase";

dotenv.config();

// Token cache to avoid repeated requests
const tokenCache: Record<string, { token: string, expiresAt: number }> = {};

async function getAccessToken(serviceName: string, tokenUrl: string, apiKey: string) {
  const cacheKey = `${serviceName}_${apiKey}`;
  const cached = tokenCache[cacheKey];
  
  // If token exists and is not expired (with 5 min buffer)
  if (cached && cached.expiresAt > Date.now() + 300000) {
    return cached.token;
  }

  try {
    console.log(`Fetching new token for ${serviceName} from ${tokenUrl}`);
    const response = await axios.post(tokenUrl, {
      api_key: apiKey,
      // Some providers might use different fields, we can adjust if needed
      username: apiKey.split(':')[0], 
      password: apiKey.split(':')[1]
    }, {
      headers: { 'Content-Type': 'application/json' }
    });

    // Handle different response formats (common ones)
    const token = response.data.token || response.data.access_token || response.data.data?.token;
    const expiresIn = response.data.expires_in || 3600; // Default 1 hour

    if (token) {
      tokenCache[cacheKey] = {
        token,
        expiresAt: Date.now() + (expiresIn * 1000)
      };
      return token;
    }
    return null;
  } catch (error: any) {
    console.error(`Error fetching token for ${serviceName}:`, error.message);
    return null;
  }
}

const uploadsDir = path.join(process.cwd(), "public", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const diskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_\u0980-\u09FF-]/g, '_');
    cb(null, `${Date.now()}_${base}${ext}`);
  }
});

const upload = multer({ storage: multer.memoryStorage() });
const uploadToDisk = multer({ 
  storage: diskStorage,
  limits: { fileSize: 300 * 1024 * 1024 } // 300MB
});

let cachedApp: express.Express | null = null;

export async function getApp() {
  if (cachedApp) return cachedApp;
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  app.use('/uploads', express.static(uploadsDir));

  // API Route for sending SMS
  app.post("/api/send-sms", async (req, res) => {
    const { message, token, adminPhone, isSmsNotifyActive } = req.body;
    
    // Check if SMS is globally active
    if (isSmsNotifyActive === false) {
      return res.status(200).json({ success: false, message: "SMS notification is disabled" });
    }

    // Use provided token or fallback to environment variable
    const API_TOKEN = token || process.env.SMS_GATEWAY_TOKEN;
    const ADMIN_PHONE = adminPhone || process.env.ADMIN_PHONE_NUMBER || "01811152997";

    if (!API_TOKEN || API_TOKEN === 'YOUR_SMS_GATEWAY_TOKEN' || API_TOKEN === '5000') {
      console.log("SMS Gateway Token not provided or is default. SMS notification skipped.");
      return res.status(200).json({ success: false, message: "SMS Gateway not configured" });
    }

    // Support for test/mock token to avoid invalid token errors during development
    
    try {
      // Example implementation for a common Bangladeshi SMS Gateway (e.g., GreenWeb)
      const response = await axios.get("http://api.greenweb.com.bd/api.php", {
        params: {
          token: API_TOKEN,
          to: ADMIN_PHONE,
          message: message
        },
        timeout: 5000 // Add timeout to avoid hanging
      });

      // GreenWeb returns plain text starting with "Error:" on failure
      if (typeof response.data === 'string' && response.data.startsWith('Error')) {
        // Just log it as a debug message rather than an error to avoid cluttering logs
        console.log(`[SMS Gateway] Could not send SMS: ${response.data.trim()}`);
        return res.status(200).json({ success: false, error: response.data });
      }

      console.log("[SMS Gateway] SMS sent successfully");
      res.json({ success: true, data: response.data });
    } catch (error: any) {
      console.log(`[SMS Gateway] Failed to send SMS: ${error.message || 'Unknown error'}`);
      res.status(200).json({ success: false, error: "Failed to send SMS" });
    }
  });

  // API Route for sending Email
  app.post("/api/send-email", async (req, res) => {
    const { to, subject, message, isEmailNotifyActive } = req.body;

    // Check if Email is globally active
    if (isEmailNotifyActive === false) {
      return res.status(200).json({ success: false, message: "Email notification is disabled" });
    }

    const SMTP_USER = process.env.SMTP_USER || "secure.node.admin@gmail.com";
    const SMTP_PASS = process.env.SMTP_PASS;
    const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
    const SMTP_PORT = parseInt(process.env.SMTP_PORT || "465");

    if (!SMTP_PASS) {
      console.log("SMTP Password (SMTP_PASS) not provided. Email notification skipped.");
      return res.status(200).json({ success: false, message: "SMTP not configured" });
    }

    try {
      const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465, // true for 465, false for other ports
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS,
        },
      });

      const info = await transporter.sendMail({
        from: `"All Services Platform" <${SMTP_USER}>`,
        to: to || SMTP_USER, // Fallback to admin if no recipient
        subject: subject || "System Notification",
        text: message,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
            <div style="background: #4f46e5; color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 20px;">System Notification</h1>
            </div>
            <div style="padding: 30px; line-height: 1.6; color: #334155;">
              <p style="margin-top: 0;">${message.replace(/\n/g, '<br>')}</p>
            </div>
            <div style="background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
              &copy; ${new Date().getFullYear()} All Services Platform. All rights reserved.
            </div>
          </div>
        `,
      });

      console.log("[Email Gateway] Email sent successfully:", info.messageId);
      res.json({ success: true, messageId: info.messageId });
    } catch (error: any) {
      console.error(`[Email Gateway] Failed to send Email:`, error);
      res.status(200).json({ success: false, error: "Failed to send Email", details: error.message });
    }
  });

  // Helper to extract Google Drive file ID
  function extractGoogleDriveId(url: string): string | null {
    if (!url) return null;
    const m1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (m1) return m1[1];
    const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (m2) return m2[1];
    const m3 = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (m3) return m3[1];
    return null;
  }

  // Stream Google Drive file or external URL securely without exposing raw URLs
  async function streamExternalResource(url: string, res: express.Response, downloadFilename: string, inline: boolean = false) {
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Type, Content-Length');

    const driveId = extractGoogleDriveId(url);

    if (driveId) {
      if (inline) {
        return res.redirect(`https://drive.google.com/file/d/${driveId}/preview`);
      }

      // Try fetching direct stream from Google usercontent
      const driveUrls = [
        `https://drive.usercontent.google.com/download?id=${driveId}&export=download&authuser=0`,
        `https://drive.google.com/uc?export=download&id=${driveId}&confirm=t`
      ];

      let driveResponse: any = null;
      for (const dUrl of driveUrls) {
        try {
          const resp = await axios.get(dUrl, {
            responseType: 'stream',
            maxRedirects: 10,
            timeout: 30000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': '*/*'
            }
          });
          const cType = resp.headers['content-type'] || '';
          if (!cType.includes('text/html')) {
            driveResponse = resp;
            break;
          }
        } catch (_err) {
          // Try next URL
        }
      }

      if (driveResponse) {
        const streamContentType = driveResponse.headers['content-type'] || 'application/octet-stream';
        let ext = 'pdf';
        if (streamContentType.includes('pdf')) ext = 'pdf';
        else if (streamContentType.includes('jpeg') || streamContentType.includes('jpg')) ext = 'jpg';
        else if (streamContentType.includes('png')) ext = 'png';
        else if (streamContentType.includes('zip')) ext = 'zip';
        else if (downloadFilename.toLowerCase().includes('vector') || downloadFilename.toLowerCase().includes('ai')) ext = 'ai';
        else if (downloadFilename.toLowerCase().includes('zip')) ext = 'zip';

        let finalFilename = downloadFilename.trim();
        if (!finalFilename.includes('.')) {
          finalFilename = `${finalFilename}.${ext}`;
        }
        if (finalFilename.toLowerCase() === 'index' || finalFilename.toLowerCase().startsWith('index.')) {
          finalFilename = finalFilename.replace(/index/i, 'document');
        }

        const asciiSafe = finalFilename.replace(/[^a-zA-Z0-9_.-]/g, '_');
        const dispositionType = inline ? 'inline' : 'attachment';

        res.setHeader('Content-Type', streamContentType);
        res.setHeader('Content-Disposition', `${dispositionType}; filename="${asciiSafe}"; filename*=UTF-8''${encodeURIComponent(finalFilename)}`);
        if (driveResponse.headers['content-length']) {
          res.setHeader('Content-Length', driveResponse.headers['content-length']);
        }
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private, max-age=0');
        return driveResponse.data.pipe(res);
      } else {
        // Fallback: If Google Drive cannot be directly streamed by server, redirect to Google Drive viewer (not raw download endpoint which saves as 'index')
        return res.redirect(`https://drive.google.com/file/d/${driveId}/view`);
      }
    }

    // Base64 Data URL
    if (url.startsWith('data:')) {
      const matches = url.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const contentType = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        let ext = 'pdf';
        if (contentType.includes('jpeg') || contentType.includes('jpg')) ext = 'jpg';
        else if (contentType.includes('png')) ext = 'png';
        else if (contentType.includes('pdf')) ext = 'pdf';

        const finalFilename = downloadFilename.includes('.') ? downloadFilename : `${downloadFilename}.${ext}`;
        const asciiSafe = finalFilename.replace(/[^a-zA-Z0-9_.-]/g, '_');
        const dispositionType = inline ? 'inline' : 'attachment';

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `${dispositionType}; filename="${asciiSafe}"; filename*=UTF-8''${encodeURIComponent(finalFilename)}`);
        res.setHeader('Content-Length', buffer.length);
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private, max-age=0');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        return res.send(buffer);
      }
    }

    // Local Disk File (/uploads/...)
    if (url.startsWith('/uploads/') || url.includes('/uploads/')) {
      const fname = path.basename(url.split('?')[0]);
      const filePath = path.join(uploadsDir, fname);
      if (fs.existsSync(filePath)) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private, max-age=0');
        res.setHeader('Pragma', 'no-cache');
        const ext = path.extname(fname).replace('.', '') || 'pdf';
        const finalFilename = downloadFilename.includes('.') ? downloadFilename : `${downloadFilename}.${ext}`;
        if (inline) {
          return res.sendFile(filePath);
        }
        return res.download(filePath, finalFilename);
      }
    }

    // Any generic external URL (Cloudinary, S3, Firebase Storage, Direct HTTP file)
    try {
      const response = await axios.get(url, {
        responseType: 'stream',
        maxRedirects: 10,
        timeout: 60000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      const streamContentType = response.headers['content-type'] || 'application/octet-stream';
      let ext = 'pdf';
      if (streamContentType.includes('pdf')) ext = 'pdf';
      else if (streamContentType.includes('jpeg') || streamContentType.includes('jpg')) ext = 'jpg';
      else if (streamContentType.includes('png')) ext = 'png';
      else if (streamContentType.includes('zip')) ext = 'zip';
      else {
        const urlExt = path.extname(url.split('?')[0]).replace('.', '');
        if (urlExt && urlExt.length <= 5) ext = urlExt;
      }

      const finalFilename = downloadFilename.includes('.') ? downloadFilename : `${downloadFilename}.${ext}`;
      const asciiSafe = finalFilename.replace(/[^a-zA-Z0-9_.-]/g, '_');
      const dispositionType = inline ? 'inline' : 'attachment';

      res.setHeader('Content-Type', streamContentType);
      res.setHeader('Content-Disposition', `${dispositionType}; filename="${asciiSafe}"; filename*=UTF-8''${encodeURIComponent(finalFilename)}`);
      if (response.headers['content-length']) {
        res.setHeader('Content-Length', response.headers['content-length']);
      }
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      return response.data.pipe(res);
    } catch (_extErr) {
      // If external streaming fails, redirect to direct URL
      return res.redirect(url);
    }
  }

  // Secure File Download Endpoint - One-Time Protected without exposing raw URLs or opening new tabs
  app.get("/api/secure-download/:orderId", async (req, res) => {
    try {
      const { orderId } = req.params;
      const type = (req.query.type as string) || 'auto';
      let targetUrl = (req.query.url as string) || (req.query.targetUrl as string) || '';
      let serviceTitle = (req.query.title as string) || '';

      if (!targetUrl && orderId && orderId !== 'direct') {
        try {
          const orderRef = doc(db, 'orders', orderId);
          const orderSnap = await getDoc(orderRef);

          if (orderSnap.exists()) {
            const orderData = orderSnap.data();
            if (type === 'resultFile') {
              targetUrl = orderData.resultFile || orderData.successLink || '';
            } else if (type === 'successLink') {
              targetUrl = orderData.successLink || orderData.resultFile || '';
            } else {
              targetUrl = orderData.resultFile || orderData.successLink || '';
            }
            if (!serviceTitle) {
              serviceTitle = orderData.serviceTitle || 'result';
            }
          }
        } catch (dbErr: any) {
          console.warn("Firestore lookup skipped in secure-download (quota/offline):", dbErr.message);
        }
      }

      if (!targetUrl) {
        return res.status(404).json({ success: false, message: "ফাইল বা ডাউনলোড লিংক পাওয়া যায়নি।" });
      }

      let cleanTitle = (serviceTitle || 'document').replace(/[^a-zA-Z0-9_\u0980-\u09FF.-]/g, '_');
      if (cleanTitle.toLowerCase().startsWith('index')) {
        cleanTitle = cleanTitle.replace(/^index/i, 'document');
      }

      let filename = cleanTitle;
      if (orderId && orderId !== 'direct') {
        const hasExt = cleanTitle.match(/\.([a-zA-Z0-9]{2,5})$/);
        if (hasExt) {
          const base = cleanTitle.substring(0, cleanTitle.length - hasExt[0].length);
          filename = `${base}_${orderId}.${hasExt[1]}`;
        } else {
          filename = `${cleanTitle}_${orderId}`;
        }
      }

      await streamExternalResource(targetUrl, res, filename, false);
    } catch (error: any) {
      console.error("Secure download error:", error);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: "ফাইল ডাউনলোড সম্পন্ন করা যায়নি: " + (error.message || 'Error') });
      }
    }
  });

  // Secure In-App File Preview Endpoint (Streams inline for iframe / modal viewer)
  app.get("/api/secure-preview/:orderId", async (req, res) => {
    try {
      const { orderId } = req.params;
      const type = (req.query.type as string) || 'auto';
      let targetUrl = (req.query.url as string) || (req.query.targetUrl as string) || '';
      let serviceTitle = (req.query.title as string) || '';

      if (!targetUrl && orderId && orderId !== 'direct') {
        try {
          const orderRef = doc(db, 'orders', orderId);
          const orderSnap = await getDoc(orderRef);

          if (orderSnap.exists()) {
            const orderData = orderSnap.data();
            if (type === 'resultFile') {
              targetUrl = orderData.resultFile || orderData.successLink || '';
            } else if (type === 'successLink') {
              targetUrl = orderData.successLink || orderData.resultFile || '';
            } else {
              targetUrl = orderData.resultFile || orderData.successLink || '';
            }
            if (!serviceTitle) {
              serviceTitle = orderData.serviceTitle || 'preview';
            }

            // Record preview activity safely
            try {
              await updateDoc(orderRef, {
                lastViewedAt: serverTimestamp()
              });
            } catch (_) {}
          }
        } catch (dbErr: any) {
          console.warn("Firestore lookup skipped in secure-preview (quota/offline):", dbErr.message);
        }
      }

      if (!targetUrl) {
        return res.status(404).send("File not found");
      }

      const safeTitle = (serviceTitle || 'preview').replace(/[^a-zA-Z0-9_\u0980-\u09FF-]/g, '_');
      const filename = `${safeTitle}_${orderId}`;

      await streamExternalResource(targetUrl, res, filename, true);
    } catch (error: any) {
      console.error("Secure preview error:", error);
      if (!res.headersSent) {
        res.status(500).send("Preview Error: " + error.message);
      }
    }
  });

  // Auto NID API
  app.post("/api/service/auto-nid", async (req, res) => {
    const { nid, dob, apiKey, isTokenBased, tokenUrl } = req.body;
    if (!nid || !dob) return res.status(400).json({ success: false, error: "NID and DOB are required" });
    if (!apiKey) return res.status(401).json({ success: false, error: "API Key is missing" });
    
    let finalToken = apiKey;
    if (isTokenBased && tokenUrl) {
      const token = await getAccessToken("auto-nid", tokenUrl, apiKey);
      if (token) finalToken = token;
    }

    // In a real scenario, you would call the actual provider here
    // For now, we simulate the logic
    await new Promise(resolve => setTimeout(resolve, 2000));
    res.json({
      success: true,
      data: {
        message: "Auto NID generated successfully via API",
        nid: nid,
        dob: dob,
        pdfUrl: "https://example.com/mock-auto-nid.pdf"
      }
    });
  });

  // Auto Sign Copy API
  app.post("/api/service/auto-sign", async (req, res) => {
    const { nid, apiKey, isTokenBased, tokenUrl } = req.body;
    if (!nid) return res.status(400).json({ success: false, error: "NID is required" });
    if (!apiKey) return res.status(401).json({ success: false, error: "API Key is missing" });
    
    let finalToken = apiKey;
    if (isTokenBased && tokenUrl) {
      const token = await getAccessToken("auto-sign", tokenUrl, apiKey);
      if (token) finalToken = token;
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
    res.json({
      success: true,
      data: {
        message: "Auto Sign Copy generated successfully via API",
        pdfUrl: "https://example.com/mock-sign-copy.pdf",
        nid: nid
      }
    });
  });

  // Info Verification API
  app.post("/api/service/info-verify", async (req, res) => {
    const { category, number, apiKey, isTokenBased, tokenUrl } = req.body;
    if (!number) return res.status(400).json({ success: false, error: "Number is required" });
    if (!apiKey) return res.status(401).json({ success: false, error: "API Key is missing" });
    
    let finalToken = apiKey;
    if (isTokenBased && tokenUrl) {
      const token = await getAccessToken("info-verify", tokenUrl, apiKey);
      if (token) finalToken = token;
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
    res.json({
      success: true,
      data: {
        message: "Information verified successfully via API",
        category: category,
        number: number,
        details: {
          name: "John Doe",
          status: "Verified",
          issuedAt: "2023-01-01"
        }
      }
    });
  });

  // Smart Voter Search API
  app.post("/api/service/smart-voter-search", async (req, res) => {
    const { districtCode, upazilaCode, unionCode, centerCode, searchFields, apiKey, isTokenBased, tokenUrl } = req.body;
    
    if (!apiKey) return res.status(401).json({ success: false, error: "API Key is missing" });
    
    let finalToken = apiKey;
    if (isTokenBased && tokenUrl) {
      console.log("Using token-based auth for Smart Voter Search");
      const token = await getAccessToken("smart-voter-search", tokenUrl, apiKey);
      if (token) finalToken = token;
      else return res.status(401).json({ success: false, error: "Failed to obtain access token" });
    }

    try {
      console.log(`Calling Smart Voter Search API with district: ${districtCode}, upazila: ${upazilaCode}`);
      
      // Replace this URL with the actual provider endpoint
      const providerUrl = process.env.SMART_VOTER_API_URL || 'https://api.provider.com/v1/voter-search';
      
      const response = await axios.post(providerUrl, {
        districtCode,
        upazilaCode,
        unionCode,
        centerCode,
        searchFields
      }, {
        headers: {
          'Authorization': isTokenBased ? `Bearer ${finalToken}` : undefined,
          'X-API-KEY': !isTokenBased ? apiKey : undefined,
          'Content-Type': 'application/json'
        }
      });

      console.log('API Provider Response:', response.data);

      res.json({ success: true, data: response.data });
    } catch (error: any) {
      console.error("Smart Voter Search API Error:", error.response?.data || error.message);
      res.status(500).json({ 
        success: false, 
        error: error.response?.data?.message || "Failed to search voter via API" 
      });
    }
  });

  // NID Verification API
  app.post("/api/verify-nid", async (req, res) => {
    const { nid, dob, useMock, porichoyApiKey } = req.body;

    if (!nid || !dob) {
      return res.status(400).json({ success: false, error: "NID and Date of Birth (dob) are required" });
    }

    // --- APPROACH 1: MOCK API (For Testing) ---
    if (useMock) {
      console.log("Using Mock NID API for:", nid);
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Return fake data if NID is 10 or 17 digits
      if (nid.length === 10 || nid.length === 17) {
        return res.json({
          success: true,
          data: {
            nidNumber: nid,
            pin: "1990" + nid.substring(0, 6) + "XXXX",
            nameEn: "John Doe",
            nameBn: "জন ডোয়",
            fatherName: "Richard Doe",
            motherName: "Jane Doe",
            dob: dob,
            bloodGroup: "O+",
            address: "House 12, Road 5, Block C, Banani, Dhaka",
            photoUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=" + nid // Fake photo
          }
        });
      } else {
        return res.status(404).json({ success: false, error: "NID not found in mock database" });
      }
    }

    // --- APPROACH 2: REAL API INTEGRATION (e.g., Porichoy API) ---
    try {
      const API_KEY = porichoyApiKey || process.env.PORCHOY_API_KEY; // Use provided key or fallback to env
      
      if (!API_KEY) {
        return res.status(500).json({ 
          success: false, 
          error: "Real API key is not configured in Admin Settings. Please use useMock=true for testing." 
        });
      }

      // Using the exact payload structure provided for Porichoy Autofill API
      const response = await axios.post(
        "https://api.porichoybd.com/sandbox-api/v2/verifications/autofill", 
        {
          nidNumber: nid,
          dateOfBirth: dob, // Format usually YYYY-MM-DD
          englishTranslation: true
        },
        {
          headers: {
            "x-api-key": API_KEY,
            "Content-Type": "application/json"
          }
        }
      );

      // Return the real data
      return res.json({
        success: true,
        data: response.data
      });

    } catch (error: any) {
      console.error("Real NID API Error:", error.response?.data || error.message);
      return res.status(500).json({ 
        success: false, 
        error: error.response?.data?.message || "Failed to verify NID with real API" 
      });
    }
  });

  // Image Upload API Demo (enkimaa.com)
  app.post("/api/upload-image", upload.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: "No image file provided" });
      }

      console.log("Received image upload request. File size:", req.file.size);

      const useMock = req.body.useMock === 'true';
      const enkimaaApiKey = req.body.enkimaaApiKey;

      if (useMock) {
        console.log("Using Mock Image Upload API");
        await new Promise(resolve => setTimeout(resolve, 1500));
        return res.json({
          success: true,
          status: 200,
          data: {
            message: "Mock upload successful",
            fileName: req.file.originalname,
            fileSize: req.file.size,
            mockUrl: "https://mock-image-server.com/uploads/" + Date.now() + ".jpg"
          }
        });
      }

      // Create a FormData object to send to the external API
      const formData = new FormData();
      
      // The exact field name depends on the target API. 'ImageFile' or 'file' or 'image'
      // We use 'file' as a common default, but if enkimaa expects 'ImageFile', change it here.
      formData.append("file", req.file.buffer, {
        filename: req.file.originalname || "upload.jpg",
        contentType: req.file.mimetype || "image/jpeg",
      });

      const headers: any = { ...formData.getHeaders() };
      const API_KEY = enkimaaApiKey || process.env.ENKIMAA_API_KEY;
      if (API_KEY) {
        headers["Authorization"] = `Bearer ${API_KEY}`;
      }

      // Vercel-ready safe pattern: Backend calls the external API
      const response = await axios.post(
        "https://nid.enkimaa.com/API/upload/ImageFile",
        formData,
        {
          headers: headers,
          // Don't throw on error status codes so we can inspect the response
          validateStatus: () => true,
        }
      );

      console.log("External API Response Status:", response.status);
      
      // Try to parse response as JSON, fallback to text
      let responseData = response.data;
      if (typeof responseData === 'string') {
        try {
          responseData = JSON.parse(responseData);
        } catch (e) {
          // Keep as string if not valid JSON
        }
      }

      return res.status(response.status).json({
        success: response.status >= 200 && response.status < 300,
        status: response.status,
        data: responseData
      });

    } catch (error: any) {
      console.error("Image Upload API Error:", error.message);
      
      let errorMessage = error.message || "Failed to upload image to external API";
      if (error.code === 'ENOTFOUND') {
        errorMessage = `The domain ${error.hostname} could not be found. The external API is offline, blocked, or no longer exists.`;
      }

      return res.status(500).json({
        success: false,
        error: errorMessage,
        code: error.code
      });
    }
  });

  // API Reselling Forwarding
  app.post("/api/reseller/forward", async (req, res) => {
    const { providerUrl, apiKey, orderData } = req.body;
    
    if (!providerUrl || !apiKey || !orderData) {
      return res.status(400).json({ success: false, error: "Missing required parameters" });
    }

    try {
      console.log(`Forwarding order to ${providerUrl} with serviceId: ${orderData.providerServiceId}`);
      
      console.log('Forwarding order to:', providerUrl, 'with serviceId:', orderData.providerServiceId, 'API Key:', apiKey.substring(0, 5) + '***');
      
      const params = new URLSearchParams();
      params.append('key', apiKey);
      params.append('action', 'add');
      params.append('service', orderData.providerServiceId || '');
      params.append('link', orderData.data || '');
      params.append('quantity', '1');

      const response = await axios.post(providerUrl, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      console.log('API Provider Response:', response.data);

      if (response.data.error) {
        return res.json({ success: false, error: response.data.error });
      }

      res.json({ success: true, data: response.data });
    } catch (error: any) {
      console.error("API Reselling Error Details:", error.response?.data || error.message);
      res.status(200).json({ 
        success: false, 
        error: error.response?.data || error.message || "Failed to forward order to provider" 
      });
    }
  });

  // Local Disk File Upload Route (Supports up to 300MB: PDF, Images, Word, Excel, ZIP, etc.)
  app.post("/api/upload", (req, res) => {
    uploadToDisk.single('file')(req, res, (err) => {
      if (err) {
        console.error("[Upload API] Multer error:", err);
        return res.status(400).json({ 
          success: false, 
          error: `ফাইল আপলোড ত্রুটি: ${err.message || 'Invalid upload'}` 
        });
      }

      if (!req.file) {
        return res.status(400).json({ success: false, error: "কোন ফাইল পাওয়া যায়নি" });
      }

      const fileUrl = `/uploads/${req.file.filename}`;
      console.log(`[Upload API] Saved file: ${fileUrl} (${(req.file.size / (1024 * 1024)).toFixed(2)} MB)`);
      
      return res.json({ 
        success: true, 
        url: fileUrl, 
        filename: req.file.originalname, 
        size: req.file.size,
        mimetype: req.file.mimetype 
      });
    });
  });

  // Base64 direct upload route (Fallback for environments where multipart proxying has issues)
  app.post("/api/upload-base64", (req, res) => {
    try {
      const { base64, filename } = req.body;
      if (!base64 || typeof base64 !== 'string') {
        return res.status(400).json({ success: false, error: "base64 ডেটা পাওয়া যায়নি" });
      }

      // Extract format and data
      const matches = base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      let buffer: Buffer;
      let ext = '.png';
      
      if (matches && matches.length === 3) {
        const mime = matches[1];
        buffer = Buffer.from(matches[2], 'base64');
        if (mime.includes('pdf')) ext = '.pdf';
        else if (mime.includes('jpeg') || mime.includes('jpg')) ext = '.jpg';
        else if (mime.includes('png')) ext = '.png';
        else if (mime.includes('webp')) ext = '.webp';
        else if (mime.includes('word') || mime.includes('docx')) ext = '.docx';
        else if (mime.includes('excel') || mime.includes('xlsx')) ext = '.xlsx';
        else if (mime.includes('zip')) ext = '.zip';
        else ext = '.' + (mime.split('/')[1] || 'bin');
      } else {
        buffer = Buffer.from(base64, 'base64');
      }

      const originalName = filename ? path.basename(filename) : `file_${Date.now()}${ext}`;
      const safeBase = originalName.replace(/[^a-zA-Z0-9_\u0980-\u09FF.-]/g, '_');
      const savedFileName = `${Date.now()}_${safeBase}`;
      const filePath = path.join(uploadsDir, savedFileName);

      fs.writeFileSync(filePath, buffer);
      const fileUrl = `/uploads/${savedFileName}`;
      console.log(`[Upload API] Saved base64 file to disk: ${fileUrl} (${(buffer.length / (1024 * 1024)).toFixed(2)} MB)`);

      return res.json({
        success: true,
        url: fileUrl,
        filename: originalName,
        size: buffer.length
      });
    } catch (error: any) {
      console.error("[Upload Base64] Error:", error);
      res.status(500).json({ success: false, error: error.message || "Failed to save base64 file" });
    }
  });

  // Reseller API - Place Order
  app.post("/api/v1/order", async (req, res) => {
    const apiKey = req.headers['x-api-key'];
    const { serviceId, data } = req.body;

    if (!apiKey) return res.status(401).json({ success: false, error: "API Key is required" });
    if (!serviceId || !data) return res.status(400).json({ success: false, error: "serviceId and data are required" });

    try {
      // Find user by API Key
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('apiKey', '==', apiKey));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return res.status(401).json({ success: false, error: "Invalid API Key" });
      }

      const userDoc = querySnapshot.docs[0];
      const userProfile = userDoc.data();

      if (userProfile.isBlocked) {
        return res.status(403).json({ success: false, error: "User is blocked" });
      }

      if (userProfile.isApiEnabled === false) {
        return res.status(403).json({ success: false, error: "API access is disabled for this user" });
      }

      // Find service
      const productRef = doc(db, 'products', serviceId.toString());
      const productSnap = await getDoc(productRef);

      if (!productSnap.exists()) {
        return res.status(404).json({ success: false, error: "Service not found" });
      }

      const product = productSnap.data();
      
      // Calculate price
      const price = product.price;

      if (userProfile.balance < price) {
        return res.status(400).json({ success: false, error: "Insufficient balance" });
      }

      // Place order
      const newOrder = {
        uid: userProfile.uid,
        userEmail: userProfile.email,
        serviceId: product.id,
        serviceTitle: product.titleBn,
        status: 'pending',
        data: data,
        price: price,
        createdAt: serverTimestamp()
      };

      const orderRef = await addDoc(collection(db, 'orders'), newOrder);

      // Deduct balance
      await updateDoc(userDoc.ref, {
        balance: userProfile.balance - price
      });

      res.json({ 
        success: true, 
        orderId: orderRef.id,
        message: "Order placed successfully" 
      });

    } catch (error: any) {
      console.error("Reseller API Error:", error.message);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  });

  // Reseller API - Check Balance
  app.get("/api/v1/balance", async (req, res) => {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) return res.status(401).json({ success: false, error: "API Key is required" });

    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('apiKey', '==', apiKey));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return res.status(401).json({ success: false, error: "Invalid API Key" });
      }

      const userProfile = querySnapshot.docs[0].data();

      if (userProfile.isBlocked) {
        return res.status(403).json({ success: false, error: "User is blocked" });
      }

      if (userProfile.isApiEnabled === false) {
        return res.status(403).json({ success: false, error: "API access is disabled for this user" });
      }

      res.json({ 
        success: true, 
        balance: userProfile.balance,
        currency: "BDT"
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  cachedApp = app;
  return app;
}

async function startServer() {
  const app = await getApp();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}
