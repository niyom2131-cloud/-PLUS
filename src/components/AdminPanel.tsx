import React, { useState, useEffect } from 'react';
import { SystemSettings, AuthState } from '../types';
import { Settings, Save, AlertTriangle, RefreshCw, ToggleLeft, ToggleRight, Info, ShieldCheck, PhoneCall } from 'lucide-react';

interface AdminPanelProps {
  settings: SystemSettings;
  auth: AuthState;
  onSaveSettings: (settings: SystemSettings) => Promise<void>;
  onResetSystem: () => Promise<void>;
  onClose: () => void;
}

export default function AdminPanel({ settings, auth, onSaveSettings, onResetSystem, onClose }: AdminPanelProps) {
  // Form states
  const [systemName, setSystemName] = useState(settings.systemName);
  const [defaultPrice, setDefaultPrice] = useState(settings.defaultPrice);
  const [currency, setCurrency] = useState(settings.currency);
  const [allowUserBooking, setAllowUserBooking] = useState(settings.allowUserBooking);
  const [contactInfo, setContactInfo] = useState(settings.contactInfo);
  const [paymentTimeoutMinutes, setPaymentTimeoutMinutes] = useState(settings.paymentTimeoutMinutes || 10);

  const [saving, setSaving] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Sync state if settings prop changes
  useEffect(() => {
    setSystemName(settings.systemName);
    setDefaultPrice(settings.defaultPrice);
    setCurrency(settings.currency);
    setAllowUserBooking(settings.allowUserBooking);
    setContactInfo(settings.contactInfo);
    setPaymentTimeoutMinutes(settings.paymentTimeoutMinutes || 10);
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      await onSaveSettings({
        systemName,
        defaultPrice: Number(defaultPrice),
        currency,
        allowUserBooking,
        contactInfo,
        paymentTimeoutMinutes: Number(paymentTimeoutMinutes)
      });
      setSuccessMsg('บันทึกการตั้งค่าระบบเรียบร้อยแล้ว!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setSaving(false);
    }
  };

  const handleResetClick = async () => {
    if (!resetConfirm) {
      setResetConfirm(true);
      return;
    }

    setSaving(true);
    try {
      await onResetSystem();
      setSuccessMsg('ล้างฐานข้อมูลหมายเลขและคืนค่าเริ่มต้นทั้งหมดเรียบร้อย!');
      setResetConfirm(false);
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 2500);
    } catch (err) {
      setErrorMsg('เกิดข้อผิดพลาดในการรีเซ็ตระบบ');
    } finally {
      setSaving(false);
    }
  };

  if (auth.role !== 'admin') {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center text-slate-400 space-y-4">
        <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
        <h3 className="text-white font-semibold">ไม่ได้รับอนุญาตให้เข้าถึง</h3>
        <p className="text-sm">เฉพาะผู้ใช้ที่มีสิทธิ์ "ผู้ดูแลระบบ (Admin)" เท่านั้นที่จะสามารถเปิดใช้งานหน้าจอนี้ได้</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-40 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative animate-fade-in max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="bg-slate-850 px-6 py-4 border-b border-slate-850 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-amber-500" />
            <span className="font-bold text-white text-md">ตั้งค่าระบบ (System Configuration)</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg p-1 transition"
          >
            ✕
          </button>
        </div>

        {/* Content body scrollable */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Info Banner */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-400 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">สิทธิ์ผู้ดูแลระบบ (Admin Mode)</p>
              <p className="text-[11px] text-slate-400 mt-0.5">การแก้ไขข้อมูล ณ ที่นี้ จะมีผลต่อค่าเริ่มต้นของระบบทั้งหมด และบันทึกลงไฟล์ db.json ของเซิร์ฟเวอร์โดยตรง</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* System Title */}
            <div>
              <label className="block text-xs text-slate-400 mb-1 font-medium">ชื่อระบบ / หัวข้อเว็บบอร์ด</label>
              <input
                type="text"
                value={systemName}
                onChange={(e) => setSystemName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            {/* Grid for Default Price & Currency */}
            <div className="grid grid-cols-2 gap-4">
              {/* Default Price */}
              <div>
                <label className="block text-xs text-slate-400 mb-1 font-medium">ราคาเริ่มต้น (Default Price)</label>
                <input
                  type="number"
                  value={defaultPrice}
                  onChange={(e) => setDefaultPrice(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  required
                />
              </div>

              {/* Currency Symbol */}
              <div>
                <label className="block text-xs text-slate-400 mb-1 font-medium">สกุลเงิน / สัญลักษณ์</label>
                <input
                  type="text"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 text-center font-bold"
                  required
                />
              </div>
            </div>

            {/* Payment Expiration Timeout */}
            <div>
              <label className="block text-xs text-slate-400 mb-1 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                ระยะเวลาชำระเงินก่อนถูกยกเลิกอัตโนมัติ (นาที)
              </label>
              <input
                type="number"
                value={paymentTimeoutMinutes}
                onChange={(e) => setPaymentTimeoutMinutes(Number(e.target.value))}
                min={1}
                max={1440}
                className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                required
              />
              <p className="text-[10px] text-slate-500 mt-1">
                เมื่อผู้ใช้กดจองสำเร็จ หากไม่มีการคลิกปุ่มชำระเงินภายในเวลานี้ ระบบจะดึงสถานะกลับมาเป็น "ว่าง" โดยอัตโนมัติ
              </p>
            </div>

            {/* Contact info / Instructions */}
            <div>
              <label className="block text-xs text-slate-400 mb-1 font-medium flex items-center gap-1">
                <PhoneCall className="w-3 h-3 text-slate-500" />
                ข้อมูลติดต่อผู้ดูแล (พิมพ์ในใบรับจอง)
              </label>
              <input
                type="text"
                value={contactInfo}
                onChange={(e) => setContactInfo(e.target.value)}
                placeholder="เช่น โทร. 081-234-5678"
                className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Allow User Booking Toggle */}
            <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-850">
              <div className="space-y-0.5 pr-2">
                <span className="block text-xs text-slate-300 font-bold">เปิดให้บุคคลทั่วไปกดจองหมายเลข</span>
                <p className="text-[10px] text-slate-500 leading-normal">
                  หากปิดสวิตช์ บุคคลทั่วไปจะดูได้เท่านั้น เฉพาะผู้ดูแลระบบถึงจะสามารถกดบันทึกการจองได้
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAllowUserBooking(!allowUserBooking)}
                className="text-slate-400 hover:text-white transition focus:outline-none"
              >
                {allowUserBooking ? (
                  <ToggleRight className="w-10 h-10 text-amber-500" />
                ) : (
                  <ToggleLeft className="w-10 h-10 text-slate-600" />
                )}
              </button>
            </div>

            {successMsg && (
              <div className="bg-emerald-950/30 border border-emerald-900/50 text-emerald-400 text-xs p-3 rounded-lg">
                {successMsg}
              </div>
            )}

            {errorMsg && (
              <div className="bg-rose-950/30 border border-rose-900/50 text-rose-400 text-xs p-3 rounded-lg">
                {errorMsg}
              </div>
            )}

            {/* Save Button */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1 bg-amber-500 hover:bg-amber-400 disabled:bg-amber-700 text-slate-950 font-bold px-4.5 py-2 text-xs rounded-lg transition"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}</span>
              </button>
            </div>
          </form>

          {/* High-Risk Wipe/Reset Area */}
          <div className="border-t border-slate-850 pt-5 space-y-3 shrink-0">
            <h4 className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              พื้นที่ควบคุมพิเศษ (Danger Zone)
            </h4>
            <div className="bg-rose-950/10 border border-rose-950/40 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-0.5">
                <span className="block text-xs font-bold text-white">ล้างและรีเซ็ตหมายเลขทั้งหมด (Full Wipe Reset)</span>
                <p className="text-[10px] text-slate-400 leading-normal">
                  ลบรายการจอง ชื่อผู้ติดต่อ บันทึกทั้งหมด และรีเซ็ตหมายเลข 00-99 ให้ว่างพร้อมใช้งานด้วยค่าราคาเริ่มต้น
                </p>
              </div>

              <button
                onClick={handleResetClick}
                disabled={saving}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-1 ${
                  resetConfirm
                    ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                    : 'bg-rose-950/30 hover:bg-rose-900/40 border border-rose-900/30 text-rose-400'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${saving ? 'animate-spin' : ''}`} />
                <span>{resetConfirm ? 'คลิกอีกครั้งเพื่อยืนยันการล้างทั้งหมด!' : 'ล้างระบบใหม่ทั้งหมด'}</span>
              </button>
            </div>
            {resetConfirm && (
              <p className="text-[9px] text-rose-500 text-right italic font-medium animate-bounce">
                * คำเตือน: ข้อมูลการจองทั้งหมดจะไม่สามารถกู้คืนกลับมาได้หลังจากกดปุ่มยืนยัน!
              </p>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-850 px-6 py-3 border-t border-slate-850 flex justify-end gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs text-slate-400 hover:text-white font-medium transition"
          >
            ปิดหน้านี้
          </button>
        </div>

      </div>
    </div>
  );
}
