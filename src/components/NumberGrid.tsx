import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Search, Filter, Hash, CheckSquare, Square, Edit, Grid3X3, ArrowUpDown, RefreshCw, Layers, Download } from 'lucide-react';
import { NumberItem, SystemSettings, AuthState } from '../types';

interface NumberGridProps {
  numbers: NumberItem[];
  settings: SystemSettings;
  auth: AuthState;
  onNumberSelect: (numberItem: NumberItem) => void;
  onBulkUpdate: (selected: string[], status?: 'available' | 'booked' | 'closed', price?: number) => Promise<void>;
}

export default function NumberGrid({ numbers, settings, auth, onNumberSelect, onBulkUpdate }: NumberGridProps) {
  // Filters State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'booked' | 'closed'>('all');
  const [groupFilter, setGroupFilter] = useState<'all' | 'even' | 'odd' | 'doubles'>('all');
  const [tensFilter, setTensFilter] = useState<string>('all'); // 'all', '0', '1', ..., '9'
  const [unitsFilter, setUnitsFilter] = useState<string>('all'); // 'all', '0', '1', ..., '9'
  
  // Bulk Selection State
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedNumbers, setSelectedNumbers] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<'available' | 'closed' | ''>('');
  const [bulkPrice, setBulkPrice] = useState<string>('');
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  // Subtle 'pop' animation tracking state
  const [poppedNumbers, setPoppedNumbers] = useState<Record<string, boolean>>({});
  const prevStatusesRef = useRef<Record<string, string>>({});

  useEffect(() => {
    const updates: Record<string, boolean> = {};
    let hasUpdates = false;

    numbers.forEach((item) => {
      const prevStatus = prevStatusesRef.current[item.number];
      // Only pop if the status actually changed from a previously known status (not initial load)
      if (prevStatus !== undefined && prevStatus !== item.status) {
        updates[item.number] = true;
        hasUpdates = true;
      }
      // Update ref with current status
      prevStatusesRef.current[item.number] = item.status;
    });

    if (hasUpdates) {
      setPoppedNumbers((prev) => ({ ...prev, ...updates }));
      
      // Clear pop state after 800ms
      const timer = setTimeout(() => {
        setPoppedNumbers((prev) => {
          const next = { ...prev };
          Object.keys(updates).forEach((num) => {
            delete next[num];
          });
          return next;
        });
      }, 800);
      
      return () => clearTimeout(timer);
    }
  }, [numbers]);

  // Clear search and filters
  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setGroupFilter('all');
    setTensFilter('all');
    setUnitsFilter('all');
    setSelectedNumbers([]);
  };

  // Filter & Search Logic
  const filteredNumbers = useMemo(() => {
    return numbers.filter((num) => {
      // 1. Search Query (Number, Booker Name, Phone, Note, or Status)
      const query = search.trim().toLowerCase();
      
      let matchesSearch = true;
      if (query !== '') {
        let matchesStatus = false;
        
        // Match status keywords in Thai and English
        if ('ว่าง'.includes(query) || 'available'.includes(query) || 'เปิด'.includes(query)) {
          matchesStatus = matchesStatus || (num.status === 'available');
        }
        if ('จอง'.includes(query) || 'booked'.includes(query) || 'จองแล้ว'.includes(query)) {
          matchesStatus = matchesStatus || (num.status === 'booked');
        }
        if ('ปิด'.includes(query) || 'closed'.includes(query) || 'ปิดขาย'.includes(query) || 'ไม่ขาย'.includes(query)) {
          matchesStatus = matchesStatus || (num.status === 'closed');
        }

        // Match "has notes" keyword
        let matchesHasNote = false;
        if ('มีหมายเหตุ'.includes(query) || 'หมายเหตุ'.includes(query) || 'มีโน้ต'.includes(query) || 'โน้ต'.includes(query) || 'note'.includes(query) || 'notes'.includes(query)) {
          matchesHasNote = !!num.note;
        }

        matchesSearch =
          num.number.includes(query) ||
          (num.bookedBy && num.bookedBy.toLowerCase().includes(query)) ||
          (num.note && num.note.toLowerCase().includes(query)) ||
          (num.phone && num.phone.includes(query)) ||
          matchesStatus ||
          matchesHasNote;
      }

      if (!matchesSearch) return false;

      // 2. Status Filter
      if (statusFilter !== 'all' && num.status !== statusFilter) return false;

      // 3. Special Group Filters (Even, Odd, Doubles)
      const numVal = parseInt(num.number, 10);
      if (groupFilter === 'even' && numVal % 2 !== 0) return false;
      if (groupFilter === 'odd' && numVal % 2 === 0) return false;
      if (groupFilter === 'doubles' && num.number[0] !== num.number[1]) return false;

      // 4. Tens Filter (e.g. 20-29 for '2')
      if (tensFilter !== 'all' && num.number[0] !== tensFilter) return false;

      // 5. Units Filter (e.g. 03, 13, 23 for '3')
      if (unitsFilter !== 'all' && num.number[1] !== unitsFilter) return false;

      return true;
    });
  }, [numbers, search, statusFilter, groupFilter, tensFilter, unitsFilter]);

  // Handle number tile click
  const handleTileClick = (item: NumberItem) => {
    if (bulkMode && auth.role === 'admin') {
      if (selectedNumbers.includes(item.number)) {
        setSelectedNumbers(selectedNumbers.filter(n => n !== item.number));
      } else {
        setSelectedNumbers([...selectedNumbers, item.number]);
      }
    } else {
      onNumberSelect(item);
    }
  };

  // Select/Deselect All filtered numbers
  const handleSelectAllFiltered = () => {
    const filteredKeys = filteredNumbers.map(n => n.number);
    const allSelected = filteredKeys.every(num => selectedNumbers.includes(num));
    
    if (allSelected) {
      // Remove all filtered from selection
      setSelectedNumbers(selectedNumbers.filter(n => !filteredKeys.includes(n)));
    } else {
      // Add missing filtered
      const uniqueSelected = Array.from(new Set([...selectedNumbers, ...filteredKeys]));
      setSelectedNumbers(uniqueSelected);
    }
  };

  // Submit bulk update
  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedNumbers.length === 0) return;
    
    setBulkSubmitting(true);
    const priceNum = bulkPrice ? parseInt(bulkPrice, 10) : undefined;
    const statusVal = bulkStatus ? bulkStatus : undefined;
    
    await onBulkUpdate(selectedNumbers, statusVal, priceNum);
    
    // Reset states
    setBulkPrice('');
    setBulkStatus('');
    setSelectedNumbers([]);
    setBulkMode(false);
    setBulkSubmitting(false);
  };

  // Export to CSV Function
  const handleExportCSV = () => {
    // CSV Header columns
    const headers = ['หมายเลข (Number)', 'สถานะ (Status)', 'ราคา (Price)', 'ผู้จอง (Booked By)', 'เบอร์โทร (Phone)', 'หมายเหตุ (Note)'];
    
    // Process items in currently filtered state
    const rows = filteredNumbers.map(item => {
      const escape = (val: string | undefined | null) => {
        if (val === undefined || val === null) return '';
        const s = String(val).replace(/"/g, '""');
        return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
      };

      let statusLabel = 'ว่าง';
      if (item.status === 'booked') statusLabel = 'จองแล้ว';
      if (item.status === 'closed') statusLabel = 'ปิดขาย';

      return [
        `'${item.number}`, // prefix with quote to prevent Excel from dropping leading zeros
        statusLabel,
        item.price,
        escape(item.bookedBy),
        escape(item.phone),
        escape(item.note)
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    // Add UTF-8 BOM so Excel opens Thai correctly
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Date format for file name
    const dateStr = new Date().toLocaleDateString('th-TH').replace(/\//g, '-');
    link.setAttribute('download', `${settings.systemName}_รายงานตัวเลข_${dateStr}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* 2. Admin Bulk Control toggle */}
      {auth.role === 'admin' && (
        <div className="flex items-center justify-between bg-slate-900 border border-slate-850/80 rounded-xl px-4 py-3 shadow-md">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setBulkMode(!bulkMode);
                setSelectedNumbers([]);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                bulkMode
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>{bulkMode ? 'ปิดโหมดเลือกกลุ่ม' : 'เปิดโหมดเลือกแก้ไขแบบกลุ่ม'}</span>
            </button>
            
            {bulkMode && (
              <span className="text-xs text-slate-300 font-medium font-mono">
                เลือกแล้ว <strong className="text-amber-400">{selectedNumbers.length}</strong> หมายเลข
              </span>
            )}
          </div>

          {bulkMode && filteredNumbers.length > 0 && (
            <button
              onClick={handleSelectAllFiltered}
              className="text-xs text-amber-500 hover:text-amber-400 font-medium transition"
            >
              {filteredNumbers.every(n => selectedNumbers.includes(n.number))
                ? 'ยกเลิกเลือกที่กรองทั้งหมด'
                : 'เลือกผลลัพธ์ที่กรองทั้งหมด'}
            </button>
          )}
        </div>
      )}

      {/* 3. The 10x10 Number Grid Layout */}
      <div className="bg-slate-950/40 border border-slate-850 rounded-2xl p-6 shadow-xl relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 border-b border-slate-850/60 pb-3 gap-3">
          <div className="flex items-center gap-2">
            <Grid3X3 className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-300">
              ตารางหมายเลข ({filteredNumbers.length} จาก 100 รายการ)
            </h3>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500"></span>
              <span>ว่าง ({numbers.filter(n => n.status === 'available').length})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-amber-500"></span>
              <span>จอง ({numbers.filter(n => n.status === 'booked').length})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-rose-500"></span>
              <span>ปิด ({numbers.filter(n => n.status === 'closed').length})</span>
            </div>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 hover:text-amber-400 hover:border-amber-500/50 transition cursor-pointer font-medium"
              title="ดาวน์โหลดข้อมูลตารางตัวเลขปัจจุบันเป็นไฟล์ CSV"
            >
              <Download className="w-3.5 h-3.5 text-amber-500" />
              <span>ส่งออก CSV</span>
            </button>
          </div>
        </div>

        {filteredNumbers.length === 0 ? (
          <div className="py-12 text-center text-slate-500 space-y-2">
            <p className="text-sm">ไม่พบหมายเลขที่ตรงกับเงื่อนไขการค้นหา</p>
            <button
              onClick={handleResetFilters}
              className="text-xs text-amber-500 hover:underline"
            >
              คลิกเพื่อล้างตัวกรองและแสดงทั้งหมด
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
            {filteredNumbers.map((item) => {
              const isSelected = selectedNumbers.includes(item.number);
              const isPopped = poppedNumbers[item.number];
              
              // Determine styles based on status and selection
              let statusColor = 'bg-emerald-950/50 border-emerald-900/60 hover:border-emerald-500 text-emerald-400 hover:bg-emerald-900/10';
              if (item.status === 'booked') {
                statusColor = 'bg-amber-950/50 border-amber-900/60 hover:border-amber-500 text-amber-400 hover:bg-amber-900/10';
              } else if (item.status === 'closed') {
                statusColor = 'bg-rose-950/30 border-rose-900/40 text-rose-500/70 hover:border-rose-700/60';
              }

              if (isSelected) {
                statusColor = 'ring-2 ring-amber-500 ring-offset-2 ring-offset-slate-950 bg-amber-500 text-slate-950 border-transparent font-bold';
              }

              return (
                <motion.button
                  key={item.number}
                  onClick={() => handleTileClick(item)}
                  animate={isPopped ? { 
                    scale: [1, 1.15, 0.95, 1],
                    y: [0, -4, 2, 0]
                  } : { scale: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className={`aspect-square rounded-xl border flex flex-col justify-between p-2.5 transition duration-200 cursor-pointer text-left relative overflow-hidden group ${statusColor}`}
                >
                  {/* Visual Background Accent on Hover */}
                  {!isSelected && (
                    <span className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition duration-300"></span>
                  )}

                  {/* Subtle dynamic ping overlay when updated */}
                  {isPopped && (
                    <span className={`absolute inset-0 pointer-events-none border-2 rounded-xl animate-ping opacity-60 ${
                      item.status === 'available' ? 'border-emerald-400' :
                      item.status === 'booked' ? 'border-amber-400' : 'border-rose-400'
                    }`} />
                  )}

                  {/* Top line of Card */}
                  <div className="flex justify-between items-start w-full z-10">
                    <span className="font-mono text-xl font-bold tracking-tight">
                      {item.number}
                    </span>
                    {bulkMode && auth.role === 'admin' && (
                      <span className="z-20">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-slate-950 fill-slate-950" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-600/70" />
                        )}
                      </span>
                    )}
                  </div>

                  {/* Bottom line: Price badge */}
                  <div className="w-full flex justify-between items-baseline z-10">
                    <span className={`font-mono text-[10px] font-medium ${isSelected ? 'text-slate-950' : 'text-slate-400'}`}>
                      {item.price} {settings.currency}
                    </span>
                    
                    {/* Tiny Booker hint indicator if booked */}
                    {!isSelected && item.status === 'booked' && item.bookedBy && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" title={`จองโดย: ${item.bookedBy}`}></span>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Bulk Edit Action Panel */}
      {bulkMode && selectedNumbers.length > 0 && auth.role === 'admin' && (
        <form 
          onSubmit={handleBulkSubmit}
          className="bg-slate-900 border-2 border-amber-500/40 rounded-2xl p-5 shadow-xl space-y-4 animate-fade-in"
        >
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
            <Layers className="w-4 h-4 text-amber-500" />
            <h4 className="text-sm font-semibold text-white">
              แก้ไขกลุ่มตัวเลขที่เลือก ({selectedNumbers.length} หมายเลข)
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Set Status */}
            <div>
              <label className="block text-xs text-slate-400 mb-1 font-medium">เปลี่ยนสถานะเป็น</label>
              <select
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="">-- ไม่เปลี่ยนแปลง --</option>
                <option value="available">เปิดให้จอง (ว่าง)</option>
                <option value="closed">ปิดใช้งาน (ไม่ขาย)</option>
              </select>
            </div>

            {/* Set Price */}
            <div>
              <label className="block text-xs text-slate-400 mb-1 font-medium">เปลี่ยนราคาเป็น ({settings.currency})</label>
              <input
                type="number"
                placeholder="เช่น 120"
                value={bulkPrice}
                onChange={(e) => setBulkPrice(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex items-end gap-2">
              <button
                type="submit"
                disabled={bulkSubmitting || (!bulkStatus && !bulkPrice)}
                className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold py-2 text-xs rounded-lg transition"
              >
                {bulkSubmitting ? 'กำลังบันทึก...' : 'อัปเดตข้อมูลทั้งหมด'}
              </button>
              <button
                type="button"
                onClick={() => setSelectedNumbers([])}
                className="bg-slate-800 hover:bg-slate-750 border border-slate-700 text-white py-2 px-3 text-xs rounded-lg transition"
              >
                ล้างที่เลือก
              </button>
            </div>
          </div>
          <p className="text-[10px] text-slate-500">
            * หมายเหตุ: การปิดใช้งานหรือการเปิดขายแบบกลุ่มจะล้างข้อมูลการจองเดิม (ชื่อผู้จองและเบอร์โทรศัพท์) ของหมายเลขกลุ่มนั้นออกโดยอัตโนมัติ
          </p>
        </form>
      )}

    </div>
  );
}
