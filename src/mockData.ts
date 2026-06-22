import { Event } from './types';

export const INITIAL_EVENTS: Event[] = [
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
    simulatedRequestsCount: 38, // Trigger high-traffic queue (>30 requests!)
    registrationOpenTime: undefined, // Already open!
    registrationRoles: [
      { id: 'role-1', name: 'Penonton Festival', isTeamType: false, description: 'Tiket reguler & VIP penikmat konser' },
      { id: 'role-2', name: 'Narasumber / Keynote', isTeamType: false, description: 'Undangan khusus talkshow panel' }
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
      },
      {
        id: 'sec-additional',
        title: 'Kuesioner Konser',
        fields: [
          { id: 'interest', label: 'Artis Favorit Yang Dinantikan', type: 'text', required: false, placeholder: 'Contoh: KSHMR, Martin Garrix' }
        ]
      }
    ],
    contentBlocks: [
      { id: 'b-1-text', type: 'text', title: 'Kebijakan Keamanan Acara', value: 'Pengunjung diwajibkan telah menerima vaksin minimal dosis kedua. Dilarang keras membawa senjata tajam, zat narkotika, serta makanan atau minuman dari luar stadium.' },
      { id: 'b-1-img', type: 'image', title: 'Sponsor & Partner Resmi SAGATIX', value: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=600&q=80' }
    ],
    tiers: [
      { id: 't-1-early', name: 'Tiket Early Bird', price: 250000, description: 'Termasuk tiket masuk standar festival sebelum jam 20:00 WIB. Akses ke area lapangan utama.', slotsAvailable: 15 },
      { id: 't-1-ga', name: 'Tiket Masuk Umum (GA)', price: 450000, description: 'Akses masuk festival penuh kapan saja. Akses standar ke stand minuman dan lantai dansa utama.', slotsAvailable: 80 },
      { id: 't-1-vip', name: 'Akses VIP Pulse', price: 1200000, description: 'Akses ke platform pandang VIP khusus yang lebih tinggi, bar khusus, jalur masuk ekspres, dan merchandise eksklusif.', slotsAvailable: 25 }
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
    description: 'Pertarungan final eSports paling spektakuler tahun ini. Tonton tim FPS terbaik dunia berlaga secara langsung di layar raksasa arena dengan komentator pro dan zona fans premium.',
    organizer: 'Pro eSports League (PESL)',
    ticketsLeft: 142,
    seatingChartUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=600&q=80',
    customFormFields: [],
    simulatedRequestsCount: 12, // Under 30, bypass queue
    registrationOpenTime: new Date(Date.now() + 45 * 60 * 1000).toISOString(), // Activates ticking real-time countdown (45 mins from now)!
    registrationRoles: [
      { id: 'role-team', name: 'Peserta Turnamen (Team)', isTeamType: true, description: 'Pendaftaran 1 tim esports penuh berisi Ketua dan Anggota' },
      { id: 'role-spectator', name: 'Penonton Umum', isTeamType: false, description: 'Tiket masuk harian untuk menonton laga secara langsung' }
    ],
    formSections: [
      {
        id: 'sec-leader',
        title: 'Section 1: Data Ketua Tim (Kapten)',
        fields: [
          { id: 'kapten_nama', label: 'Nama Lengkap Kapten', type: 'text', required: true, placeholder: 'Contoh: Lemon Wijaya' },
          { id: 'kapten_ign', label: 'In-Game Nickname Kapten', type: 'text', required: true, placeholder: 'Contoh: Lemonz#123' },
          { id: 'team_name', label: 'Nama Tim / Organisasi', type: 'text', required: true, placeholder: 'Contoh: EVOS SAGATIX' }
        ]
      },
      {
        id: 'sec-player-1',
        title: 'Section 2: Informasi Player 2',
        fields: [
          { id: 'p2_nama', label: 'Nama Lengkap Player 2', type: 'text', required: true, placeholder: 'Nama pemain kedua' },
          { id: 'p2_ign', label: 'In-Game ID Player 2', type: 'text', required: true, placeholder: 'Nickname#ID' }
        ]
      },
      {
        id: 'sec-player-3',
        title: 'Section 3: Informasi Player 3 (Cadangan)',
        fields: [
          { id: 'p3_nama', label: 'Nama Lengkap Player 3', type: 'text', required: false, placeholder: 'Opsional' },
          { id: 'p3_ign', label: 'In-Game ID Player 3', type: 'text', required: false, placeholder: 'Opsional NicknameGame' }
        ]
      }
    ],
    contentBlocks: [
      { id: 'b-2-text', type: 'text', title: 'Hadiah Turnamen (Prize Pool)', value: 'Total hadiah mencapai Rp 150.000.000 + Piala Kejuaraan SAGATIX Pro League Season 12. Pemenang pertama berhak melaju langsung ke babak Major regional Asia Pasifik!' }
    ],
    tiers: [
      { id: 't-2-balcony', name: 'Standar Balkon', price: 75000, description: 'Tempat duduk balkon yang nyaman dengan pemandangan panggung arena yang luas.', slotsAvailable: 50 },
      { id: 't-2-arena', name: 'Ring Umum Arena', price: 180000, description: 'Kursi baris tengah. Atmosfer penonton yang luar biasa dekat dengan layar utama.', slotsAvailable: 60 },
      { id: 't-2-floor', name: 'Tiket Pro Courtside', price: 350000, description: 'Kursi gaming baris depan terbaik. Akses ke Lounge Pemain dan bingkisan spesial.', slotsAvailable: 32 }
    ]
  },
  {
    id: 'evt-3',
    title: 'AI Horizon & Science Future Summit',
    category: 'Teknologi',
    dateMonth: 'NOP',
    dateDay: '15',
    dateFullString: 'Minggu, 15 Nop 2026, 09:00 WIB',
    dateISO: '2026-11-15',
    location: 'ICE BSD, Tangerang Banten',
    priceMin: 150000,
    priceMax: 950000,
    imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
    description: 'Membuka tabir teknologi masa depan dengan model frontier, agen AI interaktif, dan arsitektur mutakhir. Sesi presentasi oleh developer terkemuka dan workshop praktis.',
    organizer: 'AI Research Alliance',
    tag: 'Sangat Populer',
    ticketsLeft: 75,
    seatingChartUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=600&q=80',
    customFormFields: [],
    registrationRoles: [
      { id: 'r3-1', name: 'Delegasi Akademis / Mahasiswa', isTeamType: false, description: 'Akses diskon khusus mahasiswa' },
      { id: 'r3-2', name: 'Delegasi Profesional / Umum', isTeamType: false, description: 'Akses komersial lengkap konferensi' }
    ],
    formSections: [
      {
        id: 'sec-work',
        title: 'Detail Pekerjaan & Perusahaan',
        fields: [
          { id: 'instansi', label: 'Nama Instansi / Universitas / Kantor', type: 'text', required: true, placeholder: 'Contoh: Universitas Indonesia / Gojek' },
          { id: 'github_in', label: 'Portofolio Digital (LinkedIn / GitHub)', type: 'text', required: false, placeholder: 'github.com/username' }
        ]
      }
    ],
    tiers: [
      { id: 't-3-academic', name: 'Akademis & Mahasiswa', price: 150000, description: 'Akses penuh ke semua presentasi konferensi dan ruang diskusi teknis.', slotsAvailable: 20 },
      { id: 't-3-industry', name: 'Delegasi Industri', price: 450000, description: 'Akses penuh + tiket workshop khusus + lunch. Termasuk lencana fisik.', slotsAvailable: 45 },
      { id: 't-3-allaccess', name: 'Tiket Eksekutif All-Access', price: 950000, description: 'Akses VIP Lounge, dinner privat bersama speaker utama, kursi prioritas baris depan.', slotsAvailable: 10 }
    ]
  }
];
