import React, { useState, useEffect } from 'react';
import { LoginInput, RegisterInput, UserProfile } from '../types/auth';
import { 
  loginUser, 
  registerUser, 
  requestPasswordReset, 
  confirmPasswordReset,
  getStoredUsers,
  setActiveUser
} from '../utils/authStorage';
import { SUPER_ADMIN_EMAIL } from '../utils/securityStorage';
import { getAdmin2FAConfig, verifyAdmin2FACode, getTotpRemainingSeconds } from '../utils/totp';
import { getEmailWebmailInfo } from '../utils/emailService';
import { 
  X, 
  UserPlus, 
  LogIn, 
  CheckCircle2, 
  AlertCircle, 
  KeyRound, 
  Mail, 
  ArrowLeft, 
  Eye, 
  EyeOff, 
  Send,
  Lock,
  Sparkles,
  Smartphone,
  ShieldCheck,
  Key,
  ExternalLink
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: UserProfile) => void;
  initialMode?: 'login' | 'register';
}

type AuthMode = 'login' | 'register' | 'forgot_password' | 'enter_code' | 'admin_2fa';

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  initialMode = 'register',
}) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [city, setCity] = useState('Москва');
  const [taxiCategory, setTaxiCategory] = useState<'economy' | 'comfort' | 'comfort_plus' | 'business'>('comfort');
  const [phone, setPhone] = useState('');

  // Password Recovery States
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [maskedEmail, setMaskedEmail] = useState<string>('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Countdown timer for resending email code
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // 2FA Google Authenticator states
  const [pendingAdminUser, setPendingAdminUser] = useState<UserProfile | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(getTotpRemainingSeconds());

  useEffect(() => {
    if (mode !== 'admin_2fa') return;
    const interval = setInterval(() => {
      setRemainingSeconds(getTotpRemainingSeconds());
    }, 1000);
    return () => clearInterval(interval);
  }, [mode]);

  if (!isOpen) return null;

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!name.trim()) {
      setErrorMessage('Пожалуйста, укажите имя');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Пожалуйста, укажите корректный Email');
      return;
    }
    if (password.length < 4) {
      setErrorMessage('Пароль должен содержать не менее 4 символов');
      return;
    }

    const regData: RegisterInput = {
      name: name.trim(),
      email: email.trim(),
      password,
      city,
      taxiCategory,
      phone: phone.trim(),
    };

    const res = registerUser(regData);
    if (res.success && res.user) {
      onAuthSuccess(res.user);
      onClose();
    } else {
      setErrorMessage(res.error || 'Ошибка при регистрации');
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Заполните Email и пароль');
      return;
    }

    const loginData: LoginInput = { email: email.trim(), password };
    const res = loginUser(loginData);
    if (res.success && res.user) {
      if (res.user.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
        const twoFaConfig = getAdmin2FAConfig();
        if (twoFaConfig.enabled) {
          setPendingAdminUser(res.user);
          setMode('admin_2fa');
          setTotpCode('');
          setErrorMessage(null);
          return;
        }
      }
      onAuthSuccess(res.user);
      onClose();
    } else {
      setErrorMessage(res.error || 'Неверный логин или пароль');
    }
  };

  const handle2FASubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const clean = totpCode.trim();
    if (!clean) {
      setErrorMessage(useBackupCode ? 'Введите резервный код безопасности' : 'Введите 6-значный код Google Authenticator');
      return;
    }

    const verification = verifyAdmin2FACode(clean);
    if (verification.success && pendingAdminUser) {
      onAuthSuccess(pendingAdminUser);
      onClose();
    } else {
      setErrorMessage(verification.error || 'Неверный код Google Authenticator');
    }
  };


  // Password Recovery Handlers
  const handleRequestResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const targetEmail = (resetEmail || email).trim();
    if (!targetEmail || !targetEmail.includes('@')) {
      setErrorMessage('Укажите корректный Email адрес аккаунта');
      return;
    }

    const res = requestPasswordReset(targetEmail);
    if (res.success) {
      setResetEmail(targetEmail);
      setMaskedEmail(res.maskedEmail || targetEmail);
      setMode('enter_code');
      setResendCooldown(60);
      setSuccessMessage(`Проверочный код отправлен на почту ${res.maskedEmail || targetEmail}`);
    } else {
      setErrorMessage(res.error || 'Не удалось отправить код восстановления');
    }
  };

  const handleResendResetCode = () => {
    if (resendCooldown > 0 || !resetEmail) return;
    setErrorMessage(null);
    const res = requestPasswordReset(resetEmail);
    if (res.success) {
      setResendCooldown(60);
      setSuccessMessage(`Новый проверочный код отправлен на ${res.maskedEmail || resetEmail}`);
    } else {
      setErrorMessage(res.error || 'Не удалось повторно отправить код');
    }
  };

  const handleConfirmResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!resetCode.trim()) {
      setErrorMessage('Введите проверочный 6-значный код из письма');
      return;
    }
    if (newPassword.length < 4) {
      setErrorMessage('Новый пароль должен содержать минимум 4 символа');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMessage('Введенные пароли не совпадают');
      return;
    }

    const res = confirmPasswordReset(resetEmail, resetCode, newPassword);
    if (res.success && res.user) {
      onAuthSuccess(res.user);
      onClose();
    } else {
      setErrorMessage(res.error || 'Ошибка сброса пароля');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Tabs */}
        {mode === 'register' || mode === 'login' ? (
          <div className="flex border-b border-neutral-800 bg-neutral-950">
            <button
              onClick={() => { setMode('register'); setErrorMessage(null); setSuccessMessage(null); }}
              className={`flex-1 py-3.5 text-xs font-bold text-center transition-colors border-b-2 flex items-center justify-center gap-1.5 ${
                mode === 'register'
                  ? 'border-amber-500 text-amber-400 bg-neutral-900/40'
                  : 'border-transparent text-neutral-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              Регистрация водителя
            </button>
            <button
              onClick={() => { setMode('login'); setErrorMessage(null); setSuccessMessage(null); }}
              className={`flex-1 py-3.5 text-xs font-bold text-center transition-colors border-b-2 flex items-center justify-center gap-1.5 ${
                mode === 'login'
                  ? 'border-amber-500 text-amber-400 bg-neutral-900/40'
                  : 'border-transparent text-neutral-400 hover:text-white'
              }`}
            >
              <LogIn className="w-4 h-4" />
              Вход в систему
            </button>
            <button
              onClick={onClose}
              className="p-3 text-neutral-500 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between p-4 border-b border-neutral-800 bg-neutral-950">
            <button
              onClick={() => { setMode('login'); setErrorMessage(null); setSuccessMessage(null); }}
              className="flex items-center gap-1.5 text-xs font-semibold text-neutral-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Назад ко входу</span>
            </button>
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              {mode === 'admin_2fa' ? (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Google Authenticator (2FA)</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <span>Восстановление пароля</span>
                </>
              )}
            </span>
            <button
              onClick={onClose}
              className="p-1 text-neutral-500 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-xl text-rose-300 text-xs flex items-center gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-xl text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* 1. REGISTER MODE */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-neutral-300 font-medium mb-1">
                  Имя и фамилия водителя
                </label>
                <input
                  type="text"
                  placeholder="Иван Петров"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm focus:border-amber-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-300 font-medium mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="driver@taxi.ru"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm focus:border-amber-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-neutral-300 font-medium mb-1">
                    Пароль
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 pr-9 text-white text-sm focus:border-amber-500 focus:outline-none"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-2.5 text-neutral-500 hover:text-neutral-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-300 font-medium mb-1">
                    Город работы
                  </label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white text-xs focus:border-amber-500 focus:outline-none"
                  >
                    <option value="Москва">Москва</option>
                    <option value="Санкт-Петербург">Санкт-Петербург</option>
                    <option value="Новосибирск">Новосибирск</option>
                    <option value="Екатеринбург">Екатеринбург</option>
                    <option value="Казань">Казань</option>
                    <option value="Краснодар">Краснодар</option>
                    <option value="Нижний Новгород">Нижний Новгород</option>
                    <option value="Самара">Самара</option>
                    <option value="Ростов-на-Дону">Ростов-на-Дону</option>
                    <option value="Уфа">Уфа</option>
                    <option value="Другой город">Другой город</option>
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-300 font-medium mb-1">
                    Основной тариф
                  </label>
                  <select
                    value={taxiCategory}
                    onChange={(e) => setTaxiCategory(e.target.value as any)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white text-xs focus:border-amber-500 focus:outline-none"
                  >
                    <option value="economy">Эконом</option>
                    <option value="comfort">Комфорт</option>
                    <option value="comfort_plus">Комфорт+</option>
                    <option value="business">Бизнес</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-neutral-300 font-medium mb-1">
                  Телефон (необязательно)
                </label>
                <input
                  type="tel"
                  placeholder="+7 (999) 000-00-00"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-lg text-sm shadow transition-colors"
                >
                  Зарегистрироваться и войти
                </button>
              </div>
            </form>
          )}

          {/* 2. LOGIN MODE */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-neutral-300 font-medium mb-1">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="driver@taxi.ru"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2.5 text-white text-sm focus:border-amber-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-neutral-300 font-medium">
                    Пароль
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmail(email);
                      setMode('forgot_password');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="text-amber-400 hover:text-amber-300 transition-colors font-medium text-[11px] hover:underline"
                  >
                    Забыли пароль?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2.5 pr-9 text-white text-sm focus:border-amber-500 focus:outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 text-neutral-500 hover:text-neutral-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-lg text-sm shadow transition-colors cursor-pointer"
                >
                  Войти
                </button>
              </div>
            </form>
          )}

          {/* 3. FORGOT PASSWORD (EMAIL INPUT) */}
          {mode === 'forgot_password' && (
            <form onSubmit={handleRequestResetSubmit} className="space-y-4 text-xs">
              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3.5 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <span className="font-bold text-white block text-xs">Восстановление доступа по Email</span>
                  <p className="text-[11px] text-neutral-400 mt-0.5 leading-relaxed">
                    Введите Email, указанный при регистрации аккаунта водителя. Мы отправим 6-значный одноразовый код для подтверждения сброса пароля.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-neutral-300 font-medium mb-1">
                  Email учетной записи
                </label>
                <input
                  type="email"
                  placeholder="driver@taxi.ru"
                  value={resetEmail || email}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2.5 text-white text-sm focus:border-amber-500 focus:outline-none font-mono"
                  required
                  autoFocus
                />
              </div>

              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-lg text-sm shadow transition-colors flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Отправить код восстановления</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setMode('login'); setErrorMessage(null); }}
                  className="w-full py-2 text-neutral-400 hover:text-white text-xs font-semibold transition-colors"
                >
                  Вернуться ко входу
                </button>
              </div>
            </form>
          )}

          {/* 4. ENTER CODE & SET NEW PASSWORD */}
          {mode === 'enter_code' && (
            <form onSubmit={handleConfirmResetSubmit} className="space-y-4 text-xs">
              {/* Secure Email Delivery Confirmation Banner */}
              <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-xl p-3.5 space-y-2.5 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-300 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-emerald-400" />
                    Письмо с кодом отправлено на {maskedEmail}
                  </span>
                  <span className="text-[10px] text-neutral-400 font-mono">15 мин</span>
                </div>
                <p className="text-[11px] text-neutral-300 leading-relaxed">
                  Проверьте ваш почтовый ящик. Мы отправили одноразовый 6-значный код безопасности. Если письмо не появилось во «Входящих», проверьте папку «Спам» или «Рассылки».
                </p>
                {resetEmail && (
                  <button
                    type="button"
                    onClick={() => {
                      const info = getEmailWebmailInfo(resetEmail);
                      window.open(info.url, '_blank', 'noopener,noreferrer');
                    }}
                    className="w-full py-1.5 px-3 bg-neutral-900/90 hover:bg-neutral-800 border border-emerald-700/50 hover:border-emerald-500 rounded-lg text-emerald-300 text-xs font-medium transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    <span>Перейти в {getEmailWebmailInfo(resetEmail).name}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                  </button>
                )}
              </div>

              <div>
                <label className="block text-neutral-300 font-medium mb-1">
                  6-значный проверочный код из письма
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="000000"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white font-mono text-center tracking-widest text-lg font-bold focus:border-amber-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-neutral-300 font-medium mb-1">
                  Новый пароль (минимум 4 символа)
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 pr-9 text-white text-sm focus:border-amber-500 focus:outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2.5 top-2.5 text-neutral-500 hover:text-neutral-300"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-neutral-300 font-medium mb-1">
                  Повторите новый пароль
                </label>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm focus:border-amber-500 focus:outline-none"
                  required
                />
              </div>

              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-lg text-sm shadow transition-colors flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  <span>Сохранить пароль и войти</span>
                </button>

                <div className="flex items-center justify-between text-[11px] pt-1">
                  <button
                    type="button"
                    onClick={handleResendResetCode}
                    disabled={resendCooldown > 0}
                    className={`transition-colors ${
                      resendCooldown > 0
                        ? 'text-neutral-500 cursor-not-allowed'
                        : 'text-amber-400 hover:text-amber-300 cursor-pointer'
                    }`}
                  >
                    {resendCooldown > 0
                      ? `Отправить повторно (${resendCooldown}с)`
                      : 'Отправить код повторно'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setErrorMessage(null); }}
                    className="text-neutral-500 hover:text-white transition-colors cursor-pointer"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* 5. ADMIN 2FA GOOGLE AUTHENTICATOR */}
          {mode === 'admin_2fa' && (
            <form onSubmit={handle2FASubmit} className="space-y-4 text-xs animate-fade-in">
              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white font-semibold">
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                    <span>{useBackupCode ? 'Резервный ключ безопасности' : 'Google Authenticator'}</span>
                  </div>
                  {!useBackupCode && (
                    <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 font-mono">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                      <span>{remainingSeconds}с</span>
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  {useBackupCode
                    ? 'Введите один из ваших 8 одноразовых резервных кодов (например: ABCD-1234).'
                    : `Для администратора ${SUPER_ADMIN_EMAIL} включена двухфакторная аутентификация. Введите 6-значный код из мобильного приложения.`}
                </p>
              </div>

              <div>
                <label className="block text-neutral-300 font-medium mb-1.5">
                  {useBackupCode ? 'Резервный ключ (8 символов):' : 'Одноразовый 6-значный код TOTP:'}
                </label>
                <input
                  type="text"
                  autoFocus
                  maxLength={useBackupCode ? 12 : 6}
                  placeholder={useBackupCode ? 'XXXX-XXXX' : '000000'}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-3 text-center text-white font-mono text-xl tracking-widest focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setUseBackupCode(!useBackupCode);
                    setTotpCode('');
                    setErrorMessage(null);
                  }}
                  className="text-amber-400 hover:text-amber-300 text-[11px] flex items-center gap-1"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>{useBackupCode ? 'Ввести 6 цифр из приложения' : 'Ввести резервный ключ восстановления'}</span>
                </button>
              </div>

              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold rounded-lg text-sm shadow transition-colors flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Подтвердить и войти</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setPendingAdminUser(null);
                    setErrorMessage(null);
                  }}
                  className="w-full py-2 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Назад ко входу</span>
                </button>
              </div>
            </form>
          )}

          <div className="text-[11px] text-neutral-500 text-center pt-2">
            Регистрация сохраняет ваши персональные расчеты, журнал смен и конфигурации авто на этом устройстве.
          </div>
        </div>
      </div>
    </div>
  );
};
