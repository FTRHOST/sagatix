import React, { useState } from 'react';
import { PurchasedTicket } from '../types';
import { Search, Calendar, MapPin, Tag, Flame, Compass, Ticket, Check, Download, Armchair } from 'lucide-react';
import { motion } from 'motion/react';
import { QRCode } from './QRCode';

interface MyTicketsViewProps {
  tickets: PurchasedTicket[];
  onExploreClick: () => void;
}

const handleDownloadTicket = (ticket: PurchasedTicket) => {
  const content = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>SAGATIX Ticket PASS - ${ticket.ticketCode}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f3f4f6; padding: 40px; color: #1f2937; }
    .ticket-card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 24px; box-shadow: 0 12px 30px rgba(0,0,0,0.1); overflow: hidden; border: 1px solid #e5e7eb; }
    .header { background: #3b82f6; color: #ffffff; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 26px; tracking: 1.5px; font-weight: 900; text-transform: uppercase; }
    .header p { margin: 6px 0 0 0; opacity: 0.85; font-size: 14px; }
    .body { padding: 35px; }
    .event-title { font-size: 22px; font-weight: 800; margin-bottom: 22px; color: #111827; border-bottom: 3px solid #3b82f6; padding-bottom: 12px; text-transform: uppercase; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px; }
    .label { font-size: 10px; text-transform: uppercase; color: #6b7280; font-weight: 800; letter-spacing: 0.8px; }
    .value { font-size: 15px; font-weight: 700; margin-top: 4px; color: #374151; }
    .qr-container { display: flex; flex-direction: column; align-items: center; justify-content: center; margin-top: 30px; padding-top: 25px; border-top: 2px dashed #cbd5e1; }
    .barcode-id { font-family: 'Courier New', Courier, monospace; font-size: 17px; font-weight: 900; background: #f9fafb; padding: 10px 20px; border: 2px solid #e5e7eb; border-radius: 8px; margin-top: 12px; letter-spacing: 3px; color: #111827; }
    .footer { text-align: center; font-size: 11px; color: #9ca3af; margin-top: 30px; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="ticket-card">
    <div class="header">
      <h1>TIKET RESIDENSI SAGATIX</h1>
      <p>Pass Resmi Masuk Pintu Utama</p>
    </div>
    <div class="body">
      <div class="event-title">${ticket.eventTitle}</div>
      <div class="grid">
        <div>
          <div class="label">Pendaftar Utama</div>
          <div class="value">${ticket.formResponses['name'] || 'Pemesan'}</div>
        </div>
        <div>
          <div class="label">Kategori / Peran</div>
          <div class="value">${ticket.registrationType}</div>
        </div>
        <div>
          <div class="label">Kelas Tiket</div>
          <div class="value">${ticket.tierName}</div>
        </div>
        <div>
          <div class="label">Nomor Kursi (Seat)</div>
          <div class="value" style="color: #2563eb;">${ticket.seatNumbers?.join(', ') || 'Generate Otomatis'}</div>
        </div>
        <div>
          <div class="label">Tanggal & Waktu</div>
          <div class="value">${ticket.dateFullString}</div>
        </div>
        <div>
          <div class="label">Lokasi</div>
          <div class="value">${ticket.eventLocation}</div>
        </div>
      </div>
      
      <div class="qr-container">
        <div class="label">Scan Barcode untuk Absensi</div>
        <div class="barcode-id">${ticket.ticketCode}</div>
        <p style="font-size: 11px; color: #6b7280; margin-top: 10px; text-align: center; max-width: 400px; line-height: 1.5;">Bawalah cetakan tiket ini atau tunjukkan versi PDF/HTML ini melalui ponsel ke petugas administrasi pintu masuk untuk proses absensi masuk cepat.</p>
      </div>
    </div>
  </div>
  <div class="footer">
    Sistem Ticketing Berbasis Material You SAGATIX<br>
    Layanan Bantuan: fathironmy4@gmail.com
  </div>
</body>
</html>`;

  const blob = new Blob([content], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `SAGATIX-TIKET-${ticket.ticketCode}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const handleDownloadTicketPNG = (receipt: PurchasedTicket) => {
  if (!receipt) return;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 420;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resolve name from registration answers
    const responses = receipt.formResponses || {};
    const attendeeName = responses['name'] || responses['name_lengkap'] || responses['nama'] || responses['nama_lengkap'] || responses['nama_kapten'] || 'PENGGUNA SAGATIX';

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
    ctx.fillText('KATEGORI REGISTRASI :', 35, 145);
    ctx.fillText('KELAS TIKET (TIER) :', 35, 175);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(attendeeName.toUpperCase(), 185, 115);
    ctx.fillText(receipt.registrationType.toUpperCase(), 185, 145);
    ctx.fillText(receipt.tierName.toUpperCase(), 185, 175);

    // Right column
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px sans-serif';
    ctx.fillText('TANGGAL ACARA :', 380, 115);
    ctx.fillText('KUANTITAS TIKET :', 380, 145);
    ctx.fillText('TOTAL TRANSAKSI :', 380, 175);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(`${receipt.dateMonth} ${receipt.dateDay}`, 505, 115);
    ctx.fillText(`${receipt.quantity} SLOT`, 505, 145);
    ctx.fillText('Rp ' + new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(receipt.totalAmount), 505, 175);

    // Bottom section (QR Code on Left, security rules on right)
    const qrStartX = 35;
    const qrStartY = 240;
    const cellSize = 11;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(qrStartX - 5, qrStartY - 5, (7 * cellSize) + 10, (7 * cellSize) + 10);
    
    ctx.fillStyle = '#0f172a';
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if ((r === 0 || r === 6 || c === 0 || c === 6) ||
            (r >= 2 && r <= 4 && c >= 2 && c <= 4) ||
            (r + c * 3) % 4 === 0) {
          ctx.fillRect(qrStartX + c * cellSize, qrStartY + r * cellSize, cellSize, cellSize);
        }
      }
    }

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
  } catch (err) {
    console.error(err);
  }
};

export const MyTicketsView: React.FC<MyTicketsViewProps> = ({
  tickets,
  onExploreClick,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTickets = tickets.filter(
    (ticket) =>
      ticket.eventTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.eventLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.ticketCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Judul Tab */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-extrabold text-2xl md:text-3xl text-on-surface">Pas Tiket Saya</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Anda telah berhasil memesan {tickets.length} tiket acara.
          </p>
        </div>

        {tickets.length > 0 && (
          <div className="relative w-full max-w-sm shrink-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-on-surface-variant" />
            <input
              type="text"
              placeholder="Cari tiket Anda..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-container-high outline-hidden rounded-full border border-outline-variant px-10 py-2.5 text-sm focus:ring-1 focus:ring-primary focus:border-primary text-on-surface"
            />
          </div>
        )}
      </div>

      {tickets.length === 0 ? (
        /* Tampilan Tiket Kosong */
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface-container-low rounded-2xl p-10 md:p-16 border border-outline-variant border-dashed text-center flex flex-col items-center max-w-2xl mx-auto space-y-5"
        >
          <div className="w-16 h-16 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center border border-outline-variant/40">
            <Ticket className="w-8 h-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h3 className="font-bold text-xl text-on-surface">Belum Ada Tiket</h3>
            <p className="text-sm text-on-surface-variant max-w-md mx-auto leading-relaxed">
              Daftar tiket aktif Anda kosong saat ini. Jelajahi kalender acara mendatang untuk mengamankan kursi reservasi, paket VIP, atau tiket early bird.
            </p>
          </div>
          <button
            onClick={onExploreClick}
            id="empty-explore-btn"
            className="bg-primary text-on-primary font-bold text-sm px-6 py-3 rounded-full hover:opacity-95 transition-opacity active:scale-95 shadow-sm inline-flex items-center gap-2 cursor-pointer"
          >
            <Compass className="w-4 h-4" />
            <span>Temukan Acara Menarik</span>
          </button>
        </motion.div>
      ) : (
        /* Render Grid Kartu Tiket */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredTickets.map((ticket) => (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              key={ticket.id}
              id={`bought-ticket-${ticket.id}`}
              className="bg-surface-container-lowest rounded-2xl overflow-hidden border border-outline-variant shadow-sm flex flex-col hover:shadow-md transition-shadow relative"
            >
              {/* Cover Mini Acara */}
              <div className="relative h-28 w-full bg-surface-dim">
                <img
                  src={ticket.imageUrl}
                  alt={ticket.eventTitle}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/40 to-transparent" />
                <div className="absolute top-3 right-3 bg-emerald-800 text-white font-bold text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md border border-emerald-500/20">
                  <Check className="w-3.5 h-3.5 stroke-[3]" /> Akses Aktif
                </div>

                <div className="absolute bottom-3 left-4 text-white">
                  <span className="text-[10px] font-bold text-primary-fixed bg-primary/45 tracking-widest uppercase px-2 py-0.5 rounded inline-block mb-1">
                    {ticket.tierName}
                  </span>
                  <h3 className="font-bold text-base tracking-tight truncate line-clamp-1 max-w-[280px]">
                    {ticket.eventTitle}
                  </h3>
                </div>
              </div>

              {/* Isi voucher tiket */}
              <div className="p-5 flex-grow space-y-4 text-sm text-on-surface-variant">
                <div className="grid grid-cols-2 gap-y-3 gap-x-2 border-b border-outline-variant/45 pb-4">
                  <div className="space-y-0.5">
                    <span className="text-[11px] text-on-surface-variant block uppercase tracking-wider">Tanggal & Waktu</span>
                    <span className="font-bold text-on-surface text-xs flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                      {ticket.dateMonth} {ticket.dateDay}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[11px] text-on-surface-variant block uppercase tracking-wider">Lokasi Masuk</span>
                    <span className="font-bold text-on-surface text-xs truncate block max-w-[130px] flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                      {ticket.eventLocation}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[11px] text-on-surface-variant block uppercase tracking-wider">Kelas Tiket</span>
                    <span className="font-bold text-on-surface text-xs flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-primary shrink-0" />
                      {ticket.tierName}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[11px] text-on-surface-variant block uppercase tracking-wider">Jumlah Tiket</span>
                    <span className="font-bold text-on-surface text-xs flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-primary shrink-0" />
                      {ticket.quantity} Tiket
                    </span>
                  </div>
                </div>

                {/* Role and Custom Answers Row */}
                {(ticket.registrationType || (ticket.formResponses && Object.keys(ticket.formResponses).length > 0) || (ticket.ticketHolders && ticket.ticketHolders.length > 0)) && (
                  <div className="bg-surface p-2.5 rounded-xl border border-outline-variant/35 text-xs space-y-1.5">
                    {ticket.registrationType && (
                      <div className="flex justify-between items-center text-[10px]/normal pb-1 border-b border-outline-variant/15">
                        <span className="text-on-surface-variant font-bold">Kategori Registrasi:</span>
                        <span className="font-black text-primary uppercase bg-primary/10 px-2 py-0.5 rounded text-[9px] border border-primary/20">
                          {ticket.registrationType}
                        </span>
                      </div>
                    )}
                    
                    {/* Ticket holders list if any */}
                    {ticket.ticketHolders && ticket.ticketHolders.length > 0 && (
                      <div className="space-y-1 pt-0.5 text-[10px]">
                        <span className="font-extrabold text-on-surface uppercase text-[9px] block">Pemegang Tiket Tambahan:</span>
                        {ticket.ticketHolders.map((holder, idx) => (
                          <div key={idx} className="flex justify-between gap-2 p-1 bg-surface-container rounded text-[9px]/tight">
                            <span className="text-on-surface-variant font-semibold">Tiket #{idx + 2}:</span>
                            <span className="font-bold text-on-surface truncate max-w-[150px]">{holder}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {ticket.formResponses && Object.keys(ticket.formResponses).length > 0 && (
                      <div className="pt-1.5 border-t border-outline-variant/20 space-y-1 text-[10px] text-on-surface-variant max-h-24 overflow-y-auto no-scrollbar">
                        <span className="font-extrabold text-on-surface uppercase text-[9px] block">Data Isian Kustom:</span>
                        {Object.entries(ticket.formResponses).map(([fieldId, val]) => (
                          <div key={fieldId} className="flex justify-between gap-2">
                            <span className="font-semibold text-on-surface-variant text-[9px]">{fieldId.replace(/_/g, ' ')}:</span>
                            <span className="font-bold text-on-surface truncate max-w-[150px]">{val}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="pt-1.5 border-t border-outline-variant/20 flex justify-between items-center text-[10px] text-primary">
                      <span className="font-bold text-on-surface-variant">Total Pembayaran:</span>
                      <strong className="font-black text-xs">
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(ticket.totalAmount)}
                      </strong>
                    </div>
                  </div>
                )}

                {/* Seat Numbers section */}
                {ticket.seatNumbers && ticket.seatNumbers.length > 0 && (
                  <div className="flex items-center gap-2 bg-primary/5 text-primary text-xs px-3 py-2 rounded-xl border border-primary/10">
                    <Armchair className="w-4 h-4" />
                    <span>Nomor Kursi (Seat): <strong className="font-extrabold">{ticket.seatNumbers.join(', ')}</strong></span>
                  </div>
                )}

                {/* Checked-In Verification Status */}
                <div className="flex items-center justify-between text-xs border-t border-dashed border-outline-variant/60 pt-3">
                  <span className="font-medium text-on-surface-variant flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${ticket.isCheckedIn ? 'bg-success-status animate-ping' : 'bg-amber-500'}`} />
                    Status Kehadiran / Absensi:
                  </span>
                  <span className={`font-black uppercase px-2 py-0.5 rounded text-[10px] ${
                    ticket.isCheckedIn 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {ticket.isCheckedIn ? `Hadir (${ticket.checkInTime || 'Selesai'})` : 'Belum Hadir'}
                  </span>
                </div>

                {/* Secure QR Layout box */}
                <div className="flex flex-col sm:flex-row items-center gap-4 pt-1 bg-surface-container-low p-3 rounded-xl border border-outline-variant/30">
                  <QRCode value={ticket.ticketCode} size={70} />

                  <div className="flex-grow space-y-1 w-full text-center sm:text-left">
                    <span className="text-[10px] text-on-surface-variant uppercase tracking-widest block">KODE MASUK AMAN (QR)</span>
                    <span className="font-mono font-extrabold text-[#111111] bg-white px-2.5 py-1 rounded border border-outline-variant text-[13px] block text-center tracking-wider max-w-full sm:max-w-[170px]">
                      {ticket.ticketCode}
                    </span>
                    <span className="text-[10px] text-on-surface-variant block italic">
                      Dipesan: {ticket.bookingDate}
                    </span>
                  </div>
                </div>

                {/* Action Row - DOWNLOAD TIKET */}
                <div className="pt-2 border-t border-outline-variant/50 flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => handleDownloadTicketPNG(ticket)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 active:scale-98 transition-all cursor-pointer shadow-xs"
                  >
                    <Download className="w-4 h-4 animate-bounce" />
                    <span>Unduh E-Tiket Resmi (PNG)</span>
                  </button>
                </div>
              </div>

              {/* Detail potongan tiket dekoratif */}
              <div className="absolute left-[-8px] top-[104px] w-4 h-4 rounded-full bg-surface border-r border-outline-variant" />
              <div className="absolute right-[-8px] top-[104px] w-4 h-4 rounded-full bg-surface border-l border-outline-variant" />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
