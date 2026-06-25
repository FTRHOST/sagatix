import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Event, TicketTier, PurchasedTicket, FormSection, RegistrationRoleConfig } from '../types';
import { ArrowLeft, Calendar, MapPin, Shield, Check, Sparkles, User, Award, Info, Heart, Ticket, Users, Layers, ChevronRight, ChevronLeft, Download, Clock, Hourglass, Server } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { signInWithGoogle, auth, db } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { QRCode } from './QRCode';
import QRCodeLib from 'qrcode';

interface EventDetailPageProps {
  event: Event;
  isFavorited: boolean;
  onToggleFavorite: (id: string, e: React.MouseEvent) => void;
  onBack: () => void;
  onBookTickets: (ticket: PurchasedTicket) => void;
  triggerNotification: (msg: string) => void;
  currentUser: { fullName: string; email: string; role?: 'admin' | 'biasa' } | null;
  onLoginUser: (user: { fullName: string; email: string; role?: 'admin' | 'biasa' }) => void;
  isSandboxFailureMode?: boolean;
  isSandboxTrafficActive?: boolean;
  isSandboxCountdownActive?: boolean;
  tickets?: PurchasedTicket[];
  isPlatformFeeEnabled?: boolean;
  platformFeePercent?: number;
}

function getFieldLabelFromEvent(fieldId: string, event: Event): string {
  if (event.registrationRoles) {
    for (const role of event.registrationRoles) {
      if (role.formSections) {
        for (const section of role.formSections) {
          if (section.fields) {
            const field = section.fields.find(f => f.id === fieldId);
            if (field) return field.label;
          }
        }
      }
    }
  }
  if (event.formSections) {
    for (const section of event.formSections) {
      if (section.fields) {
        const field = section.fields.find(f => f.id === fieldId);
        if (field) return field.label;
      }
    }
  }
  if (event.customFormFields) {
    const field = event.customFormFields.find(f => f.id === fieldId);
    if (field) return field.label;
  }
  return fieldId;
}

export const EventDetailPage: React.FC<EventDetailPageProps> = ({
  event,
  isFavorited,
  onToggleFavorite,
  onBack,
  onBookTickets: onBookTicketsProp,
  triggerNotification: triggerNotificationProp,
  currentUser,
  onLoginUser: onLoginUserProp,
  isSandboxFailureMode = false,
  isSandboxTrafficActive = false,
  isSandboxCountdownActive = false,
  tickets = [],
  isPlatformFeeEnabled = true,
  platformFeePercent = 5,
}) => {
  // Safe deferred wrappers to completely prevent React 18 concurrent update / render-overlap warnings
  const triggerNotification = (msg: string) => {
    setTimeout(() => {
      triggerNotificationProp(msg);
    }, 0);
  };

  const onLoginUser = (user: { fullName: string; email: string; role?: 'admin' | 'biasa' }) => {
    setTimeout(() => {
      onLoginUserProp(user);
    }, 0);
  };

  const onBookTickets = (ticket: PurchasedTicket) => {
    setTimeout(() => {
      onBookTicketsProp(ticket);
    }, 0);
  };

  // Helper Format Rupiah
  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // 1. Resolve custom registration roles (with custom names from administrator)
  const roles: RegistrationRoleConfig[] = event.registrationRoles && event.registrationRoles.length > 0
    ? event.registrationRoles
    : [
        { id: 'r-lomba', name: 'Peserta Lomba', isTeamType: true, description: 'Pendaftaran untuk bertanding / turnamen' },
        { id: 'r-penonton', name: 'Penonton', isTeamType: false, description: 'Reservasi kursi penonton umum' }
      ];

  const [selectedRole, setSelectedRole] = useState<RegistrationRoleConfig>(roles[0]);

  // 2. Resolve custom ticket tiers configured by administrator, filtered by selected category/role if configured
  const tiers: TicketTier[] = useMemo(() => {
    const rawTiers = event.tiers && event.tiers.length > 0 ? event.tiers : [];
    if (!selectedRole || !selectedRole.allowedTierIds || selectedRole.allowedTierIds.length === 0) {
      return rawTiers;
    }
    return rawTiers.filter(t => selectedRole.allowedTierIds!.includes(t.id));
  }, [event.tiers, selectedRole]);

  const [selectedTier, setSelectedTier] = useState<TicketTier | null>(null);

  // 3. Resolve custom form sections (prioritize per-role sections if defined)
  const sections: FormSection[] = selectedRole && selectedRole.formSections && selectedRole.formSections.length > 0
    ? selectedRole.formSections
    : event.formSections && event.formSections.length > 0
      ? event.formSections
      : event.customFormFields && event.customFormFields.length > 0
        ? [{ id: 'sec-default', title: 'Data Registrasi Utama', fields: event.customFormFields }]
        : [];

  // PROGRESSIVE STEPS STATE
  // Step 1: Choose Registrant Category (Role)
  // Step 2: Choose Ticket Class & Quantity
  // Step 3: Form Sections (sectionIdx goes from 0 to sections.length - 1)
  // Step 4: Individual Ticket Holder Names (Only active if quantity > 1 & NOT team type)
  // Step 5: Checkout Summary / Receipt Success
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [currentSectionIdx, setCurrentSectionIdx] = useState<number>(0);

  // Ticket Quantity Selection
  const [quantity, setQuantity] = useState<number>(1);

  // Participant details / custom form state
  const [formResponses, setFormResponses] = useState<Record<string, string>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Individual ticket holder names for quantities > 1
  const [ticketHolders, setTicketHolders] = useState<string[]>([]);

  // Purchase complete receipt
  const [purchasedReceipt, setPurchasedReceipt] = useState<PurchasedTicket | null>(null);
  const [sandboxPaymentFailed, setSandboxPaymentFailed] = useState<boolean>(false);

  // Auth steps state (Requirement 8)
  const [authMode, setAuthMode] = useState<'login' | 'signup' | null>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authFullName, setAuthFullName] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authRole, setAuthRole] = useState<'admin' | 'biasa'>('biasa');

  const isSoldOut = event.isSoldOut || event.ticketsLeft === 0;

  // SYSTEM QUEUE AND COUNTDOWN SIMULATOR STATES
  const [requestsCount, setRequestsCount] = useState<number>(() => {
    return event.simulatedRequestsCount !== undefined
      ? event.simulatedRequestsCount
      : Math.floor(Math.random() * 15) + 20; // Default random 20-35 requests
  });
  const [queueNumber, setQueueNumber] = useState<string>('');
  const [queueStatus, setQueueStatus] = useState<'not_started' | 'waiting' | 'passed'>('not_started');
  const [queueProgress, setQueueProgress] = useState<number>(0);
  const [secondsLeftInQueue, setSecondsLeftInQueue] = useState<number>(10);

  const [isRegistrationLocked, setIsRegistrationLocked] = useState<boolean>(false);
  const [countdownText, setCountdownText] = useState<string>('');
  const [countdownSeconds, setCountdownSeconds] = useState<number>(0);

  // Monitor sandbox traffic load changes (Requirement 7)
  useEffect(() => {
    if (isSandboxTrafficActive) {
      setRequestsCount(50);
    } else {
      setRequestsCount(5);
    }
  }, [isSandboxTrafficActive]);

  // Monitor event.registrationOpenTime and tick countdown (Requirement 6 & 8)
  useEffect(() => {
    if (isSandboxCountdownActive) {
      setIsRegistrationLocked(true);
      
      const checkSandboxLock = () => {
        setCountdownSeconds(prev => {
          const nextVal = prev > 1 ? prev - 1 : 120;
          const m = Math.floor(nextVal / 60);
          const s = nextVal % 60;
          setCountdownText(`Uji Sandbox Countdown Active: dibuka dalam ${m > 0 ? `${m}m ` : ''}${s}s`);
          return nextVal;
        });
      };
      
      setCountdownSeconds(120);
      setCountdownText("Uji Sandbox Countdown Active: dibuka dalam 2m 0s");
      
      const interval = setInterval(checkSandboxLock, 1000);
      return () => clearInterval(interval);
    }

    if (!event.registrationOpenTime) {
      setIsRegistrationLocked(false);
      return;
    }

    const checkLockStatus = () => {
      const openTime = new Date(event.registrationOpenTime!).getTime();
      const now = new Date().getTime();
      const diffMs = openTime - now;

      if (diffMs > 0) {
        setIsRegistrationLocked(true);
        const diffSecs = Math.floor(diffMs / 1000);
        setCountdownSeconds(diffSecs);

        if (diffSecs <= 3600) {
          // Within 1 hour, show countdown in minutes & seconds
          const m = Math.floor((diffSecs % 3600) / 60);
          const s = diffSecs % 60;
          setCountdownText(`Pendaftaran dibuka kembali dalam: ${m > 0 ? `${m}m ` : ''}${s}s`);
        } else {
          // Greater than 1 hour, show date & raw time
          const dateObj = new Date(event.registrationOpenTime!);
          const formattedTime = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + " WIB";
          setCountdownText(`Pendaftaran dibuka pukul ${formattedTime}`);
        }
      } else {
        if (isRegistrationLocked) {
          setIsRegistrationLocked(false);
          triggerNotification("🎉 Pendaftaran Resmi Dibuka! Silakan lakukan pemesanantiket Anda.");
        }
      }
    };

    // Run first check
    checkLockStatus();

    const interval = setInterval(checkLockStatus, 1000);
    return () => clearInterval(interval);
  }, [event.registrationOpenTime, isRegistrationLocked, isSandboxCountdownActive]);

  // Tick queue progress if user is actively waiting
  useEffect(() => {
    if (queueStatus !== 'waiting') return;

    const queueInterval = setInterval(() => {
      setSecondsLeftInQueue(prev => {
        if (prev <= 1) {
          clearInterval(queueInterval);
          setQueueStatus('passed');
          setCurrentStep(2);
          if (selectedRole.isTeamType) {
            setQuantity(1);
          }
          triggerNotification("✅ Antrean selesai! Membuka halaman pilihan tiket...");
          return 0;
        }
        return prev - 1;
      });

      setQueueProgress(prev => {
        const next = prev + 10;
        return next > 100 ? 100 : next;
      });
    }, 1000);

    return () => clearInterval(queueInterval);
  }, [queueStatus, selectedRole]);

  // Form input changes
  const handleInputChange = (fieldId: string, value: string) => {
    setFormResponses(prev => ({ ...prev, [fieldId]: value }));
    if (value.trim()) {
      setFormErrors(prev => {
        const updated = { ...prev };
        delete updated[fieldId];
        return updated;
      });
    }
  };

  const handleHolderNameChange = (index: number, val: string) => {
    setTicketHolders(prev => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });
  };

  // Price calculations
  const priceUnit = selectedTier ? selectedTier.price : 0;
  const subtotal = priceUnit * quantity;
  const feeEnabled = isPlatformFeeEnabled !== false;
  const feePercent = platformFeePercent !== undefined ? platformFeePercent : 5;
  const serviceFee = selectedTier && feeEnabled ? Math.round(subtotal * (feePercent / 100)) : 0;
  const totalCost = subtotal + serviceFee;

  // PROGRESSIVE NAVIGATION CONTROLLER
  const handleNextStep = () => {
    if (currentStep === 1) {
      if (isRegistrationLocked) {
        triggerNotification(`⚠️ Mohon maaf, pendaftaran untuk acara ini belum dibuka!`);
        return;
      }
      if (requestsCount > 30 && queueStatus !== 'passed') {
        const generatedNum = `${requestsCount}`;
        setQueueNumber(generatedNum);
        setQueueStatus('waiting');
        setSecondsLeftInQueue(10);
        setQueueProgress(0);
        triggerNotification(`⏳ Antrean diaktifkan! Anda telah masuk antrean penghemat bandwidth otomatis.`);
        return;
      }
      // Advance to Step 2 (Ticket Tiers list)
      setCurrentStep(2);
      // If team type, quantity is locked to 1
      if (selectedRole.isTeamType) {
        setQuantity(1);
      }
      return;
    }

    if (currentStep === 2) {
      if (!selectedTier) {
        triggerNotification('Silakan tentukan salah satu kelas tiket terlebih dahulu!');
        return;
      }

      // Check user authentication (Requirement 8)
      if (!currentUser) {
        // Save drafting locally
        const bookingDraft = {
          eventId: event.id,
          roleId: selectedRole.id,
          tierId: selectedTier.id,
          quantity: quantity,
          timestamp: Date.now()
        };
        localStorage.setItem(`sagatix_draft_${event.id}`, JSON.stringify(bookingDraft));
        triggerNotification('Progres draf pemesanan Anda disimpan secara lokal! Silakan Masuk / Daftar Akun terlebih dahulu.');
        setAuthMode('signup'); // Show login/signup dialog
        return;
      }

      if (sections.length > 0) {
        setCurrentStep(3);
        setCurrentSectionIdx(0);
      } else if (!selectedRole.isTeamType && quantity > 1) {
        setCurrentStep(4);
        // Initialize ticket holders array
        setTicketHolders(Array(quantity - 1).fill(''));
      } else {
        submitRegistration();
      }
      return;
    }

    if (currentStep === 3) {
      // Validate current section fields first
      const currentSection = sections[currentSectionIdx];
      const errors: Record<string, string> = {};
      let isSectionValid = true;

      currentSection.fields.forEach(field => {
        const isFieldApplicable = !field.allowedTierIds || field.allowedTierIds.length === 0 || (selectedTier && field.allowedTierIds.includes(selectedTier.id));
        if (isFieldApplicable && field.required && !formResponses[field.id]?.trim()) {
          errors[field.id] = `${field.label} wajib diisi!`;
          isSectionValid = false;
        }
      });

      if (!isSectionValid) {
        setFormErrors(prev => ({ ...prev, ...errors }));
        triggerNotification(`Harap lengkapi isian data pada bagian "${currentSection.title}"!`);
        return;
      }

      // Check if we have more sections
      if (currentSectionIdx < sections.length - 1) {
        setCurrentSectionIdx(prev => prev + 1);
        triggerNotification(`Melanjutkan ke ${sections[currentSectionIdx + 1].title}`);
      } else {
        // If no more sections, check if we need Individual Ticket Owner details
        if (!selectedRole.isTeamType && quantity > 1) {
          setCurrentStep(4);
          setTicketHolders(Array(quantity - 1).fill(''));
        } else {
          submitRegistration();
        }
      }
      return;
    }

    if (currentStep === 4) {
      // Validate ticket holders names
      let allHoldersValid = true;
      for (let i = 0; i < quantity - 1; i++) {
        if (!ticketHolders[i]?.trim()) {
          allHoldersValid = false;
          break;
        }
      }

      if (!allHoldersValid) {
        triggerNotification('Mohon lengkapi nama pemilik tiket tambahan lainnya!');
        return;
      }

      submitRegistration();
    }
  };

  const handlePrevStep = () => {
    if (currentStep === 4) {
      if (sections.length > 0) {
        setCurrentStep(3);
        setCurrentSectionIdx(sections.length - 1);
      } else {
        setCurrentStep(2);
      }
    } else if (currentStep === 3) {
      if (currentSectionIdx > 0) {
        setCurrentSectionIdx(prev => prev - 1);
      } else {
        setCurrentStep(2);
      }
    } else if (currentStep === 2) {
      setCurrentStep(1);
    }
  };

  const submitRegistration = async () => {
    if (!selectedTier) return;

    // Generate unique ticketing code (SAGATIX style)
    const ticketCode = `SGX-${Math.floor(100 + Math.random() * 899)}-${Math.random()
      .toString(36)
      .substring(2, 6)
      .toUpperCase()}`;

    // Generate unique seat numbers automatically (Requirement 9)
    const getSeatPrefix = (tName: string) => {
      const clean = tName.toLowerCase();
      if (clean.includes('vip')) return 'VIP';
      if (clean.includes('reguler') || clean.includes('regular')) return 'REG';
      return tName.slice(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '');
    };
    const seatPrefix = getSeatPrefix(selectedTier.name);
    
    // Find all currently booked/blocked seat numbers for this event and tier using event's bookedSeats array
    const bookedSeatCodes = new Set<string>(event.bookedSeats || []);

    const seatNumbersArray: string[] = [];
    let currentNum = 1;
    while (seatNumbersArray.length < quantity) {
      const candidateCode = `${seatPrefix}-${currentNum}`;
      if (!bookedSeatCodes.has(candidateCode)) {
        seatNumbersArray.push(candidateCode);
      }
      currentNum++;
    }

    // Grab current 24 hour time (Requirement 4)
    const now = new Date();
    const formattedBookingDate = now.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }) + ` ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const newTicket: PurchasedTicket = {
      id: `tick-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      eventId: event.id,
      eventTitle: event.title,
      eventLocation: event.location,
      dateMonth: event.dateMonth,
      dateDay: event.dateDay,
      dateFullString: event.dateFullString,
      imageUrl: event.imageUrl,
      tierName: selectedTier.name,
      quantity: quantity,
      pricePerTicket: priceUnit,
      totalAmount: totalCost,
      bookingDate: formattedBookingDate,
      ticketCode: ticketCode,
      registrationType: selectedRole.name,
      formResponses: formResponses,
      ticketHolders: !selectedRole.isTeamType && quantity > 1 ? ticketHolders : undefined,
      seatNumbers: seatNumbersArray,
      isCheckedIn: false
    };

    if (isSandboxFailureMode) {
      setSandboxPaymentFailed(true);
      setPurchasedReceipt(newTicket);
      setCurrentStep(5);
      // Don't call onBookTickets so it's not stored in global booked tickets database
      triggerNotification("🚨 SIMULASI: Gagal memproses transaksi bank (Sandbox Failure Mode Active)!");
      return;
    }

    setSandboxPaymentFailed(false);
    setPurchasedReceipt(newTicket);
    onBookTickets(newTicket);
    setCurrentStep(5);
    triggerNotification(`Pendaftaran SAGATIX berhasil dipesan sebagai ${selectedRole.name}!`);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail.trim() || !authPassword.trim()) {
      triggerNotification('Mohon lengkapi email dan password!');
      return;
    }
    if (authMode === 'signup' && !authFullName.trim()) {
      triggerNotification('Mohon lengkapi nama Anda untuk mendaftar!');
      return;
    }

    try {
      if (authMode === 'signup') {
        const userCredential = await createUserWithEmailAndPassword(auth, authEmail.trim(), authPassword.trim());
        const user = userCredential.user;
        await updateProfile(user, { displayName: authFullName.trim() });
        
        await setDoc(doc(db, 'users', user.uid), {
          fullName: authFullName.trim(),
          email: user.email,
          role: authRole,
          createdAt: new Date().toISOString()
        });

        if (authRole === 'admin') {
          await setDoc(doc(db, 'admins', user.uid), {
            email: user.email,
            createdAt: new Date().toISOString()
          });
        }
        
        triggerNotification(`Pendaftaran Akun SAGATIX Berhasil! Halo ${authFullName.trim()}`);
      } else {
        await signInWithEmailAndPassword(auth, authEmail.trim(), authPassword.trim());
        triggerNotification(`Masuk Berhasil! Selamat datang kembali.`);
      }

      // Restore drafting local progress
      const savedDraft = localStorage.getItem(`sagatix_draft_${event.id}`);
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          if (parsed.quantity) setQuantity(parsed.quantity);
        } catch (err) {
          console.error("Failed to restore draft:", err);
        }
      }

      const resolvedName = authMode === 'signup' ? authFullName.trim() : (auth.currentUser?.displayName || authEmail.split('@')[0]);

      // Auto-populate default fields in custom form responses
      setFormResponses(prev => ({
        ...prev,
        name: resolvedName,
        email: authEmail.trim()
      }));

      // Dismiss authorization modal view
      setAuthMode(null);

      // Continue to next steps (Form fill)
      if (sections.length > 0) {
        setCurrentStep(3);
        setCurrentSectionIdx(0);
      } else if (!selectedRole.isTeamType && quantity > 1) {
        setCurrentStep(4);
        setTicketHolders(Array(quantity - 1).fill(''));
      } else {
        submitRegistration();
      }
    } catch (err: any) {
      console.error("Firebase auth error:", err);
      triggerNotification(`Gagal Autentikasi: ${err.message || err}`);
    }
  };

  const maxAllowedQuantity = selectedTier
    ? Math.min(selectedRole.maxQuantity || 10, selectedTier.slotsAvailable)
    : 10;

  const handleIncrement = () => {
    if (!selectedTier) return;
    if (quantity < maxAllowedQuantity) {
      setQuantity(prev => prev + 1);
    }
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };

  const handleDownloadTicketPNG = async (receipt: PurchasedTicket) => {
    if (!receipt) return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 420;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw background with high-quality tech colors
      ctx.fillStyle = '#0f172a'; // Slate-900 background
      ctx.fillRect(0, 0, 600, 420);

      // Create subtle gradient border
      const borderGrad = ctx.createLinearGradient(0, 0, 600, 420);
      borderGrad.addColorStop(0, '#3b82f6'); // blue-500
      borderGrad.addColorStop(1, '#8b5cf6'); // violet-500
      ctx.strokeStyle = borderGrad;
      ctx.lineWidth = 14;
      ctx.strokeRect(7, 7, 586, 406);

      // Header Banner
      ctx.fillStyle = '#1e293b'; // Slate-800
      ctx.fillRect(14, 14, 572, 70);

      ctx.fillStyle = '#3b82f6'; // primary brand accent
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('SAGATIX OFFICIAL DIGITAL TICKET', 30, 44);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(receipt.eventTitle.substring(0, 42).toUpperCase(), 30, 68);

      // Ticket Holes Graphics (circles on sides)
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(14, 210, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(586, 210, 16, 0, Math.PI * 2);
      ctx.fill();

      // Divider line
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(35, 210);
      ctx.lineTo(565, 210);
      ctx.stroke();

      // Text key-values (top section)
      ctx.fillStyle = '#94a3b8'; // Slate-400
      ctx.font = '10px sans-serif';
      ctx.fillText('NAMA PENDAFTAR :', 35, 115);
      ctx.fillText('KATEGORI REGISTRASI :', 35, 140);
      ctx.fillText('KELAS TIKET (TIER) :', 35, 165);
      ctx.fillText('NOMOR KURSI (SEAT) :', 35, 190);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(currentUser?.fullName || 'RELEVAN PENGGUNA', 185, 115);
      ctx.fillText(receipt.registrationType.toUpperCase(), 185, 140);
      ctx.fillText(receipt.tierName.toUpperCase(), 185, 165);

      ctx.fillStyle = '#10b981'; // Beautiful emerald
      ctx.fillText(receipt.seatNumbers.join(', ') || 'N/A', 185, 190);

      // Right column
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px sans-serif';
      ctx.fillText('TANGGAL ACARA :', 380, 115);
      ctx.fillText('KUANTITAS TIKET :', 380, 140);
      ctx.fillText('TOTAL TRANSAKSI :', 380, 165);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(`${receipt.dateMonth} ${receipt.dateDay}`, 505, 115);
      ctx.fillText(`${receipt.quantity} SLOT`, 505, 140);
      ctx.fillText('Rp ' + new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(receipt.totalAmount), 505, 165);

      // Bottom section (QR Code on Left, security rules on right)
      const qrStartX = 35;
      const qrStartY = 240;

      // Draw real QR code using local qrcode package
      const qrCanvas = document.createElement('canvas');
      const checkinUrl = `${window.location.origin}/?checkin=${receipt.ticketCode}`;
      await QRCodeLib.toCanvas(qrCanvas, checkinUrl, {
        margin: 1,
        width: 80,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      });
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(qrStartX - 5, qrStartY - 5, 80 + 10, 80 + 10);
      ctx.drawImage(qrCanvas, qrStartX, qrStartY, 80, 80);

      // Ticket Code label
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px monospace';
      ctx.fillText(receipt.ticketCode, 145, 275);

      ctx.fillStyle = '#818cf8';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText('ENTRY CODE - SAGATIX VERIFIED', 145, 295);

      // Rules details
      ctx.fillStyle = '#64748b'; // Slate-500
      ctx.font = 'italic 10px sans-serif';
      ctx.fillText('* Tunjukkan Virtual E-Ticket ini di pintu gerbang utama.', 145, 325);
      ctx.fillText('* Berlaku penukaran langsung dengan identitas resmi.', 145, 340);
      ctx.fillText('* Hubungi panitia apabila terjadi kendala teknis.', 145, 355);

      ctx.fillStyle = '#3b82f6';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('SAGATIX APP LICENSE VERIFIED SECURE', 145, 380);

      // Trigger automatic file download
      const dataUrl = canvas.toDataURL('image/png');
      const dlLink = document.createElement('a');
      dlLink.download = `Tiket_${receipt.eventTitle.substring(0, 15).replace(/\s+/g, '_')}_${receipt.ticketCode}.png`;
      dlLink.href = dataUrl;
      document.body.appendChild(dlLink);
      dlLink.click();
      document.body.removeChild(dlLink);
      triggerNotification('Tiket sukses diunduh sebagai file PNG!');
    } catch (err) {
      console.error(err);
      triggerNotification('Fasilitas ekspor PNG gagal memproses.');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2">
      {/* Tombol Kembali */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-xs font-bold text-on-surface-variant hover:text-primary cursor-pointer transition-all bg-surface-container px-4 py-2.5 rounded-full border border-outline-variant inline-flex active:scale-95 shadow-xs"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Kembali ke Jelajahi Acara</span>
      </button>

      {/* Banner Cover Atas */}
      <div className="relative h-56 md:h-80 rounded-3xl overflow-hidden shadow-xl border border-outline-variant">
        <img
          src={event.imageUrl}
          alt={event.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-contain bg-slate-950"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />
        
        {/* Banner Details Overlay */}
        <div className="absolute bottom-5 left-5 right-5 md:left-8 md:right-8 text-white flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex gap-2 flex-wrap">
              <span className="text-[10px] bg-primary text-white font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-sm">
                {event.category}
              </span>
              {event.tag && (
                <span className="text-[10px] bg-emerald-600 text-white font-extrabold uppercase tracking-widest px-3 py-1 rounded-full shadow-sm">
                  {event.tag}
                </span>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight leading-tight uppercase">
              {event.title}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/80 font-medium">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-primary-fixed" />
                <span>{event.location}</span>
                <a
                  href={event.mapsUrl || `https://maps.google.com/?q=${encodeURIComponent(event.location)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1 text-[10px] bg-primary/20 text-primary-fixed hover:bg-primary/40 px-2 py-0.5 rounded-full transition-colors flex items-center gap-1 border border-primary/30"
                >
                  Buka Map ↗
                </a>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary-fixed" />
                <span>{event.dateFullString}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={(e) => onToggleFavorite(event.id, e)}
              className="w-11 h-11 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white cursor-pointer active:scale-95 transition-all outline-hidden border border-white/20"
              aria-label="Sukai acara ini"
            >
              <Heart className={`w-5.5 h-5.5 ${isFavorited ? 'fill-rose-500 text-rose-500 scale-110' : 'text-white'}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        
        {/* KOLOM KIRI: DESKRIPSI, MAJU ADMIN BLOCKS & DENAH */}
        <div className="lg:col-span-7 space-y-6 md:space-y-8">
          
          {/* Deskripsi */}
          <section className="bg-surface-container rounded-2xl p-5 md:p-7 border border-outline-variant/60 space-y-4">
            <h2 className="text-md font-black text-on-surface flex items-center gap-2 border-b border-outline-variant/50 pb-3">
              <Info className="w-4.5 h-4.5 text-primary" />
              <span>Deskripsi & Detail Acara</span>
            </h2>

            <div className="space-y-4 text-xs md:text-sm">
              <h3 className="font-bold text-primary">Tentang Acara:</h3>
              <p className="text-on-surface-variant leading-relaxed font-semibold">
                {event.description}
              </p>
            </div>

            <div className="flex items-center gap-2.5 pt-2 text-xs">
              <span className="text-on-surface-variant font-medium">Organizer Resmi:</span>
              <span className="bg-primary/10 text-primary font-black px-3 py-1 rounded-full border border-primary/20">
                {event.organizer}
              </span>
            </div>
          </section>

          {/* ADMIN CUSTOM BLOCKS (TEXT / IMAGES) */}
          {event.contentBlocks && event.contentBlocks.length > 0 && (
            <section className="space-y-6">
              {event.contentBlocks.map((block) => (
                <div key={block.id} className="bg-surface-container rounded-2xl p-5 md:p-7 border border-outline-variant/60 space-y-3.5">
                  {block.title && (
                    <h3 className="text-sm md:text-base font-black text-on-surface flex items-center gap-2 border-b border-outline-variant/50 pb-2.5">
                      <Sparkles className="w-4.5 h-4.5 text-primary" />
                      <span>{block.title}</span>
                    </h3>
                  )}
                  {block.type === 'text' ? (
                    <div className="space-y-3">
                      <p className="text-xs md:text-sm text-on-surface-variant leading-relaxed font-semibold">
                        {block.value}
                      </p>
                      {block.linkUrl && (
                        <a
                          href={block.linkUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-primary font-bold hover:underline bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/25 hover:bg-primary/20 transition-all cursor-pointer"
                        >
                          <span className="underline">{block.linkLabel || 'Direct Link Informasi'}</span>
                          <span className="text-[10px]">↗</span>
                        </a>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-xl overflow-hidden border border-outline-variant/70 shadow-xs bg-surface-dim">
                      <img
                        src={block.value}
                        alt={block.title || "Image block"}
                        referrerPolicy="referrer"
                        className="w-full max-h-96 object-cover"
                      />
                    </div>
                  )}
                </div>
              ))}
            </section>
          )}

          {/* DENAH / LAYOUT (Hanya gambar saja tanpa pop-up/interaktif) */}
          {event.seatingChartUrl && (
            <section className="bg-surface-container rounded-2xl p-5 md:p-7 border border-outline-variant/60 space-y-4">
              <div className="flex items-center justify-between border-b border-outline-variant/50 pb-3">
                <h2 className="text-md font-black text-on-surface flex items-center gap-2">
                  <Layers className="w-4.5 h-4.5 text-primary" />
                  <span>Denah Lokasi & Posisi Tribun</span>
                </h2>
                <span className="text-[10px] font-black text-primary bg-primary/10 px-2.5 py-0.5 rounded border border-primary/25">
                  DENAH ACARA
                </span>
              </div>

              <p className="text-xs text-on-surface-variant leading-normal">
                Silakan pelajari tata letak tribun panggung serta area penonton di bawah ini sebelum melanjutkan pembelian pendaftaran tiket.
              </p>

              <div className="rounded-xl overflow-hidden border border-outline-variant bg-slate-950/20 shadow-sm flex justify-center">
                <img
                  src={event.seatingChartUrl}
                  alt="Denah Layout Panggung & Pembagian Kelas"
                  className="w-full h-auto object-contain max-h-[600px]"
                />
              </div>
            </section>
          )}
        </div>

        {/* KOLOM KANAN: FORMULIR PROGRESIF STEP-BY-STEP */}
        <div className="lg:col-span-5">
          <div className="sticky top-24 space-y-6">
            
            <AnimatePresence mode="wait">
              {authMode !== null ? (
                /* AUTHENTICATION FORM FOR SIGNUP & LOGIN PRE-CHECKOUT (Requirement 8) */
                <motion.div
                  key="checkout-auth-card"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="bg-surface-container rounded-2xl p-5 md:p-7 border-2 border-primary/20 shadow-lg space-y-5"
                >
                  <div className="border-b border-outline-variant/50 pb-3 text-center space-y-1">
                    <h3 className="text-xs font-black text-primary uppercase tracking-widest flex items-center justify-center gap-1.5">
                      <Shield className="w-4 h-4 text-primary" />
                      <span>Hubungkan Akun</span>
                    </h3>
                    <p className="text-[10px] text-on-surface-variant leading-relaxed font-bold">
                      Draf pemesanan Anda disimpan secara lokal. Silakan masuk menggunakan akun Google Anda untuk melanjutkan pengisian data formulir.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const user = await signInWithGoogle();
                          if (user) {
                            // Note: Real app should not overwrite existing user roles on login.
                            // The global auth state observer in App.tsx handles actual role synchronization.
                            // We just notify the UI that login succeeded.
                            onLoginUser({
                              fullName: user.displayName || 'Google User',
                              email: user.email || '',
                              role: 'biasa'
                            });
                            setAuthMode(null);
                            triggerNotification(`🔑 Login Google sukses! Halo ${user.displayName || user.email?.split('@')[0]}`);
                          }
                        } catch (err: any) {
                          console.error("Google login failure", err);
                          triggerNotification(`Gagal masuk Google: ${err.message || err}`);
                        }
                      }}
                      className="w-full flex items-center justify-center gap-2.5 bg-[#4285f4] text-white py-3 rounded-xl font-black text-xs hover:bg-[#357ae8] active:scale-98 transition-all cursor-pointer shadow-md border-0"
                    >
                      <svg className="w-4 h-4 fill-white shrink-0" viewBox="0 0 24 24">
                        <path d="M12.24 10.285V13.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.866-3.577-7.866-8s3.536-8 7.866-8c2.46 0 4.105 1.025 5.047 1.926l2.427-2.334C17.955 2.192 15.34 1 12.24 1 5.48 1 0 6.48 0 13s5.48 12 12.24 12c7.06 0 11.75-4.97 11.75-11.97 0-.81-.08-1.43-.19-2.03l-11.56.285z"/>
                      </svg>
                      <span>Masuk dengan Akun Google</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAuthMode(null)}
                      className="w-full text-center text-[10px] uppercase font-black tracking-wider text-on-surface-low border border-outline-variant hover:bg-surface-container py-2.5 rounded-xl transition-all cursor-pointer bg-transparent"
                    >
                      Batal Hubungkan
                    </button>
                  </div>
                </motion.div>
              ) : currentStep <= 4 ? (
                
                /* FORM PENDAFTARAN PROGRESIF PORTAL SAGATIX */
                <motion.div
                  key="checkout-progressive-card"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="bg-surface-container rounded-2xl p-5 md:p-7 border-2 border-primary/10 shadow-lg space-y-5"
                >
                  {/* Step Progress bar */}
                  <div className="border-b border-outline-variant/50 pb-3">
                    <div className="flex justify-between items-center text-xs font-black text-primary uppercase mb-2">
                      <span>Langkah {currentStep} dari {sections.length > 0 ? (quantity > 1 && !selectedRole.isTeamType ? 4 : 3) : 2}</span>
                      <span className="text-[10px] bg-primary/10 px-2 rounded-full font-bold">
                        {currentStep === 1 && 'Kategori/Peran'}
                        {currentStep === 2 && 'Pilih Tiket'}
                        {currentStep === 3 && `Form: ${sections[currentSectionIdx]?.title || 'Isian'}`}
                        {currentStep === 4 && 'Data Pemilik Tiket'}
                      </span>
                    </div>

                    <div className="flex gap-1.5 h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden">
                      <div className={`h-full bg-primary flex-1 transition-all duration-300 ${currentStep >= 1 ? 'opacity-100' : 'opacity-10'}`} />
                      <div className={`h-full bg-primary flex-1 transition-all duration-300 ${currentStep >= 2 ? 'opacity-100' : 'opacity-10'}`} />
                      <div className={`h-full bg-primary flex-1 transition-all duration-300 ${currentStep >= 3 ? 'opacity-100' : 'opacity-10'}`} />
                      {(quantity > 1 && !selectedRole.isTeamType) && (
                        <div className={`h-full bg-primary flex-1 transition-all duration-300 ${currentStep >= 4 ? 'opacity-100' : 'opacity-10'}`} />
                      )}
                    </div>
                  </div>

                  {/* STEP 1: PILIHAN REGISTER SEBAGAI APA */}
                  {currentStep === 1 && (
                    <div className="space-y-4">

                      {queueStatus === 'waiting' ? (
                        /* QUEUE WAITING SCREEN (Requirement 3: Antrean Bandwidth Ringan / New Requirement 8) */
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="bg-primary/5 rounded-2xl p-5 border border-primary/20 space-y-5 text-center"
                        >
                          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto border border-primary/20">
                            <Server className="w-5 h-5 text-primary animate-pulse" />
                          </div>

                          <div className="space-y-1">
                            <h4 className="text-xs font-black text-primary tracking-widest uppercase">RUANG ANTRIAN BEBAN TRAFFIC</h4>
                            <p className="text-[10px] text-on-surface-variant leading-relaxed max-w-xs mx-auto">
                              Sistem mendeteksi lalu lintas pendaftaran sedang sangat tinggi. Silakan tunggu hingga giliran Anda tiba.
                            </p>
                          </div>

                          {/* People in Front Box */}
                          {(() => {
                            const peopleInFront = Math.max(0, Math.ceil(secondsLeftInQueue / 2));
                            if (peopleInFront > 0) {
                              return (
                                <div className="bg-white rounded-xl border border-outline-variant p-4 max-w-xs mx-auto space-y-2">
                                  <div>
                                    <span className="text-[9px] text-on-surface-variant font-bold uppercase tracking-wider block">NOMOR ANTRIAN ANDA:</span>
                                    <span className="font-mono font-black text-base text-primary tracking-widest">#{queueNumber}</span>
                                  </div>
                                  <div className="border-t border-outline-variant/65 pt-2">
                                    <span className="text-[10px] text-on-surface-variant font-bold block">Status Antrean:</span>
                                    <span className="text-xs font-extrabold text-amber-600 animate-pulse block">👥 Ada {peopleInFront} orang di depan Anda</span>
                                  </div>
                                </div>
                              );
                            } else {
                              return (
                                <div className="bg-emerald-50 rounded-xl border border-emerald-300 p-4 max-w-xs mx-auto space-y-3">
                                  <div className="text-center">
                                    <span className="text-xs font-black text-emerald-800 uppercase tracking-widest block">🎉 SEKARANG GILIRAN ANDA!</span>
                                    <p className="text-[9px] text-emerald-700 leading-normal font-semibold mt-1">
                                      Tempat antrean Anda sudah tersedia. Silakan klik tombol di bawah untuk melanjutkan pengisian data formulir.
                                    </p>
                                  </div>
                                  
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setQueueStatus('passed');
                                      setCurrentStep(2);
                                    }}
                                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-black py-2.5 rounded-xl cursor-pointer transition-all active:scale-95 border-0 shadow-sm"
                                  >
                                    Lanjutkan Pengisian Formulir
                                  </button>
                                </div>
                              );
                            }
                          })()}

                          {/* Loading progress bar */}
                          {Math.max(0, Math.ceil(secondsLeftInQueue / 2)) > 0 && (
                            <div className="space-y-2 max-w-xs mx-auto">
                              <div className="flex justify-between items-center text-[10px] font-bold text-on-surface-variant">
                                <span>Menghubungkan slot...</span>
                                <span>Est. {secondsLeftInQueue} dtk sisa</span>
                              </div>
                              <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden">
                                <motion.div
                                  className="h-full bg-primary"
                                  initial={{ width: '0%' }}
                                  animate={{ width: `${100 - secondsLeftInQueue * 10}%` }}
                                  transition={{ ease: 'linear', duration: 1 }}
                                />
                              </div>
                            </div>
                          )}

                          {Math.max(0, Math.ceil(secondsLeftInQueue / 2)) > 0 && (
                            <p className="text-[9px] text-on-surface-variant italic">
                              Jangan tutup halaman ini. Ruang pemilihan kelas tiket akan dibuka setelah antrean Anda habis.
                            </p>
                          )}
                        </motion.div>
                      ) : (
                        /* NORMAL ROLE SELECTION OR COUNTDOWN LOCK */
                        <>
                          {isRegistrationLocked && (
                            /* Countdown Lock Visual widget */
                            <div className="bg-amber-500/10 border-2 border-dashed border-amber-500/30 rounded-2xl p-4 text-center space-y-2">
                              <div className="flex items-center justify-center gap-1.5 text-amber-600 font-extrabold text-xs uppercase tracking-wider">
                                <Clock className="w-4 h-4 animate-spin" />
                                <span>Pendaftaran Belum Dibuka!</span>
                              </div>
                              <p className="text-[11px] text-on-surface-variant leading-relaxed max-w-xs mx-auto">
                                Acara ini dijadwalkan membuka pendaftaran pada konfigurasi waktu di bawah ini. Harap tunggu:
                              </p>
                              <div className="bg-amber-500 text-slate-950 font-mono text-xs font-black inline-block px-4 py-1.5 rounded-full shadow-xs">
                                {countdownText || 'Terkunci'}
                              </div>
                            </div>
                          )}

                          <div className="space-y-1">
                            <h3 className="text-sm font-black text-on-surface uppercase block">Kategori / Peran Pendaftaran</h3>
                            <p className="text-xs text-on-surface-variant leading-relaxed block">
                              Tentukan pilihan kunjungan Anda. Nama peran ini dapat disesuaikan sepenuhnya oleh penyelenggara acara.
                            </p>
                          </div>

                          <div className="space-y-2.5">
                            {roles.map((role) => {
                              const isSelected = selectedRole.id === role.id;
                              return (
                                <button
                                  key={role.id}
                                  type="button"
                                  disabled={isRegistrationLocked}
                                  onClick={() => {
                                    setSelectedRole(role);
                                    setSelectedTier(null);
                                  }}
                                  className={`w-full p-4 rounded-xl border-2 text-left transition-all relative ${
                                    isRegistrationLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                                  } ${
                                    isSelected
                                      ? 'border-primary bg-primary/5 text-primary scale-101 shadow-sm'
                                      : 'border-outline-variant bg-surface hover:bg-surface-variant/35'
                                  }`}
                                >
                                  <div className="flex items-start gap-3">
                                    <div className="p-2 rounded-lg bg-surface-container-high mt-0.5 text-primary">
                                      {role.isTeamType ? <Users className="w-5 h-5" /> : <User className="w-5 h-5" />}
                                    </div>
                                    <div className="space-y-0.5">
                                      <span className="font-extrabold text-xs text-on-surface block">{role.name}</span>
                                      {role.description && (
                                        <span className="text-[10px] text-on-surface-variant block leading-relaxed font-semibold">
                                          {role.description}
                                        </span>
                                      )}
                                      {role.isTeamType && (
                                        <span className="text-[9px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded font-black inline-block mt-1">
                                          👥 REGISTRASI 1 TIM (KAPASITAS TUNGGAL)
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>

                          {/* Quick Admin tool shortcut within the view (only shown if event has registrationOpenTime for convenient demonstration) */}
                          {event.registrationOpenTime && isRegistrationLocked && (
                            <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 text-center space-y-1.5">
                              <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest block font-mono">🔧 SHORTCUT SANDBOX PENGUJI</span>
                              <p className="text-[10px] text-slate-500 leading-normal">
                                Lewati kunci pendaftaran ini dengan menekan tombol bypass pembukaan instan ke waktu sekarang.
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  // We can simulate opening by clear locked state
                                  setIsRegistrationLocked(false);
                                  triggerNotification("⚡ Sandbox Bypass: Kunci pendaftaran dinonaktifkan secara manual!");
                                }}
                                className="bg-slate-700 hover:bg-slate-800 text-white font-bold text-[9px] uppercase px-3 py-1.5 rounded-lg cursor-pointer"
                              >
                                Buka Pendaftaran Sekarang (Bypass)
                              </button>
                            </div>
                          )}

                          <button
                            onClick={handleNextStep}
                            className="w-full bg-primary text-on-primary py-3 rounded-full font-black text-xs hover:opacity-95 shadow-xs flex items-center justify-center gap-1.5 transition-transform active:scale-98 cursor-pointer mt-4"
                          >
                            <span>Lanjut ke Pilih Kelas Tiket</span>
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {/* STEP 2: TINGKATAN KELAS TIKET (CUSTOMISABLE BY ADMIN) */}
                  {currentStep === 2 && (
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <h3 className="text-sm font-black text-on-surface uppercase">Pilihan Kriteria Kelas Tiket</h3>
                        <p className="text-xs text-on-surface-variant leading-relaxed">
                          Penyelenggara menyediakan ragam pembagian kelas berikut dengan kapasitas dan kelebihan yang berbeda.
                        </p>
                      </div>

                      <div className="space-y-2.5">
                        {tiers.length === 0 ? (
                          <div className="text-center py-6 text-xs text-on-surface-variant">
                            Tidak ada kelas tiket khusus yang dikonfigurasi admin.
                          </div>
                        ) : (
                          tiers.map((tier) => {
                            const isSelected = selectedTier?.id === tier.id;
                            const isTierSoldOut = tier.slotsAvailable === 0;

                            return (
                              <button
                                key={tier.id}
                                type="button"
                                disabled={isTierSoldOut || isSoldOut}
                                onClick={() => {
                                  setSelectedTier(tier);
                                  setQuantity(1);
                                }}
                                className={`w-full p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                                  isSelected
                                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                    : 'border-outline-variant bg-surface hover:bg-surface-variant/10'
                                } ${isTierSoldOut || isSoldOut ? 'opacity-40 cursor-not-allowed bg-surface-dim' : ''}`}
                              >
                                <div className={`p-0.5 rounded-full border mt-0.5 ${
                                  isSelected ? 'bg-primary text-white border-primary' : 'border-outline text-transparent'
                                }`}>
                                  <Check className="w-3 h-3 stroke-[3]" />
                                </div>

                                <div className="flex-grow text-xs">
                                  <div className="flex justify-between items-center font-bold mb-0.5">
                                    <span className="text-on-surface text-xs font-bold">{tier.name}</span>
                                    <span className="text-primary font-black">{formatRupiah(tier.price)}</span>
                                  </div>
                                  <p className="text-[10px] text-on-surface-variant leading-relaxed mb-1">
                                    {tier.description}
                                  </p>
                                  <span className="text-[9px] text-primary/80 font-bold block">
                                    {isTierSoldOut ? '🎟️ Kuota Habis' : `🎟️ Sisa Kuota: ${tier.slotsAvailable} slot`}
                                  </span>
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>

                      {/* JUMLAH TIKET & KONTROLLER - Disembunyikan bila daftar sebagai turnamen/team */}
                      {selectedTier && !isSoldOut && (
                        <div>
                          {selectedRole.isTeamType ? (
                            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-800 text-[10px] p-3 rounded-xl font-semibold leading-relaxed">
                              💡 Pendaftaran kategori <strong>{selectedRole.name}</strong> dikunci ke 1 Slot Turnamen per tim pendaftar. Tidak dapat membeli lebih dari 1 tiket sekaligus.
                            </div>
                          ) : (
                            <div className="flex items-center justify-between bg-surface p-3 rounded-xl border border-outline-variant">
                              <div>
                                <span className="font-extrabold text-[11px] block text-on-surface">Jumlah Pembelian Tiket</span>
                                <span className="text-[9px] text-on-surface-variant block">Maksimal {selectedRole.maxQuantity || 10} tiket per transaksi</span>
                              </div>
                              <div className="flex items-center gap-2.5">
                                <button
                                  type="button"
                                  onClick={handleDecrement}
                                  disabled={quantity <= 1}
                                  className="w-8.5 h-8.5 bg-surface-container-high hover:bg-outline-variant disabled:opacity-40 text-on-surface rounded-full flex items-center justify-center font-black text-xs cursor-pointer select-none"
                                >
                                  -
                                </button>
                                <span className="font-extrabold text-xs w-4 text-center text-on-surface select-none">{quantity}</span>
                                <button
                                  type="button"
                                  onClick={handleIncrement}
                                  disabled={quantity >= maxAllowedQuantity}
                                  className="w-8.5 h-8.5 bg-surface-container-high hover:bg-outline-variant disabled:opacity-40 text-on-surface rounded-full flex items-center justify-center font-black text-xs cursor-pointer select-none"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Navigation buttons */}
                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={handlePrevStep}
                          className="flex-1 border border-outline text-on-surface py-2.5 rounded-full font-black text-xs hover:bg-surface-variant/30 transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          <span>Sebelumnya</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleNextStep}
                          className="flex-1 bg-primary text-on-primary py-2.5 rounded-full font-black text-xs hover:opacity-95 shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <span>Selesai & Lanjut</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP 3: FORM SECTIONS CONFIGURED BY ADMIN (PROGRESSIVE SECTION-BY-SECTION) */}
                  {currentStep === 3 && sections.length > 0 && (
                    <div className="space-y-4">
                      <div className="bg-primary/5 p-3 rounded-xl border border-primary/20 flex flex-col gap-1">
                        <span className="text-[9px] text-primary font-black uppercase tracking-widest block">Isian Pendaftaran</span>
                        <h4 className="text-xs font-black text-on-surface">
                          Bagian {currentSectionIdx + 1} dari {sections.length}: {sections[currentSectionIdx].title}
                        </h4>
                      </div>

                      <div className="space-y-3">
                        {sections[currentSectionIdx].fields
                          .filter(field => {
                            const isFieldApplicable = !field.allowedTierIds || field.allowedTierIds.length === 0 || (selectedTier && field.allowedTierIds.includes(selectedTier.id));
                            return isFieldApplicable;
                          })
                          .map((field) => {
                            const hasError = !!formErrors[field.id];
                          return (
                            <div key={field.id} className="space-y-1 text-xs">
                              <div className="flex justify-between items-center font-bold">
                                <label htmlFor={field.id} className="text-on-surface font-semibold text-xs text-on-surface-variant">
                                  {field.label} {field.required && <span className="text-red-500 font-extrabold">*</span>}
                                </label>
                                {hasError && <span className="text-red-500 text-[10px]">{formErrors[field.id]}</span>}
                              </div>

                              {field.type === 'textarea' ? (
                                <textarea
                                  id={field.id}
                                  placeholder={field.placeholder || 'Ketik data di sini...'}
                                  value={formResponses[field.id] || ''}
                                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                                  className={`w-full bg-surface outline-hidden rounded-lg border px-3 py-2 text-xs focus:ring-1 focus:ring-primary leading-normal ${
                                    hasError ? 'border-red-500 bg-red-50/5' : 'border-outline-variant'
                                  }`}
                                  rows={2}
                                />
                              ) : (
                                <input
                                  id={field.id}
                                  type={field.type}
                                  placeholder={field.placeholder || 'Isi data...'}
                                  value={formResponses[field.id] || ''}
                                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                                  className={`w-full bg-surface outline-hidden rounded-lg border px-3 py-2 text-xs focus:ring-1 focus:ring-primary font-medium ${
                                    hasError ? 'border-red-500 bg-red-50/5' : 'border-outline-variant'
                                  }`}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Navigation buttons */}
                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={handlePrevStep}
                          className="flex-1 border border-outline text-on-surface py-2.5 rounded-full font-black text-xs hover:bg-surface-variant/30 transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          <span>Sebelumnya</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleNextStep}
                          className="flex-1 bg-primary text-on-primary py-2.5 rounded-full font-black text-xs hover:opacity-95 shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <span>{currentSectionIdx < sections.length - 1 ? 'Lanjut Bagian Berikut' : 'Lanjut Verifikasi'}</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP 4: NAMA PEMILIK TIKET JIKA BELI LEBIH DARI 1 TIKET TUNGGAL */}
                  {currentStep === 4 && (
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <h3 className="text-sm font-black text-on-surface uppercase">Nama Pengunjung Tambahan</h3>
                        <p className="text-xs text-on-surface-variant leading-relaxed">
                          Anda membeli {quantity} tiket. Silakan lengkapi nama pemilik tiket tambahan lainnya di bawah ini.
                        </p>
                      </div>

                      <div className="space-y-3 pr-1">
                        <div className="bg-surface p-2.5 rounded-lg border border-outline-variant/50 text-[11px] text-on-surface-low font-bold">
                          👤 Tiket 1 (Pendaftar Utama): <span className="text-primary">{formResponses['name'] || 'Sesuai kontak pendaftar'}</span>
                        </div>

                        {Array.from({ length: quantity - 1 }).map((_, i) => (
                          <div key={i} className="space-y-1 text-xs">
                            <label className="font-bold text-on-surface text-[11px]">
                              Nama Pemilik Tiket #{i + 2} <span className="text-red-500 font-extrabold">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              value={ticketHolders[i] || ''}
                              onChange={(e) => handleHolderNameChange(i, e.target.value)}
                              placeholder={`Contoh: Nama rekan tiket ${i + 2}`}
                              className="w-full bg-surface outline-hidden rounded-lg border border-outline-variant px-3 py-2 text-xs focus:ring-1 focus:ring-primary font-medium"
                            />
                          </div>
                        ))}
                      </div>

                      {/* Navigation buttons */}
                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={handlePrevStep}
                          className="flex-1 border border-outline text-on-surface py-2.5 rounded-full font-black text-xs hover:bg-surface-variant/30 transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          <span>Sebelumnya</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleNextStep}
                          className="flex-1 bg-primary text-on-primary py-2.5 rounded-full font-black text-xs hover:opacity-95 shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <span>Kirim Pendaftaran</span>
                          <Check className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* BOTTOM PAYMENT DETAILS STICKY ON THIS CARD (Requirement 1) */}
                  {currentStep >= 2 && (
                    <div className="bg-surface p-3.5 rounded-xl border border-outline-variant/40 space-y-2 text-xs mt-3">
                      <span className="font-bold text-on-surface block border-b border-outline-variant/30 pb-1.5">Rincian Komitmen Biaya:</span>
                      
                      {selectedTier ? (
                        <>
                          <div className="flex justify-between text-on-surface-variant font-semibold text-[11px]">
                            <span>Harga {selectedTier.name} ({quantity}x):</span>
                            <span>{formatRupiah(subtotal)}</span>
                          </div>
                          
                          <div className="flex justify-between text-on-surface-variant font-semibold text-[11px]">
                            <span>Biaya Platform SAGATIX (Layanan):</span>
                            <span>{formatRupiah(serviceFee)}</span>
                          </div>

                          <div className="flex justify-between text-primary font-black border-t border-outline-variant/30 pt-1.5 text-xs">
                            <span>Total Bayar (IDR):</span>
                            <span>{formatRupiah(totalCost)}</span>
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-2 text-[11px] text-on-surface-variant italic font-semibold">
                          Silakan pilih salah satu kriteria kelas tiket di atas untuk menghitung komitmen rincian biaya.
                        </div>
                      )}
                    </div>
                  )}

                </motion.div>
              ) : sandboxPaymentFailed ? (
                
                /* MOCK PAYMENT FAILURE (SANDBOX TESTING) (Requirement 3 & 8) */
                <motion.div
                  key="receipt-failure-card"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-surface-container rounded-2xl p-5 border-2 border-dashed border-error/50 shadow-xl space-y-6 text-center"
                >
                  <div className="w-12 h-12 bg-error/10 text-error rounded-full flex items-center justify-center mx-auto border border-error/35">
                    <Shield className="w-5.5 h-5.5 text-error animate-bounce" />
                  </div>

                  <div>
                    <h2 className="text-base font-black text-error tracking-tight uppercase">Pembayaran Simulasi Tertolak!</h2>
                    <p className="text-[11px] text-on-surface-variant max-w-xs mx-auto mt-1 leading-relaxed">
                      Layanan sandbox mendeteksi mode simulasi gagal transaksi aktif (<span className="font-bold text-error">Sandbox Failure Mode</span>). Transaksi dibatalkan oleh gateway bank tiruan.
                    </p>
                  </div>

                  <div className="bg-red-50/5 rounded-xl border border-error/20 p-4 text-left space-y-2 text-xs">
                    <div className="border-b border-error/10 pb-2 mb-2">
                      <span className="text-[9px] font-bold text-error uppercase tracking-widest block font-mono">DRAF PENYELAMATAN AKTIF (RETAINED DRAFT)</span>
                      <p className="text-[10px] text-on-surface-variant leading-relaxed mt-1">
                        Sesuai konfigurasi keamanan platform, data isian formulir pendaftaran Anda (nama, slot, kategori) <strong>tidak terhapus</strong> dan aman tersimpan dalam memori local storage.
                      </p>
                    </div>

                    <div className="space-y-1 sm:space-y-1.5 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-on-surface-variant">Draf Acara:</span>
                        <strong className="text-on-surface font-extrabold truncate max-w-[150px]">{event.title}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-on-surface-variant">Kategori:</span>
                        <strong className="text-on-surface">{selectedRole.name}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-on-surface-variant">Nilai Transaksi:</span>
                        <strong className="text-error font-extrabold">{formatRupiah(totalCost)}</strong>
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-on-surface-variant italic">
                    Gunakan panel pengaturan <strong>Simulasi Sandbox</strong> pada tab beranda untuk mematikan mode kegagalan demi menyukseskan booking berikutnya.
                  </p>

                  <div className="flex gap-2 text-xs font-bold pt-1">
                    <button
                      onClick={() => {
                        setSandboxPaymentFailed(false);
                        setCurrentStep(2);
                      }}
                      className="flex-1 bg-primary text-on-primary py-2.5 rounded-full hover:opacity-90 transition-all cursor-pointer shadow-xs"
                    >
                      Kembali ke Form (Uji Lagi)
                    </button>
                    <button
                      onClick={onBack}
                      className="flex-1 border border-outline text-on-surface py-2.5 rounded-full hover:bg-surface-container-high transition-all cursor-pointer"
                    >
                      Batal & Kembali
                    </button>
                  </div>
                </motion.div>
              ) : (
                
                /* TIKET DITERBITKAN SUKSES */
                <motion.div
                  key="receipt-ticket-card"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-surface-container rounded-2xl p-5 border-2 border-dashed border-emerald-500/50 shadow-xl space-y-6 text-center"
                >
                  <div className="w-12 h-12 bg-emerald-500/10 text-emerald-800 rounded-full flex items-center justify-center mx-auto border border-emerald-500/35">
                    <Sparkles className="w-5.5 h-5.5 text-emerald-600 animate-pulse" />
                  </div>

                  <div>
                    <h2 className="text-base font-black text-on-surface tracking-tight uppercase">Pendaftaran Sukses!</h2>
                    <p className="text-[11px] text-on-surface-variant max-w-xs mx-auto mt-1 leading-relaxed">
                      Sistem SAGATIX berhasil memverifikasi alur pendaftaran berurutan Anda. Tiket fisik virtual diterbitkan di bawah ini.
                    </p>
                  </div>

                  {/* Visual Layout E-Ticket */}
                  <div className="bg-gradient-to-b from-primary/10 to-primary-container/20 rounded-xl border border-primary/25 p-4 text-left relative overflow-hidden text-xs">
                    {/* Lubang Estetik Tiket */}
                    <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-surface-container border-r border-primary/20" />
                    <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-surface-container border-l border-primary/20" />

                    <div className="border-b border-primary/20 pb-2.5 mb-2.5">
                      <span className="text-[9px] font-bold text-primary uppercase tracking-widest block">PASS REVISI RESMI SAGATIX</span>
                      <h4 className="font-extrabold text-on-surface text-xs truncate uppercase mt-0.5">{purchasedReceipt?.eventTitle}</h4>
                    </div>

                    <div className="space-y-1.5 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-on-surface-variant font-medium">Nama Pendaftar:</span>
                        <strong className="text-on-surface font-extrabold">{purchasedReceipt?.formResponses['name'] || purchasedReceipt?.formResponses['nama'] || currentUser?.fullName || 'Peserta'}</strong>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-on-surface-variant font-medium">Registrasi Sebagai:</span>
                        <strong className="text-primary font-black uppercase text-[9px] bg-primary/10 px-2 rounded">{purchasedReceipt?.registrationType}</strong>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-on-surface-variant font-medium">Tingkat Kelas:</span>
                        <strong className="text-on-surface font-extrabold">{purchasedReceipt?.tierName}</strong>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-on-surface-variant font-medium">Nomor Kursi (Seat):</span>
                        <strong className="text-[#059669] font-black tracking-wider uppercase bg-emerald-50 px-1 rounded">{purchasedReceipt?.seatNumbers.join(', ') || 'N/A'}</strong>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-on-surface-variant font-medium">Kuantitas Terdaftar:</span>
                        <strong className="text-on-surface">{purchasedReceipt?.quantity} Slot / Kursi</strong>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-on-surface-variant font-medium">Tanggal Acara:</span>
                        <strong className="text-on-surface">{purchasedReceipt?.dateMonth} {purchasedReceipt?.dateDay}</strong>
                      </div>

                      {/* Display Ticket Holders lists */}
                      {purchasedReceipt?.ticketHolders && purchasedReceipt.ticketHolders.length > 0 && (
                        <div className="border-t border-dashed border-outline-variant/60 pt-2 mt-1.5 text-[10px] space-y-1 text-on-surface-variant">
                          <span className="font-extrabold text-on-surface uppercase text-[9px] block">Pemegang Tiket Tambahan:</span>
                          {purchasedReceipt.ticketHolders.map((name, i) => (
                            <div key={i} className="flex justify-between bg-surface/40 p-1 rounded">
                              <span className="font-medium">Tiket #{i+2}:</span>
                              <strong className="text-on-surface truncate max-w-[120px]">{name}</strong>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Display Dynamic Responses from user registration */}
                      {purchasedReceipt && Object.keys(purchasedReceipt.formResponses).length > 0 && (
                        <div className="border-t border-dashed border-outline-variant/60 pt-2 mt-1.5 text-[10px] space-y-1 text-on-surface-variant">
                          <span className="font-extrabold text-on-surface uppercase text-[9px] block">Informasi Detail Registrasi:</span>
                          {Object.keys(purchasedReceipt.formResponses).slice(0, 5).map(key => {
                            const val = purchasedReceipt.formResponses[key];
                            if (!val) return null;
                            const labelText = getFieldLabelFromEvent(key, event);
                            return (
                              <div key={key} className="flex justify-between truncate">
                                <span className="capitalize">{labelText}:</span>
                                <strong className="text-on-surface truncate max-w-[150px]">{val}</strong>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div className="flex justify-between border-t border-primary/15 pt-2 mt-2 text-xs">
                        <span className="font-black">Total Transaksi:</span>
                        <strong className="text-primary font-black">{purchasedReceipt ? formatRupiah(purchasedReceipt.totalAmount) : ''}</strong>
                      </div>
                    </div>

                    {/* QR Code */}
                    <div className="mt-4 pt-3 border-t border-primary/20 flex flex-col items-center gap-1.5">
                      {purchasedReceipt && (
                        <QRCode value={purchasedReceipt.ticketCode} size={80} />
                      )}
                      <span className="text-[8px] text-on-surface-variant font-semibold text-center leading-normal mt-1">
                        Pass QR valid. Seluruh riwayat aman tersimpan di tab <strong>Tiket Saya</strong>.
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDownloadTicketPNG(purchasedReceipt!)}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs hover:shadow-md text-xs"
                    >
                      <Download className="w-4 h-4" />
                      <span>Unduh E-Tiket Resmi (PNG)</span>
                    </button>
                  </div>

                  <div className="flex gap-2 text-xs font-bold pt-1">
                    <button
                      onClick={() => {
                        setPurchasedReceipt(null);
                        setCurrentStep(1);
                        setFormResponses({});
                        setTicketHolders([]);
                      }}
                      className="flex-1 border-2 border-primary text-primary py-2.5 rounded-full hover:bg-primary/5 transition-all cursor-pointer"
                    >
                      Daftar Lagi
                    </button>
                    <button
                      onClick={onBack}
                      className="flex-1 bg-primary text-on-primary py-2.5 rounded-full hover:opacity-90 transition-all cursor-pointer shadow-xs"
                    >
                      Kembali ke Beranda
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Hubungi Support Info Card */}
            <div className="bg-surface-container p-4.5 rounded-2xl border border-outline-variant text-[11px] space-y-1.5 font-semibold text-on-surface-variant leading-relaxed">
              <span className="font-black text-on-surface block">💡 Jaminan Keamanan Pendaftaran SAGATIX</span>
              <p>
                Seluruh transaksi pendaftaran dilindungi asuransi penukaran 100%. Hubungi sekretariat panitia penyelenggara melalui email resmi: <code>fathironmy4@gmail.com</code>.
              </p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
