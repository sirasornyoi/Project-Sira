import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const DB_FILE = path.join(process.cwd(), "db.json");

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for parsing JSON and URL encoded forms with 50mb limit for attachments
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // API Route: Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // API Route: Load Database
  app.get("/api/db", (req, res) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    const backupFile = path.join(process.cwd(), "db.json.bak");
    try {
      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, "utf-8");
        if (fileContent.trim()) {
          try {
            return res.json(JSON.parse(fileContent));
          } catch (parseErr) {
            console.warn("db.json was invalid JSON, trying backup:", parseErr);
            if (fs.existsSync(backupFile)) {
              const bakContent = fs.readFileSync(backupFile, "utf-8");
              return res.json(JSON.parse(bakContent));
            }
          }
        }
        return res.json({});
      } else if (fs.existsSync(backupFile)) {
        const bakContent = fs.readFileSync(backupFile, "utf-8");
        return res.json(JSON.parse(bakContent));
      } else {
        return res.json({});
      }
    } catch (error) {
      console.error("Error reading db.json:", error);
      return res.status(500).json({ success: false, message: "Failed to read database file on server." });
    }
  });

  // API Route: Save Database (Atomic write with automatic backup)
  app.post("/api/db", (req, res) => {
    const tmpFile = `${DB_FILE}.tmp`;
    const backupFile = path.join(process.cwd(), "db.json.bak");

    try {
      const data = req.body;
      if (!data || typeof data !== "object" || Array.isArray(data)) {
        return res.status(400).json({
          success: false,
          message: "Invalid payload: req.body must be a valid JSON object."
        });
      }

      // 1. Write atomically to temporary file first
      fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), "utf-8");

      // 2. Backup existing database if it exists
      if (fs.existsSync(DB_FILE)) {
        fs.copyFileSync(DB_FILE, backupFile);
      }

      // 3. Atomically replace db.json with the temporary file
      fs.renameSync(tmpFile, DB_FILE);

      return res.json({ success: true, message: "Database saved successfully." });
    } catch (error) {
      console.error("Error writing db.json:", error);
      if (fs.existsSync(tmpFile)) {
        try {
          fs.unlinkSync(tmpFile);
        } catch {}
      }
      return res.status(500).json({ success: false, message: "Failed to save database file on server." });
    }
  });

  // API Route: LINE Messaging API Push Proxy (Replaces discontinued LINE Notify)
  app.post("/api/line-notify", async (req, res) => {
    try {
      const { message, token, to, targetId: bodyTargetId } = req.body;
      
      // Use the user-submitted token or the server-side environment variables
      const channelAccessToken = token || process.env.LINE_CHANNEL_ACCESS_TOKEN || process.env.LINE_NOTIFY_TOKEN;
      const targetId = to || bodyTargetId || process.env.LINE_TARGET_ID;
      
      if (!channelAccessToken) {
        return res.status(400).json({ 
          success: false, 
          message: "ไม่พบ LINE Channel Access Token กรุณาเปิดใช้งานและตั้งค่าในโมดูลตั้งค่า หรือกำหนด LINE_CHANNEL_ACCESS_TOKEN" 
        });
      }

      if (!targetId) {
        return res.status(400).json({ 
          success: false, 
          message: "ไม่พบ LINE Target ID (User ID / Group ID) กรุณากำหนด LINE_TARGET_ID หรือส่งฟิลด์ to ใน payload" 
        });
      }

      if (!message) {
        return res.status(400).json({ 
          success: false, 
          message: "ไม่พบข้อความแจ้งเตือน" 
        });
      }

      // Check LINE messaging quota before pushing
      try {
        const [quotaRes, consumptionRes] = await Promise.all([
          fetch("https://api.line.me/v2/bot/message/quota", {
            headers: { Authorization: `Bearer ${channelAccessToken}` }
          }),
          fetch("https://api.line.me/v2/bot/message/quota/consumption", {
            headers: { Authorization: `Bearer ${channelAccessToken}` }
          })
        ]);

        if (quotaRes.ok && consumptionRes.ok) {
          const quotaData = await quotaRes.json() as { type?: string; value?: number };
          const consumptionData = await consumptionRes.json() as { totalUsage?: number };

          if (quotaData.type === "limited" && typeof quotaData.value === "number" && typeof consumptionData.totalUsage === "number") {
            if (consumptionData.totalUsage >= quotaData.value) {
              return res.json({
                success: false,
                message: `โควตาข้อความ LINE ประจำเดือนเต็มแล้ว (${consumptionData.totalUsage}/${quotaData.value} ข้อความ) ไม่สามารถส่งข้อความได้`,
                quotaExceeded: true
              });
            }
          }
        }
      } catch (quotaErr) {
        console.warn("Could not verify LINE quota, proceeding with push attempt:", quotaErr);
      }

      // Call LINE Messaging API push endpoint
      const response = await fetch("https://api.line.me/v2/bot/message/push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${channelAccessToken}`
        },
        body: JSON.stringify({
          to: targetId,
          messages: [
            {
              type: "text",
              text: message
            }
          ]
        })
      });

      if (response.ok) {
        let result: any = {};
        try {
          result = await response.json();
        } catch {
          result = {};
        }
        return res.json({ success: true, data: result });
      } else {
        const errText = await response.text();
        return res.status(response.status).json({ 
          success: false, 
          message: `LINE API responded with error: ${errText}` 
        });
      }
    } catch (error) {
      console.error("LINE Messaging API Proxy Error:", error);
      return res.status(500).json({ 
        success: false, 
        message: (error as Error).message 
      });
    }
  });

  // Ensure any unmatched /api/* route returns JSON 404 rather than HTML fallback
  app.all("/api/*", (req, res) => {
    res.status(404).json({ success: false, message: `API route not found: ${req.method} ${req.path}` });
  });

  // Vite middleware for development or serving compiled static assets in production
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
    console.log(`[Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
