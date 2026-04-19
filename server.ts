import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import axios from "axios";
import dotenv from "dotenv";
import multer from "multer";
import FormData from "form-data";
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

const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

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
    if (API_TOKEN === 'X9k@Secure2004') {
      console.log("[SMS Gateway] Test mode active for token X9k@Secure2004. Simulation successful.");
      return res.json({ success: true, message: "Simulation successful", isMock: true });
    }

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

  // Secure Link Redirect API (5 minutes expiry)
  app.get("/api/secure-link/:orderId", async (req, res) => {
    try {
      const { orderId } = req.params;
      const orderRef = doc(db, 'orders', orderId);
      const orderSnap = await getDoc(orderRef);

      if (!orderSnap.exists()) {
        return res.status(404).send("Order not found");
      }

      const orderData = orderSnap.data();
      const createdAt = orderData.createdAt?.toMillis() || 0;
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;

      // Check if 5 minutes have passed since order creation
      if (now - createdAt > fiveMinutes) {
        return res.status(403).send(`
          <html>
            <head><title>Link Expired</title></head>
            <body style="font-family: sans-serif; text-align: center; padding: 50px; background: #f8fafc;">
              <h1 style="color: #ef4444;">Link Expired</h1>
              <p style="color: #64748b;">This download link has expired. It was only valid for 5 minutes after purchase.</p>
            </body>
          </html>
        `);
      }

      // Find the link to redirect to
      // It could be in the order data directly if we saved it there, or we can just redirect to the URL passed in query
      const targetUrl = req.query.url as string;
      if (!targetUrl) {
        return res.status(400).send("Target URL missing");
      }

      res.redirect(targetUrl);
    } catch (error) {
      console.error("Secure link error:", error);
      res.status(500).send("Internal Server Error");
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
        error: error.response?.data?.message || error.message || "Failed to forward order to provider" 
      });
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
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
