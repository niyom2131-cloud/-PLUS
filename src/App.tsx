import React, { useState, useEffect } from 'react';
import { NumberItem, BookingRecord, SystemSettings, AuthState } from './types';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import NumberGrid from './components/NumberGrid';
import BookingModal from './components/BookingModal';
import ActivityLog from './components/ActivityLog';
import AdminPanel from './components/AdminPanel';
import { Shield, Sparkles, AlertCircle, HelpCircle, Layers, Calendar, Terminal } from 'lucide-react';

export default function App() {
  // Main database states
  const [numbers, setNumbers] = useState<NumberItem[]>([]);
  const [logs, setLogs] = useState<BookingRecord[]>([]);
  const [settings, setSettings] = useState<SystemSettings>({
    systemName: "หวยพลัส",
    defaultPrice: 100,
    currency: "บาท",
    allowUserBooking: true,
    contactInfo: ""
  });

  // UI States
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<NumberItem | null>(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [activeTab, setActiveTab] = useState<'grid' | 'logs'>('grid');
  
  // Auth State (Demo starts as guest)
  const [auth, setAuth] = useState<AuthState>({
    isAuthenticated: false,
    role: 'user',
    name: 'ผู้เยี่ยมชม (Guest)'
  });

  // Fetch numbers and logs on mount
  const fetchData = async () => {
    try {
      const res = await fetch('/api/numbers');
      if (res.ok) {
        const data = await res.json();
        setNumbers(data.numbers);
        setSettings(data.settings);
      }
      
      const logsRes = await fetch('/api/logs');
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setLogs(logsData);
      }
    } catch (error) {
      console.error("Error fetching data from Express server:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handler: Login
  const handleLogin = async (password: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      if (res.ok) {
        const data = await res.json();
        setAuth({
          isAuthenticated: true,
          role: 'admin',
          name: data.name
        });
        return true;
      }
    } catch (error) {
      console.error("Login failed:", error);
    }
    return false;
  };

  // Handler: Logout
  const handleLogout = () => {
    setAuth({
      isAuthenticated: false,
      role: 'user',
      name: 'ผู้เยี่ยมชม (Guest)'
    });
  };

  // Handler: Save number details (Booking, canceling, admin edit)
  const handleSaveNumber = async (num: string, payload: {
    status?: 'available' | 'booked' | 'closed';
    price?: number;
    bookedBy?: string;
    phone?: string;
    note?: string;
    operatorRole: 'admin' | 'user';
    isPaid?: boolean;
  }) => {
    try {
      const res = await fetch(`/api/numbers/${num}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        // Re-fetch to get latest db state
        await fetchData();
        
        // Update selectedItem so active modal is updated in-place with isPaid & expiration
        if (selectedItem && selectedItem.number === num) {
          setSelectedItem(data.number);
        }
      } else {
        throw new Error("Failed to save number details");
      }
    } catch (error) {
      console.error("Error saving number:", error);
      throw error;
    }
  };

  // Handler: Bulk edit numbers
  const handleBulkUpdate = async (selected: string[], status?: 'available' | 'booked' | 'closed', price?: number) => {
    try {
      const res = await fetch('/api/numbers/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedNumbers: selected,
          status,
          price,
          operatorRole: auth.role
        })
      });
      if (res.ok) {
        await fetchData();
      } else {
        throw new Error("Failed to perform bulk update");
      }
    } catch (error) {
      console.error("Bulk update failed:", error);
      throw error;
    }
  };

  // Handler: Save admin settings
  const handleSaveSettings = async (newSettings: SystemSettings) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
        await fetchData(); // sync numbers (e.g. if default price changed, it applies to reset)
      } else {
        throw new Error("Failed to update settings");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      throw error;
    }
  };

  // Handler: System reset
  const handleResetSystem = async () => {
    try {
      const res = await fetch('/api/numbers/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operatorRole: auth.role })
      });
      if (res.ok) {
        await fetchData();
      } else {
        throw new Error("Failed to reset system");
      }
    } catch (error) {
      console.error("Error resetting system:", error);
      throw error;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      
      {/* Header component */}
      <Header
        auth={auth}
        onLogin={handleLogin}
        onLogout={handleLogout}
        settings={settings}
        onOpenSettings={() => setShowAdminPanel(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {loading ? (
          /* Loading Skeleton */
          <div className="py-24 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-slate-500 font-mono">กำลังเชื่อมต่อฐานข้อมูล db.json...</p>
          </div>
        ) : (
          <>
            {/* Dashboard metrics statistics widget */}
            <Dashboard numbers={numbers} settings={settings} />

            {/* Main view switcher tabs */}
            <div className="flex border-b border-slate-850/60">
              <button
                onClick={() => setActiveTab('grid')}
                className={`py-3 px-5 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
                  activeTab === 'grid'
                    ? 'border-amber-500 text-white font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>แผงจัดการตัวเลข 00-99</span>
              </button>
              <button
                onClick={() => setActiveTab('logs')}
                className={`py-3 px-5 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
                  activeTab === 'logs'
                    ? 'border-amber-500 text-white font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Terminal className="w-4 h-4" />
                <span>บันทึกประวัติการจอง ({logs.length})</span>
              </button>
            </div>

            {/* Tab views conditional rendering */}
            <div className="space-y-6">
              {activeTab === 'grid' ? (
                <NumberGrid
                  numbers={numbers}
                  settings={settings}
                  auth={auth}
                  onNumberSelect={(item) => setSelectedItem(item)}
                  onBulkUpdate={handleBulkUpdate}
                />
              ) : (
                <ActivityLog
                  logs={logs}
                  settings={settings}
                  onRefresh={fetchData}
                />
              )}
            </div>
          </>
        )}
      </main>

      {/* Footer copyright */}
      <footer className="bg-slate-950 border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        <p>© 2026 {settings.systemName}. สงวนลิขสิทธิ์</p>
      </footer>

      {/* Details/Booking Modal overlay */}
      {selectedItem && (
        <BookingModal
          item={selectedItem}
          settings={settings}
          auth={auth}
          onClose={() => setSelectedItem(null)}
          onSave={handleSaveNumber}
        />
      )}

      {/* Admin Panel Settings overlay */}
      {showAdminPanel && (
        <AdminPanel
          settings={settings}
          auth={auth}
          onSaveSettings={handleSaveSettings}
          onResetSystem={handleResetSystem}
          onClose={() => setShowAdminPanel(false)}
        />
      )}
    </div>
  );
}
