import React, { useState, useId } from 'react';
import { 
  DailyShiftCalculation, 
  DailyShiftInput, 
  TariffCategory, 
  VehicleSettings 
} from '../types/taxi';
import { 
  formatCurrency, 
  formatDecimal 
} from '../utils/storage';
import { 
  DEFAULT_TARIFFS,
  FUEL_LABELS, 
  OWNERSHIP_META,
  TARIFF_LABELS 
} from '../utils/constants';
import { 
  calculateFuelCostPerKm,
  calculateMaintenanceCostPerKm,
  calculateDepreciationPerKm,
  calculateEffectiveDailyRent,
  calculateInsurancePerKm,
  calculateDailyLoanShare
} from '../utils/calculations';
import { 
  Coins, 
  Fuel, 
  Percent, 
  ShieldCheck, 
  Clock, 
  Milestone, 
  CheckCircle2, 
  Save, 
  RotateCcw, 
  Car,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Settings2,
  Wrench,
  Receipt,
  Info,
  Sparkles
} from 'lucide-react';
import { IntegratedAdBanner } from './IntegratedAdBanner';

interface ShiftCalculatorProps {
  settings: VehicleSettings;
  shiftInput: DailyShiftInput;
  setShiftInput: React.Dispatch<React.SetStateAction<DailyShiftInput>>;
  calculated: DailyShiftCalculation;
  onSaveShift: () => void;
  onResetShift: () => void;
  onGoToSettings: () => void;
}

export const ShiftCalculator: React.FC<ShiftCalculatorProps> = ({
  settings,
  shiftInput,
  setShiftInput,
  calculated,
  onSaveShift,
  onResetShift,
  onGoToSettings,
}) => {
  const [showDetailedExpenses, setShowDetailedExpenses] = useState(true);
  const [showAppliedSettingsCard, setShowAppliedSettingsCard] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const shiftHoursInputId = useId();

  const handleInputChange = (field: keyof DailyShiftInput, value: any) => {
    setShiftInput((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleQuickAddRevenue = (amount: number) => {
    setShiftInput((prev) => ({
      ...prev,
      grossRevenue: Math.max(0, prev.grossRevenue + amount),
    }));
  };

  const handleSaveWithFeedback = () => {
    onSaveShift();
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3000);
  };

  const getRateStatus = (hourly: number) => {
    if (hourly >= 650) return { color: 'text-emerald-400', label: 'Отличный доход' };
    if (hourly >= 450) return { color: 'text-amber-400', label: 'Нормальная норма' };
    return { color: 'text-rose-400', label: 'Низкая рентабельность' };
  };

  const rateStatus = getRateStatus(calculated.hourlyNetRate);

  // Active tariff category for shift
  const activeTariffCategory: TariffCategory = 
    shiftInput.tariffCategory || 
    settings.tariffSettings?.activeCategory || 
    (settings.category as TariffCategory) || 
    'economy';

  // Commission percent for active shift tariff
  const effectiveTariffCommission =
    settings.tariffSettings?.tariffs?.[activeTariffCategory]?.aggregatorCommissionPercent ??
    settings.aggregatorCommissionPercent ??
    DEFAULT_TARIFFS[activeTariffCategory]?.aggregatorCommissionPercent ??
    18.5;

  // Ownership meta from database / settings
  const ownershipInfo = OWNERSHIP_META[settings.ownershipType] || OWNERSHIP_META.rent;
  const ownershipLabel = ownershipInfo.shortName;
  const ownershipSubtext = ownershipInfo.description;

  // Tax meta
  const taxTypeLabel = 
    settings.taxType === 'self_employed_npd'
      ? 'Самозанятый (НПД)'
      : settings.taxType === 'usn_6'
      ? 'ИП (УСН 6%)'
      : settings.taxType === 'park_fleet'
      ? 'Через таксопарк'
      : settings.taxType === 'custom'
      ? 'Индивидуальный'
      : 'Без налога';

  // Fuel unit & fuel cost/km from settings
  const fuelMeta = FUEL_LABELS[settings.fuelType] || FUEL_LABELS.gasoline_95;
  const fuelCostPerKm = calculateFuelCostPerKm(settings);
  const maintCostPerKm = calculateMaintenanceCostPerKm(settings);
  const deprCostPerKm = calculateDepreciationPerKm(settings);
  const insurancePerKm = calculateInsurancePerKm(settings);
  const dailyRentCost = calculateEffectiveDailyRent(settings);
  const dailyLoanCost = calculateDailyLoanShare(settings, 24);

  return (
    <div className="space-y-6">
      
      {/* Header & Active Car Profile Banner */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs uppercase tracking-wider text-amber-500 font-bold">Текущая смена</span>
              <span className="text-neutral-600">·</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded ${ownershipInfo.badgeClass}`}>
                {ownershipLabel}
              </span>
              <span className="text-neutral-600">·</span>
              <span className="text-xs text-neutral-400">
                Тариф: <strong className="text-neutral-200">{TARIFF_LABELS[activeTariffCategory]?.name}</strong> ({effectiveTariffCommission}%)
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white mt-1">
              Калькулятор рабочей смены
            </h1>
          </div>

          {/* Active Car Profile Summary & Action */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="bg-neutral-950 border border-neutral-800 px-3.5 py-2 rounded-lg text-xs">
              <div className="flex items-center gap-1.5 text-neutral-300 font-medium">
                <Car className="w-3.5 h-3.5 text-amber-400" />
                <span>{settings.carName}</span>
                <span className="text-neutral-500 text-[11px]">({fuelMeta.name})</span>
              </div>
              <div className="text-[11px] text-neutral-400 mt-0.5">
                Себестоимость: <strong className="text-amber-400 font-mono">{calculated.costPerKm.toFixed(2)} ₽/км</strong>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAppliedSettingsCard((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-neutral-200 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 rounded-lg transition-colors whitespace-nowrap"
              title="Показать применённые параметры авто и расходов"
            >
              <Info className="w-3.5 h-3.5 text-amber-400" />
              <span>Параметры авто</span>
              {showAppliedSettingsCard ? <ChevronUp className="w-3 h-3 text-neutral-400" /> : <ChevronDown className="w-3 h-3 text-neutral-400" />}
            </button>

            <button
              type="button"
              onClick={onGoToSettings}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-neutral-950 bg-amber-500 hover:bg-amber-400 rounded-lg transition-colors whitespace-nowrap shadow-sm"
              title="Перейти в единый раздел параметров авто и затрат"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>Настроить</span>
            </button>
          </div>
        </div>

        {/* Applied Vehicle & Cost Settings Accordion Card (100% correlation) */}
        {showAppliedSettingsCard && (
          <div className="mt-4 pt-4 border-t border-neutral-800/90 text-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 font-semibold text-neutral-200">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Применённые параметры из раздела «Параметры и расходы»:</span>
              </div>
              <button
                type="button"
                onClick={onGoToSettings}
                className="text-[11px] text-amber-400 hover:text-amber-300 underline"
              >
                Редактировать параметры авто →
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {/* Box 1: Car & Ownership */}
              <div className="bg-neutral-950/70 p-2.5 rounded-lg border border-neutral-800/80">
                <div className="text-[10px] text-neutral-500 font-medium uppercase tracking-wider mb-1">
                  1. Форма владения
                </div>
                <div className="font-semibold text-white truncate">{settings.carName}</div>
                <div className="text-amber-400 font-medium text-[11px] mt-0.5">{ownershipLabel}</div>
                <div className="text-[10px] text-neutral-400 mt-1">
                  {settings.ownershipType === 'own' && (
                    <span>Амортизация: {deprCostPerKm.toFixed(2)} ₽/км</span>
                  )}
                  {settings.ownershipType === 'loan' && (
                    <span>Кредит: {Math.round(dailyLoanCost)} ₽/смена ({formatCurrency(settings.loanMonthlyPayment || 0)}/мес)</span>
                  )}
                  {settings.ownershipType === 'rent_to_own' && (
                    <span>Выкуп: {settings.rentDailyCost} ₽/сут (эфф: {dailyRentCost.toFixed(0)} ₽)</span>
                  )}
                  {settings.ownershipType === 'rent' && (
                    <span>Аренда: {settings.rentDailyCost} ₽/сут (эфф: {dailyRentCost.toFixed(0)} ₽)</span>
                  )}
                </div>
              </div>

              {/* Box 2: Fuel */}
              <div className="bg-neutral-950/70 p-2.5 rounded-lg border border-neutral-800/80">
                <div className="text-[10px] text-neutral-500 font-medium uppercase tracking-wider mb-1">
                  2. Топливо и расход
                </div>
                <div className="font-semibold text-white">{fuelMeta.name}</div>
                <div className="text-neutral-300 text-[11px] mt-0.5">
                  Расход: <strong className="text-amber-400 font-mono">{settings.fuelConsumptionPer100Km} {fuelMeta.unit}</strong>/100км
                </div>
                <div className="text-[10px] text-neutral-400 mt-1">
                  Цена: {settings.fuelPricePerUnit} ₽/{fuelMeta.unit} ({fuelCostPerKm.toFixed(2)} ₽/км)
                </div>
              </div>

              {/* Box 3: Commissions & Taxes */}
              <div className="bg-neutral-950/70 p-2.5 rounded-lg border border-neutral-800/80">
                <div className="text-[10px] text-neutral-500 font-medium uppercase tracking-wider mb-1">
                  3. Комиссии и налог
                </div>
                <div className="text-neutral-200">
                  Агрегатор: <strong className="text-amber-400 font-mono">{effectiveTariffCommission}%</strong>
                </div>
                <div className="text-[11px] text-neutral-400 mt-0.5">
                  Парк: {settings.parkCommissionPercent}% · Вывод: {settings.payoutFeePercent}%
                </div>
                <div className="text-[10px] text-neutral-400 mt-1">
                  Налог: {taxTypeLabel} ({settings.taxPercent}%)
                </div>
              </div>

              {/* Box 4: Maintenance & Overheads */}
              <div className="bg-neutral-950/70 p-2.5 rounded-lg border border-neutral-800/80">
                <div className="text-[10px] text-neutral-500 font-medium uppercase tracking-wider mb-1">
                  4. ТО и накладные
                </div>
                <div className="text-neutral-200">
                  Фонд ТО: <strong className="text-amber-400 font-mono">{maintCostPerKm.toFixed(2)} ₽/км</strong>
                </div>
                <div className="text-[11px] text-neutral-400 mt-0.5">
                  Мойка: {settings.carWashPerShift} ₽ · Мелочи: {settings.miscPerShift} ₽
                </div>
                <div className="text-[10px] text-neutral-400 mt-1">
                  ОСАГО такси: {settings.ownershipType === 'rent' ? 'оплачивает парк' : `${insurancePerKm.toFixed(2)} ₽/км`}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: Inputs on Left, Results on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column: Shift Inputs */}
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-400" />
                Выручка и доходы смены
              </h2>
              <span className="text-xs text-neutral-400">
                Дата: <span className="font-mono text-neutral-200">{shiftInput.date}</span>
              </span>
            </div>

            {/* Shift Tariff Category Selector (Directly correlated with per-tariff commissions) */}
            <div className="bg-neutral-950/70 border border-neutral-800 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-neutral-300 flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-amber-400" />
                  Тариф смены (комиссия Яндекс Про из настроек):
                </span>
                <span className="text-[11px] text-neutral-500">
                  Авто: {TARIFF_LABELS[settings.category]?.name}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['economy', 'comfort', 'comfort_plus', 'business'] as TariffCategory[]).map((cat) => {
                  const isSelected = activeTariffCategory === cat;
                  const tariffCommission = 
                    settings.tariffSettings?.tariffs?.[cat]?.aggregatorCommissionPercent ?? 
                    DEFAULT_TARIFFS[cat].aggregatorCommissionPercent;

                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleInputChange('tariffCategory', cat)}
                      className={`px-2.5 py-2 rounded-lg text-left transition-all border ${
                        isSelected
                          ? 'bg-amber-500/15 border-amber-500 ring-1 ring-amber-500/30'
                          : 'bg-neutral-900 hover:bg-neutral-850 border-neutral-800 text-neutral-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-semibold ${isSelected ? 'text-amber-400' : 'text-neutral-200'}`}>
                          {TARIFF_LABELS[cat].name}
                        </span>
                        {settings.category === cat && (
                          <span className="text-[9px] px-1 py-0.2 bg-neutral-800 text-neutral-400 rounded font-mono">
                            авто
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-mono font-medium text-neutral-400 mt-0.5">
                        {tariffCommission}%
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Gross Revenue with quick buttons */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-sm font-medium text-neutral-300">
                  Выручка по заказам (грязная)
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleQuickAddRevenue(500)}
                    className="text-xs px-2 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded border border-neutral-700 font-mono"
                  >
                    +500 ₽
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickAddRevenue(1000)}
                    className="text-xs px-2 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded border border-neutral-700 font-mono"
                  >
                    +1000 ₽
                  </button>
                </div>
              </div>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={shiftInput.grossRevenue || ''}
                  onChange={(e) => handleInputChange('grossRevenue', Number(e.target.value))}
                  placeholder="0"
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-lg px-4 py-2.5 text-lg font-mono text-white tabular-nums pr-12 transition-colors"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 font-medium">₽</span>
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                Сумма по таксометру до вычета комиссий сервиса и таксопарка
              </p>
            </div>

            {/* Bonuses and Tips in 2 columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                  Бонусы и доплаты за цели
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={shiftInput.bonuses || ''}
                    onChange={(e) => handleInputChange('bonuses', Number(e.target.value))}
                    placeholder="0"
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-lg px-3 py-2 text-base font-mono text-white tabular-nums pr-10 transition-colors"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">₽</span>
                </div>
                <span className="text-xs text-neutral-500">Гарантии, минималки, гео-бонусы</span>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                  Чаевые (наличные + безнал)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={shiftInput.tips || ''}
                    onChange={(e) => handleInputChange('tips', Number(e.target.value))}
                    placeholder="0"
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-lg px-3 py-2 text-base font-mono text-white tabular-nums pr-10 transition-colors"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">₽</span>
                </div>
                <span className="text-xs text-neutral-500">Не облагаются комиссией сервиса</span>
              </div>
            </div>

            {/* Shift Purchase Toggle (Покупка смены в сервисе) */}
            <div className="bg-neutral-950/70 border border-neutral-800/80 rounded-lg p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="useShiftPurchase"
                  checked={shiftInput.useShiftPurchase}
                  onChange={(e) => handleInputChange('useShiftPurchase', e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-neutral-900 border-neutral-700"
                />
                <div>
                  <label htmlFor="useShiftPurchase" className="text-sm font-medium text-white cursor-pointer">
                    Куплена смена без комиссии агрегатора
                  </label>
                  <p className="text-xs text-neutral-400">
                    Фиксированная покупка смены вместо {effectiveTariffCommission}%
                  </p>
                </div>
              </div>

              {shiftInput.useShiftPurchase && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-400 whitespace-nowrap">Цена смены:</span>
                  <div className="relative w-28">
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={shiftInput.shiftPurchaseCost || ''}
                      onChange={(e) => handleInputChange('shiftPurchaseCost', Number(e.target.value))}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1 text-sm font-mono text-white text-right pr-6"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 text-xs">₽</span>
                  </div>
                </div>
              )}
            </div>

            {/* Mileage & Shift Specs */}
            <div className="border-t border-neutral-800 pt-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
                <Milestone className="w-4 h-4 text-amber-400" />
                Пробег и время на смене
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">
                    Общий пробег, км
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="5"
                    value={shiftInput.totalMileageKm || ''}
                    onChange={(e) => handleInputChange('totalMileageKm', Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm font-mono text-white tabular-nums"
                  />
                  <span className="text-[11px] text-neutral-500">По одометру</span>
                </div>

                <div>
                  <label className="block text-xs text-neutral-400 mb-1">
                    Платный пробег, км
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={shiftInput.paidMileageKm || ''}
                    onChange={(e) => handleInputChange('paidMileageKm', Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm font-mono text-white tabular-nums"
                  />
                  <span className="text-[11px] text-neutral-500">С пассажиром</span>
                </div>

                <div>
                  <label htmlFor={shiftHoursInputId} className="block text-xs text-neutral-400 mb-1">
                    Часы на линии
                  </label>
                  <input
                    id={shiftHoursInputId}
                    type="number"
                    min="0.5"
                    max="24"
                    step="0.5"
                    value={shiftInput.shiftHours || ''}
                    onChange={(e) => handleInputChange('shiftHours', Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm font-mono text-white tabular-nums"
                  />
                  <span className="text-[11px] text-neutral-500">Время смены</span>
                </div>

                <div>
                  <label className="block text-xs text-neutral-400 mb-1">
                    Заказов, шт
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={shiftInput.ordersCount || ''}
                    onChange={(e) => handleInputChange('ordersCount', Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm font-mono text-white tabular-nums"
                  />
                  <span className="text-[11px] text-neutral-500">Поездок закрыто</span>
                </div>
              </div>
            </div>

            {/* Optional Overrides (Fuel check / Extra costs) */}
            <div className="border-t border-neutral-800 pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-neutral-300">
                  Фактический чек заправки или доп. траты (опционально)
                </span>
                {shiftInput.customFuelSpent != null && shiftInput.customFuelSpent > 0 && (
                  <button
                    type="button"
                    onClick={() => handleInputChange('customFuelSpent', null)}
                    className="text-[11px] text-amber-400 hover:text-amber-300 underline"
                  >
                    Сбросить на норму расхода
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">
                    Фактически заправлено (чек), ₽
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder={`По расходу (~${Math.round(calculated.fuelCost)} ₽, ${settings.fuelConsumptionPer100Km} ${fuelMeta.unit}/100км)`}
                    value={shiftInput.customFuelSpent ?? ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      handleInputChange('customFuelSpent', val === '' ? null : Number(val));
                    }}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs font-mono text-white tabular-nums placeholder:text-neutral-600"
                  />
                  <span className="text-[10px] text-neutral-500">
                    Если пусто: расчет по {settings.fuelPricePerUnit} ₽/{fuelMeta.unit}
                  </span>
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">
                    Доп. траты за смену (штраф, платка), ₽
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={shiftInput.customExpenses || ''}
                    onChange={(e) => handleInputChange('customExpenses', Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs font-mono text-white tabular-nums placeholder:text-neutral-600"
                  />
                  <span className="text-[10px] text-neutral-500">
                    Помимо мойки ({settings.carWashPerShift} ₽) и омывайки ({settings.miscPerShift} ₽)
                  </span>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={onResetShift}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-neutral-400 hover:text-white bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 rounded-lg transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Сбросить поля смены
              </button>

              <button
                type="button"
                onClick={handleSaveWithFeedback}
                className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-lg text-sm shadow-md transition-colors"
              >
                <Save className="w-4 h-4" />
                Сохранить смену в журнал
              </button>
            </div>

            {savedToast && (
              <div className="flex items-center gap-2 bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs px-3 py-2 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Смена успешно сохранена в журнал истории!</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Calculated Results & Economics */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Main Net Profit Card */}
          <div className="bg-gradient-to-b from-neutral-900 to-neutral-900/90 border border-neutral-800 rounded-xl p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider font-semibold text-neutral-400">
                Чистая прибыль на руки (в карман)
              </span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                calculated.netProfit >= 0 ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
              }`}>
                {calculated.netProfit >= 0 ? 'Прибыль' : 'Убыток'}
              </span>
            </div>

            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold font-mono text-white tabular-nums tracking-tight">
                {formatCurrency(calculated.netProfit)}
              </span>
              <span className="text-xs text-neutral-400">
                из {formatCurrency(calculated.grossIncome)} оборота
              </span>
            </div>

            {/* Income retention bar */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-neutral-400 mb-1">
                <span>Доля чистой прибыли:</span>
                <span className="font-mono tabular-nums font-semibold text-amber-400">
                  {calculated.grossIncome > 0
                    ? `${Math.round((calculated.netProfit / calculated.grossIncome) * 100)}%`
                    : '0%'}
                </span>
              </div>
              <div className="w-full h-2 bg-neutral-950 rounded-full overflow-hidden flex">
                <div 
                  className="bg-amber-500 h-full transition-all duration-300"
                  style={{ width: `${Math.max(0, Math.min(100, (calculated.netProfit / (calculated.grossIncome || 1)) * 100))}%` }}
                />
                <div 
                  className="bg-neutral-700 h-full transition-all duration-300"
                  style={{ width: `${Math.max(0, Math.min(100, (calculated.totalExpenses / (calculated.grossIncome || 1)) * 100))}%` }}
                />
              </div>
            </div>

            {/* Secondary KPIs 2x2 grid */}
            <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-neutral-800">
              <div className="bg-neutral-950/60 p-3 rounded-lg border border-neutral-800/80">
                <div className="flex items-center gap-1.5 text-xs text-neutral-400 mb-1">
                  <Clock className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Чистыми в час</span>
                </div>
                <div className="text-lg font-bold font-mono text-white tabular-nums">
                  {formatCurrency(calculated.hourlyNetRate)}
                  <span className="text-xs font-normal text-neutral-400">/ч</span>
                </div>
                <div className={`text-[11px] font-medium mt-0.5 ${rateStatus.color}`}>
                  {rateStatus.label}
                </div>
              </div>

              <div className="bg-neutral-950/60 p-3 rounded-lg border border-neutral-800/80">
                <div className="flex items-center gap-1.5 text-xs text-neutral-400 mb-1">
                  <Milestone className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Чистыми за 1 км</span>
                </div>
                <div className="text-lg font-bold font-mono text-white tabular-nums">
                  {formatDecimal(calculated.netProfitPerKm, 1)} ₽
                  <span className="text-xs font-normal text-neutral-400">/км</span>
                </div>
                <div className="text-[11px] text-neutral-400 mt-0.5">
                  Выручка: {formatDecimal(calculated.grossPerKm, 1)} ₽/км
                </div>
              </div>

              <div className="bg-neutral-950/60 p-3 rounded-lg border border-neutral-800/80">
                <div className="flex items-center gap-1.5 text-xs text-neutral-400 mb-1">
                  <Fuel className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Себестоимость км</span>
                </div>
                <div className="text-lg font-bold font-mono text-neutral-200 tabular-nums">
                  {formatDecimal(calculated.costPerKm, 2)} ₽
                  <span className="text-xs font-normal text-neutral-400">/км</span>
                </div>
                <div className="text-[11px] text-neutral-500 mt-0.5">
                  Топливо + {settings.ownershipType === 'rent' ? 'аренда' : settings.ownershipType === 'loan' ? 'кредит + ТО' : 'ТО + износ'}
                </div>
              </div>

              <div className="bg-neutral-950/60 p-3 rounded-lg border border-neutral-800/80">
                <div className="flex items-center gap-1.5 text-xs text-neutral-400 mb-1">
                  <Percent className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Полезный накат</span>
                </div>
                <div className="text-lg font-bold font-mono text-white tabular-nums">
                  {Math.round(calculated.efficiencyRatio)}%
                </div>
                <div className="text-[11px] text-neutral-400 mt-0.5">
                  {shiftInput.paidMileageKm} из {shiftInput.totalMileageKm} км
                </div>
              </div>
            </div>

            {/* Maintenance Reserve Notification (Own car, Loan, and Rent-to-own) */}
            {(settings.ownershipType === 'own' || settings.ownershipType === 'loan' || settings.ownershipType === 'rent_to_own') && calculated.maintenanceReserve > 0 && (
              <div className="mt-4 p-3 bg-amber-950/30 border border-amber-800/50 rounded-lg flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-semibold text-amber-300">
                    {settings.ownershipType === 'own' ? (
                      <>Обязательно отложить в фонд ТО и амортизации: {formatCurrency(calculated.maintenanceReserve + calculated.depreciationCost)}</>
                    ) : settings.ownershipType === 'loan' ? (
                      <>Обязательно отложить в фонд ТО автомобиля: {formatCurrency(calculated.maintenanceReserve)}</>
                    ) : (
                      <>Обязательно отложить в фонд ТО и расходников: {formatCurrency(calculated.maintenanceReserve)}</>
                    )}
                  </span>
                  <p className="text-neutral-400 mt-0.5">
                    {settings.ownershipType === 'own' ? (
                      <>
                        Фонд на ТО ({formatCurrency(calculated.maintenanceReserve)}) и амортизацию железа ({formatCurrency(calculated.depreciationCost)}) при пробеге {shiftInput.totalMileageKm} км.
                      </>
                    ) : settings.ownershipType === 'loan' ? (
                      <>
                        При автокредите авто находится в вашей собственности: отложите эту сумму на плановое ТО, замену масла, колодок и фильтров ({maintCostPerKm.toFixed(2)} ₽/км).
                      </>
                    ) : (
                      <>
                        В договоре аренды с выкупом водитель сам обслуживает авто: отложите эту сумму на масло, колодки, фильтры и резину ({maintCostPerKm.toFixed(2)} ₽/км).
                      </>
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Detailed Expenses Breakdown Waterfall */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowDetailedExpenses(!showDetailedExpenses)}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-neutral-800/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-semibold text-white">
                  Структура расходов смены: {formatCurrency(calculated.totalExpenses)}
                </span>
              </div>
              {showDetailedExpenses ? (
                <ChevronUp className="w-4 h-4 text-neutral-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-neutral-400" />
              )}
            </button>

            {showDetailedExpenses && (
              <div className="p-4 pt-0 space-y-3 text-xs border-t border-neutral-800">
                
                {/* 1. Commissions */}
                <div className="flex justify-between items-center py-1.5 border-b border-neutral-800/60">
                  <div className="space-y-0.5">
                    <span className="text-neutral-300 font-medium">Комиссии агрегатора, парка и вывод</span>
                    <div className="text-[11px] text-neutral-500">
                      {shiftInput.useShiftPurchase 
                        ? 'Куплена смена без % сервиса' 
                        : `Сервис (${TARIFF_LABELS[activeTariffCategory]?.name}): ${effectiveTariffCommission}% (${formatCurrency(calculated.aggregatorFee)})`}
                      {' · '}Парк: {settings.parkCommissionPercent}% ({formatCurrency(calculated.parkFee)})
                      {calculated.payoutFee > 0 && ` · Вывод: ${settings.payoutFeePercent}% (${formatCurrency(calculated.payoutFee)})`}
                    </div>
                  </div>
                  <span className="font-mono text-neutral-200 tabular-nums font-semibold">
                    -{formatCurrency(calculated.totalCommissions)}
                  </span>
                </div>

                {/* 2. Taxes */}
                <div className="flex justify-between items-center py-1.5 border-b border-neutral-800/60">
                  <div className="space-y-0.5">
                    <span className="text-neutral-300 font-medium">Налог ({taxTypeLabel})</span>
                    <div className="text-[11px] text-neutral-500">
                      Ставка {settings.taxPercent}% от выручки {formatCurrency(shiftInput.grossRevenue)}
                    </div>
                  </div>
                  <span className="font-mono text-neutral-200 tabular-nums font-semibold">
                    -{formatCurrency(calculated.taxAmount)}
                  </span>
                </div>

                {/* 3. Fuel */}
                <div className="flex justify-between items-center py-1.5 border-b border-neutral-800/60">
                  <div className="space-y-0.5">
                    <span className="text-neutral-300 font-medium">
                      Топливо ({fuelMeta.name})
                    </span>
                    <div className="text-[11px] text-neutral-500">
                      {shiftInput.customFuelSpent != null && shiftInput.customFuelSpent > 0 ? (
                        <span>По фактическому чеку АЗС</span>
                      ) : (
                        <span>
                          Норма {settings.fuelConsumptionPer100Km} {fuelMeta.unit}/100 км @ {settings.fuelPricePerUnit} ₽ · ~{formatDecimal(calculated.fuelLiters, 1)} {fuelMeta.unit}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="font-mono text-neutral-200 tabular-nums font-semibold">
                    -{formatCurrency(calculated.fuelCost)}
                  </span>
                </div>

                {/* 4. Car Maintenance & Depreciation or Rent according to Ownership Model */}
                {settings.ownershipType === 'own' ? (
                  <>
                    <div className="flex justify-between items-center py-1.5 border-b border-neutral-800/60">
                      <div className="space-y-0.5">
                        <span className="text-neutral-300 font-medium">Фонд планового ТО и ремонта</span>
                        <div className="text-[11px] text-neutral-500">
                          {maintCostPerKm.toFixed(2)} ₽/км × {shiftInput.totalMileageKm} км (масло, фильтры, колодки, резина)
                        </div>
                      </div>
                      <span className="font-mono text-neutral-200 tabular-nums font-semibold">
                        -{formatCurrency(calculated.maintenanceReserve)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-1.5 border-b border-neutral-800/60">
                      <div className="space-y-0.5">
                        <span className="text-neutral-300 font-medium">Амортизация (потеря рыночной стоимости)</span>
                        <div className="text-[11px] text-neutral-500">
                          {deprCostPerKm.toFixed(2)} ₽/км × {shiftInput.totalMileageKm} км пробега
                        </div>
                      </div>
                      <span className="font-mono text-neutral-200 tabular-nums font-semibold">
                        -{formatCurrency(calculated.depreciationCost)}
                      </span>
                    </div>
                  </>
                ) : settings.ownershipType === 'loan' ? (
                  <>
                    <div className="flex justify-between items-center py-1.5 border-b border-neutral-800/60">
                      <div className="space-y-0.5">
                        <span className="text-neutral-300 font-medium">Платеж по автокредиту за смену</span>
                        <div className="text-[11px] text-neutral-500">
                          {Math.round(calculated.rentCost)} ₽/смена (ежемесячный аннуитет {formatCurrency(settings.loanMonthlyPayment || 0)} / 24 смены)
                        </div>
                      </div>
                      <span className="font-mono text-neutral-200 tabular-nums font-semibold">
                        -{formatCurrency(calculated.rentCost)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-1.5 border-b border-neutral-800/60">
                      <div className="space-y-0.5">
                        <span className="text-neutral-300 font-medium">Фонд планового ТО и ремонта</span>
                        <div className="text-[11px] text-neutral-500">
                          {maintCostPerKm.toFixed(2)} ₽/км × {shiftInput.totalMileageKm} км (масло, фильтры, колодки, резина)
                        </div>
                      </div>
                      <span className="font-mono text-neutral-200 tabular-nums font-semibold">
                        -{formatCurrency(calculated.maintenanceReserve)}
                      </span>
                    </div>
                  </>
                ) : settings.ownershipType === 'rent_to_own' ? (
                  <>
                    <div className="flex justify-between items-center py-1.5 border-b border-neutral-800/60">
                      <div className="space-y-0.5">
                        <span className="text-neutral-300 font-medium">Суточный платеж аренды с выкупом</span>
                        <div className="text-[11px] text-neutral-500">
                          Аренда {settings.rentDailyCost} ₽/сут + депозит {settings.rentDepositDaily || 0} ₽ (график {settings.rentScheduleDaysOn ?? 6}/{settings.rentScheduleDaysOff ?? 1})
                        </div>
                      </div>
                      <span className="font-mono text-neutral-200 tabular-nums font-semibold">
                        -{formatCurrency(calculated.rentCost)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-1.5 border-b border-neutral-800/60">
                      <div className="space-y-0.5">
                        <span className="text-neutral-300 font-medium">Фонд ТО и расходников (за счет водителя)</span>
                        <div className="text-[11px] text-neutral-500">
                          {maintCostPerKm.toFixed(2)} ₽/км × {shiftInput.totalMileageKm} км (в выкупе авто ТО несет водитель)
                        </div>
                      </div>
                      <span className="font-mono text-neutral-200 tabular-nums font-semibold">
                        -{formatCurrency(calculated.maintenanceReserve)}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between items-center py-1.5 border-b border-neutral-800/60">
                    <div className="space-y-0.5">
                      <span className="text-neutral-300 font-medium">Аренда автомобиля за смену</span>
                      <div className="text-[11px] text-neutral-500">
                        {settings.rentDailyCost} ₽/сут + депозит {settings.rentDepositDaily || 0} ₽ (график {settings.rentScheduleDaysOn ?? 6}/{settings.rentScheduleDaysOff ?? 1}, ТО оплачивает парк)
                      </div>
                    </div>
                    <span className="font-mono text-neutral-200 tabular-nums font-semibold">
                      -{formatCurrency(calculated.rentCost)}
                    </span>
                  </div>
                )}

                {/* 5. Overhead (Car Wash, Wiper Fluid, Insurance) */}
                <div className="flex justify-between items-center py-1.5">
                  <div className="space-y-0.5">
                    <span className="text-neutral-300 font-medium">Мойка, омывайка, страховка, доп. траты</span>
                    <div className="text-[11px] text-neutral-500">
                      Мойка ({settings.carWashPerShift} ₽) + омывайка ({settings.miscPerShift} ₽)
                      {calculated.shiftInsuranceShare ? ` + ОСАГО такси (${formatCurrency(calculated.shiftInsuranceShare)})` : ''}
                      {shiftInput.customExpenses ? ` + доп (${shiftInput.customExpenses} ₽)` : ''}
                    </div>
                  </div>
                  <span className="font-mono text-neutral-200 tabular-nums font-semibold">
                    -{formatCurrency(calculated.dailyOperatingOverhead)}
                  </span>
                </div>

              </div>
            )}
          </div>

          {/* Quick Metrics Bar */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-xs">
            <span className="text-neutral-400 font-medium block mb-2">Статистика по заказам:</span>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-neutral-950 p-2 rounded">
                <span className="text-neutral-500 block text-[10px]">Средний чек</span>
                <span className="font-mono text-white font-semibold tabular-nums">
                  {formatCurrency(calculated.averageOrderCheck)}
                </span>
              </div>
              <div className="bg-neutral-950 p-2 rounded">
                <span className="text-neutral-500 block text-[10px]">Чистыми с заказа</span>
                <span className="font-mono text-amber-400 font-semibold tabular-nums">
                  {formatCurrency(calculated.averageOrderNet)}
                </span>
              </div>
              <div className="bg-neutral-950 p-2 rounded">
                <span className="text-neutral-500 block text-[10px]">Время на заказ</span>
                <span className="font-mono text-neutral-200 font-semibold tabular-nums">
                  {Math.round(calculated.averageOrderTimeMinutes)} мин
                </span>
              </div>
            </div>
          </div>

          {/* Integrated Partner Offer for Shift Calculator */}
          <IntegratedAdBanner placement="calculator" variant="compact" />

        </div>

      </div>

    </div>
  );
};
