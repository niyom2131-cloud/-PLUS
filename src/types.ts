export type NumberStatus = 'available' | 'booked' | 'closed';

export interface NumberItem {
  number: string;     // "00" through "99"
  price: number;
  status: NumberStatus;
  bookedBy?: string;
  phone?: string;
  note?: string;
  updatedAt?: string;
  isPaid?: boolean;
  bookingExpiresAt?: string;
  slipImage?: string;
}

export interface BookingRecord {
  id: string;
  number: string;
  price: number;
  customerName: string;
  phone: string;
  note?: string;
  timestamp: string;
  action: 'book' | 'release' | 'update';
  operatorRole: 'admin' | 'user';
}

export interface SystemSettings {
  systemName: string;
  defaultPrice: number;
  currency: string;
  allowUserBooking: boolean;
  contactInfo: string;
  paymentTimeoutMinutes?: number;
}

export interface AuthState {
  isAuthenticated: boolean;
  role: 'admin' | 'user';
  name: string;
}

export interface DashboardStats {
  total: number;
  available: number;
  booked: number;
  closed: number;
  totalValue: number;
  bookedValue: number;
  expectedValue: number;
}
