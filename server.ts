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

const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API Route for sending SMS
  app.post("/api/send-sms", async (req, res) => {
    const { message, token, adminPhone } = req.body;
    
    // Use provided token or fallback to environment variable
    const API_TOKEN = token || process.env.SMS_GATEWAY_TOKEN;
    const ADMIN_PHONE = adminPhone || process.env.ADMIN_PHONE_NUMBER || "01811152997";

    if (!API_TOKEN) {
      console.warn("SMS Gateway Token not provided. SMS notification skipped.");
      return res.status(200).json({ success: false, message: "SMS Gateway not configured" });
    }

    try {
      // Example implementation for a common Bangladeshi SMS Gateway (e.g., GreenWeb)
      // You can change this URL and parameters based on your provider
      const response = await axios.get("http://api.greenweb.com.bd/api.php", {
        params: {
          token: API_TOKEN,
          to: ADMIN_PHONE,
          message: message
        }
      });

      console.log("SMS Gateway Response:", response.data);
      
      // GreenWeb returns plain text starting with "Error:" on failure
      if (typeof response.data === 'string' && response.data.startsWith('Error')) {
        console.warn("SMS Gateway Warning:", response.data);
        return res.status(200).json({ success: false, error: response.data });
      }

      res.json({ success: true, data: response.data });
    } catch (error: any) {
      console.error("Error sending SMS:", error.message || error);
      res.status(200).json({ success: false, error: "Failed to send SMS" });
    }
  });

  // Auto NID API (Mock)
  app.post("/api/service/auto-nid", async (req, res) => {
    const { nid, dob, apiKey } = req.body;
    if (!nid || !dob) return res.status(400).json({ success: false, error: "NID and DOB are required" });
    if (!apiKey) return res.status(401).json({ success: false, error: "API Key is missing" });
    
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

  // Auto Sign Copy API (Mock)
  app.post("/api/service/auto-sign", async (req, res) => {
    const { nid, apiKey } = req.body;
    if (!nid) return res.status(400).json({ success: false, error: "NID is required" });
    if (!apiKey) return res.status(401).json({ success: false, error: "API Key is missing" });
    
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

  // Info Verification API (Mock)
  app.post("/api/service/info-verify", async (req, res) => {
    const { category, number, apiKey } = req.body;
    if (!number) return res.status(400).json({ success: false, error: "Number is required" });
    if (!apiKey) return res.status(401).json({ success: false, error: "API Key is missing" });
    
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

  // Server Copy API (Mock)
  app.post("/api/service/server-copy", async (req, res) => {
    const { nid, dob, apiKey } = req.body;
    if (!nid || !dob) return res.status(400).json({ success: false, error: "NID and DOB are required" });
    if (!apiKey) return res.status(401).json({ success: false, error: "API Key is missing" });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    res.json({
      success: true,
      data: {
        message: "Server copy extracted successfully via API",
        nid: nid,
        dob: dob,
        photoUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=" + nid,
        documentUrl: "https://example.com/mock-server-copy.pdf"
      }
    });
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

  // Generic API Reselling Proxy
  app.post("/api/reseller/forward", async (req, res) => {
    const { providerUrl, apiKey, orderData } = req.body;
    
    if (!providerUrl || !apiKey || !orderData) {
      return res.status(400).json({ success: false, error: "Missing required parameters" });
    }

    try {
      // Forward the order to the external provider
      // This is a generic implementation, might need adjustment based on provider's API
      const response = await axios.post(providerUrl, orderData, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      res.json({ success: true, data: response.data });
    } catch (error: any) {
      console.error("API Reselling Error:", error.response?.data || error.message);
      res.status(200).json({ 
        success: false, 
        error: error.response?.data?.message || "Failed to forward order to provider" 
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
