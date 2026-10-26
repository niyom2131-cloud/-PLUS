import React, { useState, useEffect } from 'react';
import { NumberItem, SystemSettings, AuthState } from '../types';
import { Ticket, X, Check, Trash2, Printer, Phone, User, FileText, AlertTriangle, ShieldCheck, Share2, Clock, CreditCard, Copy, Upload, Eye } from 'lucide-react';

interface BookingModalProps {
  item: NumberItem;
  settings: SystemSettings;
  auth: AuthState;
  onClose: () => void;
  onSave: (num: string, payload: {
    status?: 'available' | 'booked' | 'closed';
    price?: number;
    bookedBy?: string;
    phone?: string;
    note?: string;
    operatorRole: 'admin' | 'user';
    isPaid?: boolean;
    slipImage?: string;
  }) => Promise<void>;
}

export default function BookingModal({ item, settings, auth, onClose, onSave }: BookingModalProps) {
  // Local form states
  const [bookedBy, setBookedBy] = useState(item.bookedBy || '');
  const [phone, setPhone] = useState(item.phone || '');
  const [note, setNote] = useState(item.note || '');
  const [price, setPrice] = useState(item.price);
  const [status, setStatus] = useState(item.status);
  
  const [showReceipt, setShowReceipt] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [shareSuccess, setShareSuccess] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [localSlipImage, setLocalSlipImage] = useState<string>(item.slipImage || '');

  const handleCopyAccount = () => {
    navigator.clipboard.writeText('473-2-80694-0');
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2500);
  };

  const handleFileSelect = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      setError('ขนาดไฟล์ต้องไม่เกิน 5MB');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError('กรุณาเลือกเฉพาะไฟล์รูปภาพสลิป');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result && typeof e.target.result === 'string') {
        setLocalSlipImage(e.target.result);
        setError('');
      }
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            handleFileSelect(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const isAdmin = auth.role === 'admin';

  // Live countdown timer for unpaid bookings
  useEffect(() => {
    if (item.status !== 'booked' || item.isPaid || !item.bookingExpiresAt) {
      setTimeLeft('');
      return;
    }
    
    const updateTimer = () => {
      const diff = new Date(item.bookingExpiresAt!).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('หมดเวลารอชำระเงิน - ระบบกำลังปลดการจอง');
        return;
      }
      
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} นาที`);
    };
    
    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [item]);

  const handleTogglePayment = async (paid: boolean) => {
    setSubmitting(true);
    setError('');
    try {
      await onSave(item.number, {
        status: 'booked',
        price: Number(item.price),
        bookedBy: item.bookedBy || bookedBy,
        phone: item.phone || phone,
        note: item.note || note,
        isPaid: paid,
        slipImage: localSlipImage || undefined,
        operatorRole: auth.role
      });
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการปรับเปลี่ยนสถานะการชำระเงิน');
    } finally {
      setSubmitting(false);
    }
  };

  // Robust LINE sharing and clipboard copy handler
  const handleLineShare = (e: React.MouseEvent) => {
    e.preventDefault();
    
    let appUrl = '';
    try {
      const parentUrl = window.parent !== window ? document.referrer : window.location.href;
      if (parentUrl && parentUrl.startsWith('http') && !parentUrl.includes('about:')) {
        appUrl = parentUrl;
      } else if (window.location.href && window.location.href.startsWith('http') && !window.location.href.includes('about:')) {
        appUrl = window.location.href;
      }
    } catch (e) {
      if (window.location.href && window.location.href.startsWith('http') && !window.location.href.includes('about:')) {
        appUrl = window.location.href;
      }
    }

    const shareText = `📌 บันทึกการจองหมายเลขพิเศษจาก *${settings.systemName}*\n` +
      `🎉 หมายเลข: *${item.number}*\n` +
      `💰 ราคา: *${item.price}* ${settings.currency}\n` +
      `👤 ผู้จอง: *${item.bookedBy || 'ไม่ระบุชื่อ'}*\n` +
      `📱 เบอร์โทร: ${item.phone || '-'}\n` +
      (item.note ? `📝 หมายเหตุ: ${item.note}\n` : '') +
      (appUrl ? `🔗 ตรวจสอบรายละเอียด: ${appUrl}` : 'ตรวจสอบเลขเด็ดหรือจองเพิ่มเติมได้ที่นี่!');

    // 1. Copy to clipboard as a reliable backup
    try {
      navigator.clipboard.writeText(shareText);
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 5000);
    } catch (err) {
      console.error('Failed to copy to clipboard', err);
    }

    // 2. Open standard LINE URL Scheme
    // Universal LINE share link is highly robust
    const lineShareUrl = `https://line.me/R/share?text=${encodeURIComponent(shareText)}`;
    const lineSocialPluginUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(appUrl || 'https://line.me')}&text=${encodeURIComponent(shareText)}`;
    
    // Attempt opening standard share first
    const newWindow = window.open(lineShareUrl, '_blank', 'noopener,noreferrer');
    
    // Fallback to social plugin if blocked or fails
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      window.open(lineSocialPluginUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // Sync state if item changes
  useEffect(() => {
    setBookedBy(item.bookedBy || '');
    setPhone(item.phone || '');
    setNote(item.note || '');
    setPrice(item.price);
    setStatus(item.status);
    setLocalSlipImage(item.slipImage || '');
    setShowReceipt(false);
    setError('');
  }, [item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validations
    if (status === 'booked') {
      if (!bookedBy.trim()) {
        setError('กรุณากรอกชื่อผู้จอง');
        return;
      }
      if (!phone.trim()) {
        setError('กรุณากรอกเบอร์โทรศัพท์ผู้จอง');
        return;
      }
    }

    setSubmitting(true);
    try {
      await onSave(item.number, {
        status,
        price: Number(price),
        bookedBy: status === 'booked' ? bookedBy.trim() : '',
        phone: status === 'booked' ? phone.trim() : '',
        note: note.trim(),
        operatorRole: auth.role
      });
      if (isAdmin) {
        onClose();
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRelease = async () => {
    if (!window.confirm(`ยืนยันการยกเลิกจองหมายเลข ${item.number} ใช่หรือไม่?`)) {
      return;
    }
    setSubmitting(true);
    try {
      await onSave(item.number, {
        status: 'available',
        price: item.price,
        bookedBy: '',
        phone: '',
        note: '',
        operatorRole: auth.role
      });
      onClose();
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการยกเลิกจอง');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-40 p-4">
      {/* 1. Main Booking / Editor Dialog */}
      {!showReceipt ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative animate-fade-in">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-850 to-slate-900 px-6 py-4 border-b border-slate-800 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Ticket className="w-5 h-5 text-amber-500" />
              <span className="font-bold text-white text-md">
                {isAdmin ? 'แก้ไขข้อมูลหมายเลข (ผู้ดูแลระบบ)' : 'จองหมายเลข / ดูรายละเอียด'}
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg p-1 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Grid display of Number info */}
            <div className="grid grid-cols-3 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-850">
              <div className="text-center space-y-0.5">
                <span className="text-[10px] text-slate-500 font-medium">หมายเลข</span>
                <p className="text-3xl font-black text-amber-400 font-mono tracking-wider">{item.number}</p>
              </div>
              <div className="text-center space-y-0.5 border-x border-slate-850 flex flex-col justify-between py-0.5">
                <span className="text-[10px] text-slate-500 font-medium">ราคาจำหน่าย</span>
                <div className="flex items-center justify-center gap-1 font-bold text-white font-mono mt-1 text-sm">
                  {isAdmin ? (
                    <div className="flex items-center gap-1 justify-center">
                      <input
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(Number(e.target.value))}
                        className="w-16 bg-slate-900 border border-slate-800 rounded text-center text-xs font-mono py-0.5 focus:outline-none focus:border-amber-500"
                        required
                      />
                      <span className="text-[11px] text-slate-400 font-normal">{settings.currency}</span>
                    </div>
                  ) : (
                    <span className="text-lg">{item.price} {settings.currency}</span>
                  )}
                </div>
              </div>
              <div className="text-center space-y-0.5 flex flex-col justify-center items-center">
                <span className="text-[10px] text-slate-500 font-medium mb-1">สถานะปัจจุบัน</span>
                {isAdmin ? (
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="bg-slate-900 border border-slate-800 rounded text-xs font-semibold px-2 py-1 focus:outline-none focus:border-amber-500 text-white"
                  >
                    <option value="available">ว่าง (Available)</option>
                    <option value="booked">จองแล้ว (Booked)</option>
                    <option value="closed">ปิดใช้งาน (Closed)</option>
                  </select>
                ) : (
                  <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                    item.status === 'available'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : item.status === 'booked'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}>
                    {item.status === 'available' && 'ว่าง'}
                    {item.status === 'booked' && 'จองแล้ว'}
                    {item.status === 'closed' && 'ปิดใช้งาน'}
                  </span>
                )}
              </div>
            </div>

            {/* Warning if closed */}
            {status === 'closed' && (
              <div className="bg-rose-950/20 border border-rose-900/30 rounded-xl p-3 text-xs text-rose-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <p>หมายเลขนี้ปิดใช้งาน (ไม่เปิดให้จอง) เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถเปลี่ยนราคาและเปิดจำหน่ายได้อีกครั้ง</p>
              </div>
            )}

            {/* Form Fields: Display booking info if setting status to Booked */}
            {(status === 'booked' || item.status === 'booked') && (
              <div className="space-y-3.5">
                <h4 className="text-xs font-bold text-slate-400 flex items-center gap-1.5 border-b border-slate-850 pb-1.5">
                  <User className="w-3.5 h-3.5 text-amber-500" />
                  ข้อมูลผู้จองหมายเลข
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Name */}
                  <div>
                    <label className="block text-xs text-slate-400 mb-1 font-medium flex items-center gap-1">
                      ชื่อ-นามสกุล ผู้จอง <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-500">
                        <User className="w-3.5 h-3.5" />
                      </span>
                      <input
                        type="text"
                        placeholder="เช่น สมชาย ใจดี"
                        value={bookedBy}
                        onChange={(e) => setBookedBy(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8.5 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                        required={status === 'booked'}
                        disabled={!isAdmin && item.status === 'booked'}
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-xs text-slate-400 mb-1 font-medium flex items-center gap-1">
                      เบอร์โทรศัพท์ติดต่อ <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-500">
                        <Phone className="w-3.5 h-3.5" />
                      </span>
                      <input
                        type="text"
                        placeholder="เช่น 089-123-4567"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8.5 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                        required={status === 'booked'}
                        disabled={!isAdmin && item.status === 'booked'}
                      />
                    </div>
                  </div>
                </div>

                {/* Note */}
                <div>
                  <label className="block text-xs text-slate-400 mb-1 font-medium flex items-center gap-1">
                    หมายเหตุ / บันทึกเพิ่มเติม
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-2.5 pt-2 flex items-start pointer-events-none text-slate-500">
                      <FileText className="w-3.5 h-3.5" />
                    </span>
                    <textarea
                      placeholder="เช่น ชำระมัดจำแล้ว, ฝากเก็บรายการ"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={2}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8.5 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 resize-none"
                      disabled={!isAdmin && item.status === 'booked'}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Payment Status Card (if booked) */}
            {(status === 'booked' || item.status === 'booked') && (
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-3">
                <h4 className="text-xs font-bold text-slate-400 flex items-center justify-between border-b border-slate-850 pb-1.5">
                  <span className="flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-amber-500" />
                    สถานะการชำระเงิน / Payment Status
                  </span>
                  {item.isPaid ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <Check className="w-3 h-3" /> ชำระเงินแล้ว (Paid)
                    </span>
                  ) : item.slipImage ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/20 animate-pulse">
                      <Clock className="w-3 h-3" /> แนบสลิปแล้ว - รอตรวจสอบ (Verifying Slip)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                      <Clock className="w-3 h-3 animate-pulse" /> รอชำระเงิน (Pending)
                    </span>
                  )}
                </h4>

                {item.isPaid ? (
                  <div className="bg-emerald-950/10 border border-emerald-900/30 rounded-lg p-3 text-xs text-emerald-400 space-y-1">
                    <p className="font-semibold flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-500" />
                      ยืนยันการชำระเงินเรียบร้อยแล้ว!
                    </p>
                    <p className="text-[10px] text-slate-400">รายการจองหมายเลขนี้ได้รับการชำระเงินเรียบร้อยแล้ว ระบบล็อกสิทธิ์ให้ท่าน 100% และยกเลิกการนับถอยหลังยกเลิกจอง</p>
                    
                    {item.slipImage && (
                      <div className="mt-3 pt-2.5 border-t border-emerald-900/20 space-y-1.5">
                        <p className="text-[10px] text-slate-400 font-bold">หลักฐานการโอนเงิน (สลิป):</p>
                        <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-slate-900 p-1 max-w-[240px]">
                          <img src={item.slipImage} alt="Verified Slip" className="max-h-48 object-contain rounded" />
                        </div>
                      </div>
                    )}

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleTogglePayment(false)}
                        className="mt-2 text-[10px] font-semibold text-rose-400 hover:text-rose-300 underline block cursor-pointer bg-transparent border-none p-0"
                      >
                        เปลี่ยนสถานะเป็น "ยังไม่ชำระเงิน" (สำหรับผู้ดูแล)
                      </button>
                    )}
                  </div>
                ) : item.slipImage ? (
                  <div className="bg-sky-950/10 border border-sky-900/30 rounded-lg p-3 text-xs text-sky-400 space-y-3">
                    <div className="space-y-1">
                      <p className="font-semibold flex items-center gap-1.5 text-sky-300">
                        <Clock className="w-4 h-4 text-sky-400" />
                        ลูกค้าแจ้งโอนเงินและแนบสลิปเรียบร้อยแล้ว
                      </p>
                      <p className="text-[10px] text-slate-400">อยู่ระหว่างตรวจสอบหลักฐานการโอนเงินโดยผู้ดูแลระบบ (ระบบระงับการยกเลิกจองอัตโนมัติแล้ว)</p>
                    </div>

                    <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-slate-900 p-1.5 max-w-[280px] mx-auto">
                      <img src={item.slipImage} alt="Submitted Slip" className="max-h-60 object-contain rounded" />
                    </div>

                    {isAdmin ? (
                      <div className="pt-1 flex gap-2">
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => handleTogglePayment(true)}
                          className="flex-1 py-1.5 px-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-700 text-slate-950 font-bold text-xs rounded-lg transition shadow-md shadow-emerald-500/10 cursor-pointer"
                        >
                          {submitting ? 'กำลังบันทึก...' : 'อนุมัติ / ยืนยันยอดเงิน'}
                        </button>
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={async () => {
                            if (window.confirm("ต้องการลบสลิปนี้และส่งผู้ใช้กลับไปหน้ารอชำระเงินใช่หรือไม่?")) {
                              setSubmitting(true);
                              try {
                                await onSave(item.number, {
                                  status: 'booked',
                                  price: Number(item.price),
                                  bookedBy: item.bookedBy,
                                  phone: item.phone,
                                  note: item.note,
                                  isPaid: false,
                                  slipImage: '',
                                  operatorRole: auth.role
                                });
                              } catch (err) {
                                setError('เกิดข้อผิดพลาดในการคืนสถานะสลิป');
                              } finally {
                                setSubmitting(false);
                              }
                            }
                          }}
                          className="py-1.5 px-3 bg-rose-600 hover:bg-rose-500 disabled:bg-rose-850 text-white font-bold text-xs rounded-lg transition cursor-pointer"
                        >
                          ปฏิเสธสลิป / ลบรูป
                        </button>
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-400 text-center italic">
                        * สำหรับผู้ใช้: โปรดรอผู้ดูแลระบบตรวจสอบและอนุมัติสิทธิ์การจองของท่าน
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {timeLeft && (
                      <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-2.5 rounded-lg font-medium flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-400 animate-bounce" />
                          <span>กรุณาชำระเงินก่อนถูกยกเลิกอัตโนมัติภายใน:</span>
                        </span>
                        <span className="font-mono font-bold text-sm text-rose-500 bg-rose-500/5 px-2 py-0.5 rounded border border-rose-500/20">{timeLeft}</span>
                      </div>
                    )}

                    {/* TTB Bank details section */}
                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
                      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#002d62] to-[#ff5e00] flex items-center justify-center text-[10px] font-black text-white shrink-0 shadow-sm shadow-orange-500/20">
                          ttb
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-white leading-tight">ธนาคารทหารไทยธนชาต (TTB)</p>
                          <p className="text-[9px] text-slate-400">ช่องทางการชำระเงินเพื่อยืนยันสิทธิ์</p>
                        </div>
                      </div>

                      <div className="space-y-2 bg-slate-950 p-3 rounded-lg border border-slate-850">
                        {/* Account Number */}
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[9px] text-slate-500">เลขที่บัญชี</p>
                            <p className="font-mono text-sm font-bold text-white tracking-wider">473-2-80694-0</p>
                          </div>
                          <button
                            type="button"
                            onClick={handleCopyAccount}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] font-semibold transition cursor-pointer ${
                              copiedAccount 
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                : 'bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700'
                            }`}
                          >
                            {copiedAccount ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                                <span>คัดลอกแล้ว</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3 shrink-0" />
                                <span>คัดลอกเลขบัญชี</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Account Name */}
                        <div className="border-t border-slate-900/60 pt-2">
                          <p className="text-[9px] text-slate-500">ชื่อบัญชี</p>
                          <p className="text-xs font-bold text-slate-200">นิยม สมาคม</p>
                        </div>

                        {/* Transfer Amount */}
                        <div className="border-t border-slate-900/60 pt-2 flex justify-between items-baseline">
                          <p className="text-[9px] text-slate-500">ยอดที่ต้องโอน</p>
                          <p className="text-sm font-black text-amber-400 font-mono">
                            {price || item.price} <span className="text-[10px] font-normal text-slate-400">{settings.currency}</span>
                          </p>
                        </div>
                      </div>

                      <p className="text-[10px] text-slate-400 text-center">
                        กรุณาโอนเงินตามยอดด้านบน แนบรูปสลิปด้านล่าง แล้วกดแจ้งชำระเงิน
                      </p>
                    </div>

                    {/* Drag and Drop + paste container */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-400">
                        แนบภาพสลิปหลังโอนเงิน / Upload Transfer Slip
                      </label>
                      {localSlipImage ? (
                        <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-slate-900 p-2 group">
                          <img src={localSlipImage} alt="Slip Preview" className="max-h-48 object-contain rounded mx-auto" />
                          <button
                            type="button"
                            onClick={() => setLocalSlipImage('')}
                            className="absolute top-2 right-2 p-1 bg-rose-600 hover:bg-rose-500 text-white rounded-full transition"
                            title="ลบภาพสลิป"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div 
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const files = e.dataTransfer.files;
                            if (files && files[0]) {
                              handleFileSelect(files[0]);
                            }
                          }}
                          className="border-2 border-dashed border-slate-800 hover:border-slate-700 bg-slate-950 hover:bg-slate-950/80 rounded-xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center gap-1.5 group relative"
                        >
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={(e) => {
                              const files = e.target.files;
                              if (files && files[0]) {
                                handleFileSelect(files[0]);
                              }
                            }}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          />
                          <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-slate-400 group-hover:text-amber-400 transition">
                            <Upload className="w-4 h-4" />
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-xs font-bold text-slate-300">คลิก หรือลากสลิปมาวางที่นี่</p>
                            <p className="text-[10px] text-slate-500">รองรับไฟล์ JPG, PNG หรือกดวาง (Ctrl+V) ได้</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Pay Button */}
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleTogglePayment(isAdmin ? true : false)}
                      className="w-full flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-700 text-slate-950 font-bold py-2 px-4 rounded-lg text-xs transition cursor-pointer shadow-md shadow-emerald-500/10"
                    >
                      <Check className="w-4 h-4" />
                      <span>
                        {submitting 
                          ? 'กำลังบันทึก...' 
                          : localSlipImage 
                            ? (isAdmin ? 'ยืนยันและอนุมัติการชำระเงินทันที' : 'แจ้งโอนเงินพร้อมแนบสลิปเรียบร้อย') 
                            : 'คลิกเพื่อแจ้งชำระเงิน / ยืนยันการโอนเงิน (Pay Now)'
                        }
                      </span>
                    </button>
                    
                    {isAdmin && (
                      <p className="text-[9px] text-amber-500/80 text-center italic">
                        * สำหรับผู้ดูแลระบบ: การกดยืนยันชำระเงินจะบันทึกข้อมูลและปลดตัวจับเวลาทันที
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="text-rose-400 text-xs bg-rose-950/20 border border-rose-900/40 p-2.5 rounded-lg">
                {error}
              </div>
            )}

            {/* Share Success Alert */}
            {shareSuccess && (
              <div className="text-emerald-400 text-xs bg-emerald-950/30 border border-emerald-900/40 p-2.5 rounded-lg flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-500 shrink-0 animate-bounce" />
                <span>คัดลอกรายละเอียดการจองลงคลิปบอร์ดแล้ว! คุณสามารถ "กดวาง" (Paste) ส่งแชทหรือกลุ่ม LINE ได้ทันที</span>
              </div>
            )}

            {/* Dialog Footer Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-850">
              <div className="flex items-center gap-2">
                {/* Print Receipt Button (if already booked) */}
                {item.status === 'booked' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowReceipt(true)}
                      className="flex items-center gap-1 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-white rounded-lg px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>พิมพ์ใบจอง</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleLineShare}
                      className="flex items-center gap-1 bg-[#06C755] hover:bg-[#05B34B] text-white rounded-lg px-3.5 py-1.5 text-xs font-semibold transition shadow-sm shadow-[#06C755]/10 cursor-pointer"
                      title="แชร์รายละเอียดการจองลง LINE"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>แชร์ลง LINE</span>
                    </button>
                  </>
                )}

                {/* Release button (for admin or user who wants to clear booking) */}
                {item.status === 'booked' && (isAdmin || settings.allowUserBooking) && (
                  <button
                    type="button"
                    onClick={handleRelease}
                    disabled={submitting}
                    className="flex items-center gap-1 text-rose-400 hover:bg-rose-950/20 border border-transparent hover:border-rose-900/30 rounded-lg px-3 py-1.5 text-xs font-semibold transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ยกเลิกการจอง</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white font-medium transition"
                >
                  ปิดหน้าต่าง
                </button>

                {/* Only allow submission if we are Admin OR the item is available to book and settings allow it */}
                {(isAdmin || (item.status === 'available' && settings.allowUserBooking)) ? (
                  <button
                    type="submit"
                    disabled={submitting}
                    onClick={() => {
                      if (!isAdmin && item.status === 'available') {
                        setStatus('booked'); // force status to booked when guest clicks book
                      }
                    }}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4.5 py-2 text-xs rounded-lg transition flex items-center gap-1 shadow-md shadow-amber-500/10"
                  >
                    <Check className="w-4 h-4" />
                    <span>{submitting ? 'กำลังบันทึก...' : item.status === 'available' ? 'บันทึกจองหมายเลข' : 'บันทึกการแก้ไข'}</span>
                  </button>
                ) : (
                  item.status === 'available' && !settings.allowUserBooking && (
                    <span className="text-xs text-rose-400 font-medium">
                      * ปิดรับจองจากภายนอกชั่วคราว
                    </span>
                  )
                )}
              </div>
            </div>
          </form>
        </div>
      ) : (
        /* 2. Receipt View (ใบจอง / Receipt popup) */
        <div className="bg-white text-slate-900 border border-slate-200 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl relative animate-scale-in">
          {/* Header Controls */}
          <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex justify-between items-center print:hidden">
            <span className="font-bold text-xs text-slate-700">ใบรับจองหมายเลข (ตัวอย่างพิมพ์)</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleLineShare}
                className="bg-[#06C755] hover:bg-[#05B34B] text-white rounded p-1.5 transition text-[11px] font-semibold flex items-center gap-1 shadow-sm cursor-pointer"
                title="แชร์ใบจองนี้ลง LINE"
              >
                <Share2 className="w-3.5 h-3.5" />
                แชร์ LINE
              </button>
              <button
                onClick={handlePrint}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 rounded p-1.5 transition text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                พิมพ์
              </button>
              <button
                onClick={() => setShowReceipt(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 transition text-xs cursor-pointer"
              >
                ย้อนกลับ
              </button>
            </div>
          </div>

          {/* Share Success alert for receipt */}
          {shareSuccess && (
            <div className="bg-emerald-50 text-emerald-800 text-xs px-4 py-2.5 border-b border-emerald-200 flex items-center gap-1.5 animate-pulse print:hidden">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>คัดลอกข้อมูลใบจองลงคลิปบอร์ดแล้ว! คุณสามารถกด "วาง" (Paste) ส่งต่อใน LINE ได้ทันที</span>
            </div>
          )}

          {/* Receipt Body printable */}
          <div className="p-6 space-y-6 font-sans text-xs bg-stone-50/50 print:bg-white print:p-0">
            {/* Store title */}
            <div className="text-center space-y-1">
              <div className="inline-block bg-slate-900 text-amber-400 font-mono text-lg font-black px-3 py-1 rounded">
                {item.number}
              </div>
              <h2 className="text-sm font-extrabold tracking-tight mt-2">{settings.systemName}</h2>
              <p className="text-[10px] text-slate-500">เอกสารใบจองและบันทึกข้อมูลระบบ</p>
              <div className="border-b-2 border-dashed border-slate-300 pt-2"></div>
            </div>

            {/* Booking description */}
            <div className="space-y-2 pb-2">
              <div className="flex justify-between">
                <span className="text-slate-500">วันที่จอง (Date):</span>
                <span className="font-semibold text-slate-800">{new Date(item.updatedAt || "").toLocaleString('th-TH')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">เลขจอง (Number):</span>
                <span className="font-mono font-bold text-slate-950 text-sm">#{item.number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">ราคาจำหน่าย (Price):</span>
                <span className="font-bold text-slate-950">{item.price} {settings.currency}</span>
              </div>
            </div>

            {/* Customer Details info */}
            <div className="border-t border-slate-200 pt-3.5 space-y-2.5">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">รายละเอียดผู้ซื้อ / ผู้จอง</span>
              
              <div className="bg-white p-3 rounded-xl border border-slate-200/60 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">ชื่อผู้จอง:</span>
                  <span className="font-semibold text-slate-800">{item.bookedBy || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">เบอร์โทรศัพท์:</span>
                  <span className="font-mono text-slate-800">{item.phone || '-'}</span>
                </div>
                {item.note && (
                  <div className="pt-1.5 border-t border-slate-100 mt-1">
                    <span className="text-slate-400">หมายเหตุ:</span>
                    <p className="text-slate-700 italic mt-0.5 leading-relaxed bg-slate-50 p-1.5 rounded">{item.note}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer stamp */}
            <div className="text-center space-y-3 pt-4 border-t border-dashed border-slate-300">
              <div className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-100 font-semibold mx-auto">
                <ShieldCheck className="w-3.5 h-3.5" />
                บันทึกการจองสมบูรณ์
              </div>
              <p className="text-[10px] text-slate-400 leading-normal">
                ขอบคุณที่ใช้บริการระบบบริหารจัดการ<br />
                {settings.contactInfo || "ระบบจำลองตัวเลขเพื่อการจองและจัดเก็บข้อมูล"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
