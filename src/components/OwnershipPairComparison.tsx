import React, { useState, useMemo, useEffect } from 'react';
import { 
  VehicleSettings, 
  OwnershipType, 
  FuelType 
} from '../types/taxi';
import { UserProfile } from '../types/auth';
import { 
  calculateFuelCostPerKm, 
  calculateMaintenanceCostPerKm, 
  calculateDepreciationPerKm, 
  calculateInsurancePerKm, 
  calculateFullCostPerKm,
  calculateEffectiveDailyRent,
  calculateDailyLoanShare,
  calculateCarLoan
} from '../utils/calculations';
import { 
  FUEL_LABELS, 
  DEFAULT_FUEL_PRICES, 
  DEFAULT_FUEL_CONSUMPTIONS, 
  TARIFF_LABELS 
} from '../utils/constants';
import { formatCurrency, formatDecimal } from '../utils/storage';
import { 
  getSavedComparisons, 
  saveComparison, 
  deleteComparison, 
  OwnershipComparisonRecord, 
  EVENT_COMPARISONS_UPDATED 
} from '../utils/ownershipComparisonsStorage';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import {
  Scale,
  Car,
  Fuel,
  CreditCard,
  Shield,
  Key,
  Bookmark,
  BookmarkCheck,
  Trash2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Layers,
  Calendar,
  X,
  FileText,
  DollarSign,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface OwnershipPairComparisonProps {
  settings: VehicleSettings;
  currentUser?: UserProfile | null;
  onGoToSettings?: () => void;
  simDailyMileage: number;
  simDaysPerMonth: number;
  simDailyGross: number;
  setSimDailyMileage: (val: number) => void;
  setSimDaysPerMonth: (val: number) => void;
  setSimDailyGross: (val: number) => void;
}

interface AlternativePreset {
  id: string;
  label: string;
  carName: string;
  ownershipType: OwnershipType;
  fuelType: FuelType;
  fuelConsumption: number;
  fuelPrice: number;
  carMarketValue?: number;
  residualValuePercent?: number;
  plannedUsageKm?: number;
  maintPerKm?: number;
  loanCarPrice?: number;
  loanDownPayment?: number;
  loanTermMonths?: number;
  loanAnnualRatePercent?: number;
  rentDailyCost?: number;
  rentScheduleDaysOn?: number;
  rentScheduleDaysOff?: number;
  rentDepositDaily?: number;
  buyoutDailyCost?: number;
  buyoutTermMonths?: number;
  insuranceAnnualCost?: number;
  carWashMiscPerShift?: number;
}

const OWNERSHIP_LABELS: Record<OwnershipType, string> = {
  own: 'Свой автомобиль',
  loan: 'Автокредит',
  rent: 'Парковая аренда',
  rent_to_own: 'Аренда с выкупом',
};

const ALTERNATIVE_PRESETS: AlternativePreset[] = [
  {
    id: 'haval_loan',
    label: 'Haval Jolion (Автокредит)',
    carName: 'Haval Jolion 1.5T Elite',
    ownershipType: 'loan',
    fuelType: 'gasoline_95',
    fuelConsumption: 8.8,
    fuelPrice: 64.5,
    loanCarPrice: 2250000,
    loanDownPayment: 450000,
    loanTermMonths: 36,
    loanAnnualRatePercent: 18.9,
    maintPerKm: 1.85,
    insuranceAnnualCost: 48000,
    carWashMiscPerShift: 450,
  },
  {
    id: 'chery_rent',
    label: 'Chery Tiggo 4 (Аренда 6/1)',
    carName: 'Chery Tiggo 4 Pro (Парк)',
    ownershipType: 'rent',
    fuelType: 'gasoline_92',
    fuelConsumption: 8.2,
    fuelPrice: 58.0,
    rentDailyCost: 2600,
    rentScheduleDaysOn: 6,
    rentScheduleDaysOff: 1,
    rentDepositDaily: 200,
    maintPerKm: 0,
    insuranceAnnualCost: 0,
    carWashMiscPerShift: 400,
  },
  {
    id: 'vesta_methane_own',
    label: 'Lada Vesta NG (Свой, Метан)',
    carName: 'Lada Vesta NG 1.6 (ГБО Метан)',
    ownershipType: 'own',
    fuelType: 'methane',
    fuelConsumption: 8.5,
    fuelPrice: 24.5,
    carMarketValue: 1450000,
    residualValuePercent: 35,
    plannedUsageKm: 280000,
    maintPerKm: 1.40,
    insuranceAnnualCost: 32000,
    carWashMiscPerShift: 350,
  },
  {
    id: 'geely_buyout',
    label: 'Geely Emgrand (Выкуп, Пропан)',
    carName: 'Geely Emgrand 1.5 (Раскат)',
    ownershipType: 'rent_to_own',
    fuelType: 'propane',
    fuelConsumption: 9.8,
    fuelPrice: 29.0,
    buyoutDailyCost: 2900,
    buyoutTermMonths: 30,
    maintPerKm: 1.60,
    insuranceAnnualCost: 38000,
    carWashMiscPerShift: 400,
  },
  {
    id: 'evolute_ev_own',
    label: 'Evolute i-Pro (Свой, Электро)',
    carName: 'Evolute i-Pro (Электро)',
    ownershipType: 'own',
    fuelType: 'electric',
    fuelConsumption: 15.5,
    fuelPrice: 9.5,
    carMarketValue: 2100000,
    residualValuePercent: 30,
    plannedUsageKm: 300000,
    maintPerKm: 0.95,
    insuranceAnnualCost: 35000,
    carWashMiscPerShift: 400,
  },
];

export const OwnershipPairComparison: React.FC<OwnershipPairComparisonProps> = ({
  settings,
  currentUser,
  onGoToSettings,
  simDailyMileage,
  simDaysPerMonth,
  simDailyGross,
  setSimDailyMileage,
  setSimDaysPerMonth,
  setSimDailyGross,
}) => {
  // Active sub-tab in ownership section: 'comparison' vs 'saved'
  const [activeTab, setActiveTab] = useState<'comparison' | 'saved'>('comparison');

  // Alternative Variant State
  // Default alternative is opposite of current settings
  const defaultAltType: OwnershipType = useMemo(() => {
    if (settings.ownershipType === 'own') return 'loan';
    if (settings.ownershipType === 'loan') return 'own';
    if (settings.ownershipType === 'rent') return 'loan';
    return 'own';
  }, [settings.ownershipType]);

  const [altOwnershipType, setAltOwnershipType] = useState<OwnershipType>(defaultAltType);
  const [altCarName, setAltCarName] = useState<string>('Haval Jolion 1.5T Elite');

  // Fuel configuration for alternative
  const [altFuelType, setAltFuelType] = useState<FuelType>('gasoline_95');
  const [altFuelConsumption, setAltFuelConsumption] = useState<number>(8.8);
  const [altFuelPrice, setAltFuelPrice] = useState<number>(64.5);

  // Own car parameters for alternative
  const [altCarMarketValue, setAltCarMarketValue] = useState<number>(1850000);
  const [altResidualValuePercent, setAltResidualValuePercent] = useState<number>(30);
  const [altPlannedUsageKm, setAltPlannedUsageKm] = useState<number>(250000);
  const [altMaintPerKm, setAltMaintPerKm] = useState<number>(1.85);

  // Loan parameters for alternative
  const [altLoanCarPrice, setAltLoanCarPrice] = useState<number>(2250000);
  const [altLoanDownPayment, setAltLoanDownPayment] = useState<number>(450000);
  const [altLoanTermMonths, setAltLoanTermMonths] = useState<number>(36);
  const [altLoanRatePercent, setAltLoanRatePercent] = useState<number>(18.9);
  const [altLoanMonthlyPaymentOverride, setAltLoanMonthlyPaymentOverride] = useState<number>(0);

  // Rent parameters for alternative
  const [altRentDailyCost, setAltRentDailyCost] = useState<number>(2600);
  const [altRentDaysOn, setAltRentDaysOn] = useState<number>(6);
  const [altRentDaysOff, setAltRentDaysOff] = useState<number>(1);
  const [altRentDepositDaily, setAltRentDepositDaily] = useState<number>(200);

  // Buyout (раскат) parameters for alternative
  const [altBuyoutDailyCost, setAltBuyoutDailyCost] = useState<number>(3100);
  const [altBuyoutTermMonths, setAltBuyoutTermMonths] = useState<number>(30);

  // Operational expenses for alternative
  const [altInsuranceAnnualCost, setAltInsuranceAnnualCost] = useState<number>(45000);
  const [altCarWashMiscPerShift, setAltCarWashMiscPerShift] = useState<number>(400);

  // Saved comparisons list
  const [savedComparisons, setSavedComparisons] = useState<OwnershipComparisonRecord[]>(() => 
    getSavedComparisons(currentUser?.id)
  );

  // Save Modal State
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');
  const [saveNotes, setSaveNotes] = useState('');
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Sync saved comparisons when user changes or event fires
  useEffect(() => {
    const handleSync = () => {
      setSavedComparisons(getSavedComparisons(currentUser?.id));
    };
    window.addEventListener(EVENT_COMPARISONS_UPDATED, handleSync);
    return () => window.removeEventListener(EVENT_COMPARISONS_UPDATED, handleSync);
  }, [currentUser]);

  useEffect(() => {
    setSavedComparisons(getSavedComparisons(currentUser?.id));
  }, [currentUser]);

  // Handle preset application
  const applyPreset = (preset: AlternativePreset) => {
    setAltOwnershipType(preset.ownershipType);
    setAltCarName(preset.carName);
    setAltFuelType(preset.fuelType);
    setAltFuelConsumption(preset.fuelConsumption);
    setAltFuelPrice(preset.fuelPrice);

    if (preset.carMarketValue) setAltCarMarketValue(preset.carMarketValue);
    if (preset.residualValuePercent) setAltResidualValuePercent(preset.residualValuePercent);
    if (preset.plannedUsageKm) setAltPlannedUsageKm(preset.plannedUsageKm);
    if (preset.maintPerKm !== undefined) setAltMaintPerKm(preset.maintPerKm);

    if (preset.loanCarPrice) setAltLoanCarPrice(preset.loanCarPrice);
    if (preset.loanDownPayment !== undefined) setAltLoanDownPayment(preset.loanDownPayment);
    if (preset.loanTermMonths) setAltLoanTermMonths(preset.loanTermMonths);
    if (preset.loanAnnualRatePercent) setAltLoanRatePercent(preset.loanAnnualRatePercent);

    if (preset.rentDailyCost) setAltRentDailyCost(preset.rentDailyCost);
    if (preset.rentScheduleDaysOn) setAltRentDaysOn(preset.rentScheduleDaysOn);
    if (preset.rentScheduleDaysOff !== undefined) setAltRentDaysOff(preset.rentScheduleDaysOff);
    if (preset.rentDepositDaily !== undefined) setAltRentDepositDaily(preset.rentDepositDaily);

    if (preset.buyoutDailyCost) setAltBuyoutDailyCost(preset.buyoutDailyCost);
    if (preset.buyoutTermMonths) setAltBuyoutTermMonths(preset.buyoutTermMonths);

    if (preset.insuranceAnnualCost !== undefined) setAltInsuranceAnnualCost(preset.insuranceAnnualCost);
    if (preset.carWashMiscPerShift !== undefined) setAltCarWashMiscPerShift(preset.carWashMiscPerShift);
  };

  // --------------------------------------------------------------------------
  // CALCULATIONS: BASELINE (ВАРИАНТ А - из Параметров)
  // --------------------------------------------------------------------------
  const monthlySimKm = simDailyMileage * simDaysPerMonth;
  const monthlyGrossRevenue = simDailyGross * simDaysPerMonth;

  // Commissions and taxes share (same market condition for both cars)
  const aggregatorFeePercent = settings.aggregatorCommissionPercent || 18.5;
  const parkFeePercent = settings.parkCommissionPercent || 0;
  const taxFeePercent = settings.taxPercent || 0;
  const totalDeductionsPercent = aggregatorFeePercent + parkFeePercent + taxFeePercent;
  const deductionsAmount = monthlyGrossRevenue * (totalDeductionsPercent / 100);
  const revenueAfterCommissions = monthlyGrossRevenue - deductionsAmount;

  const baselineCalc = useMemo(() => {
    const fuelCostPerKm = calculateFuelCostPerKm(settings);
    const maintCostPerKm = calculateMaintenanceCostPerKm(settings);
    const deprCostPerKm = calculateDepreciationPerKm(settings);
    const insuranceCostPerKm = calculateInsurancePerKm(settings);
    const costPerKm = calculateFullCostPerKm(settings);

    const monthlyFuel = fuelCostPerKm * monthlySimKm;
    const monthlyMaint = maintCostPerKm * monthlySimKm;
    const monthlyDepr = deprCostPerKm * monthlySimKm;
    const monthlyInsurance = settings.ownershipType === 'rent' ? 0 : (settings.insuranceAnnualCost / 12);
    const monthlyWashMisc = (settings.carWashPerShift + settings.miscPerShift) * simDaysPerMonth;

    let monthlyVehiclePayment = 0;
    if (settings.ownershipType === 'loan') {
      const dailyLoan = calculateDailyLoanShare(settings, simDaysPerMonth);
      monthlyVehiclePayment = dailyLoan * simDaysPerMonth;
    } else if (settings.ownershipType === 'rent' || settings.ownershipType === 'rent_to_own') {
      const dailyRent = calculateEffectiveDailyRent(settings);
      monthlyVehiclePayment = dailyRent * simDaysPerMonth;
    }

    const totalMonthlyExpenses = 
      monthlyFuel + 
      monthlyMaint + 
      monthlyDepr + 
      monthlyInsurance + 
      monthlyWashMisc + 
      monthlyVehiclePayment;

    const monthlyNetProfit = revenueAfterCommissions - totalMonthlyExpenses;
    const dailyNetProfit = monthlyNetProfit / Math.max(1, simDaysPerMonth);

    return {
      carName: settings.carName || 'Текущий автомобиль',
      ownershipType: settings.ownershipType,
      ownershipLabel: OWNERSHIP_LABELS[settings.ownershipType],
      fuelType: settings.fuelType,
      fuelLabel: FUEL_LABELS[settings.fuelType]?.name || settings.fuelType,
      fuelConsumption: settings.fuelConsumptionPer100Km,
      fuelPrice: settings.fuelPricePerUnit,
      costPerKm,
      fuelCostPerKm,
      maintCostPerKm,
      deprCostPerKm,
      monthlyFuel,
      monthlyMaint,
      monthlyDepr,
      monthlyInsurance,
      monthlyVehiclePayment,
      monthlyWashMisc,
      totalMonthlyExpenses,
      monthlyNetProfit,
      dailyNetProfit,
      annualNetProfit: monthlyNetProfit * 12,
    };
  }, [settings, monthlySimKm, simDaysPerMonth, revenueAfterCommissions]);

  // --------------------------------------------------------------------------
  // CALCULATIONS: ALTERNATIVE (ВАРИАНТ Б - Пользовательский вариант)
  // --------------------------------------------------------------------------
  const altCalc = useMemo(() => {
    // 1. Топливо
    const fuelCostPerKm = (altFuelConsumption / 100) * altFuelPrice;
    const monthlyFuel = fuelCostPerKm * monthlySimKm;

    // 2. Эксплуатация
    let maintCostPerKm = altOwnershipType === 'rent' ? 0 : altMaintPerKm;
    let deprCostPerKm = 0;
    let monthlyInsurance = altOwnershipType === 'rent' ? 0 : (altInsuranceAnnualCost / 12);
    let monthlyVehiclePayment = 0;

    if (altOwnershipType === 'own') {
      // Свой авто: амортизация железа
      const lossAmount = altCarMarketValue * (1 - altResidualValuePercent / 100);
      deprCostPerKm = lossAmount > 0 && altPlannedUsageKm > 0 ? lossAmount / altPlannedUsageKm : 0;
    } else if (altOwnershipType === 'loan') {
      // Автокредит: аннуитет
      if (altLoanMonthlyPaymentOverride > 0) {
        monthlyVehiclePayment = altLoanMonthlyPaymentOverride;
      } else {
        const principal = Math.max(0, altLoanCarPrice - altLoanDownPayment);
        const monthlyRate = (altLoanRatePercent / 100) / 12;
        if (principal > 0 && monthlyRate > 0 && altLoanTermMonths > 0) {
          const factor = Math.pow(1 + monthlyRate, altLoanTermMonths);
          monthlyVehiclePayment = principal * ((monthlyRate * factor) / (factor - 1));
        } else {
          monthlyVehiclePayment = principal / Math.max(1, altLoanTermMonths);
        }
      }
    } else if (altOwnershipType === 'rent') {
      // Парковая аренда: с учетом графика
      const totalCycle = altRentDaysOn + altRentDaysOff;
      const effectiveDaily = totalCycle > 0 
        ? altRentDailyCost * (altRentDaysOn / totalCycle) + altRentDepositDaily 
        : altRentDailyCost;
      monthlyVehiclePayment = effectiveDaily * simDaysPerMonth;
    } else if (altOwnershipType === 'rent_to_own') {
      // Аренда с выкупом: суточный раскат
      monthlyVehiclePayment = altBuyoutDailyCost * simDaysPerMonth;
    }

    const monthlyMaint = maintCostPerKm * monthlySimKm;
    const monthlyDepr = deprCostPerKm * monthlySimKm;
    const monthlyWashMisc = altCarWashMiscPerShift * simDaysPerMonth;

    const totalMonthlyExpenses = 
      monthlyFuel + 
      monthlyMaint + 
      monthlyDepr + 
      monthlyInsurance + 
      monthlyWashMisc + 
      monthlyVehiclePayment;

    const costPerKm = totalMonthlyExpenses / Math.max(1, monthlySimKm);
    const monthlyNetProfit = revenueAfterCommissions - totalMonthlyExpenses;
    const dailyNetProfit = monthlyNetProfit / Math.max(1, simDaysPerMonth);

    return {
      carName: altCarName || 'Альтернативный автомобиль',
      ownershipType: altOwnershipType,
      ownershipLabel: OWNERSHIP_LABELS[altOwnershipType],
      fuelType: altFuelType,
      fuelLabel: FUEL_LABELS[altFuelType]?.name || altFuelType,
      fuelConsumption: altFuelConsumption,
      fuelPrice: altFuelPrice,
      costPerKm,
      fuelCostPerKm,
      maintCostPerKm,
      deprCostPerKm,
      monthlyFuel,
      monthlyMaint,
      monthlyDepr,
      monthlyInsurance,
      monthlyVehiclePayment,
      monthlyWashMisc,
      totalMonthlyExpenses,
      monthlyNetProfit,
      dailyNetProfit,
      annualNetProfit: monthlyNetProfit * 12,
    };
  }, [
    altOwnershipType,
    altCarName,
    altFuelType,
    altFuelConsumption,
    altFuelPrice,
    altCarMarketValue,
    altResidualValuePercent,
    altPlannedUsageKm,
    altMaintPerKm,
    altLoanCarPrice,
    altLoanDownPayment,
    altLoanTermMonths,
    altLoanRatePercent,
    altLoanMonthlyPaymentOverride,
    altRentDailyCost,
    altRentDaysOn,
    altRentDaysOff,
    altRentDepositDaily,
    altBuyoutDailyCost,
    altInsuranceAnnualCost,
    altCarWashMiscPerShift,
    monthlySimKm,
    simDaysPerMonth,
    revenueAfterCommissions
  ]);

  // --------------------------------------------------------------------------
  // COMPARISON DELTAS & VERDICT
  // --------------------------------------------------------------------------
  const comparisonResult = useMemo(() => {
    const monthlyNetDiff = altCalc.monthlyNetProfit - baselineCalc.monthlyNetProfit;
    const annualNetDiff = monthlyNetDiff * 12;
    const costPerKmDiff = altCalc.costPerKm - baselineCalc.costPerKm;

    let winner: 'baseline' | 'alternative' | 'equal' = 'equal';
    let winnerLabel = 'Варианты эквивалентны по доходности';
    let verdict = '';

    if (monthlyNetDiff > 500) {
      winner = 'alternative';
      winnerLabel = `Альтернатива (${altCalc.carName}) выгоднее`;
      verdict = `Переход на ${altCalc.carName} (${altCalc.ownershipLabel}) увеличит чистую прибыль на +${formatCurrency(monthlyNetDiff)} в месяц (+${formatCurrency(annualNetDiff)} в год) за счет ${
        altCalc.costPerKm < baselineCalc.costPerKm ? 'более низкой себестоимости километра' : 'оптимальной структуры платежей'
      }.`;
    } else if (monthlyNetDiff < -500) {
      winner = 'baseline';
      winnerLabel = `Текущий авто (${baselineCalc.carName}) выгоднее`;
      verdict = `Оставаться на ${baselineCalc.carName} (${baselineCalc.ownershipLabel}) выгоднее на +${formatCurrency(Math.abs(monthlyNetDiff))} в месяц (+${formatCurrency(Math.abs(annualNetDiff))} в год). Переход на альтернативу повлечет снижение заработка.`;
    } else {
      winner = 'equal';
      winnerLabel = 'Финансовый результат практически идентичен';
      verdict = `Разница в ежемесячной чистой прибыли составляет менее 500 ₽. Выбирайте вариант, исходя из доступности первоначального капитала и удобства обслуживания.`;
    }

    return {
      monthlyNetDiff,
      annualNetDiff,
      costPerKmDiff,
      winner,
      winnerLabel,
      verdict,
    };
  }, [baselineCalc, altCalc]);

  // Chart data for visual comparison
  const chartData = useMemo(() => {
    return [
      {
        name: 'Топливо',
        [baselineCalc.carName]: Math.round(baselineCalc.monthlyFuel),
        [altCalc.carName]: Math.round(altCalc.monthlyFuel),
      },
      {
        name: 'Платеж/Амортизация',
        [baselineCalc.carName]: Math.round(baselineCalc.monthlyVehiclePayment || baselineCalc.monthlyDepr),
        [altCalc.carName]: Math.round(altCalc.monthlyVehiclePayment || altCalc.monthlyDepr),
      },
      {
        name: 'ТО и Расходники',
        [baselineCalc.carName]: Math.round(baselineCalc.monthlyMaint),
        [altCalc.carName]: Math.round(altCalc.monthlyMaint),
      },
      {
        name: 'Страховка и Мойка',
        [baselineCalc.carName]: Math.round(baselineCalc.monthlyInsurance + baselineCalc.monthlyWashMisc),
        [altCalc.carName]: Math.round(altCalc.monthlyInsurance + altCalc.monthlyWashMisc),
      },
      {
        name: 'Чистая прибыль (в карман)',
        [baselineCalc.carName]: Math.round(baselineCalc.monthlyNetProfit),
        [altCalc.carName]: Math.round(altCalc.monthlyNetProfit),
      },
    ];
  }, [baselineCalc, altCalc]);

  // Open Save Modal
  const handleOpenSaveModal = () => {
    setSaveTitle(`Сравнение: ${baselineCalc.carName} vs ${altCalc.carName} (${altCalc.ownershipLabel})`);
    setSaveNotes('');
    setIsSaveModalOpen(true);
  };

  // Perform Save
  const handleConfirmSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveTitle.trim()) return;

    saveComparison({
      userId: currentUser?.id || 'guest_user',
      userEmail: currentUser?.email || '',
      title: saveTitle.trim(),
      notes: saveNotes.trim(),
      baseline: {
        carName: baselineCalc.carName,
        ownershipType: baselineCalc.ownershipType,
        ownershipLabel: baselineCalc.ownershipLabel,
        fuelType: baselineCalc.fuelType,
        fuelLabel: baselineCalc.fuelLabel,
        fuelConsumption: baselineCalc.fuelConsumption,
        fuelPrice: baselineCalc.fuelPrice,
        costPerKm: baselineCalc.costPerKm,
        fuelCostPerKm: baselineCalc.fuelCostPerKm,
        maintenanceCostPerKm: baselineCalc.maintCostPerKm,
        depreciationCostPerKm: baselineCalc.deprCostPerKm,
        monthlyFixedCost: baselineCalc.monthlyVehiclePayment + baselineCalc.monthlyInsurance,
        monthlyExpenses: baselineCalc.totalMonthlyExpenses,
        monthlyNetProfit: baselineCalc.monthlyNetProfit,
        dailyNetProfit: baselineCalc.dailyNetProfit,
        settingsSnapshot: { ...settings },
      },
      alternative: {
        carName: altCalc.carName,
        ownershipType: altCalc.ownershipType,
        ownershipLabel: altCalc.ownershipLabel,
        fuelType: altCalc.fuelType,
        fuelLabel: altCalc.fuelLabel,
        fuelConsumption: altCalc.fuelConsumption,
        fuelPrice: altCalc.fuelPrice,
        costPerKm: altCalc.costPerKm,
        fuelCostPerKm: altCalc.fuelCostPerKm,
        maintenanceCostPerKm: altCalc.maintCostPerKm,
        depreciationCostPerKm: altCalc.deprCostPerKm,
        monthlyFixedCost: altCalc.monthlyVehiclePayment + altCalc.monthlyInsurance,
        monthlyExpenses: altCalc.totalMonthlyExpenses,
        monthlyNetProfit: altCalc.monthlyNetProfit,
        dailyNetProfit: altCalc.dailyNetProfit,
        settingsSnapshot: {
          ownershipType: altOwnershipType,
          carName: altCarName,
          fuelType: altFuelType,
          fuelConsumptionPer100Km: altFuelConsumption,
          fuelPricePerUnit: altFuelPrice,
          carMarketValue: altCarMarketValue,
          residualValuePercent: altResidualValuePercent,
          plannedUsageKm: altPlannedUsageKm,
          loanCarPrice: altLoanCarPrice,
          loanDownPayment: altLoanDownPayment,
          loanTermMonths: altLoanTermMonths,
          loanAnnualRatePercent: altLoanRatePercent,
          rentDailyCost: altOwnershipType === 'rent_to_own' ? altBuyoutDailyCost : altRentDailyCost,
          rentScheduleDaysOn: altRentDaysOn,
          rentScheduleDaysOff: altRentDaysOff,
          rentDepositDaily: altRentDepositDaily,
          buyoutTermMonths: altBuyoutTermMonths,
          insuranceAnnualCost: altInsuranceAnnualCost,
        },
      },
      simulationParams: {
        dailyMileageKm: simDailyMileage,
        daysPerMonth: simDaysPerMonth,
        dailyGrossRevenue: simDailyGross,
        monthlyKm: monthlySimKm,
        monthlyGross: monthlyGrossRevenue,
      },
      result: {
        costPerKmDiff: comparisonResult.costPerKmDiff,
        monthlyNetDiff: comparisonResult.monthlyNetDiff,
        annualNetDiff: comparisonResult.annualNetDiff,
        winner: comparisonResult.winner,
        winnerLabel: comparisonResult.winnerLabel,
        verdict: comparisonResult.verdict,
      },
    });

    setIsSaveModalOpen(false);
    setSaveToast(`Сравнительный анализ «${saveTitle.trim()}» успешно сохранен в ваш аккаунт!`);
    setTimeout(() => setSaveToast(null), 4000);
  };

  // Load a saved comparison
  const handleLoadSaved = (record: OwnershipComparisonRecord) => {
    // Restore alternative settings
    setAltOwnershipType(record.alternative.ownershipType);
    setAltCarName(record.alternative.carName);
    setAltFuelType(record.alternative.fuelType);
    setAltFuelConsumption(record.alternative.fuelConsumption);
    setAltFuelPrice(record.alternative.fuelPrice);

    const snapshot = record.alternative.settingsSnapshot || {};
    if (snapshot.carMarketValue) setAltCarMarketValue(snapshot.carMarketValue);
    if (snapshot.residualValuePercent) setAltResidualValuePercent(snapshot.residualValuePercent);
    if (snapshot.plannedUsageKm) setAltPlannedUsageKm(snapshot.plannedUsageKm);
    if (snapshot.loanCarPrice) setAltLoanCarPrice(snapshot.loanCarPrice);
    if (snapshot.loanDownPayment) setAltLoanDownPayment(snapshot.loanDownPayment);
    if (snapshot.loanTermMonths) setAltLoanTermMonths(snapshot.loanTermMonths);
    if (snapshot.loanAnnualRatePercent) setAltLoanRatePercent(snapshot.loanAnnualRatePercent);
    if (snapshot.rentDailyCost) {
      if (record.alternative.ownershipType === 'rent_to_own') {
        setAltBuyoutDailyCost(snapshot.rentDailyCost);
      } else {
        setAltRentDailyCost(snapshot.rentDailyCost);
      }
    }
    if (snapshot.rentScheduleDaysOn) setAltRentDaysOn(snapshot.rentScheduleDaysOn);
    if (snapshot.rentScheduleDaysOff !== undefined) setAltRentDaysOff(snapshot.rentScheduleDaysOff);
    if (snapshot.rentDepositDaily !== undefined) setAltRentDepositDaily(snapshot.rentDepositDaily);
    if (snapshot.buyoutTermMonths) setAltBuyoutTermMonths(snapshot.buyoutTermMonths);
    if (snapshot.insuranceAnnualCost !== undefined) setAltInsuranceAnnualCost(snapshot.insuranceAnnualCost);

    // Restore simulation params if provided
    if (record.simulationParams) {
      if (record.simulationParams.dailyMileageKm) setSimDailyMileage(record.simulationParams.dailyMileageKm);
      if (record.simulationParams.daysPerMonth) setSimDaysPerMonth(record.simulationParams.daysPerMonth);
      if (record.simulationParams.dailyGrossRevenue) setSimDailyGross(record.simulationParams.dailyGrossRevenue);
    }

    setActiveTab('comparison');
    setSaveToast(`Анализ «${record.title}» загружен в сравнительный калькулятор.`);
    setTimeout(() => setSaveToast(null), 3500);
  };

  // Delete a saved comparison
  const handleDelete = (id: string) => {
    deleteComparison(id, currentUser?.id);
    setDeleteConfirmId(null);
    setSaveToast('Анализ удален из аккаунта.');
    setTimeout(() => setSaveToast(null), 3000);
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 sm:p-6 space-y-6 shadow-xl relative overflow-hidden">
      
      {/* Toast Notification */}
      {saveToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-950 border border-emerald-700/80 text-emerald-200 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-fade-in text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{saveToast}</span>
          <button onClick={() => setSaveToast(null)} className="text-emerald-400 hover:text-white ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Header & Tab Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg sm:text-xl font-bold text-white">
              Сравнение типов владения автомобилем
            </h2>
          </div>
          <p className="text-xs text-neutral-400 mt-1 max-w-2xl">
            Сравните ваш текущий автомобиль из раздела «Параметры» с любой альтернативой (автокредит, аренда, выкуп, свой авто с другим топливом) и сохраните анализ в свой аккаунт.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          <button
            onClick={() => setActiveTab('comparison')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'comparison'
                ? 'bg-amber-500 text-neutral-950 font-bold shadow'
                : 'bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Сравнение вариантов</span>
          </button>

          <button
            onClick={() => setActiveTab('saved')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'saved'
                ? 'bg-amber-500 text-neutral-950 font-bold shadow'
                : 'bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Сохраненные анализы</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
              activeTab === 'saved' ? 'bg-neutral-950 text-amber-400' : 'bg-neutral-800 text-neutral-300'
            }`}>
              {savedComparisons.length}
            </span>
          </button>

          <button
            onClick={handleOpenSaveModal}
            className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow cursor-pointer ml-auto sm:ml-0"
            title="Сохранить текущее сравнение в ваш аккаунт"
          >
            <BookmarkCheck className="w-3.5 h-3.5" />
            <span>Сохранить в аккаунт</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: COMPARISON CALCULATOR */}
      {/* ========================================================================= */}
      {activeTab === 'comparison' && (
        <div className="space-y-6">

          {/* Quick Presets for Alternative Variant */}
          <div className="bg-neutral-950 border border-neutral-800/80 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-neutral-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Быстрые шаблоны для Альтернативного варианта:
              </span>
              <span className="text-[11px] text-neutral-500">Нажмите для мгновенного заполнения</span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              {ALTERNATIVE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-amber-500/50 rounded-lg text-neutral-300 hover:text-white whitespace-nowrap transition-all font-medium text-[11px] cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Side-by-Side Dual Setup Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            
            {/* ------------------------------------------------------------- */}
            {/* LEFT COLUMN: VARIANT A (Baseline from «Параметры») */}
            {/* ------------------------------------------------------------- */}
            <div className="bg-neutral-950 border-2 border-emerald-600/40 rounded-2xl p-5 space-y-4 relative flex flex-col justify-between shadow-lg">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 border-b border-neutral-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-700 font-mono text-[10px] font-bold uppercase tracking-wider">
                        ★ ВАРИАНТ А: ИЗ ПАРАМЕТРОВ
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white mt-1.5 flex items-center gap-2">
                      <Car className="w-5 h-5 text-emerald-400" />
                      {baselineCalc.carName}
                    </h3>
                    <div className="text-xs text-neutral-400 mt-0.5">
                      Форма владения: <strong className="text-emerald-300">{baselineCalc.ownershipLabel}</strong>
                    </div>
                  </div>

                  {onGoToSettings && (
                    <button
                      type="button"
                      onClick={onGoToSettings}
                      className="px-2.5 py-1 text-[11px] text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-lg transition-colors cursor-pointer"
                      title="Перейти к редактированию базового автомобиля"
                    >
                      Редактировать в «Параметрах» →
                    </button>
                  )}
                </div>

                {/* Baseline Specs Breakdown */}
                <div className="space-y-2 text-xs">
                  <div className="bg-neutral-900/80 p-3 rounded-xl border border-neutral-800/80 space-y-1.5">
                    <div className="flex justify-between items-center text-neutral-300">
                      <span className="flex items-center gap-1.5 text-neutral-400">
                        <Fuel className="w-3.5 h-3.5 text-amber-400" />
                        Топливо:
                      </span>
                      <span className="font-semibold text-white">
                        {baselineCalc.fuelLabel} ({baselineCalc.fuelConsumption} {FUEL_LABELS[baselineCalc.fuelType]?.unit || 'л'}/100 км)
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-neutral-300">
                      <span className="text-neutral-400">Цена за 1 {FUEL_LABELS[baselineCalc.fuelType]?.unit || 'л'}:</span>
                      <span className="font-mono text-white font-medium">{formatDecimal(baselineCalc.fuelPrice)} ₽</span>
                    </div>
                    <div className="flex justify-between items-center text-neutral-300 border-t border-neutral-800 pt-1.5">
                      <span className="text-neutral-400">Топливо на 1 км:</span>
                      <span className="font-mono font-bold text-amber-400">{formatDecimal(baselineCalc.fuelCostPerKm)} ₽/км</span>
                    </div>
                  </div>

                  <div className="bg-neutral-900/80 p-3 rounded-xl border border-neutral-800/80 space-y-1.5">
                    <div className="flex justify-between items-center text-neutral-300">
                      <span className="text-neutral-400">ТО и расходники:</span>
                      <span className="font-mono text-white">{formatDecimal(baselineCalc.maintCostPerKm)} ₽/км</span>
                    </div>
                    {baselineCalc.ownershipType === 'own' && (
                      <div className="flex justify-between items-center text-neutral-300">
                        <span className="text-neutral-400">Амортизация железа:</span>
                        <span className="font-mono text-white">{formatDecimal(baselineCalc.deprCostPerKm)} ₽/км</span>
                      </div>
                    )}
                    {baselineCalc.ownershipType === 'loan' && (
                      <div className="flex justify-between items-center text-neutral-300">
                        <span className="text-neutral-400">Платеж по автокредиту:</span>
                        <span className="font-mono text-amber-400 font-bold">{formatCurrency(baselineCalc.monthlyVehiclePayment)}/мес</span>
                      </div>
                    )}
                    {(baselineCalc.ownershipType === 'rent' || baselineCalc.ownershipType === 'rent_to_own') && (
                      <div className="flex justify-between items-center text-neutral-300">
                        <span className="text-neutral-400">Платеж за аренду/выкуп:</span>
                        <span className="font-mono text-rose-400 font-bold">{formatCurrency(baselineCalc.monthlyVehiclePayment)}/мес</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-neutral-300">
                      <span className="text-neutral-400">ОСАГО такси в месяц:</span>
                      <span className="font-mono text-white">{formatCurrency(baselineCalc.monthlyInsurance)}</span>
                    </div>
                    <div className="flex justify-between items-center text-neutral-300">
                      <span className="text-neutral-400">Мойка и сопутствующие:</span>
                      <span className="font-mono text-white">{formatCurrency(baselineCalc.monthlyWashMisc)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Baseline Summary Metrics */}
              <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl mt-4 space-y-2.5">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-neutral-400">Себестоимость 1 км:</span>
                  <span className="text-base font-extrabold font-mono text-amber-400 tabular-nums">
                    {formatDecimal(baselineCalc.costPerKm)} ₽/км
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-neutral-400">Расходы на авто в месяц:</span>
                  <span className="text-sm font-bold font-mono text-neutral-200 tabular-nums">
                    {formatCurrency(baselineCalc.totalMonthlyExpenses)}/мес
                  </span>
                </div>
                <div className="pt-2 border-t border-neutral-800 flex justify-between items-baseline">
                  <span className="text-xs font-bold text-neutral-200">Чистая прибыль в карман:</span>
                  <span className="text-lg font-extrabold font-mono text-emerald-400 tabular-nums">
                    +{formatCurrency(baselineCalc.monthlyNetProfit)}/мес
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-neutral-400">
                  <span>За смену: <strong className="text-white font-mono">{formatCurrency(baselineCalc.dailyNetProfit)}</strong></span>
                  <span>В год: <strong className="text-emerald-400 font-mono">+{formatCurrency(baselineCalc.annualNetProfit)}</strong></span>
                </div>
              </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* RIGHT COLUMN: VARIANT B (Customizable Alternative) */}
            {/* ------------------------------------------------------------- */}
            <div className="bg-neutral-950 border-2 border-amber-500/40 rounded-2xl p-5 space-y-4 relative flex flex-col justify-between shadow-lg">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 border-b border-neutral-800 pb-3">
                  <div>
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/50 font-mono text-[10px] font-bold uppercase tracking-wider">
                      ⚡ ВАРИАНТ Б: АЛЬТЕРНАТИВА
                    </span>
                    <div className="mt-2">
                      <input
                        type="text"
                        value={altCarName}
                        onChange={(e) => setAltCarName(e.target.value)}
                        placeholder="Марка и модель авто"
                        className="bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1 text-sm font-bold text-white focus:border-amber-500 focus:outline-none w-full"
                      />
                    </div>
                  </div>

                  <span className="text-xs text-neutral-500 font-mono mt-1">
                    Сравнение
                  </span>
                </div>

                {/* Ownership Type Selector for Alternative */}
                <div>
                  <label className="block text-[11px] text-neutral-400 mb-1.5 font-medium">
                    Форма владения альтернативой:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
                    {(['own', 'loan', 'rent', 'rent_to_own'] as OwnershipType[]).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setAltOwnershipType(type)}
                        className={`py-1.5 px-2 rounded-lg font-semibold text-center transition-all cursor-pointer ${
                          altOwnershipType === type
                            ? 'bg-amber-500 text-neutral-950 shadow-md font-bold'
                            : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
                        }`}
                      >
                        {OWNERSHIP_LABELS[type]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Fuel & Consumption Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs bg-neutral-900/80 p-3 rounded-xl border border-neutral-800/80">
                  <div>
                    <label className="block text-neutral-400 text-[10px] mb-1">Тип топлива</label>
                    <select
                      value={altFuelType}
                      onChange={(e) => {
                        const newFuel = e.target.value as FuelType;
                        setAltFuelType(newFuel);
                        setAltFuelPrice(DEFAULT_FUEL_PRICES[newFuel] || 60);
                        setAltFuelConsumption(DEFAULT_FUEL_CONSUMPTIONS[newFuel] || 8.5);
                      }}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1.5 text-white text-xs focus:border-amber-500 focus:outline-none font-medium"
                    >
                      <option value="gasoline_92">АИ-92</option>
                      <option value="gasoline_95">АИ-95</option>
                      <option value="propane">Газ Пропан</option>
                      <option value="methane">Газ Метан</option>
                      <option value="diesel">Дизель</option>
                      <option value="electric">Электро</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-neutral-400 text-[10px] mb-1">
                      Расход ({FUEL_LABELS[altFuelType]?.unit || 'л'}/100км)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      value={altFuelConsumption}
                      onChange={(e) => setAltFuelConsumption(Number(e.target.value))}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1.5 text-white text-xs font-mono tabular-nums focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-neutral-400 text-[10px] mb-1">
                      Цена (₽/{FUEL_LABELS[altFuelType]?.unit || 'л'})
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      value={altFuelPrice}
                      onChange={(e) => setAltFuelPrice(Number(e.target.value))}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1.5 text-white text-xs font-mono tabular-nums focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Specific Fields depending on Alt Ownership Type */}
                <div className="bg-neutral-900/80 p-3 rounded-xl border border-neutral-800/80 space-y-2.5 text-xs">
                  {altOwnershipType === 'own' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-neutral-400 text-[10px] mb-1">Цена покупки, ₽</label>
                        <input
                          type="number"
                          step="50000"
                          value={altCarMarketValue}
                          onChange={(e) => setAltCarMarketValue(Number(e.target.value))}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-neutral-400 text-[10px] mb-1">Остаток при продаже, %</label>
                        <input
                          type="number"
                          step="5"
                          value={altResidualValuePercent}
                          onChange={(e) => setAltResidualValuePercent(Number(e.target.value))}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-neutral-400 text-[10px] mb-1">ТО и ремонт, ₽/км</label>
                        <input
                          type="number"
                          step="0.1"
                          value={altMaintPerKm}
                          onChange={(e) => setAltMaintPerKm(Number(e.target.value))}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-white font-mono"
                        />
                      </div>
                    </div>
                  )}

                  {altOwnershipType === 'loan' && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div>
                        <label className="block text-neutral-400 text-[10px] mb-1">Цена авто, ₽</label>
                        <input
                          type="number"
                          step="50000"
                          value={altLoanCarPrice}
                          onChange={(e) => setAltLoanCarPrice(Number(e.target.value))}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-white font-mono text-[11px]"
                        />
                      </div>
                      <div>
                        <label className="block text-neutral-400 text-[10px] mb-1">Первый взнос, ₽</label>
                        <input
                          type="number"
                          step="20000"
                          value={altLoanDownPayment}
                          onChange={(e) => setAltLoanDownPayment(Number(e.target.value))}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-white font-mono text-[11px]"
                        />
                      </div>
                      <div>
                        <label className="block text-neutral-400 text-[10px] mb-1">Срок кредита</label>
                        <select
                          value={altLoanTermMonths}
                          onChange={(e) => setAltLoanTermMonths(Number(e.target.value))}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-white text-[11px]"
                        >
                          <option value="24">24 мес</option>
                          <option value="36">36 мес</option>
                          <option value="48">48 мес</option>
                          <option value="60">60 мес</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-neutral-400 text-[10px] mb-1">Ставка, %</label>
                        <input
                          type="number"
                          step="0.5"
                          value={altLoanRatePercent}
                          onChange={(e) => setAltLoanRatePercent(Number(e.target.value))}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-white font-mono text-[11px]"
                        />
                      </div>
                    </div>
                  )}

                  {altOwnershipType === 'rent' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-neutral-400 text-[10px] mb-1">Аренда в сутки, ₽</label>
                        <input
                          type="number"
                          step="100"
                          value={altRentDailyCost}
                          onChange={(e) => setAltRentDailyCost(Number(e.target.value))}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-neutral-400 text-[10px] mb-1">График работы</label>
                        <div className="grid grid-cols-3 gap-1 text-[11px]">
                          {[{ on: 7, off: 0, label: '7/0' }, { on: 6, off: 1, label: '6/1' }, { on: 5, off: 2, label: '5/2' }].map((g) => (
                            <button
                              key={g.label}
                              type="button"
                              onClick={() => { setAltRentDaysOn(g.on); setAltRentDaysOff(g.off); }}
                              className={`py-1 rounded font-mono font-bold text-center ${
                                altRentDaysOn === g.on && altRentDaysOff === g.off
                                  ? 'bg-amber-500 text-neutral-950'
                                  : 'bg-neutral-950 border border-neutral-800 text-neutral-400'
                              }`}
                            >
                              {g.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-neutral-400 text-[10px] mb-1">Депозит, ₽/смена</label>
                        <input
                          type="number"
                          step="50"
                          value={altRentDepositDaily}
                          onChange={(e) => setAltRentDepositDaily(Number(e.target.value))}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-white font-mono"
                        />
                      </div>
                    </div>
                  )}

                  {altOwnershipType === 'rent_to_own' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-neutral-400 text-[10px] mb-1">Суточный выкуп, ₽/сут</label>
                        <input
                          type="number"
                          step="100"
                          value={altBuyoutDailyCost}
                          onChange={(e) => setAltBuyoutDailyCost(Number(e.target.value))}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-neutral-400 text-[10px] mb-1">Срок договора, мес</label>
                        <input
                          type="number"
                          step="6"
                          value={altBuyoutTermMonths}
                          onChange={(e) => setAltBuyoutTermMonths(Number(e.target.value))}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-white font-mono"
                        />
                      </div>
                    </div>
                  )}

                  {/* General overheads for alternative */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-neutral-800 text-[11px]">
                    <div>
                      <span className="text-neutral-400">ОСАГО такси в год:</span>
                      <input
                        type="number"
                        step="1000"
                        disabled={altOwnershipType === 'rent'}
                        value={altOwnershipType === 'rent' ? 0 : altInsuranceAnnualCost}
                        onChange={(e) => setAltInsuranceAnnualCost(Number(e.target.value))}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-0.5 text-white font-mono mt-0.5 disabled:opacity-40"
                      />
                    </div>
                    <div>
                      <span className="text-neutral-400">Мойка + омывайка/смена:</span>
                      <input
                        type="number"
                        step="50"
                        value={altCarWashMiscPerShift}
                        onChange={(e) => setAltCarWashMiscPerShift(Number(e.target.value))}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-0.5 text-white font-mono mt-0.5"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Alternative Summary Metrics */}
              <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl mt-4 space-y-2.5">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-neutral-400">Себестоимость 1 км:</span>
                  <span className="text-base font-extrabold font-mono text-amber-400 tabular-nums">
                    {formatDecimal(altCalc.costPerKm)} ₽/км
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-neutral-400">Расходы на авто в месяц:</span>
                  <span className="text-sm font-bold font-mono text-neutral-200 tabular-nums">
                    {formatCurrency(altCalc.totalMonthlyExpenses)}/мес
                  </span>
                </div>
                <div className="pt-2 border-t border-neutral-800 flex justify-between items-baseline">
                  <span className="text-xs font-bold text-neutral-200">Чистая прибыль в карман:</span>
                  <span className="text-lg font-extrabold font-mono text-emerald-400 tabular-nums">
                    +{formatCurrency(altCalc.monthlyNetProfit)}/мес
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-neutral-400">
                  <span>За смену: <strong className="text-white font-mono">{formatCurrency(altCalc.dailyNetProfit)}</strong></span>
                  <span>В год: <strong className="text-emerald-400 font-mono">+{formatCurrency(altCalc.annualNetProfit)}</strong></span>
                </div>
              </div>
            </div>

          </div>

          {/* ========================================================================= */}
          {/* WINNER SHOWCASE & VERDICT BANNER */}
          {/* ========================================================================= */}
          <div className={`p-5 rounded-2xl border transition-all ${
            comparisonResult.winner === 'alternative'
              ? 'bg-gradient-to-r from-emerald-950/60 via-neutral-900 to-amber-950/40 border-emerald-500/60'
              : comparisonResult.winner === 'baseline'
              ? 'bg-gradient-to-r from-blue-950/60 via-neutral-900 to-emerald-950/40 border-blue-500/60'
              : 'bg-neutral-950 border-neutral-800'
          }`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4" />
                    Результат сравнительного анализа
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-extrabold text-white">
                  {comparisonResult.winner === 'alternative' ? (
                    <span className="text-emerald-400">
                      ⚡ Альтернатива ({altCalc.carName}) выгоднее на +{formatCurrency(comparisonResult.monthlyNetDiff)}/мес!
                    </span>
                  ) : comparisonResult.winner === 'baseline' ? (
                    <span className="text-blue-400">
                      ★ Ваш текущий {baselineCalc.carName} выгоднее на +{formatCurrency(Math.abs(comparisonResult.monthlyNetDiff))}/мес!
                    </span>
                  ) : (
                    <span className="text-neutral-200">
                      Варианты финансово эквивалентны
                    </span>
                  )}
                </h3>
                <p className="text-xs text-neutral-300 max-w-3xl leading-relaxed">
                  {comparisonResult.verdict}
                </p>
              </div>

              <div className="shrink-0 flex flex-col sm:flex-row md:flex-col gap-2">
                <div className="bg-neutral-950/80 border border-neutral-800 px-4 py-2.5 rounded-xl text-center md:text-right">
                  <div className="text-[10px] text-neutral-400 uppercase font-semibold">Годовая дельта прибыли:</div>
                  <div className={`text-lg font-extrabold font-mono ${
                    comparisonResult.annualNetDiff > 0 ? 'text-emerald-400' : 'text-blue-400'
                  }`}>
                    {comparisonResult.annualNetDiff > 0 ? '+' : ''}{formatCurrency(comparisonResult.annualNetDiff)}/год
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleOpenSaveModal}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow cursor-pointer"
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>Сохранить этот анализ</span>
                </button>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SIDE-BY-SIDE METRICS COMPARISON TABLE */}
          {/* ========================================================================= */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden shadow">
            <div className="px-4 py-3 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-amber-400" />
                Детальная финансовая таблица сравнения статей
              </span>
              <span className="text-[11px] font-mono text-neutral-400">
                База расчета: {simDaysPerMonth} смен × {simDailyMileage} км ({monthlySimKm} км/мес)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-neutral-900/60 text-neutral-400 text-[11px] border-b border-neutral-800">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Финансовый показатель</th>
                    <th className="py-2.5 px-4 font-semibold text-emerald-400">Вариант А: {baselineCalc.carName}</th>
                    <th className="py-2.5 px-4 font-semibold text-amber-400">Вариант Б: {altCalc.carName}</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Разница (Дельта)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/80 font-mono">
                  <tr>
                    <td className="py-2.5 px-4 font-sans text-neutral-300">Форма владения</td>
                    <td className="py-2.5 px-4 text-neutral-200">{baselineCalc.ownershipLabel}</td>
                    <td className="py-2.5 px-4 text-neutral-200">{altCalc.ownershipLabel}</td>
                    <td className="py-2.5 px-4 text-right text-neutral-500">—</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-sans text-neutral-300">Себестоимость 1 км пробега</td>
                    <td className="py-2.5 px-4 text-white font-bold">{formatDecimal(baselineCalc.costPerKm)} ₽/км</td>
                    <td className="py-2.5 px-4 text-white font-bold">{formatDecimal(altCalc.costPerKm)} ₽/км</td>
                    <td className={`py-2.5 px-4 text-right font-bold ${
                      comparisonResult.costPerKmDiff < 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {comparisonResult.costPerKmDiff < 0 ? '-' : '+'}{formatDecimal(Math.abs(comparisonResult.costPerKmDiff))} ₽/км
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-sans text-neutral-300">Расходы на топливо в месяц</td>
                    <td className="py-2.5 px-4 text-neutral-200">{formatCurrency(baselineCalc.monthlyFuel)}</td>
                    <td className="py-2.5 px-4 text-neutral-200">{formatCurrency(altCalc.monthlyFuel)}</td>
                    <td className={`py-2.5 px-4 text-right ${
                      altCalc.monthlyFuel < baselineCalc.monthlyFuel ? 'text-emerald-400' : 'text-neutral-400'
                    }`}>
                      {altCalc.monthlyFuel < baselineCalc.monthlyFuel ? '-' : '+'}{formatCurrency(Math.abs(altCalc.monthlyFuel - baselineCalc.monthlyFuel))}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-sans text-neutral-300">Платеж за авто / амортизация в месяц</td>
                    <td className="py-2.5 px-4 text-neutral-200">{formatCurrency(baselineCalc.monthlyVehiclePayment || baselineCalc.monthlyDepr)}</td>
                    <td className="py-2.5 px-4 text-neutral-200">{formatCurrency(altCalc.monthlyVehiclePayment || altCalc.monthlyDepr)}</td>
                    <td className="py-2.5 px-4 text-right text-neutral-400">
                      {formatCurrency(Math.abs((altCalc.monthlyVehiclePayment || altCalc.monthlyDepr) - (baselineCalc.monthlyVehiclePayment || baselineCalc.monthlyDepr)))}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-sans text-neutral-300">ТО и запчасти в месяц</td>
                    <td className="py-2.5 px-4 text-neutral-200">{formatCurrency(baselineCalc.monthlyMaint)}</td>
                    <td className="py-2.5 px-4 text-neutral-200">{formatCurrency(altCalc.monthlyMaint)}</td>
                    <td className="py-2.5 px-4 text-right text-neutral-400">
                      {formatCurrency(Math.abs(altCalc.monthlyMaint - baselineCalc.monthlyMaint))}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-sans text-neutral-300">Страховка, мойка, сопутствующие в месяц</td>
                    <td className="py-2.5 px-4 text-neutral-200">{formatCurrency(baselineCalc.monthlyInsurance + baselineCalc.monthlyWashMisc)}</td>
                    <td className="py-2.5 px-4 text-neutral-200">{formatCurrency(altCalc.monthlyInsurance + altCalc.monthlyWashMisc)}</td>
                    <td className="py-2.5 px-4 text-right text-neutral-400">
                      {formatCurrency(Math.abs((altCalc.monthlyInsurance + altCalc.monthlyWashMisc) - (baselineCalc.monthlyInsurance + baselineCalc.monthlyWashMisc)))}
                    </td>
                  </tr>
                  <tr className="bg-neutral-900/50 font-bold border-t border-neutral-700">
                    <td className="py-2.5 px-4 font-sans text-neutral-200">ИТОГО расходы на машину в месяц</td>
                    <td className="py-2.5 px-4 text-amber-400">{formatCurrency(baselineCalc.totalMonthlyExpenses)}/мес</td>
                    <td className="py-2.5 px-4 text-amber-400">{formatCurrency(altCalc.totalMonthlyExpenses)}/мес</td>
                    <td className="py-2.5 px-4 text-right text-neutral-300">
                      {formatCurrency(Math.abs(altCalc.totalMonthlyExpenses - baselineCalc.totalMonthlyExpenses))}
                    </td>
                  </tr>
                  <tr className="bg-neutral-900/90 font-extrabold text-sm border-t border-b border-neutral-700">
                    <td className="py-3 px-4 font-sans text-white">ЧИСТАЯ ЗАРПЛАТА В КАРМАН (В МЕСЯЦ)</td>
                    <td className="py-3 px-4 text-emerald-400">+{formatCurrency(baselineCalc.monthlyNetProfit)}</td>
                    <td className="py-3 px-4 text-emerald-400">+{formatCurrency(altCalc.monthlyNetProfit)}</td>
                    <td className={`py-3 px-4 text-right ${
                      comparisonResult.monthlyNetDiff > 0 ? 'text-emerald-400' : 'text-blue-400'
                    }`}>
                      {comparisonResult.monthlyNetDiff > 0 ? '+' : ''}{formatCurrency(comparisonResult.monthlyNetDiff)}/мес
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* VISUAL RECHARTS COMPARISON CHART */}
          {/* ========================================================================= */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 sm:p-5 space-y-4 shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <BarChart className="w-4 h-4 text-amber-400" />
                Сравнение ежемесячных затрат и чистой зарплаты (₽/мес)
              </span>
              <span className="text-[11px] text-neutral-400">График расходов и прибыли</span>
            </div>

            <div className="h-64 sm:h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#737373" 
                    tick={{ fill: '#a3a3a3', fontSize: 11 }} 
                    interval={0}
                  />
                  <YAxis 
                    stroke="#737373" 
                    tick={{ fill: '#a3a3a3', fontSize: 10 }}
                    tickFormatter={(val) => `${Math.round(val / 1000)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#171717',
                      borderColor: '#404040',
                      borderRadius: '10px',
                      fontSize: '12px',
                    }}
                    formatter={(val: any) => [`${formatCurrency(Number(val))}`, '']}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar dataKey={baselineCalc.carName} fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey={altCalc.carName} fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: SAVED ANALYSES (BOUND TO ACCOUNT) */}
      {/* ========================================================================= */}
      {activeTab === 'saved' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-amber-400" />
                Сохраненные сравнительные анализы вашего аккаунта
              </h3>
              <span className="text-xs text-neutral-400">
                Привязано к аккаунту: <strong className="text-neutral-200">{currentUser?.name || 'Илья Мартынов'}</strong> ({currentUser?.email || 'imartynov04@gmail.com'})
              </span>
            </div>

            <button
              onClick={() => setActiveTab('comparison')}
              className="px-3 py-1.5 bg-neutral-950 border border-neutral-800 hover:border-neutral-700 rounded-lg text-xs font-semibold text-neutral-300 hover:text-white transition-colors cursor-pointer"
            >
              ← Вернуться к калькулятору
            </button>
          </div>

          {savedComparisons.length === 0 ? (
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto text-amber-400">
                <Bookmark className="w-6 h-6 text-neutral-500" />
              </div>
              <h4 className="text-base font-bold text-white">Нет сохраненных анализов</h4>
              <p className="text-xs text-neutral-400 max-w-md mx-auto leading-relaxed">
                Вы пока не сохранили ни одного сравнительного анализа типов владения. Настройте альтернативный вариант в калькуляторе и нажмите кнопку «Сохранить в аккаунт».
              </p>
              <button
                onClick={() => setActiveTab('comparison')}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Перейти к сравнению
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedComparisons.map((record) => (
                <div
                  key={record.id}
                  className="bg-neutral-950 border border-neutral-800 hover:border-neutral-700 rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-4 transition-all shadow-md"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-white hover:text-amber-300 transition-colors">
                          {record.title}
                        </h4>
                        <div className="text-[11px] text-neutral-500 flex items-center gap-1.5 mt-0.5">
                          <Calendar className="w-3 h-3 text-neutral-600" />
                          <span>{new Date(record.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>

                      <span className={`text-[10px] uppercase font-bold font-mono px-2 py-0.5 rounded ${
                        record.result.winner === 'alternative'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : record.result.winner === 'baseline'
                          ? 'bg-blue-950 text-blue-400 border border-blue-800'
                          : 'bg-neutral-900 text-neutral-400 border border-neutral-800'
                      }`}>
                        {record.result.winner === 'alternative' ? 'Выгоднее Альтернатива' : 'Выгоднее Базовый'}
                      </span>
                    </div>

                    {record.notes && (
                      <p className="text-xs text-neutral-400 bg-neutral-900/60 p-2.5 rounded-lg border border-neutral-800/80 leading-relaxed italic">
                        «{record.notes}»
                      </p>
                    )}

                    {/* Compare Pills */}
                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <div className="bg-neutral-900 p-2.5 rounded-lg border border-neutral-800">
                        <span className="text-[10px] text-neutral-500 block uppercase font-bold">Базовый авто:</span>
                        <div className="font-semibold text-white truncate">{record.baseline.carName}</div>
                        <div className="text-[11px] text-neutral-400">{record.baseline.ownershipLabel}</div>
                        <div className="text-emerald-400 font-mono font-bold mt-1">+{formatCurrency(record.baseline.monthlyNetProfit)}/мес</div>
                      </div>

                      <div className="bg-neutral-900 p-2.5 rounded-lg border border-neutral-800">
                        <span className="text-[10px] text-amber-500 block uppercase font-bold">Альтернатива:</span>
                        <div className="font-semibold text-white truncate">{record.alternative.carName}</div>
                        <div className="text-[11px] text-neutral-400">{record.alternative.ownershipLabel}</div>
                        <div className="text-amber-400 font-mono font-bold mt-1">+{formatCurrency(record.alternative.monthlyNetProfit)}/мес</div>
                      </div>
                    </div>

                    <div className="text-xs text-neutral-300 leading-snug pt-1">
                      {record.result.verdict}
                    </div>
                  </div>

                  {/* Actions: Load & Delete */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-neutral-800">
                    <button
                      type="button"
                      onClick={() => handleLoadSaved(record)}
                      className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded-lg text-xs font-semibold text-white transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3 text-amber-400" />
                      <span>Загрузить для просмотра</span>
                    </button>

                    {deleteConfirmId === record.id ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-rose-400">Удалить?</span>
                        <button
                          type="button"
                          onClick={() => handleDelete(record.id)}
                          className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-[11px] font-bold cursor-pointer"
                        >
                          Да
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded text-[11px] cursor-pointer"
                        >
                          Отмена
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(record.id)}
                        className="p-1.5 text-neutral-500 hover:text-rose-400 hover:bg-neutral-900 rounded-lg transition-colors cursor-pointer"
                        title="Удалить анализ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SAVE ANALYSIS MODAL DIALOG */}
      {/* ========================================================================= */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div 
            className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <BookmarkCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Сохранить анализ в аккаунт</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSaveModalOpen(false)}
                className="text-neutral-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmSave} className="space-y-4 text-xs">
              <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 text-[11px] text-neutral-300 space-y-1">
                <div>Аккаунт: <strong className="text-white">{currentUser?.name || 'Илья Мартынов'}</strong></div>
                <div className="text-neutral-400">{currentUser?.email || 'imartynov04@gmail.com'}</div>
              </div>

              <div>
                <label className="block text-neutral-300 font-medium mb-1">
                  Название анализа:
                </label>
                <input
                  type="text"
                  required
                  value={saveTitle}
                  onChange={(e) => setSaveTitle(e.target.value)}
                  placeholder="Например: Haval Jolion в кредит vs Текущий Skoda"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm focus:border-amber-500 focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-neutral-300 font-medium mb-1">
                  Заметки / примечания (необязательно):
                </label>
                <textarea
                  rows={3}
                  value={saveNotes}
                  onChange={(e) => setSaveNotes(e.target.value)}
                  placeholder="Например: Условия от таксопарка Форсаж, одобрили ставку 18.9%"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white text-xs focus:border-amber-500 focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSaveModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-neutral-400 hover:text-white font-medium cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold shadow cursor-pointer transition-colors"
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
