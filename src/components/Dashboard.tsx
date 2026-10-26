import { Hash, CheckCircle2, Ticket, Ban, DollarSign, TrendingUp, Sparkles } from 'lucide-react';
import { NumberItem, SystemSettings } from '../types';

interface DashboardProps {
  numbers: NumberItem[];
  settings: SystemSettings;
}

export default function Dashboard({ numbers, settings }: DashboardProps) {
  const totalCount = numbers.length;
  const availableCount = numbers.filter((n) => n.status === 'available').length;
  const bookedCount = numbers.filter((n) => n.status === 'booked').length;
  const closedCount = numbers.filter((n) => n.status === 'closed').length;

  const bookedValue = numbers
    .filter((n) => n.status === 'booked')
    .reduce((sum, n) => sum + n.price, 0);

  const totalValue = numbers
    .filter((n) => n.status !== 'closed')
    .reduce((sum, n) => sum + n.price, 0);

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'decimal',
      minimumFractionDigits: 0,
    }).format(val);
  };

  const bookedPercentage = totalCount > 0 ? (bookedCount / totalCount) * 100 : 0;
  const availablePercentage = totalCount > 0 ? (availableCount / totalCount) * 100 : 0;
  const closedPercentage = totalCount > 0 ? (closedCount / totalCount) * 100 : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 1. Total Numbers Stat */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-sm relative overflow-hidden group">
        <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-20 h-20 bg-slate-800 rounded-full blur-2xl group-hover:bg-slate-700/20 transition-colors duration-500"></div>
        <div className="space-y-1">
          <span className="text-xs text-slate-400 font-medium">ตัวเลขทั้งหมด</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold text-white font-mono">{totalCount}</span>
            <span className="text-xs text-slate-500 font-medium">หมายเลข</span>
          </div>
          <p className="text-[11px] text-slate-500 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            ตัวเลขจัดเก็บครบถ้วน 00 ถึง 99
          </p>
        </div>
        <div className="p-3 bg-slate-800/80 rounded-xl text-slate-300">
          <Hash className="w-5 h-5 text-indigo-400" />
        </div>
      </div>

      {/* 2. Available Stat */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-sm relative overflow-hidden group">
        <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-20 h-20 bg-emerald-950/20 rounded-full blur-2xl group-hover:bg-emerald-900/20 transition-colors duration-500"></div>
        <div className="space-y-1">
          <span className="text-xs text-slate-400 font-medium">ว่าง / พร้อมใช้งาน</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold text-emerald-400 font-mono">{availableCount}</span>
            <span className="text-xs text-slate-500 font-medium">หมายเลข</span>
          </div>
          <div className="w-24 bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1.5">
            <div 
              className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${availablePercentage}%` }}
            ></div>
          </div>
        </div>
        <div className="p-3 bg-emerald-950/40 border border-emerald-900/30 rounded-xl text-emerald-400">
          <CheckCircle2 className="w-5 h-5" />
        </div>
      </div>

      {/* 3. Booked Stat */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-sm relative overflow-hidden group">
        <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-20 h-20 bg-amber-950/20 rounded-full blur-2xl group-hover:bg-amber-900/20 transition-colors duration-500"></div>
        <div className="space-y-1">
          <span className="text-xs text-slate-400 font-medium">ถูกจองแล้ว</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold text-amber-400 font-mono">{bookedCount}</span>
            <span className="text-xs text-slate-500 font-medium">หมายเลข ({bookedPercentage.toFixed(0)}%)</span>
          </div>
          <div className="w-24 bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1.5">
            <div 
              className="bg-amber-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${bookedPercentage}%` }}
            ></div>
          </div>
        </div>
        <div className="p-3 bg-amber-950/40 border border-amber-900/30 rounded-xl text-amber-400">
          <Ticket className="w-5 h-5" />
        </div>
      </div>

      {/* 4. Financial Status */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-sm relative overflow-hidden group">
        <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-20 h-20 bg-blue-950/20 rounded-full blur-2xl group-hover:bg-blue-900/20 transition-colors duration-500"></div>
        <div className="space-y-1">
          <span className="text-xs text-slate-400 font-medium">ยอดเงินจองรวม / ยอดขาย</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-sky-400 font-mono">
              {formatMoney(bookedValue)}
            </span>
            <span className="text-xs text-slate-400 font-medium ml-0.5">{settings.currency}</span>
          </div>
          <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-1">
            <TrendingUp className="w-3.5 h-3.5 text-sky-400" />
            มูลค่าเป้าหมายทั้งหมด: {formatMoney(totalValue)} {settings.currency}
          </p>
        </div>
        <div className="p-3 bg-sky-950/40 border border-sky-900/30 rounded-xl text-sky-400">
          <DollarSign className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
