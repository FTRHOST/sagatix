import React, { useState } from 'react';
import { Event, Category, TicketTier, CustomFieldDefinition, FormSection, RegistrationRoleConfig, ContentBlock } from '../types';
import { X, Calendar, MapPin, Tag, Image, Briefcase, Sparkles, Plus, Trash, HelpCircle, FileText, ChevronRight, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CreateEventModalProps {
  onClose: () => void;
  onSaveEvent: (newEvent: Event) => void;
  eventData?: Event; // Support editing existing events
  currentUser?: { fullName: string; email: string; role?: 'superadmin' | 'admin' | 'biasa'; assignedOrganizer?: string } | null;
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
  eventData,
  currentUser
}) => {
  // Confirmation and local draft states
  const [showConfirmPublish, setShowConfirmPublish] = useState(false);
  const [pendingEvent, setPendingEvent] = useState<Event | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // State Utama Formulir Acara - Start empty unless eventData exists
  const [title, setTitle] = useState(eventData?.title || '');
  const [category, setCategory] = useState<Category>(eventData?.category || 'Game');
  const [location, setLocation] = useState(eventData?.location || '');
  const [rawDate, setRawDate] = useState(eventData?.dateISO || '');
  const [timeStr, setTimeStr] = useState(
    eventData?.dateFullString?.split(', ').pop()?.split(' ')[0] || '15:00'
  );
  const [description, setDescription] = useState(eventData?.description || '');
  const [organizer, setOrganizer] = useState(eventData?.organizer || (currentUser?.role === 'admin' ? currentUser?.assignedOrganizer : '') || '');
  const [customBannerUrl, setCustomBannerUrl] = useState(eventData?.imageUrl || '');
  const [tag, setTag] = useState(eventData?.tag || '');
  
  // Registration Open Countdown / Lock Configuration
  const [regOpenDate, setRegOpenDate] = useState(
    eventData?.registrationOpenTime?.split('T')[0] || ''
  );
  const [regOpenTime, setRegOpenTime] = useState(
    eventData?.registrationOpenTime?.split('T')[1]?.slice(0, 5) || ''
  );

  // Check for existing draft on mount (skip draft check if editing an event)
  React.useEffect(() => {
    if (eventData) return;
    const draft = localStorage.getItem('sagatix_create_event_draft');
    if (draft) {
      setHasDraft(true);
    }
  }, [eventData]);

  const handleRestoreDraft = () => {
    const draftStr = localStorage.getItem('sagatix_create_event_draft');
    if (draftStr) {
      try {
        const draft = JSON.parse(draftStr);
        if (draft.title !== undefined) setTitle(draft.title);
        if (draft.category !== undefined) setCategory(draft.category);
        if (draft.location !== undefined) setLocation(draft.location);
        if (draft.rawDate !== undefined) setRawDate(draft.rawDate);
        if (draft.timeStr !== undefined) setTimeStr(draft.timeStr);
        if (draft.description !== undefined) setDescription(draft.description);
        if (draft.organizer !== undefined) setOrganizer(draft.organizer);
        if (draft.customBannerUrl !== undefined) setCustomBannerUrl(draft.customBannerUrl);
        if (draft.tag !== undefined) setTag(draft.tag);
        if (draft.regOpenDate !== undefined) setRegOpenDate(draft.regOpenDate);
        if (draft.regOpenTime !== undefined) setRegOpenTime(draft.regOpenTime);
        if (draft.tiers !== undefined) setTiers(draft.tiers);
        if (draft.roles !== undefined) setRoles(draft.roles);
        if (draft.contentBlocks !== undefined) setContentBlocks(draft.contentBlocks);
        if (draft.selectedSeatingPlan !== undefined) setSelectedSeatingPlan(draft.selectedSeatingPlan);
        if (draft.customSeatingUrl !== undefined) setCustomSeatingUrl(draft.customSeatingUrl);
        setHasDraft(false);
      } catch (e) {
        console.error("Failed to parse event draft", e);
      }
    }
  };

  const handleClearDraft = () => {
    localStorage.removeItem('sagatix_create_event_draft');
    setHasDraft(false);
  };

  // 1. DYNAMIC TICKET TIERS EDITOR - Start empty for manual configuration
  const [tiers, setTiers] = useState<TicketTier[]>(eventData?.tiers || []);
  const [newTierName, setNewTierName] = useState('');
  const [newTierPrice, setNewTierPrice] = useState(100000);
  const [newTierDesc, setNewTierDesc] = useState('');
  const [newTierSlots, setNewTierSlots] = useState(50);

  const handleAddTier = () => {
    if (!newTierName.trim()) return;
    const newTier: TicketTier = {
      id: `tier-dy-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
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
    setTiers(tiers.filter(t => t.id !== id));
  };

  // 2. CUSTOM REGISTRANT ROLE OPTIONS - Start empty for manual configuration (Requirement 4)
  const [roles, setRoles] = useState<RegistrationRoleConfig[]>(eventData?.registrationRoles || []);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [newRoleIsTeam, setNewRoleIsTeam] = useState(false);
  const [newRoleMaxQty, setNewRoleMaxQty] = useState<number>(5);

  const handleAddRole = () => {
    if (!newRoleName.trim()) return;
    const newRole: RegistrationRoleConfig = {
      id: `role-dy-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name: newRoleName.trim(),
      isTeamType: newRoleIsTeam,
      maxQuantity: newRoleIsTeam ? 1 : Number(newRoleMaxQty) || 5,
      description: newRoleDesc.trim() || 'Akses pendaftaran khusus.',
      formSections: [],
      allowedTierIds: tiers.map(t => t.id)
    };
    setRoles([...roles, newRole]);
    setNewRoleName('');
    setNewRoleDesc('');
    setNewRoleIsTeam(false);
    setNewRoleMaxQty(5);
    setValidationErrors(prev => ({ ...prev, roles: "" }));
  };

  const handleRemoveRole = (id: string) => {
    setRoles(roles.filter(r => r.id !== id));
    if (selectedRoleIdForForm === id) {
      setSelectedRoleIdForForm('');
    }
  };

  // Active Category / Role for designing Custom Form (Requirement 3)
  const [selectedRoleIdForForm, setSelectedRoleIdForForm] = useState(
    eventData?.registrationRoles?.[0]?.id || ''
  );

  // Automatically select the first category if none is active
  React.useEffect(() => {
    if (roles.length > 0 && !selectedRoleIdForForm) {
      setSelectedRoleIdForForm(roles[0].id);
    }
  }, [roles, selectedRoleIdForForm]);

  const currentRoleForForm = roles.find(r => r.id === selectedRoleIdForForm);
  const sections = currentRoleForForm?.formSections || [];

  const setActiveRoleSections = (newSecs: FormSection[] | ((prev: FormSection[]) => FormSection[])) => {
    setRoles(prevRoles =>
      prevRoles.map(r => {
        if (r.id === selectedRoleIdForForm) {
          const currentSections = r.formSections || [];
          const updatedSections = typeof newSecs === 'function' ? newSecs(currentSections) : newSecs;
          return { ...r, formSections: updatedSections };
        }
        return r;
      })
    );
  };

  const [newSectionTitle, setNewSectionTitle] = useState('');

  // Fields to append to a section
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<'text' | 'number' | 'textarea' | 'email'>('text');
  const [newFieldRequired, setNewFieldRequired] = useState(true);
  const [newFieldAllowedTiers, setNewFieldAllowedTiers] = useState<string[]>([]);

  const handleAddSection = () => {
    if (!newSectionTitle.trim()) return;
    const newSec: FormSection = {
      id: `sec-dy-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      title: newSectionTitle.trim(),
      fields: []
    };
    setActiveRoleSections(prev => [...prev, newSec]);
    if (!selectedSectionId) {
      setSelectedSectionId(newSec.id);
    }
    setNewSectionTitle('');
  };

  const handleRemoveSection = (secId: string) => {
    setActiveRoleSections(prev => prev.filter(s => s.id !== secId));
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
      id: `f-dy-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      label: newFieldLabel.trim(),
      type: newFieldType,
      required: newFieldRequired,
      placeholder: `Masukkan ${newFieldLabel.trim()}...`,
      allowedTierIds: newFieldAllowedTiers.length > 0 ? newFieldAllowedTiers : undefined
    };

    setActiveRoleSections(prev =>
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
    setNewFieldAllowedTiers([]);
  };

  const handleRemoveFieldFromSection = (secId: string, fieldId: string) => {
    setActiveRoleSections(prev =>
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

  // 4. ADD TEXT OR IMAGE CONTENT BLOCKS - Start empty (Requirement 4)
  const [contentBlocks, setContentBlocks] = useState<ContentBlock[]>(eventData?.contentBlocks || []);
  const [newBlockType, setNewBlockType] = useState<'text' | 'image'>('text');
  const [newBlockTitle, setNewBlockTitle] = useState('');
  const [newBlockVal, setNewBlockVal] = useState('');

  const handleAddContentBlock = () => {
    if (!newBlockVal.trim()) return;
    const newBlock: ContentBlock = {
      id: `block-dy-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
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
  const [selectedSeatingPlan, setSelectedSeatingPlan] = useState<string>(
    eventData?.seatingChartUrl && SEATING_PRESETS.find(p => p.url === eventData.seatingChartUrl)
      ? eventData.seatingChartUrl
      : SEATING_PRESETS[0].url
  );
  const [customSeatingUrl, setCustomSeatingUrl] = useState(
    eventData?.seatingChartUrl && !SEATING_PRESETS.find(p => p.url === eventData.seatingChartUrl)
      ? eventData.seatingChartUrl
      : ''
  );

  // Debounced Autosave draft to local storage (Requirement 5 - Combats sluggish typing lag)
  React.useEffect(() => {
    if (eventData) return; // Skip saving draft when editing an event
    const timer = setTimeout(() => {
      if (title || location || description || organizer || tiers.length > 0 || roles.length > 0) {
        const draft = {
          title, category, location, rawDate, timeStr, description, organizer, customBannerUrl, tag, regOpenDate, regOpenTime, tiers, roles, contentBlocks, selectedSeatingPlan, customSeatingUrl
        };
        localStorage.setItem('sagatix_create_event_draft', JSON.stringify(draft));
      }
    }, 1000); // 1 second debounce
    return () => clearTimeout(timer);
  }, [title, category, location, rawDate, timeStr, description, organizer, customBannerUrl, tag, regOpenDate, regOpenTime, tiers, roles, contentBlocks, selectedSeatingPlan, customSeatingUrl, eventData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Manual validation checks (Requirement 4)
    const errors: Record<string, string> = {};
    if (!title.trim()) errors.title = "Judul acara wajib diisi!";
    if (!location.trim()) errors.location = "Lokasi acara / venue wajib diisi!";
    if (!rawDate.trim()) errors.rawDate = "Tanggal kalender wajib diisi!";
    if (tiers.length === 0) errors.tiers = "Wajib menambahkan minimal 1 kelas tiket pendaftaran!";
    if (roles.length === 0) errors.roles = "Wajib menambahkan minimal 1 kategori pendaftar!";

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      alert('Harap lengkapi semua isian yang wajib diisi dan periksa kembali format form!');
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
    const priceMin = prices.length > 0 ? Math.min(...prices) : 0;
    const priceMax = prices.length > 0 ? Math.max(...prices) : 0;

    const totalTickets = tiers.reduce((acc, current) => acc + current.slotsAvailable, 0);

    // Legacy fallback flat list of custom questions
    const flatLegacyFields: CustomFieldDefinition[] = [];
    roles.forEach(role => {
      const roleSecs = role.formSections || [];
      roleSecs.forEach(sec => {
        sec.fields.forEach(f => {
          flatLegacyFields.push(f);
        });
      });
    });

    const registrationOpenTime = regOpenDate
      ? new Date(`${regOpenDate}T${regOpenTime || '00:00'}`).toISOString()
      : undefined;

    const newEvent: Event = {
      id: eventData?.id || `evt-custom-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
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
      formSections: sections, // active role form sections
      contentBlocks: contentBlocks,
      registrationOpenTime,
      customFormFields: flatLegacyFields.length > 0 ? flatLegacyFields : [
        { id: 'f-wa', label: 'Nomor WhatsApp', type: 'text', required: true }
      ]
    };

    setPendingEvent(newEvent);
    setShowConfirmPublish(true);
  };

  const handleConfirmPublish = () => {
    if (pendingEvent) {
      onSaveEvent(pendingEvent);
      localStorage.removeItem('sagatix_create_event_draft');
    }
    setShowConfirmPublish(false);
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
          
          {hasDraft && (
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-3.5 flex items-center justify-between text-xs mb-4">
              <div className="space-y-0.5 text-left">
                <span className="font-extrabold text-primary block">Draf Pembuatan Acara Ditemukan!</span>
                <span className="text-on-surface-variant font-medium text-[10px]">Anda memiliki progres pembuatan acara sebelumnya yang tersimpan di perangkat.</span>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleRestoreDraft}
                  className="bg-primary text-on-primary font-black px-3 py-1.5 rounded-lg cursor-pointer hover:opacity-90 active:scale-95 transition-all text-[11px]"
                >
                  Pulihkan Draf
                </button>
                <button
                  type="button"
                  onClick={handleClearDraft}
                  className="bg-surface border border-outline hover:bg-slate-50 font-bold px-3 py-1.5 rounded-lg cursor-pointer text-on-surface transition-all text-[11px]"
                >
                  Hapus Draf
                </button>
              </div>
            </div>
          )}
          
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
              {validationErrors.title && (
                <p className="text-red-500 text-[10px] font-bold mt-1 text-left">{validationErrors.title}</p>
              )}
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
                {validationErrors.rawDate && (
                  <p className="text-red-500 text-[10px] font-bold mt-1 text-left">{validationErrors.rawDate}</p>
                )}
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
              {validationErrors.location && (
                <p className="text-red-500 text-[10px] font-bold mt-1 text-left">{validationErrors.location}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-on-surface-variant block uppercase tracking-wider">Event Organizer (EO) Name</label>
                <input
                  type="text"
                  placeholder="Contoh: SAGATIX Championship"
                  value={organizer}
                  onChange={(e) => setOrganizer(e.target.value)}
                  disabled={currentUser?.role === 'admin'}
                  className={`w-full bg-surface-container outline-hidden rounded-xl border border-outline px-4 py-2.5 text-xs text-on-surface font-medium ${currentUser?.role === 'admin' ? 'opacity-70 cursor-not-allowed' : ''}`}
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
             <div className="space-y-1.5 max-h-64 overflow-y-auto no-scrollbar pr-1">
              {roles.map(r => (
                <div key={r.id} className="flex justify-between items-start bg-surface p-2.5 rounded-lg border border-outline-variant text-[11px] gap-2.5">
                  <div className="flex-grow min-w-0">
                    <span className="font-extrabold text-on-surface">{r.name}</span>
                    <span className="text-[10px] text-on-surface-variant block">{r.description}</span>
                    <span className="text-[9px] text-primary font-bold block mt-0.5">Maks. Pembelian: {r.maxQuantity || 5} Tiket</span>
                    
                    {/* Checkbox list of allowed tiers (Requirement 1) */}
                    {tiers.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-outline-variant/40 space-y-1">
                        <span className="text-[9px] font-black text-slate-500 block uppercase tracking-wider">Batasi Kelas Tiket Khusus Kategori Ini:</span>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                          {tiers.map(t => {
                            const isAllowed = !r.allowedTierIds || r.allowedTierIds.length === 0 || r.allowedTierIds.includes(t.id);
                            const checkboxId = `role-${r.id}-tier-${t.id}`;
                            return (
                              <label key={t.id} htmlFor={checkboxId} className="flex items-center gap-1 cursor-pointer text-[10px] text-on-surface font-bold select-none">
                                <input
                                  type="checkbox"
                                  id={checkboxId}
                                  checked={isAllowed}
                                  onChange={(e) => {
                                    const currentAllowed = r.allowedTierIds || tiers.map(x => x.id);
                                    let newAllowed: string[];
                                    if (e.target.checked) {
                                      newAllowed = [...currentAllowed, t.id];
                                    } else {
                                      newAllowed = currentAllowed.filter(id => id !== t.id);
                                    }
                                    setRoles(prev => prev.map(x => {
                                      if (x.id === r.id) {
                                        return { ...x, allowedTierIds: newAllowed };
                                      }
                                      return x;
                                    }));
                                  }}
                                  className="rounded text-primary focus:ring-primary w-3 h-3 cursor-pointer border-outline-variant"
                                />
                                <span>{t.name}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[9px] px-2 py-0.5 rounded font-black ${
                      r.isTeamType ? 'bg-amber-100 text-amber-800 border border-amber-300/30' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {r.isTeamType ? '👥 KELOMPOK/TIM' : '👤 INDIVIDU'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveRole(r.id)}
                      className="text-on-surface-variant hover:text-error transition-colors p-1 cursor-pointer"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {validationErrors.roles && (
              <p className="text-red-500 text-[11px] font-bold mt-1 text-left">{validationErrors.roles}</p>
            )}

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
            {validationErrors.tiers && (
              <p className="text-red-500 text-[11px] font-bold mt-1 text-left">{validationErrors.tiers}</p>
            )}

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

            {/* Category Selector Dropdown for Role-Specific Form Building */}
            <div className="bg-primary/5 p-4 rounded-xl border border-primary/15 space-y-2 text-left">
              <label className="text-[10px] font-black uppercase text-primary block">Pilih Kategori Registrasi untuk Formulir Ini:</label>
              {roles.length === 0 ? (
                <div className="text-xs text-amber-800 font-bold bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                  ⚠️ Belum ada kategori pendaftar yang dibuat. Tambahkan kategori pendaftar di Langkah 2 terlebih dahulu!
                </div>
              ) : (
                <select
                  value={selectedRoleIdForForm}
                  onChange={(e) => setSelectedRoleIdForForm(e.target.value)}
                  className="w-full bg-surface px-3 py-2 border border-outline rounded-xl text-xs font-bold text-on-surface focus:ring-1 focus:ring-primary outline-hidden"
                >
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name} {r.isTeamType ? '(Kelompok/Tim)' : '(Individu)'}</option>
                  ))}
                </select>
              )}
            </div>

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

                  {/* Select Tiers restriction for this field (Requirement 5) */}
                  {tiers.length > 0 && (
                    <div className="space-y-1 mt-2 pt-2 border-t border-outline-variant/30 text-left">
                      <span className="text-[9px] font-black text-on-surface-variant uppercase tracking-wider block">Batasi Pertanyaan Ini Hanya Untuk Kelas Tiket Tertentu (Opsional):</span>
                      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-1">
                        {tiers.map(t => {
                          const isChecked = newFieldAllowedTiers.includes(t.id);
                          return (
                            <label key={t.id} className="flex items-center gap-1.5 cursor-pointer text-[10px] text-on-surface font-bold select-none">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setNewFieldAllowedTiers([...newFieldAllowedTiers, t.id]);
                                  } else {
                                    setNewFieldAllowedTiers(newFieldAllowedTiers.filter(id => id !== t.id));
                                  }
                                }}
                                className="rounded text-primary focus:ring-primary w-3.5 h-3.5 cursor-pointer border-outline-variant"
                              />
                              <span>{t.name}</span>
                            </label>
                          );
                        })}
                      </div>
                      <p className="text-[8px] text-on-surface-variant italic leading-normal">
                        * Biarkan kosong jika pertanyaan ini berlaku untuk semua kelas tiket (Contoh: pertanyaan "Pantangan Makanan" hanya dicentang untuk kelas tiket "VIP").
                      </p>
                    </div>
                  )}

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

      {/* Confirmation Dialog Overlay */}
      <AnimatePresence>
        {showConfirmPublish && (
          <div className="fixed inset-0 z-200 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
              onClick={() => setShowConfirmPublish(false)}
            />
            {/* Confirmation Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              className="relative bg-surface rounded-2xl border border-outline-variant p-6 max-w-sm w-full space-y-4 shadow-2xl text-center z-10"
            >
              <Sparkles className="w-12 h-12 text-primary mx-auto animate-pulse" />
              <div className="space-y-1">
                <h3 className="font-extrabold text-sm text-on-surface uppercase tracking-tight">Konfirmasi Publikasi Acara</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Apakah Anda yakin ingin mempublikasikan acara <strong className="text-on-surface">"{title}"</strong> ke database Firebase? Acara ini akan langsung aktif di katalog.
                </p>
              </div>
              <div className="flex gap-2 pt-2 text-xs">
                <button
                  type="button"
                  onClick={() => setShowConfirmPublish(false)}
                  className="flex-1 bg-surface border border-outline hover:bg-slate-50 font-bold py-2.5 rounded-xl cursor-pointer text-on-surface transition-all"
                >
                  Kembali Edit
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPublish}
                  className="flex-1 bg-primary text-on-primary font-black py-2.5 rounded-xl cursor-pointer hover:opacity-95 shadow-sm transition-all"
                >
                  Ya, Publikasikan!
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
