import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { NumberItem, BookingRecord, SystemSettings } from "./src/types";

const app = express();
const PORT = 3000;

app.use(express.json());

// Path to persist database
const DB_PATH = path.join(process.cwd(), "db.json");

interface DBStructure {
  numbers: NumberItem[];
  logs: BookingRecord[];
  settings: SystemSettings;
}

// Helper to initialize default database state
function createDefaultDB(): DBStructure {
  const numbers: NumberItem[] = [];
  for (let i = 0; i < 100; i++) {
    const numStr = i.toString().padStart(2, "0");
    numbers.push({
      number: numStr,
      price: 100,
      status: "available",
      bookedBy: "",
      phone: "",
      note: "",
      updatedAt: new Date().toISOString()
    });
  }

  return {
    numbers,
    logs: [
      {
        id: "init",
        number: "SYSTEM",
        price: 0,
        customerName: "ระบบ",
        phone: "-",
        note: "เริ่มต้นระบบจัดการหมายเลขสำเร็จ",
        timestamp: new Date().toISOString(),
        action: "update",
        operatorRole: "admin"
      }
    ],
    settings: {
      systemName: "หวยพลัส",
      defaultPrice: 100,
      currency: "บาท",
      allowUserBooking: true,
      contactInfo: "ติดต่อผู้ดูแลระบบ โทร. 081-234-5678",
      paymentTimeoutMinutes: 10
    }
  };
}

// Load database
function loadDB(): DBStructure {
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, "utf-8");
      const loaded = JSON.parse(data) as DBStructure;
      if (loaded.settings) {
        let modified = false;
        if (loaded.settings.systemName === "ระบบจัดการหมายเลข 00-99 (Number Manager)" || loaded.settings.systemName === "ระบบจัดการหมายเลข 00-99") {
          loaded.settings.systemName = "หวยพลัส";
          modified = true;
        }
        if (loaded.settings.currency === "฿") {
          loaded.settings.currency = "บาท";
          modified = true;
        }
        if (loaded.settings.paymentTimeoutMinutes === undefined) {
          loaded.settings.paymentTimeoutMinutes = 10;
          modified = true;
        }
        if (modified) {
          saveDB(loaded);
        }
      }
      return loaded;
    }
  } catch (error) {
    console.error("Error reading database file, resetting...", error);
  }
  
  const defaultDB = createDefaultDB();
  saveDB(defaultDB);
  return defaultDB;
}

// Save database
function saveDB(db: DBStructure) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
  } catch (error) {
    console.error("Error saving database file:", error);
  }
}

// Initialize on start
let db = loadDB();

// Helper to clean expired bookings
function cleanExpiredBookings() {
  const now = new Date();
  let modified = false;
  
  db.numbers.forEach((numItem, idx) => {
    if (numItem.status === 'booked' && !numItem.isPaid && !numItem.slipImage && numItem.bookingExpiresAt) {
      const expiry = new Date(numItem.bookingExpiresAt);
      if (now > expiry) {
        db.numbers[idx] = {
          ...numItem,
          status: 'available',
          bookedBy: '',
          phone: '',
          note: '',
          isPaid: false,
          bookingExpiresAt: undefined,
          slipImage: undefined,
          updatedAt: now.toISOString()
        };
        
        db.logs.push({
          id: `${Date.now()}-autocancel-${numItem.number}`,
          number: numItem.number,
          price: numItem.price,
          customerName: numItem.bookedBy || "-",
          phone: numItem.phone || "-",
          note: "ระบบยกเลิกการจองอัตโนมัติ เนื่องจากไม่ได้ชำระเงินในเวลาที่กำหนด",
          timestamp: now.toISOString(),
          action: 'release',
          operatorRole: 'user'
        });
        
        modified = true;
      }
    }
  });
  
  if (modified) {
    saveDB(db);
  }
}

// Start periodic checker every 10 seconds
setInterval(() => {
  cleanExpiredBookings();
}, 10000);

// ------------------- API Endpoints -------------------

// 1. Get all numbers & system status
app.get("/api/numbers", (req, res) => {
  cleanExpiredBookings();
  res.json({
    numbers: db.numbers,
    settings: db.settings
  });
});

// 2. Get booking logs
app.get("/api/logs", (req, res) => {
  cleanExpiredBookings();
  // Return logs sorted by newest first
  const sortedLogs = [...db.logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  res.json(sortedLogs);
});

// 3. Get settings
app.get("/api/settings", (req, res) => {
  res.json(db.settings);
});

// 4. Update settings (Admin)
app.put("/api/settings", (req, res) => {
  const { systemName, defaultPrice, currency, allowUserBooking, contactInfo, paymentTimeoutMinutes } = req.body;
  
  db.settings = {
    systemName: systemName || db.settings.systemName,
    defaultPrice: typeof defaultPrice === "number" ? defaultPrice : db.settings.defaultPrice,
    currency: currency || db.settings.currency,
    allowUserBooking: typeof allowUserBooking === "boolean" ? allowUserBooking : db.settings.allowUserBooking,
    contactInfo: contactInfo || db.settings.contactInfo,
    paymentTimeoutMinutes: typeof paymentTimeoutMinutes === "number" ? paymentTimeoutMinutes : db.settings.paymentTimeoutMinutes
  };
  
  saveDB(db);
  res.json({ success: true, settings: db.settings });
});

// 5. Update a single number (Booking / Admin edit)
app.put("/api/numbers/:num", (req, res) => {
  const { num } = req.params;
  const { status, price, bookedBy, phone, note, operatorRole, isPaid, slipImage } = req.body;
  
  const numIndex = db.numbers.findIndex(n => n.number === num);
  if (numIndex === -1) {
    res.status(404).json({ error: "ไม่พบหมายเลขนี้" });
    return;
  }
  
  const oldItem = db.numbers[numIndex];
  
  // Set isPaid and bookingExpiresAt
  let finalIsPaid = isPaid !== undefined ? isPaid : oldItem.isPaid;
  let finalExpiresAt = oldItem.bookingExpiresAt;
  
  if (status === 'available') {
    finalIsPaid = false;
    finalExpiresAt = undefined;
  } else if (oldItem.status !== 'booked' && status === 'booked') {
    // New booking
    finalIsPaid = isPaid !== undefined ? isPaid : false;
    const timeoutMin = db.settings.paymentTimeoutMinutes || 10;
    finalExpiresAt = new Date(Date.now() + timeoutMin * 60 * 1000).toISOString();
  } else if (isPaid === true) {
    // Payment confirmed! Clear expiration timer
    finalIsPaid = true;
    finalExpiresAt = undefined;
  } else if (isPaid === false) {
    // Reverted to unpaid
    finalIsPaid = false;
    const timeoutMin = db.settings.paymentTimeoutMinutes || 10;
    finalExpiresAt = new Date(Date.now() + timeoutMin * 60 * 1000).toISOString();
  }
  
  // Update number
  const updatedItem: NumberItem = {
    ...oldItem,
    status: status || oldItem.status,
    price: typeof price === "number" ? price : oldItem.price,
    bookedBy: bookedBy !== undefined ? bookedBy : oldItem.bookedBy,
    phone: phone !== undefined ? phone : oldItem.phone,
    note: note !== undefined ? note : oldItem.note,
    isPaid: finalIsPaid,
    bookingExpiresAt: finalExpiresAt,
    slipImage: status === 'available' ? undefined : (slipImage !== undefined ? slipImage : oldItem.slipImage),
    updatedAt: new Date().toISOString()
  };
  
  db.numbers[numIndex] = updatedItem;
  
  // Generate action details for logging
  let action: 'book' | 'release' | 'update' = 'update';
  let logNote = updatedItem.note;
  
  if (oldItem.status !== 'booked' && updatedItem.status === 'booked') {
    action = 'book';
  } else if (oldItem.status === 'booked' && updatedItem.status === 'available') {
    action = 'release';
  } else if (!oldItem.isPaid && updatedItem.isPaid) {
    logNote = "ชำระเงินเสร็จสิ้น";
  }
  
  // Log this activity
  const newLog: BookingRecord = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    number: num,
    price: updatedItem.price,
    customerName: updatedItem.bookedBy || "-",
    phone: updatedItem.phone || "-",
    note: logNote || (action === 'release' ? "ยกเลิกการจอง" : "แก้ไขข้อมูลหมายเลข"),
    timestamp: new Date().toISOString(),
    action,
    operatorRole: operatorRole === "admin" ? "admin" : "user"
  };
  
  db.logs.push(newLog);
  saveDB(db);
  
  res.json({ success: true, number: updatedItem });
});

// 6. Bulk update numbers (Admin)
app.post("/api/numbers/bulk-update", (req, res) => {
  const { selectedNumbers, status, price, operatorRole } = req.body;
  
  if (!Array.isArray(selectedNumbers) || selectedNumbers.length === 0) {
    res.status(400).json({ error: "กรุณาเลือกหมายเลขที่ต้องการแก้ไข" });
    return;
  }
  
  const timestamp = new Date().toISOString();
  let updatedCount = 0;
  
  selectedNumbers.forEach(num => {
    const idx = db.numbers.findIndex(n => n.number === num);
    if (idx !== -1) {
      const oldItem = db.numbers[idx];
      db.numbers[idx] = {
        ...oldItem,
        status: status || oldItem.status,
        price: typeof price === "number" ? price : oldItem.price,
        // If closing, clear booking. If opening, clear booking if previously blocked.
        bookedBy: status === 'closed' || status === 'available' ? "" : oldItem.bookedBy,
        phone: status === 'closed' || status === 'available' ? "" : oldItem.phone,
        note: status === 'closed' || status === 'available' ? "" : oldItem.note,
        updatedAt: timestamp
      };
      updatedCount++;
    }
  });
  
  // Create bulk change log
  const newLog: BookingRecord = {
    id: `${Date.now()}-bulk`,
    number: "BULK",
    price: typeof price === "number" ? price : 0,
    customerName: `จำนวน ${selectedNumbers.length} หมายเลข`,
    phone: "-",
    note: `แก้ไขแบบกลุ่ม: สถานะ=${status || 'คงเดิม'}, ราคา=${price !== undefined ? price : 'คงเดิม'}`,
    timestamp,
    action: "update",
    operatorRole: operatorRole === "admin" ? "admin" : "user"
  };
  
  db.logs.push(newLog);
  saveDB(db);
  
  res.json({ success: true, updatedCount });
});

// 7. Reset all numbers to default (Admin)
app.post("/api/numbers/reset", (req, res) => {
  const { operatorRole } = req.body;
  const timestamp = new Date().toISOString();
  
  db.numbers = db.numbers.map(n => ({
    number: n.number,
    price: db.settings.defaultPrice,
    status: "available",
    bookedBy: "",
    phone: "",
    note: "",
    updatedAt: timestamp
  }));
  
  const newLog: BookingRecord = {
    id: `${Date.now()}-reset`,
    number: "RESET",
    price: 0,
    customerName: "ล้างข้อมูลทั้งหมด",
    phone: "-",
    note: "รีเซ็ตสถานะและราคาของหมายเลข 00-99 ทั้งหมดกลับสู่ค่าเริ่มต้น",
    timestamp,
    action: "update",
    operatorRole: operatorRole === "admin" ? "admin" : "user"
  };
  
  db.logs.push(newLog);
  saveDB(db);
  
  res.json({ success: true, message: "รีเซ็ตระบบจัดการตัวเลขทั้งหมดเรียบร้อยแล้ว" });
});

// 8. Admin login simulation
app.post("/api/auth/login", (req, res) => {
  const { password } = req.body;
  
  // Simple simulation password
  if (password === "admin1234") {
    res.json({
      success: true,
      role: "admin",
      name: "ผู้ดูแลระบบ (Admin)"
    });
  } else {
    res.status(401).json({ error: "รหัสผ่านไม่ถูกต้อง" });
  }
});


// ------------------- Vite Server Integration -------------------

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Number Manager Server] running on http://localhost:${PORT}`);
  });
}

startServer();
