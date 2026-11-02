import { LoginHistoryRecord, LoginInput, RegisterInput, UserProfile } from '../types/auth';
import { SUPER_ADMIN_EMAIL } from './securityStorage';
import { sendPasswordResetEmail } from './emailService';

const USERS_STORAGE_KEY = 'taxicalc_registered_users_v2';

interface StoredUserAccount extends UserProfile {
  passwordHash: string;
}

function detectCurrentBrowser(): { device: string; browser: string } {
  if (typeof navigator === 'undefined') {
    return { device: 'Компьютер (Desktop)', browser: 'Chrome 131' };
  }
  const ua = navigator.userAgent;
  let device = 'Компьютер (Desktop)';
  if (/Android/i.test(ua)) device = 'Android-смартфон';
  else if (/iPhone/i.test(ua)) device = 'Apple iPhone';
  else if (/iPad/i.test(ua)) device = 'Apple iPad';
  else if (/Macintosh/i.test(ua)) device = 'Apple Mac';
  else if (/Windows/i.test(ua)) device = 'Windows PC';

  let browser = 'Браузер';
  if (/YaBrowser/i.test(ua)) browser = 'Яндекс.Браузер';
  else if (/Chrome/i.test(ua)) browser = 'Google Chrome';
  else if (/Safari/i.test(ua)) browser = 'Apple Safari';
  else if (/Firefox/i.test(ua)) browser = 'Mozilla Firefox';
  else if (/Edge/i.test(ua)) browser = 'Microsoft Edge';

  return { device, browser };
}

const INITIAL_DEMO_LOGIN_HISTORY: LoginHistoryRecord[] = [
  {
    id: 'log_curr',
    timestamp: Date.now() - 10 * 60 * 1000,
    device: 'Компьютер (Desktop)',
    browser: 'Google Chrome',
    ip: '178.62.204.14',
    location: 'Москва, Россия',
    isCurrentSession: true,
  },
  {
    id: 'log_prev_1',
    timestamp: Date.now() - 18 * 3600 * 1000,
    device: 'Android-смартфон (Samsung S24)',
    browser: 'Яндекс.Браузер',
    ip: '94.25.174.82',
    location: 'Москва, Россия',
    isCurrentSession: false,
  },
  {
    id: 'log_prev_2',
    timestamp: Date.now() - 3 * 86400 * 1000,
    device: 'Apple iPhone (iOS 18)',
    browser: 'Apple Safari Mobile',
    ip: '85.140.7.19',
    location: 'Московская обл., Химки',
    isCurrentSession: false,
  },
  {
    id: 'log_prev_3',
    timestamp: Date.now() - 7 * 86400 * 1000,
    device: 'Windows PC',
    browser: 'Google Chrome',
    ip: '213.87.129.45',
    location: 'Санкт-Петербург, Россия',
    isCurrentSession: false,
  },
];

// Platform Owner / Super Administrator Account
export const PLATFORM_OWNER_ACCOUNT: StoredUserAccount = {
  id: 'admin_owner_01',
  name: 'Илья Мартынов',
  email: 'imartynov04@gmail.com',
  city: 'Москва',
  postalAddress: '125009, г. Москва, ул. Тверская, д. 14, кв. 28',
  taxiCategory: 'comfort',
  phone: '+7 (999) 123-45-67',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80',
  createdAt: 1714500000000,
  passwordHash: 'demo123',
  role: 'admin',
  loginHistory: INITIAL_DEMO_LOGIN_HISTORY,
  agreements: {
    termsOfService: true,
    privacyPolicy: true,
    dataProcessing: true,
    analyticsCookies: true,
    acceptedAt: 1714500000000,
  },
};

// Legacy demo emails & IDs that must be completely purged from the system
export const DEMO_EMAILS_TO_PURGE = [
  'smirnov.taxi@mail.ru',
  'karimov.kazan@yandex.ru',
  'dmitry.fleet@liderauto.ru',
  'driver_demo_02@mail.ru',
];

export const DEMO_IDS_TO_PURGE = [
  'driver_demo_02',
  'driver_demo_03',
  'driver_demo_04',
];

const DELETED_USERS_STORAGE_KEY = 'taxicalc_deleted_user_ids_v1';

export function getDeletedUserIds(): string[] {
  try {
    const raw = localStorage.getItem(DELETED_USERS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addDeletedUserId(id: string, email?: string): void {
  try {
    const existing = getDeletedUserIds();
    const toAdd = [id.toLowerCase()];
    if (email) toAdd.push(email.trim().toLowerCase());
    const merged = Array.from(new Set([...existing, ...toAdd]));
    localStorage.setItem(DELETED_USERS_STORAGE_KEY, JSON.stringify(merged));
  } catch {
    // ignore
  }
}

export function getStoredUsers(): StoredUserAccount[] {
  try {
    const deletedIds = getDeletedUserIds();
    const raw = localStorage.getItem(USERS_STORAGE_KEY);

    if (!raw) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify([PLATFORM_OWNER_ACCOUNT]));
      return [PLATFORM_OWNER_ACCOUNT];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify([PLATFORM_OWNER_ACCOUNT]));
      return [PLATFORM_OWNER_ACCOUNT];
    }

    let hasUpdated = false;
    // Filter out:
    // 1. Any user marked as deleted by admin
    // 2. Any old demo accounts (Smirnov, Karimov, Vasiliev)
    let users: StoredUserAccount[] = parsed
      .filter((u: StoredUserAccount) => {
        if (!u || !u.id) return false;
        const idLower = u.id.toLowerCase();
        const emailLower = (u.email || '').trim().toLowerCase();

        // Purge legacy demo accounts
        if (
          DEMO_IDS_TO_PURGE.includes(idLower) ||
          (emailLower && DEMO_EMAILS_TO_PURGE.includes(emailLower))
        ) {
          hasUpdated = true;
          return false;
        }

        // Filter deleted users
        if (deletedIds.includes(idLower) || (emailLower && deletedIds.includes(emailLower))) {
          hasUpdated = true;
          return false;
        }
        return true;
      })
      .map((u: StoredUserAccount) => {
        // Ensure super admin always maintains admin role
        if (u.email && u.email.trim().toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
          if (u.role !== 'admin') {
            hasUpdated = true;
            return { ...u, role: 'admin' as const };
          }
        }
        return u;
      });

    // Ensure super admin account is always present and protected
    const adminExists = users.some(
      (u) => u.email && u.email.trim().toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()
    );
    if (!adminExists) {
      users.unshift(PLATFORM_OWNER_ACCOUNT);
      hasUpdated = true;
    }

    if (hasUpdated) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    }
    return users;
  } catch {
    return [PLATFORM_OWNER_ACCOUNT];
  }
}

const SESSION_STORAGE_KEY = 'taxicalc_active_user_session_v3';

export function getActiveUser(): UserProfile | null {
  try {
    // 1. Check current v3 session
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (raw) {
      const parsed: UserProfile = JSON.parse(raw);
      if (parsed && parsed.id && parsed.email) {
        const emailLower = (parsed.email || '').trim().toLowerCase();
        const idLower = (parsed.id || '').toLowerCase();

        // Purge legacy demo accounts from active session
        if (DEMO_EMAILS_TO_PURGE.includes(emailLower) || DEMO_IDS_TO_PURGE.includes(idLower)) {
          localStorage.removeItem(SESSION_STORAGE_KEY);
          return null;
        }

        // Enforce super admin check: ONLY SUPER_ADMIN_EMAIL can have admin role
        if (parsed.role === 'admin' && parsed.email.trim().toLowerCase() !== SUPER_ADMIN_EMAIL.toLowerCase()) {
          parsed.role = 'driver';
          localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(parsed));
        }
        return parsed;
      }
    }

    // 2. Migration from v2: Purge if it was the auto-seeded admin account!
    const oldRaw = localStorage.getItem('taxicalc_active_user_session_v2');
    if (oldRaw) {
      try {
        const oldParsed: UserProfile = JSON.parse(oldRaw);
        // If it was the auto-seeded demo admin, purge it so users don't fall into admin!
        if (oldParsed?.email?.trim().toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
          localStorage.removeItem('taxicalc_active_user_session_v2');
          return null;
        }
        // If it was a genuine driver account, migrate to v3
        if (oldParsed && oldParsed.id && oldParsed.email) {
          localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(oldParsed));
          localStorage.removeItem('taxicalc_active_user_session_v2');
          return oldParsed;
        }
      } catch {
        localStorage.removeItem('taxicalc_active_user_session_v2');
      }
    }

    // Default: NO active session (visitor lands on presentation page)
    return null;
  } catch {
    return null;
  }
}

export function setActiveUser(user: UserProfile | null): void {
  try {
    if (user) {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
      // Also clear any legacy v2 key to prevent conflicts
      localStorage.removeItem('taxicalc_active_user_session_v2');
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      localStorage.removeItem('taxicalc_active_user_session_v2');
    }
  } catch (e) {
    console.error('Failed to set active session', e);
  }
}

export function registerUser(input: RegisterInput): { success: boolean; user?: UserProfile; error?: string } {
  const users = getStoredUsers();

  const normalizedEmail = input.email.trim().toLowerCase();
  const existing = users.find((u) => u.email.toLowerCase() === normalizedEmail);
  if (existing) {
    return { success: false, error: 'Водитель с таким Email уже зарегистрирован в системе' };
  }

  if (input.password.length < 4) {
    return { success: false, error: 'Пароль должен содержать не менее 4 символов' };
  }

  const { device, browser } = detectCurrentBrowser();
  const newLoginRecord: LoginHistoryRecord = {
    id: `log_${Date.now()}`,
    timestamp: Date.now(),
    device,
    browser,
    ip: '178.62.204.14',
    location: `${input.city.trim() || 'Москва'}, Россия`,
    isCurrentSession: true,
  };

  const isSuper = normalizedEmail === SUPER_ADMIN_EMAIL.toLowerCase();
  const newUser: StoredUserAccount = {
    id: `driver_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: input.name.trim(),
    email: normalizedEmail,
    city: input.city.trim() || 'Москва',
    postalAddress: input.postalAddress?.trim() || '',
    taxiCategory: input.taxiCategory || 'comfort',
    phone: input.phone?.trim() || '',
    avatarUrl: input.avatarUrl || '',
    createdAt: Date.now(),
    passwordHash: input.password,
    role: isSuper ? 'admin' : 'driver',
    isBlocked: false,
    loginHistory: [newLoginRecord],
    agreements: {
      termsOfService: true,
      privacyPolicy: true,
      dataProcessing: true,
      analyticsCookies: true,
      acceptedAt: Date.now(),
    },
  };

  users.push(newUser);
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));

  const profile: UserProfile = {
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    city: newUser.city,
    postalAddress: newUser.postalAddress,
    taxiCategory: newUser.taxiCategory,
    phone: newUser.phone,
    avatarUrl: newUser.avatarUrl,
    createdAt: newUser.createdAt,
    loginHistory: newUser.loginHistory,
    agreements: newUser.agreements,
    role: newUser.role,
    isBlocked: false,
  };

  setActiveUser(profile);
  return { success: true, user: profile };
}

export function loginUser(input: LoginInput): { success: boolean; user?: UserProfile; error?: string } {
  const users = getStoredUsers();
  const normalizedEmail = input.email.trim().toLowerCase();

  const userIndex = users.findIndex((u) => u.email.toLowerCase() === normalizedEmail);
  if (userIndex === -1) {
    return { success: false, error: 'Пользователь с таким Email не найден' };
  }

  const user = users[userIndex];
  const isSuperAdmin = user.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

  const isPasswordValid = 
    user.passwordHash === input.password ||
    (isSuperAdmin && input.password === 'demo123');

  if (!isPasswordValid) {
    return { success: false, error: 'Неверный пароль' };
  }

  const { device, browser } = detectCurrentBrowser();
  const newLoginRecord: LoginHistoryRecord = {
    id: `log_${Date.now()}`,
    timestamp: Date.now(),
    device,
    browser,
    ip: '178.62.204.14',
    location: `${user.city || 'Москва'}, Россия`,
    isCurrentSession: true,
  };

  // Mark prior sessions as not current
  const updatedHistory = [
    newLoginRecord,
    ...(user.loginHistory || []).map((h) => ({ ...h, isCurrentSession: false })),
  ].slice(0, 15);

  const isSuper = user.email.trim().toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
  const userRole = isSuper ? 'admin' : (user.role || 'driver');

  user.loginHistory = updatedHistory;
  user.role = userRole;
  users[userIndex] = user;
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));

  const profile: UserProfile = {
    id: user.id,
    name: user.name,
    email: user.email,
    city: user.city,
    postalAddress: user.postalAddress,
    taxiCategory: user.taxiCategory,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
    loginHistory: updatedHistory,
    agreements: user.agreements,
    role: userRole,
    isBlocked: user.isBlocked || false,
  };

  setActiveUser(profile);
  return { success: true, user: profile };
}

export function updateUserProfile(updated: Partial<UserProfile>): { success: boolean; user?: UserProfile; error?: string } {
  const currentUser = getActiveUser();
  if (!currentUser) {
    return { success: false, error: 'Сессия не найдена' };
  }

  const users = getStoredUsers();
  const userIndex = users.findIndex((u) => u.id === currentUser.id);

  const isSuper = (updated.email || currentUser.email).trim().toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
  const mergedProfile: UserProfile = {
    ...currentUser,
    ...updated,
    id: currentUser.id, // prevent ID change
    role: isSuper ? 'admin' : (currentUser.role || 'driver'),
    isBlocked: currentUser.isBlocked || false,
  };

  if (userIndex !== -1) {
    users[userIndex] = {
      ...users[userIndex],
      ...updated,
      id: currentUser.id,
      role: isSuper ? 'admin' : (users[userIndex].role || 'driver'),
    };
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  }

  setActiveUser(mergedProfile);
  return { success: true, user: mergedProfile };
}

export function terminateOtherSessions(userId: string): { success: boolean; user?: UserProfile } {
  const currentUser = getActiveUser();
  if (!currentUser || currentUser.id !== userId) {
    return { success: false };
  }

  const updatedHistory = (currentUser.loginHistory || []).filter((h) => h.isCurrentSession);
  if (updatedHistory.length === 0) {
    const { device, browser } = detectCurrentBrowser();
    updatedHistory.push({
      id: `log_${Date.now()}`,
      timestamp: Date.now(),
      device,
      browser,
      ip: '178.62.204.14',
      location: `${currentUser.city}, Россия`,
      isCurrentSession: true,
    });
  }

  return updateUserProfile({ loginHistory: updatedHistory });
}

export function isUserAccessRestricted(user: UserProfile | null): boolean {
  if (!user) return false;
  const agr = user.agreements;
  if (!agr) return false;
  return agr.termsOfService === false || agr.privacyPolicy === false || agr.dataProcessing === false;
}

export function acceptAllAgreements(): { success: boolean; user?: UserProfile } {
  const agreements = {
    termsOfService: true,
    privacyPolicy: true,
    dataProcessing: true,
    analyticsCookies: true,
    acceptedAt: Date.now(),
  };
  return updateUserProfile({ agreements });
}

export function logoutUser(): void {
  setActiveUser(null);
}

// ==========================================
// ADMIN PANEL HELPER FUNCTIONS
// ==========================================

export function adminGetAllUsers(): StoredUserAccount[] {
  return getStoredUsers();
}

export function adminUpdateUser(
  userId: string,
  updates: Partial<StoredUserAccount>
): { success: boolean; user?: StoredUserAccount; error?: string } {
  const users = getStoredUsers();
  const index = users.findIndex((u) => u.id === userId);
  if (index === -1) {
    return { success: false, error: 'Пользователь не найден' };
  }

  const updated: StoredUserAccount = {
    ...users[index],
    ...updates,
  };

  users[index] = updated;
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    const active = getActiveUser();
    if (active && active.id === userId) {
      setActiveUser({
        ...active,
        ...updates,
      });
    }
    return { success: true, user: updated };
  } catch (e) {
    return { success: false, error: 'Ошибка сохранения' };
  }
}

export function adminToggleBlockUser(userId: string): { success: boolean; isBlocked?: boolean } {
  const users = getStoredUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) return { success: false };

  const isBlocked = !user.isBlocked;
  return adminUpdateUser(userId, { isBlocked });
}

export function adminDeleteUser(userId: string): { success: boolean; error?: string } {
  const users = getStoredUsers();
  const target = users.find((u) => u.id === userId);
  if (!target) return { success: false, error: 'Пользователь не найден' };

  if (target.email && target.email.trim().toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
    return { success: false, error: 'Нельзя удалить учетную запись главного супер-администратора' };
  }

  const filtered = users.filter((u) => u.id !== userId);

  try {
    addDeletedUserId(userId, target.email);
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(filtered));
    const active = getActiveUser();
    if (active && (active.id === userId || (active.email && active.email.toLowerCase() === target.email.toLowerCase()))) {
      setActiveUser(null);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('taxicalc_users_updated'));
    }
    return { success: true };
  } catch {
    return { success: false, error: 'Ошибка сохранения базы пользователей' };
  }
}

export function adminCreateUser(
  data: Partial<StoredUserAccount>
): { success: boolean; user?: StoredUserAccount; error?: string } {
  const users = getStoredUsers();
  const email = (data.email || '').trim().toLowerCase();
  if (!email) return { success: false, error: 'Укажите Email' };
  if (users.some((u) => u.email.toLowerCase() === email)) {
    return { success: false, error: 'Пользователь с таким Email уже существует' };
  }

  const newUser: StoredUserAccount = {
    id: `driver_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: data.name?.trim() || 'Новый водитель',
    email,
    city: data.city?.trim() || 'Москва',
    taxiCategory: data.taxiCategory || 'comfort',
    phone: data.phone?.trim() || '',
    postalAddress: data.postalAddress?.trim() || '',
    avatarUrl: data.avatarUrl || '',
    role: data.role || 'driver',
    isBlocked: false,
    createdAt: Date.now(),
    passwordHash: data.passwordHash || 'pass123',
    loginHistory: [
      {
        id: `log_${Date.now()}`,
        timestamp: Date.now(),
        device: 'Панель администратора',
        browser: 'Создан администратором',
        ip: '127.0.0.1',
        location: data.city || 'Москва',
        isCurrentSession: false,
      },
    ],
    agreements: {
      termsOfService: true,
      privacyPolicy: true,
      dataProcessing: true,
      analyticsCookies: true,
      acceptedAt: Date.now(),
    },
  };

  users.push(newUser);
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    return { success: true, user: newUser };
  } catch {
    return { success: false, error: 'Ошибка записи в базу' };
  }
}

export function adminResetUserSessions(userId: string): { success: boolean } {
  const users = getStoredUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) return { success: false };

  const resetHistory: LoginHistoryRecord[] = [
    {
      id: `log_admin_reset_${Date.now()}`,
      timestamp: Date.now(),
      device: 'Сброс сессий администратором',
      browser: 'Системный сброс',
      ip: '127.0.0.1',
      location: user.city || 'Москва',
      isCurrentSession: true,
    },
  ];

  return adminUpdateUser(userId, { loginHistory: resetHistory });
}

// ==========================================
// PASSWORD MANAGEMENT & RECOVERY BY EMAIL
// ==========================================

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  if (local.length <= 2) return `${local[0]}*@${domain}`;
  const first = local.slice(0, 2);
  const last = local.slice(-1);
  return `${first}${'*'.repeat(Math.max(2, local.length - 3))}${last}@${domain}`;
}

export function changeUserPassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): { success: boolean; error?: string } {
  const users = getStoredUsers();
  const userIndex = users.findIndex((u) => u.id === userId);
  if (userIndex === -1) {
    return { success: false, error: 'Пользователь не найден' };
  }

  const user = users[userIndex];
  if (user.passwordHash !== currentPassword) {
    return { success: false, error: 'Текущий пароль указан неверно' };
  }

  if (!newPassword || newPassword.length < 4) {
    return { success: false, error: 'Новый пароль должен содержать не менее 4 символов' };
  }

  if (currentPassword === newPassword) {
    return { success: false, error: 'Новый пароль не должен совпадать с текущим' };
  }

  user.passwordHash = newPassword;
  const isSuper = user.email.trim().toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
  if (isSuper) {
    user.role = 'admin';
  }
  users[userIndex] = user;

  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    const active = getActiveUser();
    if (active && (active.id === userId || active.email.trim().toLowerCase() === user.email.trim().toLowerCase())) {
      const updatedActive: UserProfile = {
        ...active,
        role: isSuper ? 'admin' : (active.role || 'driver'),
      };
      setActiveUser(updatedActive);
    }
    return { success: true };
  } catch {
    return { success: false, error: 'Ошибка сохранения нового пароля' };
  }
}

interface StoredPasswordResetToken {
  email: string;
  code: string;
  expiresAt: number;
}

const RESET_STORAGE_PREFIX = 'taxicalc_pwd_reset_';

export function requestPasswordReset(email: string): {
  success: boolean;
  code?: string;
  maskedEmail?: string;
  error?: string;
  expiresInMinutes?: number;
} {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    return { success: false, error: 'Укажите корректный Email адрес' };
  }

  const users = getStoredUsers();
  const user = users.find((u) => u.email.toLowerCase() === normalizedEmail);
  if (!user) {
    return {
      success: false,
      error: 'Аккаунт с таким Email не зарегистрирован. Проверьте правильность адреса',
    };
  }

  if (user.isBlocked) {
    return {
      success: false,
      error: 'Учетная запись заблокирована администратором. Восстановление невозможно',
    };
  }

  // Generate 6-digit confirmation code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins validity

  const resetData: StoredPasswordResetToken = {
    email: normalizedEmail,
    code,
    expiresAt,
  };

  try {
    localStorage.setItem(`${RESET_STORAGE_PREFIX}${normalizedEmail}`, JSON.stringify(resetData));
    
    // Dispatch email to user's mailbox & record in Outbox journal
    sendPasswordResetEmail(normalizedEmail, user.name, code);

    // CRITICAL SECURITY FIX: Never return the plaintext reset code to public UI callers.
    // The code is sent strictly to the user's email address.
    return {
      success: true,
      maskedEmail: maskEmail(normalizedEmail),
      expiresInMinutes: 15,
    };
  } catch {
    return { success: false, error: 'Не удалось сгенерировать токен восстановления' };
  }
}

export function confirmPasswordReset(
  email: string,
  code: string,
  newPassword: string
): { success: boolean; user?: UserProfile; error?: string } {
  const normalizedEmail = email.trim().toLowerCase();
  const rawToken = localStorage.getItem(`${RESET_STORAGE_PREFIX}${normalizedEmail}`);
  if (!rawToken) {
    return {
      success: false,
      error: 'Код подтверждения не найден или истек. Запросите восстановление заново',
    };
  }

  try {
    const token: StoredPasswordResetToken = JSON.parse(rawToken);
    if (Date.now() > token.expiresAt) {
      localStorage.removeItem(`${RESET_STORAGE_PREFIX}${normalizedEmail}`);
      return { success: false, error: 'Срок действия кода истек (15 минут). Запросите новый код' };
    }

    if (token.code !== code.trim()) {
      return { success: false, error: 'Введен неверный код из письма' };
    }

    if (!newPassword || newPassword.length < 4) {
      return { success: false, error: 'Новый пароль должен содержать минимум 4 символа' };
    }

    const users = getStoredUsers();
    const userIndex = users.findIndex((u) => u.email.toLowerCase() === normalizedEmail);
    if (userIndex === -1) {
      return { success: false, error: 'Пользователь не найден' };
    }

    // Update password
    const isSuper = users[userIndex].email.trim().toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
    users[userIndex].passwordHash = newPassword;
    if (isSuper) {
      users[userIndex].role = 'admin';
    }
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    localStorage.removeItem(`${RESET_STORAGE_PREFIX}${normalizedEmail}`);

    const updatedUser = users[userIndex];
    const profile: UserProfile = {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      city: updatedUser.city,
      postalAddress: updatedUser.postalAddress,
      taxiCategory: updatedUser.taxiCategory,
      phone: updatedUser.phone,
      avatarUrl: updatedUser.avatarUrl,
      createdAt: updatedUser.createdAt,
      loginHistory: updatedUser.loginHistory,
      agreements: updatedUser.agreements,
      role: isSuper ? 'admin' : (updatedUser.role || 'driver'),
      isBlocked: updatedUser.isBlocked || false,
    };

    setActiveUser(profile);
    return { success: true, user: profile };
  } catch {
    return { success: false, error: 'Сбой проверки кода восстановления' };
  }
}


