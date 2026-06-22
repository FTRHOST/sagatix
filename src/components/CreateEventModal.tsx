import React, { useState } from 'react';
import { Event, Category, TicketTier, CustomFieldDefinition, FormSection, RegistrationRoleConfig, ContentBlock } from '../types';
import { X, Calendar, MapPin, Tag, Image, Briefcase, Sparkles, Plus, Trash, HelpCircle, FileText, ChevronRight, Layers } from 'lucide-react';
import { motion } from 'motion/react';

interface CreateEventModalProps {
  onClose: () => void;
  onSaveEvent: (newEvent: Event) => void;
}

const CATEGORY_BANNER_PRESETS: Record<Category, string> = {
  Musik: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80',
  Game: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80',
  Olahraga: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80',
  Teknologi: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
  Konferensi: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80',
  Seni: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=800&q=80'
};

const SEATING_PRESETS = [
  { name: 'Stadium/Arena Plan', url: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=600&q=80' },
  { name: 'Theater Hall Plan', url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=600&q=80' },
  { name: 'E-Sports Stage Plan', url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=600&q=80' },
  { name: 'Exhibition Floor Plan', url: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=600&q=80' }
];

export const CreateEventModal: React.FC<CreateEventModalProps> = ({
  onClose,
  onSaveEvent,
}) => {
  // State Utama Formulir Acara
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Category>('Game');
  const [location, setLocation] = useState('');
  const [rawDate, setRawDate] = useState('');
  const [timeStr, setTimeStr] = useState('15:00');
  const [description, setDescription] = useState('');
  const [organizer, setOrganizer] = useState('');
  const [customBannerUrl, setCustomBannerUrl] = useState('');
  const [tag, setTag] = useState('Rekomendasi');
  
  // Registration Open Countdown / Lock Configuration
  const [regOpenDate, setRegOpenDate] = useState('');
  const [regOpenTime, setRegOpenTime] = useState('');

  // 1. DYNAMIC TICKET TIERS EDITOR (Pembagian kelas bisa dicustom 1, 2, 3 atau lebih, custom pricing & names in Rp)
  const [tiers, setTiers] = useState<TicketTier[]>([
    { id: 'custom-tier-1', name: 'Kelas Reguler (GA)', price: 75000, description: 'Akses masuk standar tribun belakang.', slotsAvailable: 100 },
    { id: 'custom-tier-2', name: 'Akses VIP Platinum', price: 350000, description: 'Akses baris depan terdekat panggung & goody bag.', slotsAvailable: 25 }
  ]);
  const [newTierName, setNewTierName] = useState('');
  const [newTierPrice, setNewTierPrice] = useState(100000);
  const [newTierDesc, setNewTierDesc] = useState('');
  const [newTierSlots, setNewTierSlots] = useState(50);

  const handleAddTier = () => {
    if (!newTierName.trim()) return;
    const newTier: TicketTier = {
      id: `tier-dy-${Date.now()}`,
      name: newTierName.trim(),
      price: Number(newTierPrice) || 0,
      description: newTierDesc.trim() || 'Fasilitas kelas standar.',
      slotsAvailable: Number(newTierSlots) || 10
    };
    setTiers([...tiers, newTier]);
    setNewTierName('');
    setNewTierPrice(100000);
    setNewTierDesc('');
    setNewTierSlots(50);
  };

  const handleRemoveTier = (id: string) => {
    if (tiers.length <= 1) {
      alert('Event wajib memiliki minimal 1 kelas tiket pendaftaran!');
      return;
    }
    setTiers(tiers.filter(t => t.id !== id));
  };

  // 2. CUSTOM REGISTRANT ROLE OPTIONS (Bisa diatur pendaftar, narasumber, penonton dll)
  const [roles, setRoles] = useState<RegistrationRoleConfig[]>([
    { id: 'role-team-ml', name: 'Peserta Turnamen (Team)', isTeamType: true, description: 'Registrasi 1 slot tim penuh untuk turnamen kompetisi', maxQuantity: 1 },
    { id: 'role-spectator-ml', name: 'Penonton Pro Arena', isTeamType: false, description: 'Tiket masuk penonton umum', maxQuantity: 5 }
  ]);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [newRoleIsTeam, setNewRoleIsTeam] = useState(false);
  const [newRoleMaxQty, setNewRoleMaxQty] = useState<number>(5);
  const [isFormValid, setIsFormValid] = useState(true); // dummy/temporary state or check structure

  const handleAddRole = () => {
    if (!newRoleName.trim()) return;
    const newRole: RegistrationRoleConfig = {
      id: `role-dy-${Date.now()}`,
      name: newRoleName.trim(),
      isTeamType: newRoleIsTeam,
      maxQuantity: newRoleIsTeam ? 1 : Number(newRoleMaxQty) || 5,
      description: newRoleDesc.trim() || 'Akses pendaftaran khusus.'
    };
    setRoles([...roles, newRole]);
    setNewRoleName('');
    setNewRoleDesc('');
    setNewRoleIsTeam(false);
    setNewRoleMaxQty(5);
  };

  const handleRemoveRole = (id: string) => {
    if (roles.length <= 1) {
      alert('Wajib memiliki minimal 1 kategori registrasi pendaftar!');
      return;
    }
    setRoles(roles.filter(r => r.id !== id));
  };

  // 3. SECION-BY-SECTION CUSTOM FORM BUILDER (Mengatur isian per-section: "Informasi Ketua", "Player 1", dll)
  const [sections, setSections] = useState<FormSection[]>([
    {
      id: 'sec-kapten',
      title: 'Section 1: Informasi Ketua Tim (Kapten)',
      fields: [
        { id: 'name', label: 'Nama Lengkap Kapten', type: 'text', required: true, placeholder: 'Contoh: Lemon Wijaya' },
        { id: 'ign_kapten', label: 'In-Game ID Kapten', type: 'text', required: true, placeholder: 'Contoh: Lemonz#9999' }
      ]
    },
    {
      id: 'sec-player2',
      title: 'Section 2: Informasi Player 2',
      fields: [
        { id: 'name_p2', label: 'Nama Lengkap Player 2', type: 'text', required: true, placeholder: 'Nama pemain kedua' },
        { id: 'ign_p2', label: 'In-Game ID Player 2', type: 'text', required: true, placeholder: 'Nickname#ID' }
      ]
    }
  ]);

  const [newSectionTitle, setNewSectionTitle] = useState('');

  // Fields to append to a section
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<'text' | 'number' | 'textarea' | 'email'>('text');
  const [newFieldRequired, setNewFieldRequired] = useState(true);

  const handleAddSection = () => {
    if (!newSectionTitle.trim()) return;
    const newSec: FormSection = {
      id: `sec-dy-${Date.now()}`,
      title: newSectionTitle.trim(),
      fields: []
    };
    setSections([...sections, newSec]);
    if (!selectedSectionId) {
      setSelectedSectionId(newSec.id);
    }
    setNewSectionTitle('');
  };

  const handleRemoveSection = (secId: string) => {
    setSections(sections.filter(s => s.id !== secId));
    if (selectedSectionId === secId) {
      setSelectedSectionId('');
    }
  };

  const handleAddFieldToSection = () => {
    if (!selectedSectionId) {
      alert('Silakan buat / pilih salah satu section form terlebih dahulu!');
      return;
    }
    if (!newFieldLabel.trim()) return;

    const newField: CustomFieldDefinition = {
      id: `f-dy-${Date.now()}`,
      label: newFieldLabel.trim(),
      type: newFieldType,
      required: newFieldRequired,
      placeholder: `Masukkan ${newFieldLabel.trim()}...`
    };

    setSections(prev =>
      prev.map(sec => {
        if (sec.id === selectedSectionId) {
          return {
            ...sec,
            fields: [...sec.fields, newField]
          };
        }
        return sec;
      })
    );

    setNewFieldLabel('');
  };

  const handleRemoveFieldFromSection = (secId: string, fieldId: string) => {
    setSections(prev =>
      prev.map(sec => {
        if (sec.id === secId) {
          return {
            ...sec,
            fields: sec.fields.filter(f => f.id !== fieldId)
          };
        }
        return sec;
      })
    );
  };

  // 4. ADD TEXT OR IMAGE CONTENT BLOCKS (Bisa menambahkan teks keterangan / poster sponsor tambahan)
  const [contentBlocks, setContentBlocks] = useState<ContentBlock[]>([
    { id: 'block-init', type: 'text', title: 'Hadiah Kejuaraan (Prizepool)', value: 'Total hadiah mencapai Rp 50.000.000 disertai trofi medali fisik dan sertifikat elektronik nasional.' }
  ]);
  const [newBlockType, setNewBlockType] = useState<'text' | 'image'>('text');
  const [newBlockTitle, setNewBlockTitle] = useState('');
  const [newBlockVal, setNewBlockVal] = useState('');

  const handleAddContentBlock = () => {
    if (!newBlockVal.trim()) return;
    const newBlock: ContentBlock = {
      id: `block-dy-${Date.now()}`,
      type: newBlockType,
      title: newBlockTitle.trim() || undefined,
      value: newBlockVal.trim()
    };
    setContentBlocks([...contentBlocks, newBlock]);
    setNewBlockTitle('');
    setNewBlockVal('');
  };

  const handleRemoveContentBlock = (id: string) => {
    setContentBlocks(contentBlocks.filter(b => b.id !== id));
  };

  // Denah layout SEATING
  const [selectedSeatingPlan, setSelectedSeatingPlan] = useState<string>(SEATING_PRESETS[0].url);
  const [customSeatingUrl, setCustomSeatingUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !location || !rawDate) {
      alert('Harap isi Judul, Lokasi, dan Tanggal!');
      return;
    }

    const dateObj = new Date(rawDate);
    const months = ['JAN', 'PEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOP', 'DES'];
    const dateMonth = months[dateObj.getMonth()] || 'OKT';
    const dateDay = String(dateObj.getDate()).padStart(2, '0');

    // Indonesian Date string conversion
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const displayDayName = dayNames[dateObj.getDay()] || 'Sabtu';
    const displayMonthName = dateObj.toLocaleDateString('id-ID', { month: 'short' });
    const year = dateObj.getFullYear();

    const [hours, minutes] = timeStr.split(':');
    const hoursNum = parseInt(hours || '15');
    const formattedTime = `${String(hoursNum).padStart(2, '0')}:${String(minutes || '00').padStart(2, '0')} WIB`;
    const dateFullString = `${displayDayName}, ${dateDay} ${displayMonthName} ${year}, ${formattedTime}`;

    // Get prices
    const prices = tiers.map(t => t.price);
    const priceMin = Math.min(...prices, 0);
    const priceMax = Math.max(...prices, 1000000);

    const totalTickets = tiers.reduce((acc, current) => acc + current.slotsAvailable, 0);

    // Legacy fallback flat list of custom questions
    const flatLegacyFields: CustomFieldDefinition[] = [];
    sections.forEach(sec => {
      sec.fields.forEach(f => {
        flatLegacyFields.push(f);
      });
    });

    const registrationOpenTime = regOpenDate
      ? new Date(`${regOpenDate}T${regOpenTime || '00:00'}`).toISOString()
      : undefined;

    const newEvent: Event = {
      id: `evt-custom-${Date.now()}`,
      title,
      category,
      dateMonth,
      dateDay,
      dateFullString,
      dateISO: rawDate,
      location,
      priceMin,
      priceMax,
      imageUrl: customBannerUrl || CATEGORY_BANNER_PRESETS[category],
      description: description || 'Tidak ada deskripsi singkat yang dimasukkan.',
      organizer: organizer || 'EO SAGATIX',
      tag: tag || undefined,
      ticketsLeft: totalTickets,
      isSoldOut: totalTickets === 0,
      tiers: tiers,
      seatingChartUrl: customSeatingUrl || selectedSeatingPlan,
      registrationRoles: roles,
      formSections: sections,
      contentBlocks: contentBlocks,
      registrationOpenTime,
      customFormFields: flatLegacyFields.length > 0 ? flatLegacyFields : [
        { id: 'f-wa', label: 'Nomor WhatsApp', type: 'text', required: true }
      ]
    };

    onSaveEvent(newEvent);
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-xs"
      />

      {/* Kontainer Utama Form */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 20 }}
        className="relative bg-surface rounded-2xl shadow-2xl max-w-3xl w-full max-h-[96vh] flex flex-col overflow-hidden border border-outline-variant z-10"
      >
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-outline-variant flex items-center justify-between bg-surface-container-low shrink-0 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-primary text-white flex items-center justify-center shadow-sm">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-sm font-black text-on-surface tracking-tight uppercase">Admin Panel: Publikasi Acara</h2>
              <p className="text-[10px] text-on-surface-variant font-semibold">Konfigurasi lengkap custom tiket, kategori, form per-section, dan multi-content</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-surface-container text-on-surface flex items-center justify-center cursor-pointer active:scale-90"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Isi Formulir */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto no-scrollbar space-y-7 text-xs">
          
          {/* SEKSI 1: INFORMASI UMUM */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-1.5 border-b border-outline-variant/60 pb-2">
              <Briefcase className="w-4 h-4 text-primary" /> 1. Parameter Utama Acara
            </h3>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-on-surface-variant block uppercase tracking-wider">Judul Kontes / Acara *</label>
              <input
                type="text"
                required
                placeholder="Contoh: SAGATIX Pro League Tourney MLBB Cup"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-surface-container outline-hidden rounded-xl border border-outline px-4 py-2.5 text-xs focus:ring-1 focus:ring-primary text-on-surface font-semibold"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-on-surface-variant block uppercase tracking-wider">Kategori Kreatif</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Category)}
                  className="w-full bg-surface-container outline-hidden rounded-xl border border-outline px-3 py-2.5 text-xs focus:ring-1 focus:ring-primary text-on-surface cursor-pointer font-bold"
                >
                  <option value="Game">Game (E-Sports)</option>
                  <option value="Musik">Musik</option>
                  <option value="Olahraga">Olahraga</option>
                  <option value="Teknologi">Teknologi</option>
                  <option value="Konferensi">Konferensi</option>
                  <option value="Seni">Seni</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-on-surface-variant block uppercase tracking-wider">Slogan Pas / Label Promo</label>
                <input
                  type="text"
                  placeholder="Contoh: Terpopuler, Slot Terbatas, Turnamen Nasional"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  className="w-full bg-surface-container outline-hidden rounded-xl border border-outline px-4 py-2.5 text-xs focus:ring-1 focus:ring-primary text-on-surface font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-on-surface-variant block uppercase tracking-wider">Kalender Tanggal *</label>
                <input
                  type="date"
                  required
                  value={rawDate}
                  onChange={(e) => setRawDate(e.target.value)}
                  className="w-full bg-surface-container outline-hidden rounded-xl border border-outline px-4 py-2.5 text-xs focus:ring-1 focus:ring-primary text-on-surface font-bold pointer-events-auto cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-on-surface-variant block uppercase tracking-wider">Jam Mulai</label>
                <input
                  type="time"
                  value={timeStr}
                  onChange={(e) => setTimeStr(e.target.value)}
                  className="w-full bg-surface-container outline-hidden rounded-xl border border-outline px-4 py-2.5 text-xs focus:ring-1 focus:ring-primary text-on-surface font-bold cursor-pointer"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-on-surface-variant block uppercase tracking-wider">Lokasi Fisik / Venue Stadium *</label>
              <input
                type="text"
                required
                placeholder="Contoh: Istora Senayan, Jakarta / ICE BSD"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-surface-container outline-hidden rounded-xl border border-outline px-4 py-2.5 text-xs focus:ring-1 focus:ring-primary text-on-surface font-semibold"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-on-surface-variant block uppercase tracking-wider">Event Organizer (EO) Name</label>
                <input
                  type="text"
                  placeholder="Contoh: SAGATIX Championship"
                  value={organizer}
                  onChange={(e) => setOrganizer(e.target.value)}
                  className="w-full bg-surface-container outline-hidden rounded-xl border border-outline px-4 py-2.5 text-xs text-on-surface font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-on-surface-variant block uppercase tracking-wider">Poster Unsplash / Image URL</label>
                <input
                  type="url"
                  placeholder="Tempel link foto poster jika ada"
                  value={customBannerUrl}
                  onChange={(e) => setCustomBannerUrl(e.target.value)}
                  className="w-full bg-surface-container outline-hidden rounded-xl border border-outline px-4 py-2.5 text-xs text-on-surface"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-on-surface-variant block uppercase tracking-wider">Kutipan Deskripsi Singkat</label>
              <input
                type="text"
                placeholder="Tulis ringkasan satu baris mengenai turnamen / pertunjukan..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-surface-container outline-hidden rounded-xl border border-outline px-4 py-2.5 text-xs text-on-surface"
              />
            </div>

            {/* TANGGAL PEMBUKAAN PENDAFTARAN (CONTDOWN CONFIGURATION) */}
            <div className="bg-amber-500/5 border border-dashed border-amber-500/20 rounded-xl p-4 space-y-3">
              <div>
                <span className="text-[10px] font-black text-amber-600 block uppercase tracking-wider">🔒 Jadwalkan Pembukaan Pendaftaran (Countdown)</span>
                <span className="text-[9px] text-on-surface-variant font-medium block">Kosongkan jika pendaftaran langsung dibuka sejak dini secara publik.</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-on-surface-variant block uppercase tracking-wider">Tanggal Pembukaan</label>
                  <input
                    type="date"
                    value={regOpenDate}
                    onChange={(e) => setRegOpenDate(e.target.value)}
                    className="w-full bg-surface text-on-surface"
                    style={{
                      backgroundColor: 'rgba(230, 230, 230, 0.4)',
                      border: '1px solid #ccc',
                      borderRadius: '0.75rem',
                      padding: '0.625rem 1rem',
                      fontSize: '0.75rem',
                      fontWeight: 'bold'
                    }}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-on-surface-variant block uppercase tracking-wider">Jam Pembukaan</label>
                  <input
                    type="time"
                    value={regOpenTime}
                    onChange={(e) => setRegOpenTime(e.target.value)}
                    className="w-full bg-surface text-on-surface"
                    style={{
                      backgroundColor: 'rgba(230, 230, 230, 0.4)',
                      border: '1px solid #ccc',
                      borderRadius: '0.75rem',
                      padding: '0.625rem 1rem',
                      fontSize: '0.75rem',
                      fontWeight: 'bold'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* EDIT KATEGORI REGISTRASI (ROLES EDITOR) */}
          <div className="space-y-4 bg-surface-container p-4.5 rounded-xl border border-outline-variant">
            <h3 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-1.5 pb-2.5 border-b border-outline-variant/65">
              <HelpCircle className="w-4 h-4 text-primary" /> 2. Kelola Kategori Pendaftar (Custom Roles)
            </h3>
            
            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              Anda bisa mendefinisikan pendaftar itu sebagai apa (misal <strong>Penonton</strong>, atau diganti namanya menjadi <strong>Narasumber</strong>, <strong>Peserta Lomba</strong>, dll). Anda juga bisa menetapkan tipe turnamen (Team registration style).
            </p>

            {/* List Roles */}
            <div className="space-y-1.5 max-h-32 overflow-y-auto no-scrollbar pr-1">
              {roles.map(r => (
                <div key={r.id} className="flex justify-between items-center bg-surface p-2.5 rounded-lg border border-outline-variant text-[11px]">
                  <div>
                    <span className="font-extrabold text-on-surface">{r.name}</span>
                    <span className="text-[10px] text-on-surface-variant block">{r.description}</span>
                    <span className="text-[9px] text-primary font-bold block mt-0.5">Maks. Pembelian: {r.maxQuantity || 5} Tiket</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] px-2 py-0.5 rounded font-black ${
                      r.isTeamType ? 'bg-amber-100 text-amber-800 border border-amber-300/30' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {r.isTeamType ? '👥 KELOMPOK/TIM' : '👤 INDIVIDU'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveRole(r.id)}
                      className="text-on-surface-variant hover:text-error transition-colors p-1"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add New Custom Role Form */}
            <div className="bg-surface/50 p-3.5 rounded-xl border border-outline-variant/50 space-y-3.5">
              <span className="font-bold text-on-surface block">Tambah Kategori Peran Baru:</span>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="flex flex-col gap-1 text-[10px]">
                  <span className="font-semibold text-on-surface-variant">Nama Kategori</span>
                  <input
                    type="text"
                    placeholder="Nama (e.g. Narasumber, VIP)"
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    className="bg-surface outline-hidden border border-outline rounded-lg px-2.5 py-1.5 text-xs text-on-surface font-semibold"
                  />
                </div>
                <div className="flex flex-col gap-1 text-[10px]">
                  <span className="font-semibold text-on-surface-variant">Deskripsi Kategori</span>
                  <input
                    type="text"
                    placeholder="Deskripsi singkat..."
                    value={newRoleDesc}
                    onChange={(e) => setNewRoleDesc(e.target.value)}
                    className="bg-surface outline-hidden border border-outline rounded-lg px-2.5 py-1.5 text-xs text-on-surface"
                  />
                </div>
                <div className="flex flex-col gap-1 text-[10px]">
                  <span className="font-semibold text-on-surface-variant">Maks. Pembelian Tiket</span>
                  <div className="flex items-center gap-1.5 bg-surface border border-outline rounded-lg px-2.5 py-1.5 h-[34px]">
                    <input
                      type="number"
                      min="1"
                      max="100"
                      disabled={newRoleIsTeam}
                      value={newRoleIsTeam ? 1 : newRoleMaxQty}
                      onChange={(e) => setNewRoleMaxQty(Math.max(1, Number(e.target.value)))}
                      className="w-full bg-transparent text-xs text-on-surface outline-hidden font-bold"
                    />
                    <span className="text-[9px] font-bold text-on-surface-low shrink-0">tiket/tx</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-1">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="role-team-chkbx"
                    checked={newRoleIsTeam}
                    onChange={(e) => setNewRoleIsTeam(e.target.checked)}
                    className="w-4 h-4 text-primary border-outline rounded"
                  />
                  <label htmlFor="role-team-chkbx" className="text-on-surface font-semibold cursor-pointer select-none text-[11px]">
                    Tipe Registrasi Turnamen / Tim? (Maks. otomatis terkunci ke 1 slot)
                  </label>
                </div>

                <button
                  type="button"
                  onClick={handleAddRole}
                  className="bg-primary hover:opacity-95 text-on-primary px-4 py-1.5 rounded-lg font-black transition-all cursor-pointer shadow-xs flex items-center gap-1 text-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambahkan Kategori</span>
                </button>
              </div>
            </div>
          </div>

          {/* DYNAMIC TICKET TIERS BUILDER (Bisa 1, 2, 3 kelas, penamaan custom) */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-1.5 border-b border-outline-variant/60 pb-2">
              <Tag className="w-4 h-4 text-primary" /> 3. Pembagian Kelas Tiket (1, 2, 3 atau Lebih Kriteria)
            </h3>

            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              Buat dan sesuaikan kriteria sub-kelas tempat duduk penonton. Anda bebas mendaftarkan kelas apa saja tanpa batasan jumlah kriteria atau nama (bisa diisi 1 kelas tunggal saja).
            </p>

            {/* List Tiers */}
            <div className="space-y-2">
              {tiers.map((tier) => (
                <div key={tier.id} className="flex justify-between items-center bg-surface-container p-3 rounded-xl border border-outline-variant/70 text-[11px]">
                  <div>
                    <span className="font-extrabold text-on-surface text-xs block">{tier.name}</span>
                    <span className="text-[10px] text-on-surface-variant block">{tier.description}</span>
                    <span className="text-[10px] text-primary font-black mt-1 block">
                      Harga: Rp {tier.price.toLocaleString('id-ID')} | Kuota: {tier.slotsAvailable} Pendaftar
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveTier(tier.id)}
                    className="text-on-surface-variant hover:text-error p-2.5 transition-colors"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add New Ticket Tier Draft Area */}
            <div className="bg-surface-container p-4.5 rounded-2xl border border-outline-variant space-y-4">
              <span className="font-bold text-on-surface block">Buat Kelas Tiket Baru:</span>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-on-surface-muted uppercase">Nama Kelas *</span>
                  <input
                    type="text"
                    placeholder="Contoh: Tiket Early Bird"
                    value={newTierName}
                    onChange={(e) => setNewTierName(e.target.value)}
                    className="w-full bg-surface outline-hidden border border-outline rounded-lg px-2.5 py-1.5 text-xs text-on-surface font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-on-surface-muted uppercase">Harga (Rupiah Rp) *</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="Contoh: 150000"
                    value={newTierPrice}
                    onChange={(e) => setNewTierPrice(Number(e.target.value))}
                    className="w-full bg-surface outline-hidden border border-outline rounded-lg px-2.5 py-1.5 text-xs text-primary font-extrabold"
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <span className="text-[9px] font-black text-on-surface-muted uppercase">Keuntungan / Fasilitas</span>
                  <input
                    type="text"
                    placeholder="Fasilitas yang didapatkan..."
                    value={newTierDesc}
                    onChange={(e) => setNewTierDesc(e.target.value)}
                    className="w-full bg-surface outline-hidden border border-outline rounded-lg px-2.5 py-1.5 text-xs text-on-surface-variant font-medium"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-1 border-t border-outline-variant/30">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase">Kuota Kursi:</span>
                  <input
                    type="number"
                    min="1"
                    value={newTierSlots}
                    onChange={(e) => setNewTierSlots(Number(e.target.value))}
                    className="w-20 bg-surface outline-hidden border border-outline rounded-lg px-2 py-1 text-xs text-on-surface font-extrabold text-center"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAddTier}
                  className="bg-primary text-on-primary py-1.5 px-5 rounded-lg font-black tracking-wide flex items-center gap-1 hover:opacity-95 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambahkan Kelas</span>
                </button>
              </div>
            </div>
          </div>

          {/* SEGION-BY-SECTION FULL CUSTOM FORM BUILDER */}
          <div className="space-y-4 bg-surface-container/30 p-5 rounded-2xl border border-outline-variant/75">
            <h3 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-1.5 border-b border-outline-variant/60 pb-2.5">
              <FileText className="w-4 h-4 text-primary" /> 4. Desain Struktur Formulir Per-Section
            </h3>

            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              Anda bebas menetapkan pengisian formulir teratur berkelanjutan <strong>per-section</strong>. Misal Section Pertama diisi data <u>Ketua Tim</u>, Section Kedua diisi <u>Player 1</u>, ketiga <u>Player 2</u>, dan seterusnya hingga selesai/finish.
            </p>

            {/* Sections structure Visual Area */}
            <div className="space-y-3">
              {sections.length === 0 ? (
                <div className="text-center py-5 bg-surface text-on-surface-variant border border-dashed rounded-lg">
                  Belum ada section formulir pendaftaran. Silakan tambahkan satu di bawah.
                </div>
              ) : (
                sections.map((sec, sIdx) => (
                  <div key={sec.id} className="bg-surface rounded-xl p-3 border-2 border-primary/10 relative space-y-2">
                    <div className="flex justify-between items-center border-b border-outline-variant/35 pb-1.5">
                      <strong className="text-primary text-[11px] uppercase">{sec.title}</strong>
                      <button
                        type="button"
                        onClick={() => handleRemoveSection(sec.id)}
                        className="text-on-surface-variant hover:text-error transition-colors p-1"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Fields in this section */}
                    <div className="space-y-1">
                      {sec.fields.length === 0 ? (
                        <div className="text-[10px] text-on-surface-variant italic py-1 text-center">
                          Belum ada pertanyaan isian di section ini. Gunakan form tambah field di bawah.
                        </div>
                      ) : (
                        sec.fields.map(f => (
                          <div key={f.id} className="flex justify-between bg-surface-container px-2.5 py-1 text-[10px] rounded border border-outline-variant/30 font-medium">
                            <span>
                              📝 {f.label} ({f.type}) {f.required && <span className="text-red-500 font-black">*</span>}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveFieldFromSection(sec.id, f.id)}
                              className="text-on-surface-variant hover:text-red-500"
                            >
                              x
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Form Section Builder Controls */}
            <div className="bg-surface p-3.5 rounded-xl border border-outline-variant/40 space-y-3">
              <div className="flex gap-2 items-center">
                <span className="font-extrabold text-[10px] uppercase text-on-surface text-nowrap">Buat Section Baru:</span>
                <input
                  type="text"
                  placeholder="Contoh: Section 3: Detail Anggota Player 1"
                  value={newSectionTitle}
                  onChange={(e) => setNewSectionTitle(e.target.value)}
                  className="flex-grow bg-surface-container outline-hidden border border-outline rounded-lg px-2.5 py-1.5 text-xs text-on-surface"
                />
                <button
                  type="button"
                  onClick={handleAddSection}
                  className="bg-primary text-on-primary px-3 py-1.5 rounded-lg font-black transition-all cursor-pointer shadow-xs text-xs"
                >
                  Buat Section
                </button>
              </div>

              {sections.length > 0 && (
                <div className="bg-primary/5 p-3 rounded-lg border border-primary/10 space-y-3">
                  <span className="font-extrabold text-[10px] text-primary uppercase block">Injek Pertanyaan Isian ke Section:</span>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-black text-on-surface-variant">Pilih Target Section</span>
                      <select
                        value={selectedSectionId}
                        onChange={(e) => setSelectedSectionId(e.target.value)}
                        className="w-full bg-surface px-2 py-1.5 border border-outline rounded text-[10px]"
                      >
                        <option value="">-- Pilih target --</option>
                        {sections.map(s => (
                          <option key={s.id} value={s.id}>{s.title}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[9px] font-black text-on-surface-variant">Judul Label Pertanyaan</span>
                      <input
                        type="text"
                        placeholder="Contoh: ID MLBB Player"
                        value={newFieldLabel}
                        onChange={(e) => setNewFieldLabel(e.target.value)}
                        className="w-full bg-surface px-2 py-1.5 border border-outline rounded text-[10px] font-bold"
                      />
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[9px] font-black text-on-surface-variant">Tipe Input Formulir</span>
                      <select
                        value={newFieldType}
                        onChange={(e) => setNewFieldType(e.target.value as any)}
                        className="w-full bg-surface px-2 py-1.5 border border-outline rounded text-[10px]"
                      >
                        <option value="text">Teks Pendek</option>
                        <option value="email">Alamat Email</option>
                        <option value="number">Nomor WhatsApp / Angka</option>
                        <option value="textarea">Komentar / Deskriptif</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-outline-variant/30">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        id="chk-req-dy"
                        checked={newFieldRequired}
                        onChange={(e) => setNewFieldRequired(e.target.checked)}
                        className="w-3.5 h-3.5"
                      />
                      <label htmlFor="chk-req-dy" className="text-[10px] select-none cursor-pointer font-semibold text-on-surface-variant">
                        Pertanyaan ini Wajib Diisi (Required)
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddFieldToSection}
                      className="bg-primary text-on-primary px-4 py-1 rounded font-black text-[10px]"
                    >
                      + Pasangkan ke Section
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* DYNAMIC TEXT OR IMAGE BLOCKS */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-1.5 border-b border-outline-variant/60 pb-2">
              <Layers className="w-4.5 h-4.5 text-primary" /> 5. Tambah Blok Keterangan / Gambar Poster
            </h3>
            
            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              Anda bisa menyisipkan blok tulisan spesifik (seperti Syarat, Ketentuan, Aturan Keamanan) ataupun poster sponsor langsung ke halaman deskripsi panggung acara.
            </p>

            {/* Content blocks list */}
            {contentBlocks.length > 0 && (
              <div className="space-y-2">
                {contentBlocks.map(b => (
                  <div key={b.id} className="flex justify-between items-center bg-surface-container p-3 rounded-lg border border-outline-variant text-[11px]/normal">
                    <div className="flex items-center gap-2 max-w-[85%]">
                      <span className="font-extrabold uppercase text-[9px] bg-primary/10 text-primary px-2 rounded-sm shrink-0">
                        {b.type}
                      </span>
                      <div className="truncate">
                        {b.title && <strong className="text-on-surface block truncate">{b.title}</strong>}
                        <span className="text-on-surface-variant truncate block">{b.value}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveContentBlock(b.id)}
                      className="text-on-surface-variant hover:text-error transition-colors p-1 shrink-0"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Create block construct */}
            <div className="bg-surface-container p-3.5 rounded-xl border border-outline-variant/60 space-y-3">
              <span className="font-bold text-on-surface block">Tambahkan Content Block Baru:</span>
              
              <div className="flex gap-3 text-[10px]">
                <button
                  type="button"
                  onClick={() => setNewBlockType('text')}
                  className={`px-3 py-1 rounded border-2 font-bold transition-all cursor-pointer ${
                    newBlockType === 'text' ? 'border-primary bg-primary/10 text-primary' : 'border-outline-variant text-on-surface-variant'
                  }`}
                >
                  Sajian Teks Paragraf
                </button>
                <button
                  type="button"
                  onClick={() => setNewBlockType('image')}
                  className={`px-3 py-1 rounded border-2 font-bold transition-all cursor-pointer ${
                    newBlockType === 'image' ? 'border-primary bg-primary/10 text-primary' : 'border-outline-variant text-on-surface-variant'
                  }`}
                >
                  Sajian Gambar Poster
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-0.5">
                  <span className="text-[9px] text-on-surface uppercase font-black">Judul Blok</span>
                  <input
                    type="text"
                    placeholder="Contoh: Sponsor Kami / Syarat Pertandingan"
                    value={newBlockTitle}
                    onChange={(e) => setNewBlockTitle(e.target.value)}
                    className="w-full bg-surface px-2 py-1.5 border border-outline rounded text-[10px] font-semibold"
                  />
                </div>
                <div className="md:col-span-2 space-y-0.5">
                  <span className="text-[9px] text-on-surface uppercase font-black">
                    {newBlockType === 'text' ? 'Isi Teks Paragraf' : 'Tautan Teks Alamat URL Gambar'}
                  </span>
                  <input
                    type="text"
                    placeholder={newBlockType === 'text' ? 'Ketik penjelasan lengkap...' : 'https://unsplash.com/fokus-poster.png'}
                    value={newBlockVal}
                    onChange={(e) => setNewBlockVal(e.target.value)}
                    className="w-full bg-surface px-2 py-1.5 border border-outline rounded text-[10px]"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleAddContentBlock}
                  className="bg-primary hover:opacity-95 text-on-primary px-4 py-1 rounded-lg font-black tracking-wide text-[10px] cursor-pointer"
                >
                  + Ikat ke Detail Event
                </button>
              </div>
            </div>
          </div>

          {/* CHOOSE SEATING MAP */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-1.5 border-b border-outline-variant/60 pb-2">
              <Image className="w-4 h-4 text-primary" /> 6. Denah / Layout Blueprint Kamar Panggung
            </h3>
            
            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              Pilih denah layout panggung yang cocok dengan preset acara Anda atau tempel link denah kustom Anda. Halaman detail hanya akan memajang denah ini untuk kenyamanan pelunasan informasi tribun.
            </p>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
              {SEATING_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => {
                    setSelectedSeatingPlan(preset.url);
                    setCustomSeatingUrl('');
                  }}
                  className={`relative h-16 rounded-lg overflow-hidden border cursor-pointer ${
                    selectedSeatingPlan === preset.url && !customSeatingUrl ? 'border-primary ring-2 ring-primary/40' : 'border-outline-variant hover:border-outline'
                  }`}
                >
                  <img src={preset.url} alt={preset.name} className="w-full h-full object-cover opacity-80" />
                  <div className="absolute inset-0 bg-black/60 flex items-end p-2">
                    <span className="text-[8px] font-black text-white leading-tight uppercase">{preset.name}</span>
                  </div>
                </button>
              ))}
            </div>

            <input
              type="url"
              placeholder="Atau tempel link denah kustom Anda: https://..."
              value={customSeatingUrl}
              onChange={(e) => setCustomSeatingUrl(e.target.value)}
              className="w-full bg-surface-container outline-hidden rounded-xl border border-outline px-4 py-2 text-[10px]"
            />
          </div>

          {/* FOOTER ACTION BUTTONS */}
          <div className="pt-4 flex justify-end gap-3 sticky bottom-0 bg-surface py-3 border-t border-outline-variant shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-full border border-outline hover:bg-surface-container-high transition-colors font-bold text-xs text-on-surface cursor-pointer"
            >
              Batalkan
            </button>
            <button
              type="submit"
              className="bg-primary text-on-primary px-7 py-2.5 rounded-full font-black text-xs hover:opacity-95 transition-all shadow-md flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-white" />
              <span>Publikasikan Acara</span>
            </button>
          </div>

        </form>
      </motion.div>
    </div>
  );
};
