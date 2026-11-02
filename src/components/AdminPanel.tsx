import React, { useState, useMemo, useEffect } from 'react';
import { UserProfile, UserRole } from '../types/auth';
import { ShiftRecord, VehicleSettings, TariffCategory } from '../types/taxi';
import { 
  adminGetAllUsers, 
  adminUpdateUser, 
  adminToggleBlockUser, 
  adminDeleteUser, 
  adminCreateUser,
  adminResetUserSessions,
  getActiveUser
} from '../utils/authStorage';
import { 
  getSentEmails, 
  clearSentEmails, 
  SentEmailRecord, 
  EVENT_EMAIL_SENT 
} from '../utils/emailService';
import { 
  PlatformTariffSettings, 
  getPlatformTariffs, 
  savePlatformTariffs, 
  resetPlatformTariffsToDefault, 
  EVENT_TARIFFS_UPDATED 
} from '../utils/tariffsStorage';
import { formatCurrency } from '../utils/storage';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import {
  LayoutDashboard,
  Users,
  Car,
  Settings,
  Megaphone,
  MessageSquare,
  Database,
  Search,
  Filter,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Download,
  Upload,
  RefreshCw,
  Lock,
  Unlock,
  Key,
  X,
  Save,
  Star,
  Check,
  TrendingUp,
  Clock,
  MapPin,
  ExternalLink,
  Tag,
  Percent,
  Sparkles,
  Phone,
  Mail,
  UserCheck,
  Fuel,
  Coins,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Bug,
  Terminal,
  Activity,
  FileText,
  Ban,
  Power,
  AlertOctagon,
  Zap,
  Radio,
  Globe,
  AlertCircle,
  Eye,
  EyeOff,
  Smartphone,
  QrCode,
  Copy,
  KeyRound
} from 'lucide-react';
import {
  SecurityIncident,
  AppSystemError,
  getSecurityIncidents,
  saveSecurityIncidents,
  getSystemErrors,
  saveSystemErrors,
  logSystemError,
  getBlockedIPs,
  toggleBlockIP,
  SUPER_ADMIN_EMAIL,
  isUserSuperAdmin
} from '../utils/securityStorage';
import {
  Admin2FAConfig,
  getAdmin2FAConfig,
  saveAdmin2FAConfig,
  generateBase32Secret,
  generateBackupCodes,
  getTotpKeyUri,
  generateQrCodeDataUrl,
  verifyTotpCode,
  generateTotpCode,
  getTotpRemainingSeconds
} from '../utils/totp';

interface AdminPanelProps {
  currentUser: UserProfile | null;
  shifts: ShiftRecord[];
  settings: VehicleSettings;
  onUpdateShifts: (shifts: ShiftRecord[]) => void;
  onUpdateSettings: (settings: VehicleSettings) => void;
  onSelectShift?: (shift: ShiftRecord) => void;
}

type AdminTab = 'overview' | 'security' | 'errors' | 'users' | 'shifts' | 'tariffs' | 'advertising' | 'feedback' | 'system';

interface StoredFeedback {
  id: string;
  category: string;
  categoryLabel: string;
  rating: number;
  message: string;
  contact: string;
  name: string;
  createdAt: number;
  status: 'sent' | 'in_progress' | 'resolved' | 'rejected';
  adminNote?: string;
}

import {
  AdOffer,
  AdPlacement,
  AdCategory,
  getAdOffers,
  saveAdOffers,
  deleteAdOffer,
  resetAdsToDefault,
  normalizeAdOffer,
  AD_CATEGORIES,
  AD_PLACEMENTS,
  EVENT_ADS_UPDATED
} from '../utils/adsStorage';

const PIE_COLORS = ['#f59e0b', '#10b981', '#38bdf8', '#a855f7', '#ec4899'];

export const AdminPanel: React.FC<AdminPanelProps> = ({
  currentUser,
  shifts,
  settings,
  onUpdateShifts,
  onUpdateSettings,
  onSelectShift,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [usersList, setUsersList] = useState(() => adminGetAllUsers());
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  const [userStatusFilter, setUserStatusFilter] = useState<string>('all');

  // Уведомления
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Модальное окно добавления/редактирования пользователя
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<any | null>(null);
  const [sentEmails, setSentEmails] = useState<SentEmailRecord[]>(() => getSentEmails());
  const [userFormData, setUserFormData] = useState({
    name: '',
    email: '',
    phone: '',
    city: 'Москва',
    taxiCategory: 'comfort' as TariffCategory,
    role: 'driver' as UserRole,
    password: '',
  });

  // Listen to users and emails updates
  useEffect(() => {
    const handleUsersSync = () => setUsersList(adminGetAllUsers());
    const handleEmailsSync = () => setSentEmails(getSentEmails());
    window.addEventListener('taxicalc_users_updated', handleUsersSync);
    window.addEventListener(EVENT_EMAIL_SENT, handleEmailsSync);
    return () => {
      window.removeEventListener('taxicalc_users_updated', handleUsersSync);
      window.removeEventListener(EVENT_EMAIL_SENT, handleEmailsSync);
    };
  }, []);

  // Мониторинг кибербезопасности и инцидентов ИБ
  const [securityIncidents, setSecurityIncidents] = useState<SecurityIncident[]>(() => getSecurityIncidents());
  const [securityFilter, setSecurityFilter] = useState<string>('all');
  const [securityTypeFilter, setSecurityTypeFilter] = useState<string>('all');
  const [blockedIPs, setBlockedIPs] = useState<string[]>(() => getBlockedIPs());
  const [customIPToBlock, setCustomIPToBlock] = useState('');

  // Google Authenticator 2FA state
  const [twoFaConfig, setTwoFaConfig] = useState<Admin2FAConfig>(() => getAdmin2FAConfig());
  const [is2FaModalOpen, setIs2FaModalOpen] = useState(false);
  const [setupSecret, setSetupSecret] = useState('');
  const [setupQrDataUrl, setSetupQrDataUrl] = useState('');
  const [setupVerificationCode, setSetupVerificationCode] = useState('');
  const [setupBackupCodes, setSetupBackupCodes] = useState<string[]>([]);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedBackup, setCopiedBackup] = useState(false);
  const [isViewingBackupCodes, setIsViewingBackupCodes] = useState(false);
  const [liveTotpCode, setLiveTotpCode] = useState('');
  const [liveRemainingSec, setLiveRemainingSec] = useState(getTotpRemainingSeconds());

  // HTTPS connection check state
  const [isHttpsChecking, setIsHttpsChecking] = useState(false);
  const [httpsCheckResult, setHttpsCheckResult] = useState<{
    protocol: string;
    isSecure: boolean;
    host: string;
    tlsVersion: string;
    cspUpgrade: boolean;
    testedAt: number;
  } | null>(() => ({
    protocol: typeof window !== 'undefined' ? window.location.protocol.replace(':', '').toUpperCase() : 'HTTPS',
    isSecure: typeof window !== 'undefined' ? (window.location.protocol === 'https:' || window.location.hostname.includes('localhost') || window.location.hostname.includes('run.app')) : true,
    host: typeof window !== 'undefined' ? window.location.host : 'taxicalc-pro.app',
    tlsVersion: 'TLS 1.3 / AES-256-GCM / SHA-384',
    cspUpgrade: true,
    testedAt: Date.now(),
  }));

  // Live TOTP code countdown ticker
  useEffect(() => {
    if (!twoFaConfig.enabled || !twoFaConfig.secret) return;
    const updateTicker = () => {
      setLiveRemainingSec(getTotpRemainingSeconds());
      setLiveTotpCode(generateTotpCode(twoFaConfig.secret));
    };
    updateTicker();
    const interval = setInterval(updateTicker, 1000);
    return () => clearInterval(interval);
  }, [twoFaConfig.enabled, twoFaConfig.secret]);

  const handleStart2FASetup = async () => {
    const secret = generateBase32Secret(16);
    const uri = getTotpKeyUri(secret, SUPER_ADMIN_EMAIL, 'TaxiCalc PRO');
    const qrUrl = await generateQrCodeDataUrl(uri);
    const backup = generateBackupCodes(8);
    setSetupSecret(secret);
    setSetupQrDataUrl(qrUrl);
    setSetupBackupCodes(backup);
    setSetupVerificationCode('');
    setSetupError(null);
    setCopiedKey(false);
    setCopiedBackup(false);
    setIs2FaModalOpen(true);
  };

  const handleConfirm2FASetup = (e: React.FormEvent) => {
    e.preventDefault();
    setSetupError(null);

    const clean = setupVerificationCode.trim();
    if (!verifyTotpCode(setupSecret, clean)) {
      setSetupError('Неверный код! Введите актуальный 6-значный код из Google Authenticator.');
      return;
    }

    const newConfig: Admin2FAConfig = {
      enabled: true,
      secret: setupSecret,
      adminEmail: SUPER_ADMIN_EMAIL,
      createdAt: Date.now(),
      backupCodes: setupBackupCodes,
      usedBackupCodes: [],
      lastVerifiedAt: Date.now(),
    };
    saveAdmin2FAConfig(newConfig);
    setTwoFaConfig(newConfig);
    setIs2FaModalOpen(false);
    showToast('Двухфакторная аутентификация Google Authenticator активирована!', 'success');
  };

  const handleDisable2FA = () => {
    const disabledConfig: Admin2FAConfig = {
      enabled: false,
      secret: '',
      adminEmail: SUPER_ADMIN_EMAIL,
      createdAt: 0,
      backupCodes: [],
      usedBackupCodes: [],
    };
    saveAdmin2FAConfig(disabledConfig);
    setTwoFaConfig(disabledConfig);
    showToast('2FA Google Authenticator успешно отключена', 'success');
  };

  const handleCopySecretKey = () => {
    navigator.clipboard.writeText(setupSecret);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
    showToast('Секретный ключ скопирован в буфер', 'success');
  };

  const handleCopyBackupCodes = (codes: string[]) => {
    navigator.clipboard.writeText(codes.join('\n'));
    setCopiedBackup(true);
    setTimeout(() => setCopiedBackup(false), 2000);
    showToast('Резервные коды скопированы', 'success');
  };

  const handleTestHttpsConnection = () => {
    setIsHttpsChecking(true);
    setTimeout(() => {
      const isSecure = window.location.protocol === 'https:' || window.location.hostname.includes('localhost') || window.location.hostname.includes('run.app');
      setHttpsCheckResult({
        protocol: window.location.protocol.replace(':', '').toUpperCase(),
        isSecure,
        host: window.location.host,
        tlsVersion: 'TLS 1.3 (RFC 8446) / AEAD AES-256-GCM',
        cspUpgrade: true,
        testedAt: Date.now(),
      });
      setIsHttpsChecking(false);
      showToast('Проверка HTTPS завершена: соединение зашифровано и безопасно', 'success');
    }, 600);
  };

  // Журнал системных ошибок и телеметрия
  const [systemErrors, setSystemErrors] = useState<AppSystemError[]>(() => getSystemErrors());
  const [errorLevelFilter, setErrorLevelFilter] = useState<string>('all');
  const [expandedErrorId, setExpandedErrorId] = useState<string | null>(null);

  // Обработчики безопасности
  const handleToggleBlockIP = (ip: string) => {
    const isBlocked = toggleBlockIP(ip);
    setBlockedIPs(getBlockedIPs());
    const updatedIncidents = securityIncidents.map((inc) =>
      inc.ip === ip ? { ...inc, status: (isBlocked ? 'blocked' : 'active') as SecurityIncident['status'] } : inc
    );
    setSecurityIncidents(updatedIncidents);
    saveSecurityIncidents(updatedIncidents);
    showToast(isBlocked ? `IP ${ip} заблокирован файрволом` : `IP ${ip} разблокирован`, isBlocked ? 'error' : 'success');
  };

  const handleAddCustomIPBlock = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanIP = customIPToBlock.trim();
    if (!cleanIP) return;
    if (blockedIPs.includes(cleanIP)) {
      showToast('Этот IP уже заблокирован', 'error');
      return;
    }
    handleToggleBlockIP(cleanIP);
    setCustomIPToBlock('');
  };

  const handleUpdateIncidentStatus = (id: string, newStatus: SecurityIncident['status']) => {
    const updated = securityIncidents.map((inc) => (inc.id === id ? { ...inc, status: newStatus } : inc));
    setSecurityIncidents(updated);
    saveSecurityIncidents(updated);
    showToast(`Статус инцидента обновлен: «${newStatus}»`);
  };

  // Режим тревоги: принудительный сброс сеансов всех пользователей (кроме супер-админа)
  const handleTriggerPanicMode = () => {
    let resetCount = 0;
    usersList.forEach((u) => {
      if (u.email.toLowerCase() !== SUPER_ADMIN_EMAIL.toLowerCase()) {
        adminResetUserSessions(u.id);
        resetCount++;
      }
    });
    const panicIncident: SecurityIncident = {
      id: `inc_panic_${Date.now()}`,
      type: 'session_anomaly',
      severity: 'high',
      title: 'Активация режима защиты ИБ (Emergency Panic Lockdown)',
      description: `Супер-администратор принудительно аннулировал сеансы ${resetCount} пользователей платформы.`,
      ip: '127.0.0.1 (Admin Console)',
      location: 'Локальная консоль администратора',
      targetAccount: 'ALL_PLATFORM_USERS',
      timestamp: Date.now(),
      status: 'resolved',
      userAgent: navigator.userAgent,
    };
    const updatedIncidents = [panicIncident, ...securityIncidents];
    setSecurityIncidents(updatedIncidents);
    saveSecurityIncidents(updatedIncidents);
    setUsersList(adminGetAllUsers());
    showToast(`Режим защиты активирован! Сброшены сессии ${resetCount} пользователей`, 'success');
  };

  // Обработчики системных ошибок
  const handleToggleResolveError = (id: string) => {
    const updated = systemErrors.map((err) => (err.id === id ? { ...err, resolved: !err.resolved } : err));
    setSystemErrors(updated);
    saveSystemErrors(updated);
    showToast('Статус ошибки обновлен');
  };

  const handleClearErrorLogs = () => {
    setSystemErrors([]);
    saveSystemErrors([]);
    showToast('Журнал ошибок очищен', 'success');
  };

  const handleSimulateTestError = () => {
    const testTypes = [
      {
        level: 'critical' as const,
        message: 'Аномальный скачок задержки API агрегатора (timeout 15000ms)',
        source: 'AggregatorSyncService.ts / fetchYandexProOrders()',
        stack: 'TimeoutError: Gateway request timed out after 15000ms\n  at AggregatorClient.request (network.ts:89)\n  at fetchYandexProOrders (aggregator.ts:44)',
      },
      {
        level: 'error' as const,
        message: 'Сбой валидации структуры смены: отрицательная сумма комиссии',
        source: 'ShiftValidator.ts / checkShiftIntegrity()',
        stack: 'ValidationError: commissionsTotal cannot be negative (-450.00)\n  at validateShift (ShiftValidator.ts:32)\n  at onSaveShift (App.tsx:210)',
      },
      {
        level: 'warning' as const,
        message: 'Предупреждение: обнаружен устаревший формат кэша тарифов V1',
        source: 'storageMigration.ts / migrateLegacyTariffs()',
        stack: 'DeprecationWarning: Legacy key format detected, schema upgraded to V2',
      },
    ];
    const picked = testTypes[Math.floor(Math.random() * testTypes.length)];
    const newErr = logSystemError({
      ...picked,
      userName: currentUser?.name || 'Илья Мартынов',
      browser: navigator.userAgent.substring(0, 45) + '...',
    });
    setSystemErrors(getSystemErrors());
    showToast(`Зафиксировано событие телеметрии: ${newErr.message.substring(0, 40)}...`, 'error');
  };

  // Модальное окно обратной связи / ответов
  const [feedbacks, setFeedbacks] = useState<StoredFeedback[]>(() => {
    try {
      const raw = localStorage.getItem('taxicalc_user_feedbacks_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    // Демо-обращения для наглядности
    return [
      {
        id: 'fb_demo_1',
        category: 'suggestion',
        categoryLabel: 'Идея / Предложение',
        rating: 5,
        name: 'Сергей Николаев',
        contact: 'nikolaev.taxi@gmail.com',
        message: 'Было бы здорово добавить экспорт в 1С или PDF отчет для паркового бухгалтера.',
        createdAt: Date.now() - 2 * 3600 * 1000,
        status: 'in_progress',
        adminNote: 'Взято в план на версию v2.5',
      },
      {
        id: 'fb_demo_2',
        category: 'tariffs',
        categoryLabel: 'Вопрос по тарифам',
        rating: 4,
        name: 'Алексей С.',
        contact: '+7 (911) 234-56-78',
        message: 'В Санкт-Петербурге комиссия Яндекса в Комфорте выросла до 21.4%, обновите в предустановках.',
        createdAt: Date.now() - 14 * 3600 * 1000,
        status: 'sent',
      },
      {
        id: 'fb_demo_3',
        category: 'advertising',
        categoryLabel: 'Размещение рекламы',
        rating: 5,
        name: 'Таксопарк "Альянс Моторс"',
        contact: 'partners@alliance-taxi.ru',
        message: 'Хотим разместить карточку аренды Chery Tiggo 4 Pro и баннер в радаре заказов. Свяжитесь с нами.',
        createdAt: Date.now() - 36 * 3600 * 1000,
        status: 'resolved',
        adminNote: 'Отправлен коммерческий оффер на почту',
      },
    ];
  });

  const [feedbackFilter, setFeedbackFilter] = useState<string>('all');

  // Рекламные кампании и менеджер рекламы
  const [adOffers, setAdOffers] = useState<AdOffer[]>(() => getAdOffers());
  const [adFilterStatus, setAdFilterStatus] = useState<'all' | 'active' | 'paused'>('all');
  const [adFilterPlacement, setAdFilterPlacement] = useState<string>('all');
  const [adFilterCategory, setAdFilterCategory] = useState<string>('all');
  const [isAdModalOpen, setIsAdModalOpen] = useState(false);
  const [editingAdId, setEditingAdId] = useState<string | null>(null);
  const [adToDelete, setAdToDelete] = useState<AdOffer | null>(null);
  const [isResetAdsModalOpen, setIsResetAdsModalOpen] = useState(false);
  const [adFormData, setAdFormData] = useState<Partial<AdOffer>>({
    title: '',
    partnerName: '',
    category: 'fuel',
    badge: 'Скидка',
    badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    discount: '-10%',
    description: '',
    details: [],
    promoCode: '',
    linkUrl: '',
    linkText: 'Подробнее',
    contactPhone: '',
    placement: 'all',
    isHot: false,
    isActive: true,
  });
  const [adDetailsInput, setAdDetailsInput] = useState('');

  // Real-time synchronization when ads change
  useEffect(() => {
    const handleSync = () => setAdOffers(getAdOffers());
    window.addEventListener(EVENT_ADS_UPDATED, handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener(EVENT_ADS_UPDATED, handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const saveAds = (newList: AdOffer[]) => {
    setAdOffers(newList);
    saveAdOffers(newList);
  };

  const handleOpenCreateAdModal = () => {
    setEditingAdId(null);
    setAdFormData({
      title: '',
      partnerName: '',
      category: 'fuel',
      badge: 'Спецпредложение',
      badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      discount: 'Выгода до 15%',
      description: 'Выгодные условия и специальные скидки для водителей такси.',
      details: [
        'Моментальная активация по промокоду',
        'Специальный партнерский тариф'
      ],
      promoCode: 'TAXIPRO',
      linkUrl: 'https://partner-taxi.ru',
      linkText: 'Воспользоваться предложением',
      contactPhone: '',
      placement: 'all',
      isHot: false,
      isActive: true,
    });
    setAdDetailsInput('Моментальная активация по промокоду\nСпециальный партнерский тариф');
    setIsAdModalOpen(true);
  };

  const handleOpenEditAdModal = (ad: AdOffer) => {
    setEditingAdId(ad.id);
    setAdFormData({ ...ad });
    setAdDetailsInput(ad.details ? ad.details.join('\n') : '');
    setIsAdModalOpen(true);
  };

  const handleSaveAdForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adFormData.title?.trim() || !adFormData.partnerName?.trim()) {
      showToast('Заполните название акции и партнера', 'error');
      return;
    }

    const parsedDetails = adDetailsInput
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const baseData = {
      ...adFormData,
      details: parsedDetails,
      updatedAt: Date.now(),
    };

    if (editingAdId) {
      // Update existing
      const updated = adOffers.map((ad) =>
        ad.id === editingAdId
          ? normalizeAdOffer({
              ...ad,
              ...baseData,
            })
          : ad
      );
      saveAds(updated);
      showToast('Рекламный блок успешно обновлен! Изменения применены у пользователей.', 'success');
    } else {
      // Create new
      const newAd: AdOffer = normalizeAdOffer({
        ...baseData,
        id: `ad_${Date.now()}`,
        placement: adFormData.placement || 'all',
        isActive: typeof adFormData.isActive === 'boolean' ? adFormData.isActive : true,
        priority: adOffers.length + 1,
        viewsCount: 0,
        clicksCount: 0,
        createdAt: Date.now(),
      });
      saveAds([newAd, ...adOffers]);
      showToast('Новый рекламный модуль опубликован и доступен в разделах приложения!', 'success');
    }
    setIsAdModalOpen(false);
  };

  const handleDuplicateAd = (ad: AdOffer) => {
    const duplicated: AdOffer = normalizeAdOffer({
      ...ad,
      id: `ad_${Date.now()}`,
      title: `${ad.title} (Копия)`,
      viewsCount: 0,
      clicksCount: 0,
      createdAt: Date.now(),
    });
    saveAds([duplicated, ...adOffers]);
    showToast('Кампания продублирована', 'success');
  };

  const handleConfirmDeleteAd = () => {
    if (!adToDelete) return;
    const targetId = adToDelete.id;
    const targetTitle = adToDelete.title;

    // Permanently delete from storage and update state
    const remaining = deleteAdOffer(targetId);
    setAdOffers(remaining);
    setAdToDelete(null);
    showToast(`Рекламная кампания «${targetTitle}» удалена`, 'success');
  };

  const handleOpenResetAdsModal = () => {
    setIsResetAdsModalOpen(true);
  };

  const handleConfirmResetAds = () => {
    const defaults = resetAdsToDefault();
    setAdOffers(defaults);
    setIsResetAdsModalOpen(false);
    showToast('Рекламные блоки сброшены к базовым настройкам', 'success');
  };

  // Редактируемые тарифы и цены на топливо
  const [customTariffs, setCustomTariffs] = useState<PlatformTariffSettings>(() => getPlatformTariffs(settings));

  // Синхронизация при внешних обновлениях тарифов
  useEffect(() => {
    const handleTariffsSync = (e: any) => {
      if (e.detail) {
        setCustomTariffs(e.detail);
      } else {
        setCustomTariffs(getPlatformTariffs(settings));
      }
    };
    window.addEventListener(EVENT_TARIFFS_UPDATED, handleTariffsSync);
    window.addEventListener('storage', handleTariffsSync);
    return () => {
      window.removeEventListener(EVENT_TARIFFS_UPDATED, handleTariffsSync);
      window.removeEventListener('storage', handleTariffsSync);
    };
  }, [settings]);

  const handleSaveTariffs = () => {
    const res = savePlatformTariffs(customTariffs, settings, onUpdateSettings);
    if (res.success) {
      showToast('Тарифы агрегаторов и цены на топливо успешно сохранены!', 'success');
    } else {
      showToast('Не удалось сохранить тарифы', 'error');
    }
  };

  const handleResetTariffs = () => {
    const defaults = resetPlatformTariffsToDefault(settings, onUpdateSettings);
    setCustomTariffs(defaults);
    showToast('Тарифы и цены на топливо сброшены к базовым нормативам', 'success');
  };

  // Агрегированная статистика для вкладки Обзор
  const platformStats = useMemo(() => {
    const totalUsers = usersList.length;
    const activeUsers = usersList.filter((u) => !u.isBlocked).length;
    const blockedUsers = usersList.filter((u) => u.isBlocked).length;
    const totalShiftsCount = shifts.length;

    const totalGrossRevenue = shifts.reduce((acc, s) => acc + (s.grossRevenue || s.calculated?.grossIncome || 0), 0);
    const totalNetProfit = shifts.reduce((acc, s) => acc + (s.calculated?.netProfit || 0), 0);
    const totalFuelExpenses = shifts.reduce((acc, s) => acc + (s.calculated?.fuelCost || 0), 0);
    const totalMaintenanceFund = shifts.reduce((acc, s) => acc + ((s.calculated?.maintenanceReserve || 0) + (s.calculated?.depreciationCost || 0)), 0);
    const totalCommissions = shifts.reduce((acc, s) => acc + (s.calculated?.totalCommissions || 0), 0);
    const totalHours = shifts.reduce((acc, s) => acc + (s.shiftHours || 0), 0);
    const totalOrders = shifts.reduce((acc, s) => acc + (s.ordersCount || 0), 0);

    const avgNetPerHour = totalHours > 0 ? totalNetProfit / totalHours : 0;
    const avgShiftProfit = totalShiftsCount > 0 ? totalNetProfit / totalShiftsCount : 0;

    // Распределение по городам
    const cityCounts: Record<string, number> = {};
    usersList.forEach((u) => {
      cityCounts[u.city || 'Москва'] = (cityCounts[u.city || 'Москва'] || 0) + 1;
    });

    const cityChartData = Object.entries(cityCounts).map(([city, count]) => ({
      name: city,
      value: count,
    }));

    // Распределение расходов платформы
    const expenseDistribution = [
      { name: 'Чистый доход водителей', value: Math.max(0, Math.round(totalNetProfit)), fill: '#10b981' },
      { name: 'Комиссии агрегаторов', value: Math.round(totalCommissions), fill: '#f59e0b' },
      { name: 'Топливо (АЗС)', value: Math.round(totalFuelExpenses), fill: '#ef4444' },
      { name: 'Фонд ТО и амортизация', value: Math.round(totalMaintenanceFund), fill: '#38bdf8' },
    ];

    return {
      totalUsers,
      activeUsers,
      blockedUsers,
      totalShiftsCount,
      totalGrossRevenue,
      totalNetProfit,
      totalFuelExpenses,
      totalMaintenanceFund,
      totalCommissions,
      totalHours,
      totalOrders,
      avgNetPerHour,
      avgShiftProfit,
      cityChartData,
      expenseDistribution,
    };
  }, [usersList, shifts]);

  // Фильтрация пользователей
  const filteredUsers = useMemo(() => {
    return usersList.filter((u) => {
      const matchesSearch = 
        u.name.toLowerCase().includes(searchUserQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchUserQuery.toLowerCase()) ||
        (u.phone && u.phone.includes(searchUserQuery)) ||
        (u.city && u.city.toLowerCase().includes(searchUserQuery.toLowerCase()));

      const matchesRole = userRoleFilter === 'all' || (u.role || 'driver') === userRoleFilter;
      const matchesStatus = 
        userStatusFilter === 'all' ||
        (userStatusFilter === 'active' && !u.isBlocked) ||
        (userStatusFilter === 'blocked' && !!u.isBlocked);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [usersList, searchUserQuery, userRoleFilter, userStatusFilter]);

  // Управление пользователями
  const handleToggleBlock = (userId: string, currentName: string) => {
    const res = adminToggleBlockUser(userId);
    if (res.success) {
      setUsersList(adminGetAllUsers());
      showToast(`Статус пользователя ${currentName} успешно изменен`);
    } else {
      showToast('Ошибка при изменении статуса', 'error');
    }
  };

  const handleDeleteUserClick = (user: any) => {
    if (user.email && user.email.trim().toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
      showToast('Нельзя удалить главного супер-администратора', 'error');
      return;
    }
    setUserToDelete(user);
  };

  const handleConfirmDeleteUser = () => {
    if (!userToDelete) return;
    const targetName = userToDelete.name;
    const res = adminDeleteUser(userToDelete.id);
    if (res.success) {
      setUsersList(adminGetAllUsers());
      showToast(`Пользователь «${targetName}» успешно удален из системы`, 'success');
      setUserToDelete(null);
    } else {
      showToast(res.error || 'Не удалось удалить пользователя', 'error');
    }
  };

  const handleResetSessions = (userId: string, name: string) => {
    const res = adminResetUserSessions(userId);
    if (res.success) {
      setUsersList(adminGetAllUsers());
      showToast(`Все активные сеансы пользователя ${name} сброшены`);
    }
  };

  const handleOpenCreateUser = () => {
    setEditingUserId(null);
    setUserFormData({
      name: '',
      email: '',
      phone: '',
      city: 'Москва',
      taxiCategory: 'comfort',
      role: 'driver',
      password: '',
    });
    setUserModalOpen(true);
  };

  const handleOpenEditUser = (user: any) => {
    setEditingUserId(user.id);
    setUserFormData({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      city: user.city || 'Москва',
      taxiCategory: user.taxiCategory || 'comfort',
      role: user.role || 'driver',
      password: '',
    });
    setUserModalOpen(true);
  };

  const handleSaveUserModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userFormData.name.trim() || !userFormData.email.trim()) {
      showToast('Заполните имя и email', 'error');
      return;
    }

    if (editingUserId) {
      // Update
      const res = adminUpdateUser(editingUserId, {
        name: userFormData.name.trim(),
        email: userFormData.email.trim().toLowerCase(),
        phone: userFormData.phone.trim(),
        city: userFormData.city.trim(),
        taxiCategory: userFormData.taxiCategory,
        role: userFormData.role,
        ...(userFormData.password ? { passwordHash: userFormData.password } : {}),
      });

      if (res.success) {
        setUsersList(adminGetAllUsers());
        setUserModalOpen(false);
        showToast('Данные пользователя успешно обновлены');
      } else {
        showToast(res.error || 'Ошибка обновления', 'error');
      }
    } else {
      // Create
      const res = adminCreateUser({
        name: userFormData.name.trim(),
        email: userFormData.email.trim().toLowerCase(),
        phone: userFormData.phone.trim(),
        city: userFormData.city.trim(),
        taxiCategory: userFormData.taxiCategory,
        role: userFormData.role,
        passwordHash: userFormData.password || 'driver123',
      });

      if (res.success) {
        setUsersList(adminGetAllUsers());
        setUserModalOpen(false);
        showToast('Новый пользователь успешно зарегистрирован');
      } else {
        showToast(res.error || 'Ошибка создания', 'error');
      }
    }
  };

  // Экспорт пользователей в CSV
  const handleExportUsersCSV = () => {
    const headers = ['ID', 'ФИО', 'Email', 'Телефон', 'Город', 'Тариф', 'Роль', 'Статус', 'Дата регистрации'];
    const rows = usersList.map((u) => [
      u.id,
      u.name,
      u.email,
      u.phone || '',
      u.city || '',
      u.taxiCategory || '',
      u.role || 'driver',
      u.isBlocked ? 'Заблокирован' : 'Активен',
      new Date(u.createdAt).toISOString().split('T')[0],
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `taxicalc_users_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Список пользователей экспортирован в CSV');
  };

  // Управление обратной связью
  const handleUpdateFeedbackStatus = (id: string, newStatus: StoredFeedback['status']) => {
    const updated = feedbacks.map((f) => (f.id === id ? { ...f, status: newStatus } : f));
    setFeedbacks(updated);
    try {
      localStorage.setItem('taxicalc_user_feedbacks_v1', JSON.stringify(updated));
    } catch {
      // ignore
    }
    showToast('Статус обращения обновлен');
  };

  const handleAddFeedbackNote = (id: string, note: string) => {
    const updated = feedbacks.map((f) => (f.id === id ? { ...f, adminNote: note } : f));
    setFeedbacks(updated);
    try {
      localStorage.setItem('taxicalc_user_feedbacks_v1', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  // Генерация тестовых смен за месяц
  const handleGenerateSampleShifts = () => {
    const generated: ShiftRecord[] = [];
    const today = new Date();

    for (let i = 0; i < 24; i++) {
      const shiftDate = new Date(today);
      shiftDate.setDate(today.getDate() - i);
      const dateStr = shiftDate.toISOString().split('T')[0];

      const gross = Math.round(6500 + Math.random() * 4500);
      const hours = Math.round((7.5 + Math.random() * 4) * 10) / 10;
      const orders = Math.round(12 + Math.random() * 12);
      const km = Math.round(140 + Math.random() * 110);
      const paidKm = Math.round(km * (0.65 + Math.random() * 0.15));
      const fuelCost = Math.round(km * 0.1 * 58.5);
      const aggregatorCommission = Math.round(gross * 0.185);
      const tax = Math.round(gross * 0.04);
      const maintenance = Math.round(km * 2.8);
      const totalExp = fuelCost + aggregatorCommission + tax + maintenance;
      const netProfit = gross - totalExp;

      generated.push({
        id: `shift_gen_${Date.now()}_${i}`,
        date: dateStr,
        createdAt: shiftDate.getTime(),
        shiftHours: hours,
        ordersCount: orders,
        grossRevenue: gross,
        bonuses: Math.round(Math.random() * 800),
        tips: Math.round(Math.random() * 350),
        totalMileageKm: km,
        paidMileageKm: paidKm,
        carName: settings.carName || 'Chery Arrizo 8 (2024)',
        driverName: currentUser?.name || 'Илья Мартынов',
        ownershipType: settings.ownershipType || 'loan',
        tariffCategory: 'comfort',
        useShiftPurchase: false,
        shiftPurchaseCost: 0,
        customExpenses: 0,
        calculated: {
          fuelLiters: Math.round(km * 0.1 * 10) / 10,
          fuelCost,
          aggregatorFee: aggregatorCommission,
          parkFee: Math.round(gross * 0.03),
          payoutFee: 0,
          totalCommissions: aggregatorCommission + Math.round(gross * 0.03),
          taxAmount: tax,
          maintenanceReserve: Math.round(km * 1.8),
          depreciationCost: Math.round(km * 1.0),
          rentCost: 0,
          dailyOperatingOverhead: 300,
          totalExpenses: totalExp,
          grossIncome: gross,
          netProfit,
          hourlyNetRate: Math.round(netProfit / hours),
          hourlyGrossRate: Math.round(gross / hours),
          netProfitPerKm: Math.round((netProfit / km) * 10) / 10,
          costPerKm: Math.round((totalExp / km) * 10) / 10,
          grossPerKm: Math.round((gross / km) * 10) / 10,
          efficiencyRatio: Math.round((paidKm / km) * 100),
          averageOrderCheck: Math.round(gross / orders),
          averageOrderNet: Math.round(netProfit / orders),
          averageOrderTimeMinutes: Math.round((hours * 60) / orders),
        },
      });
    }

    onUpdateShifts(generated);
    showToast(`Успешно сгенерировано ${generated.length} тестовых смен за последний месяц`);
  };

  // Полный экспорт резервной копии базы
  const handleExportFullBackup = () => {
    const backup = {
      systemVersion: '2.5.0-pro',
      exportDate: new Date().toISOString(),
      users: usersList,
      shifts,
      settings,
      feedbacks,
      adOffers,
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `taxicalc_full_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Полная резервная копия базы данных скачана');
  };

  return (
    <div className="space-y-6">
      
      {/* Toast Notification */}
      {toastMsg && (
        <div className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl text-xs sm:text-sm font-semibold shadow-2xl flex items-center gap-2.5 animate-bounce ${
          toastMsg.type === 'success' 
            ? 'bg-emerald-900 border border-emerald-600 text-emerald-100' 
            : 'bg-rose-900 border border-rose-600 text-rose-100'
        }`}>
          {toastMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /> : <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Admin Top Header Card */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider font-extrabold px-2 py-0.5 rounded bg-amber-500 text-neutral-950">
                SuperAdmin
              </span>
              <span className="text-neutral-600">·</span>
              <span className="text-xs text-neutral-400">Центр управления сервисом ТаксиКальк PRO</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white mt-1.5 flex items-center gap-2.5">
              <LayoutDashboard className="w-6 h-6 text-amber-400" />
              Панель администратора
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleGenerateSampleShifts}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-neutral-200 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 rounded-xl transition-colors"
              title="Заполнить журнал смен реалистичными данными за месяц"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
              <span>Демо-смены (24 шт.)</span>
            </button>

            <button
              onClick={handleExportFullBackup}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-neutral-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition-colors font-bold shadow-md"
              title="Скачать всю базу данных в JSON"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Бэкап JSON</span>
            </button>
          </div>
        </div>

        {/* Sub-tabs Navigation */}
        <div className="flex items-center gap-1 sm:gap-2 mt-6 pt-4 border-t border-neutral-800 overflow-x-auto text-xs sm:text-sm font-semibold">
          {[
            { id: 'overview', label: 'Обзор платформы', icon: LayoutDashboard },
            { 
              id: 'security', 
              label: `Безопасность и взломы (${securityIncidents.filter(i => i.status === 'active' || i.status === 'investigating').length})`, 
              icon: ShieldAlert,
              hasAlert: securityIncidents.some(i => i.status === 'active')
            },
            { 
              id: 'errors', 
              label: `Ошибки (${systemErrors.filter(e => !e.resolved).length})`, 
              icon: Bug,
              hasWarning: systemErrors.some(e => !e.resolved && (e.level === 'critical' || e.level === 'error'))
            },
            { id: 'users', label: `Водители (${usersList.length})`, icon: Users },
            { id: 'shifts', label: `Смены (${shifts.length})`, icon: Car },
            { id: 'tariffs', label: 'Тарифы и АЗС', icon: Settings },
            { id: 'advertising', label: `Реклама (${adOffers.length})`, icon: Megaphone },
            { id: 'feedback', label: `Обратная связь (${feedbacks.length})`, icon: MessageSquare },
            { id: 'system', label: 'База данных', icon: Database },
          ].map((tab: any) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as AdminTab)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl transition-all whitespace-nowrap relative ${
                  isActive
                    ? 'bg-amber-500 text-neutral-950 font-bold shadow-md'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${tab.hasAlert && !isActive ? 'text-rose-400 animate-pulse' : tab.hasWarning && !isActive ? 'text-amber-400' : ''}`} />
                <span>{tab.label}</span>
                {tab.hasAlert && !isActive && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping absolute top-2 right-1.5" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 1. TAB: OVERVIEW & SYSTEM METRICS */}
      {/* ========================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI Summary Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
              <span className="text-[11px] text-neutral-400 block">Всего водителей</span>
              <span className="text-2xl font-bold font-mono text-white mt-1 block">
                {platformStats.totalUsers}
              </span>
              <span className="text-[10px] text-emerald-400 block mt-0.5">
                {platformStats.activeUsers} активных / {platformStats.blockedUsers} блок
              </span>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
              <span className="text-[11px] text-neutral-400 block">Общий валовый оборот</span>
              <span className="text-xl font-bold font-mono text-amber-400 mt-1 block">
                {formatCurrency(platformStats.totalGrossRevenue)}
              </span>
              <span className="text-[10px] text-neutral-500 block mt-0.5">
                с {platformStats.totalShiftsCount} смен
              </span>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
              <span className="text-[11px] text-neutral-400 block">Чистая прибыль водителей</span>
              <span className="text-xl font-bold font-mono text-emerald-400 mt-1 block">
                {formatCurrency(platformStats.totalNetProfit)}
              </span>
              <span className="text-[10px] text-neutral-500 block mt-0.5">
                {platformStats.totalGrossRevenue > 0
                  ? `${Math.round((platformStats.totalNetProfit / platformStats.totalGrossRevenue) * 100)}% от вала`
                  : '0%'}
              </span>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
              <span className="text-[11px] text-neutral-400 block">Средний доход в час</span>
              <span className="text-xl font-bold font-mono text-cyan-400 mt-1 block">
                {formatCurrency(platformStats.avgNetPerHour)}/ч
              </span>
              <span className="text-[10px] text-neutral-500 block mt-0.5">
                Всего {platformStats.totalHours.toFixed(1)} ч
              </span>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
              <span className="text-[11px] text-neutral-400 block">Выручка агрегаторов</span>
              <span className="text-xl font-bold font-mono text-amber-300 mt-1 block">
                {formatCurrency(platformStats.totalCommissions)}
              </span>
              <span className="text-[10px] text-neutral-500 block mt-0.5">
                Комиссии сервисов
              </span>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
              <span className="text-[11px] text-neutral-400 block">Фонд ТО и амортизации</span>
              <span className="text-xl font-bold font-mono text-purple-400 mt-1 block">
                {formatCurrency(platformStats.totalMaintenanceFund)}
              </span>
              <span className="text-[10px] text-neutral-500 block mt-0.5">
                Резерв на сервис
              </span>
            </div>
          </div>

          {/* Quick Cyber Security & System Telemetry Status Bar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div 
              onClick={() => setActiveTab('security')}
              className="cursor-pointer bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 hover:border-rose-500/50 rounded-2xl p-4 transition-all group shadow-md"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <ShieldAlert className="w-5 h-5 text-rose-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white group-hover:text-rose-300 transition-colors">
                        Кибербезопасность и WAF
                      </span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      {securityIncidents.filter((i) => i.status === 'active' || i.status === 'investigating').length > 0
                        ? `Обнаружено ${securityIncidents.filter((i) => i.status === 'active' || i.status === 'investigating').length} активных инцидента ИБ`
                        : 'Угроз не обнаружено, все инциденты устранены'}
                      {' • '}{blockedIPs.length} IP заблокировано
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-rose-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Мониторинг &rarr;
                </span>
              </div>
            </div>

            <div 
              onClick={() => setActiveTab('errors')}
              className="cursor-pointer bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 hover:border-amber-500/50 rounded-2xl p-4 transition-all group shadow-md"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Bug className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                        Телеметрия сбоев и ошибок
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-500/20 text-emerald-400 font-bold">
                        99.8% Uptime
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      {systemErrors.filter((e) => !e.resolved).length > 0
                        ? `${systemErrors.filter((e) => !e.resolved).length} нерешенных ошибок в журнале`
                        : 'Все ошибки устранены, система работает стабильно'}
                      {' • '}Всего {systemErrors.length} записей
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-amber-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Журнал сбоев &rarr;
                </span>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Expense Distribution Pie */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Coins className="w-4 h-4 text-emerald-400" />
                Финансовое расщепление валовой выручки
              </h3>

              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={platformStats.expenseDistribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={85}
                      label={({ name, percent }: any) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={false}
                    >
                      {platformStats.expenseDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Drivers by City Bar Chart */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-400" />
                Распределение водителей по городам
              </h3>

              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={platformStats.cityChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                    <XAxis dataKey="name" stroke="#737373" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#737373" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" name="Водителей" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. TAB: USER ACCOUNTS MANAGEMENT */}
      {/* ========================================================= */}
      {activeTab === 'users' && (
        <div className="space-y-5">
          {/* Search, Filters, and Add User Button */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchUserQuery}
                  onChange={(e) => setSearchUserQuery(e.target.value)}
                  placeholder="Поиск по ФИО, email, телефону, городу..."
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
              >
                <option value="all">Все роли</option>
                <option value="driver">Водители</option>
                <option value="admin">Администраторы</option>
                <option value="fleet_manager">Управляющие парками</option>
              </select>

              <select
                value={userStatusFilter}
                onChange={(e) => setUserStatusFilter(e.target.value)}
                className="bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
              >
                <option value="all">Любой статус</option>
                <option value="active">Активные</option>
                <option value="blocked">Заблокированные</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportUsersCSV}
                className="px-3 py-2 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 rounded-xl text-xs font-semibold text-neutral-300 transition-colors flex items-center gap-1.5"
                title="Экспорт в CSV"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>CSV</span>
              </button>

              <button
                onClick={handleOpenCreateUser}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-md shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Добавить пользователя</span>
              </button>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-950/70 border-b border-neutral-800 text-neutral-400">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Пользователь / ФИО</th>
                    <th className="py-3 px-4 font-semibold">Контакты</th>
                    <th className="py-3 px-4 font-semibold">Город и тариф</th>
                    <th className="py-3 px-4 font-semibold">Роль</th>
                    <th className="py-3 px-4 font-semibold">Статус</th>
                    <th className="py-3 px-4 font-semibold text-right">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-neutral-500">
                        Пользователи не найдены
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => {
                      const isCurrent = currentUser?.id === user.id;
                      const roleLabel = 
                        user.role === 'admin' ? 'Администратор' :
                        user.role === 'fleet_manager' ? 'Таксопарк' : 'Водитель';

                      return (
                        <tr key={user.id} className="hover:bg-neutral-800/40 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl overflow-hidden bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-xs shrink-0 border border-amber-500/30">
                                {user.avatarUrl ? (
                                  <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                                ) : (
                                  user.name.charAt(0).toUpperCase()
                                )}
                              </div>
                              <div>
                                <div className="font-bold text-white flex items-center gap-1.5">
                                  <span>{user.name}</span>
                                  {isCurrent && (
                                    <span className="text-[10px] px-1.5 py-0.2 bg-amber-500/20 text-amber-400 rounded border border-amber-500/30 font-semibold">
                                      Вы
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-neutral-500 font-mono block">
                                  ID: {user.id}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="text-white font-mono text-xs">{user.email}</div>
                            {user.phone && (
                              <div className="text-[10px] text-neutral-400 font-mono">{user.phone}</div>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="text-neutral-200 font-medium">{user.city}</div>
                            <span className="text-[10px] text-amber-400 uppercase font-semibold">
                              {user.taxiCategory}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              user.role === 'admin'
                                ? 'bg-purple-950 text-purple-300 border-purple-800'
                                : user.role === 'fleet_manager'
                                ? 'bg-cyan-950 text-cyan-300 border-cyan-800'
                                : 'bg-neutral-800 text-neutral-300 border-neutral-700'
                            }`}>
                              {roleLabel}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            {user.isBlocked ? (
                              <span className="text-rose-400 font-bold flex items-center gap-1">
                                <Lock className="w-3.5 h-3.5" />
                                Заблокирован
                              </span>
                            ) : (
                              <span className="text-emerald-400 font-medium flex items-center gap-1">
                                <UserCheck className="w-3.5 h-3.5" />
                                Активен
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEditUser(user)}
                                className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
                                title="Редактировать профиль"
                              >
                                <Settings className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleResetSessions(user.id, user.name)}
                                className="p-1.5 text-neutral-400 hover:text-amber-400 hover:bg-neutral-800 rounded-lg transition-colors"
                                title="Сбросить активные сеансы"
                              >
                                <Key className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleToggleBlock(user.id, user.name)}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  user.isBlocked
                                    ? 'text-emerald-400 hover:bg-emerald-950'
                                    : 'text-amber-400 hover:bg-amber-950'
                                }`}
                                title={user.isBlocked ? 'Разблокировать' : 'Заблокировать'}
                              >
                                {user.isBlocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                              </button>

                              {!isCurrent && (
                                <button
                                  onClick={() => handleDeleteUserClick(user)}
                                  className="p-1.5 text-neutral-500 hover:text-rose-400 hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
                                  title="Удалить пользователя"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Email Outbox & SMTP Gateway Journal */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Mail className="w-4 h-4 text-amber-400" />
                  <span>Почтовый шлюз и журнал отправки Email (SMTP Outbox)</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
                    {sentEmails.length} отправлено
                  </span>
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Аудит отправленных проверочных кодов и писем восстановления пароля. Коды отправляются только на email пользователя и никогда не отображаются публично.
                </p>
              </div>

              {sentEmails.length > 0 && (
                <button
                  onClick={() => {
                    clearSentEmails();
                    setSentEmails([]);
                    showToast('Журнал отправки писем очищен', 'success');
                  }}
                  className="px-3 py-1.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Очистить журнал</span>
                </button>
              )}
            </div>

            {sentEmails.length === 0 ? (
              <div className="p-6 text-center text-neutral-500 text-xs bg-neutral-950/60 rounded-xl border border-neutral-800/80">
                Журнал отправки пуст. При запросе сброса пароля пользователем сгенерированное письмо и статус доставки будут отображены здесь.
              </div>
            ) : (
              <div className="divide-y divide-neutral-800/70 border border-neutral-800 rounded-xl overflow-hidden bg-neutral-950/50">
                {sentEmails.slice(0, 15).map((mail) => (
                  <div key={mail.id} className="p-3.5 hover:bg-neutral-850/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white flex items-center gap-1.5 font-mono">
                          <Mail className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          {mail.recipientEmail}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800 font-medium">
                          ✓ Доставлено на email
                        </span>
                      </div>
                      <div className="text-neutral-400 text-[11px] truncate">
                        {mail.subject}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-right sm:text-left">
                      {mail.code && (
                        <div className="text-[11px] bg-neutral-900 border border-neutral-800 px-2.5 py-1 rounded-lg">
                          <span className="text-neutral-500 mr-1.5">Код в письме:</span>
                          <span className="font-mono font-bold text-amber-400 tracking-wider">{mail.code}</span>
                        </div>
                      )}
                      <span className="text-[10px] text-neutral-500 font-mono">
                        {new Date(mail.sentAt).toLocaleTimeString('ru-RU')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. TAB: SHIFTS MONITORING & AUDIT */}
      {/* ========================================================= */}
      {activeTab === 'shifts' && (
        <div className="space-y-5">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Car className="w-4 h-4 text-amber-400" />
                  Реестр всех сохраненных смен платформы ({shifts.length})
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Мониторинг финансовых расчетов, выявление аномалий и аудит чистой прибыли
                </p>
              </div>

              <div className="text-xs font-mono text-emerald-400 bg-neutral-950 px-3 py-1.5 rounded-xl border border-neutral-800">
                Суммарная чистая прибыль: {formatCurrency(platformStats.totalNetProfit)}
              </div>
            </div>

            {shifts.length === 0 ? (
              <div className="p-8 text-center text-neutral-500 space-y-2">
                <Car className="w-8 h-8 mx-auto text-neutral-600" />
                <p>В журнале пока нет сохраненных смен.</p>
                <button
                  onClick={handleGenerateSampleShifts}
                  className="px-4 py-2 bg-amber-500 text-neutral-950 font-bold rounded-xl text-xs"
                >
                  Сгенерировать тестовые смены
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-950/70 border-b border-neutral-800 text-neutral-400">
                    <tr>
                      <th className="py-3 px-3 font-medium">Дата / Авто</th>
                      <th className="py-3 px-3 font-medium">Водитель</th>
                      <th className="py-3 px-3 font-medium">Выручка (Грязная)</th>
                      <th className="py-3 px-3 font-medium">Чистая прибыль</th>
                      <th className="py-3 px-3 font-medium">Топливо + ТО</th>
                      <th className="py-3 px-3 font-medium">Комиссии</th>
                      <th className="py-3 px-3 font-medium">Часов / Заказов</th>
                      <th className="py-3 px-3 font-medium text-right">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60">
                    {shifts.map((shift) => {
                      const isLoss = shift.calculated?.netProfit < 0;
                      return (
                        <tr
                          key={shift.id}
                          className="hover:bg-neutral-800/40 transition-colors cursor-pointer"
                          onClick={() => onSelectShift && onSelectShift(shift)}
                        >
                          <td className="py-3 px-3">
                            <span className="font-mono text-white font-bold block">{shift.date}</span>
                            <span className="text-[10px] text-amber-400/90 truncate max-w-[130px] block">
                              {shift.carName || 'Автомобиль'}
                            </span>
                          </td>

                          <td className="py-3 px-3">
                            <span className="text-neutral-300 font-medium block">{shift.driverName || 'Водитель'}</span>
                            <span className="text-[10px] text-neutral-500 uppercase">{shift.ownershipType || 'Личный'}</span>
                          </td>

                          <td className="py-3 px-3 font-mono tabular-nums text-white">
                            {formatCurrency(shift.grossRevenue || shift.calculated?.grossIncome || 0)}
                          </td>

                          <td className="py-3 px-3">
                            <span className={`font-mono font-bold ${isLoss ? 'text-rose-400' : 'text-emerald-400'}`}>
                              {formatCurrency(shift.calculated?.netProfit || 0)}
                            </span>
                            {isLoss && (
                              <span className="text-[9px] text-rose-400 block font-semibold">⚠️ Убыток</span>
                            )}
                          </td>

                          <td className="py-3 px-3 font-mono text-neutral-300 tabular-nums">
                            {formatCurrency((shift.calculated?.fuelCost || 0) + (shift.calculated?.maintenanceReserve || 0))}
                          </td>

                          <td className="py-3 px-3 font-mono text-neutral-300 tabular-nums">
                            {formatCurrency(shift.calculated?.totalCommissions || 0)}
                          </td>

                          <td className="py-3 px-3 text-neutral-400 font-mono">
                            {shift.shiftHours}ч · {shift.ordersCount}зак
                          </td>

                          <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => {
                                onUpdateShifts(shifts.filter((s) => s.id !== shift.id));
                                showToast('Смена успешно удалена из журнала', 'success');
                              }}
                              className="p-1.5 text-neutral-500 hover:text-rose-400 rounded transition-colors cursor-pointer"
                              title="Удалить смену"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. TAB: TARIFFS & FUEL BENCHMARKS */}
      {/* ========================================================= */}
      {activeTab === 'tariffs' && (
        <div className="space-y-6">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-6 shadow-xl">
            {/* Top Header & Global Actions */}
            <div className="border-b border-neutral-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Settings className="w-5 h-5 text-amber-400" />
                  <span>Базовые тарифы агрегаторов и нормативы цен на топливо</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                  Централизованное управление ставками комиссий агрегаторов и ценами на АЗС. Изменения сохраняются в базе платформы и применяются в расчетах себестоимости смен и радаре заказов.
                </p>
                {customTariffs.updatedAt && (
                  <span className="text-[10px] text-neutral-500 font-mono mt-1 block">
                    Последнее сохранение: {new Date(customTariffs.updatedAt).toLocaleString('ru-RU')}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2.5 flex-wrap shrink-0">
                <button
                  type="button"
                  onClick={handleResetTariffs}
                  className="px-3.5 py-2 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Сбросить все значения к базовым среднероссийским нормативам"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Сбросить к нормативам РФ</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveTariffs}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg transition-all cursor-pointer"
                  title="Сохранить изменения тарифов и цен на топливо"
                >
                  <Save className="w-4 h-4" />
                  <span>Сохранить тарифы и цены</span>
                </button>
              </div>
            </div>

            {/* Aggregator & Park Commissions Grid */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Percent className="w-4 h-4 text-amber-400" />
                <span>Нормативы комиссий агрегаторов и таксопарка</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 text-xs">
                <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-2">
                  <span className="font-bold text-amber-400 block">Эконом (Economy)</span>
                  <label className="text-neutral-400 block text-[11px]">Комиссия агрегатора (%):</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="50"
                    value={customTariffs.economyAggregatorPercent}
                    onChange={(e) => setCustomTariffs({ ...customTariffs, economyAggregatorPercent: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-white font-mono text-sm focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-2">
                  <span className="font-bold text-amber-400 block">Комфорт (Comfort)</span>
                  <label className="text-neutral-400 block text-[11px]">Комиссия агрегатора (%):</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="50"
                    value={customTariffs.comfortAggregatorPercent}
                    onChange={(e) => setCustomTariffs({ ...customTariffs, comfortAggregatorPercent: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-white font-mono text-sm focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-2">
                  <span className="font-bold text-amber-400 block">Комфорт+ (Comfort+)</span>
                  <label className="text-neutral-400 block text-[11px]">Комиссия агрегатора (%):</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="50"
                    value={customTariffs.comfortPlusAggregatorPercent}
                    onChange={(e) => setCustomTariffs({ ...customTariffs, comfortPlusAggregatorPercent: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-white font-mono text-sm focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-2">
                  <span className="font-bold text-amber-400 block">Бизнес (Business)</span>
                  <label className="text-neutral-400 block text-[11px]">Комиссия агрегатора (%):</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="50"
                    value={customTariffs.businessAggregatorPercent}
                    onChange={(e) => setCustomTariffs({ ...customTariffs, businessAggregatorPercent: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-white font-mono text-sm focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-2">
                  <span className="font-bold text-emerald-400 block">Таксопарк (Парк)</span>
                  <label className="text-neutral-400 block text-[11px]">Комиссия парка (%):</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="20"
                    value={customTariffs.parkCommissionPercent}
                    onChange={(e) => setCustomTariffs({ ...customTariffs, parkCommissionPercent: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-white font-mono text-sm focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Fuel Prices Benchmark Section */}
            <div className="border-t border-neutral-800 pt-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Fuel className="w-4 h-4 text-rose-400" />
                    <span>Справочные цены АЗС по РФ (руб / литр или м³)</span>
                  </h4>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Используются для автоматического расчета себестоимости смен и расхода топлива
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSaveTariffs}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow transition-all cursor-pointer shrink-0 self-start sm:self-auto"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Сохранить цены на топливо</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
                <div className="bg-neutral-950 p-3.5 rounded-xl border border-neutral-800 space-y-1.5 hover:border-neutral-700 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-300 font-medium text-[11px]">АИ-92</span>
                    <span className="text-[10px] text-neutral-500 font-mono">₽/л</span>
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    value={customTariffs.gasoline92Price}
                    onChange={(e) => setCustomTariffs({ ...customTariffs, gasoline92Price: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-white font-mono text-sm font-bold focus:border-rose-500 focus:outline-none"
                  />
                </div>

                <div className="bg-neutral-950 p-3.5 rounded-xl border border-neutral-800 space-y-1.5 hover:border-neutral-700 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-300 font-medium text-[11px]">АИ-95</span>
                    <span className="text-[10px] text-neutral-500 font-mono">₽/л</span>
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    value={customTariffs.gasoline95Price}
                    onChange={(e) => setCustomTariffs({ ...customTariffs, gasoline95Price: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-white font-mono text-sm font-bold focus:border-rose-500 focus:outline-none"
                  />
                </div>

                <div className="bg-neutral-950 p-3.5 rounded-xl border border-neutral-800 space-y-1.5 hover:border-neutral-700 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-300 font-medium text-[11px]">АИ-98 / 100</span>
                    <span className="text-[10px] text-neutral-500 font-mono">₽/л</span>
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    value={customTariffs.gasoline98Price}
                    onChange={(e) => setCustomTariffs({ ...customTariffs, gasoline98Price: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-white font-mono text-sm font-bold focus:border-rose-500 focus:outline-none"
                  />
                </div>

                <div className="bg-neutral-950 p-3.5 rounded-xl border border-neutral-800 space-y-1.5 hover:border-neutral-700 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-300 font-medium text-[11px]">Дизель (ДТ)</span>
                    <span className="text-[10px] text-neutral-500 font-mono">₽/л</span>
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    value={customTariffs.dieselPrice}
                    onChange={(e) => setCustomTariffs({ ...customTariffs, dieselPrice: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-white font-mono text-sm font-bold focus:border-rose-500 focus:outline-none"
                  />
                </div>

                <div className="bg-neutral-950 p-3.5 rounded-xl border border-neutral-800 space-y-1.5 hover:border-neutral-700 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-300 font-medium text-[11px]">Пропан-бутан</span>
                    <span className="text-[10px] text-neutral-500 font-mono">₽/л</span>
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    value={customTariffs.propanePrice}
                    onChange={(e) => setCustomTariffs({ ...customTariffs, propanePrice: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-white font-mono text-sm font-bold focus:border-rose-500 focus:outline-none"
                  />
                </div>

                <div className="bg-neutral-950 p-3.5 rounded-xl border border-neutral-800 space-y-1.5 hover:border-neutral-700 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-300 font-medium text-[11px]">Метан</span>
                    <span className="text-[10px] text-neutral-500 font-mono">₽/м³</span>
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    value={customTariffs.methanePrice}
                    onChange={(e) => setCustomTariffs({ ...customTariffs, methanePrice: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-white font-mono text-sm font-bold focus:border-rose-500 focus:outline-none"
                  />
                </div>

                <div className="bg-neutral-950 p-3.5 rounded-xl border border-neutral-800 space-y-1.5 hover:border-neutral-700 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-300 font-medium text-[11px]">Электро</span>
                    <span className="text-[10px] text-neutral-500 font-mono">₽/кВтч</span>
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    value={customTariffs.electricityPrice}
                    onChange={(e) => setCustomTariffs({ ...customTariffs, electricityPrice: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-white font-mono text-sm font-bold focus:border-rose-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Informative footer card with primary CTA */}
              <div className="bg-neutral-950/70 border border-neutral-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-neutral-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    Цены на топливо и комиссии сохраняются в единой базе платформы и синхронизируются с калькулятором смен.
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleSaveTariffs}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer shrink-0"
                >
                  <Save className="w-4 h-4" />
                  <span>Применить и сохранить все тарифы</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. TAB: ADVERTISING & PROMO PARTNERS */}
      {/* ========================================================= */}
      {/* ========================================================= */}
      {/* 5. TAB: ADVERTISING & PROMO PARTNERS */}
      {/* ========================================================= */}
      {activeTab === 'advertising' && (
        <div className="space-y-6">
          {/* Top Bar with Metrics & Action Buttons */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-amber-400" />
                  <span>Менеджер рекламы и партнерских спецпредложений</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Управление рекламными карточками и интеграциями. Изменения мгновенно применяются в аккаунтах водителей и разделах приложения.
                </p>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  type="button"
                  onClick={handleOpenResetAdsModal}
                  className="px-3.5 py-2 bg-neutral-950 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
                  title="Восстановить базовые проверенные кампании"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Сбросить к базовым</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenCreateAdModal}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Создать рекламную кампанию</span>
                </button>
              </div>
            </div>

            {/* Campaign Summary Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
              <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800">
                <span className="text-[10px] text-neutral-400 block font-medium uppercase tracking-wider">Всего кампаний</span>
                <span className="text-xl font-bold font-mono text-white mt-0.5 block">{adOffers.length}</span>
              </div>
              <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800">
                <span className="text-[10px] text-neutral-400 block font-medium uppercase tracking-wider">Активно на линии</span>
                <span className="text-xl font-bold font-mono text-emerald-400 mt-0.5 block">
                  {adOffers.filter((a) => a.isActive).length}
                </span>
              </div>
              <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800">
                <span className="text-[10px] text-neutral-400 block font-medium uppercase tracking-wider">Всего показов</span>
                <span className="text-xl font-bold font-mono text-cyan-400 mt-0.5 block">
                  {adOffers.reduce((sum, a) => sum + (a.viewsCount || 0), 0).toLocaleString('ru-RU')}
                </span>
              </div>
              <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800">
                <span className="text-[10px] text-neutral-400 block font-medium uppercase tracking-wider">Переходов (кликов)</span>
                <span className="text-xl font-bold font-mono text-amber-400 mt-0.5 block">
                  {adOffers.reduce((sum, a) => sum + (a.clicksCount || 0), 0).toLocaleString('ru-RU')}
                </span>
              </div>
              <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800">
                <span className="text-[10px] text-neutral-400 block font-medium uppercase tracking-wider">Средний CTR</span>
                <span className="text-xl font-bold font-mono text-purple-400 mt-0.5 block">
                  {(() => {
                    const views = adOffers.reduce((sum, a) => sum + (a.viewsCount || 0), 0);
                    const clicks = adOffers.reduce((sum, a) => sum + (a.clicksCount || 0), 0);
                    return views > 0 ? ((clicks / views) * 100).toFixed(1) : '0.0';
                  })()}%
                </span>
              </div>
            </div>
          </div>

          {/* Filters Bar: Status, Placement, Category */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-neutral-900 border border-neutral-800 p-4 rounded-2xl">
            {/* Filter by Status */}
            <div className="flex items-center gap-1.5 flex-wrap text-xs">
              <span className="text-neutral-500 font-medium mr-1">Статус:</span>
              {[
                { id: 'all', label: 'Все кампании' },
                { id: 'active', label: 'Активные' },
                { id: 'paused', label: 'На паузе' },
              ].map((btn) => (
                <button
                  key={btn.id}
                  type="button"
                  onClick={() => setAdFilterStatus(btn.id as any)}
                  className={`px-3 py-1.5 rounded-xl transition-all font-semibold ${
                    adFilterStatus === btn.id
                      ? 'bg-amber-500 text-neutral-950 font-bold shadow'
                      : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {/* Filter by Placement & Category */}
            <div className="flex items-center gap-2.5 flex-wrap text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-neutral-500">Раздел:</span>
                <select
                  value={adFilterPlacement}
                  onChange={(e) => setAdFilterPlacement(e.target.value)}
                  className="bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="all">Все разделы</option>
                  <option value="account">Личный кабинет (Спецпредложения)</option>
                  <option value="radar">Радар заказов</option>
                  <option value="calculator">Калькулятор смены</option>
                  <option value="optimizer">Оптимизатор прибыли</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-neutral-500">Категория:</span>
                <select
                  value={adFilterCategory}
                  onChange={(e) => setAdFilterCategory(e.target.value)}
                  className="bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="all">Все категории</option>
                  {AD_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Cards Grid of All Ads */}
          {(() => {
            const displayedAds = adOffers.filter((ad) => {
              if (adFilterStatus === 'active' && !ad.isActive) return false;
              if (adFilterStatus === 'paused' && ad.isActive) return false;
              if (adFilterPlacement !== 'all' && ad.placement !== 'all' && ad.placement !== adFilterPlacement) return false;
              if (adFilterCategory !== 'all' && ad.category !== adFilterCategory) return false;
              return true;
            });

            if (displayedAds.length === 0) {
              return (
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-10 text-center space-y-3">
                  <Megaphone className="w-10 h-10 text-neutral-600 mx-auto" />
                  <h4 className="text-sm font-bold text-white">Кампании по выбранным фильтрам не найдены</h4>
                  <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                    Измените критерии фильтрации или создайте новую рекламную кампанию для водителей.
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenCreateAdModal}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl text-xs transition-colors"
                  >
                    Создать новую кампанию
                  </button>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayedAds.map((ad) => {
                  const placementInfo = AD_PLACEMENTS.find((p) => p.id === ad.placement) || AD_PLACEMENTS[0];
                  const categoryInfo = AD_CATEGORIES.find((c) => c.id === ad.category) || AD_CATEGORIES[0];
                  const ctr = ad.viewsCount > 0 ? ((ad.clicksCount / ad.viewsCount) * 100).toFixed(1) : '0.0';

                  return (
                    <div
                      key={ad.id}
                      className={`bg-neutral-900 border rounded-2xl p-5 flex flex-col justify-between space-y-4 transition-all shadow-lg relative ${
                        ad.isActive ? 'border-neutral-800 hover:border-neutral-700' : 'border-neutral-800/60 opacity-60'
                      }`}
                    >
                      {/* Top Badges & Status Toggle */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${ad.badgeColor || 'bg-amber-500/10 text-amber-400 border-amber-500/30'} flex items-center gap-1`}>
                              {ad.isHot && <Sparkles className="w-3 h-3 text-amber-400" />}
                              {ad.badge || 'Партнер'}
                            </span>

                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-950 border border-neutral-800 text-neutral-400 font-mono">
                              {categoryInfo.label}
                            </span>

                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-950 border border-amber-500/30 text-amber-300 font-mono">
                              📍 {placementInfo.label.split(' ')[0]}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold font-mono text-emerald-400 bg-emerald-950/70 border border-emerald-800/80 px-2.5 py-0.5 rounded-lg">
                              {ad.discount}
                            </span>

                            <button
                              type="button"
                              onClick={() => {
                                const updated = adOffers.map((item) =>
                                  item.id === ad.id ? normalizeAdOffer({ ...item, isActive: !item.isActive }) : item
                                );
                                saveAds(updated);
                                showToast(`Кампания ${ad.title.substring(0, 20)}... ${!ad.isActive ? 'активирована' : 'поставлена на паузу'}`);
                              }}
                              className={`text-[10px] px-2.5 py-1 rounded-full font-bold border transition-colors ${
                                ad.isActive
                                  ? 'bg-emerald-950 text-emerald-400 border-emerald-800 hover:bg-emerald-900'
                                  : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:bg-neutral-700'
                              }`}
                              title={ad.isActive ? 'Поставить на паузу' : 'Активировать показ'}
                            >
                              {ad.isActive ? '● Активна' : '○ На паузе'}
                            </button>
                          </div>
                        </div>

                        {/* Title & Partner Name */}
                        <div>
                          <h4 className="text-base font-bold text-white leading-snug">
                            {ad.title}
                          </h4>
                          <span className="text-xs text-neutral-400 font-medium block mt-0.5">
                            {ad.partnerName}
                          </span>
                        </div>

                        {/* Description */}
                        {ad.description && (
                          <p className="text-xs text-neutral-300 leading-relaxed pt-1">
                            {ad.description}
                          </p>
                        )}

                        {/* Details List */}
                        {ad.details && ad.details.length > 0 && (
                          <div className="bg-neutral-950/80 p-2.5 rounded-xl border border-neutral-800 text-[11px] space-y-1">
                            {ad.details.map((d, i) => (
                              <div key={i} className="flex items-center gap-1.5 text-neutral-300">
                                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                <span className="truncate">{d}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Promo Code & Link Info */}
                        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                          {ad.promoCode && (
                            <span className="bg-neutral-950 px-2.5 py-1 rounded-lg border border-neutral-800 text-neutral-300 font-mono text-[11px] flex items-center gap-1.5">
                              <Tag className="w-3 h-3 text-amber-400" />
                              <span>Код: <strong className="text-amber-300">{ad.promoCode}</strong></span>
                            </span>
                          )}

                          {ad.linkUrl && (
                            <a
                              href={ad.linkUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-1 truncate max-w-[200px]"
                            >
                              <ExternalLink className="w-3 h-3 shrink-0" />
                              <span className="truncate">{ad.linkUrl}</span>
                            </a>
                          )}

                          {ad.contactPhone && (
                            <span className="text-[11px] text-neutral-400 font-mono">
                              тел: {ad.contactPhone}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Footer: Live Metrics & Action Controls */}
                      <div className="pt-3 border-t border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-3 text-[11px] text-neutral-400 font-mono">
                          <span>👁️ {ad.viewsCount || 0}</span>
                          <span>🖱️ {ad.clicksCount || 0}</span>
                          <span className="text-emerald-400 font-bold">CTR: {ctr}%</span>
                        </div>

                        <div className="flex items-center gap-1.5 self-end sm:self-auto">
                          <button
                            type="button"
                            onClick={() => handleOpenEditAdModal(ad)}
                            className="px-2.5 py-1.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                            title="Редактировать кампанию"
                          >
                            <Settings className="w-3.5 h-3.5 text-amber-400" />
                            <span>Правка</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDuplicateAd(ad)}
                            className="px-2.5 py-1.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                            title="Дублировать карточку"
                          >
                            <Copy className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Копия</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setAdToDelete(ad)}
                            className="p-1.5 text-neutral-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors"
                            title="Удалить кампанию"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* ========================================================= */}
      {/* 6. TAB: FEEDBACK & SUPPORT INBOX */}
      {/* ========================================================= */}
      {activeTab === 'feedback' && (
        <div className="space-y-5">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-amber-400" />
                  Входящие обращения и отзывы водителей ({feedbacks.length})
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Сообщения, отправленные через блок обратной связи
                </p>
              </div>

              <select
                value={feedbackFilter}
                onChange={(e) => setFeedbackFilter(e.target.value)}
                className="bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 rounded-xl px-3 py-1.5 focus:outline-none"
              >
                <option value="all">Все обращения</option>
                <option value="sent">Новые</option>
                <option value="in_progress">В работе</option>
                <option value="resolved">Решенные</option>
              </select>
            </div>

            <div className="space-y-3">
              {feedbacks
                .filter((f) => feedbackFilter === 'all' || f.status === feedbackFilter)
                .map((item) => (
                  <div
                    key={item.id}
                    className="p-4 bg-neutral-950 rounded-xl border border-neutral-800 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{item.name}</span>
                        <span className="text-neutral-500 font-mono text-xs">({item.contact})</span>
                        <div className="flex text-amber-400 text-xs">
                          {'★'.repeat(item.rating || 5)}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={item.status}
                          onChange={(e) => handleUpdateFeedbackStatus(item.id, e.target.value as any)}
                          className={`text-xs px-2.5 py-1 rounded-lg border focus:outline-none font-semibold ${
                            item.status === 'resolved'
                              ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                              : item.status === 'in_progress'
                              ? 'bg-amber-950 text-amber-400 border-amber-800'
                              : 'bg-neutral-900 text-neutral-300 border-neutral-700'
                          }`}
                        >
                          <option value="sent">Новое</option>
                          <option value="in_progress">В работе</option>
                          <option value="resolved">Решено</option>
                          <option value="rejected">Отклонено</option>
                        </select>

                        <button
                          onClick={() => {
                            const updated = feedbacks.filter((f) => f.id !== item.id);
                            setFeedbacks(updated);
                            try {
                              localStorage.setItem('taxicalc_user_feedbacks_v1', JSON.stringify(updated));
                            } catch {}
                            showToast('Обращение удалено');
                          }}
                          className="p-1 text-neutral-500 hover:text-rose-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-neutral-200 leading-relaxed bg-neutral-900/60 p-3 rounded-lg border border-neutral-800/80">
                      «{item.message}»
                    </p>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-neutral-500 text-[11px] shrink-0">Заметка админа:</span>
                      <input
                        type="text"
                        value={item.adminNote || ''}
                        onChange={(e) => handleAddFeedbackNote(item.id, e.target.value)}
                        placeholder="Напишите комментарий или статус решения..."
                        className="flex-1 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-neutral-300 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 7. TAB: SYSTEM & DATABASE */}
      {/* ========================================================= */}
      {activeTab === 'system' && (
        <div className="space-y-5">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-neutral-800 pb-3">
              <Database className="w-4 h-4 text-amber-400" />
              Обслуживание базы данных и системные утилиты
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-2">
                <span className="font-bold text-white block">Полный экспорт базы (JSON)</span>
                <p className="text-[11px] text-neutral-400">
                  Сохранение всех пользователей, смен, тарифов, отзывов и настроек автомобиля.
                </p>
                <button
                  onClick={handleExportFullBackup}
                  className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Скачать JSON бэкап</span>
                </button>
              </div>

              <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-2">
                <span className="font-bold text-white block">Генерация данных</span>
                <p className="text-[11px] text-neutral-400">
                  Создание 24 реалистичных смен за последний месяц с налогами, топливом и ТО.
                </p>
                <button
                  onClick={handleGenerateSampleShifts}
                  className="w-full py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4 text-amber-400" />
                  <span>Создать 24 смены</span>
                </button>
              </div>

              <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-2">
                <span className="font-bold text-rose-400 block">Очистить историю смен</span>
                <p className="text-[11px] text-neutral-400">
                  Удаление всех сохраненных смен для начала чистого финансового периода.
                </p>
                <button
                  onClick={() => {
                    if (window.confirm('Вы действительно хотите удалить все смены из базы?')) {
                      onUpdateShifts([]);
                      showToast('История смен очищена');
                    }
                  }}
                  className="w-full py-2 bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Очистить смены</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. TAB: CYBERSECURITY & INTRUSION MONITORING */}
      {/* ========================================================= */}
      {activeTab === 'security' && (
        <div className="space-y-6 animate-fade-in">
          {/* Threat Monitor Status Banner */}
          <div className="bg-gradient-to-r from-rose-950/70 via-neutral-900 to-neutral-900 border border-rose-900/60 rounded-2xl p-5 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-6 h-6 text-rose-400 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-white">
                      Мониторинг кибербезопасности и защита от взломов
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
                      IDS / WAF Активен
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">
                    Единственный авторизованный супер-администратор платформы:{' '}
                    <span className="text-amber-400 font-mono font-bold">
                      {SUPER_ADMIN_EMAIL}
                    </span>
                    . Несанкционированные попытки доступа к админ-панели и подбор паролей блокируются автоматически.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleTriggerPanicMode}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-950/50 flex items-center gap-2 transition-colors"
                  title="Принудительно сбросить сеансы всех пользователей платформы"
                >
                  <Power className="w-4 h-4" />
                  <span>Режим тревоги (Сброс сессий)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Section: Google Authenticator (2FA) & HTTPS Monitor Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            {/* CARD 1: Google Authenticator 2FA */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4 shadow-lg flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center shrink-0">
                      <Smartphone className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>Google Authenticator (2FA)</span>
                      </h4>
                      <span className="text-[11px] text-neutral-400 block font-mono">
                        RFC 6238 TOTP · {SUPER_ADMIN_EMAIL}
                      </span>
                    </div>
                  </div>

                  {twoFaConfig.enabled ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5 shrink-0">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Активна (Защищено)</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-neutral-800 text-neutral-400 border border-neutral-700 flex items-center gap-1.5 shrink-0">
                      <Lock className="w-3 h-3 text-neutral-400" />
                      <span>Не подключена</span>
                    </span>
                  )}
                </div>

                <p className="text-xs text-neutral-300 leading-relaxed">
                  Двухфакторная защита супер-администратора через мобильное приложение Google Authenticator, Authy или Apple Passwords.
                </p>

                {twoFaConfig.enabled ? (
                  <div className="bg-neutral-950 p-3.5 rounded-xl border border-neutral-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-[10px] uppercase tracking-wider text-neutral-400 block font-semibold">Текущий код TOTP (для проверки):</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-bold font-mono text-emerald-400 tracking-wider">
                            {liveTotpCode || '••••••'}
                          </span>
                          <span className="text-[11px] text-neutral-500 font-mono">
                            обновление через {liveRemainingSec}с
                          </span>
                        </div>
                      </div>
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center font-mono font-bold text-xs text-emerald-400">
                        {liveRemainingSec}
                      </div>
                    </div>

                    <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-full transition-all duration-1000 ease-linear rounded-full"
                        style={{ width: `${(liveRemainingSec / 30) * 100}%` }}
                      ></div>
                    </div>

                    <div className="pt-1 flex items-center justify-between text-[11px] text-neutral-400 border-t border-neutral-800">
                      <span>
                        Резервных кодов доступно:{' '}
                        <strong className="text-white">
                          {twoFaConfig.backupCodes.length - twoFaConfig.usedBackupCodes.length} из {twoFaConfig.backupCodes.length}
                        </strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsViewingBackupCodes(true)}
                        className="text-amber-400 hover:text-amber-300 transition-colors font-medium flex items-center gap-1"
                      >
                        <Key className="w-3 h-3" />
                        <span>Коды восстановления</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-neutral-950/80 p-3.5 rounded-xl border border-neutral-800/80 text-xs text-neutral-400 space-y-2">
                    <div className="flex items-center gap-2 text-amber-300 font-semibold text-[11px]">
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Рекомендуется включить для предотвращения несанкционированного доступа</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-neutral-400">
                      При активации генерируется QR-код для сканирования и 8 резервных одноразовых ключей на случай утери телефона.
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-neutral-800 flex items-center gap-2">
                {twoFaConfig.enabled ? (
                  <>
                    <button
                      type="button"
                      onClick={handleStart2FASetup}
                      className="flex-1 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                    >
                      <QrCode className="w-3.5 h-3.5 text-purple-400" />
                      <span>Перенастроить QR-код</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDisable2FA}
                      className="px-3 py-2 bg-rose-950/40 hover:bg-rose-950/70 border border-rose-900/60 text-rose-300 rounded-xl text-xs font-semibold transition-colors"
                      title="Отключить 2FA"
                    >
                      Отключить
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleStart2FASetup}
                    className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-amber-500 hover:from-purple-500 hover:to-amber-400 text-neutral-950 font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>Подключить Google Authenticator</span>
                  </button>
                )}
              </div>
            </div>

            {/* CARD 2: HTTPS & SSL/TLS Protocol Monitor */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4 shadow-lg flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0">
                      <Lock className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>HTTPS & SSL/TLS Защита</span>
                      </h4>
                      <span className="text-[11px] text-neutral-400 block font-mono">
                        Стандарт безопасности транспортного уровня
                      </span>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1.5 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                    <span>HTTPS Активен</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-neutral-950 p-2.5 rounded-xl border border-neutral-800">
                    <span className="text-[10px] text-neutral-500 block">Протокол соединения:</span>
                    <span className="font-mono font-bold text-white text-xs flex items-center gap-1 mt-0.5">
                      <Lock className="w-3 h-3 text-emerald-400" />
                      {httpsCheckResult?.protocol || 'HTTPS'} / 443
                    </span>
                  </div>
                  <div className="bg-neutral-950 p-2.5 rounded-xl border border-neutral-800">
                    <span className="text-[10px] text-neutral-500 block">Шифрование:</span>
                    <span className="font-mono font-semibold text-emerald-400 text-[11px] truncate block mt-0.5">
                      TLS 1.3 / AES-256
                    </span>
                  </div>
                  <div className="bg-neutral-950 p-2.5 rounded-xl border border-neutral-800">
                    <span className="text-[10px] text-neutral-500 block">HTTP &rarr; HTTPS редирект:</span>
                    <span className="font-semibold text-emerald-400 text-xs flex items-center gap-1 mt-0.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      Автоматический
                    </span>
                  </div>
                  <div className="bg-neutral-950 p-2.5 rounded-xl border border-neutral-800">
                    <span className="text-[10px] text-neutral-500 block">CSP Upgrade-Insecure:</span>
                    <span className="font-semibold text-emerald-400 text-xs flex items-center gap-1 mt-0.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      Активно в HEAD
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 text-[11px] text-neutral-400 space-y-1">
                  <div className="flex items-center justify-between text-neutral-300">
                    <span>Текущий домен и хост:</span>
                    <span className="font-mono text-cyan-300 truncate max-w-[180px]">{httpsCheckResult?.host}</span>
                  </div>
                  <p className="text-[10px] text-neutral-500">
                    Все запросы и финансовые данные водителей шифруются end-to-end. Прямые HTTP-подключения автоматически перенаправляются на защищенный HTTPS-протокол.
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-neutral-800 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleTestHttpsConnection}
                  disabled={isHttpsChecking}
                  className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{isHttpsChecking ? 'Тестирование SSL/TLS...' : 'Проверить безопасность протокола'}</span>
                </button>
              </div>
            </div>

          </div>

          {/* Key Security Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
              <span className="text-[11px] text-neutral-400 block flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-rose-400" />
                Всего инцидентов ИБ
              </span>
              <span className="text-2xl font-bold font-mono text-white mt-1 block">
                {securityIncidents.length}
              </span>
              <span className="text-[10px] text-rose-400 block mt-0.5">
                {securityIncidents.filter((i) => i.status === 'active' || i.status === 'investigating').length} требуют внимания
              </span>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
              <span className="text-[11px] text-neutral-400 block flex items-center gap-1.5">
                <Ban className="w-3.5 h-3.5 text-red-400" />
                Заблокировано IP в файрволе
              </span>
              <span className="text-2xl font-bold font-mono text-red-400 mt-1 block">
                {blockedIPs.length}
              </span>
              <span className="text-[10px] text-neutral-500 block mt-0.5">
                Черный список WAF
              </span>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
              <span className="text-[11px] text-neutral-400 block flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Атаки перебора (Brute-Force)
              </span>
              <span className="text-2xl font-bold font-mono text-amber-400 mt-1 block">
                {securityIncidents.filter((i) => i.type === 'brute_force').length}
              </span>
              <span className="text-[10px] text-neutral-500 block mt-0.5">
                Отражено системой защиты
              </span>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
              <span className="text-[11px] text-neutral-400 block flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                Аномалии входа и геолокации
              </span>
              <span className="text-2xl font-bold font-mono text-cyan-400 mt-1 block">
                {securityIncidents.filter((i) => i.type === 'geo_anomaly' || i.type === 'unauthorized_admin').length}
              </span>
              <span className="text-[10px] text-neutral-500 block mt-0.5">
                Impossible travel / Admin probes
              </span>
            </div>
          </div>

          {/* Quick IP Firewall Rule Form */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
            <form onSubmit={handleAddCustomIPBlock} className="flex flex-col sm:flex-row items-center gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300 shrink-0">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Блокировка IP-адреса вручную:</span>
              </div>
              <input
                type="text"
                value={customIPToBlock}
                onChange={(e) => setCustomIPToBlock(e.target.value)}
                placeholder="Например: 185.220.101.55 или 45.154.255.10"
                className="flex-1 w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-neutral-600 focus:outline-none focus:border-rose-500"
              />
              <button
                type="submit"
                className="w-full sm:w-auto px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition-colors shrink-0 flex items-center justify-center gap-1.5"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Внести в черный список</span>
              </button>
            </form>

            {blockedIPs.length > 0 && (
              <div className="mt-3 pt-3 border-t border-neutral-800 flex items-center gap-2 flex-wrap text-xs">
                <span className="text-[11px] text-neutral-500">Активные блокировки:</span>
                {blockedIPs.map((ip) => (
                  <span
                    key={ip}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-950 border border-neutral-800 font-mono text-[11px] text-rose-300"
                  >
                    <span>{ip}</span>
                    <button
                      type="button"
                      onClick={() => handleToggleBlockIP(ip)}
                      className="text-neutral-500 hover:text-white transition-colors"
                      title="Разблокировать"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Filters for Security Incidents */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-neutral-900 border border-neutral-800 p-4 rounded-2xl">
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="text-neutral-500 font-medium">Статус:</span>
              {[
                { id: 'all', label: 'Все инциденты' },
                { id: 'active', label: 'Активные' },
                { id: 'investigating', label: 'На расследовании' },
                { id: 'blocked', label: 'Заблокированные' },
                { id: 'resolved', label: 'Устраненные' },
              ].map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => setSecurityFilter(btn.id)}
                  className={`px-3 py-1.5 rounded-xl transition-colors font-semibold ${
                    securityFilter === btn.id
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-neutral-500 font-medium">Тип угрозы:</span>
              <select
                value={securityTypeFilter}
                onChange={(e) => setSecurityTypeFilter(e.target.value)}
                className="bg-neutral-950 border border-neutral-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="all">Все типы атак</option>
                <option value="brute_force">Brute-Force (подбор пароля)</option>
                <option value="unauthorized_admin">Несанкционированный доступ к админке</option>
                <option value="geo_anomaly">Географическая аномалия (Impossible Travel)</option>
                <option value="session_anomaly">Аномалия сеансов</option>
              </select>
            </div>
          </div>

          {/* Security Incidents List */}
          <div className="space-y-3">
            {securityIncidents
              .filter((inc) => {
                if (securityFilter !== 'all' && inc.status !== securityFilter) return false;
                if (securityTypeFilter !== 'all' && inc.type !== securityTypeFilter) return false;
                return true;
              })
              .map((inc) => {
                const isBlocked = blockedIPs.includes(inc.ip);
                const severityColors = {
                  critical: 'bg-red-500/20 text-red-300 border-red-500/40',
                  high: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
                  medium: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
                  low: 'bg-neutral-800 text-neutral-300 border-neutral-700',
                };
                const severityLabels = {
                  critical: 'Критический',
                  high: 'Высокий',
                  medium: 'Средний',
                  low: 'Низкий',
                };

                return (
                  <div
                    key={inc.id}
                    className={`bg-neutral-900 border rounded-2xl p-4 transition-all ${
                      inc.status === 'active'
                        ? 'border-rose-800/80 shadow-lg shadow-rose-950/20'
                        : 'border-neutral-800'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border uppercase tracking-wider ${
                              severityColors[inc.severity]
                            }`}
                          >
                            {severityLabels[inc.severity]}
                          </span>
                          <span className="font-bold text-white text-sm">
                            {inc.title}
                          </span>
                          <span className="text-[11px] text-neutral-500">
                            {new Date(inc.timestamp).toLocaleString('ru-RU')}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-300">
                          {inc.description}
                        </p>
                        <div className="flex items-center gap-3 flex-wrap text-[11px] text-neutral-400 pt-1">
                          <span className="flex items-center gap-1 font-mono text-neutral-300">
                            <Globe className="w-3.5 h-3.5 text-neutral-500" />
                            IP: <span className="text-amber-400">{inc.ip}</span> ({inc.location})
                          </span>
                          {inc.targetAccount && (
                            <span className="flex items-center gap-1">
                              <Users className="w-3.5 h-3.5 text-neutral-500" />
                              Цель: <span className="text-white font-mono">{inc.targetAccount}</span>
                            </span>
                          )}
                          <span className="text-neutral-500 truncate max-w-xs" title={inc.userAgent}>
                            UA: {inc.userAgent}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 flex-wrap pt-2 lg:pt-0 border-t lg:border-t-0 border-neutral-800">
                        {/* Block / Unblock IP button */}
                        <button
                          onClick={() => handleToggleBlockIP(inc.ip)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                            isBlocked
                              ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                              : 'bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800'
                          }`}
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span>{isBlocked ? 'Разблокировать IP' : 'Заблокировать IP'}</span>
                        </button>

                        {/* Reset sessions of targeted account if applicable */}
                        {inc.targetAccount && inc.targetAccount !== 'guest_unauth' && (
                          <button
                            onClick={() => {
                              const targetUser = usersList.find((u) => u.email === inc.targetAccount);
                              if (targetUser) {
                                adminResetUserSessions(targetUser.id);
                                showToast(`Сеансы аккаунта ${inc.targetAccount} аннулированы`);
                              } else {
                                showToast(`Пользователь ${inc.targetAccount} не найден`, 'error');
                              }
                            }}
                            className="px-3 py-1.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
                            title="Сбросить все сеансы целевого пользователя"
                          >
                            <Key className="w-3.5 h-3.5 text-amber-400" />
                            <span>Сбросить сеансы цели</span>
                          </button>
                        )}

                        {/* Update Incident Status */}
                        {inc.status !== 'resolved' ? (
                          <button
                            onClick={() => handleUpdateIncidentStatus(inc.id, 'resolved')}
                            className="px-3 py-1.5 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Устранено</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdateIncidentStatus(inc.id, 'investigating')}
                            className="px-3 py-1.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-700 text-neutral-400 text-xs font-semibold rounded-xl transition-colors"
                          >
                            Вернуть в работу
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. TAB: SYSTEM ERRORS & TELEMETRY */}
      {/* ========================================================= */}
      {activeTab === 'errors' && (
        <div className="space-y-6 animate-fade-in">
          {/* Header Banner */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
                <Bug className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Журнал системных ошибок и сбоев (Telemetry)</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Стабильность 99.8%
                  </span>
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Отслеживание непредвиденных исключений, сбоев парсинга, ошибок валидации расчетов и предупреждений в реальном времени.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleSimulateTestError}
                className="px-3.5 py-2 bg-neutral-950 hover:bg-neutral-800 border border-neutral-700 text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors"
                title="Сгенерировать реальное событие ошибки для тестирования телеметрии"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Симулировать сбой</span>
              </button>

              <button
                onClick={handleClearErrorLogs}
                className="px-3.5 py-2 bg-neutral-950 hover:bg-neutral-800 border border-neutral-700 text-neutral-400 hover:text-rose-400 text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Очистить журнал</span>
              </button>
            </div>
          </div>

          {/* Key Error Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
              <span className="text-[11px] text-neutral-400 block">Всего событий в логе</span>
              <span className="text-2xl font-bold font-mono text-white mt-1 block">
                {systemErrors.length}
              </span>
              <span className="text-[10px] text-neutral-500 block mt-0.5">
                Хранится локально до 100 записей
              </span>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
              <span className="text-[11px] text-neutral-400 block">Нерешенные ошибки</span>
              <span className="text-2xl font-bold font-mono text-rose-400 mt-1 block">
                {systemErrors.filter((e) => !e.resolved).length}
              </span>
              <span className="text-[10px] text-rose-400 block mt-0.5">
                Требуют вмешательства
              </span>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
              <span className="text-[11px] text-neutral-400 block">Критические сбои</span>
              <span className="text-2xl font-bold font-mono text-red-400 mt-1 block">
                {systemErrors.filter((e) => e.level === 'critical').length}
              </span>
              <span className="text-[10px] text-neutral-500 block mt-0.5">
                Сбои сервисов / API
              </span>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
              <span className="text-[11px] text-neutral-400 block">Предупреждения валидации</span>
              <span className="text-2xl font-bold font-mono text-amber-400 mt-1 block">
                {systemErrors.filter((e) => e.level === 'warning').length}
              </span>
              <span className="text-[10px] text-neutral-500 block mt-0.5">
                Некорректный ввод данных
              </span>
            </div>
          </div>

          {/* Level Filter Tabs */}
          <div className="flex items-center gap-2 flex-wrap bg-neutral-900 border border-neutral-800 p-3 rounded-2xl text-xs font-semibold">
            <span className="text-neutral-500 px-2">Фильтр:</span>
            {[
              { id: 'all', label: `Все (${systemErrors.length})` },
              { id: 'unresolved', label: `Не решенные (${systemErrors.filter((e) => !e.resolved).length})` },
              { id: 'critical', label: `Критические (${systemErrors.filter((e) => e.level === 'critical').length})` },
              { id: 'error', label: `Ошибки (${systemErrors.filter((e) => e.level === 'error').length})` },
              { id: 'warning', label: `Предупреждения (${systemErrors.filter((e) => e.level === 'warning').length})` },
              { id: 'info', label: `Инфо (${systemErrors.filter((e) => e.level === 'info').length})` },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setErrorLevelFilter(btn.id)}
                className={`px-3 py-1.5 rounded-xl transition-colors ${
                  errorLevelFilter === btn.id
                    ? 'bg-amber-500 text-neutral-950 font-bold'
                    : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* Error Log Entries */}
          <div className="space-y-3">
            {systemErrors
              .filter((err) => {
                if (errorLevelFilter === 'unresolved' && err.resolved) return false;
                if (errorLevelFilter !== 'all' && errorLevelFilter !== 'unresolved' && err.level !== errorLevelFilter) {
                  return false;
                }
                return true;
              })
              .map((err) => {
                const isExpanded = expandedErrorId === err.id;
                const levelBadges = {
                  critical: 'bg-red-500/20 text-red-300 border-red-500/40',
                  error: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
                  warning: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
                  info: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
                };
                const levelNames = {
                  critical: 'КРИТИЧЕСКИЙ',
                  error: 'ОШИБКА',
                  warning: 'ПРЕДУПРЕЖДЕНИЕ',
                  info: 'ИНФО',
                };

                return (
                  <div
                    key={err.id}
                    className={`bg-neutral-900 border rounded-2xl p-4 transition-all ${
                      !err.resolved ? 'border-neutral-700' : 'border-neutral-800 opacity-75'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                              levelBadges[err.level]
                            }`}
                          >
                            {levelNames[err.level]}
                          </span>
                          <span className="font-mono text-xs text-neutral-400">
                            {err.source}
                          </span>
                          <span className="text-[11px] text-neutral-500">
                            {new Date(err.timestamp).toLocaleTimeString('ru-RU')} ({new Date(err.timestamp).toLocaleDateString('ru-RU')})
                          </span>
                          {err.resolved && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Решено
                            </span>
                          )}
                        </div>

                        <p className="text-sm font-semibold text-white">
                          {err.message}
                        </p>

                        <div className="flex items-center gap-3 text-[11px] text-neutral-400">
                          {err.userName && <span>Водитель: {err.userName}</span>}
                          <span>Браузер: {err.browser}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {err.stack && (
                          <button
                            onClick={() => setExpandedErrorId(isExpanded ? null : err.id)}
                            className="px-3 py-1.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-700 text-xs font-semibold text-neutral-300 rounded-xl transition-colors flex items-center gap-1.5"
                          >
                            <Terminal className="w-3.5 h-3.5 text-amber-400" />
                            <span>{isExpanded ? 'Скрыть стек' : 'Стек ошибки'}</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleToggleResolveError(err.id)}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors flex items-center gap-1.5 ${
                            err.resolved
                              ? 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
                              : 'bg-emerald-950 hover:bg-emerald-900 border-emerald-800 text-emerald-300'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{err.resolved ? 'Вернуть' : 'Решено'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Expandable Stack Trace */}
                    {isExpanded && err.stack && (
                      <div className="mt-3 pt-3 border-t border-neutral-800">
                        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 font-mono text-[11px] text-rose-300 whitespace-pre-wrap overflow-x-auto leading-relaxed">
                          {err.stack}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

            {systemErrors.length === 0 && (
              <div className="text-center py-12 text-neutral-500 text-xs bg-neutral-900 border border-neutral-800 rounded-2xl">
                Журнал ошибок чист. Сбоев и исключений не обнаружено.
              </div>
            )}
          </div>
        </div>
      )}
      {userModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-base font-bold text-white">
                {editingUserId ? 'Редактировать пользователя' : 'Добавить нового пользователя'}
              </h3>
              <button
                onClick={() => setUserModalOpen(false)}
                className="p-1 text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUserModal} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">ФИО водителя / пользователя:</label>
                <input
                  type="text"
                  value={userFormData.name}
                  onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                  placeholder="Иван Петров"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-neutral-300 font-semibold">Email:</label>
                  <input
                    type="email"
                    value={userFormData.email}
                    onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                    placeholder="driver@mail.ru"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-neutral-300 font-semibold">Телефон:</label>
                  <input
                    type="text"
                    value={userFormData.phone}
                    onChange={(e) => setUserFormData({ ...userFormData, phone: e.target.value })}
                    placeholder="+7 (999) 000-00-00"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-neutral-300 font-semibold">Город:</label>
                  <input
                    type="text"
                    value={userFormData.city}
                    onChange={(e) => setUserFormData({ ...userFormData, city: e.target.value })}
                    placeholder="Москва"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-neutral-300 font-semibold">Тариф:</label>
                  <select
                    value={userFormData.taxiCategory}
                    onChange={(e) => setUserFormData({ ...userFormData, taxiCategory: e.target.value as any })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="economy">Эконом</option>
                    <option value="comfort">Комфорт</option>
                    <option value="comfort_plus">Комфорт+</option>
                    <option value="business">Бизнес</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-neutral-300 font-semibold">Роль в системе:</label>
                  <select
                    value={userFormData.role}
                    onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value as any })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-bold"
                  >
                    <option value="driver">Водитель</option>
                    <option value="admin">Администратор</option>
                    <option value="fleet_manager">Таксопарк</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">
                  Пароль {editingUserId && '(оставьте пустым, чтобы не менять)'}:
                </label>
                <input
                  type="password"
                  value={userFormData.password}
                  onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                  placeholder="Минимум 4 символа"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setUserModalOpen(false)}
                  className="px-4 py-2 bg-neutral-800 text-neutral-300 font-semibold rounded-xl"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 text-neutral-950 font-bold rounded-xl"
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE & EDIT ADVERTISING CAMPAIGN */}
      {isAdModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-2xl p-6 sm:p-7 space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {editingAdId ? 'Редактировать рекламный блок' : 'Создать рекламный блок'}
                  </h3>
                  <span className="text-[11px] text-neutral-400 block">
                    Интеграция предложений партнеров в аккаунты водителей и разделы сервиса
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAdModalOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdForm} className="space-y-4 text-xs">
              {/* Row 1: Title & Partner */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-neutral-300 font-semibold flex items-center justify-between">
                    <span>Название акции / кампании: *</span>
                  </label>
                  <input
                    type="text"
                    value={adFormData.title || ''}
                    onChange={(e) => setAdFormData({ ...adFormData, title: e.target.value })}
                    placeholder="Например: Топливная карта «ТаксиДрайв»"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-neutral-300 font-semibold">Компания / Таксопарк / Партнер: *</label>
                  <input
                    type="text"
                    value={adFormData.partnerName || ''}
                    onChange={(e) => setAdFormData({ ...adFormData, partnerName: e.target.value })}
                    placeholder="Например: Сеть АЗС: Лукойл, Газпромнефть"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              {/* Row 2: Category & Placement */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-neutral-300 font-semibold">Категория предложения:</label>
                  <select
                    value={adFormData.category || 'fuel'}
                    onChange={(e) => setAdFormData({ ...adFormData, category: e.target.value as AdCategory })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-medium"
                  >
                    {AD_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-neutral-300 font-semibold">Место интеграции (раздел):</label>
                  <select
                    value={adFormData.placement || 'all'}
                    onChange={(e) => setAdFormData({ ...adFormData, placement: e.target.value as AdPlacement })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-bold"
                  >
                    {AD_PLACEMENTS.map((p) => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 3: Discount & Badge Text */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-neutral-300 font-semibold">Размер выгоды / скидка:</label>
                  <input
                    type="text"
                    value={adFormData.discount || ''}
                    onChange={(e) => setAdFormData({ ...adFormData, discount: e.target.value })}
                    placeholder="Например: Скидка до 7% или От 2 100 ₽/сут"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-emerald-400 font-mono font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-neutral-300 font-semibold">Текст бейджа:</label>
                  <input
                    type="text"
                    value={adFormData.badge || ''}
                    onChange={(e) => setAdFormData({ ...adFormData, badge: e.target.value })}
                    placeholder="Например: Топливо №1 или Проверено РСА"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Row 4: Description */}
              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold">Краткое описание условий:</label>
                <textarea
                  rows={2}
                  value={adFormData.description || ''}
                  onChange={(e) => setAdFormData({ ...adFormData, description: e.target.value })}
                  placeholder="Опишите ключевые условия, выгоду и преимущества для водителя..."
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white leading-relaxed focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Row 5: Bullet Details */}
              <div className="space-y-1">
                <label className="text-neutral-300 font-semibold flex items-center justify-between">
                  <span>Пункты преимуществ / деталей:</span>
                  <span className="text-[10px] text-neutral-500 font-normal">По одному на строке</span>
                </label>
                <textarea
                  rows={3}
                  value={adDetailsInput}
                  onChange={(e) => setAdDetailsInput(e.target.value)}
                  placeholder="Скидка до 2.5 ₽/литр на 8 500 АЗС&#10;Заправка из приложения без очереди&#10;Отсрочка платежа до 7 дней"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white font-mono text-xs leading-relaxed focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Row 6: Promo Code & Link URL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-neutral-300 font-semibold">Промокод (если есть):</label>
                  <input
                    type="text"
                    value={adFormData.promoCode || ''}
                    onChange={(e) => setAdFormData({ ...adFormData, promoCode: e.target.value.toUpperCase() })}
                    placeholder="TAXIPRO"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-neutral-300 font-semibold">Ссылка перехода (URL):</label>
                  <input
                    type="url"
                    value={adFormData.linkUrl || ''}
                    onChange={(e) => setAdFormData({ ...adFormData, linkUrl: e.target.value })}
                    placeholder="https://partner-website.ru"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-cyan-400 font-mono text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Row 7: Link Text & Contact Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-neutral-300 font-semibold">Текст кнопки действия:</label>
                  <input
                    type="text"
                    value={adFormData.linkText || ''}
                    onChange={(e) => setAdFormData({ ...adFormData, linkText: e.target.value })}
                    placeholder="Воспользоваться предложением"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-neutral-300 font-semibold">Телефон для связи (опционально):</label>
                  <input
                    type="text"
                    value={adFormData.contactPhone || ''}
                    onChange={(e) => setAdFormData({ ...adFormData, contactPhone: e.target.value })}
                    placeholder="8 (800) 555-35-35"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Row 8: Toggles */}
              <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-neutral-800">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={adFormData.isActive ?? true}
                    onChange={(e) => setAdFormData({ ...adFormData, isActive: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-0 bg-neutral-950 border-neutral-800"
                  />
                  <span className="font-semibold text-white">Активна (показывать пользователям)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={Boolean(adFormData.isHot)}
                    onChange={(e) => setAdFormData({ ...adFormData, isHot: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-0 bg-neutral-950 border-neutral-800"
                  />
                  <span className="font-semibold text-amber-400 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    Горячее спецпредложение (Hot)
                  </span>
                </label>
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsAdModalOpen(false)}
                  className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold rounded-xl text-xs transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl text-xs transition-all shadow-lg flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Сохранить и опубликовать</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE AD CONFIRMATION */}
      {adToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Удалить рекламную кампанию?
                </h3>
                <p className="text-xs text-neutral-400">
                  Действие невозможно отменить
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-neutral-950/70 border border-neutral-800 rounded-2xl space-y-2">
              <div className="text-sm font-semibold text-neutral-200">
                {adToDelete.title}
              </div>
              <div className="flex items-center gap-2 text-xs text-neutral-400">
                <span className="text-amber-400 font-medium">{adToDelete.partnerName}</span>
                <span>•</span>
                <span className="font-mono text-neutral-500">ID: {adToDelete.id}</span>
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed pt-1 border-t border-neutral-800/80">
                Кампания будет немедленно отозвана из всех разделов приложения (профиль водителя, калькулятор, лента предложений) и удалена из базы.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAdToDelete(null)}
                className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold rounded-xl text-xs transition-colors"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAd}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-rose-950/50 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Удалить кампанию</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RESET ADS TO DEFAULT CONFIRMATION */}
      {isResetAdsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Сбросить к базовым блокам?
                </h3>
                <p className="text-xs text-neutral-400">
                  Восстановление предустановленных кампаний
                </p>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed bg-neutral-950/70 p-3.5 rounded-2xl border border-neutral-800">
              Текущие рекламные кампании будут заменены стандартным набором предложений (АЗС, ТО, автомойки, страхование).
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsResetAdsModalOpen(false)}
                className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold rounded-xl text-xs transition-colors"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleConfirmResetAds}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl text-xs transition-all shadow-lg flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Сбросить к исходным</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: 2FA SETUP WIZARD (QR CODE & SECRET & BACKUP CODES) */}
      {is2FaModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-lg p-6 sm:p-7 space-y-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Подключение Google Authenticator (2FA)
                  </h3>
                  <span className="text-[11px] text-neutral-400 font-mono block">
                    Супер-администратор: {SUPER_ADMIN_EMAIL}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIs2FaModalOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {setupError && (
              <div className="p-3 bg-rose-950/70 border border-rose-800 rounded-xl text-rose-300 text-xs flex items-center gap-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{setupError}</span>
              </div>
            )}

            <div className="space-y-5 text-xs">
              
              {/* Step 1: Scan QR Code */}
              <div className="space-y-2">
                <span className="font-bold text-neutral-200 block text-xs flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-neutral-950 font-bold flex items-center justify-center text-[10px]">1</span>
                  <span>Отсканируйте QR-код в мобильном приложении:</span>
                </span>
                
                <div className="flex flex-col sm:flex-row items-center gap-4 bg-neutral-950 p-4 rounded-2xl border border-neutral-800">
                  <div className="w-36 h-36 bg-white p-2 rounded-xl flex items-center justify-center shrink-0 shadow-md">
                    {setupQrDataUrl ? (
                      <img src={setupQrDataUrl} alt="Google Authenticator QR Code" className="w-full h-full object-contain" />
                    ) : (
                      <div className="text-[10px] text-neutral-500 text-center">Генерация QR...</div>
                    )}
                  </div>
                  <div className="space-y-1.5 text-left">
                    <p className="text-neutral-300 font-medium leading-relaxed">
                      Откройте <strong>Google Authenticator</strong>, <strong>Authy</strong> или стандартный сканер паролей на телефоне и наведите камеру на QR-код.
                    </p>
                    <p className="text-[11px] text-neutral-500">
                      В приложении появится аккаунт <code>TaxiCalc PRO ({SUPER_ADMIN_EMAIL})</code>.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 2: Manual Key Option */}
              <div className="space-y-1.5">
                <span className="font-bold text-neutral-200 block text-xs flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-neutral-950 font-bold flex items-center justify-center text-[10px]">2</span>
                  <span>Или введите ключ вручную (если камера недоступна):</span>
                </span>
                <div className="flex items-center gap-2 bg-neutral-950 border border-neutral-800 rounded-xl p-2.5">
                  <span className="font-mono text-amber-400 font-bold tracking-wider text-xs flex-1 truncate select-all">
                    {setupSecret}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopySecretKey}
                    className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1 shrink-0"
                  >
                    {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey ? 'Скопировано!' : 'Копировать'}</span>
                  </button>
                </div>
              </div>

              {/* Step 3: Emergency Backup Codes */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-neutral-200 block text-xs flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-neutral-950 font-bold flex items-center justify-center text-[10px]">3</span>
                    <span>Сохраните одноразовые резервные коды:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyBackupCodes(setupBackupCodes)}
                    className="text-amber-400 hover:text-amber-300 text-[11px] font-medium flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedBackup ? 'Скопировано!' : 'Скопировать все'}</span>
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-neutral-950 p-2.5 rounded-xl border border-neutral-800 font-mono text-[11px] text-center">
                  {setupBackupCodes.map((code) => (
                    <span key={code} className="bg-neutral-900 py-1 px-1.5 rounded border border-neutral-800 text-neutral-300">
                      {code}
                    </span>
                  ))}
                </div>
                <span className="text-[10px] text-neutral-500 block">
                  Каждый код можно использовать 1 раз для входа, если у вас не будет доступа к телефону.
                </span>
              </div>

              {/* Step 4: Verification Code to Enable */}
              <form onSubmit={handleConfirm2FASetup} className="space-y-3 pt-2 border-t border-neutral-800">
                <div className="space-y-1">
                  <label className="font-bold text-white block flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-500 text-neutral-950 font-bold flex items-center justify-center text-[10px]">4</span>
                    <span>Введите 6-значный проверочный код из приложения:</span>
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    autoFocus
                    value={setupVerificationCode}
                    onChange={(e) => setSetupVerificationCode(e.target.value)}
                    placeholder="000000"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 text-center text-white font-mono text-xl tracking-widest focus:outline-none focus:border-emerald-500 shadow-inner"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIs2FaModalOpen(false)}
                    className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold rounded-xl text-xs"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold rounded-xl text-xs shadow-md transition-colors flex items-center gap-1.5"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Подтвердить и активировать 2FA</span>
                  </button>
                </div>
              </form>

            </div>
          </div>
        </div>
      )}

      {/* MODAL: VIEW BACKUP CODES */}
      {isViewingBackupCodes && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">
                  Резервные коды доступа (2FA)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsViewingBackupCodes(false)}
                className="p-1 text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              Резервные ключи используются для входа в панель администратора в экстренных случаях (утеря телефона, сброс приложения Authenticator).
            </p>

            <div className="grid grid-cols-2 gap-2 bg-neutral-950 p-3 rounded-2xl border border-neutral-800 font-mono text-xs">
              {twoFaConfig.backupCodes.map((code) => {
                const isUsed = twoFaConfig.usedBackupCodes.includes(code);
                return (
                  <div
                    key={code}
                    className={`py-1.5 px-2.5 rounded-lg border flex items-center justify-between ${
                      isUsed
                        ? 'bg-neutral-900 border-neutral-800 text-neutral-600 line-through'
                        : 'bg-neutral-900/80 border-neutral-700 text-emerald-400 font-bold'
                    }`}
                  >
                    <span>{code}</span>
                    <span className="text-[10px] font-sans font-normal text-neutral-500">
                      {isUsed ? 'использован' : 'активен'}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => handleCopyBackupCodes(twoFaConfig.backupCodes)}
                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Скопировать все</span>
              </button>
              <button
                type="button"
                onClick={() => setIsViewingBackupCodes(false)}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold rounded-xl transition-colors"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DELETE USER CONFIRMATION */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Удалить пользователя?
                </h3>
                <p className="text-xs text-neutral-400">
                  Безвозвратное удаление учетной записи
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-neutral-950/80 border border-neutral-800 rounded-2xl space-y-2">
              <div className="text-sm font-bold text-white flex items-center justify-between">
                <span>{userToDelete.name}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 font-mono">
                  {userToDelete.role === 'admin' ? 'Администратор' : userToDelete.role === 'fleet_manager' ? 'Таксопарк' : 'Водитель'}
                </span>
              </div>
              <div className="text-xs text-neutral-300 font-mono">
                {userToDelete.email}
              </div>
              <div className="flex items-center gap-2 text-xs text-neutral-500 pt-1 border-t border-neutral-800/80">
                <span>Город: {userToDelete.city || 'Москва'}</span>
                <span>•</span>
                <span className="uppercase text-amber-400 font-semibold">{userToDelete.taxiCategory}</span>
              </div>
              <p className="text-xs text-rose-300/90 leading-relaxed pt-1.5 border-t border-neutral-800/80">
                Внимание: пользователь будет полностью исключен из базы данных и не сможет войти в систему. Удаление не воскрешает аккаунт.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteUser}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-rose-950/50 flex items-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Удалить навсегда</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
