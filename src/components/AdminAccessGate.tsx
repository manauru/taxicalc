import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types/auth';
import { 
  loginUser, 
  requestPasswordReset, 
  confirmPasswordReset 
} from '../utils/authStorage';
import { SUPER_ADMIN_EMAIL } from '../utils/securityStorage';
import { 
  getAdmin2FAConfig, 
  verifyAdmin2FACode, 
  getTotpRemainingSeconds 
} from '../utils/totp';
import { 
  ShieldAlert, 
  Unlock, 
  KeyRound, 
  Eye, 
  EyeOff, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  Mail,
  ShieldCheck,
  Smartphone,
  Key
} from 'lucide-react';

interface AdminAccessGateProps {
  currentUser: UserProfile | null;
  onAdminLoginSuccess: (adminUser: UserProfile) => void;
  onGoToCalculator: () => void;
}

export const AdminAccessGate: React.FC<AdminAccessGateProps> = ({
  currentUser,
  onAdminLoginSuccess,
  onGoToCalculator,
}) => {
  const [mode, setMode] = useState<'login' | 'recovery' | '2fa'>('login');
  
  // Login form states
  const [email, setEmail] = useState(SUPER_ADMIN_EMAIL);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // 2FA states
  const [pendingUser, setPendingUser] = useState<UserProfile | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [totpError, setTotpError] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(getTotpRemainingSeconds());
  const [useBackupCode, setUseBackupCode] = useState(false);

  // Recovery form states
  const [recoveryEmail, setRecoveryEmail] = useState(SUPER_ADMIN_EMAIL);
  const [recoveryStep, setRecoveryStep] = useState<'request' | 'confirm'>('request');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [generatedCodeHint, setGeneratedCodeHint] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoverySuccess, setRecoverySuccess] = useState<string | null>(null);

  // Update live seconds for 2FA cycle
  useEffect(() => {
    if (mode !== '2fa') return;
    const interval = setInterval(() => {
      setRemainingSeconds(getTotpRemainingSeconds());
    }, 1000);
    return () => clearInterval(interval);
  }, [mode]);

  const handleAdminLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setLoginError('Укажите Email администратора');
      return;
    }
    if (!password) {
      setLoginError('Введите пароль администратора');
      return;
    }

    const res = loginUser({ email: cleanEmail, password });
    if (res.success && res.user) {
      if (res.user.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
        const twoFactorConfig = getAdmin2FAConfig();
        if (twoFactorConfig.enabled) {
          // Requires 2FA verification
          setPendingUser(res.user);
          setMode('2fa');
          setTotpCode('');
          setTotpError(null);
        } else {
          onAdminLoginSuccess(res.user);
        }
      } else {
        setLoginError(`У аккаунта ${res.user.email} нет прав администратора платформы`);
      }
    } else {
      setLoginError(res.error || 'Неверный логин или пароль администратора');
    }
  };

  const handle2FASubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTotpError(null);

    const clean = totpCode.trim();
    if (!clean) {
      setTotpError(useBackupCode ? 'Введите резервный код восстановления' : 'Введите 6-значный код Google Authenticator');
      return;
    }

    const verification = verifyAdmin2FACode(clean);
    if (verification.success && pendingUser) {
      onAdminLoginSuccess(pendingUser);
    } else {
      setTotpError(verification.error || 'Неверный код. Проверьте актуальность времени в Google Authenticator');
    }
  };


  const handleRequestRecovery = (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError(null);
    setRecoverySuccess(null);

    const cleanEmail = recoveryEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setRecoveryError('Укажите Email для восстановления');
      return;
    }

    const res = requestPasswordReset(cleanEmail);
    if (res.success) {
      setGeneratedCodeHint(null);
      setRecoveryStep('confirm');
      setRecoverySuccess(`Код подтверждения отправлен на доверенный почтовый адрес ${cleanEmail}. Проверьте почту.`);
    } else {
      setRecoveryError(res.error || 'Не удалось отправить код восстановления');
    }
  };

  const handleConfirmRecovery = (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError(null);

    if (!recoveryCode.trim()) {
      setRecoveryError('Введите проверочный 6-значный код');
      return;
    }
    if (newPassword.length < 4) {
      setRecoveryError('Новый пароль должен содержать не менее 4 символов');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setRecoveryError('Новый пароль и подтверждение не совпадают');
      return;
    }

    const cleanEmail = recoveryEmail.trim().toLowerCase();
    const res = confirmPasswordReset(cleanEmail, recoveryCode, newPassword);
    if (res.success && res.user) {
      const twoFactorConfig = getAdmin2FAConfig();
      if (twoFactorConfig.enabled) {
        setPendingUser(res.user);
        setMode('2fa');
      } else {
        onAdminLoginSuccess(res.user);
      }
    } else {
      setRecoveryError(res.error || 'Ошибка проверки кода восстановления');
    }
  };

  return (
    <div className="max-w-lg mx-auto my-8 p-6 sm:p-8 bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl space-y-6">
      
      {/* Top Header */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500/20 via-purple-500/20 to-neutral-800 border border-purple-500/30 flex items-center justify-center mx-auto text-purple-400 shadow-lg">
          {mode === '2fa' ? (
            <ShieldCheck className="w-8 h-8 text-emerald-400" />
          ) : (
            <ShieldAlert className="w-8 h-8 text-amber-400" />
          )}
        </div>
        <div className="flex items-center justify-center gap-2 mt-2">
          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-purple-950 text-purple-300 border border-purple-700">
            SuperAdmin Security
          </span>
          <span className="text-neutral-600">·</span>
          <span className="text-xs text-neutral-400">ТаксиКальк PRO</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-white">
          {mode === 'login' && 'Вход в панель администратора'}
          {mode === 'recovery' && 'Восстановление доступа'}
          {mode === '2fa' && 'Проверка Google Authenticator (2FA)'}
        </h2>
        <p className="text-xs text-neutral-400 max-w-sm mx-auto leading-relaxed">
          {mode === '2fa' ? (
            <>
              Для учетной записи <strong className="text-amber-400 font-mono">{SUPER_ADMIN_EMAIL}</strong> включена двухфакторная защита.
            </>
          ) : (
            <>
              Панель управления платформой доступна исключительно владельцу сервиса (
              <strong className="text-amber-400 font-mono">{SUPER_ADMIN_EMAIL}</strong>).
            </>
          )}
        </p>
      </div>

      {/* Notice if logged in as another user */}
      {currentUser && currentUser.email.toLowerCase() !== SUPER_ADMIN_EMAIL.toLowerCase() && (
        <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-2xl text-xs text-amber-200 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">
              Текущий сеанс: {currentUser.name} ({currentUser.email})
            </p>
            <p className="text-[11px] text-amber-300/80">
              Вы вошли как водитель. Для доступа к управлению сервисом выполните вход с реквизитами супер-администратора.
            </p>
          </div>
        </div>
      )}

      {/* MODE: 2FA GOOGLE AUTHENTICATOR */}
      {mode === '2fa' && (
        <form onSubmit={handle2FASubmit} className="space-y-4 animate-fade-in">
          {totpError && (
            <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-rose-300 text-xs flex items-center gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{totpError}</span>
            </div>
          )}

          <div className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-neutral-300 font-semibold">
                <Smartphone className="w-4 h-4 text-amber-400" />
                <span>{useBackupCode ? 'Резервный код безопасности' : 'Код из Google Authenticator'}</span>
              </div>
              {!useBackupCode && (
                <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  <span>цикл: {remainingSeconds}с</span>
                </div>
              )}
            </div>
            
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              {useBackupCode
                ? 'Введите один из 8 одноразовых резервных кодов (например: ABCD-1234), сохраненных при настройке 2FA.'
                : 'Откройте Google Authenticator на смартфоне и введите текущий 6-значный код для TaxiCalc PRO.'}
            </p>
          </div>

          <div className="space-y-1.5 text-xs">
            <label className="text-neutral-300 font-semibold block">
              {useBackupCode ? 'Резервный ключ (8 символов):' : 'Одноразовый 6-значный код TOTP:'}
            </label>
            <input
              type="text"
              autoFocus
              maxLength={useBackupCode ? 12 : 6}
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value)}
              placeholder={useBackupCode ? 'XXXX-XXXX' : '000000'}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-3 text-center text-white font-mono text-xl tracking-widest focus:outline-none focus:border-amber-500 shadow-inner"
              required
            />
          </div>

          <div className="flex items-center justify-between pt-1 text-xs">
            <button
              type="button"
              onClick={() => {
                setUseBackupCode(!useBackupCode);
                setTotpCode('');
                setTotpError(null);
              }}
              className="text-amber-400 hover:text-amber-300 text-[11px] flex items-center gap-1 transition-colors"
            >
              <Key className="w-3.5 h-3.5" />
              <span>{useBackupCode ? 'Использовать 6-значный код из приложения' : 'Ввести резервный ключ восстановления'}</span>
            </button>
          </div>

          <div className="pt-2 space-y-2">
            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-neutral-950 font-bold rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Подтвердить и войти в админку</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('login');
                setPendingUser(null);
                setTotpError(null);
              }}
              className="w-full py-2 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Вернуться ко вводу пароля</span>
            </button>
          </div>
        </form>
      )}

      {/* MODE: LOGIN */}
      {mode === 'login' && (
        <form onSubmit={handleAdminLoginSubmit} className="space-y-4">
          {loginError && (
            <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-rose-300 text-xs flex items-center gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <div className="space-y-1.5 text-xs">
            <label className="text-neutral-300 font-semibold flex items-center justify-between">
              <span>Email администратора:</span>
              <span className="text-[10px] text-neutral-500 font-mono">Единый аккаунт владельца</span>
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={SUPER_ADMIN_EMAIL}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-amber-500"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <label className="text-neutral-300 font-semibold">Пароль администратора:</label>
              <button
                type="button"
                onClick={() => {
                  setMode('recovery');
                  setRecoveryEmail(email || SUPER_ADMIN_EMAIL);
                  setRecoveryError(null);
                  setRecoverySuccess(null);
                }}
                className="text-[11px] text-amber-400 hover:text-amber-300 transition-colors"
              >
                Забыли пароль?
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 pr-10 text-white text-sm focus:outline-none focus:border-amber-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 space-y-2">
            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-bold rounded-xl text-sm transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
            >
              <Unlock className="w-4 h-4" />
              <span>Войти в панель администратора</span>
            </button>

            <button
              type="button"
              onClick={onGoToCalculator}
              className="w-full py-2.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Вернуться в калькулятор смены</span>
            </button>
          </div>
        </form>
      )}

      {/* MODE: RECOVERY BY EMAIL */}
      {mode === 'recovery' && (
        <div className="space-y-4 text-xs">
          {recoveryError && (
            <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-rose-300 flex items-center gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{recoveryError}</span>
            </div>
          )}

          {recoverySuccess && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-xl text-emerald-300 flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{recoverySuccess}</span>
            </div>
          )}

          {recoveryStep === 'request' ? (
            <form onSubmit={handleRequestRecovery} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-neutral-300 font-semibold">Email для восстановления:</label>
                <input
                  type="email"
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                  placeholder={SUPER_ADMIN_EMAIL}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  <span>Отправить код восстановления</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="w-full py-2.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Назад ко входу</span>
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleConfirmRecovery} className="space-y-4">
              <div className="p-3.5 bg-emerald-950/40 border border-emerald-800/60 rounded-xl space-y-1">
                <span className="text-[11px] font-bold text-emerald-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-emerald-400" />
                  Код подтверждения отправлен на {recoveryEmail}
                </span>
                <p className="text-[11px] text-neutral-300">
                  Проверьте ваш почтовый ящик (включая папку «Спам»). Введите полученный 6-значный проверочный код.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-neutral-300 font-semibold">6-значный код подтверждения:</label>
                <input
                  type="text"
                  maxLength={6}
                  value={recoveryCode}
                  onChange={(e) => setRecoveryCode(e.target.value)}
                  placeholder="123456"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-center text-white font-mono text-lg tracking-widest focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-neutral-300 font-semibold">Новый пароль:</label>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-neutral-300 font-semibold">Повтор пароля:</label>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Сохранить новый пароль и войти</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRecoveryStep('request')}
                  className="w-full py-2 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white rounded-xl text-xs font-semibold transition-colors"
                >
                  Запросить код повторно
                </button>
              </div>
            </form>
          )}
        </div>
      )}

    </div>
  );
};
