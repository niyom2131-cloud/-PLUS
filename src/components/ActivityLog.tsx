import React, { useState, useMemo } from 'react';
import { BookingRecord, SystemSettings } from '../types';
import { History, Search, ArrowDownToLine, RefreshCw, Layers, ShieldAlert, BadgeCheck } from 'lucide-react';

interface ActivityLogProps {
  logs: BookingRecord[];
  settings: SystemSettings;
  onRefresh: () => void;
}

export default function ActivityLog({ logs, settings, onRefresh }: ActivityLogProps) {
  const [search, setSearch] = useState('');

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchSearch = 
        log.number.includes(search) ||
        log.customerName.toLowerCase().includes(search.toLowerCase()) ||
        (log.phone && log.phone.includes(search)) ||
        (log.note && log.note.toLowerCase().includes(search.toLowerCase()));
      return matchSearch;
    });
  }, [logs, search]);

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'book':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
            <BadgeCheck className="w-3 h-3" />
            จองสำเร็จ
          </span>
        );
      case 'release':
        return (
          <span className="inline-flex items-center gap-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
            ✕ ยกเลิกจอง
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
            ✎ แก้ไขข้อมูล
          </span>
        );
    }
  };

  const getOperatorBadge = (role: string) => {
    if (role === 'admin') {
      return (
        <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded text-[9px] font-semibold">
          <ShieldAlert className="w-2.5 h-2.5" />
          ผู้ดูแลระบบ
        </span>
      );
    }
    return (
      <span className="bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded text-[9px] font-medium">
        ทั่วไป
      </span>
    );
  };

  // CSV Export simulation
  const handleExportCSV = () => {
    if (logs.length === 0) return;
    
    // Headers
    const headers = ["วันที่", "หมายเลข", "ราคา", "ผู้ดำเนินการ", "ชื่อผู้จอง", "เบอร์โทร", "ประเภทงาน", "บันทึก"];
    
    // Rows
    const rows = logs.map(log => [
      new Date(log.timestamp).toLocaleString('th-TH'),
      log.number,
      log.price,
      log.operatorRole === 'admin' ? 'แอดมิน' : 'ทั่วไป',
      log.customerName,
      log.phone,
      log.action === 'book' ? 'จอง' : log.action === 'release' ? 'ยกเลิก' : 'อัปเดต',
      log.note || ''
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val.toString().replace(/"/g, '""')}"`).join(","))].join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `รายงานบันทึกประวัติ_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-amber-500 animate-pulse" />
          <div>
            <h3 className="text-md font-semibold text-white">บันทึกประวัติการทำรายการ (System Logs)</h3>
            <p className="text-[11px] text-slate-400">แสดงการจอง ยกเลิก หรือปรับราคาหมายเลข 00-99 ล่าสุด</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Refresh button */}
          <button
            onClick={onRefresh}
            className="p-1.5 bg-slate-950 text-slate-400 hover:text-white border border-slate-850 hover:border-slate-750 rounded-lg transition"
            title="รีเฟรชประวัติ"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Export to CSV Button */}
          <button
            onClick={handleExportCSV}
            disabled={logs.length === 0}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-750 text-white border border-slate-700 hover:border-slate-600 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition disabled:opacity-50"
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
            <span>ส่งออก CSV (Excel)</span>
          </button>
        </div>
      </div>

      {/* Filter and Search inside Logs */}
      <div className="relative">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <Search className="w-3.5 h-3.5 text-slate-500" />
        </span>
        <input
          type="text"
          placeholder="ค้นหาในประวัติ (ค้นหาเบอร์ ชื่อผู้จอง หรือรายละเอียด...)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-950 border border-slate-850 rounded-lg pl-8.5 pr-4 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 placeholder-slate-500 transition font-mono"
        />
      </div>

      {/* Logs Table / List */}
      <div className="overflow-x-auto rounded-xl border border-slate-850 bg-slate-950">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-900 border-b border-slate-850 text-slate-400">
              <th className="p-3 font-semibold">เวลาทำรายการ</th>
              <th className="p-3 font-semibold">หมายเลข</th>
              <th className="p-3 font-semibold">สถานะงาน</th>
              <th className="p-3 font-semibold">ผู้สั่งจอง / แก้ไข</th>
              <th className="p-3 font-semibold">เบอร์โทร</th>
              <th className="p-3 font-semibold">บันทึก / รายละเอียด</th>
              <th className="p-3 font-semibold text-right">ผู้จัดทำ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850/40 text-slate-300">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-500">
                  ไม่มีข้อมูลประวัติรายการที่ค้นหา
                </td>
              </tr>
            ) : (
              filteredLogs.slice(0, 50).map((log) => (
                <tr key={log.id} className="hover:bg-slate-900/50 transition">
                  <td className="p-3 text-slate-400 font-mono">
                    {new Date(log.timestamp).toLocaleString('th-TH', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </td>
                  <td className="p-3">
                    <span className="font-mono font-black text-amber-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                      {log.number}
                    </span>
                  </td>
                  <td className="p-3">
                    {getActionBadge(log.action)}
                  </td>
                  <td className="p-3 font-medium">
                    {log.customerName}
                  </td>
                  <td className="p-3 font-mono text-slate-400">
                    {log.phone}
                  </td>
                  <td className="p-3 text-slate-400 text-[11px] truncate max-w-xs" title={log.note}>
                    {log.note || '-'}
                  </td>
                  <td className="p-3 text-right">
                    {getOperatorBadge(log.operatorRole)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {logs.length > 50 && (
        <p className="text-[10px] text-slate-500 text-center">
          * แสดงรายการแก้ไขและประวัติล่าสุด 50 รายการล่าสุดเพื่อประสิทธิภาพ
        </p>
      )}
    </div>
  );
}
