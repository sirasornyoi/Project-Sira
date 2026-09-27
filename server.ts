import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import fs from "fs";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Firestore, DocumentReference } from "firebase-admin/firestore";

dotenv.config();

const DB_FILE = path.join(process.cwd(), "db.json");
const isFirestoreMode = process.env.PERSISTENCE === "firestore";
let firestoreDb: Firestore | null = null;

if (isFirestoreMode) {
  if (getApps().length === 0) {
    initializeApp();
  }
  firestoreDb = getFirestore();
}

const ARRAY_COLLECTIONS = [
  "machines",
  "pmPlans",
  "schedules",
  "repairs",
  "improvements",
  "spareParts",
  "timeBreakParts",
  "plannedProductionTimes",
  "whyWhyDrafts"
] as const;

type ArrayCollectionName = typeof ARRAY_COLLECTIONS[number];

const META_FIELDS = ["technicians", "technicianShifts", "pmMachineIds", "zones", "settings"] as const;
type MetaFieldName = typeof META_FIELDS[number];

interface AppData {
  machines: any[];
  pmPlans: any[];
  schedules: any[];
  repairs: any[];
  improvements: any[];
  spareParts: any[];
  timeBreakParts: any[];
  plannedProductionTimes: any[];
  whyWhyDrafts: any[];
  technicians: string[];
  technicianShifts: Record<string, { start: string; end: string }>;
  pmMachineIds: string[];
  zones: any[];
  settings: any;
}

let inMemoryData: AppData = {
  machines: [],
  pmPlans: [],
  schedules: [],
  repairs: [],
  improvements: [],
  spareParts: [],
  timeBreakParts: [],
  plannedProductionTimes: [],
  whyWhyDrafts: [],
  technicians: [],
  technicianShifts: {},
  pmMachineIds: [],
  zones: [],
  settings: {}
};

let currentRevision = Date.now();

function saveDbFileAtomic(data: any) {
  const tmpFile = `${DB_FILE}.tmp`;
  const backupFile = path.join(process.cwd(), "db.json.bak");
  try {
    fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), "utf-8");
    if (fs.existsSync(DB_FILE)) {
      fs.copyFileSync(DB_FILE, backupFile);
    }
    fs.renameSync(tmpFile, DB_FILE);
  } catch (err) {
    console.error("Error writing db.json atomic:", err);
    if (fs.existsSync(tmpFile)) {
      try {
        fs.unlinkSync(tmpFile);
      } catch {}
    }
    throw err;
  }
}

async function commitBatches(
  db: Firestore,
  ops: Array<{ type: 'set' | 'delete'; ref: DocumentReference; data?: any; merge?: boolean }>
) {
  const BATCH_SIZE = 450;
  for (let i = 0; i < ops.length; i += BATCH_SIZE) {
    const chunk = ops.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    for (const op of chunk) {
      if (op.type === 'set') {
        if (op.merge) {
          batch.set(op.ref, op.data, { merge: true });
        } else {
          batch.set(op.ref, op.data);
        }
      } else if (op.type === 'delete') {
        batch.delete(op.ref);
      }
    }
    await batch.commit();
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize storage layer
  if (isFirestoreMode && firestoreDb) {
    console.log("[Server] Persistence mode: FIRESTORE");
    try {
      // Check if Firestore is empty
      const metaDoc = await firestoreDb.collection("meta").doc("app").get();
      const machinesSnap = await firestoreDb.collection("machines").limit(1).get();
      const isEmpty = !metaDoc.exists && machinesSnap.empty;

      if (isEmpty) {
        console.log("[Server] Firestore is empty, seeding from db.json...");
        let seedData: any = null;
        if (fs.existsSync(DB_FILE)) {
          try {
            const raw = fs.readFileSync(DB_FILE, "utf-8");
            if (raw.trim()) seedData = JSON.parse(raw);
          } catch (e) {
            console.warn("[Server] Could not parse db.json for seeding:", e);
          }
        }
        if (!seedData) {
          const bakFile = path.join(process.cwd(), "db.json.bak");
          if (fs.existsSync(bakFile)) {
            try {
              const raw = fs.readFileSync(bakFile, "utf-8");
              if (raw.trim()) seedData = JSON.parse(raw);
            } catch {}
          }
        }

        if (seedData) {
          const seedOps: Array<{ type: 'set'; ref: DocumentReference; data: any }> = [];
          for (const col of ARRAY_COLLECTIONS) {
            if (Array.isArray(seedData[col])) {
              for (const record of seedData[col]) {
                if (record && record.id !== undefined && record.id !== null) {
                  seedOps.push({
                    type: 'set',
                    ref: firestoreDb.collection(col).doc(String(record.id)),
                    data: record
                  });
                }
              }
            }
          }

          seedOps.push({
            type: 'set',
            ref: firestoreDb.collection("meta").doc("app"),
            data: {
              technicians: seedData.technicians || [],
              pmMachineIds: seedData.pmMachineIds || [],
              zones: seedData.zones || [],
              settings: seedData.settings || {}
            }
          });

          await commitBatches(firestoreDb, seedOps);
          console.log(`[Server] Seeded ${seedOps.length} documents into Firestore.`);
        }
      }

      // Load all collections from Firestore into in-memory object
      for (const col of ARRAY_COLLECTIONS) {
        const snap = await firestoreDb.collection(col).get();
        inMemoryData[col] = snap.docs.map(doc => doc.data());
      }
      const loadedMeta = await firestoreDb.collection("meta").doc("app").get();
      if (loadedMeta.exists) {
        const m = loadedMeta.data() || {};
        inMemoryData.technicians = Array.isArray(m.technicians) ? m.technicians : [];
        inMemoryData.pmMachineIds = Array.isArray(m.pmMachineIds) ? m.pmMachineIds : [];
        inMemoryData.zones = Array.isArray(m.zones) ? m.zones : [];
        inMemoryData.settings = m.settings && typeof m.settings === "object" ? m.settings : {};
      }
      currentRevision = Date.now();
      console.log(`[Server] Loaded data from Firestore into memory (revision ${currentRevision}).`);
    } catch (err) {
      console.error("[Server] Error initializing Firestore:", err);
      throw err;
    }
  } else {
    console.log("[Server] Persistence mode: LOCAL FILE (db.json)");
    try {
      const backupFile = path.join(process.cwd(), "db.json.bak");
      let raw = "";
      if (fs.existsSync(DB_FILE)) {
        raw = fs.readFileSync(DB_FILE, "utf-8");
      } else if (fs.existsSync(backupFile)) {
        raw = fs.readFileSync(backupFile, "utf-8");
      }
      if (raw.trim()) {
        const parsed = JSON.parse(raw);
        for (const col of ARRAY_COLLECTIONS) {
          inMemoryData[col] = Array.isArray(parsed[col]) ? parsed[col] : [];
        }
        for (const field of META_FIELDS) {
          inMemoryData[field] = parsed[field] !== undefined ? parsed[field] : (field === 'settings' ? {} : []);
        }
      }
      currentRevision = Date.now();
      console.log(`[Server] Loaded data from db.json into memory (revision ${currentRevision}).`);
    } catch (err) {
      console.warn("[Server] Error reading db.json, using defaults:", err);
      currentRevision = Date.now();
    }
  }

  // Middleware for parsing JSON and URL encoded forms with 50mb limit for attachments
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // API Route: Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // API Route: Load Database (served from memory only, rev support)
  app.get("/api/db", (req, res) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    const reqRev = req.query.rev;
    if (reqRev !== undefined && reqRev !== null && reqRev !== "") {
      const revNum = Number(reqRev);
      if (!isNaN(revNum) && revNum === currentRevision) {
        return res.json({ unchanged: true, revision: currentRevision });
      }
    }
    return res.json({ ...inMemoryData, revision: currentRevision });
  });

  // API Route: Granular Database Changes
  app.post("/api/db/changes", async (req, res) => {
    try {
      const { changes, meta } = req.body || {};
      const rejected: Array<{ collection: string; id: string; reason: string }> = [];
      const ops: Array<{ type: 'set' | 'delete'; ref: DocumentReference; data?: any; merge?: boolean }> = [];

      let hasModifications = false;
      const modifiedCollections: Partial<Record<ArrayCollectionName, any[]>> = {};
      const modifiedMeta: Partial<Record<MetaFieldName, any>> = {};

      if (changes && typeof changes === "object") {
        for (const col of ARRAY_COLLECTIONS) {
          const colChange = changes[col];
          if (!colChange) continue;

          const { upsert, delete: toDelete } = colChange;
          let list = [...(inMemoryData[col] || [])];
          let colModified = false;

          // Process upserts
          if (Array.isArray(upsert)) {
            for (const record of upsert) {
              if (!record || record.id === undefined || record.id === null) continue;
              const jsonStr = JSON.stringify(record);
              const sizeInBytes = Buffer.byteLength(jsonStr, 'utf-8');

              if (sizeInBytes > 900000) {
                rejected.push({ collection: col, id: String(record.id), reason: 'too_large' });
                continue;
              }

              // Apply to cloned list
              const idx = list.findIndex((item: any) => String(item.id) === String(record.id));
              if (idx >= 0) {
                list[idx] = record;
              } else {
                list.push(record);
              }
              colModified = true;
              hasModifications = true;

              if (isFirestoreMode && firestoreDb) {
                ops.push({
                  type: 'set',
                  ref: firestoreDb.collection(col).doc(String(record.id)),
                  data: record
                });
              }
            }
          }

          // Process deletes
          if (Array.isArray(toDelete)) {
            for (const id of toDelete) {
              if (id === undefined || id === null) continue;
              list = list.filter((item: any) => String(item.id) !== String(id));
              colModified = true;
              hasModifications = true;

              if (isFirestoreMode && firestoreDb) {
                ops.push({
                  type: 'delete',
                  ref: firestoreDb.collection(col).doc(String(id))
                });
              }
            }
          }

          if (colModified) {
            modifiedCollections[col] = list;
          }
        }
      }

      // Process meta
      if (meta && typeof meta === "object") {
        const metaUpdates: any = {};
        for (const field of META_FIELDS) {
          if (meta[field] !== undefined) {
            modifiedMeta[field] = meta[field];
            metaUpdates[field] = meta[field];
            hasModifications = true;
          }
        }

        if (Object.keys(metaUpdates).length > 0 && isFirestoreMode && firestoreDb) {
          ops.push({
            type: 'set',
            ref: firestoreDb.collection("meta").doc("app"),
            data: metaUpdates,
            merge: true
          });
        }
      }

      // Commit to persistence FIRST before updating in-memory state
      if (isFirestoreMode && firestoreDb) {
        if (ops.length > 0) {
          await commitBatches(firestoreDb, ops);
        }
      } else {
        if (hasModifications) {
          const dataToWrite = {
            ...inMemoryData,
            ...modifiedCollections,
            ...modifiedMeta
          };
          saveDbFileAtomic(dataToWrite);
        }
      }

      // Only after successful commit, assign the copy to inMemoryData and increment revision
      if (hasModifications) {
        for (const col of Object.keys(modifiedCollections) as ArrayCollectionName[]) {
          inMemoryData[col] = modifiedCollections[col]!;
        }
        for (const field of Object.keys(modifiedMeta) as MetaFieldName[]) {
          inMemoryData[field] = modifiedMeta[field];
        }
        currentRevision++;
      }

      const responsePayload: any = { revision: currentRevision };
      if (rejected.length > 0) {
        responsePayload.rejected = rejected;
      }

      return res.json(responsePayload);
    } catch (error) {
      console.error("Error in POST /api/db/changes:", error);
      return res.status(500).json({ success: false, message: (error as Error).message });
    }
  });

  // API Route: Save Database (deprecated in firestore mode, maintained for local file mode)
  app.post("/api/db", (req, res) => {
    if (isFirestoreMode) {
      return res.status(410).json({
        success: false,
        message: "POST /api/db is deprecated and disabled in firestore mode. Use POST /api/db/changes."
      });
    }

    try {
      const data = req.body;
      if (!data || typeof data !== "object" || Array.isArray(data)) {
        return res.status(400).json({
          success: false,
          message: "Invalid payload: req.body must be a valid JSON object."
        });
      }

      if (!data.machines || !Array.isArray(data.machines)) {
        return res.status(400).json({
          success: false,
          message: "Refusing to save: missing required 'machines' array."
        });
      }

      for (const col of ARRAY_COLLECTIONS) {
        if (Array.isArray(data[col])) {
          inMemoryData[col] = data[col];
        }
      }
      for (const field of META_FIELDS) {
        if (data[field] !== undefined) {
          inMemoryData[field] = data[field];
        }
      }

      saveDbFileAtomic(inMemoryData);
      currentRevision++;

      return res.json({ success: true, revision: currentRevision, message: "Database saved successfully." });
    } catch (error) {
      console.error("Error writing db.json:", error);
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
