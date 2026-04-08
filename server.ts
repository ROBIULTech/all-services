import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

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
      res.json({ success: true, data: response.data });
    } catch (error) {
      console.error("Error sending SMS:", error);
      res.status(500).json({ success: false, error: "Failed to send SMS" });
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
