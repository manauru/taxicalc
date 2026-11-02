export interface LoginHistoryRecord {
  id: string;
  timestamp: number;
  device: string;
  browser: string;
  ip: string;
  location: string;
  isCurrentSession: boolean;
}

export interface UserAgreements {
  termsOfService: boolean;
  privacyPolicy: boolean;
  dataProcessing: boolean;
  analyticsCookies: boolean;
  acceptedAt?: number;
}

export type UserRole = 'admin' | 'driver' | 'fleet_manager';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  city: string;
  taxiCategory: 'economy' | 'comfort' | 'comfort_plus' | 'business';
  phone?: string;
  postalAddress?: string;
  avatarUrl?: string;
  createdAt: number;
  loginHistory?: LoginHistoryRecord[];
  agreements?: UserAgreements;
  role?: UserRole;
  isBlocked?: boolean;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  city: string;
  taxiCategory: 'economy' | 'comfort' | 'comfort_plus' | 'business';
  phone?: string;
  postalAddress?: string;
  avatarUrl?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}
