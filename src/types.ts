export type Category = 'Musik' | 'Game' | 'Olahraga' | 'Teknologi' | 'Konferensi' | 'Seni';

export interface TicketTier {
  id: string;
  name: string;
  price: number;
  description: string;
  slotsAvailable: number;
}

export interface CustomFieldDefinition {
  id: string;
  label: string;
  type: 'text' | 'number' | 'textarea' | 'email';
  required: boolean;
  placeholder?: string;
}

export interface FormSection {
  id: string;
  title: string; // e.g. "Informasi Ketua Tim", "Informasi Player 1"
  fields: CustomFieldDefinition[];
}

export interface RegistrationRoleConfig {
  id: string;
  name: string; // e.g., "Peserta Turnamen", "Penonton", "Narasumber"
  isTeamType: boolean; // if true, locks quantity to 1 (Team/Tournament registration style)
  description?: string;
  maxQuantity?: number; // Configurable maximum ticket purchase quantity per transaction
}

export interface ContentBlock {
  id: string;
  type: 'text' | 'image';
  title?: string;
  value: string; // Text content or Image URL
  linkUrl?: string; // Optional clickable link URL
  linkLabel?: string; // Optional custom name for the clickable link
}

export interface Event {
  id: string;
  title: string;
  category: Category;
  dateMonth: string; // e.g. "OKT"
  dateDay: string; // e.g. "24"
  dateFullString: string; // e.g. "Sabtu, 24 Okt 2026, 20:00"
  dateISO: string; // e.g. "2026-10-24"
  location: string;
  priceMin: number;
  priceMax: number;
  imageUrl: string;
  description: string;
  organizer: string;
  tag?: string; // e.g. "Segera Habis"
  ticketsLeft?: number;
  isSoldOut?: boolean;
  tiers: TicketTier[];
  seatingChartUrl?: string; // Seating layout image URL
  registrationRoles?: RegistrationRoleConfig[]; // Custom categories like "Peserta Lomba", "Penonton", "Pemateri"
  formSections?: FormSection[]; // Form grouped in sections (e.g. "Ketua", "Player 1")
  contentBlocks?: ContentBlock[]; // Flexible extra content (texts or banners)
  customFormFields: CustomFieldDefinition[]; // Legacy fallback
  registrationOpenTime?: string; // ISO String (e.g., "2026-06-22T11:30:00Z")
  simulatedRequestsCount?: number; // Simulated active viewers to test bandwidth queuing
}

export interface LandingPageConfig {
  ctaTitle: string;
  ctaSubtitle: string;
  ctaButtonText: string;
  tipsTitle: string;
  tipsList: string[];
}

export interface PurchasedTicket {
  id: string;
  eventId: string;
  eventTitle: string;
  eventLocation: string;
  dateMonth: string;
  dateDay: string;
  dateFullString: string;
  imageUrl: string;
  tierName: string;
  quantity: number;
  pricePerTicket: number;
  totalAmount: number;
  bookingDate: string;
  ticketCode: string; // e.g. "SGX-324-WXYZ"
  registrationType: string; // Selected category name
  formResponses: Record<string, string>; // Sectioned / general responses
  ticketHolders?: string[]; // Individual name list if quantity > 1
  seatNumbers: string[]; // e.g. ["GA-102", "GA-103"]
  isCheckedIn?: boolean; // Absent / scanned check-in
  checkInTime?: string; // e.g., "15:24"
}


