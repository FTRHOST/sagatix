import React, { useState } from 'react';
import { Event } from '../types';
import { MapPin, CreditCard, ArrowRight, Heart, Pin, FolderPlus, Folder } from 'lucide-react';
import { motion } from 'motion/react';

interface EventCardProps {
  event: Event;
  isFavorited: boolean;
  onToggleFavorite: (id: string, e: React.MouseEvent) => void;
  isPinned: boolean;
  onTogglePin: (id: string, e: React.MouseEvent) => void;
  onSelectEvent: (event: Event) => void;
  availableGroups: string[];
  eventGroups: string[]; // List of groups assigned to this event
  onAddToGroup: (eventId: string, groupName: string) => void;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  isFavorited,
  onToggleFavorite,
  isPinned,
  onTogglePin,
  onSelectEvent,
  availableGroups,
  eventGroups,
  onAddToGroup,
}) => {
  const isSoldOut = event.isSoldOut || event.ticketsLeft === 0;
  const [showGroupsDropdown, setShowGroupsDropdown] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      id={`event-card-${event.id}`}
      className={`bg-surface-container-lowest rounded-xl overflow-hidden border border-outline-variant flex flex-col h-full group shadow-xs hover:shadow-lg transition-all duration-300 ${
        isSoldOut ? 'opacity-70 grayscale-xs' : ''
      }`}
    >
      {/* Event Banner */}
      <div className="relative h-48 overflow-hidden bg-slate-950/60 flex justify-center">
        <img
          src={event.imageUrl}
          alt={event.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        
        {/* Date Badge */}
        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-lg flex flex-col items-center shadow-md">
          <span className="text-xs font-bold text-primary tracking-wider uppercase">{event.dateMonth}</span>
          <span className="text-xl font-extrabold leading-tight text-on-surface">{event.dateDay}</span>
        </div>

        {/* Favorite Button */}
        <button
          onClick={(e) => onToggleFavorite(event.id, e)}
          id={`favorite-btn-${event.id}`}
          className="absolute top-3 right-3 w-9 h-9 bg-white/90 backdrop-blur-xs rounded-full flex items-center justify-center text-on-surface hover:text-error transition-all shadow-md active:scale-90 z-10"
          aria-label="Tambah ke favorit"
        >
          <Heart
            className={`w-4.5 h-4.5 transition-transform duration-200 ${
              isFavorited ? 'fill-red-500 text-red-500 scale-110' : 'text-on-surface-variant'
            }`}
          />
        </button>

        {/* Pin Button (Requirement 6) */}
        <button
          onClick={(e) => onTogglePin(event.id, e)}
          id={`pin-btn-${event.id}`}
          className="absolute top-3 right-13 w-9 h-9 bg-white/90 backdrop-blur-xs rounded-full flex items-center justify-center text-on-surface hover:text-primary transition-all shadow-md active:scale-90 z-10"
          aria-label="Sematkan acara"
        >
          <Pin
            className={`w-4.5 h-4.5 transition-transform duration-200 rotate-45 ${
              isPinned ? 'fill-blue-500 text-blue-500 scale-110 rotate-0' : 'text-on-surface-variant'
            }`}
          />
        </button>

        {/* Sold Out Overlay */}
        {isSoldOut && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center">
            <span className="bg-surface text-on-surface px-5 py-2 rounded-lg font-bold uppercase tracking-wider text-sm shadow-md">
              Habis Terjual
            </span>
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="p-5 flex flex-col flex-grow relative">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-bold text-primary uppercase tracking-widest">
            {event.category}
          </span>
          {event.tag && !isSoldOut && (
            <span className="text-xs bg-success-status/10 text-emerald-800 font-semibold px-2.5 py-1 rounded-full">
              {event.tag}
            </span>
          )}
        </div>

        <h3
          onClick={() => onSelectEvent(event)}
          className="font-bold text-base text-on-surface mb-2 line-clamp-1 hover:text-primary cursor-pointer transition-colors"
        >
          {event.title}
        </h3>

        <p className="text-xs text-on-surface-variant line-clamp-2 mb-4 flex-grow">
          {event.description}
        </p>

        {/* Active Groups Chips */}
        {eventGroups.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3.5">
            {eventGroups.map((grp) => (
              <span
                key={grp}
                className="text-[9px] bg-sky-100 text-sky-800 font-bold px-2 py-0.5 rounded-full border border-sky-200"
              >
                📁 {grp}
              </span>
            ))}
          </div>
        )}

        {/* Info Rows */}
        <div className="space-y-2 mb-4 text-on-surface-variant text-xs">
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="truncate">{event.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <CreditCard className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="font-semibold text-on-surface">
              {(() => {
                const prices = event.tiers && event.tiers.length > 0 ? event.tiers.map(t => Number(t.price) || 0) : [];
                const priceMin = event.priceMin !== undefined ? Number(event.priceMin) : (prices.length > 0 ? Math.min(...prices) : 0);
                const priceMax = event.priceMax !== undefined ? Number(event.priceMax) : (prices.length > 0 ? Math.max(...prices) : 0);

                if (isSoldOut) {
                  return 'Pendaftaran Ditutup';
                }
                if (priceMin === 0 && priceMax === 0) {
                  return 'Gratis';
                }
                if (priceMin === priceMax) {
                  return `Rp ${priceMin.toLocaleString('id-ID')}`;
                }
                return `Rp ${priceMin.toLocaleString('id-ID')} - Rp ${priceMax.toLocaleString('id-ID')}`;
              })()}
            </span>
          </div>
        </div>

        {/* Folder Group Selector Dropdown */}
        <div className="mb-4 relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowGroupsDropdown(!showGroupsDropdown);
            }}
            className="text-[11px] text-primary/80 font-bold flex items-center gap-1.5 hover:text-primary transition-colors cursor-pointer bg-primary/5 px-2.5 py-1 rounded-md"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>Atur Grup Kategorisasi</span>
          </button>

          {showGroupsDropdown && (
            <div className="absolute left-0 bottom-8 z-20 w-44 bg-surface rounded-xl border border-outline-variant shadow-lg p-2 space-y-1 text-xs">
              <span className="text-[9px] font-black uppercase text-on-surface-variant tracking-wider block px-2 py-0.5 border-b border-outline-variant/50">Pilih Grup / Folder:</span>
              <div className="max-h-28 overflow-y-auto pt-1 space-y-0.5">
                {availableGroups.length === 0 ? (
                  <span className="text-[10px] text-on-surface-variant italic p-2 block">Belum ada grup khusus</span>
                ) : (
                  availableGroups.map((grpName) => {
                    const exists = eventGroups.includes(grpName);
                    return (
                      <button
                        key={grpName}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddToGroup(event.id, grpName);
                          // Keep open or close
                        }}
                        className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between font-medium cursor-pointer ${
                          exists ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-surface-variant/30 text-on-surface'
                        }`}
                      >
                        <span className="truncate max-w-[110px]">{grpName}</span>
                        <span>{exists ? '✓' : '+'}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between pt-3.5 border-t border-outline-variant">
          {isSoldOut ? (
            <span className="text-[11px] font-medium text-on-surface-variant flex items-center gap-1.5 italic bg-surface-container px-2 py-0.5 rounded-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-outline"></span> Antrean Dibuka
            </span>
          ) : (
            <span className="text-[11px] text-on-surface-variant font-medium">
              {event.ticketsLeft ? `Tersisa ${event.ticketsLeft} tiket` : 'Tiket tersedia'}
            </span>
          )}

          <button
            onClick={() => onSelectEvent(event)}
            id={`details-btn-${event.id}`}
            className="text-primary font-bold text-xs flex items-center gap-1 hover:underline transition-all group-hover:gap-1.5 active:scale-95 cursor-pointer"
          >
            {isSoldOut ? 'Daftar Antrean' : 'Detail'}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
