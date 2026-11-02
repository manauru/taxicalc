import React, { useState, useEffect } from 'react';
import { 
  DailyShiftInput, 
  ShiftRecord, 
  TariffCategory, 
  VehicleSettings 
} from './types/taxi';
import { UserProfile } from './types/auth';
import { 
  calculateDailyShift, 
  calculateFullCostPerKm 
} from './utils/calculations';
import { 
  INITIAL_SHIFT_INPUT 
} from './utils/constants';
import { 
  loadShiftsHistory, 
  loadVehicleSettings, 
  saveShiftsHistory, 
  saveVehicleSettings 
} from './utils/storage';
import { getActiveUser, logoutUser, isUserAccessRestricted, acceptAllAgreements } from './utils/authStorage';
import { Navbar, ActiveTab } from './components/Navbar';
import { ShiftCalculator } from './components/ShiftCalculator';
import { OrderRadar } from './components/OrderRadar';
import { VehicleSettingsView } from './components/VehicleSettingsView';
import { ProfitOptimizer } from './components/ProfitOptimizer';
import { ShiftHistory } from './components/ShiftHistory';
import { ShiftDetailModal } from './components/ShiftDetailModal';
import { AuthModal } from './components/AuthModal';
import { AccountProfileView } from './components/AccountProfileView';
import { AgreementsBlockedView } from './components/AgreementsBlockedView';
import { AdminPanel } from './components/AdminPanel';
import { AdminAccessGate } from './components/AdminAccessGate';
import { LandingPresentationView } from './components/LandingPresentationView';
import { isUserSuperAdmin } from './utils/securityStorage';
import { Lock } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('shift_calculator');
  const [settings, setSettings] = useState<VehicleSettings>(() => loadVehicleSettings());
  const [shifts, setShifts] = useState<ShiftRecord[]>(() => loadShiftsHistory(settings));
  const [shiftInput, setShiftInput] = useState<DailyShiftInput>(INITIAL_SHIFT_INPUT);
  const [selectedShiftForModal, setSelectedShiftForModal] = useState<ShiftRecord | null>(null);

  // Authentication state
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => getActiveUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('register');

  // Unified save settings handler
  const handleSaveSettings = (newSettings: VehicleSettings) => {
    setSettings(newSettings);
    saveVehicleSettings(newSettings);
  };

  // Real-time calculation for the active shift
  const currentCalculation = calculateDailyShift(shiftInput, settings);
  const currentCostPerKm = calculateFullCostPerKm(settings);

  // Shifts management
  const handleSaveShift = () => {
    const newRecord: ShiftRecord = {
      ...shiftInput,
      id: `shift_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: Date.now(),
      calculated: currentCalculation,
      carName: settings.carName,
      driverName: currentUser?.name || 'Илья Мартынов',
      ownershipType: settings.ownershipType,
    };

    const updatedShifts = [newRecord, ...shifts];
    setShifts(updatedShifts);
    saveShiftsHistory(updatedShifts);
  };

  const handleDeleteShift = (id: string) => {
    const updated = shifts.filter((s) => s.id !== id);
    setShifts(updated);
    saveShiftsHistory(updated);
  };

  const handleClearAllShifts = () => {
    setShifts([]);
    saveShiftsHistory([]);
  };

  const handleResetShift = () => {
    setShiftInput({
      ...INITIAL_SHIFT_INPUT,
      date: new Date().toISOString().split('T')[0],
      tariffCategory: (settings.tariffSettings?.activeCategory || settings.category || 'economy') as TariffCategory,
    });
  };

  // Auth handlers
  const handleOpenAuth = (mode: 'login' | 'register' = 'register') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleAuthSuccess = (user: UserProfile) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
  };

  // Check if driver has revoked any mandatory legal agreement
  const isAccessBlocked = isUserAccessRestricted(currentUser);

  // Strictly protect admin tab: regular users can never view or stay on admin tab
  useEffect(() => {
    if (activeTab === 'admin' && currentUser && !isUserSuperAdmin(currentUser)) {
      setActiveTab('shift_calculator');
    }
  }, [activeTab, currentUser]);

  const handleAcceptAllAgreements = () => {
    const res = acceptAllAgreements();
    if (res.success && res.user) {
      setCurrentUser(res.user);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-amber-500 selection:text-neutral-950">
      
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        carName={settings.carName}
        costPerKm={currentCostPerKm}
        currentUser={currentUser}
        isAccessBlocked={isAccessBlocked}
        onOpenAuth={handleOpenAuth}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* If user is not authenticated, show default presentation & benefits landing screen */}
        {!currentUser ? (
          <LandingPresentationView onOpenAuth={handleOpenAuth} />
        ) : isAccessBlocked && activeTab !== 'account' && activeTab !== 'admin' ? (
          <AgreementsBlockedView
            currentUser={currentUser}
            onAcceptAll={handleAcceptAllAgreements}
            onGoToAccount={() => setActiveTab('account')}
            onLogout={handleLogout}
          />
        ) : (
          <>
            {/* Module 1: Daily Shift Calculator */}
            {activeTab === 'shift_calculator' && (
              <ShiftCalculator
                settings={settings}
                shiftInput={shiftInput}
                setShiftInput={setShiftInput}
                calculated={currentCalculation}
                onSaveShift={handleSaveShift}
                onResetShift={handleResetShift}
                onGoToSettings={() => setActiveTab('vehicle_settings')}
              />
            )}

            {/* Module 2: Order / Trip Radar */}
            {activeTab === 'order_radar' && (
              <OrderRadar settings={settings} onSaveSettings={handleSaveSettings} />
            )}

            {/* Module 3: Unified Vehicle Parameters, Consumables & Static Costs */}
            {activeTab === 'vehicle_settings' && (
              <VehicleSettingsView
                currentSettings={settings}
                onSaveSettings={handleSaveSettings}
              />
            )}

            {/* Module 4: Profit Optimizer */}
            {activeTab === 'optimizer' && (
              <ProfitOptimizer
                settings={settings}
                currentUser={currentUser}
                onGoToSettings={() => setActiveTab('vehicle_settings')}
              />
            )}

            {/* Module 5: Shifts History & Analytics */}
            {activeTab === 'shift_history' && (
              <ShiftHistory
                shifts={shifts}
                onDeleteShift={handleDeleteShift}
                onClearAll={handleClearAllShifts}
                onSelectShift={(s) => setSelectedShiftForModal(s)}
              />
            )}

            {/* Module 6: Driver Account Profile & Legal Agreements */}
            {activeTab === 'account' && (
              <AccountProfileView
                currentUser={currentUser}
                settings={settings}
                shiftsCount={shifts.length}
                onUpdateUser={(updated) => setCurrentUser(updated)}
                onLogout={handleLogout}
                onOpenAuthModal={() => handleOpenAuth('login')}
                onGoToAdmin={() => setActiveTab('admin')}
              />
            )}

            {/* Module 7: SuperAdmin Platform Control Center (Restricted to single owner: imartynov04@gmail.com) */}
            {activeTab === 'admin' && (
              isUserSuperAdmin(currentUser) ? (
                <AdminPanel
                  currentUser={currentUser}
                  shifts={shifts}
                  settings={settings}
                  onUpdateShifts={(newShifts) => {
                    setShifts(newShifts);
                    saveShiftsHistory(newShifts);
                  }}
                  onUpdateSettings={(newSettings) => {
                    setSettings(newSettings);
                    saveVehicleSettings(newSettings);
                  }}
                  onSelectShift={(s) => setSelectedShiftForModal(s)}
                />
              ) : (
                <AdminAccessGate
                  currentUser={currentUser}
                  onAdminLoginSuccess={(adminUser) => setCurrentUser(adminUser)}
                  onGoToCalculator={() => setActiveTab('shift_calculator')}
                />
              )
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-900 bg-neutral-950 py-6 text-xs text-neutral-500 text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-neutral-400">ТаксиКальк PRO</span>
            <span>·</span>
            <span>Единый центр расчета себестоимости и управления прибылью водителя</span>
          </div>
          <div className="text-neutral-600">
            {currentUser ? `Аккаунт: ${currentUser.name} (${currentUser.city})` : 'Гостевой режим · Войдите для доступа к расчетам'}
          </div>
        </div>
      </footer>

      {/* Shift Detail / Receipt Modal */}
      <ShiftDetailModal
        shift={selectedShiftForModal}
        onClose={() => setSelectedShiftForModal(null)}
        settings={settings}
        currentUser={currentUser}
      />

      {/* Driver Registration & Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
        initialMode={authModalMode}
      />

    </div>
  );
}
