import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

// Middleware for parsing JSON requests
app.use(express.json());

// IN-MEMORY DATABASE SEEDING
let events: any[] = [
  {
    id: 'evt-1',
    title: 'Neon Pulse Electronic Festival',
    category: 'Musik',
    dateMonth: 'OKT',
    dateDay: '24',
    dateFullString: 'Sabtu, 24 Okt 2026, 19:00 WIB',
    dateISO: '2026-10-24',
    location: 'Mirage Arena, Jakarta',
    priceMin: 250000,
    priceMax: 1200000,
    imageUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80',
    description: 'Festival musik elektronik sinematik dengan laser berkekuatan tinggi, cahaya magenta dan teal yang dinamis, serta sistem akustik imersif terbaik yang dipandu oleh produser kelas dunia.',
    organizer: 'Neon Horizon Interactive',
    tag: 'Cepat Habis',
    ticketsLeft: 120,
    seatingChartUrl: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=600&q=80',
    customFormFields: [],
    registrationRoles: [
      { id: 'role-1', name: 'Penonton Festival', isTeamType: false, description: 'Tiket reguler & VIP penikmat konser', maxQuantity: 5 },
      { id: 'role-2', name: 'Narasumber / Keynote', isTeamType: false, description: 'Undangan khusus talkshow panel', maxQuantity: 2 }
    ],
    formSections: [
      {
        id: 'sec-buyer',
        title: 'Informasi Identitas Pengunjung',
        fields: [
          { id: 'name', label: 'Nama Lengkap Pendaftar', type: 'text', required: true, placeholder: 'Contoh: Ahmad Fauzi' },
          { id: 'email', label: 'Alamat Email Aktif', type: 'email', required: true, placeholder: 'fauzi@gmail.com' },
          { id: 'whatsapp', label: 'Nomor WhatsApp Anda', type: 'text', required: true, placeholder: '08123456789' }
        ]
      }
    ],
    contentBlocks: [
      { id: 'b-1-text', type: 'text', title: 'Kebijakan Keamanan Acara', value: 'Pengunjung diwajibkan telah menerima vaksin minimal dosis kedua. Dilarang keras membawa senjata tajam, zat narkotika.' }
    ],
    tiers: [
      { id: 't-1-early', name: 'Tiket Early Bird', price: 250000, description: 'Termasuk tiket masuk standar festival.', slotsAvailable: 15 },
      { id: 't-1-ga', name: 'Tiket Masuk Umum (GA)', price: 450000, description: 'Akses masuk festival penuh kapan saja.', slotsAvailable: 80 },
      { id: 't-1-vip', name: 'Akses VIP Pulse', price: 1200000, description: 'Akses platform elevated.', slotsAvailable: 25 }
    ]
  },
  {
    id: 'evt-2',
    title: 'SAGATIX Pro League: Grand Finals',
    category: 'Game',
    dateMonth: 'NOP',
    dateDay: '02',
    dateFullString: 'Senin, 2 Nop 2026, 16:00 WIB',
    dateISO: '2026-11-02',
    location: 'Taman Anggrek Esport Arena, Jakarta',
    priceMin: 75000,
    priceMax: 350000,
    imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80',
    description: 'Pertarungan final eSports paling spektakuler tahun ini. Tonton tim FPS terbaik dunia berlaga secara langsung di layar raksasa.',
    organizer: 'Pro eSports League (PESL)',
    ticketsLeft: 142,
    seatingChartUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=600&q=80',
    customFormFields: [],
    registrationRoles: [
      { id: 'role-team', name: 'Peserta Turnamen (Team)', isTeamType: true, description: 'Pendaftaran 1 tim esports penuh', maxQuantity: 1 },
      { id: 'role-spectator', name: 'Penonton Umum', isTeamType: false, description: 'Tiket masuk harian menonton laga', maxQuantity: 10 }
    ],
    formSections: [
      {
        id: 'sec-leader',
        title: 'Section 1: Data Ketua Tim (Kapten)',
        fields: [
          { id: 'name', label: 'Nama Lengkap Kapten', type: 'text', required: true, placeholder: 'Contoh: Lemon Wijaya' },
          { id: 'team_name', label: 'Nama Tim / Organisasi', type: 'text', required: true, placeholder: 'Contoh: EVOS SAGATIX' }
        ]
      }
    ],
    tiers: [
      { id: 't-2-tribune', name: 'Kursi Tribun Atas', price: 75000, description: 'Fasilitas kursi standar.', slotsAvailable: 100 },
      { id: 't-2-vip', name: 'VIP Ring Utama', price: 350000, description: 'Platform hadapan panggung.', slotsAvailable: 42 }
    ]
  }
];

let purchasedTickets: any[] = [];

// REST API ENDPOINTS

// 1. GET ALL EVENTS (LIGHTWEIGHT SUMMARY)
app.get("/api/events", (req, res) => {
  const summaryEvents = events.map(e => ({
    id: e.id,
    title: e.title,
    category: e.category,
    dateMonth: e.dateMonth,
    dateDay: e.dateDay,
    dateFullString: e.dateFullString,
    dateISO: e.dateISO,
    location: e.location,
    priceMin: e.priceMin,
    priceMax: e.priceMax,
    imageUrl: e.imageUrl,
    tag: e.tag,
    ticketsLeft: e.ticketsLeft,
    isSoldOut: e.isSoldOut,
    organizer: e.organizer
  }));
  res.json(summaryEvents);
});

// 2. GET EVENT DETAILS
app.get("/api/events/:id", (req, res) => {
  const event = events.find(e => e.id === req.params.id);
  if (!event) {
    return res.status(404).json({ error: "Event tidak ditemukan." });
  }
  res.json(event);
});

// 3. CREATE EVENT
app.post("/api/events", (req, res) => {
  const newEvent = req.body;
  if (!newEvent.title || !newEvent.location) {
    return res.status(400).json({ error: "Judul dan lokasi acara wajib diisi." });
  }
  newEvent.id = newEvent.id || `evt-dy-${Date.now()}`;
  events.push(newEvent);
  res.status(201).json(newEvent);
});

// 4. GET ALL DEVELOPED TICKETS
app.get("/api/tickets", (req, res) => {
  res.json(purchasedTickets);
});

// 5. POST TICKET BOOKING
app.post("/api/tickets", (req, res) => {
  const { eventId, eventTitle, eventLocation, dateMonth, dateDay, dateFullString, imageUrl, tierName, quantity, pricePerTicket, totalAmount, bookingDate, ticketCode, registrationType, formResponses, ticketHolders, seatNumbers } = req.body;
  
  if (!eventId || !ticketCode || !totalAmount) {
    return res.status(400).json({ error: "Detail pemesanan tidak lengkap." });
  }

  const newTicket = {
    id: `ticket-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    eventId,
    eventTitle,
    eventLocation,
    dateMonth,
    dateDay,
    dateFullString,
    imageUrl,
    tierName,
    quantity: Number(quantity) || 1,
    pricePerTicket: Number(pricePerTicket) || 0,
    totalAmount: Number(totalAmount) || 0,
    bookingDate: bookingDate || new Date().toISOString().split('T')[0],
    ticketCode,
    registrationType,
    formResponses: formResponses || {},
    ticketHolders: ticketHolders || [],
    seatNumbers: seatNumbers || [`GA-${Math.floor(Math.random() * 500) + 100}`],
    isCheckedIn: false
  };

  // Decrease event available slots
  const targetEvent = events.find(e => e.id === eventId);
  if (targetEvent) {
    const targetTier = targetEvent.tiers.find((t: any) => t.name === tierName);
    if (targetTier) {
      targetTier.slotsAvailable = Math.max(0, targetTier.slotsAvailable - newTicket.quantity);
    }
    targetEvent.ticketsLeft = Math.max(0, (targetEvent.ticketsLeft || 0) - newTicket.quantity);
    if (targetEvent.ticketsLeft === 0) {
      targetEvent.isSoldOut = true;
    }
  }

  purchasedTickets.push(newTicket);
  res.status(201).json(newTicket);
});

// 6. CHECKIN TICKET (FOR ADMIN)
app.post("/api/tickets/:id/checkin", (req, res) => {
  const ticket = purchasedTickets.find(t => t.id === req.params.id || t.ticketCode === req.params.id);
  if (!ticket) {
    return res.status(404).json({ error: "Tiket tidak ditemukan." });
  }
  if (ticket.isCheckedIn) {
    return res.status(400).json({ error: "Tiket sudah digunakan sebelumnya!", alreadyCheckedIn: true });
  }
  ticket.isCheckedIn = true;
  ticket.checkInTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  res.json({ success: true, ticket });
});

// 7. GET OVERALL DATA STATS
app.get("/api/stats", (req, res) => {
  const totalBookings = purchasedTickets.length;
  const totalTicketsSold = purchasedTickets.reduce((acc, t) => acc + t.quantity, 0);
  const totalRevenue = purchasedTickets.reduce((acc, t) => acc + t.totalAmount, 0);
  const totalCheckIns = purchasedTickets.filter(t => t.isCheckedIn).length;

  res.json({
    totalBookings,
    totalTicketsSold,
    totalRevenue,
    totalCheckIns,
    eventsCount: events.length
  });
});

// VITE MIDDLEWARE SETUP FOR DEV VS PRODUCTION MOUNTING
async function initServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app._router.get('*', (req: any, res: any) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SAGATIX Fullstack] Server listening at http://localhost:${PORT}`);
  });
}

initServer();
