import React, { useState } from 'react';
import { Shield, ShieldAlert, LogOut, Info, Settings, Eye, HelpCircle } from 'lucide-react';
import { AuthState, SystemSettings } from '../types';

interface HeaderProps {
  auth: AuthState;
  onLogin: (password: string) => Promise<boolean>;
  onLogout: () => void;
  settings: SystemSettings;
  onOpenSettings: () => void;
}

export default function Header({ auth, onLogin, onLogout, settings, onOpenSettings }: HeaderProps) {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    const success = await onLogin(password);
    setLoading(false);
    
    if (success) {
      setPassword('');
      setShowLoginModal(false);
    } else {
      setError('รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
    }
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        
        {/* Title / Brand */}
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-amber-500 to-amber-300 p-2.5 rounded-xl shadow-lg shadow-amber-500/10">
            <span className="font-mono text-xl font-black text-slate-950 tracking-wider">99</span>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
              {settings.systemName}
            </h1>
            <p className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              ระบบทำงานแบบ Full-Stack • บันทึกข้อมูลแบบ Real-time ลง db.json
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Status Badge */}
          <div className="hidden md:flex items-center gap-2 bg-slate-800/80 border border-slate-700/60 rounded-lg px-3 py-1.5 text-xs text-slate-300">
            <Info className="w-3.5 h-3.5 text-amber-400" />
            <span>สิทธิ์ปัจจุบัน: </span>
            <span className={`font-semibold ${auth.role === 'admin' ? 'text-amber-400' : 'text-slate-400'}`}>
              {auth.role === 'admin' ? 'ผู้ดูแลระบบ (Admin)' : 'ผู้เยี่ยมชม (Guest)'}
            </span>
          </div>

          {/* Admin Settings Button */}
          {auth.role === 'admin' && (
            <button
              onClick={onOpenSettings}
              id="btn-settings"
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-750 text-white border border-slate-700 hover:border-slate-600 rounded-lg px-3 py-1.5 text-sm transition"
              title="ตั้งค่าระบบ"
            >
              <Settings className="w-4 h-4 text-slate-400" />
              <span className="hidden sm:inline">ตั้งค่า</span>
            </button>
          )}

          {/* Auth Button */}
          {auth.isAuthenticated ? (
            <button
              onClick={onLogout}
              id="btn-logout"
              className="flex items-center gap-1.5 bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-900/50 hover:border-rose-800 rounded-lg px-3 py-1.5 text-sm transition"
            >
              <LogOut className="w-4 h-4" />
              <span>ออกจากระบบ</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setError('');
                setShowLoginModal(true);
              }}
              id="btn-login-trigger"
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-medium rounded-lg px-4 py-1.5 text-sm transition shadow-md shadow-amber-500/10"
            >
              <Shield className="w-4 h-4" />
              <span>เข้าสู่ระบบผู้ดูแล</span>
            </button>
          )}
        </div>
      </div>

      {/* Admin Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-4 text-slate-950 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5" />
                <span className="font-bold">เข้าสู่ระบบควบคุม (Admin Login)</span>
              </div>
              <button
                onClick={() => setShowLoginModal(false)}
                className="text-slate-950 hover:bg-slate-950/10 rounded p-1 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleLoginSubmit} className="p-6 space-y-4">
              <div className="bg-slate-950/50 border border-slate-800 rounded-lg p-3 text-xs text-slate-400">
                <p className="text-slate-300 leading-relaxed">เข้าสู่ระบบผู้ดูแลระบบเพื่อจัดการและตั้งค่าข้อมูลภายในระบบทั้งหมด</p>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1 font-medium">กรอกรหัสผ่านผู้ดูแลระบบ</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-mono"
                  required
                  autoFocus
                />
              </div>

              {error && (
                <div className="text-rose-400 text-xs bg-rose-950/30 border border-rose-900/50 p-2.5 rounded-lg">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLoginModal(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-amber-500 hover:bg-amber-400 disabled:bg-amber-700 text-slate-950 font-semibold px-4 py-2 text-xs rounded-lg transition"
                >
                  {loading ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
