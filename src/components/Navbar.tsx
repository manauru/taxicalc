import React from 'react';
import { 
  Calculator, 
  Radar, 
  Settings2, 
  TrendingUp, 
  History, 
  User, 
  LogOut, 
  UserPlus,
  Lock,
  LayoutDashboard
} from 'lucide-react';
import { UserProfile } from '../types/auth';
import { isUserSuperAdmin } from '../utils/securityStorage';

export type ActiveTab = 'shift_calculator' | 'order_radar' | 'vehicle_settings' | 'optimizer' | 'shift_history' | 'account' | 'admin';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  carName: string;
  costPerKm: number;
  currentUser: UserProfile | null;
  isAccessBlocked?: boolean;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  carName,
  costPerKm,
  currentUser,
  isAccessBlocked = false,
  onOpenAuth,
  onLogout,
}) => {
  const isSuperAdmin = isUserSuperAdmin(currentUser);
  const showAdminTab = isSuperAdmin;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-800/80 bg-neutral-950/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
        
        {/* Main Header Bar */}
        <div className="flex items-center justify-between gap-2 h-13 sm:h-14">
          
          {/* Brand Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-500 text-neutral-950 font-bold text-sm shadow-sm">
              🚖
            </div>
            <a 
              href="#home"
              onClick={(e) => { e.preventDefault(); setActiveTab('shift_calculator'); }}
              className="text-base sm:text-lg font-bold tracking-tight text-white whitespace-nowrap flex items-center gap-1"
            >
              <span>ТаксиКальк</span>
              <span className="text-[10px] font-extrabold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1 py-0.2 rounded">
                PRO
              </span>
            </a>
          </div>

          {/* Desktop & Tablet Navigation (Only shown for authenticated drivers) */}
          {currentUser ? (
            <nav className="hidden md:flex items-center gap-0.5 lg:gap-1 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('shift_calculator')}
                className={`flex items-center gap-1.5 px-2 lg:px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'shift_calculator'
                    ? 'bg-neutral-800 text-amber-400 font-bold'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>Калькулятор</span>
                {isAccessBlocked && <Lock className="w-3 h-3 text-rose-400 shrink-0" />}
              </button>

              <button
                onClick={() => setActiveTab('order_radar')}
                className={`flex items-center gap-1.5 px-2 lg:px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'order_radar'
                    ? 'bg-neutral-800 text-amber-400 font-bold'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                <Radar className="w-3.5 h-3.5" />
                <span>Радар</span>
                {isAccessBlocked && <Lock className="w-3 h-3 text-rose-400 shrink-0" />}
              </button>

              <button
                onClick={() => setActiveTab('vehicle_settings')}
                className={`flex items-center gap-1.5 px-2 lg:px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'vehicle_settings'
                    ? 'bg-neutral-800 text-amber-400 font-bold'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                <Settings2 className="w-3.5 h-3.5" />
                <span>Параметры</span>
                {isAccessBlocked && <Lock className="w-3 h-3 text-rose-400 shrink-0" />}
              </button>

              <button
                onClick={() => setActiveTab('optimizer')}
                className={`flex items-center gap-1.5 px-2 lg:px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'optimizer'
                    ? 'bg-neutral-800 text-amber-400 font-bold'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Оптимизатор</span>
                {isAccessBlocked && <Lock className="w-3 h-3 text-rose-400 shrink-0" />}
              </button>

              <button
                onClick={() => setActiveTab('shift_history')}
                className={`flex items-center gap-1.5 px-2 lg:px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'shift_history'
                    ? 'bg-neutral-800 text-amber-400 font-bold'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Журнал</span>
                {isAccessBlocked && <Lock className="w-3 h-3 text-rose-400 shrink-0" />}
              </button>

              <button
                onClick={() => setActiveTab('account')}
                className={`flex items-center gap-1.5 px-2 lg:px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === 'account'
                    ? 'bg-neutral-800 text-amber-400 font-bold'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Аккаунт</span>
                {isAccessBlocked && (
                  <span className="px-1 py-0.2 rounded-full text-[9px] font-bold bg-rose-950 text-rose-400 border border-rose-800">
                    !
                  </span>
                )}
              </button>

              {showAdminTab && (
                <button
                  onClick={() => setActiveTab('admin')}
                  className={`flex items-center gap-1.5 px-2 lg:px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    activeTab === 'admin'
                      ? 'bg-purple-950 text-purple-300 font-bold border border-purple-700/80 shadow-sm'
                      : 'text-neutral-400 hover:text-purple-300 hover:bg-neutral-900'
                  }`}
                  title="Панель администратора платформы"
                >
                  <LayoutDashboard className="w-3.5 h-3.5 text-purple-400" />
                  <span>Админка</span>
                </button>
              )}
            </nav>
          ) : (
            <div className="hidden md:flex items-center gap-2 text-xs text-neutral-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Платформа учета чистой прибыли и оптимизации смен для водителей такси</span>
            </div>
          )}

          {/* Right Action Zone: Car Metric + Profile / Auth */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            
            {/* Quick Car Cost Metric (only for authenticated users on large desktop) */}
            {currentUser && (
              <div 
                onClick={() => setActiveTab('vehicle_settings')}
                className="hidden 2xl:flex items-center gap-1.5 text-[11px] text-neutral-400 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 px-2 py-1 rounded-lg cursor-pointer transition-colors"
                title="Нажмите, чтобы настроить параметры авто"
              >
                <span className="truncate max-w-[85px] font-medium text-neutral-300">{carName}</span>
                <span className="text-neutral-600">·</span>
                <span className="font-mono text-amber-400 font-semibold">{costPerKm.toFixed(1)} ₽/км</span>
              </div>
            )}

            {/* Profile badge or Register/Login buttons */}
            {currentUser ? (
              <div className="flex items-center gap-1 sm:gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveTab('account')}
                  className={`flex items-center gap-1.5 border py-1 px-1.5 sm:px-2 rounded-xl text-xs transition-colors cursor-pointer text-left ${
                    activeTab === 'account'
                      ? 'bg-neutral-800 border-amber-500/80 ring-1 ring-amber-500/40'
                      : 'bg-neutral-900 hover:bg-neutral-850 border-neutral-800'
                  }`}
                  title="Личный кабинет водителя"
                >
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg overflow-hidden bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-[11px] shrink-0 border border-amber-500/30">
                    {currentUser.avatarUrl ? (
                      <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-full h-full object-cover" />
                    ) : (
                      currentUser.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="hidden lg:block text-left">
                    <span className="font-semibold text-white block leading-tight truncate max-w-[85px] text-[11px]">
                      {currentUser.name}
                    </span>
                  </div>
                </button>

                <button
                  onClick={onLogout}
                  className="p-1.5 text-neutral-400 hover:text-rose-400 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 rounded-xl transition-colors cursor-pointer"
                  title="Выйти из аккаунта"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onOpenAuth('login')}
                  className="px-3 py-1.5 text-xs font-bold text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                >
                  Войти
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAuth('register')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-neutral-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors whitespace-nowrap shadow-sm cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Регистрация</span>
                </button>
              </div>
            )}

          </div>

        </div>

        {/* Mobile Navigation Strip (Clean grid without horizontal scrollbar - Only for authenticated drivers) */}
        {currentUser && (
          <div className={`grid ${showAdminTab ? 'grid-cols-7' : 'grid-cols-6'} md:hidden border-t border-neutral-800/80 py-1 gap-0.5 w-full`}>
          <button
            onClick={() => setActiveTab('shift_calculator')}
            className={`flex flex-col items-center justify-center py-1 rounded-lg transition-colors ${
              activeTab === 'shift_calculator' 
                ? 'bg-neutral-800 text-amber-400 font-bold' 
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Calculator className="w-3.5 h-3.5 mb-0.5" />
            <span className="text-[9px] leading-tight truncate">Смена</span>
          </button>

          <button
            onClick={() => setActiveTab('order_radar')}
            className={`flex flex-col items-center justify-center py-1 rounded-lg transition-colors ${
              activeTab === 'order_radar' 
                ? 'bg-neutral-800 text-amber-400 font-bold' 
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Radar className="w-3.5 h-3.5 mb-0.5" />
            <span className="text-[9px] leading-tight truncate">Радар</span>
          </button>

          <button
            onClick={() => setActiveTab('vehicle_settings')}
            className={`flex flex-col items-center justify-center py-1 rounded-lg transition-colors ${
              activeTab === 'vehicle_settings' 
                ? 'bg-neutral-800 text-amber-400 font-bold' 
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Settings2 className="w-3.5 h-3.5 mb-0.5" />
            <span className="text-[9px] leading-tight truncate">Авто</span>
          </button>

          <button
            onClick={() => setActiveTab('optimizer')}
            className={`flex flex-col items-center justify-center py-1 rounded-lg transition-colors ${
              activeTab === 'optimizer' 
                ? 'bg-neutral-800 text-amber-400 font-bold' 
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 mb-0.5" />
            <span className="text-[9px] leading-tight truncate">Оптим</span>
          </button>

          <button
            onClick={() => setActiveTab('shift_history')}
            className={`flex flex-col items-center justify-center py-1 rounded-lg transition-colors ${
              activeTab === 'shift_history' 
                ? 'bg-neutral-800 text-amber-400 font-bold' 
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5 mb-0.5" />
            <span className="text-[9px] leading-tight truncate">Журнал</span>
          </button>

          <button
            onClick={() => setActiveTab('account')}
            className={`flex flex-col items-center justify-center py-1 rounded-lg transition-colors relative ${
              activeTab === 'account' 
                ? 'bg-neutral-800 text-amber-400 font-bold' 
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5 mb-0.5" />
            <span className="text-[9px] leading-tight truncate">Профиль</span>
            {isAccessBlocked && (
              <span className="absolute top-0.5 right-1 w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
            )}
          </button>

          {showAdminTab && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex flex-col items-center justify-center py-1 rounded-lg transition-colors ${
                activeTab === 'admin' 
                  ? 'bg-purple-950 text-purple-300 font-bold border border-purple-800' 
                  : 'text-neutral-400 hover:text-purple-300'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5 mb-0.5" />
              <span className="text-[9px] leading-tight truncate">Админ</span>
            </button>
          )}
        </div>
        )}

      </div>
    </header>
  );
};
