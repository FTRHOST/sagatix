import React, { useState, useMemo, useEffect } from 'react';
import { Category, Event, PurchasedTicket, LandingPageConfig, TicketTier } from './types';
import { INITIAL_EVENTS } from './mockData';
import { 
  auth, 
  db, 
  signInWithGoogle, 
  logoutUser, 
  OperationType, 
  handleFirestoreError,
  sanitizeForFirestore
} from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc,
  onSnapshot, 
  collection, 
  updateDoc, 
  query, 
  where,
  deleteDoc
} from 'firebase/firestore';
import { EventCard } from './components/EventCard';
import { EventDetailPage } from './components/EventDetailPage';
import { CreateEventModal } from './components/CreateEventModal';
import { MyTicketsView } from './components/MyTicketsView';
import { QRScanner } from './components/QRScanner';
import {
  Compass,
  Ticket,
  Sparkles,
  Search,
  SlidersHorizontal,
  Plus,
  Heart,
  Grid,
  List,
  MapPin,
  HelpCircle,
  User,
  Coffee,
  Calendar,
  X,
  CreditCard,
  CheckCircle,
  ArrowRight,
  Pin,
  FolderPlus,
  Folder,
  QrCode,
  ShieldAlert,
  Camera,
  RefreshCw,
  Clock,
  Trash,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  // Navigation Tab Utama: 'explore' | 'tickets' | 'help' | 'admin' (Requirement 3 & 10)
  const [activeTab, setActiveTab] = useState<'explore' | 'tickets' | 'help' | 'admin'>('explore');
  const [adminSubTab, setAdminSubTab] = useState<'scanner' | 'config' | 'sandbox' | 'events' | 'users'>('events');
  const [eventToEdit, setEventToEdit] = useState<Event | null>(null);
  const [selectedManageSeatsEvent, setSelectedManageSeatsEvent] = useState<Event | null>(null);
  const [selectedManageSeatsTier, setSelectedManageSeatsTier] = useState<TicketTier | null>(null);
  const [selectedRegistrantsEvent, setSelectedRegistrantsEvent] = useState<Event | null>(null);
  const [registrantSearchQuery, setRegistrantSearchQuery] = useState('');

  // Authentication State (Requirement 8)
  const [currentUser, setCurrentUser] = useState<{ fullName: string; email: string; role?: 'superadmin' | 'admin' | 'biasa'; assignedOrganizer?: string } | null>(() => {
    const saved = localStorage.getItem('sagatix_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [allUsers, setAllUsers] = useState<any[]>([]); // To manage users via superadmin
  const [authLoading, setAuthLoading] = useState(true);

  // Configuration settings for Landing Page CTA and Tips (Requirement: Admin Landing Page Config)
  const [landingConfig, setLandingConfig] = useState<LandingPageConfig>({
    ctaTitle: 'Platform Pendaftaran Kompetisi & Konser Terintegrasi',
    ctaDescription: 'Gunakan kode promo SAGATIX2026 saat pembayaran tiket berbayar untuk diskon Rp 25.000 khusus pengguna baru terdaftar.',
    ctaButtonText: 'Pesan Tiket Sekarang',
    promoCode: 'SAGATIX2026',
    tips: [
      'Gunakan koneksi internet yang stabil saat berebut tiket (War Ticket).',
      'Lengkapi data anggota tim Anda terlebih dahulu untuk pendaftaran lomba.',
      'Unduh file e-tiket berformat PNG secara offline sebelum memasuki arena stadium.',
      'Layanan bantuan Sagatix aktif 24 jam untuk membantu jika Anda mengalami kendala pembayaran.'
    ],
    ctaLink: '#explore-catalog',
    isCtaEnabled: true,
    isTipsEnabled: true,
    platformFeePercent: 5,
    isPlatformFeeEnabled: true
  });

  const [draftLandingConfig, setDraftLandingConfig] = useState<LandingPageConfig | null>(null);
  
  const activeLandingConfig = draftLandingConfig || landingConfig;

  const handleUpdateDraftLandingConfig = (updater: (prev: LandingPageConfig) => LandingPageConfig) => {
    setDraftLandingConfig(prev => {
      const base = prev || landingConfig;
      return updater(base);
    });
  };

  // State Utama Aplikasi
  const [events, setEvents] = useState<Event[]>(INITIAL_EVENTS);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [purchasedTickets, setPurchasedTickets] = useState<PurchasedTicket[]>([]);

  // Pin State (Requirement 6)
  const [pinnedEventIds, setPinnedEventIds] = useState<string[]>([]);

  // Firebase auth state synchronizer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          let role: 'superadmin' | 'admin' | 'biasa' = 'biasa';
          let fullName = user.displayName || user.email?.split('@')[0] || 'Pengguna Google';
          let assignedOrganizer = '';
          
          try {
            const userDocRef = doc(db, 'users', user.uid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
              const userData = userDocSnap.data();
              role = userData.role || 'biasa';
              fullName = userData.fullName || fullName;
              assignedOrganizer = userData.assignedOrganizer || '';
            } else {
              if (user.email === 'fathironmy4@gmail.com' || user.email === 'fathironmy@gmail.com') {
                role = 'superadmin'; // Initialize original email as superadmin
              }
              await setDoc(userDocRef, {
                fullName: fullName,
                email: user.email || '',
                role: role,
                createdAt: new Date().toISOString()
              });

              if (role === ('admin' as 'superadmin' | 'admin' | 'biasa') || role === 'superadmin') {
                await setDoc(doc(db, 'admins', user.uid), {
                  email: user.email,
                  createdAt: new Date().toISOString()
                });
              }
            }
          } catch (e) {
            console.error("Error loading/saving user profile in Firestore:", e);
          }

          if (user.email === 'fathironmy4@gmail.com' || user.email === 'fathironmy@gmail.com') {
            role = 'superadmin';
          }

          const enrichedUser = {
            fullName: fullName,
            email: user.email || '',
            role: role,
            assignedOrganizer: assignedOrganizer
          };
          setCurrentUser(enrichedUser);
          localStorage.setItem('sagatix_user', JSON.stringify(enrichedUser));
        } else {
          setCurrentUser(null);
          localStorage.removeItem('sagatix_user');
        }
      } finally {
        setAuthLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch all users if current user is superadmin
  useEffect(() => {
    if (currentUser?.role === 'superadmin') {
      const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
        const usersList: any[] = [];
        snapshot.forEach((doc) => {
          usersList.push({ id: doc.id, ...doc.data() });
        });
        setAllUsers(usersList);
      }, (error) => {
        console.error("Error fetching users:", error);
      });
      return () => unsubscribe();
    }
  }, [currentUser?.role]);

  // Real-time Firestore Sync for Events collection (and Seeding)
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'events'), (snapshot) => {
      if (snapshot.empty) {
        const seedEvents = async () => {
          try {
            for (const evt of INITIAL_EVENTS) {
              await setDoc(doc(db, 'events', evt.id), sanitizeForFirestore(evt));
            }
          } catch (err) {
            console.error("Error seeding initial events to Firestore:", err);
          }
        };
        seedEvents();
      } else {
        const loadedEvents: Event[] = [];
        snapshot.forEach((doc) => {
          loadedEvents.push(doc.data() as Event);
        });
        setEvents(loadedEvents);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'events');
    });
    return () => unsubscribe();
  }, []);

  // Real-time Firestore Sync for Tickets (Filtered securely based on Auth state)
  useEffect(() => {
    if (!currentUser) {
      setPurchasedTickets([]);
      return;
    }
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return;

    let q;
    if (currentUser.role === 'admin') {
      q = collection(db, 'tickets');
    } else {
      q = query(collection(db, 'tickets'), where('userId', '==', firebaseUser.uid));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedTickets: PurchasedTicket[] = [];
      snapshot.forEach((doc) => {
        loadedTickets.push(doc.data() as PurchasedTicket);
      });
      setPurchasedTickets(loadedTickets);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'tickets');
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Custom Groups Folder State (Requirement 6)
  const [groups, setGroups] = useState<string[]>([]);
  const [eventGroupMap, setEventGroupMap] = useState<Record<string, string[]>>({});
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string | 'Semua'>('Semua');
  const [newGroupNameInput, setNewGroupNameInput] = useState('');

  // Sandbox & REST API Configuration (Requirement 3 & 5)
  const [isSandboxFailureMode, setIsSandboxFailureMode] = useState<boolean>(false);
  const [isSandboxTrafficActive, setIsSandboxTrafficActive] = useState<boolean>(false);
  const [isSandboxCountdownActive, setIsSandboxCountdownActive] = useState<boolean>(false);
  const [apiTerminalOutput, setApiTerminalOutput] = useState<string>("Tekan tombol 'Uji Live' untuk melihat respon JSON dari endpoint REST API secara real-time...");
  const [apiTerminalLoading, setApiTerminalLoading] = useState<boolean>(false);

  // State Penyaringan
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'Semua'>('Semua');
  const [activeFilterTab, setActiveFilterTab] = useState<'all' | 'favorites'>('all'); // Filter cepat sidebar
  const [dateFilter, setDateFilter] = useState<'anytime' | 'today' | 'weekend'>('anytime');
  const [priceMaxLimit, setPriceMaxLimit] = useState<number>(3000000);
  const [selectedLocation, setSelectedLocation] = useState<string>('All Locations');

  // Letak kolom grid (2, 3, atau 4)
  const [colLayout, setColLayout] = useState<2 | 3 | 4>(3);

  // Pengaturan overlay & modal
  const [selectedDetailsEvent, setSelectedDetailsEvent] = useState<Event | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  // Admin Scanning View Simulation state (Requirement 10)
  const [adminScannedTicket, setAdminScannedTicket] = useState<PurchasedTicket | null>(null);
  const [isAdminScanning, setIsAdminScanning] = useState(false);
  const [adminManualCode, setAdminManualCode] = useState('');

  // Load landingConfig from Firestore (Requirement 8)
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'config', 'landing'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as LandingPageConfig;
        setLandingConfig(data);
      }
    });
    return () => unsub();
  }, []);

  const handlePublishLandingConfig = async (newConfig: LandingPageConfig) => {
    try {
      await setDoc(doc(db, 'config', 'landing'), sanitizeForFirestore(newConfig));
      triggerNotification("Kustomisasi halaman berhasil dipublikasikan secara live!");
    } catch (err) {
      console.error("Failed to publish landing config to Firestore", err);
      triggerNotification("Gagal mempublikasikan perubahan.");
    }
  };

  // Menambahkan & menghapus favorit
  const handleToggleFavorite = (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) =>
      prev.includes(eventId)
        ? prev.filter((id) => id !== eventId)
        : [...prev, eventId]
    );

    const isFavNow = !favorites.includes(eventId);
    triggerNotification(
      isFavNow ? 'Ditambahkan ke draf favorit' : 'Dihapus dari draf favorit'
    );
  };

  // Toggle Pin Event (Requirement 6)
  const handleTogglePin = (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPinnedEventIds((prev) =>
      prev.includes(eventId)
        ? prev.filter((id) => id !== eventId)
        : [...prev, eventId]
    );

    const isPinnedNow = !pinnedEventIds.includes(eventId);
    triggerNotification(
      isPinnedNow ? '📌 Acara disematkan di posisi teratas!' : '📌 Pin acara dilepaskan'
    );
  };

  // Add event to custom group folder (Requirement 6)
  const handleAddEventToGroup = (eventId: string, groupName: string) => {
    setEventGroupMap((prev) => {
      const currentGroups = prev[eventId] || [];
      const updated = currentGroups.includes(groupName)
        ? currentGroups.filter((g) => g !== groupName)
        : [...currentGroups, groupName];
      return { ...prev, [eventId]: updated };
    });
    triggerNotification(`Grup "${groupName}" untuk acara diperbarui!`);
  };

  // Add a new custom group name
  const handleCreateNewGroupFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupNameInput.trim()) return;
    if (groups.includes(newGroupNameInput.trim())) {
      triggerNotification('Nama grup kategorisasi ini sudah ada!');
      return;
    }
    setGroups((prev) => [...prev, newGroupNameInput.trim()]);
    triggerNotification(`Grup "${newGroupNameInput.trim()}" sukses dibuat!`);
    setNewGroupNameInput('');
  };

  // User manual login handler (Requirement 8)
  const handleLoginUser = (user: { fullName: string; email: string; role?: 'admin' | 'biasa' }) => {
    const enrichedUser = { ...user, role: user.role || 'biasa' };
    setCurrentUser(enrichedUser);
    localStorage.setItem('sagatix_user', JSON.stringify(enrichedUser));
  };

  // User logout handler
  const handleLogout = async () => {
    try {
      await logoutUser();
      setCurrentUser(null);
      localStorage.removeItem('sagatix_user');
      triggerNotification('Sesi akun diakhiri. Sampai jumpa!');
    } catch (err: any) {
      console.error("Gagal logout:", err);
    }
  };

  // Helper to toggle role between admin and biasa (Requirement: admin role constraint)
  const handleToggleUserRole = () => {
    if (!currentUser) return;
    const nextRole = currentUser.role === 'admin' ? 'biasa' : 'admin';
    const updatedUser = { ...currentUser, role: nextRole };
    setCurrentUser(updatedUser);
    localStorage.setItem('sagatix_user', JSON.stringify(updatedUser));
    triggerNotification(`Peran berganti: ${nextRole.toUpperCase()}`);
    if (nextRole === 'biasa') {
      setActiveTab('explore');
    }
  };

  // Toast Notifikasi Praktis
  const triggerNotification = (msg: string) => {
    setNotificationMsg(msg);
    setTimeout(() => {
      setNotificationMsg(null);
    }, 3000);
  };

  // Menyimpan acara kustom buatan user
  const handleSaveEvent = async (newEvent: Event) => {
    try {
      await setDoc(doc(db, 'events', newEvent.id), sanitizeForFirestore(newEvent));
      setIsCreateModalOpen(false);
      const isEdit = !!eventToEdit;
      setEventToEdit(null);
      triggerNotification(isEdit ? 'Acara berhasil diperbarui!' : 'Acara berhasil dipublikasikan!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `events/${newEvent.id}`);
    }
  };

  // Menyimpan pemesanan tiket baru
  const handleBookTickets = async (newTicket: PurchasedTicket) => {
    try {
      const firebaseUser = auth.currentUser;
      const docData = {
        ...newTicket,
        userId: firebaseUser ? firebaseUser.uid : 'anonymous',
        userEmail: firebaseUser ? firebaseUser.email : 'anonymous@gmail.com',
        userName: currentUser?.fullName || firebaseUser?.displayName || 'anonymous'
      };

      await setDoc(doc(db, 'tickets', newTicket.id), sanitizeForFirestore(docData));

      const targetEvent = events.find((evt) => evt.id === newTicket.eventId);
      if (targetEvent) {
        const updatedLeft = targetEvent.ticketsLeft ? Math.max(0, targetEvent.ticketsLeft - newTicket.quantity) : 0;
        const updatedTiers = targetEvent.tiers.map((t) => {
          if (t.name === newTicket.tierName) {
            return {
              ...t,
              slotsAvailable: Math.max(0, t.slotsAvailable - newTicket.quantity)
            };
          }
          return t;
        });

        await updateDoc(doc(db, 'events', newTicket.eventId), {
          ticketsLeft: updatedLeft,
          tiers: updatedTiers,
          isSoldOut: updatedLeft === 0 ? true : (targetEvent.isSoldOut || false)
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `tickets/${newTicket.id}`);
    }
  };

  // Process Admin manual / automatic checkin QR scan (Requirement 10)
  const handleSimulateAdminScan = (ticket: PurchasedTicket) => {
    setIsAdminScanning(true);
    setAdminScannedTicket(null);

    // Simulate scanning beam animation for 1.2 seconds
    setTimeout(async () => {
      setIsAdminScanning(false);
      
      const now = new Date();
      // Requirement 4 (format 24-hour hour and minutes check-in verification stamp)
      const scanTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} WIB`;
      
      try {
        await updateDoc(doc(db, 'tickets', ticket.id), {
          isCheckedIn: true,
          checkInTime: scanTime
        });

        setAdminScannedTicket({
          ...ticket,
          isCheckedIn: true,
          checkInTime: scanTime
        });
        triggerNotification(`Scanned: ${ticket.ticketCode} Check-in sukses!`);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `tickets/${ticket.id}`);
      }
    }, 1200);
  };

  // Search locations based on loaded events
  const uniqueLocations = useMemo(() => {
    const list = new Set<string>();
    events.forEach((evt) => {
      const parts = evt.location.split(',');
      const city = parts[parts.length - 1]?.trim() || evt.location;
      list.add(city);
    });
    return Array.from(list);
  }, [events]);

  // Master Filter & Pin sort logic (Requirement 6)
  const filteredEvents = useMemo(() => {
    let result = events.filter((evt) => {
      // 1. Category check
      if (selectedCategory !== 'Semua' && evt.category !== selectedCategory) {
        return false;
      }

      // 2. Sidebar Quick Filter Option: Favorites list
      if (activeFilterTab === 'favorites' && !favorites.includes(evt.id)) {
        return false;
      }

      // 3. Custom Group Categorization filter (Requirement 6)
      if (selectedGroupFilter !== 'Semua') {
        const assignedGroups = eventGroupMap[evt.id] || [];
        if (!assignedGroups.includes(selectedGroupFilter)) {
          return false;
        }
      }

      // 4. Search query
      const matchSearch =
        evt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        evt.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        evt.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        evt.organizer.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchSearch) return false;

      // 5. Price Limit Check
      if (evt.priceMin > priceMaxLimit) return false;

      // 6. Location check
      if (selectedLocation !== 'All Locations' && !evt.location.includes(selectedLocation)) {
        return false;
      }

      // 7. Simple dates check
      if (dateFilter === 'today') {
        return evt.dateDay === '22' || evt.dateDay === '24';
      }

      return true;
    });

    // Sort to float pinned items to top within standard browse lists! (Requirement 6)
    return [...result].sort((a, b) => {
      const aPinned = pinnedEventIds.includes(a.id) ? 1 : 0;
      const bPinned = pinnedEventIds.includes(b.id) ? 1 : 0;
      return bPinned - aPinned;
    });
  }, [events, selectedCategory, activeFilterTab, selectedGroupFilter, searchQuery, priceMaxLimit, selectedLocation, dateFilter, favorites, pinnedEventIds, eventGroupMap]);

  if (authLoading) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center z-50">
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-400 tracking-wider animate-pulse">Menghubungkan ke Sagatix...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col font-sans antialiased selection:bg-primary/20 selection:text-primary transition-colors duration-200 pb-20 lg:pb-0">

      {/* Portal Header Block */}
      <nav className="sticky top-0 z-100 bg-surface/90 backdrop-blur-md border-b border-outline-variant px-6 py-4 flex items-center justify-between transition-colors shadow-xs">
        <div className="flex items-center gap-6">
          <div
            onClick={() => {
              setSelectedDetailsEvent(null);
              setActiveTab('explore');
            }}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
              <Sparkles className="w-5.5 h-5.5 fill-primary/10 animate-pulse" />
            </div>
            <div>
              <span className="text-lg font-black tracking-wider text-on-surface">SAGATIX</span>
              <span className="text-[9px] uppercase tracking-widest font-extrabold text-primary block">TICKET PLATFORM</span>
            </div>
          </div>

          {/* Desktop Tab Selector */}
          <div className="hidden lg:flex items-center gap-1.5 bg-surface-container-high/60 p-1 rounded-full border border-outline-variant text-xs font-bold">
            <button
              onClick={() => {
                setSelectedDetailsEvent(null);
                setActiveTab('explore');
              }}
              className={`px-5 py-2 rounded-full transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'explore'
                  ? 'bg-primary text-on-primary shadow-xs font-black'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>Jelajahi Acara</span>
            </button>
            <button
              onClick={() => setActiveTab('tickets')}
              className={`px-5 py-2 rounded-full transition-all cursor-pointer flex items-center gap-1.5 relative ${
                activeTab === 'tickets'
                  ? 'bg-primary text-on-primary shadow-xs font-black'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <Ticket className="w-4 h-4" />
              <span>Tiket Saya</span>
              {purchasedTickets.length > 0 && (
                <span className="absolute top-[-3px] right-2 bg-error text-white font-black text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 border-surface animate-bounce">
                  {purchasedTickets.length}
                </span>
              )}
            </button>
            {(currentUser?.role === 'admin' || currentUser?.role === 'superadmin') && (
              <button
                onClick={() => {
                  setSelectedDetailsEvent(null);
                  setActiveTab('admin');
                }}
                className={`px-5 py-2 rounded-full transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'admin'
                    ? 'bg-primary text-on-primary shadow-xs font-black'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>Panel Admin</span>
              </button>
            )}
            <button
              onClick={() => setActiveTab('help')}
              className={`px-5 py-2 rounded-full transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'help'
                  ? 'bg-primary text-on-primary shadow-xs font-black'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              <span>Bantuan</span>
            </button>
          </div>
        </div>

        {/* Right Search and Actions Bar */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 bg-surface-container-high rounded-full border border-outline-variant px-3.5 py-1.5">
            <Search className="w-4 h-4 text-on-surface-variant" />
            <input
              type="text"
              placeholder="Cari acara, lokasi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-0 outline-hidden text-xs w-44 placeholder-on-surface-variant/70 text-on-surface font-semibold"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="cursor-pointer text-on-surface-variant">
                <X className="w-3.5 h-3.5 hover:text-red-500" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {currentUser ? (
              <div className="flex items-center gap-2.5 bg-primary/10 border border-primary/25 px-3.5 py-1.5 rounded-xl text-xs z-10 shadow-xs">
                <div className="w-6.5 h-6.5 rounded-full bg-primary text-on-primary font-black flex items-center justify-center text-[10px] shrink-0">
                  {currentUser.fullName.slice(0, 1).toUpperCase()}
                </div>
                <div className="hidden md:block text-left mr-1">
                  <span className="font-extrabold text-[#111111] block leading-none">{currentUser.fullName}</span>
                  <span className="text-[8.5px] font-black text-primary block mt-1 tracking-wider uppercase">ROLE: {currentUser.role || 'BIASA'}</span>
                  <span className="text-[9px] text-on-surface-variant font-medium leading-none block mt-0.5">{currentUser.email}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <select
                    value={currentUser.role || 'biasa'}
                    onChange={async (e) => {
                      const selectedRole = e.target.value as 'admin' | 'biasa';
                      const firebaseUser = auth.currentUser;
                      if (firebaseUser) {
                        try {
                          await setDoc(doc(db, 'users', firebaseUser.uid), {
                            fullName: currentUser.fullName,
                            email: currentUser.email,
                            role: selectedRole,
                            updatedAt: new Date().toISOString()
                          }, { merge: true });

                          if (selectedRole === 'admin') {
                            await setDoc(doc(db, 'admins', firebaseUser.uid), {
                              email: firebaseUser.email,
                              createdAt: new Date().toISOString()
                            });
                          }
                          
                          triggerNotification(`Peran berhasil disimpan ke Firebase: ${selectedRole.toUpperCase()}`);
                          if (selectedRole === 'biasa' && (activeTab === 'admin')) {
                            setSelectedDetailsEvent(null);
                            setActiveTab('explore');
                          }
                        } catch (err) {
                          console.error("Gagal memperbarui peran di Firebase:", err);
                          triggerNotification("Gagal memperbarui peran di Firebase");
                        }
                      }
                    }}
                    className="text-[9.5px] font-extrabold bg-surface text-on-surface hover:bg-slate-50 border border-outline rounded px-1.5 py-0.5 cursor-pointer outline-hidden transition-all"
                  >
                    <option value="biasa">👤 BIASA</option>
                    <option value="admin">🔑 ADMIN</option>
                  </select>
                  <button
                    onClick={handleLogout}
                    className="text-[8px] bg-red-100 hover:bg-red-200 text-red-700 font-extrabold px-1.5 py-0.5 rounded cursor-pointer transition-colors text-center"
                  >
                    Keluar
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={async () => {
                  try {
                    const u = await signInWithGoogle();
                    if (u) {
                      triggerNotification(`Koneksi Akun Google Sukses! Selamat datang, ${u.displayName || 'User'}`);
                    }
                  } catch (err: any) {
                    triggerNotification(`Gagal masuk Google: ${err.message || err}`);
                  }
                }}
                className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2 rounded-xl font-bold text-xs hover:opacity-90 transition-opacity whitespace-nowrap cursor-pointer active:scale-95"
              >
                <svg className="w-4 h-4 fill-current text-on-primary shrink-0" viewBox="0 0 24 24">
                  <path d="M12.24 10.285V13.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.866-3.577-7.866-8s3.536-8 7.866-8c2.46 0 4.105 1.025 5.047 1.926l2.427-2.334C17.955 2.192 15.34 1 12.24 1 5.48 1 0 6.48 0 13s5.48 12 12.24 12c7.06 0 11.75-4.97 11.75-11.97 0-.81-.08-1.43-.19-2.03l-11.56.285z"/>
                </svg>
                <span>Google Login</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Bagian Utama Layout */}
      <div className="flex flex-1 min-h-[calc(100vh-73px)]">
        
        {/* Sidebar Kiri (Penyaringan Tersemat) */}
        {activeTab === 'explore' && !selectedDetailsEvent && (
          <aside className="w-72 bg-surface-container-low border-r border-outline-variant p-5 hidden lg:flex flex-col gap-6 shrink-0 h-[calc(100vh-73px)] sticky top-[73px] overflow-y-auto no-scrollbar justify-between">
            <div className="space-y-6">
              
              {/* Tab navigasi cepat */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest block px-1">
                  Filter Cepat
                </span>
                <div className="space-y-1.5">
                  <button
                    onClick={() => {
                      setActiveFilterTab('all');
                      triggerNotification('Menampilkan semua pilihan acara');
                    }}
                    id="filter-all-btn"
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-full text-xs font-bold cursor-pointer transition-transform duration-200 active:scale-98 ${
                      activeFilterTab === 'all'
                        ? 'bg-secondary-container text-primary font-black shadow-xs'
                        : 'text-on-surface-variant hover:bg-surface-container-high'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Compass className="w-4.5 h-4.5 text-primary" />
                      <span>Semua Acara</span>
                    </div>
                    <span className="bg-white/60 text-on-surface-variant px-2 py-0.5 rounded-full text-[10px]">
                      {events.length}
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveFilterTab('favorites');
                      triggerNotification('Menampilkan daftar acara favorit Anda');
                    }}
                    id="filter-fav-btn"
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-full text-xs font-bold cursor-pointer transition-transform duration-200 active:scale-98 ${
                      activeFilterTab === 'favorites'
                        ? 'bg-red-500/10 text-red-600 font-black shadow-xs'
                        : 'text-on-surface-variant hover:bg-surface-container-high'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Heart className="w-4.5 h-4.5 text-red-500" />
                      <span>Ikut Favorit</span>
                    </div>
                    <span className="bg-white/60 text-on-surface-variant px-2 py-0.5 rounded-full text-[10px]">
                      {favorites.length}
                    </span>
                  </button>
                </div>
              </div>

              {/* Requirement 6: CUSTOM GROUP MANAGER IN SIDEBAR */}
              <div className="space-y-3.5 border-t border-outline-variant/50 pt-4">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-black text-on-surface-variant uppercase tracking-widest block">
                    Grup & Kategori 📁
                  </span>
                  {selectedGroupFilter !== 'Semua' && (
                    <button
                      onClick={() => setSelectedGroupFilter('Semua')}
                      className="text-[9px] bg-primary/10 text-primary font-extrabold px-2 py-0.5 rounded"
                    >
                      Reset
                    </button>
                  )}
                </div>

                {/* Group Selector Chips in Sidebar */}
                <div className="space-y-1.5">
                  <button
                    onClick={() => setSelectedGroupFilter('Semua')}
                    className={`w-full px-3 py-2 rounded-xl text-left text-xs font-bold flex items-center justify-between transition-all ${
                      selectedGroupFilter === 'Semua'
                        ? 'bg-primary/10 text-primary border border-primary/25'
                        : 'hover:bg-outline-variant/10 text-on-surface-variant'
                    }`}
                  >
                    <span>🎯 Semua Grup Folder</span>
                    <span className="text-[10px] font-black opacity-60">»</span>
                  </button>

                  {groups.map((grp) => {
                    const count = events.filter((e) => (eventGroupMap[e.id] || []).includes(grp)).length;
                    return (
                      <button
                        key={grp}
                        onClick={() => {
                          setSelectedGroupFilter(grp);
                          triggerNotification(`Memfilter grup acara: ${grp}`);
                        }}
                        className={`w-full px-3 py-1.5 rounded-xl text-left text-xs font-semibold flex items-center justify-between transition-all ${
                          selectedGroupFilter === grp
                            ? 'bg-sky-100 text-sky-800 font-black border border-sky-300'
                            : 'hover:bg-outline-variant/10 text-on-surface-variant'
                        }`}
                      >
                        <span className="truncate max-w-[150px]">📁 {grp}</span>
                        <span className="bg-surface-container-high px-1.5 py-0.5 rounded text-[9px] font-semibold text-on-surface-variant">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* New Category Group Form */}
                <form onSubmit={handleCreateNewGroupFolder} className="pt-2 space-y-1">
                  <input
                    type="text"
                    required
                    placeholder="Tambah grup baru..."
                    value={newGroupNameInput}
                    onChange={(e) => setNewGroupNameInput(e.target.value)}
                    className="w-full bg-surface-container-high border border-outline-variant rounded-lg text-xs px-2.5 py-1.5 placeholder-on-surface-variant/60 outline-hidden font-medium text-on-surface"
                  />
                  <button
                    type="submit"
                    className="w-full bg-surface-container-highest hover:bg-outline-variant text-[10px] font-black uppercase py-1 text-on-surface rounded border border-outline-variant transition-all cursor-pointer"
                  >
                    + Buat Folder Grup
                  </button>
                </form>
              </div>

              {/* Filter Rentang Harga */}
              <div className="space-y-3.5 border-t border-outline-variant/50 pt-4">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest block">
                    Batas Harga Max
                  </span>
                  <span className="text-[11px] font-black text-primary font-mono">
                    Rp {(priceMaxLimit / 1000).toLocaleString('id-ID')}rb
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="3000000"
                  step="50000"
                  value={priceMaxLimit}
                  onChange={(e) => setPriceMaxLimit(Number(e.target.value))}
                  className="w-full accent-primary h-1 bg-surface-container-highest rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-on-surface-variant font-bold px-1">
                  <span>Gratis</span>
                  <span>Rp 3,0 Jt</span>
                </div>
              </div>

              {/* Filter Berdasarkan Tanggal Acara */}
              <div className="space-y-1.5 border-t border-outline-variant/50 pt-4">
                <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest block px-1">
                  Tanggal Berlangsung
                </span>
                <div className="grid grid-cols-3 gap-1 bg-surface-container-high p-1 rounded-lg border border-outline-variant text-center font-bold text-[10px]">
                  <button
                    onClick={() => setDateFilter('anytime')}
                    className={`py-1 rounded ${dateFilter === 'anytime' ? 'bg-primary text-on-primary font-black shadow-xs' : 'text-on-surface-variant'}`}
                  >
                    Bebas
                  </button>
                  <button
                    onClick={() => setDateFilter('today')}
                    className={`py-1 rounded ${dateFilter === 'today' ? 'bg-primary text-on-primary font-black shadow-xs' : 'text-on-surface-variant'}`}
                  >
                    Hari Ini
                  </button>
                  <button
                    onClick={() => {
                      setDateFilter('weekend');
                      triggerNotification('Menampilkan jadwal akhir pekan');
                    }}
                    className={`py-1 rounded ${dateFilter === 'weekend' ? 'bg-primary text-on-primary font-black shadow-xs' : 'text-on-surface-variant'}`}
                  >
                    Wkd
                  </button>
                </div>
              </div>

              {/* Filter Lokasi Administratif */}
              <div className="space-y-1.5 border-t border-outline-variant/50 pt-4">
                <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest block px-1">
                  Lokasi Kota
                </span>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full bg-surface-container-high text-xs rounded-lg border border-outline-variant px-3 py-2 outline-hidden font-bold text-on-surface cursor-pointer"
                >
                  <option value="All Locations">Semua Lokasi</option>
                  {uniqueLocations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

            </div>

            {/* Tombol Pembuatan Acara Kustom */}
            {(currentUser?.role === 'admin' || currentUser?.role === 'superadmin') && (
              <div className="pt-4 border-t border-outline-variant/40 space-y-2">
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="w-full bg-primary text-on-primary py-3 rounded-xl font-bold text-xs hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Bagikan Acara Anda</span>
                </button>
              </div>
            )}
          </aside>
        )}

        {/* Konten Utama Layar */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto w-full">
          <AnimatePresence mode="wait">

            {/* DETAIL EVENT SCREEN */}
            {selectedDetailsEvent ? (
              <motion.div
                key="detail-screen"
                initial={{ opacity: 0, scale: 0.99 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.99 }}
                transition={{ duration: 0.2 }}
              >
                <EventDetailPage
                  event={selectedDetailsEvent}
                  isFavorited={favorites.includes(selectedDetailsEvent.id)}
                  onToggleFavorite={handleToggleFavorite}
                  onBack={() => setSelectedDetailsEvent(null)}
                  onBookTickets={handleBookTickets}
                  triggerNotification={triggerNotification}
                  currentUser={currentUser}
                  onLoginUser={handleLoginUser}
                  isSandboxFailureMode={isSandboxFailureMode}
                  isSandboxTrafficActive={isSandboxTrafficActive}
                  isSandboxCountdownActive={isSandboxCountdownActive}
                  tickets={purchasedTickets}
                  isPlatformFeeEnabled={landingConfig.isPlatformFeeEnabled !== false}
                  platformFeePercent={landingConfig.platformFeePercent ?? 5}
                />
              </motion.div>
            ) : (
              /* TAB RENDERING SWITCH CASE */
              activeTab === 'explore' && (
                <motion.div
                  key="explore-tab"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-6"
                >
                  {/* Category Chips Bar */}
                  <div className="flex gap-2 pb-1 overflow-x-auto no-scrollbar">
                    {['Semua', 'Musik', 'Game', 'Olahraga', 'Teknologi', 'Lainnya'].map((cat) => {
                      const isSelected = selectedCategory === cat;
                      return (
                        <button
                          key={cat}
                          onClick={() => {
                            setSelectedCategory(cat as any);
                            triggerNotification(`Memilih kategori: ${cat}`);
                          }}
                          className={`px-4.5 py-2 rounded-full text-xs font-extrabold transition-all shrink-0 cursor-pointer ${
                            isSelected
                              ? 'bg-primary text-on-primary shadow-xs'
                              : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
                          }`}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>

                  {/* HEADER PROMOSI (Requirement: Admin Landing Page Config) */}
                  {landingConfig.isCtaEnabled !== false && (
                    <div className="bg-linear-to-r from-primary/10 via-primary-fixed-dim/5 to-transparent rounded-2xl p-6 md:p-8 border border-outline-variant flex flex-col md:flex-row items-center justify-between gap-6">
                      <div className="space-y-2.5 max-w-xl text-center md:text-left">
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20 animate-pulse">
                          ⚡ {landingConfig.promoCode ? `KODE PROMO: ${landingConfig.promoCode}` : 'PENAWARAN KHUSUS'}
                        </span>
                        <h1 className="font-black text-2xl md:text-4xl text-on-surface tracking-tight leading-tight">
                          {landingConfig.ctaTitle}
                        </h1>
                        <p className="text-xs md:text-sm text-on-surface-variant leading-relaxed font-semibold">
                          {landingConfig.ctaDescription}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          if (landingConfig.ctaLink) {
                            const targetEvent = events.find(e => e.id === landingConfig.ctaLink);
                            if (targetEvent) {
                              setSelectedDetailsEvent(targetEvent);
                              return;
                            }

                            if (landingConfig.ctaLink.startsWith('http')) {
                              window.open(landingConfig.ctaLink, '_blank');
                            } else {
                              const targetId = landingConfig.ctaLink.replace('#', '');
                              const targetEl = document.getElementById(targetId);
                              if (targetEl) {
                                targetEl.scrollIntoView({ behavior: 'smooth' });
                              } else {
                                document.getElementById('explore-catalog')?.scrollIntoView({ behavior: 'smooth' });
                              }
                            }
                          } else {
                            document.getElementById('explore-catalog')?.scrollIntoView({ behavior: 'smooth' });
                          }
                        }}
                        className="bg-primary text-on-primary font-bold text-xs px-6 py-3.5 rounded-xl hover:opacity-95 active:scale-95 transition-all whitespace-nowrap cursor-pointer shadow-md"
                      >
                        {landingConfig.ctaButtonText}
                      </button>
                    </div>
                  )}

                  {/* TIPS BOARD SECTION (Requirement: buat admin juga bisa mengatur tip atau cta nya pada landing page) */}
                  {landingConfig.isTipsEnabled !== false && landingConfig.tips && landingConfig.tips.length > 0 && (
                    <div className="bg-surface-container rounded-2xl p-5 border border-outline-variant grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                      <div className="md:col-span-4 space-y-1.5 text-center md:text-left">
                        <div className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase text-secondary bg-secondary-container px-2.5 py-1 rounded-full border border-outline-variant">
                          💡 Tips Pintar & Panduan
                        </div>
                        <h3 className="font-extrabold text-xs md:text-sm text-on-surface tracking-tight leading-snug">Panduan Mempermudah Registrasi</h3>
                        <p className="text-[10px] text-on-surface-variant font-medium leading-relaxed">
                          Saran praktis yang dikonfigurasi admin demi kelancaran check-in Anda.
                        </p>
                      </div>
                      <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {landingConfig.tips.map((tip, idx) => (
                          <div key={idx} className="bg-surface border border-outline-variant/60 rounded-xl p-3 flex items-start gap-2.5 shadow-2xs hover:border-primary/30 transition-all select-none">
                            <span className="w-5 h-5 bg-primary/10 text-primary font-black text-[9px] rounded flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <p className="text-[10px] text-on-surface font-bold leading-normal">
                              {tip}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Requirement 6: PINNED EVENTS BANNER ON HOME PAGE */}
                  {pinnedEventIds.length > 0 && (
                    <section className="space-y-3.5 bg-primary/5 p-5 rounded-2xl border border-primary/15">
                      <div className="flex items-center gap-1.5 text-xs text-primary font-black uppercase tracking-widest">
                        <Pin className="w-4 h-4 text-primary fill-primary" />
                        <span>Acara Tersemat Pin ({pinnedEventIds.length} Acara)</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {events
                          .filter((evt) => pinnedEventIds.includes(evt.id))
                          .map((pinnedEvt) => (
                            <div key={`pinned-${pinnedEvt.id}`} className="transform scale-99">
                              <EventCard
                                event={pinnedEvt}
                                isFavorited={favorites.includes(pinnedEvt.id)}
                                onToggleFavorite={handleToggleFavorite}
                                isPinned={true}
                                onTogglePin={handleTogglePin}
                                onSelectEvent={setSelectedDetailsEvent}
                                availableGroups={groups}
                                eventGroups={eventGroupMap[pinnedEvt.id] || []}
                                onAddToGroup={handleAddEventToGroup}
                              />
                            </div>
                          ))}
                      </div>
                    </section>
                  )}

                  {/* GRID CONTROLLER */}
                  <div id="explore-catalog" className="flex justify-between items-center pt-2">
                    <h2 className="text-lg font-black text-on-surface flex items-center gap-2">
                      <span>Semua Kalender Acara</span>
                      <span className="text-xs bg-surface-container-high px-2 py-0.5 rounded-full text-on-surface-variant font-bold">
                        {filteredEvents.length} Item
                      </span>
                    </h2>
                    
                    <div className="hidden md:flex items-center gap-1.5 bg-surface-container-low p-1 rounded-lg border border-outline-variant text-[11px] font-bold">
                      <button
                        onClick={() => setColLayout(2)}
                        className={`p-1.5 rounded transition-all ${colLayout === 2 ? 'bg-primary text-on-primary' : 'text-on-surface-variant'}`}
                      >
                        <Grid className="w-4 h-4 rotate-45" />
                      </button>
                      <button
                        onClick={() => setColLayout(3)}
                        className={`p-1.5 rounded transition-all ${colLayout === 3 ? 'bg-primary text-on-primary' : 'text-on-surface-variant'}`}
                      >
                        <Grid className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setColLayout(4)}
                        className={`p-1.5 rounded transition-all ${colLayout === 4 ? 'bg-primary text-on-primary' : 'text-on-surface-variant'}`}
                      >
                        <List className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* List Event Grid */}
                  {filteredEvents.length === 0 ? (
                    <div className="text-center py-20 bg-surface-container-lowest border border-outline-variant rounded-2xl space-y-3">
                      <Compass className="w-12 h-12 text-on-surface-variant/40 mx-auto animate-bounce" />
                      <h3 className="font-extrabold text-base text-on-surface">Tidak ada acara yang cocok</h3>
                      <p className="text-xs text-on-surface-variant max-w-sm mx-auto leading-relaxed font-semibold">
                        Coba ubah pengaturan filter kategori, batas harga, pencarian kata kunci kustom, atau group folder yang Anda gunakan.
                      </p>
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedCategory('Semua');
                          setActiveFilterTab('all');
                          setSelectedGroupFilter('Semua');
                          setPriceMaxLimit(3000000);
                          setSelectedLocation('All Locations');
                        }}
                        className="bg-primary text-on-primary text-xs font-bold px-4 py-2 rounded-full cursor-pointer hover:opacity-90"
                      >
                        Reset Semua Pencarian
                      </button>
                    </div>
                  ) : (
                    <div
                      className={`grid gap-6 ${
                        colLayout === 2
                          ? 'grid-cols-1 md:grid-cols-2'
                          : colLayout === 3
                            ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                            : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
                      }`}
                    >
                      {filteredEvents.map((evt) => (
                        <EventCard
                          key={evt.id}
                          event={evt}
                          isFavorited={favorites.includes(evt.id)}
                          onToggleFavorite={handleToggleFavorite}
                          isPinned={pinnedEventIds.includes(evt.id)}
                          onTogglePin={handleTogglePin}
                          onSelectEvent={setSelectedDetailsEvent}
                          availableGroups={groups}
                          eventGroups={eventGroupMap[evt.id] || []}
                          onAddToGroup={handleAddEventToGroup}
                        />
                      ))}
                    </div>
                  )}

                  {/* Tampilan Load More */}
                  {filteredEvents.length > 0 && (
                    <div className="pt-6 flex flex-col items-center gap-2 border-t border-outline-variant/30 text-center">
                      <button
                        onClick={() => triggerNotification('Database acara SAGATIX sudah ter-update')}
                        className="border-2 border-primary text-primary px-8 py-3 rounded-full font-black text-xs hover:bg-secondary-container/20 transition-all cursor-pointer active:scale-95 shadow-xs"
                      >
                        Tampilkan Lebih Banyak Acara
                      </button>
                      <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-wider">
                        Menampilkan {filteredEvents.length} dari {events.length} pilihan acara
                      </span>
                    </div>
                  )}

                </motion.div>
              )
            )}

            {/* TAB RENDERING: TICKETS */}
            {activeTab === 'tickets' && !selectedDetailsEvent && (
              <motion.div
                key="tickets-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
              >
                <MyTicketsView
                  tickets={purchasedTickets}
                  onExploreClick={() => setActiveTab('explore')}
                  events={events}
                />
              </motion.div>
            )}

            {/* TAB RENDERING: ADMIN ATTENDANCE scanner (Requirement 10) */}
            {activeTab === 'admin' && !selectedDetailsEvent && (
              <motion.div
                key="admin-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6 max-w-6xl mx-auto"
              >
                {/* Header Title */}
                <div className="space-y-2 border-b border-outline-variant/60 pb-3 text-left">
                  <span className="text-[10px] font-black tracking-widest text-primary uppercase bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                    🔐 PANEL UTAMA ADMINISTRATOR & PENGEMBANG
                  </span>
                  <h1 className="font-extrabold text-2xl md:text-3xl text-on-surface">Pusat Kendali Admin</h1>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Kelola absensi tiket, ubah promo beranda utama, atau uji server REST API dalam satu tab terpadu.
                  </p>
                </div>

                {/* Sub-tab Navigation */}
                <div className="flex border-b border-outline-variant/60 gap-4 text-xs font-bold pt-2 mb-6 text-left flex-wrap">
                  <button
                    type="button"
                    onClick={() => setAdminSubTab('events')}
                    className={`pb-2.5 px-1 border-b-2 transition-all cursor-pointer ${
                      adminSubTab === 'events' ? 'border-primary text-primary font-black' : 'border-transparent text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    📅 Kelola Event & Kursi
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdminSubTab('scanner')}
                    className={`pb-2.5 px-1 border-b-2 transition-all cursor-pointer ${
                      adminSubTab === 'scanner' ? 'border-primary text-primary font-black' : 'border-transparent text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    🎟️ Validasi QR & Absensi
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdminSubTab('config')}
                    className={`pb-2.5 px-1 border-b-2 transition-all cursor-pointer ${
                      adminSubTab === 'config' ? 'border-primary text-primary font-black' : 'border-transparent text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    ⚙️ Kustomisasi Halaman & Countdown
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdminSubTab('sandbox')}
                    className={`pb-2.5 px-1 border-b-2 transition-all cursor-pointer ${
                      adminSubTab === 'sandbox' ? 'border-primary text-primary font-black' : 'border-transparent text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    💻 REST API & Sandbox Hub
                  </button>
                  {currentUser?.role === 'superadmin' && (
                    <button
                      type="button"
                      onClick={() => setAdminSubTab('users')}
                      className={`pb-2.5 px-1 border-b-2 transition-all cursor-pointer ${
                        adminSubTab === 'users' ? 'border-primary text-primary font-black' : 'border-transparent text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      👑 Kelola Akses & Pengguna
                    </button>
                  )}
                </div>

                {adminSubTab === 'users' && currentUser?.role === 'superadmin' && (
                  <div className="space-y-6 text-left">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant/60 pb-4">
                      <div className="space-y-1">
                        <h2 className="font-extrabold text-lg text-on-surface">Kelola Akses Pengguna & Organizer Resmi</h2>
                        <p className="text-xs text-on-surface-variant">
                          Halaman khusus Superadmin untuk mengatur peran (role) pengguna dan memberikan nama Organizer resmi untuk akun Admin.
                        </p>
                      </div>
                    </div>

                    <div className="bg-surface-container rounded-3xl border border-outline-variant/80 overflow-hidden shadow-xs">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left border-collapse">
                          <thead>
                            <tr className="bg-surface-container-high border-b border-outline-variant text-[10px] font-black uppercase text-on-surface-variant tracking-wider">
                              <th className="px-4 py-3.5">Nama & Email</th>
                              <th className="px-4 py-3.5">Peran (Role)</th>
                              <th className="px-4 py-3.5">Organizer Resmi</th>
                              <th className="px-4 py-3.5">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-outline-variant/55">
                            {allUsers.map((user) => (
                              <tr key={user.id} className="hover:bg-surface-container-high transition-colors">
                                <td className="px-4 py-3">
                                  <div className="font-bold text-on-surface">{user.fullName}</div>
                                  <div className="text-[10px] text-on-surface-variant">{user.email}</div>
                                </td>
                                <td className="px-4 py-3">
                                  <select
                                    value={user.role || 'biasa'}
                                    onChange={async (e) => {
                                      const newRole = e.target.value;
                                      try {
                                        await setDoc(doc(db, 'users', user.id), { role: newRole }, { merge: true });
                                        triggerNotification(`Berhasil mengubah peran ${user.fullName} menjadi ${newRole.toUpperCase()}`);
                                      } catch (err) {
                                        console.error("Error updating role:", err);
                                        triggerNotification("Gagal mengubah peran pengguna.");
                                      }
                                    }}
                                    className="bg-surface border border-outline rounded px-2 py-1 outline-hidden font-semibold cursor-pointer"
                                  >
                                    <option value="biasa">👤 Biasa</option>
                                    <option value="admin">🔑 Admin</option>
                                    <option value="superadmin">👑 Superadmin</option>
                                  </select>
                                </td>
                                <td className="px-4 py-3">
                                  {user.role === 'admin' ? (
                                    <input
                                      type="text"
                                      placeholder="Nama Organizer (EO)"
                                      defaultValue={user.assignedOrganizer || ''}
                                      onBlur={async (e) => {
                                        const newOrg = e.target.value;
                                        if (newOrg !== user.assignedOrganizer) {
                                          try {
                                            await setDoc(doc(db, 'users', user.id), { assignedOrganizer: newOrg }, { merge: true });
                                            triggerNotification(`Organizer untuk ${user.fullName} disimpan.`);
                                          } catch (err) {
                                            console.error("Error updating organizer:", err);
                                          }
                                        }
                                      }}
                                      className="bg-surface border border-outline rounded px-2 py-1 outline-hidden text-xs w-full max-w-[150px]"
                                    />
                                  ) : (
                                    <span className="text-[10px] text-on-surface-variant italic">Hanya untuk Admin</span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-[9px] text-on-surface-variant">Otomatis Tersimpan</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {adminSubTab === 'events' && (
                  <div className="space-y-6">
                    {selectedRegistrantsEvent ? (
                      /* VIEW: DAFTAR PENDAFTAR EVENT */
                      <div className="space-y-6 text-left">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant/60 pb-4">
                          <div className="space-y-1">
                            <button
                              onClick={() => {
                                setSelectedRegistrantsEvent(null);
                              }}
                              className="text-xs text-primary font-bold hover:underline inline-flex items-center gap-1 cursor-pointer bg-transparent border-0"
                            >
                              ← Kembali ke Daftar Event
                            </button>
                            <h2 className="font-extrabold text-lg text-on-surface">Daftar Pendaftar & Ekspor CSV</h2>
                            <p className="text-xs text-on-surface-variant">
                              Acara: <strong className="text-on-surface">{selectedRegistrantsEvent.title}</strong>
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const getFieldLabel = (fieldId: string, eventId: string): string => {
                                const event = events.find(e => e.id === eventId);
                                if (!event) return fieldId;
                                if (event.registrationRoles) {
                                  for (const r of event.registrationRoles) {
                                    if (r.formSections) {
                                      for (const s of r.formSections) {
                                        if (s.fields) {
                                          const f = s.fields.find(field => field.id === fieldId);
                                          if (f) return f.label;
                                        }
                                      }
                                    }
                                  }
                                }
                                if (event.formSections) {
                                  for (const s of event.formSections) {
                                    if (s.fields) {
                                      const f = s.fields.find(field => field.id === fieldId);
                                      if (f) return f.label;
                                    }
                                  }
                                }
                                if (event.customFormFields) {
                                  const f = event.customFormFields.find(field => field.id === fieldId);
                                  if (f) return f.label;
                                }
                                return fieldId;
                              };

                              const eventTickets = purchasedTickets.filter(t => t.eventId === selectedRegistrantsEvent.id);

                              if (eventTickets.length === 0) {
                                triggerNotification("Belum ada data pendaftar untuk diekspor!");
                                return;
                              }

                              // Header
                              const headers = [
                                'Kode Tiket',
                                'Judul Event',
                                'Nama Pendaftar Utama',
                                'Kategori',
                                'Kelas Tiket (Tier)',
                                'Kuantitas',
                                'Total Pembayaran',
                                'Nomor Kursi',
                                'Tanggal Booking',
                                'Status Absensi',
                                'Detail Jawaban Kustom'
                              ];

                              const rows = eventTickets.map(t => {
                                const responses = t.formResponses || {};
                                const attendeeName = responses['name'] || responses['name_lengkap'] || responses['nama'] || responses['nama_lengkap'] || responses['nama_kapten'] || 'PENGGUNA SAGATIX';

                                const customDetails = Object.entries(responses)
                                  .map(([fid, val]) => `${getFieldLabel(fid, t.eventId)}: ${val}`)
                                  .join('; ');

                                return [
                                  t.ticketCode,
                                  t.eventTitle,
                                  attendeeName,
                                  t.registrationType || 'N/A',
                                  t.tierName,
                                  t.quantity,
                                  t.totalAmount,
                                  (t.seatNumbers || []).join(', '),
                                  t.bookingDate,
                                  t.isCheckedIn ? 'Sudah Absen' : 'Belum Absen',
                                  customDetails
                                ];
                              });

                              const csvContent = [
                                headers.join(','),
                                ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
                              ].join('\n');

                              const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                              const url = URL.createObjectURL(blob);
                              const link = document.createElement('a');
                              link.setAttribute('href', url);
                              link.setAttribute('download', `Daftar_Pendaftar_${selectedRegistrantsEvent.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              triggerNotification("Laporan CSV berhasil diunduh!");
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-xs active:scale-95 shrink-0"
                          >
                            <Download className="w-4 h-4" />
                            <span>Ekspor ke CSV</span>
                          </button>
                        </div>

                        {/* Search & Filter Bar */}
                        <div className="relative max-w-md">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
                          <input
                            type="text"
                            placeholder="Cari kode tiket, nama pendaftar..."
                            value={registrantSearchQuery}
                            onChange={(e) => setRegistrantSearchQuery(e.target.value)}
                            className="w-full text-xs font-semibold bg-surface-container border border-outline-variant pl-9 pr-4 py-2.5 rounded-xl text-on-surface focus:border-primary outline-hidden"
                          />
                        </div>

                        {/* Table View */}
                        <div className="bg-surface-container rounded-3xl border border-outline-variant/80 overflow-hidden shadow-xs">
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left border-collapse">
                              <thead>
                                <tr className="bg-surface-container-high border-b border-outline-variant text-[10px] font-black uppercase text-on-surface-variant tracking-wider">
                                  <th className="px-4 py-3.5">Kode Tiket</th>
                                  <th className="px-4 py-3.5">Nama Pendaftar</th>
                                  <th className="px-4 py-3.5">Kategori & Kelas</th>
                                  <th className="px-4 py-3.5">Kursi</th>
                                  <th className="px-4 py-3.5">Total Bayar</th>
                                  <th className="px-4 py-3.5">Tanggal</th>
                                  <th className="px-4 py-3.5">Absensi</th>
                                  <th className="px-4 py-3.5">Detail Kustom</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-outline-variant/55">
                                {(() => {
                                  const getFieldLabel = (fieldId: string, eventId: string): string => {
                                    const event = events.find(e => e.id === eventId);
                                    if (!event) return fieldId;
                                    if (event.registrationRoles) {
                                      for (const r of event.registrationRoles) {
                                        if (r.formSections) {
                                          for (const s of r.formSections) {
                                            if (s.fields) {
                                              const f = s.fields.find(field => field.id === fieldId);
                                              if (f) return f.label;
                                            }
                                          }
                                        }
                                      }
                                    }
                                    if (event.formSections) {
                                      for (const s of event.formSections) {
                                        if (s.fields) {
                                          const f = s.fields.find(field => field.id === fieldId);
                                          if (f) return f.label;
                                        }
                                      }
                                    }
                                    if (event.customFormFields) {
                                      const f = event.customFormFields.find(field => field.id === fieldId);
                                      if (f) return f.label;
                                    }
                                    return fieldId;
                                  };

                                  const eventTickets = purchasedTickets.filter(t => t.eventId === selectedRegistrantsEvent.id);

                                  const filtered = eventTickets.filter(t => {
                                    const responses = t.formResponses || {};
                                    const attendeeName = responses['name'] || responses['name_lengkap'] || responses['nama'] || responses['nama_lengkap'] || responses['nama_kapten'] || '';
                                    const matchStr = `${t.ticketCode} ${attendeeName} ${t.registrationType} ${t.tierName}`.toLowerCase();
                                    return matchStr.includes(registrantSearchQuery.toLowerCase());
                                  });

                                  if (filtered.length === 0) {
                                    return (
                                      <tr>
                                        <td colSpan={8} className="px-4 py-8 text-center text-on-surface-variant italic font-semibold">
                                          Tidak ada data pendaftaran yang sesuai dengan pencarian.
                                        </td>
                                      </tr>
                                    );
                                  }

                                  return filtered.map((t) => {
                                    const responses = t.formResponses || {};
                                    const attendeeName = responses['name'] || responses['name_lengkap'] || responses['nama'] || responses['nama_lengkap'] || responses['nama_kapten'] || 'PENGGUNA SAGATIX';
                                    return (
                                      <tr key={t.id} className="hover:bg-surface-container-high transition-colors">
                                        <td className="px-4 py-3 font-mono font-black text-primary">{t.ticketCode}</td>
                                        <td className="px-4 py-3 font-bold text-on-surface">{attendeeName}</td>
                                        <td className="px-4 py-3 space-y-0.5">
                                          <div className="font-semibold text-on-surface">{t.registrationType || 'N/A'}</div>
                                          <div className="text-[10px] text-on-surface-variant font-medium">{t.tierName} ({t.quantity} Slot)</div>
                                        </td>
                                        <td className="px-4 py-3 font-bold text-emerald-600">{t.seatNumbers?.join(', ') || '-'}</td>
                                        <td className="px-4 py-3 font-black text-on-surface">
                                          {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(t.totalAmount)}
                                        </td>
                                        <td className="px-4 py-3 text-[10px] font-medium text-on-surface-variant">{t.bookingDate.split('T')[0]}</td>
                                        <td className="px-4 py-3">
                                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                            t.isCheckedIn
                                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                                              : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                                          }`}>
                                            {t.isCheckedIn ? 'Sudah Absen' : 'Belum Absen'}
                                          </span>
                                        </td>
                                        <td className="px-4 py-3 max-w-[200px]">
                                          <div className="text-[10px] text-on-surface-variant space-y-0.5 max-h-16 overflow-y-auto no-scrollbar">
                                            {Object.entries(responses).map(([fid, val]) => (
                                              <div key={fid} className="truncate">
                                                <strong className="font-bold text-[9px]">{getFieldLabel(fid, t.eventId)}:</strong> <span className="font-semibold">{val}</span>
                                              </div>
                                            ))}
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  });
                                })()}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    ) : selectedManageSeatsEvent ? (
                      /* VIEW 1: MANAJEMEN SEATING/KURSI EVENT */
                      <div className="space-y-6 text-left">
                        {/* Seating Manager Header */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant/60 pb-4">
                          <div className="space-y-1">
                            <button
                              onClick={() => {
                                setSelectedManageSeatsEvent(null);
                                setSelectedManageSeatsTier(null);
                              }}
                              className="text-xs text-primary font-bold hover:underline inline-flex items-center gap-1 cursor-pointer bg-transparent border-0"
                            >
                              ← Kembali ke Daftar Event
                            </button>
                            <h2 className="font-extrabold text-xl text-on-surface">
                              Kelola Kursi & Kapasitas Penonton
                            </h2>
                            <p className="text-xs text-on-surface-variant">
                              Acara: <strong className="text-on-surface">{selectedManageSeatsEvent.title}</strong> | Lokasi: {selectedManageSeatsEvent.location}
                            </p>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            {selectedManageSeatsEvent.tiers.map((t) => (
                              <button
                                key={t.id}
                                onClick={() => setSelectedManageSeatsTier(t)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                  (selectedManageSeatsTier?.id === t.id || (!selectedManageSeatsTier && selectedManageSeatsEvent.tiers[0]?.id === t.id))
                                    ? 'bg-primary text-on-primary border-primary shadow-xs'
                                    : 'bg-surface border-outline hover:bg-slate-50 text-on-surface-variant'
                                }`}
                              >
                                {t.name} (Rp {t.price.toLocaleString('id-ID')})
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Active Seating Layout Grid */}
                        {(() => {
                          const activeTier = selectedManageSeatsTier || selectedManageSeatsEvent.tiers[0];
                          if (!activeTier) {
                            return (
                              <div className="text-center py-12 bg-surface-container rounded-2xl border border-dashed text-xs text-on-surface-variant">
                                Belum ada kelas tiket pendaftaran untuk event ini.
                              </div>
                            );
                          }

                          // Get prefix
                          const getSeatPrefix = (tName: string) => {
                            const clean = tName.toLowerCase();
                            if (clean.includes('vip')) return 'VIP';
                            if (clean.includes('reguler') || clean.includes('regular')) return 'REG';
                            return tName.slice(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '');
                          };
                          const prefix = getSeatPrefix(activeTier.name);

                          // All tickets for this event and this tier
                          const activeTierTickets = purchasedTickets.filter(
                            (t) => t.eventId === selectedManageSeatsEvent.id && t.tierName === activeTier.name
                          );

                          // Create array of seat numbers from 1 to slotsAvailable (capacity)
                          const totalSeats = activeTier.slotsAvailable;

                          return (
                            <div className="bg-surface-container rounded-3xl p-6 border border-outline-variant space-y-6">
                              <div className="flex items-center justify-between border-b border-outline-variant/40 pb-3 flex-wrap gap-3">
                                <div>
                                  <h3 className="font-extrabold text-sm text-on-surface uppercase">Peta Denah Kursi: Kelas {activeTier.name}</h3>
                                  <span className="text-[10px] text-on-surface-variant font-semibold">Total Kapasitas: {totalSeats} Kursi | Klik kursi untuk Memblokir atau Membebaskan</span>
                                </div>
                                <div className="flex items-center gap-3 text-[10px] font-bold">
                                  <div className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-sm bg-emerald-500 border border-emerald-600 block"></span> Tersedia</div>
                                  <div className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-sm bg-red-500 border border-red-600 block"></span> Booked (User)</div>
                                  <div className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded-sm bg-slate-700 border border-slate-800 block"></span> Blocked (Admin)</div>
                                </div>
                              </div>

                              <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2 max-h-[480px] overflow-y-auto p-1.5 no-scrollbar">
                                {Array.from({ length: totalSeats }, (_, idx) => {
                                  const seatNum = idx + 1;
                                  const seatCode = `${prefix}-${seatNum}`;
                                  
                                  // Check if booked or blocked
                                  const booking = activeTierTickets.find(t => t.seatNumbers.includes(seatCode));
                                  const isBlocked = booking?.userId === 'admin-blocked';
                                  const isBooked = !!booking && !isBlocked;

                                  let bgColor = "bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-600";
                                  let tooltipText = `Kursi ${seatCode} (Tersedia)`;

                                  if (isBlocked) {
                                    bgColor = "bg-slate-700 hover:bg-slate-800 text-slate-200 border-slate-800";
                                    tooltipText = `Kursi ${seatCode} (Diblock oleh Admin)`;
                                  } else if (isBooked) {
                                    bgColor = "bg-red-500 text-white border-red-600 cursor-not-allowed";
                                    const buyerName = booking.formResponses.name || booking.userEmail || "Pembeli";
                                    tooltipText = `Kursi ${seatCode} (Booked: ${buyerName})`;
                                  }

                                  return (
                                    <button
                                      key={seatCode}
                                      type="button"
                                      title={tooltipText}
                                      onClick={async () => {
                                        if (isBooked) {
                                          const status = booking.isCheckedIn ? '✅ Sudah Absen (Hadir)' : '❌ Belum Absen';
                                          const info = `🎫 INFORMASI KURSI BOOKED\n\nNomor Kursi: ${seatCode}\nNama: ${booking.formResponses.name || booking.userEmail}\nEmail Akun: ${booking.userEmail}\nKode Tiket: ${booking.ticketCode}\nStatus: ${status}\nWaktu Booking: ${booking.bookingDate}\n\n*Kursi ini tidak dapat diblokir karena sudah lunas dibeli pengguna.`;
                                          alert(info);
                                          return;
                                        }

                                        if (isBlocked && booking) {
                                          // Unblock: delete document
                                          if (window.confirm(`Apakah Anda yakin ingin membebaskan kembali kursi ${seatCode}?`)) {
                                            try {
                                              await deleteDoc(doc(db, 'tickets', booking.id));
                                              triggerNotification(`Kursi ${seatCode} dibebaskan.`);
                                            } catch (err) {
                                              console.error("Failed to unblock seat", err);
                                            }
                                          }
                                        } else {
                                          // Block: create document
                                          if (window.confirm(`Apakah Anda yakin ingin memblokir kursi ${seatCode} agar tidak bisa dibeli pengguna?`)) {
                                            try {
                                              const blockId = `block-${selectedManageSeatsEvent.id}-${seatCode}`;
                                              await setDoc(doc(db, 'tickets', blockId), {
                                                id: blockId,
                                                eventId: selectedManageSeatsEvent.id,
                                                eventTitle: selectedManageSeatsEvent.title,
                                                eventLocation: selectedManageSeatsEvent.location,
                                                dateMonth: selectedManageSeatsEvent.dateMonth,
                                                dateDay: selectedManageSeatsEvent.dateDay,
                                                dateFullString: selectedManageSeatsEvent.dateFullString,
                                                imageUrl: selectedManageSeatsEvent.imageUrl,
                                                tierName: activeTier.name,
                                                quantity: 1,
                                                pricePerTicket: 0,
                                                totalAmount: 0,
                                                bookingDate: new Date().toLocaleDateString('id-ID') + " " + new Date().toTimeString().slice(0, 5),
                                                ticketCode: 'BLOCKED-BY-ADMIN',
                                                registrationType: 'Admin Blocked',
                                                userId: 'admin-blocked',
                                                formResponses: { name: 'Blocked by Admin' },
                                                seatNumbers: [seatCode],
                                                isCheckedIn: false
                                              });
                                              triggerNotification(`Kursi ${seatCode} berhasil diblokir.`);
                                            } catch (err) {
                                              console.error("Failed to block seat", err);
                                            }
                                          }
                                        }
                                      }}
                                      className={`aspect-square rounded-xl border text-[10px] font-black flex flex-col items-center justify-center transition-all cursor-pointer ${bgColor}`}
                                    >
                                      <span>{seatCode}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    ) : (
                      /* VIEW 2: LIST OF EVENTS FOR ADMIN MANAGEMENT */
                      <div className="space-y-6 text-left">
                        <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3 flex-wrap gap-3">
                          <div>
                            <h2 className="font-extrabold text-lg text-on-surface">Daftar Acara & Kalender Aktif</h2>
                            <p className="text-xs text-on-surface-variant leading-relaxed">
                              Berikut adalah seluruh acara yang aktif di database. Anda dapat mengubah detail acara, menghapusnya, atau mengelola booking kursi.
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setEventToEdit(null);
                              setIsCreateModalOpen(true);
                            }}
                            className="bg-primary text-on-primary text-xs font-black px-5 py-2.5 rounded-full hover:opacity-95 transition-all cursor-pointer flex items-center gap-1 shadow-md border-0"
                          >
                            <Plus className="w-4 h-4 text-white" />
                            <span>Buat Event Baru</span>
                          </button>
                        </div>

                        {events.length === 0 ? (
                          <div className="text-center py-16 bg-surface-container rounded-3xl border border-dashed border-outline-variant space-y-3">
                            <ShieldAlert className="w-12 h-12 text-on-surface-variant/40 mx-auto" />
                            <p className="font-bold text-on-surface-variant text-sm">Belum ada acara aktif di database.</p>
                            <p className="text-xs text-on-surface-variant max-w-xs mx-auto">Klik tombol di atas untuk membuat acara perdana Anda.</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {events.map((evt) => (
                              <div key={evt.id} className="bg-surface-container border border-outline-variant rounded-2xl p-4 flex gap-4 items-start shadow-2xs relative">
                                <img
                                  src={evt.imageUrl}
                                  alt={evt.title}
                                  className="w-20 h-20 rounded-xl object-cover bg-slate-950 shrink-0 border border-outline-variant"
                                />
                                <div className="space-y-1.5 flex-grow min-w-0">
                                  <div className="flex items-start justify-between gap-1">
                                    <h4 className="font-extrabold text-xs text-on-surface leading-tight truncate">{evt.title}</h4>
                                    <span className="text-[9px] bg-primary/10 text-primary font-black px-2 py-0.5 rounded border border-primary/20 shrink-0 uppercase">{evt.category}</span>
                                  </div>
                                  <p className="text-[10px] text-on-surface-variant font-bold leading-none">📍 {evt.location}</p>
                                  <p className="text-[10px] text-on-surface-variant font-bold leading-none">📅 {evt.dateFullString}</p>
                                  <p className="text-[10px] text-primary font-black">
                                    🎫 {evt.tiers.length} Kelas | Harga: {(() => {
                                      const prices = evt.tiers && evt.tiers.length > 0 ? evt.tiers.map(t => Number(t.price) || 0) : [];
                                      const priceMin = evt.priceMin !== undefined ? Number(evt.priceMin) : (prices.length > 0 ? Math.min(...prices) : 0);
                                      const priceMax = evt.priceMax !== undefined ? Number(evt.priceMax) : (prices.length > 0 ? Math.max(...prices) : 0);
                                      if (priceMin === 0 && priceMax === 0) return 'Gratis';
                                      if (priceMin === priceMax) return `Rp ${priceMin.toLocaleString('id-ID')}`;
                                      return `Rp ${priceMin.toLocaleString('id-ID')} - Rp ${priceMax.toLocaleString('id-ID')}`;
                                    })()}
                                  </p>

                                  <div className="flex gap-1.5 pt-2 flex-wrap">
                                    <button
                                      onClick={() => {
                                        setEventToEdit(evt);
                                        setIsCreateModalOpen(true);
                                      }}
                                      className="bg-surface border border-outline hover:bg-slate-50 text-[10px] font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-all text-on-surface"
                                    >
                                      Ubah Detail
                                    </button>
                                    <button
                                      onClick={() => {
                                        setSelectedManageSeatsEvent(evt);
                                        setSelectedManageSeatsTier(evt.tiers[0] || null);
                                      }}
                                      className="bg-primary/10 border border-primary/20 hover:bg-primary/20 text-[10px] font-extrabold px-3 py-1.5 rounded-lg cursor-pointer transition-all text-primary"
                                    >
                                      Kelola Kursi / Block
                                    </button>
                                    <button
                                      onClick={() => {
                                        setSelectedRegistrantsEvent(evt);
                                      }}
                                      className="bg-blue-100 border border-blue-200 hover:bg-blue-200 text-[10px] font-extrabold px-3 py-1.5 rounded-lg cursor-pointer transition-all text-blue-700"
                                    >
                                      Lihat Pendaftar
                                    </button>
                                    <button
                                      onClick={async () => {
                                        if (window.confirm(`Apakah Anda yakin ingin menghapus event "${evt.title}" secara permanen dari database? Semua penjualan tiket event ini juga akan ikut dinonaktifkan.`)) {
                                          try {
                                            await deleteDoc(doc(db, 'events', evt.id));
                                            triggerNotification("Event berhasil dihapus.");
                                          } catch (err) {
                                            console.error("Failed to delete event", err);
                                            triggerNotification("Gagal menghapus event.");
                                          }
                                        }
                                      }}
                                      className="border border-red-200 hover:bg-red-50 text-[10px] font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-all text-red-600 ml-auto bg-transparent"
                                    >
                                      Hapus
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {adminSubTab === 'scanner' && (
                  <div className="space-y-6">
                    <div className="space-y-1 text-left">
                      <h2 className="font-extrabold text-lg text-on-surface">Pintu Absensi & Validasi QR</h2>
                      <p className="text-xs text-on-surface-variant leading-relaxed">
                        Gunakan panel ini untuk mensimulasikan pemisalan kamera pemindai (scanner QR Code) pada pintu masuk pertunjukan atau stadion.
                      </p>
                    </div>
                    {/* Simulated Scanning Frame & Output Screen */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      {/* Left component: Scanning Simulator View */}
                      <div className="lg:col-span-6 bg-slate-900 text-white rounded-3xl p-6 border-4 border-slate-800 shadow-2xl space-y-6 relative overflow-hidden text-left">
                        {/* Camera grid background effect */}
                        <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none opacity-40" />

                        <div className="flex items-center justify-between border-b border-white/10 pb-3 relative z-10">
                          <span className="text-xs font-black tracking-widest text-emerald-400 flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                            SIMULATOR KAMERA SCANNER ACTIVE
                          </span>
                          <Camera className="w-5 h-5 text-slate-400" />
                        </div>

                        {/* Camera display placeholder box */}
                        <div className="relative aspect-video rounded-2xl bg-black border border-white/5 overflow-hidden flex flex-col items-center justify-center text-center">
                          {isAdminScanning ? (
                            <div className="space-y-3 z-10">
                              <RefreshCw className="w-9 h-9 text-emerald-400 animate-spin mx-auto" />
                              <p className="text-xs font-bold font-mono text-emerald-400">Membaca data kode QR...</p>
                            </div>
                          ) : adminScannedTicket ? (
                            <kbd className="space-y-3 text-emerald-400 z-10 px-4 py-2">
                              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto" />
                              <h4 className="text-sm font-black uppercase text-white">Verifikasi Berhasil</h4>
                              <div className="text-[10px] bg-emerald-950/80 p-2.5 rounded-lg border border-emerald-500/30 text-emerald-200 font-mono space-y-1 text-left">
                                <div>KODE: {adminScannedTicket.ticketCode}</div>
                                <div>NAMA: {adminScannedTicket.formResponses['name'] || 'Pemesan'}</div>
                                <div>KELAS: {adminScannedTicket.tierName}</div>
                                <div>KURSI: {adminScannedTicket.seatNumbers?.join(', ') || 'N/A'}</div>
                              </div>
                            </kbd>
                          ) : (
                            <QRScanner
                              onScanSuccess={(decodedText) => {
                                const ticket = purchasedTickets.find(t => t.ticketCode === decodedText);
                                if (ticket) {
                                  handleSimulateAdminScan(ticket);
                                } else {
                                  triggerNotification(`Tiket dengan kode ${decodedText} tidak ditemukan!`);
                                }
                              }}
                              onScanError={(err) => {
                                // console.warn("QR Scan error:", err);
                              }}
                            />
                          )}
                        </div>

                        {!isAdminScanning && !adminScannedTicket && (
                          <div className="space-y-2 mt-4 pt-4 border-t border-white/10 relative z-10 text-left">
                            <label className="text-[10px] font-black uppercase text-slate-400">Verifikasi Manual Kode QR Tiket</label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={adminManualCode}
                                onChange={(e) => setAdminManualCode(e.target.value.toUpperCase())}
                                placeholder="CONTOH: SGX-123-ABCD"
                                className="bg-slate-950 border border-white/10 text-white rounded-xl px-3 py-2 text-xs font-bold font-mono focus:border-emerald-500 focus:outline-none flex-grow"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const trimmed = adminManualCode.trim();
                                  if (!trimmed) {
                                    triggerNotification("Masukkan kode tiket terlebih dahulu!");
                                    return;
                                  }
                                  const ticket = purchasedTickets.find(t => t.ticketCode === trimmed);
                                  if (!ticket) {
                                    triggerNotification(`Tiket dengan kode ${trimmed} tidak ditemukan!`);
                                    return;
                                  }
                                  handleSimulateAdminScan(ticket);
                                }}
                                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black px-4 py-2 rounded-xl cursor-pointer transition-all active:scale-95 border-0 shrink-0"
                              >
                                Verifikasi
                              </button>
                            </div>
                          </div>
                        )}

                        {adminScannedTicket && (
                          <button
                            onClick={() => {
                              setAdminScannedTicket(null);
                              setAdminManualCode('');
                              triggerNotification('Alat pemindai dikosongkan. Siap memindai tiket lain!');
                            }}
                            className="w-full bg-emerald-500 text-slate-950 font-black text-xs py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-400 cursor-pointer active:scale-98 transition-all shadow-md mt-4 relative z-10"
                          >
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Pindai Tiket Lain (Scan Lagi Cepat)</span>
                          </button>
                        )}
                      </div>

                      {/* Right side component: List of booked tickets in system */}
                      <div className="lg:col-span-6 space-y-4 text-left">
                        <div className="bg-surface-container rounded-2xl p-4 border border-outline-variant/60 space-y-3">
                          <h3 className="text-xs font-black text-on-surface uppercase block">Pilih Tiket yang Akan Disimulasikan</h3>
                          <p className="text-[11px] text-on-surface-variant leading-relaxed">
                            Di bawah ini adalah {purchasedTickets.length} tiket virtual yang telah dibeli oleh pengunjung. Anda dapat menekan tombol <strong>Simulasi Pindai</strong> untuk memicu alat absensi di samping kiri.
                          </p>
                        </div>

                        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                          {purchasedTickets.length === 0 ? (
                            <div className="text-center py-12 bg-surface-container-low border border-dashed border-outline-variant rounded-2xl text-xs space-y-2">
                              <ShieldAlert className="w-8 h-8 text-on-surface-variant/40 mx-auto" />
                              <p className="font-semibold text-on-surface-variant">Belum ada tiket yang lunas dibeli.</p>
                              <p className="text-[10px] text-on-surface-variant max-w-xs mx-auto">Silakan menuju tab <button onClick={() => setActiveTab('explore')} className="text-primary font-bold underline">Jelajahi Acara</button> lalu pesan tiket untuk menyimulasikan absensi.</p>
                            </div>
                          ) : (
                            purchasedTickets.map((t) => (
                              <div
                                key={t.id}
                                className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs bg-surface ${
                                  t.isCheckedIn ? 'border-emerald-500/30 bg-emerald-50/5' : 'border-outline-variant'
                                }`}
                              >
                                <div className="space-y-1 flex-1">
                                  <h4 className="font-extrabold text-xs text-on-surface line-clamp-1">{t.eventTitle}</h4>
                                  <div className="text-[10px] text-on-surface-variant font-mono flex flex-wrap gap-x-2">
                                    <span>KODE: <strong>{t.ticketCode}</strong></span>
                                    <span>• Atas Nama: <strong>{t.formResponses['name'] || 'Pemesan'}</strong></span>
                                    <span>• Kursi: <strong className="text-primary">{t.seatNumbers?.join(', ')}</strong></span>
                                  </div>
                                  <div className="pt-1 select-none flex items-center gap-2">
                                    <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase ${
                                      t.isCheckedIn ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800 animate-pulse'
                                    }`}>
                                      {t.isCheckedIn ? '✓ Sudah Hadir (Absen)' : '✗ Belum Hadir'}
                                    </span>
                                    {t.isCheckedIn && (
                                      <span className="text-[10px] text-on-surface-variant italic flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> Pukul: {t.checkInTime}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <button
                                  disabled={isAdminScanning}
                                  onClick={() => handleSimulateAdminScan(t)}
                                  className={`px-3 py-2 rounded-lg font-black text-[10px] uppercase cursor-pointer whitespace-nowrap transition-all ${
                                    t.isCheckedIn
                                      ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                      : 'bg-primary text-on-primary hover:opacity-90 active:scale-95'
                                  }`}
                                >
                                  Simulasi Pindai
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {adminSubTab === 'config' && (
                  <div className="space-y-6">
                    <div className="space-y-1 text-left">
                      <h2 className="font-extrabold text-lg text-on-surface">Kustomisasi Halaman & Countdown</h2>
                      <p className="text-xs text-on-surface-variant leading-relaxed">
                        Jadwalkan pembukaan registrasi acara atau atur banner promo dan tips pintar yang terpajang di beranda utama.
                      </p>
                    </div>
                    {/* ROW 2: PENGATURAN LANDING PAGE & TIKET COUNTDOWN */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left">
                      {/* Left column: Landing Page Configurator */}
                      <div className="lg:col-span-6 bg-surface-container-low rounded-3xl p-6 border border-outline-variant/80 space-y-6">
                        <div className="flex items-center gap-2 border-b border-outline-variant/40 pb-3">
                          <SlidersHorizontal className="w-5 h-5 text-primary" />
                          <div>
                            <h3 className="text-xs font-black uppercase text-on-surface">Kustomisasi CTA & Tips Landing Page</h3>
                            <span className="text-[10px] text-on-surface-variant font-medium">Ubah headline promosi, kode diskon, dan tips pintar secara realtime</span>
                          </div>
                        </div>

                        {/* Enable/Disable Section Toggles (Requirement 8) */}
                        <div className="grid grid-cols-2 gap-4 bg-surface p-3.5 rounded-xl border border-outline-variant/50 text-[11px] font-bold text-on-surface-variant">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="toggle-cta-enabled"
                              checked={activeLandingConfig.isCtaEnabled !== false}
                              onChange={(e) => handleUpdateDraftLandingConfig(prev => ({ ...prev, isCtaEnabled: e.target.checked }))}
                              className="w-4 h-4 text-primary border-outline rounded cursor-pointer"
                            />
                            <label htmlFor="toggle-cta-enabled" className="cursor-pointer select-none">Aktifkan Banner CTA</label>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="toggle-tips-enabled"
                              checked={activeLandingConfig.isTipsEnabled !== false}
                              onChange={(e) => handleUpdateDraftLandingConfig(prev => ({ ...prev, isTipsEnabled: e.target.checked }))}
                              className="w-4 h-4 text-primary border-outline rounded cursor-pointer"
                            />
                            <label htmlFor="toggle-tips-enabled" className="cursor-pointer select-none">Aktifkan Tips Beranda</label>
                          </div>
                        </div>

                        {/* Biaya Platform SAGATIX Configuration */}
                        <div className="bg-surface p-4 rounded-xl border border-outline-variant/50 space-y-4 text-left">
                          <span className="text-[10px] font-black uppercase text-secondary tracking-wider block">Pengaturan Biaya Platform (Layanan)</span>
                          
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="toggle-fee-enabled"
                              checked={activeLandingConfig.isPlatformFeeEnabled !== false}
                              onChange={(e) => handleUpdateDraftLandingConfig(prev => ({ ...prev, isPlatformFeeEnabled: e.target.checked }))}
                              className="w-4 h-4 text-primary border-outline rounded cursor-pointer"
                            />
                            <label htmlFor="toggle-fee-enabled" className="text-xs font-bold text-on-surface-variant cursor-pointer select-none">Aktifkan Biaya Layanan Platform</label>
                          </div>
                          
                          {activeLandingConfig.isPlatformFeeEnabled !== false && (
                            <div className="space-y-1">
                              <label className="text-[10px] font-black uppercase text-on-surface-variant">Persentase Biaya Layanan (%)</label>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.5"
                                value={activeLandingConfig.platformFeePercent ?? 5}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value);
                                  handleUpdateDraftLandingConfig(prev => ({ ...prev, platformFeePercent: isNaN(val) ? 0 : val }));
                                }}
                                className="w-full text-xs font-bold bg-surface border border-outline px-3.5 py-2 rounded-xl text-on-surface focus:border-primary outline-hidden"
                              />
                            </div>
                          )}
                        </div>

                        <div className="space-y-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-on-surface-variant">Judul Promosi Utama (CTA Title)</label>
                            <input
                              type="text"
                              value={activeLandingConfig.ctaTitle}
                              onChange={(e) => handleUpdateDraftLandingConfig(prev => ({ ...prev, ctaTitle: e.target.value }))}
                              className="w-full text-xs font-semibold bg-surface border border-outline px-3.5 py-2.5 rounded-xl text-on-surface focus:border-primary outline-hidden"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-on-surface-variant">Subjudul / Deskripsi Promo</label>
                            <textarea
                              rows={2}
                              value={activeLandingConfig.ctaDescription}
                              onChange={(e) => handleUpdateDraftLandingConfig(prev => ({ ...prev, ctaDescription: e.target.value }))}
                              className="w-full text-xs font-semibold bg-surface border border-outline px-3.5 py-2 rounded-xl text-on-surface focus:border-primary outline-hidden"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[10px] font-black uppercase text-on-surface-variant">Tulisan Tombol (CTA Button)</label>
                              <input
                                type="text"
                                value={activeLandingConfig.ctaButtonText}
                                onChange={(e) => handleUpdateDraftLandingConfig(prev => ({ ...prev, ctaButtonText: e.target.value }))}
                                className="w-full text-xs font-bold bg-surface border border-outline px-3.5 py-2 rounded-xl text-on-surface focus:border-primary outline-hidden"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-black uppercase text-on-surface-variant">Kode Promo Aktif</label>
                              <input
                                type="text"
                                value={activeLandingConfig.promoCode}
                                onChange={(e) => handleUpdateDraftLandingConfig(prev => ({ ...prev, promoCode: e.target.value }))}
                                className="w-full text-xs font-mono font-extrabold bg-surface border border-outline px-3.5 py-2 rounded-xl text-primary focus:border-primary outline-hidden"
                              />
                            </div>
                          </div>

                          {/* Link Direction configuration (Requirement 8 / New Requirement 3) */}
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-on-surface-variant block">Aksi Klik Tombol CTA</label>
                            <select
                              value={
                                activeLandingConfig.ctaLink === '#explore-catalog' || !activeLandingConfig.ctaLink
                                  ? 'explore'
                                  : activeLandingConfig.ctaLink.startsWith('http')
                                    ? 'external'
                                    : 'event'
                              }
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === 'explore') {
                                  handleUpdateDraftLandingConfig(prev => ({ ...prev, ctaLink: '#explore-catalog' }));
                                } else if (val === 'external') {
                                  handleUpdateDraftLandingConfig(prev => ({ ...prev, ctaLink: 'https://' }));
                                } else if (val === 'event') {
                                  handleUpdateDraftLandingConfig(prev => ({ ...prev, ctaLink: events[0]?.id || '' }));
                                }
                              }}
                              className="w-full text-xs font-bold bg-surface border border-outline px-3.5 py-2.5 rounded-xl text-on-surface focus:border-primary outline-hidden cursor-pointer"
                            >
                              <option value="explore">Scroll ke Katalog Event (#explore-catalog)</option>
                              <option value="external">Tautan URL Luar (Link HTTP/HTTPS)</option>
                              <option value="event">Buka Halaman Detail Event Tertentu</option>
                            </select>

                            {/* Show input or event dropdown based on selected type */}
                            {(activeLandingConfig.ctaLink && !activeLandingConfig.ctaLink.startsWith('http') && activeLandingConfig.ctaLink !== '#explore-catalog') ? (
                              <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-on-surface-variant block">Pilih Event Tujuan</label>
                                <select
                                  value={activeLandingConfig.ctaLink}
                                  onChange={(e) => handleUpdateDraftLandingConfig(prev => ({ ...prev, ctaLink: e.target.value }))}
                                  className="w-full text-xs font-bold bg-surface border border-outline px-3.5 py-2.5 rounded-xl text-on-surface focus:border-primary outline-hidden cursor-pointer"
                                >
                                  {events.length === 0 ? (
                                    <option value="">Belum ada event aktif</option>
                                  ) : (
                                    events.map(evt => (
                                      <option key={evt.id} value={evt.id}>{evt.title}</option>
                                    ))
                                  )}
                                </select>
                              </div>
                            ) : activeLandingConfig.ctaLink && activeLandingConfig.ctaLink.startsWith('http') ? (
                              <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-on-surface-variant block">Tautan Link URL Luar</label>
                                <input
                                  type="text"
                                  placeholder="Contoh: https://example.com"
                                  value={activeLandingConfig.ctaLink}
                                  onChange={(e) => handleUpdateDraftLandingConfig(prev => ({ ...prev, ctaLink: e.target.value }))}
                                  className="w-full text-xs font-semibold bg-surface border border-outline px-3.5 py-2.5 rounded-xl text-on-surface focus:border-primary outline-hidden"
                                />
                              </div>
                            ) : null}
                          </div>

                          {/* Interactive Tips List Configurator */}
                          <div className="space-y-3 pt-3 border-t border-outline-variant/40">
                            <span className="text-[10px] font-black uppercase text-secondary tracking-wider block">Kelola Tips Pintar Beranda</span>
                            <div className="space-y-2">
                              {activeLandingConfig.tips.map((tip, idx) => (
                                <div key={idx} className="bg-surface border border-outline-variant/60 rounded-xl p-3 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[9px] bg-secondary-container text-secondary px-2 py-0.5 rounded font-black">TIP #{idx + 1}</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                         const updatedTips = activeLandingConfig.tips.filter((_, i) => i !== idx);
                                         handleUpdateDraftLandingConfig(prev => ({ ...prev, tips: updatedTips }));
                                         triggerNotification(`Tip #${idx + 1} berhasil dihapus dari draf.`);
                                      }}
                                      className="text-[10px] text-red-600 hover:underline font-extrabold cursor-pointer"
                                    >
                                      Hapus
                                    </button>
                                  </div>
                                  <textarea
                                    rows={1}
                                    value={tip}
                                    onChange={(e) => {
                                      const copyTips = [...activeLandingConfig.tips];
                                      copyTips[idx] = e.target.value;
                                      handleUpdateDraftLandingConfig(prev => ({ ...prev, tips: copyTips }));
                                    }}
                                    className="w-full text-xs font-semibold bg-transparent border-b border-dashed border-outline-variant outline-hidden focus:border-primary/50 text-wrap"
                                  />
                                </div>
                              ))}
                              <button
                                type="button"
                                onClick={() => {
                                  handleUpdateDraftLandingConfig(prev => ({
                                    ...prev,
                                    tips: [...prev.tips, 'Masukkan saran/tip pendaftaran baru di sini...']
                                  }));
                                  triggerNotification('Mendaftarkan slot tips pintar baru di draf!');
                                }}
                                className="w-full border-2 border-dashed border-outline-variant hover:border-primary/40 py-2 rounded-xl text-[11px] font-bold text-on-surface-variant hover:text-primary flex items-center justify-center gap-1 cursor-pointer transition-all bg-white"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Tambah Baris Tip Baru</span>
                              </button>
                            </div>
                          </div>

                          {/* Publish button with confirmation (Requirement 8) */}
                          <div className="pt-4 border-t border-outline-variant/40">
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm("Apakah Anda yakin ingin mempublikasikan seluruh perubahan kustomisasi halaman ke database live? Pengguna akan langsung melihat perubahan ini.")) {
                                  handlePublishLandingConfig(activeLandingConfig);
                                  setDraftLandingConfig(null); // reset draft as it is now published
                                }
                              }}
                              className="w-full bg-primary text-on-primary font-black py-3 rounded-xl hover:opacity-95 active:scale-95 transition-all text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md"
                            >
                              <Sparkles className="w-4 h-4 text-white" />
                              <span>Publikasikan Kustomisasi Halaman 🚀</span>
                            </button>
                          </div>

                        </div>
                      </div>

                      {/* Right column: Countdown & Traffic Scheduler */}
                      <div className="lg:col-span-6 bg-surface-container-low rounded-3xl p-6 border border-outline-variant/80 space-y-6">
                        <div className="flex items-center gap-2 border-b border-outline-variant/40 pb-3">
                          <Clock className="w-5 h-5 text-amber-600 animate-spin" style={{ animationDuration: '6s' }} />
                          <div>
                            <h3 className="text-xs font-black uppercase text-on-surface">Pendaftaran Countdown & Beban Traffic</h3>
                            <span className="text-[10px] text-on-surface-variant font-medium">Uji simulasi hitung mundur pembukaan & antrean bandwidth</span>
                          </div>
                        </div>

                        <p className="text-[11px] text-on-surface-variant leading-relaxed font-semibold">
                          Konfigurasikan pembukaan registrasi (buka sekarang or countdown) dan jumlah request aktif pendaftar. Jika beban request &gt; 30 user, sistem penghemat bandwidth secara otomatis memindahkan user ke ruang antrean interaktif di halaman pendaftaran.
                        </p>

                        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                          {events.length === 0 ? (
                            <div className="text-center py-12 bg-surface border border-dashed border-outline-variant rounded-2xl text-xs space-y-2">
                              <ShieldAlert className="w-8 h-8 text-on-surface-variant/40 mx-auto" />
                              <p className="font-semibold text-on-surface-variant">Belum ada acara aktif di database.</p>
                              <p className="text-[10px] text-on-surface-variant max-w-xs mx-auto">Silakan buat acara baru terlebih dahulu.</p>
                            </div>
                          ) : (
                            events.map((evt) => {
                              const hasLock = !!evt.registrationOpenTime && new Date(evt.registrationOpenTime).getTime() > Date.now();
                              return (
                                <div key={evt.id} className="bg-surface border border-outline-variant rounded-2xl p-4 space-y-3.5">
                                  <div className="flex justify-between items-start gap-2">
                                    <div>
                                      <h4 className="font-extrabold text-xs text-on-surface leading-tight line-clamp-1">{evt.title}</h4>
                                      <span className="text-[9px] text-on-surface-variant font-bold uppercase">{evt.category} • ID: {evt.id}</span>
                                    </div>
                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                                      hasLock ? 'bg-amber-105 text-amber-800 animate-pulse border border-amber-300' : 'bg-emerald-100 text-emerald-800'
                                    }`}>
                                      {hasLock ? '🔒 Pendaftaran Terkunci' : '🔓 Terbuka / Lepas'}
                                    </span>
                                  </div>

                                  {/* Change Traffic Visitors count */}
                                  <div className="bg-surface-container px-3 py-2.5 rounded-xl flex items-center justify-between text-xs">
                                    <div className="space-y-0.5">
                                      <span className="text-[10px] font-black text-on-surface-variant block">Simulasi Pengunjung Aktif:</span>
                                      <span className="text-[9px] text-emerald-700 font-extrabold leading-none block">
                                        {evt.simulatedRequestsCount ?? 15} Request { (evt.simulatedRequestsCount ?? 15) > 30 ? '🔥 (Antrean Aktif)' : '• (Masuk Langsung)' }
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 font-mono">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const currentR = evt.simulatedRequestsCount ?? 15;
                                          const nextR = Math.max(0, currentR - 5);
                                          setEvents(prev => prev.map(e => e.id === evt.id ? { ...e, simulatedRequestsCount: nextR } : e));
                                          triggerNotification(`Saran: Beban server diturunkan!`);
                                        }}
                                        className="w-7 h-7 rounded-lg bg-white border border-outline hover:bg-slate-50 font-black text-xs cursor-pointer flex items-center justify-center active:scale-95"
                                      >
                                        -
                                      </button>
                                      <span className="font-mono font-black w-6 text-center">{evt.simulatedRequestsCount ?? 15}</span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const currentR = evt.simulatedRequestsCount ?? 15;
                                          const nextR = currentR + 10;
                                          setEvents(prev => prev.map(e => e.id === evt.id ? { ...e, simulatedRequestsCount: nextR } : e));
                                          triggerNotification(`Saran: Beban pendaftar ditingkatkan!`);
                                        }}
                                        className="w-7 h-7 rounded-lg bg-white border border-outline hover:bg-slate-50 font-black text-xs cursor-pointer flex items-center justify-center active:scale-95"
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>

                                  {/* Set Schedule Shortcuts */}
                                  <div className="space-y-2 text-xs">
                                    <span className="text-[10px] font-black uppercase text-on-surface-variant">Konfigurasi Pembukaan & Hitung Mundur:</span>
                                    <div className="grid grid-cols-2 gap-1.5 text-center text-[10px] font-bold">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEvents(prev => prev.map(e => e.id === evt.id ? { ...e, registrationOpenTime: undefined } : e));
                                          triggerNotification(`🔓 Pendaftaran ${evt.title} dinonaktifkan kuncinya!`);
                                        }}
                                        className={`py-2 px-1 rounded-lg border cursor-pointer transition-all ${
                                          !evt.registrationOpenTime 
                                            ? 'bg-primary text-on-primary border-primary font-black shadow-xs'
                                            : 'bg-white text-on-surface-variant border-outline hover:bg-slate-50'
                                        }`}
                                      >
                                        Buka Sekarang (Free)
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          const futureDate = new Date(Date.now() + 30 * 1000).toISOString();
                                          setEvents(prev => prev.map(e => e.id === evt.id ? { ...e, registrationOpenTime: futureDate } : e));
                                          triggerNotification(`⏳ Pendaftaran ${evt.title} diset countdown tinggal 30 detik!`);
                                        }}
                                        className="py-2 px-1 rounded-lg border bg-white border-outline hover:bg-slate-50 text-on-surface-variant cursor-pointer"
                                      >
                                        Countdown 30 Detik
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          const futureDate = new Date(Date.now() + 45 * 60 * 1000).toISOString();
                                          setEvents(prev => prev.map(e => e.id === evt.id ? { ...e, registrationOpenTime: futureDate } : e));
                                          triggerNotification(`⏳ Pendaftaran ${evt.title} diset countdown tinggal 45 menit!`);
                                        }}
                                        className="py-2 px-1 rounded-lg border bg-white border-outline hover:bg-slate-50 text-on-surface-variant cursor-pointer"
                                      >
                                        Countdown 45 Mnt
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          const tomorrowDate = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
                                          setEvents(prev => prev.map(e => e.id === evt.id ? { ...e, registrationOpenTime: tomorrowDate } : e));
                                          triggerNotification(`🔒 Acara ${evt.title} dikunci untuk dibuka besok.`);
                                        }}
                                        className="py-2 px-1 rounded-lg border bg-white border-outline hover:bg-slate-50 text-on-surface-variant cursor-pointer"
                                      >
                                        Tutup (Buka Besok)
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {adminSubTab === 'sandbox' && (
                  <div className="space-y-6">
                    <div className="space-y-1 text-left">
                      <h2 className="font-extrabold text-lg text-on-surface">Pusat Uji Coba & REST API</h2>
                      <p className="text-xs text-on-surface-variant leading-relaxed">
                        Gunakan instrumen ini untuk menguji respon REST API dan menyimulasikan kegagalan pembayaran.
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      {/* Left Column: Sandbox Switches & Actions */}
                      <div className="lg:col-span-5 space-y-5 text-left">
                        {/* Sandbox Mode Options Card */}
                        <div className="bg-surface-container border border-outline-variant rounded-2xl p-5 space-y-4 shadow-2xs">
                          <h3 className="text-sm font-extrabold text-on-surface uppercase flex items-center gap-1.5 border-b border-outline-variant/50 pb-2">
                            <SlidersHorizontal className="w-4 h-4 text-primary" /> Pengaturan Simulasi
                          </h3>

                          {/* Payment Failure Simulation Toggle */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-bold text-on-surface-variant block">Simulasi Kegagalan Pembayaran</label>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsSandboxFailureMode(!isSandboxFailureMode);
                                  triggerNotification(
                                    !isSandboxFailureMode
                                      ? "🚨 Simulasi Gagal Pembayaran Diaktifkan! checkout berikutnya akan gagal."
                                      : "✅ Simulasi Gagal Pembayaran Dimatikan."
                                  );
                                }}
                                className={`w-12 h-6 flex items-center rounded-full p-0.5 cursor-pointer transition-colors duration-300 ${
                                  isSandboxFailureMode ? 'bg-[#ef4444]' : 'bg-slate-300'
                                }`}
                              >
                                <span className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 ${
                                  isSandboxFailureMode ? 'translate-x-6' : 'translate-x-0'
                                }`} />
                              </button>
                            </div>
                            <p className="text-[10px] text-on-surface-variant leading-relaxed">
                              Ketika aktif, proses pembayaran tiket akan direkayasa gagal (mensimulasikan penolakan bank atau interupsi API). Memungkinkan Anda menguji draf pendaftaran lokal yang tersimpan.
                            </p>
                          </div>

                          {/* Traffic Load Simulation Toggle (New Requirement 6 & 7) */}
                          <div className="space-y-2 border-t border-outline-variant/60 pt-3">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-bold text-on-surface-variant block">Simulasi Beban Traffic Tinggi</label>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsSandboxTrafficActive(!isSandboxTrafficActive);
                                  triggerNotification(
                                    !isSandboxTrafficActive
                                      ? "🚨 Simulasi Beban Traffic Tinggi Diaktifkan! Pengguna akan masuk antrean."
                                      : "✅ Simulasi Beban Traffic Tinggi Dimatikan."
                                  );
                                }}
                                className={`w-12 h-6 flex items-center rounded-full p-0.5 cursor-pointer transition-colors duration-300 ${
                                  isSandboxTrafficActive ? 'bg-primary' : 'bg-slate-300'
                                }`}
                              >
                                <span className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 ${
                                  isSandboxTrafficActive ? 'translate-x-6' : 'translate-x-0'
                                }`} />
                              </button>
                            </div>
                            <p className="text-[10px] text-on-surface-variant leading-relaxed">
                              Ketika aktif, sistem akan menyimulasikan lonjakan jumlah pemesan secara nyata. Hal ini menempatkan pengguna dalam antrean interaktif dengan visual hitung mundur jumlah orang di depannya.
                            </p>
                          </div>

                          {/* Countdown Simulation Toggle (New Requirement 6) */}
                          <div className="space-y-2 border-t border-outline-variant/60 pt-3">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-bold text-on-surface-variant block">Simulasi Kunci Countdown Pendaftaran</label>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsSandboxCountdownActive(!isSandboxCountdownActive);
                                  triggerNotification(
                                    !isSandboxCountdownActive
                                      ? "⏳ Simulasi Kunci Countdown Diaktifkan! Pendaftaran terkunci dengan timer."
                                      : "✅ Simulasi Kunci Countdown Dimatikan."
                                  );
                                }}
                                className={`w-12 h-6 flex items-center rounded-full p-0.5 cursor-pointer transition-colors duration-300 ${
                                  isSandboxCountdownActive ? 'bg-amber-500' : 'bg-slate-300'
                                }`}
                              >
                                <span className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 ${
                                  isSandboxCountdownActive ? 'translate-x-6' : 'translate-x-0'
                                }`} />
                              </button>
                            </div>
                            <p className="text-[10px] text-on-surface-variant leading-relaxed">
                              Ketika aktif, semua pendaftaran event baru akan dikunci dengan tampilan visual countdown (hitung mundur) status pendaftaran yang berdetak mundur.
                            </p>
                          </div>

                          <div className="border-t border-outline-variant/60 pt-4 space-y-3">
                            <h4 className="text-xs font-bold text-on-surface">Alat Suntik Data Cepat (Data Generator)</h4>
                            <div className="grid grid-cols-1 gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  if (events.length === 0) {
                                    triggerNotification("❌ Buat minimal 1 acara terlebih dahulu sebelum menyuntik tiket!");
                                    return;
                                  }
                                  const randomEvent = events[Math.floor(Math.random() * events.length)];
                                  const randomTier = randomEvent.tiers[Math.floor(Math.random() * randomEvent.tiers.length)];
                                  const randomRole = randomEvent.registrationRoles?.[Math.floor(Math.random() * (randomEvent.registrationRoles?.length || 1))] || { name: 'Penonton' };
                                  const mockCode = `SGX-${Math.floor(Math.random() * 900 + 100)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
                                  
                                  const dummyTicket: PurchasedTicket = {
                                    id: `ticket-${Date.now()}`,
                                    eventId: randomEvent.id,
                                    eventTitle: randomEvent.title,
                                    eventLocation: randomEvent.location,
                                    dateMonth: randomEvent.dateMonth,
                                    dateDay: randomEvent.dateDay,
                                    dateFullString: randomEvent.dateFullString,
                                    imageUrl: randomEvent.imageUrl,
                                    tierName: randomTier.name,
                                    quantity: 1,
                                    pricePerTicket: randomTier.price,
                                    totalAmount: randomTier.price,
                                    bookingDate: new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) + " 12:00",
                                    ticketCode: mockCode,
                                    registrationType: randomRole.name,
                                    formResponses: {
                                      name: "Akun Simulasi " + Math.floor(Math.random() * 90 + 10),
                                      email: "sandbox@sagatix.io",
                                      whatsapp: "089876543210"
                                    },
                                    ticketHolders: [],
                                    seatNumbers: [`S-${Math.floor(Math.random() * 300) + 101}`],
                                    isCheckedIn: false
                                  };

                                  setPurchasedTickets((prev) => [dummyTicket, ...prev]);
                                  triggerNotification("✨ Tiket virtual sukses disuntikkan ke tab Tiket Saya!");
                                }}
                                className="w-full bg-[#10b981] hover:bg-[#059669] text-white text-xs py-2.5 px-3 rounded-lg font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs"
                              >
                                <Plus className="w-4 h-4" />
                                Suntik 1 Tiket Sukses Instan
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setPurchasedTickets([]);
                                  triggerNotification("🧹 Seluruh riwayat pembelian sukses dibersihkan!");
                                }}
                                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-2 cursor-pointer transition-all border border-slate-300"
                              >
                                <RefreshCw className="w-4 h-4" />
                                Kosongkan Riwayat Tiket
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Developer Credit Info Card */}
                        <div className="bg-surface-container-low border border-outline-variant rounded-2xl p-4 text-xs space-y-2">
                          <h4 className="font-bold text-on-surface flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-primary" /> Informasi Lisensi & REST API
                          </h4>
                          <p className="text-on-surface-variant leading-relaxed text-[11px]">
                            REST API ini aktif secara nyata pada port <span className="font-mono text-primary font-bold">3000</span> dengan file <span className="font-mono text-primary">server.ts</span>. Integrasi mendukung deployment Cloud Run yang di-host dalam reverse proxy Sagatix.
                          </p>
                          <p className="text-[10px] text-on-surface-variant font-mono text-left">
                            Host Server: 0.0.0.0:3000<br />
                            Database: Local JSON In-Memory
                          </p>
                        </div>
                      </div>

                      {/* Right Column: Interactive API Explorer */}
                      <div className="lg:col-span-7 space-y-4 text-left">
                        <div className="bg-surface-container border border-outline-variant rounded-2xl p-5 space-y-4 shadow-2xs">
                          <div className="flex items-center justify-between border-b border-outline-variant/50 pb-2">
                            <h3 className="text-sm font-extrabold text-on-surface uppercase flex items-center gap-1.5">
                              <CreditCard className="w-4 h-4 text-emerald-600" /> Katalog Penjelajah REST API Live
                            </h3>
                            <span className="text-[9px] font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              Active v1.0
                            </span>
                          </div>

                          <p className="text-xs text-on-surface-variant leading-relaxed">
                            Tekan tombol <strong className="text-primary">Uji Live</strong> pada salah satu API di bawah ini untuk melihat tanggapan real-time secara asinkron dari server Node/Express.
                          </p>

                          {/* API Endpoint Row Components */}
                          <div className="space-y-2 max-h-80 overflow-y-auto pr-1 text-left">
                            {[
                              {
                                method: "GET",
                                path: "/api/events",
                                desc: "Mengambil daftar ringkasan acara (event) aktif untuk menghemat beban jaringan.",
                                action: async () => {
                                  setApiTerminalLoading(true);
                                  try {
                                    const r = await fetch("/api/events");
                                    const data = await r.json();
                                    setApiTerminalOutput(JSON.stringify(data, null, 2));
                                  } catch {
                                    setApiTerminalOutput("// Gagal berkomunikasi dengan server backend.");
                                  } finally {
                                    setApiTerminalLoading(false);
                                  }
                                }
                              },
                              {
                                method: "GET",
                                path: "/api/events/:id",
                                desc: "Mengambil detail lengkap satu acara (event) berdasarkan ID secara spesifik.",
                                action: async () => {
                                  setApiTerminalLoading(true);
                                  try {
                                    const r = await fetch("/api/events/evt-1");
                                    const data = await r.json();
                                    setApiTerminalOutput(JSON.stringify(data, null, 2));
                                  } catch {
                                    setApiTerminalOutput("// Gagal mengambil detail event.");
                                  } finally {
                                    setApiTerminalLoading(false);
                                  }
                                }
                              },
                              {
                                method: "POST",
                                path: "/api/events",
                                desc: "Mengunggah / mempublikasikan acara baru kustom langsung ke dalam basis data.",
                                action: async () => {
                                  setApiTerminalLoading(true);
                                  try {
                                    const response = await fetch('/api/events', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        title: "Turnamen E-Sports Sandbox " + Math.floor(Math.random() * 100),
                                        category: "Game",
                                        location: "Sangat Imersif Arena",
                                        priceMin: 50000,
                                        priceMax: 150000,
                                        imageUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e",
                                        dateMonth: "DES",
                                        dateDay: "12",
                                        dateFullString: "Sabtu, 12 Des 2026",
                                        tiers: [{id: "t-1", name: "Tribun", price: 50000, slotsAvailable: 10}],
                                        registrationRoles: [{ id: "r-1", name: "Pemain", isTeamType: false }]
                                      })
                                    });
                                    const data = await response.json();
                                    if (response.ok) {
                                      setEvents(prev => [data, ...prev]);
                                    }
                                    setApiTerminalOutput(JSON.stringify(data, null, 2));
                                  } catch {
                                    setApiTerminalOutput("// Gangguan koneksi API.");
                                  } finally {
                                    setApiTerminalLoading(false);
                                  }
                                }
                              },
                              {
                                method: "GET",
                                path: "/api/tickets",
                                desc: "Mengunduh laporan seluruh riwayat tiket yang lunas dibeli untuk pengawasan audit.",
                                action: async () => {
                                  setApiTerminalLoading(true);
                                  try {
                                    const r = await fetch("/api/tickets");
                                    const data = await r.json();
                                    setApiTerminalOutput(JSON.stringify(data, null, 2));
                                  } catch {
                                    setApiTerminalOutput("// Gangguan koneksi API.");
                                  } finally {
                                    setApiTerminalLoading(false);
                                  }
                                }
                              },
                              {
                                method: "GET",
                                path: "/api/stats",
                                desc: "Menghitung metrik total omzet kotor, tiket sold, rincian checkin, dan KPI acara.",
                                action: async () => {
                                  setApiTerminalLoading(true);
                                  try {
                                    const totalRevenueSym = purchasedTickets.reduce((a, t) => a + t.totalAmount, 0);
                                    const totalCheckinsSym = purchasedTickets.filter(t => t.isCheckedIn).length;
                                    setApiTerminalOutput(JSON.stringify({
                                      success: true,
                                      totalBookings: purchasedTickets.length,
                                      totalTicketsSold: purchasedTickets.reduce((a, t) => a + t.quantity, 0),
                                      totalRevenue: totalRevenueSym,
                                      totalCheckIns: totalCheckinsSym,
                                      eventsCount: events.length,
                                      disclaimer: "Sinkronisasi real-time instrumen React & Express Node active."
                                    }, null, 2));
                                  } catch {
                                    setApiTerminalOutput("// Gagal mengambil statistik.");
                                  } finally {
                                    setApiTerminalLoading(false);
                                  }
                                }
                              }
                            ].map((api, idx) => (
                              <div key={idx} className="p-3 bg-surface-container-highest border border-outline-variant/60 rounded-xl space-y-2 text-xs">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5 font-mono">
                                    <span className={`px-2 py-0.5 rounded font-black text-[10px] ${
                                      api.method === 'GET' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-[#d97706]'
                                    }`}>
                                      {api.method}
                                    </span>
                                    <span className="font-extrabold text-on-surface">{api.path}</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={api.action}
                                    disabled={apiTerminalLoading}
                                    className="bg-primary text-on-primary font-bold text-[10px] px-3 py-1 rounded-md cursor-pointer transition-all"
                                  >
                                    {apiTerminalLoading ? "Memproses..." : "Uji Live ⚡"}
                                  </button>
                                </div>
                                <p className="text-[11px] text-on-surface-variant">{api.desc}</p>
                              </div>
                            ))}
                          </div>

                          {/* Mock Terminal Output Frame */}
                          <div className="space-y-1.5 pt-1 text-left">
                            <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest block font-mono">💻 Terminal Log Event & JSON Output:</span>
                            <div className="bg-slate-950 text-emerald-400 font-mono text-[11px] p-4 rounded-xl border border-slate-800 min-h-[160px] max-h-[180px] overflow-auto shadow-inner whitespace-pre-wrap leading-relaxed relative">
                              {apiTerminalLoading && (
                                <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center text-xs text-white">
                                  <span className="animate-spin text-emerald-400 border-2 border-emerald-400 border-t-transparent w-5 h-5 rounded-full mr-2" />
                                  Memuat data API...
                                </div>
                              )}
                              <code>{apiTerminalOutput}</code>
                            </div>
                          </div>

                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* TAB RENDERING: HELP & SUPPORT */}
            {activeTab === 'help' && !selectedDetailsEvent && (
              <motion.div
                key="help-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="max-w-3xl mx-auto space-y-6"
              >
                {/* Panduan Bantuan */}
                <div className="space-y-2">
                  <h1 className="font-extrabold text-2xl md:text-3xl text-on-surface">Pusat Bantuan & Dukungan</h1>
                  <p className="text-sm text-on-surface-variant">
                    Jawaban, solusi pemecahan masalah, dan layanan bantuan langsung terkait tiket acara.
                  </p>
                </div>

                {/* FAQ Cards */}
                <div className="grid grid-cols-1 gap-4">
                  {[
                    {
                      q: 'Bagaimana cara mengakses tiket yang sudah saya beli?',
                      a: 'Setelah transaksi tiket selesai, pass tiket Anda langsung terdaftar di tab "Tiket Saya". Anda dapat menemukan kode QR unik yang siap dipindai di pintu masuk pertunjukan.'
                    },
                    {
                      q: 'Apakah tiket bisa di-download?',
                      a: 'Sangat bisa! Pada tab "Tiket Saya", klik tombol "Download Tiket Fisik (HTML)". File tersebut akan disimpan di memori telepon/gawai dan dapat ditunjukkan offline kepada staf administrasi pintu gerbang.'
                    },
                    {
                      q: 'Bagaimana cara memajang acara buatan saya?',
                      a: 'Anda dapat menekan menu "Buat Acara" di navigasi atas atau klik "Bagikan Acara Anda" di bagian kiri bawah sidebar. Isi formulir serta tambahkan foto poster kustom untuk mempublikasikan acara Anda seketika.'
                    },
                    {
                      q: 'Bolehkah saya memilih lebih dari 1 tiket?',
                      a: 'Tentu saja! Tekan tombol tambah atau kurang (+ / -) di modal untuk menentukan tiket yang ingin dipesan. Jumlah maksimal pembelian adalah 10 tiket per transaksi demi kenyamanan antrean penonton.'
                    }
                  ].map((faq, i) => (
                    <div
                      key={i}
                      className="bg-surface-container-low border border-outline-variant rounded-xl p-5 space-y-2 hover:border-outline hover:bg-surface-container transition-all"
                    >
                      <h4 className="font-bold text-sm text-on-surface flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-primary" />
                        {faq.q}
                      </h4>
                      <p className="text-xs text-on-surface-variant pl-6 leading-relaxed">
                        {faq.a}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Form Bantuan Hubungi */}
                <div className="bg-primary/5 border border-primary/25 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-5">
                  <div className="space-y-1 text-center md:text-left">
                    <h3 className="font-bold text-primary flex items-center gap-1.5 justify-center md:justify-start">
                      <Coffee className="w-5 h-5 text-primary" /> Butuh Bantuan Langsung?
                    </h3>
                    <p className="text-xs text-on-surface-variant max-w-md leading-relaxed">
                      Layanan bantuan kami aktif 24 jam seminggu. Hubungi tim dukungan melalui email <span className="font-semibold text-primary underline"> concierg@sagatix.io</span> untuk pertanyaan tempat duduk atau bantuan pembayaran.
                    </p>
                  </div>
                  <button
                    onClick={() => triggerNotification('Permintaan tiket dukungan berhasil diajukan')}
                    className="w-full md:w-auto bg-primary text-on-primary font-bold text-xs px-6 py-3 rounded-full hover:opacity-90 active:scale-95 transition-all whitespace-nowrap cursor-pointer"
                  >
                    Ajukan Tiket Bantuan
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </main>
      </div>

      {/* Footer Utama */}
      <footer className="bg-surface-container-highest border-t border-outline-variant w-full py-8 mt-auto shrink-0 transition-colors">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-6 max-w-7xl mx-auto">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary font-black">
              <Sparkles className="w-5 h-5 fill-primary/15" />
              <span className="text-lg">SAGATIX</span>
            </div>
            <p className="text-xs text-on-surface-variant max-w-sm leading-relaxed">
              Menghubungkan penikmat kompetisi esport, olahraga, dan konser musik dengan penonton terbaik di seluruh dunia tanpa hambatan. Destinasi pemesanan tiket terpercaya.
            </p>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-3.5 md:justify-end items-center text-xs text-on-surface-variant font-medium">
            <button
              onClick={() => triggerNotification('Kebijakan Privasi dan persetujuan dimuat')}
              className="hover:underline hover:text-primary cursor-pointer"
            >
              Kebijakan Privasi
            </button>
            <button
              onClick={() => triggerNotification('Ketentuan Layanan diperbarui untuk tahun 2026')}
              className="hover:underline hover:text-primary cursor-pointer"
            >
              Ketentuan Layanan
            </button>
            <button
              onClick={() => triggerNotification('Email resmi: fathironmy4@gmail.com')}
              className="hover:underline hover:text-primary cursor-pointer"
            >
              Hubungi Dukungan
            </button>
            <button
              onClick={() => triggerNotification('Konfigurasi Cookie disimpan')}
              className="hover:underline hover:text-primary cursor-pointer"
            >
              Pengaturan Cookie
            </button>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-outline-variant/30 text-center">
          <p className="text-xs text-on-surface-variant">
            © 2026 Ticketing SAGATIX dengan tema Material You. Hak cipta dilindungi undang-undang. Email terdaftar: fathironmy4@gmail.com
          </p>
        </div>
      </footer>

      {/* FIXED MOBILE BOTTOM NAVIGATION MENU (Requirement 3) */}
      <nav id="mobile-nav-bar" className="lg:hidden fixed bottom-x-0 bottom-0 left-0 right-0 z-90 bg-surface/95 backdrop-blur-lg border-t border-outline-variant flex justify-around items-center py-2 px-1 shadow-[0_-5px_15px_rgba(0,0,0,0.05)] text-center">
        <button
          onClick={() => {
            setSelectedDetailsEvent(null);
            setActiveTab('explore');
          }}
          className={`flex flex-col items-center gap-0.5 cursor-pointer py-1 flex-1 ${
            activeTab === 'explore' ? 'text-primary font-black scale-102' : 'text-on-surface-variant'
          }`}
        >
          <Compass className="w-5 h-5 mx-auto" />
          <span className="text-[10px] font-extrabold leading-none">Jelajahi</span>
        </button>

        <button
          onClick={() => {
            setSelectedDetailsEvent(null);
            setActiveTab('tickets');
          }}
          className={`flex flex-col items-center gap-0.5 cursor-pointer py-1 flex-1 relative ${
            activeTab === 'tickets' ? 'text-primary font-black scale-102' : 'text-on-surface-variant'
          }`}
        >
          <Ticket className="w-5 h-5 mx-auto" />
          <span className="text-[10px] font-extrabold leading-none">Tiket Saya</span>
          {purchasedTickets.length > 0 && (
            <span className="absolute top-0.5 right-[15%] bg-error text-white font-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center">
              {purchasedTickets.length}
            </span>
          )}
        </button>

        {(currentUser?.role === 'admin' || currentUser?.role === 'superadmin') && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex flex-col items-center justify-center cursor-pointer flex-1 -mt-5"
          >
            <div className="w-11 h-11 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-md border-2 border-surface active:scale-95 transition-transform">
              <Plus className="w-5 h-5 stroke-[3]" />
            </div>
            <span className="text-[9px] font-black text-primary mt-1 tracking-wider uppercase block">Buat</span>
          </button>
        )}
 
        {(currentUser?.role === 'admin' || currentUser?.role === 'superadmin') && (
          <button
            onClick={() => {
              setSelectedDetailsEvent(null);
              setActiveTab('admin');
            }}
            className={`flex flex-col items-center gap-0.5 cursor-pointer py-1 flex-1 ${
              activeTab === 'admin' ? 'text-primary font-black scale-102' : 'text-on-surface-variant'
            }`}
          >
            <SlidersHorizontal className="w-5 h-5 mx-auto" />
            <span className="text-[10px] font-extrabold leading-none">Admin</span>
          </button>
        )}

        <button
          onClick={() => {
            setSelectedDetailsEvent(null);
            setActiveTab('help');
          }}
          className={`flex flex-col items-center gap-0.5 cursor-pointer py-1 flex-1 ${
            activeTab === 'help' ? 'text-primary font-black scale-102' : 'text-on-surface-variant'
          }`}
        >
          <HelpCircle className="w-5 h-5 mx-auto" />
          <span className="text-[10px] font-extrabold leading-none">Bantuan</span>
        </button>
      </nav>

      {/* Kontrol Overlay / Dialog */}
      <AnimatePresence>

        {/* Modal Pembuatan Acara Baru */}
        {isCreateModalOpen && (
          <CreateEventModal
            eventData={eventToEdit || undefined}
            onClose={() => {
              setIsCreateModalOpen(false);
              setEventToEdit(null);
            }}
            onSaveEvent={handleSaveEvent}
            currentUser={currentUser}
          />
        )}

      </AnimatePresence>

      {/* Toast Notification HUD */}
      <AnimatePresence>
        {notificationMsg && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 lg:bottom-8 left-1/2 -translate-y-1/2 -translate-x-1/2 z-110 bg-slate-900 border border-white/10 text-white rounded-2xl px-5 py-3 shadow-2xl flex items-center gap-2.5 text-xs font-bold max-w-sm"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <span>{notificationMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
