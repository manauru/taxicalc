// Security & Telemetry Error Monitoring Storage
export interface SecurityIncident {
  id: string;
  type: 'brute_force' | 'geo_anomaly' | 'unauthorized_admin' | 'session_anomaly' | 'suspicious_payload';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  ip: string;
  location: string;
  targetAccount?: string;
  timestamp: number;
  status: 'active' | 'investigating' | 'resolved' | 'blocked';
  userAgent: string;
}

export interface AppSystemError {
  id: string;
  level: 'critical' | 'error' | 'warning' | 'info';
  message: string;
  source: string;
  stack?: string;
  timestamp: number;
  userId?: string;
  userName?: string;
  browser: string;
  resolved: boolean;
}

const SECURITY_INCIDENTS_KEY = 'taxicalc_security_incidents_v1';
const SYSTEM_ERRORS_KEY = 'taxicalc_system_errors_v1';
const BLOCKED_IPS_KEY = 'taxicalc_blocked_ips_v1';

const INITIAL_DEMO_INCIDENTS: SecurityIncident[] = [
  {
    id: 'inc_01',
    type: 'brute_force',
    severity: 'high',
    title: 'Подозрительный перебор пароля (Brute-Force)',
    description: 'Зафиксировано 6 неудачных попыток авторизации подряд с одного IP-адреса.',
    ip: '185.220.101.42',
    location: 'Нидерланды, Амстердам (Tor Exit Node)',
    targetAccount: 'auth_attempt_unknown',
    timestamp: Date.now() - 45 * 60 * 1000,
    status: 'blocked',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Python-urllib/3.10',
  },
  {
    id: 'inc_02',
    type: 'unauthorized_admin',
    severity: 'critical',
    title: 'Неавторизованная попытка доступа к панели администратора',
    description: 'Пользователь без прав администратора попытался вызвать привилегированные функции админ-панели.',
    ip: '94.25.174.82',
    location: 'Россия, Москва',
    targetAccount: 'guest_unauth',
    timestamp: Date.now() - 2 * 3600 * 1000,
    status: 'resolved',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15',
  },
  {
    id: 'inc_03',
    type: 'geo_anomaly',
    severity: 'medium',
    title: 'Аномальная смена геолокации (Impossible Travel)',
    description: 'Вход в аккаунт совершен через 20 минут после сеанса в Москве из другой страны.',
    ip: '109.175.201.12',
    location: 'Германия, Франкфурт',
    targetAccount: 'security_audit_check',
    timestamp: Date.now() - 8 * 3600 * 1000,
    status: 'investigating',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/128.0.0.0',
  },
  {
    id: 'inc_04',
    type: 'session_anomaly',
    severity: 'low',
    title: 'Множественные одновременные сеансы',
    description: 'Обнаружено более 4 одновременных активных сеансов с разных типов устройств.',
    ip: '213.87.129.45',
    location: 'Россия, Санкт-Петербург',
    targetAccount: 'security_monitor',
    timestamp: Date.now() - 24 * 3600 * 1000,
    status: 'resolved',
    userAgent: 'Android 14 (Samsung Galaxy S24) / Chrome Mobile',
  },
];

const INITIAL_DEMO_ERRORS: AppSystemError[] = [
  {
    id: 'err_01',
    level: 'warning',
    message: 'Предупреждение расчета смены: нулевой полезный пробег при наличии оплаченных заказов',
    source: 'ShiftCalculator.tsx / calculateDailyShift()',
    stack: 'ValidationWarning: paidMileageKm is 0 while ordersCount > 0\n  at validateDailyInput (calculations.ts:142)\n  at calculateDailyShift (calculations.ts:48)',
    timestamp: Date.now() - 15 * 60 * 1000,
    userName: 'Руслан Каримов',
    browser: 'Яндекс.Браузер 24.7 (Android 14)',
    resolved: false,
  },
  {
    id: 'err_02',
    level: 'error',
    message: 'Ошибка парсинга CSV-файла: неверный формат разделителя колонок',
    source: 'ShiftHistory.tsx / handleImportCSV()',
    stack: 'ParserError: Unexpected token ";" on row 14\n  at parseCSVLine (storage.ts:285)\n  at handleImport (ShiftHistory.tsx:112)',
    timestamp: Date.now() - 3 * 3600 * 1000,
    userName: 'Алексей Смирнов',
    browser: 'Google Chrome 130.0 (Windows 11)',
    resolved: true,
  },
  {
    id: 'err_03',
    level: 'info',
    message: 'Автоматическая оптимизация кэша LocalStorage (освобождено 180 КБ)',
    source: 'storage.ts / vacuumLocalStorage()',
    stack: 'CacheInfo: pruned 12 stale calculated session snapshots',
    timestamp: Date.now() - 12 * 3600 * 1000,
    userName: 'Илья Мартынов',
    browser: 'Google Chrome 131.0 (macOS)',
    resolved: true,
  },
];

export function getSecurityIncidents(): SecurityIncident[] {
  try {
    const raw = localStorage.getItem(SECURITY_INCIDENTS_KEY);
    if (!raw) {
      localStorage.setItem(SECURITY_INCIDENTS_KEY, JSON.stringify(INITIAL_DEMO_INCIDENTS));
      return INITIAL_DEMO_INCIDENTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_DEMO_INCIDENTS;
  } catch {
    return INITIAL_DEMO_INCIDENTS;
  }
}

export function saveSecurityIncidents(incidents: SecurityIncident[]): void {
  try {
    localStorage.setItem(SECURITY_INCIDENTS_KEY, JSON.stringify(incidents));
  } catch {
    // ignore
  }
}

export function getSystemErrors(): AppSystemError[] {
  try {
    const raw = localStorage.getItem(SYSTEM_ERRORS_KEY);
    if (!raw) {
      localStorage.setItem(SYSTEM_ERRORS_KEY, JSON.stringify(INITIAL_DEMO_ERRORS));
      return INITIAL_DEMO_ERRORS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_DEMO_ERRORS;
  } catch {
    return INITIAL_DEMO_ERRORS;
  }
}

export function saveSystemErrors(errors: AppSystemError[]): void {
  try {
    localStorage.setItem(SYSTEM_ERRORS_KEY, JSON.stringify(errors));
  } catch {
    // ignore
  }
}

export function logSystemError(error: Omit<AppSystemError, 'id' | 'timestamp' | 'resolved'>): AppSystemError {
  const current = getSystemErrors();
  const newErr: AppSystemError = {
    ...error,
    id: `err_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: Date.now(),
    resolved: false,
  };
  const updated = [newErr, ...current].slice(0, 100);
  saveSystemErrors(updated);
  return newErr;
}

export function getBlockedIPs(): string[] {
  try {
    const raw = localStorage.getItem(BLOCKED_IPS_KEY);
    if (!raw) {
      const initial = ['185.220.101.42', '194.26.29.112'];
      localStorage.setItem(BLOCKED_IPS_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return ['185.220.101.42'];
  }
}

export function toggleBlockIP(ip: string): boolean {
  const blocked = getBlockedIPs();
  let updated: string[];
  let isNowBlocked: boolean;
  if (blocked.includes(ip)) {
    updated = blocked.filter((item) => item !== ip);
    isNowBlocked = false;
  } else {
    updated = [...blocked, ip];
    isNowBlocked = true;
  }
  try {
    localStorage.setItem(BLOCKED_IPS_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
  return isNowBlocked;
}

// Single authorized admin email
export const SUPER_ADMIN_EMAIL = 'imartynov04@gmail.com';

export function isUserSuperAdmin(user: { email?: string; role?: string } | null): boolean {
  if (!user || !user.email) return false;
  return user.email.trim().toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
}
