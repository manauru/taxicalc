import React, { useState, useRef } from 'react';
import { UserProfile, LoginHistoryRecord, UserAgreements } from '../types/auth';
import { VehicleSettings } from '../types/taxi';
import { 
  updateUserProfile, 
  terminateOtherSessions, 
  isUserAccessRestricted, 
  acceptAllAgreements,
  changeUserPassword,
  requestPasswordReset,
  getActiveUser 
} from '../utils/authStorage';
import { 
  User, 
  Camera, 
  MapPin, 
  Mail, 
  Phone, 
  Shield, 
  CheckCircle2, 
  Clock, 
  Laptop, 
  Smartphone, 
  Monitor, 
  FileText, 
  Lock, 
  Download, 
  LogOut, 
  Trash2, 
  AlertCircle, 
  Save, 
  Car, 
  Calendar, 
  ExternalLink,
  ChevronRight,
  Info,
  Check,
  RefreshCw,
  Sparkles,
  Plus,
  X,
  AlertTriangle,
  XCircle,
  MessageSquare,
  Megaphone,
  Tag,
  Percent,
  LayoutDashboard,
  KeyRound,
  Eye,
  EyeOff,
  Send,
  ShieldCheck
} from 'lucide-react';
import { AccountFeedbackBlock } from './AccountFeedbackBlock';
import { AccountAdsBlock } from './AccountAdsBlock';
import { isUserSuperAdmin } from '../utils/securityStorage';

interface AccountProfileViewProps {
  currentUser: UserProfile | null;
  settings: VehicleSettings;
  shiftsCount: number;
  onUpdateUser: (updatedUser: UserProfile) => void;
  onLogout: () => void;
  onOpenAuthModal: () => void;
  onGoToAdmin?: () => void;
}

type AccountSubTab = 'profile' | 'security' | 'feedback' | 'ads' | 'sessions' | 'agreements';

const DEFAULT_CITY_PRESETS = [
  'Москва',
  'Санкт-Петербург',
  'Казань',
  'Новосибирск',
  'Екатеринбург',
  'Краснодар',
  'Нижний Новгород',
  'Самара',
  'Ростов-на-Дону',
  'Уфа',
  'Воронеж',
  'Челябинск',
];

const AVATAR_PRESETS = [
  {
    id: 'male_1',
    label: 'Водитель 1',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80',
  },
  {
    id: 'male_2',
    label: 'Водитель 2',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&h=256&q=80',
  },
  {
    id: 'male_3',
    label: 'Водитель 3',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&h=256&q=80',
  },
  {
    id: 'female_1',
    label: 'Водитель 4',
    url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&h=256&q=80',
  },
];

export const AccountProfileView: React.FC<AccountProfileViewProps> = ({
  currentUser,
  settings,
  shiftsCount,
  onUpdateUser,
  onLogout,
  onOpenAuthModal,
  onGoToAdmin,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<AccountSubTab>('profile');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [city, setCity] = useState(currentUser?.city || 'Москва');
  const [postalAddress, setPostalAddress] = useState(currentUser?.postalAddress || '');
  const [taxiCategory, setTaxiCategory] = useState<'economy' | 'comfort' | 'comfort_plus' | 'business'>(
    currentUser?.taxiCategory || 'comfort'
  );
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl || '');

  // Password change & recovery states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [pwdSuccessMsg, setPwdSuccessMsg] = useState<string | null>(null);
  const [pwdErrorMsg, setPwdErrorMsg] = useState<string | null>(null);
  const [testResetEmailSent, setTestResetEmailSent] = useState(false);
  const [testResetCode, setTestResetCode] = useState<string | null>(null);

  // Custom cities list management (allows adding any custom city)
  const [cityList, setCityList] = useState<string[]>(() => {
    const saved = localStorage.getItem('taxicalc_custom_cities_v1');
    const userCity = currentUser?.city?.trim();
    let initialList = DEFAULT_CITY_PRESETS;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          initialList = Array.from(new Set([...DEFAULT_CITY_PRESETS, ...parsed]));
        }
      } catch {
        // ignore
      }
    }
    if (userCity && !initialList.includes(userCity)) {
      initialList = [...initialList, userCity];
    }
    return initialList;
  });

  const [newCityInput, setNewCityInput] = useState('');
  const [isAddingCityOpen, setIsAddingCityOpen] = useState(false);

  const handleAddCustomCity = (cityNameToAdd?: string) => {
    const target = (cityNameToAdd || newCityInput).trim();
    if (!target) return;

    if (!cityList.some(c => c.toLowerCase() === target.toLowerCase())) {
      const updated = [...cityList, target];
      setCityList(updated);
      localStorage.setItem('taxicalc_custom_cities_v1', JSON.stringify(updated.filter(c => !DEFAULT_CITY_PRESETS.includes(c))));
    }
    setCity(target);
    setNewCityInput('');
    setIsAddingCityOpen(false);
  };

  const handleRemoveCustomCity = (cityToRemove: string) => {
    const updated = cityList.filter(c => c !== cityToRemove);
    setCityList(updated);
    localStorage.setItem('taxicalc_custom_cities_v1', JSON.stringify(updated.filter(c => !DEFAULT_CITY_PRESETS.includes(c))));
    if (city === cityToRemove) {
      setCity('Москва');
    }
  };

  // Agreements state
  const [agreements, setAgreements] = useState<UserAgreements>(() => {
    return (
      currentUser?.agreements || {
        termsOfService: true,
        privacyPolicy: true,
        dataProcessing: true,
        analyticsCookies: true,
        acceptedAt: currentUser?.createdAt || Date.now(),
      }
    );
  });

  // Modal for viewing full legal documents
  const [viewingDoc, setViewingDoc] = useState<'terms' | 'privacy' | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!currentUser) {
    return (
      <div className="space-y-8">
        <div className="max-w-2xl mx-auto py-10 px-4 text-center space-y-6 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-xl">
          <div className="w-16 h-16 bg-neutral-950 border border-neutral-800 rounded-2xl flex items-center justify-center mx-auto text-amber-400">
            <User className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">Вход в личный кабинет водителя</h2>
            <p className="text-sm text-neutral-400 max-w-md mx-auto">
              Для редактирования фото, почтового адреса, города и просмотра соглашений выполните вход в свой аккаунт или зарегистрируйтесь.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onOpenAuthModal}
              className="w-full sm:w-auto px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl text-sm transition-colors shadow-lg"
            >
              Войти или Зарегистрироваться
            </button>
          </div>
        </div>

        {/* Доступные партнерские предложения и форма обратной связи для всех водителей */}
        <div className="space-y-6">
          <AccountAdsBlock onGoToFeedbackAdvertising={() => {}} />
          <AccountFeedbackBlock currentUser={null} />
        </div>
      </div>
    );
  }

  // Handle image upload from file system
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Пожалуйста, выберите изображение (JPEG, PNG, WebP)');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg('Размер файла не должен превышать 2 МБ');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setAvatarUrl(result);
      setErrorMsg(null);
    };
    reader.onerror = () => {
      setErrorMsg('Ошибка чтения файла изображения');
    };
    reader.readAsDataURL(file);
  };

  // Save changes
  const handleSaveChanges = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccessMsg(null);
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('Имя не может быть пустым');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Укажите корректный Email');
      return;
    }

    const updatedData: Partial<UserProfile> = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      city: city.trim(),
      postalAddress: postalAddress.trim(),
      taxiCategory,
      avatarUrl,
      agreements,
    };

    const res = updateUserProfile(updatedData);
    if (res.success && res.user) {
      onUpdateUser(res.user);
      setSaveSuccessMsg('Данные профиля успешно сохранены в системе');
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } else {
      setErrorMsg(res.error || 'Ошибка сохранения профиля');
    }
  };

  // Terminate other sessions
  const handleTerminateOtherSessions = () => {
    const res = terminateOtherSessions(currentUser.id);
    if (res.success && res.user) {
      onUpdateUser(res.user);
      setSaveSuccessMsg('Все остальные активные сеансы успешно завершены');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    }
  };

  // Change password handler
  const handleChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPwdSuccessMsg(null);
    setPwdErrorMsg(null);

    if (!currentUser) return;
    if (!currentPassword) {
      setPwdErrorMsg('Введите текущий пароль');
      return;
    }
    if (newPassword.length < 4) {
      setPwdErrorMsg('Новый пароль должен содержать минимум 4 символа');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdErrorMsg('Новый пароль и подтверждение не совпадают');
      return;
    }

    const res = changeUserPassword(currentUser.id, currentPassword, newPassword);
    if (res.success) {
      const active = getActiveUser();
      if (active) {
        onUpdateUser(active);
      }
      setPwdSuccessMsg('Пароль успешно изменен! Все последующие входы в систему будут использовать новый пароль.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPwdSuccessMsg(null), 5000);
    } else {
      setPwdErrorMsg(res.error || 'Не удалось изменить пароль');
    }
  };

  // Test email recovery code generation
  const handleTestEmailRecovery = () => {
    if (!currentUser?.email) return;
    setPwdErrorMsg(null);
    const res = requestPasswordReset(currentUser.email);
    if (res.success) {
      setTestResetEmailSent(true);
      setTestResetCode(null);
    } else {
      setPwdErrorMsg(res.error || 'Не удалось отправить проверочный код');
    }
  };

  // Export profile data (JSON)
  const handleExportProfile = () => {
    const exportObject = {
      profile: currentUser,
      activeVehicle: {
        carName: settings.carName,
        category: settings.category,
        fuelType: settings.fuelType,
        ownershipType: settings.ownershipType,
      },
      exportedAt: new Date().toISOString(),
      service: 'ТаксиКальк PRO',
    };

    const blob = new Blob([JSON.stringify(exportObject, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `taxicalc_profile_${currentUser.name.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isRestricted = isUserAccessRestricted(currentUser);

  const handleToggleAgreement = (field: keyof UserAgreements, value: boolean) => {
    const updated: UserAgreements = {
      ...agreements,
      [field]: value,
      acceptedAt: Date.now(),
    };
    setAgreements(updated);
    const res = updateUserProfile({ agreements: updated });
    if (res.success && res.user) {
      onUpdateUser(res.user);
      if (!value) {
        setErrorMsg('Согласие отозвано. Калькулятор, радар заказов, параметры авто и оптимизатор заблокированы.');
      } else {
        setSaveSuccessMsg('Согласие обновлено.');
      }
      setTimeout(() => {
        setErrorMsg(null);
        setSaveSuccessMsg(null);
      }, 4000);
    }
  };

  const handleAcceptAllAgreements = () => {
    const res = acceptAllAgreements();
    if (res.success && res.user && res.user.agreements) {
      setAgreements(res.user.agreements);
      onUpdateUser(res.user);
      setSaveSuccessMsg('Все обязательные соглашения приняты! Полный доступ ко всем функциям сервиса восстановлен.');
      setErrorMsg(null);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    }
  };

  const loginRecords = currentUser.loginHistory || [];

  return (
    <div className="space-y-6">
      
      {/* ========================================================= */}
      {/* 1. HERO HEADER: AVATAR, NAME, QUICK METRICS & STATUS */}
      {/* ========================================================= */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-5">
          
          {/* Avatar and Primary Identity */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
            
            {/* Avatar container with interactive overlay */}
            <div className="relative group shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-amber-500/80 bg-neutral-950 flex items-center justify-center shadow-lg">
                {avatarUrl ? (
                  <img 
                    src={avatarUrl} 
                    alt={currentUser.name} 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-600 to-amber-900 text-white font-extrabold text-3xl">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Upload trigger overlay */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/60 rounded-2xl flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-xs"
                title="Загрузить новое фото"
              >
                <Camera className="w-5 h-5 text-amber-400 mb-0.5" />
                <span className="text-[10px] font-semibold">Сменить фото</span>
              </button>

              <input 
                ref={fileInputRef} 
                type="file" 
                accept="image/*" 
                onChange={handleImageUpload} 
                className="hidden" 
              />
            </div>

            {/* Name, Taxi Class, Location */}
            <div className="space-y-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {currentUser.name}
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  {taxiCategory === 'economy' ? 'Эконом' : taxiCategory === 'comfort' ? 'Комфорт' : taxiCategory === 'comfort_plus' ? 'Комфорт+' : 'Бизнес'}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" />
                  Верифицирован
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-neutral-400 pt-0.5">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-neutral-500" />
                  {currentUser.email}
                </span>
                {currentUser.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-neutral-500" />
                    {currentUser.phone}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  {currentUser.city}
                </span>
              </div>

              {currentUser.postalAddress && (
                <div className="text-[11px] text-neutral-400 font-mono mt-1 pt-1 border-t border-neutral-800/80">
                  📮 Адрес: <strong className="text-neutral-200">{currentUser.postalAddress}</strong>
                </div>
              )}
            </div>

          </div>

          {/* Quick Actions & Logout */}
          <div className="flex flex-wrap items-center gap-2 self-center sm:self-start">
            {isUserSuperAdmin(currentUser) && onGoToAdmin && (
              <button
                type="button"
                onClick={onGoToAdmin}
                className="px-3 py-2 text-xs font-bold text-purple-300 hover:text-white bg-purple-950/60 hover:bg-purple-900 border border-purple-700/80 rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
                title="Перейти в панель администратора"
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-purple-400" />
                <span>Админ-панель</span>
              </button>
            )}

            <button
              onClick={handleExportProfile}
              className="px-3 py-2 text-xs font-semibold text-neutral-300 hover:text-white bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 rounded-xl transition-colors flex items-center gap-1.5"
              title="Экспорт персональных данных в формате JSON"
            >
              <Download className="w-3.5 h-3.5 text-neutral-400" />
              <span className="hidden sm:inline">Экспорт данных</span>
            </button>
            <button
              onClick={onLogout}
              className="px-3 py-2 text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/40 rounded-xl transition-colors flex items-center gap-1.5"
              title="Завершить текущий сеанс"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Выйти</span>
            </button>
          </div>

        </div>

        {/* Quick Driver Status Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-5 pt-4 border-t border-neutral-800/80 text-xs">
          <div className="bg-neutral-950/60 p-2.5 rounded-xl border border-neutral-800/60">
            <span className="text-[10px] text-neutral-500 block">Рабочий автомобиль:</span>
            <span className="font-bold text-white truncate block">{settings.carName}</span>
          </div>
          <div className="bg-neutral-950/60 p-2.5 rounded-xl border border-neutral-800/60">
            <span className="text-[10px] text-neutral-500 block">Смен в журнале:</span>
            <span className="font-mono font-bold text-amber-400 text-sm">{shiftsCount}</span>
          </div>
          <div className="bg-neutral-950/60 p-2.5 rounded-xl border border-neutral-800/60">
            <span className="text-[10px] text-neutral-500 block">Дата регистрации:</span>
            <span className="text-neutral-300 text-[11px]">
              {new Date(currentUser.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
          <div className="bg-neutral-950/60 p-2.5 rounded-xl border border-neutral-800/60">
            <span className="text-[10px] text-neutral-500 block">Статус доступа:</span>
            {isRestricted ? (
              <span className="text-rose-400 font-semibold flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" />
                Ограничен (отзыв)
              </span>
            ) : (
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" />
                ФЗ-152 Защищено
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. SUB-TABS NAVIGATION */}
      {/* ========================================================= */}
      <div className="flex border-b border-neutral-800 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('profile')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeSubTab === 'profile'
              ? 'border-amber-500 text-amber-400 bg-neutral-900/30'
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Личные данные и адрес</span>
        </button>

        <button
          onClick={() => setActiveSubTab('security')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeSubTab === 'security'
              ? 'border-amber-500 text-amber-400 bg-neutral-900/30'
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <KeyRound className="w-4 h-4 text-amber-400" />
          <span>Безопасность и пароль</span>
        </button>

        <button
          onClick={() => setActiveSubTab('feedback')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeSubTab === 'feedback'
              ? 'border-amber-500 text-amber-400 bg-neutral-900/30'
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Обратная связь</span>
        </button>

        <button
          onClick={() => setActiveSubTab('ads')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap relative ${
            activeSubTab === 'ads'
              ? 'border-amber-500 text-amber-400 bg-neutral-900/30'
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <Megaphone className="w-4 h-4 text-amber-400" />
          <span>Спецпредложения и реклама</span>
          <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">
            Скидки
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('sessions')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeSubTab === 'sessions'
              ? 'border-amber-500 text-amber-400 bg-neutral-900/30'
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Последние входы ({loginRecords.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('agreements')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap relative ${
            activeSubTab === 'agreements'
              ? 'border-amber-500 text-amber-400 bg-neutral-900/30'
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Соглашения</span>
          {isRestricted && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-950 text-rose-400 border border-rose-800 animate-pulse">
              Отозвано
            </span>
          )}
        </button>
      </div>

      {/* Feedback Messages */}
      {saveSuccessMsg && (
        <div className="p-3.5 bg-emerald-950/60 border border-emerald-800/80 rounded-xl text-emerald-300 text-xs flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-rose-950/60 border border-rose-800/80 rounded-xl text-rose-300 text-xs flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. TAB 1: EDIT PROFILE, PHOTO, POSTAL ADDRESS, CITY */}
      {/* ========================================================= */}
      {activeSubTab === 'profile' && (
        <form onSubmit={handleSaveChanges} className="space-y-6">
          
          {/* Section: Photo Editing & Presets */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Camera className="w-4 h-4 text-amber-400" />
                  Фотография профиля водителя
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Загрузите свое реальное фото с устройства или выберите из готовых аватаров
                </p>
              </div>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={() => setAvatarUrl('')}
                  className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Удалить фото</span>
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-5">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-neutral-700 bg-neutral-950 flex items-center justify-center">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-neutral-600" />
                  )}
                </div>
              </div>

              <div className="space-y-3 flex-1 text-center sm:text-left">
                <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-semibold border border-neutral-700 transition-colors flex items-center gap-1.5"
                  >
                    <Camera className="w-3.5 h-3.5 text-amber-400" />
                    <span>Выбрать файл с устройства</span>
                  </button>
                  <span className="text-[11px] text-neutral-500">До 2 МБ (PNG, JPG, WEBP)</span>
                </div>

                {/* Avatar Presets */}
                <div>
                  <span className="text-[11px] text-neutral-400 block mb-1.5">
                    Либо выберите быстрый аватар:
                  </span>
                  <div className="flex items-center gap-2 justify-center sm:justify-start">
                    {AVATAR_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setAvatarUrl(preset.url)}
                        className={`w-9 h-9 rounded-xl overflow-hidden border transition-all ${
                          avatarUrl === preset.url
                            ? 'border-amber-400 ring-2 ring-amber-400/50 scale-105'
                            : 'border-neutral-750 hover:border-neutral-500'
                        }`}
                        title={preset.label}
                      >
                        <img src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Main Identity & Contact Fields */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-neutral-800 pb-3">
              <User className="w-4 h-4 text-amber-400" />
              Основные реквизиты и контактные данные
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-neutral-300 font-semibold mb-1">
                  ФИО водителя:
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Иван Петров"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white font-medium text-sm focus:border-amber-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-neutral-300 font-semibold mb-1">
                  Электронная почта (Email):
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="driver@example.ru"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white font-medium text-sm focus:border-amber-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-neutral-300 font-semibold mb-1">
                  Контактный телефон:
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+7 (999) 000-00-00"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white font-medium text-sm focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-neutral-300 font-semibold mb-1">
                  Тарифный класс автомобиля:
                </label>
                <select
                  value={taxiCategory}
                  onChange={(e) => setTaxiCategory(e.target.value as any)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white font-medium text-sm focus:border-amber-500 focus:outline-none"
                >
                  <option value="economy">Эконом</option>
                  <option value="comfort">Комфорт</option>
                  <option value="comfort_plus">Комфорт+</option>
                  <option value="business">Бизнес</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section: City & Postal Address */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
            <div className="border-b border-neutral-800 pb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-400" />
                Город работы и личный почтовый адрес
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Город определяет региональные тарифные ставки и коэффициенты. Вы можете выбрать город из списка или ввести и сохранить свой собственный.
              </p>
            </div>

            {/* City Selection */}
            <div className="space-y-3 text-xs">
              <label className="block text-neutral-300 font-semibold">
                Город работы водителя:
              </label>

              {/* Input for custom city or editing current city */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Введите любой ваш город (например: Сочи, Тюмень, Сургут...)"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-white font-medium text-sm focus:border-amber-500 focus:outline-none"
                    required
                  />
                  {city && !cityList.some(c => c.toLowerCase() === city.toLowerCase()) && (
                    <span className="absolute right-3 top-2.5 text-[10px] text-amber-400 font-mono bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-800">
                      Свой город
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleAddCustomCity(city)}
                  disabled={!city.trim() || cityList.some(c => c.toLowerCase() === city.trim().toLowerCase())}
                  className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 disabled:hover:bg-neutral-800 text-neutral-200 text-xs font-semibold rounded-xl border border-neutral-700 transition-colors flex items-center justify-center gap-1.5 shrink-0"
                  title="Сохранить введенный город в список для быстрого переключения"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-400" />
                  <span>Сохранить в список городов</span>
                </button>
              </div>

              {/* City quick buttons with add button */}
              <div className="pt-1 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-neutral-400">
                    Быстрый выбор города (нажмите для выбора):
                  </span>
                  {!isAddingCityOpen ? (
                    <button
                      type="button"
                      onClick={() => setIsAddingCityOpen(true)}
                      className="text-amber-400 hover:text-amber-300 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      <span>+ Добавить свой город</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsAddingCityOpen(false)}
                      className="text-neutral-500 hover:text-neutral-400 text-[11px] transition-colors"
                    >
                      Отмена
                    </button>
                  )}
                </div>

                {isAddingCityOpen && (
                  <div className="p-3 bg-neutral-950 rounded-xl border border-amber-500/40 flex items-center gap-2 animate-fade-in">
                    <input
                      type="text"
                      value={newCityInput}
                      onChange={(e) => setNewCityInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomCity();
                        }
                      }}
                      placeholder="Название нового города..."
                      className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-amber-500"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => handleAddCustomCity()}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-lg text-xs transition-colors shrink-0"
                    >
                      Добавить
                    </button>
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5">
                  {cityList.map((c) => {
                    const isSelected = city.toLowerCase() === c.toLowerCase();
                    const isCustom = !DEFAULT_CITY_PRESETS.includes(c);

                    return (
                      <div key={c} className="flex items-center">
                        <button
                          type="button"
                          onClick={() => setCity(c)}
                          className={`px-2.5 py-1 text-xs transition-colors ${
                            isCustom ? 'rounded-l-lg' : 'rounded-lg'
                          } ${
                            isSelected
                              ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
                              : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800'
                          }`}
                        >
                          {c}
                        </button>
                        {isCustom && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveCustomCity(c);
                            }}
                            className={`px-1.5 py-1 text-xs rounded-r-lg border-y border-r transition-colors ${
                              isSelected
                                ? 'bg-amber-600 border-amber-600 text-neutral-950 hover:bg-rose-500 hover:text-white'
                                : 'bg-neutral-950 border-neutral-800 text-neutral-500 hover:bg-rose-950/60 hover:text-rose-400'
                            }`}
                            title={`Удалить ${c} из списка`}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Postal Address Field */}
            <div className="space-y-1.5 text-xs pt-3 border-t border-neutral-800">
              <div className="flex items-center justify-between">
                <label className="block text-neutral-300 font-semibold">
                  Почтовый адрес водителя:
                </label>
                <span className="text-[10px] text-neutral-500">Индекс, улица, дом, кв</span>
              </div>
              <textarea
                rows={2}
                value={postalAddress}
                onChange={(e) => setPostalAddress(e.target.value)}
                placeholder="125009, г. Москва, ул. Тверская, д. 14, кв. 28"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white font-medium text-sm focus:border-amber-500 focus:outline-none leading-relaxed"
              />
              <p className="text-[11px] text-neutral-500 flex items-center gap-1.5 pt-0.5">
                <Info className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                <span>
                  Почтовый адрес для личного профиля водителя (уведомления, получение инвентаря, карт или оборудования). Приложение предназначено исключительно для личных расчетов и аналитики смен без формирования бухгалтерской документации.
                </span>
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl text-sm transition-all flex items-center gap-2 shadow-lg"
            >
              <Save className="w-4 h-4" />
              <span>Сохранить изменения профиля</span>
            </button>
          </div>

          {/* Quick interactive cards to Ads and Feedback */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-neutral-800">
            <div 
              onClick={() => setActiveSubTab('ads')}
              className="bg-neutral-900 border border-neutral-800 hover:border-amber-500/50 p-4 rounded-2xl cursor-pointer transition-all flex items-center justify-between group shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors flex items-center gap-1.5">
                    Спецпредложения и скидки
                    <span className="text-[10px] px-1.5 py-0.2 bg-emerald-950 text-emerald-400 rounded border border-emerald-800 font-mono">
                      -25%
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-400">
                    Топливо, ОСАГО для такси, мойка и аренда
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-amber-400 transition-colors shrink-0 ml-2" />
            </div>

            <div 
              onClick={() => setActiveSubTab('feedback')}
              className="bg-neutral-900 border border-neutral-800 hover:border-amber-500/50 p-4 rounded-2xl cursor-pointer transition-all flex items-center justify-between group shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
                    Обратная связь и поддержка
                  </div>
                  <div className="text-[11px] text-neutral-400">
                    Есть идея, вопрос или нашли ошибку?
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-amber-400 transition-colors shrink-0 ml-2" />
            </div>
          </div>

        </form>
      )}

      {/* ========================================================= */}
      {/* 3.0 TAB: SECURITY, PASSWORD CHANGE & EMAIL RECOVERY */}
      {/* ========================================================= */}
      {activeSubTab === 'security' && (
        <div className="space-y-6 animate-fade-in">
          {/* Card 1: Change Password Form */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xl">
            <div className="border-b border-neutral-800 pb-3 flex items-start justify-between">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  Смена пароля учетной записи
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Регулярно обновляйте пароль для защиты журнала смен, финансовой аналитики и персональных настроек
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 shrink-0">
                Безопасность
              </span>
            </div>

            {pwdSuccessMsg && (
              <div className="p-3.5 bg-emerald-950/70 border border-emerald-800 rounded-xl text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{pwdSuccessMsg}</span>
              </div>
            )}

            {pwdErrorMsg && (
              <div className="p-3.5 bg-rose-950/70 border border-rose-800 rounded-xl text-rose-300 text-xs flex items-center gap-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{pwdErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleChangePasswordSubmit} className="space-y-4 max-w-lg text-xs">
              <div>
                <label className="block text-neutral-300 font-semibold mb-1.5">
                  Текущий пароль:
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Введите ваш действующий пароль"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 pr-10 text-white font-mono text-sm focus:outline-none focus:border-amber-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-3 text-neutral-500 hover:text-neutral-300"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-neutral-300 font-semibold mb-1.5">
                  Новый пароль:
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Минимум 4 символа (рекомендуется от 8)"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 pr-10 text-white font-mono text-sm focus:outline-none focus:border-amber-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-3 text-neutral-500 hover:text-neutral-300"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password strength helper */}
                {newPassword.length > 0 && (
                  <div className="mt-2 flex items-center gap-2 text-[11px]">
                    <span className="text-neutral-500">Сложность:</span>
                    <div className="flex-1 h-1.5 bg-neutral-800 rounded-full overflow-hidden flex">
                      <div
                        className={`h-full transition-all ${
                          newPassword.length < 4
                            ? 'w-1/4 bg-rose-500'
                            : newPassword.length < 8
                            ? 'w-2/4 bg-amber-500'
                            : /\d/.test(newPassword) && /[A-ZА-Я]/i.test(newPassword)
                            ? 'w-full bg-emerald-500'
                            : 'w-3/4 bg-amber-400'
                        }`}
                      />
                    </div>
                    <span className="font-semibold text-neutral-300">
                      {newPassword.length < 4
                        ? 'Слишком короткий'
                        : newPassword.length < 8
                        ? 'Средний'
                        : /\d/.test(newPassword)
                        ? 'Надежный'
                        : 'Хороший'}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-neutral-300 font-semibold mb-1.5">
                  Повторите новый пароль:
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Повторите новый пароль для подтверждения"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 pr-10 text-white font-mono text-sm focus:outline-none focus:border-amber-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-neutral-500 hover:text-neutral-300"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && newPassword && confirmPassword !== newPassword && (
                  <span className="text-[11px] text-rose-400 block mt-1">
                    Пароли не совпадают
                  </span>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl text-xs shadow-md transition-colors flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Сохранить новый пароль</span>
                </button>
              </div>
            </form>
          </div>

          {/* Card 2: Email Password Recovery Settings */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl">
            <div className="border-b border-neutral-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Mail className="w-4 h-4 text-emerald-400" />
                  Восстановление доступа и сброс пароля по Email
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  При утере пароля на форму входа высылается 6-значный одноразовый проверочный код безопасности
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 self-start sm:self-auto">
                <Check className="w-3.5 h-3.5" />
                Email привязан
              </span>
            </div>

            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-neutral-400 block text-[11px]">Зарегистрированный почтовый ящик водителя:</span>
                <span className="font-mono text-sm font-bold text-white flex items-center gap-2">
                  <Mail className="w-4 h-4 text-amber-400" />
                  {currentUser.email}
                </span>
                <span className="text-[11px] text-neutral-500 block">
                  Код сброса действителен в течение 15 минут с момента генерации
                </span>
              </div>

              <button
                type="button"
                onClick={handleTestEmailRecovery}
                className="px-4 py-2 bg-neutral-900 hover:bg-neutral-850 border border-neutral-700 hover:border-amber-500/50 text-neutral-200 text-xs font-semibold rounded-xl transition-colors flex items-center gap-2 shrink-0 self-start sm:self-auto"
              >
                <Send className="w-3.5 h-3.5 text-amber-400" />
                <span>Проверить отправку кода</span>
              </button>
            </div>

            {testResetEmailSent && (
              <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-xl p-4 space-y-2 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Письмо для сброса пароля успешно отправлено
                  </span>
                  <span className="text-[10px] text-neutral-400 font-mono">15 мин</span>
                </div>
                <p className="text-[11px] text-neutral-300 leading-relaxed">
                  Сообщение с одноразовым проверочным кодом отправлено на ваш почтовый ящик <strong className="text-white font-mono">{currentUser.email}</strong>. Проверьте папку «Входящие» и «Спам».
                </p>
              </div>
            )}
          </div>

          {/* Card 3: Security Best Practices & Audit Trail */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 text-xs space-y-3">
            <h3 className="font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Рекомендации по безопасности профиля
            </h3>
            <ul className="space-y-1.5 text-neutral-400 text-[11px] list-disc list-inside">
              <li>Никогда не передавайте пароль и код восстановления третьим лицам или диспетчерам парка.</li>
              <li>При входе с чужого планшета или рабочего смартфона всегда завершайте сеанс во вкладке «Последние входы».</li>
              <li>В случае подозрения на взлом немедленно смените пароль и выполните «Завершить все другие сеансы».</li>
            </ul>
          </div>
        </div>
      )}
      {activeSubTab === 'feedback' && (
        <AccountFeedbackBlock
          currentUser={currentUser}
          onOpenAdInquiry={() => setActiveSubTab('ads')}
        />
      )}

      {/* ========================================================= */}
      {/* 3.2 TAB: ADS & PARTNER OFFERS */}
      {/* ========================================================= */}
      {activeSubTab === 'ads' && (
        <AccountAdsBlock
          onGoToFeedbackAdvertising={() => setActiveSubTab('feedback')}
        />
      )}

      {/* ========================================================= */}
      {/* 4. TAB 2: LAST LOGINS & SESSION SECURITY */}
      {/* ========================================================= */}
      {activeSubTab === 'sessions' && (
        <div className="space-y-6">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-3">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  История последних входов и активных сеансов
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Список устройств и локаций, с которых осуществлялся вход в учетную запись
                </p>
              </div>

              {loginRecords.length > 1 && (
                <button
                  type="button"
                  onClick={handleTerminateOtherSessions}
                  className="px-3 py-1.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-400" />
                  <span>Завершить все другие сеансы</span>
                </button>
              )}
            </div>

            {/* List of login records */}
            <div className="space-y-2.5">
              {loginRecords.map((record) => {
                const isMobile = /Android|iPhone|iPad/i.test(record.device);
                const Icon = isMobile ? Smartphone : record.device.includes('Mac') ? Laptop : Monitor;

                return (
                  <div
                    key={record.id}
                    className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors ${
                      record.isCurrentSession
                        ? 'bg-neutral-950 border-emerald-800/80 ring-1 ring-emerald-500/30'
                        : 'bg-neutral-950/60 border-neutral-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        record.isCurrentSession ? 'bg-emerald-950 text-emerald-400' : 'bg-neutral-900 text-neutral-400'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">
                            {record.browser}
                          </span>
                          <span className="text-neutral-500">·</span>
                          <span className="text-neutral-400">{record.device}</span>
                          {record.isCurrentSession && (
                            <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-tight flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                              Текущий сеанс
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-500 mt-0.5">
                          <span>IP: <strong className="text-neutral-400 font-mono">{record.ip}</strong></span>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-neutral-500" />
                            {record.location}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-left sm:text-right text-[11px] font-mono text-neutral-400 shrink-0">
                      <div className="flex items-center sm:justify-end gap-1 text-neutral-400">
                        <Clock className="w-3 h-3 text-neutral-500" />
                        <span>
                          {new Date(record.timestamp).toLocaleDateString('ru-RU', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Security Notice */}
            <div className="bg-neutral-950 p-3.5 rounded-xl border border-neutral-800/80 text-xs text-neutral-400 flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold text-white block">
                  Защита авторизации и безопасность данных
                </span>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Все финансовые расчеты смен и персональные параметры хранятся в зашифрованном локальном хранилище вашего браузера. Если вы заметили подозрительный вход с чужого устройства — нажмите «Завершить все другие сеансы».
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. TAB 3: USER AGREEMENT, PRIVACY POLICY & CONSENTS */}
      {/* ========================================================= */}
      {activeSubTab === 'agreements' && (
        <div className="space-y-6">
          
          {/* Prominent Warning Banner if Access is Restricted */}
          {isRestricted && (
            <div className="p-4 sm:p-5 bg-rose-950/60 border-2 border-rose-600/80 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 text-rose-200 animate-fade-in shadow-xl">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-rose-900/70 border border-rose-500/60 flex items-center justify-center shrink-0 text-rose-300 mt-0.5">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="text-xs space-y-1">
                  <span className="font-bold text-white text-sm sm:text-base block">
                    Доступ к калькулятору и функциям заблокирован!
                  </span>
                  <p className="text-neutral-300 text-xs leading-relaxed max-w-xl">
                    Вы отозвали обязательные согласия или соглашения. В соответствии с правилами сервиса и ФЗ-152, расчет смен, радар заказов, параметры авто и оптимизатор отключены до повторного подтверждения согласий.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAcceptAllAgreements}
                className="w-full sm:w-auto px-5 py-3 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl text-xs sm:text-sm transition-all shrink-0 shadow-lg flex items-center justify-center gap-2 hover:scale-[1.02]"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Восстановить полный доступ</span>
              </button>
            </div>
          )}

          {/* Document preview tiles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Document 1: Terms of Service */}
            <div className={`bg-neutral-900 border rounded-2xl p-5 flex flex-col justify-between space-y-4 transition-colors ${
              !agreements.termsOfService ? 'border-rose-800/80 bg-rose-950/10' : 'border-neutral-800'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    !agreements.termsOfService 
                      ? 'bg-rose-500/10 border border-rose-500/30 text-rose-400' 
                      : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                  }`}>
                    Юридический документ
                  </span>
                  <span className="text-xs text-neutral-500 font-mono">Версия 2.4 (2026)</span>
                </div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-400" />
                  Пользовательское соглашение
                </h3>
                <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                  Правила использования сервиса ТаксиКальк PRO, условия проведения расчетов, порядок взаимодействия с агрегаторами и таксопарками.
                </p>
              </div>

              <div className="pt-2 border-t border-neutral-800 flex items-center justify-between">
                {agreements.termsOfService ? (
                  <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Принято водителем
                  </span>
                ) : (
                  <span className="text-xs text-rose-400 font-medium flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" /> Отозвано (доступ закрыт)
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setViewingDoc('terms')}
                  className="px-3 py-1.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <span>Читать соглашение</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Document 2: Privacy Policy */}
            <div className={`bg-neutral-900 border rounded-2xl p-5 flex flex-col justify-between space-y-4 transition-colors ${
              !agreements.privacyPolicy ? 'border-rose-800/80 bg-rose-950/10' : 'border-neutral-800'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    !agreements.privacyPolicy 
                      ? 'bg-rose-500/10 border border-rose-500/30 text-rose-400' 
                      : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                  }`}>
                    Защита персональных данных
                  </span>
                  <span className="text-xs text-neutral-500 font-mono">ФЗ-152 РФ</span>
                </div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  Политика конфиденциальности
                </h3>
                <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                  Порядок обработки и неразглашения персональных данных, сохранение истории заработка и защита информации от третьих лиц.
                </p>
              </div>

              <div className="pt-2 border-t border-neutral-800 flex items-center justify-between">
                {agreements.privacyPolicy ? (
                  <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Соблюдается
                  </span>
                ) : (
                  <span className="text-xs text-rose-400 font-medium flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" /> Отозвано (доступ закрыт)
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setViewingDoc('privacy')}
                  className="px-3 py-1.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <span>Читать политику</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>

          {/* Interactive Consent Checkboxes */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-400" />
                Управление согласиями водителя
              </h3>
              {isRestricted && (
                <button
                  type="button"
                  onClick={handleAcceptAllAgreements}
                  className="text-xs text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-4"
                >
                  Принять все
                </button>
              )}
            </div>

            <div className="space-y-3 text-xs">
              
              {/* Checkbox 1: Terms */}
              <label className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                !agreements.termsOfService
                  ? 'bg-rose-950/30 border-rose-700/80 ring-1 ring-rose-500/30'
                  : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700'
              }`}>
                <input
                  type="checkbox"
                  checked={agreements.termsOfService}
                  onChange={(e) => handleToggleAgreement('termsOfService', e.target.checked)}
                  className="mt-0.5 rounded border-neutral-700 text-amber-500 focus:ring-0 focus:outline-none cursor-pointer"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-white block">
                      Согласие с условиями Пользовательского соглашения сервиса
                    </span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                      !agreements.termsOfService 
                        ? 'bg-rose-900/60 text-rose-300 border border-rose-700' 
                        : 'bg-neutral-900 text-neutral-400 border border-neutral-800'
                    }`}>
                      {!agreements.termsOfService ? 'Отозвано ✕' : 'Обязательно'}
                    </span>
                  </div>
                  <span className="text-[11px] text-neutral-400 mt-0.5 block">
                    Определяет порядок проведения математических расчетов стоимости 1 км, себестоимости смен и использования радара заказов.
                  </span>
                  {!agreements.termsOfService && (
                    <span className="text-[11px] text-rose-400 font-medium mt-1 block">
                      ⚠️ Без этого согласия расчеты смен и радар заказов не могут функционировать.
                    </span>
                  )}
                </div>
              </label>

              {/* Checkbox 2: Data Processing */}
              <label className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                !agreements.dataProcessing
                  ? 'bg-rose-950/30 border-rose-700/80 ring-1 ring-rose-500/30'
                  : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700'
              }`}>
                <input
                  type="checkbox"
                  checked={agreements.dataProcessing}
                  onChange={(e) => handleToggleAgreement('dataProcessing', e.target.checked)}
                  className="mt-0.5 rounded border-neutral-700 text-amber-500 focus:ring-0 focus:outline-none cursor-pointer"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-white block">
                      Согласие на обработку персональных данных (ФЗ-152)
                    </span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                      !agreements.dataProcessing 
                        ? 'bg-rose-900/60 text-rose-300 border border-rose-700' 
                        : 'bg-neutral-900 text-neutral-400 border border-neutral-800'
                    }`}>
                      {!agreements.dataProcessing ? 'Отозвано ✕' : 'Обязательно'}
                    </span>
                  </div>
                  <span className="text-[11px] text-neutral-400 mt-0.5 block">
                    Разрешает безопасное сохранение ФИО, города, контактов и адреса для персонализации аккаунта в приложении.
                  </span>
                  {!agreements.dataProcessing && (
                    <span className="text-[11px] text-rose-400 font-medium mt-1 block">
                      ⚠️ Без этого согласия сервис не имеет права обрабатывать и хранить параметры вашего авто и смен.
                    </span>
                  )}
                </div>
              </label>

              {/* Checkbox 3: Privacy & Local storage */}
              <label className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                !agreements.privacyPolicy
                  ? 'bg-rose-950/30 border-rose-700/80 ring-1 ring-rose-500/30'
                  : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700'
              }`}>
                <input
                  type="checkbox"
                  checked={agreements.privacyPolicy}
                  onChange={(e) => handleToggleAgreement('privacyPolicy', e.target.checked)}
                  className="mt-0.5 rounded border-neutral-700 text-amber-500 focus:ring-0 focus:outline-none cursor-pointer"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-white block">
                      Политика локального хранения истории поездок и прибыли
                    </span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                      !agreements.privacyPolicy 
                        ? 'bg-rose-900/60 text-rose-300 border border-rose-700' 
                        : 'bg-neutral-900 text-neutral-400 border border-neutral-800'
                    }`}>
                      {!agreements.privacyPolicy ? 'Отозвано ✕' : 'Обязательно'}
                    </span>
                  </div>
                  <span className="text-[11px] text-neutral-400 mt-0.5 block">
                    Данные о вашей выручке, расходах на топливо и чистой прибыли никогда не передаются сторонним агрегаторам.
                  </span>
                  {!agreements.privacyPolicy && (
                    <span className="text-[11px] text-rose-400 font-medium mt-1 block">
                      ⚠️ Без согласия с политикой конфиденциальности сохранение журнала смен блокируется.
                    </span>
                  )}
                </div>
              </label>

            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-neutral-500 font-mono">
              <span>
                Статус согласий зафиксирован: {new Date(agreements.acceptedAt || currentUser.createdAt).toLocaleString('ru-RU')}
              </span>
              {isRestricted && (
                <button
                  type="button"
                  onClick={handleAcceptAllAgreements}
                  className="text-amber-400 hover:text-amber-300 font-sans font-semibold flex items-center gap-1 transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Восстановить все соглашения</span>
                </button>
              )}
            </div>
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* 6. MODAL: FULL DOCUMENT VIEWER (TERMS OR PRIVACY) */}
      {/* ========================================================= */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div 
            className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-neutral-800 bg-neutral-950 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-base font-bold text-white">
                    {viewingDoc === 'terms' ? 'Пользовательское соглашение' : 'Политика конфиденциальности'}
                  </h3>
                  <span className="text-[11px] text-neutral-400">ТаксиКальк PRO · Официальный текст документа</span>
                </div>
              </div>
              <button
                onClick={() => setViewingDoc(null)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Scrollable Text Content */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs text-neutral-300 leading-relaxed font-sans">
              
              {viewingDoc === 'terms' ? (
                <>
                  <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 text-[11px] text-neutral-400">
                    Настоящее Пользовательское соглашение регулирует отношения между пользователем (водителем такси / перевозчиком) и сервисом ТаксиКальк PRO по использованию расчетно-аналитического программного обеспечения.
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-bold text-white text-sm">1. Предмет соглашения</h4>
                    <p>
                      1.1. ТаксиКальк PRO предоставляет водителю доступ к инструментам персонального оперативного расчета себестоимости 1 км пути, учета смен, оценки выгодности заказов и финансового сравнения моделей владения автомобилем (собственность, кредит, аренда, раскат).
                    </p>
                    <p>
                      1.2. Приложение является аналитическим калькулятором для личного использования водителем. Приложение НЕ предназначено и не используется для ведения бухгалтерского учета, налоговой отчетности или формирования какой-либо официальной юридической документации.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-bold text-white text-sm">2. Учетная запись и права пользователя</h4>
                    <p>
                      2.1. Водитель самостоятельно определяет параметры своего автомобиля, цены на топливо, нормы расхода и комиссионные ставки своего таксопарка.
                    </p>
                    <p>
                      2.2. Пользователь самостоятельно указывает контактные данные, город и почтовый адрес исключительно для персонализации настроек и личного профиля в приложении.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-bold text-white text-sm">3. Ограничение ответственности</h4>
                    <p>
                      3.1. Все расчеты чистой прибыли, амортизации и налогов носят ознакомительный характер на основе введенных водителем параметров и не являются бухгалтерскими, налоговыми или аудиторскими документами.
                    </p>
                    <p>
                      3.2. Сервис не несет ответственности за изменения тарифных сеток или комиссионных списаний агрегаторов в режиме реального времени.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-bold text-white text-sm">4. Срок действия</h4>
                    <p>
                      4.1. Соглашение вступает в силу с момента подтверждения регистрации или начала использования калькулятора и действует бессрочно.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 text-[11px] text-neutral-400">
                    Политика обработки персональных данных разработана в строгом соответствии с Федеральным законом РФ от 27.07.2006 № 152-ФЗ «О персональных данных».
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-bold text-white text-sm">1. Категории обрабатываемых данных</h4>
                    <p>
                      1.1. Сервис обрабатывает: имя водителя, адрес электронной почты, контактный телефон, город осуществления деятельности, почтовый адрес профиля, а также параметры автомобиля и финансовые записи смен.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-bold text-white text-sm">2. Принципы локального хранения и неразглашения</h4>
                    <p>
                      2.1. Конфиденциальные данные о величине дохода, бонусах, чаевых и чистой прибыли водителя хранятся исключительно в изолированном защищенном хранилище браузера (Local Storage / Web Storage).
                    </p>
                    <p>
                      2.2. Сервис гарантирует, что финансовая статистика водителя ни при каких обстоятельствах не передается третьим лицам, таксопаркам или налоговым органам.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-bold text-white text-sm">3. Права водителя в отношении персональных данных</h4>
                    <p>
                      3.1. Водитель в любой момент вправе изменить свое фото, почтовый адрес, город или полностью экспортировать свой профиль в формате JSON.
                    </p>
                    <p>
                      3.2. Водитель имеет безусловное право на удаление своего профиля и очистку всей истории смен в один клик.
                    </p>
                  </div>
                </>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-neutral-800 bg-neutral-950 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingDoc(null)}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl text-xs transition-colors"
              >
                Понятно, закрыть
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
