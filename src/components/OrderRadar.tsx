import React, { useState, useEffect } from 'react';
import { 
  SurgeType,
  TariffCategory, 
  TariffConfig, 
  TariffSettings, 
  TripOrderInput, 
  VehicleSettings 
} from '../types/taxi';
import { 
  calculateTariffFare, 
  evaluateTripOrder,
  calculateDailyLoanShare,
  calculateMaintenanceCostPerKm
} from '../utils/calculations';
import { 
  DEFAULT_TARIFF_SETTINGS,
  DEFAULT_TARIFFS, 
  TARIFF_LABELS,
  OWNERSHIP_META
} from '../utils/constants';
import { formatCurrency, formatDecimal, saveVehicleSettings } from '../utils/storage';
import { 
  Radar, 
  Clock, 
  MapPin, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  TrendingUp, 
  Fuel, 
  Percent, 
  Sparkles, 
  Save, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  SlidersHorizontal, 
  Calculator, 
  Zap,
  Gift,
  ChevronDown,
  ChevronUp,
  Car,
  Wrench,
  Info,
  ShieldCheck
} from 'lucide-react';
import { IntegratedAdBanner } from './IntegratedAdBanner';

interface OrderRadarProps {
  settings: VehicleSettings;
  onSaveSettings?: (settings: VehicleSettings) => void;
}

export const OrderRadar: React.FC<OrderRadarProps> = ({ 
  settings, 
  onSaveSettings 
}) => {
  // 1. Tariff draft state: initialized from settings or defaults
  const initialTariffSettings: TariffSettings = settings.tariffSettings || {
    activeCategory: (settings.category in DEFAULT_TARIFFS ? (settings.category as TariffCategory) : 'economy'),
    tariffs: DEFAULT_TARIFFS,
  };

  const [tariffDraft, setTariffDraft] = useState<TariffSettings>(initialTariffSettings);
  const [saveSuccessToast, setSaveSuccessToast] = useState(false);
  const [showTariffSettings, setShowTariffSettings] = useState(true);

  // Active category & config
  const activeCategory = tariffDraft.activeCategory;
  const currentActiveTariff = tariffDraft.tariffs[activeCategory] || DEFAULT_TARIFFS[activeCategory];

  // Dedicated string inputs for active tariff parameters to allow smooth decimal typing
  const [basePriceInput, setBasePriceInput] = useState<string>(currentActiveTariff.basePrice.toString());
  const [pricePerKmInput, setPricePerKmInput] = useState<string>(currentActiveTariff.pricePerKm.toString());
  const [pricePerMinInput, setPricePerMinInput] = useState<string>(currentActiveTariff.pricePerMinute.toString());
  const [waitingPriceInput, setWaitingPriceInput] = useState<string>(currentActiveTariff.paidWaitingPricePerMinute.toString());
  const [commissionPercentInput, setCommissionPercentInput] = useState<string>(
    (currentActiveTariff.aggregatorCommissionPercent ?? DEFAULT_TARIFFS[activeCategory].aggregatorCommissionPercent).toString()
  );

  // Included allowances in base fare
  const [includedKmInput, setIncludedKmInput] = useState<string>(currentActiveTariff.includedKm.toString());
  const [includedMinInput, setIncludedMinInput] = useState<string>(currentActiveTariff.includedMinutes.toString());
  const [freeWaitingInput, setFreeWaitingInput] = useState<string>(currentActiveTariff.freeWaitingMinutes.toString());

  // 2. Trip order input state
  const [tripInput, setTripInput] = useState<TripOrderInput>({
    fareAmount: 580,
    pickupDistanceKm: 2.2,
    pickupTimeMin: 6,
    tripDistanceKm: 7.8,
    tripTimeMin: 18,
    waitingTotalMin: 3,
    paidWaitingMin: 1,
  });

  // 3. Surge demand input state: multiplier (х1.8) or fixed sum (+150 ₽)
  const [surgeMode, setSurgeMode] = useState<SurgeType>('multiplier');
  const [multiplierVal, setMultiplierVal] = useState<number>(1.5);
  const [multiplierInput, setMultiplierInput] = useState<string>('1.5');
  const [fixedBonusVal, setFixedBonusVal] = useState<number>(150);
  const [fixedBonusInput, setFixedBonusInput] = useState<string>('150');

  // Sync when settings change externally
  useEffect(() => {
    if (settings.tariffSettings) {
      setTariffDraft(settings.tariffSettings);
      const cat = settings.tariffSettings.activeCategory;
      const t = settings.tariffSettings.tariffs[cat] || DEFAULT_TARIFFS[cat];
      setBasePriceInput(t.basePrice.toString());
      setPricePerKmInput(t.pricePerKm.toString());
      setPricePerMinInput(t.pricePerMinute.toString());
      setWaitingPriceInput(t.paidWaitingPricePerMinute.toString());
      setIncludedKmInput(t.includedKm.toString());
      setIncludedMinInput(t.includedMinutes.toString());
      setFreeWaitingInput(t.freeWaitingMinutes.toString());
      setCommissionPercentInput((t.aggregatorCommissionPercent ?? DEFAULT_TARIFFS[cat].aggregatorCommissionPercent).toString());
    }
  }, [settings.tariffSettings]);

  // --- Category Switch Handler (like fuel switcher) ---
  const handleSelectCategory = (newCat: TariffCategory) => {
    const oldCat = tariffDraft.activeCategory;

    // 1. Commit inputs for the old category into draft tariffs
    const parsedOldBase = parseFloat(basePriceInput.replace(',', '.'));
    const parsedOldKm = parseFloat(pricePerKmInput.replace(',', '.'));
    const parsedOldMin = parseFloat(pricePerMinInput.replace(',', '.'));
    const parsedOldWaiting = parseFloat(waitingPriceInput.replace(',', '.'));
    const parsedOldIncKm = parseFloat(includedKmInput.replace(',', '.'));
    const parsedOldIncMin = parseFloat(includedMinInput.replace(',', '.'));
    const parsedOldFreeWait = parseFloat(freeWaitingInput.replace(',', '.'));
    const parsedOldCommission = parseFloat(commissionPercentInput.replace(',', '.'));

    const updatedOldTariff: TariffConfig = {
      ...(tariffDraft.tariffs[oldCat] || DEFAULT_TARIFFS[oldCat]),
      basePrice: !isNaN(parsedOldBase) && parsedOldBase >= 0 ? parsedOldBase : (tariffDraft.tariffs[oldCat]?.basePrice ?? DEFAULT_TARIFFS[oldCat].basePrice),
      pricePerKm: !isNaN(parsedOldKm) && parsedOldKm >= 0 ? parsedOldKm : (tariffDraft.tariffs[oldCat]?.pricePerKm ?? DEFAULT_TARIFFS[oldCat].pricePerKm),
      pricePerMinute: !isNaN(parsedOldMin) && parsedOldMin >= 0 ? parsedOldMin : (tariffDraft.tariffs[oldCat]?.pricePerMinute ?? DEFAULT_TARIFFS[oldCat].pricePerMinute),
      paidWaitingPricePerMinute: !isNaN(parsedOldWaiting) && parsedOldWaiting >= 0 ? parsedOldWaiting : (tariffDraft.tariffs[oldCat]?.paidWaitingPricePerMinute ?? DEFAULT_TARIFFS[oldCat].paidWaitingPricePerMinute),
      includedKm: !isNaN(parsedOldIncKm) && parsedOldIncKm >= 0 ? parsedOldIncKm : (tariffDraft.tariffs[oldCat]?.includedKm ?? DEFAULT_TARIFFS[oldCat].includedKm),
      includedMinutes: !isNaN(parsedOldIncMin) && parsedOldIncMin >= 0 ? parsedOldIncMin : (tariffDraft.tariffs[oldCat]?.includedMinutes ?? DEFAULT_TARIFFS[oldCat].includedMinutes),
      freeWaitingMinutes: !isNaN(parsedOldFreeWait) && parsedOldFreeWait >= 0 ? parsedOldFreeWait : (tariffDraft.tariffs[oldCat]?.freeWaitingMinutes ?? DEFAULT_TARIFFS[oldCat].freeWaitingMinutes),
      aggregatorCommissionPercent: !isNaN(parsedOldCommission) && parsedOldCommission >= 0 ? parsedOldCommission : (tariffDraft.tariffs[oldCat]?.aggregatorCommissionPercent ?? DEFAULT_TARIFFS[oldCat].aggregatorCommissionPercent),
    };

    const updatedTariffs = {
      ...tariffDraft.tariffs,
      [oldCat]: updatedOldTariff,
    };

    // 2. Load the saved/draft values for the new category
    const targetTariff = updatedTariffs[newCat] || DEFAULT_TARIFFS[newCat];

    setTariffDraft({
      activeCategory: newCat,
      tariffs: updatedTariffs,
    });

    setBasePriceInput(targetTariff.basePrice.toString());
    setPricePerKmInput(targetTariff.pricePerKm.toString());
    setPricePerMinInput(targetTariff.pricePerMinute.toString());
    setWaitingPriceInput(targetTariff.paidWaitingPricePerMinute.toString());
    setIncludedKmInput(targetTariff.includedKm.toString());
    setIncludedMinInput(targetTariff.includedMinutes.toString());
    setFreeWaitingInput(targetTariff.freeWaitingMinutes.toString());
    setCommissionPercentInput((targetTariff.aggregatorCommissionPercent ?? DEFAULT_TARIFFS[newCat].aggregatorCommissionPercent).toString());
  };

  // --- Active Tariff Input Updaters ---
  const handleCommissionChange = (val: string) => {
    if (!/^[0-9]*[.,]?[0-9]*$/.test(val)) return;
    setCommissionPercentInput(val);
    const parsed = parseFloat(val.replace(',', '.'));
    if (!isNaN(parsed) && parsed >= 0) {
      setTariffDraft((prev) => ({
        ...prev,
        tariffs: {
          ...prev.tariffs,
          [prev.activeCategory]: {
            ...prev.tariffs[prev.activeCategory],
            aggregatorCommissionPercent: parsed,
          },
        },
      }));
    }
  };

  // --- Active Tariff Input Updaters ---
  const handleBasePriceChange = (val: string) => {
    if (!/^[0-9]*[.,]?[0-9]*$/.test(val)) return;
    setBasePriceInput(val);
    const parsed = parseFloat(val.replace(',', '.'));
    if (!isNaN(parsed) && parsed >= 0) {
      setTariffDraft((prev) => ({
        ...prev,
        tariffs: {
          ...prev.tariffs,
          [prev.activeCategory]: {
            ...prev.tariffs[prev.activeCategory],
            basePrice: parsed,
          },
        },
      }));
    }
  };

  const handlePricePerKmChange = (val: string) => {
    if (!/^[0-9]*[.,]?[0-9]*$/.test(val)) return;
    setPricePerKmInput(val);
    const parsed = parseFloat(val.replace(',', '.'));
    if (!isNaN(parsed) && parsed >= 0) {
      setTariffDraft((prev) => ({
        ...prev,
        tariffs: {
          ...prev.tariffs,
          [prev.activeCategory]: {
            ...prev.tariffs[prev.activeCategory],
            pricePerKm: parsed,
          },
        },
      }));
    }
  };

  const handlePricePerMinChange = (val: string) => {
    if (!/^[0-9]*[.,]?[0-9]*$/.test(val)) return;
    setPricePerMinInput(val);
    const parsed = parseFloat(val.replace(',', '.'));
    if (!isNaN(parsed) && parsed >= 0) {
      setTariffDraft((prev) => ({
        ...prev,
        tariffs: {
          ...prev.tariffs,
          [prev.activeCategory]: {
            ...prev.tariffs[prev.activeCategory],
            pricePerMinute: parsed,
          },
        },
      }));
    }
  };

  const handleWaitingPriceChange = (val: string) => {
    if (!/^[0-9]*[.,]?[0-9]*$/.test(val)) return;
    setWaitingPriceInput(val);
    const parsed = parseFloat(val.replace(',', '.'));
    if (!isNaN(parsed) && parsed >= 0) {
      setTariffDraft((prev) => ({
        ...prev,
        tariffs: {
          ...prev.tariffs,
          [prev.activeCategory]: {
            ...prev.tariffs[prev.activeCategory],
            paidWaitingPricePerMinute: parsed,
          },
        },
      }));
    }
  };

  const handleIncludedKmChange = (val: string) => {
    if (!/^[0-9]*[.,]?[0-9]*$/.test(val)) return;
    setIncludedKmInput(val);
    const parsed = parseFloat(val.replace(',', '.'));
    if (!isNaN(parsed) && parsed >= 0) {
      setTariffDraft((prev) => ({
        ...prev,
        tariffs: {
          ...prev.tariffs,
          [prev.activeCategory]: {
            ...prev.tariffs[prev.activeCategory],
            includedKm: parsed,
          },
        },
      }));
    }
  };

  const handleIncludedMinChange = (val: string) => {
    if (!/^[0-9]*[.,]?[0-9]*$/.test(val)) return;
    setIncludedMinInput(val);
    const parsed = parseFloat(val.replace(',', '.'));
    if (!isNaN(parsed) && parsed >= 0) {
      setTariffDraft((prev) => ({
        ...prev,
        tariffs: {
          ...prev.tariffs,
          [prev.activeCategory]: {
            ...prev.tariffs[prev.activeCategory],
            includedMinutes: parsed,
          },
        },
      }));
    }
  };

  const handleFreeWaitingChange = (val: string) => {
    if (!/^[0-9]*[.,]?[0-9]*$/.test(val)) return;
    setFreeWaitingInput(val);
    const parsed = parseFloat(val.replace(',', '.'));
    if (!isNaN(parsed) && parsed >= 0) {
      setTariffDraft((prev) => ({
        ...prev,
        tariffs: {
          ...prev.tariffs,
          [prev.activeCategory]: {
            ...prev.tariffs[prev.activeCategory],
            freeWaitingMinutes: parsed,
          },
        },
      }));
    }
  };

  // --- Dirty Tracking against Saved in DB/Settings ---
  const savedTariffSettings = settings.tariffSettings || DEFAULT_TARIFF_SETTINGS;
  const savedActiveCat: TariffCategory = savedTariffSettings.activeCategory;
  const savedActiveTariff: TariffConfig = savedTariffSettings.tariffs[activeCategory] || DEFAULT_TARIFFS[activeCategory];

  const parsedBasePrice = parseFloat(basePriceInput.replace(',', '.'));
  const isBasePriceChanged = !isNaN(parsedBasePrice) && Math.abs(parsedBasePrice - savedActiveTariff.basePrice) > 0.001;

  const parsedKmPrice = parseFloat(pricePerKmInput.replace(',', '.'));
  const isKmPriceChanged = !isNaN(parsedKmPrice) && Math.abs(parsedKmPrice - savedActiveTariff.pricePerKm) > 0.001;

  const parsedMinPrice = parseFloat(pricePerMinInput.replace(',', '.'));
  const isMinPriceChanged = !isNaN(parsedMinPrice) && Math.abs(parsedMinPrice - savedActiveTariff.pricePerMinute) > 0.001;

  const parsedWaitingPrice = parseFloat(waitingPriceInput.replace(',', '.'));
  const isWaitingPriceChanged = !isNaN(parsedWaitingPrice) && Math.abs(parsedWaitingPrice - savedActiveTariff.paidWaitingPricePerMinute) > 0.001;

  const parsedIncludedKm = parseFloat(includedKmInput.replace(',', '.'));
  const isIncludedKmChanged = !isNaN(parsedIncludedKm) && Math.abs(parsedIncludedKm - savedActiveTariff.includedKm) > 0.001;

  const parsedIncludedMin = parseFloat(includedMinInput.replace(',', '.'));
  const isIncludedMinChanged = !isNaN(parsedIncludedMin) && Math.abs(parsedIncludedMin - savedActiveTariff.includedMinutes) > 0.001;

  const parsedFreeWaiting = parseFloat(freeWaitingInput.replace(',', '.'));
  const isFreeWaitingChanged = !isNaN(parsedFreeWaiting) && Math.abs(parsedFreeWaiting - savedActiveTariff.freeWaitingMinutes) > 0.001;

  const parsedCommission = parseFloat(commissionPercentInput.replace(',', '.'));
  const savedCommission = savedActiveTariff.aggregatorCommissionPercent ?? DEFAULT_TARIFFS[activeCategory].aggregatorCommissionPercent;
  const isCommissionChanged = !isNaN(parsedCommission) && Math.abs(parsedCommission - savedCommission) > 0.001;

  const isCategoryChanged = activeCategory !== savedActiveCat;

  // Check if other categories have unsaved changes
  const areOtherTariffsChanged = (['economy', 'comfort', 'comfort_plus', 'business'] as TariffCategory[]).some((cat) => {
    if (cat === activeCategory) return false;
    const current = tariffDraft.tariffs[cat];
    const saved = savedTariffSettings.tariffs[cat] || DEFAULT_TARIFFS[cat];
    return (
      Math.abs(current.basePrice - saved.basePrice) > 0.001 ||
      Math.abs(current.pricePerKm - saved.pricePerKm) > 0.001 ||
      Math.abs(current.pricePerMinute - saved.pricePerMinute) > 0.001 ||
      Math.abs(current.paidWaitingPricePerMinute - saved.paidWaitingPricePerMinute) > 0.001 ||
      Math.abs(current.includedKm - saved.includedKm) > 0.001 ||
      Math.abs(current.includedMinutes - saved.includedMinutes) > 0.001 ||
      Math.abs(current.freeWaitingMinutes - saved.freeWaitingMinutes) > 0.001 ||
      Math.abs((current.aggregatorCommissionPercent ?? DEFAULT_TARIFFS[cat].aggregatorCommissionPercent) - (saved.aggregatorCommissionPercent ?? DEFAULT_TARIFFS[cat].aggregatorCommissionPercent)) > 0.001
    );
  });

  const changedCount = [
    isCategoryChanged,
    isBasePriceChanged,
    isKmPriceChanged,
    isMinPriceChanged,
    isWaitingPriceChanged,
    isCommissionChanged,
    isIncludedKmChanged,
    isIncludedMinChanged,
    isFreeWaitingChanged,
    areOtherTariffsChanged,
  ].filter(Boolean).length;

  const hasUnsavedTariffs = changedCount > 0;

  // --- Save Tariffs Handler ---
  const handleSaveTariffs = () => {
    const cleanBase = parseFloat(basePriceInput.replace(',', '.'));
    const finalBase = !isNaN(cleanBase) && cleanBase >= 0 ? cleanBase : currentActiveTariff.basePrice;

    const cleanKm = parseFloat(pricePerKmInput.replace(',', '.'));
    const finalKm = !isNaN(cleanKm) && cleanKm >= 0 ? cleanKm : currentActiveTariff.pricePerKm;

    const cleanMin = parseFloat(pricePerMinInput.replace(',', '.'));
    const finalMin = !isNaN(cleanMin) && cleanMin >= 0 ? cleanMin : currentActiveTariff.pricePerMinute;

    const cleanWait = parseFloat(waitingPriceInput.replace(',', '.'));
    const finalWait = !isNaN(cleanWait) && cleanWait >= 0 ? cleanWait : currentActiveTariff.paidWaitingPricePerMinute;

    const cleanIncKm = parseFloat(includedKmInput.replace(',', '.'));
    const finalIncKm = !isNaN(cleanIncKm) && cleanIncKm >= 0 ? cleanIncKm : currentActiveTariff.includedKm;

    const cleanIncMin = parseFloat(includedMinInput.replace(',', '.'));
    const finalIncMin = !isNaN(cleanIncMin) && cleanIncMin >= 0 ? cleanIncMin : currentActiveTariff.includedMinutes;

    const cleanFreeWait = parseFloat(freeWaitingInput.replace(',', '.'));
    const finalFreeWait = !isNaN(cleanFreeWait) && cleanFreeWait >= 0 ? cleanFreeWait : currentActiveTariff.freeWaitingMinutes;

    const cleanComm = parseFloat(commissionPercentInput.replace(',', '.'));
    const finalComm = !isNaN(cleanComm) && cleanComm >= 0 ? cleanComm : (currentActiveTariff.aggregatorCommissionPercent ?? DEFAULT_TARIFFS[activeCategory].aggregatorCommissionPercent);

    const finalActiveTariff: TariffConfig = {
      ...currentActiveTariff,
      basePrice: finalBase,
      pricePerKm: finalKm,
      pricePerMinute: finalMin,
      paidWaitingPricePerMinute: finalWait,
      includedKm: finalIncKm,
      includedMinutes: finalIncMin,
      freeWaitingMinutes: finalFreeWait,
      aggregatorCommissionPercent: finalComm,
    };

    const finalTariffSettings: TariffSettings = {
      activeCategory,
      tariffs: {
        ...tariffDraft.tariffs,
        [activeCategory]: finalActiveTariff,
      },
    };

    setTariffDraft(finalTariffSettings);
    setBasePriceInput(finalBase.toString());
    setPricePerKmInput(finalKm.toString());
    setPricePerMinInput(finalMin.toString());
    setWaitingPriceInput(finalWait.toString());
    setIncludedKmInput(finalIncKm.toString());
    setIncludedMinInput(finalIncMin.toString());
    setFreeWaitingInput(finalFreeWait.toString());
    setCommissionPercentInput(finalComm.toString());

    // Update settings in database and parent
    const updatedSettings: VehicleSettings = {
      ...settings,
      category: activeCategory,
      aggregatorCommissionPercent: finalComm,
      tariffSettings: finalTariffSettings,
    };

    if (onSaveSettings) {
      onSaveSettings(updatedSettings);
    } else {
      saveVehicleSettings(updatedSettings);
    }

    setSaveSuccessToast(true);
    setTimeout(() => setSaveSuccessToast(false), 3500);
  };

  const handleResetTariffs = () => {
    setTariffDraft(savedTariffSettings);
    const cat: TariffCategory = savedTariffSettings.activeCategory;
    const t = savedTariffSettings.tariffs[cat] || DEFAULT_TARIFFS[cat];
    setBasePriceInput(t.basePrice.toString());
    setPricePerKmInput(t.pricePerKm.toString());
    setPricePerMinInput(t.pricePerMinute.toString());
    setWaitingPriceInput(t.paidWaitingPricePerMinute.toString());
    setIncludedKmInput(t.includedKm.toString());
    setIncludedMinInput(t.includedMinutes.toString());
    setFreeWaitingInput(t.freeWaitingMinutes.toString());
    setCommissionPercentInput((t.aggregatorCommissionPercent ?? DEFAULT_TARIFFS[cat].aggregatorCommissionPercent).toString());
  };

  // --- Dynamic Yellow Highlight helper ---
  const getInputClass = (isChanged: boolean, extra = '') =>
    `w-full rounded-lg px-3 py-2 text-sm font-mono tabular-nums transition-all focus:outline-none ${
      isChanged
        ? 'bg-amber-950/40 border-2 border-amber-400 text-amber-100 ring-2 ring-amber-400/40 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
        : 'bg-neutral-950 border border-neutral-800 text-white focus:border-amber-500'
    } ${extra}`;

  // Live active tariff config for calculation
  const liveActiveTariffConfig: TariffConfig = {
    ...currentActiveTariff,
    basePrice: !isNaN(parsedBasePrice) && parsedBasePrice >= 0 ? parsedBasePrice : currentActiveTariff.basePrice,
    pricePerKm: !isNaN(parsedKmPrice) && parsedKmPrice >= 0 ? parsedKmPrice : currentActiveTariff.pricePerKm,
    pricePerMinute: !isNaN(parsedMinPrice) && parsedMinPrice >= 0 ? parsedMinPrice : currentActiveTariff.pricePerMinute,
    paidWaitingPricePerMinute: !isNaN(parsedWaitingPrice) && parsedWaitingPrice >= 0 ? parsedWaitingPrice : currentActiveTariff.paidWaitingPricePerMinute,
    includedKm: !isNaN(parsedIncludedKm) && parsedIncludedKm >= 0 ? parsedIncludedKm : currentActiveTariff.includedKm,
    includedMinutes: !isNaN(parsedIncludedMin) && parsedIncludedMin >= 0 ? parsedIncludedMin : currentActiveTariff.includedMinutes,
    freeWaitingMinutes: !isNaN(parsedFreeWaiting) && parsedFreeWaiting >= 0 ? parsedFreeWaiting : currentActiveTariff.freeWaitingMinutes,
    aggregatorCommissionPercent: !isNaN(parsedCommission) && parsedCommission >= 0 ? parsedCommission : (currentActiveTariff.aggregatorCommissionPercent ?? DEFAULT_TARIFFS[activeCategory].aggregatorCommissionPercent),
  };

  // Compute paid waiting from total waiting or input
  const totalWait = tripInput.waitingTotalMin ?? 0;
  const calculatedPaidWaitingMin = Math.max(0, totalWait - liveActiveTariffConfig.freeWaitingMinutes);

  // Live order evaluation
  const effectiveTripInput: TripOrderInput = {
    ...tripInput,
    paidWaitingMin: calculatedPaidWaitingMin,
    surgeType: surgeMode,
    surgeValue: surgeMode === 'multiplier' ? multiplierVal : fixedBonusVal,
  };

  const evaluation = evaluateTripOrder(effectiveTripInput, settings, liveActiveTariffConfig);
  const detailedTariffFare = calculateTariffFare(
    tripInput.tripDistanceKm,
    tripInput.tripTimeMin,
    calculatedPaidWaitingMin,
    liveActiveTariffConfig
  );

  // Quick order presets
  const presets = [
    {
      label: 'Короткий по району',
      fare: 340,
      pickupKm: 1.0,
      pickupMin: 3,
      tripKm: 2.8,
      tripMin: 8,
      totalWaitingMin: 2,
    },
    {
      label: 'Дальняя подача',
      fare: 420,
      pickupKm: 4.8,
      pickupMin: 12,
      tripKm: 4.5,
      tripMin: 11,
      totalWaitingMin: 1,
    },
    {
      label: 'Пробка в центре (Кэф)',
      fare: 890,
      pickupKm: 1.5,
      pickupMin: 6,
      tripKm: 6.2,
      tripMin: 36,
      totalWaitingMin: 5,
    },
    {
      label: 'Аэропорт / Трасса',
      fare: 1950,
      pickupKm: 2.5,
      pickupMin: 7,
      tripKm: 34.0,
      tripMin: 42,
      totalWaitingMin: 7,
    },
  ];

  const applyPreset = (p: typeof presets[0]) => {
    const paidWait = Math.max(0, p.totalWaitingMin - liveActiveTariffConfig.freeWaitingMinutes);
    const base = calculateTariffFare(p.tripKm, p.tripMin, paidWait, liveActiveTariffConfig).totalCalculatedFare;
    const mult = base > 0 ? Number((p.fare / base).toFixed(2)) : 1.0;
    const bonus = Math.max(0, p.fare - base);
    
    setMultiplierVal(mult);
    setMultiplierInput(mult.toString());
    setFixedBonusVal(bonus);
    setFixedBonusInput(bonus.toString());

    setTripInput({
      fareAmount: p.fare,
      pickupDistanceKm: p.pickupKm,
      pickupTimeMin: p.pickupMin,
      tripDistanceKm: p.tripKm,
      tripTimeMin: p.tripMin,
      waitingTotalMin: p.totalWaitingMin,
      paidWaitingMin: paidWait,
      surgeType: mult > 1.05 ? 'multiplier' : 'fixed',
      surgeValue: mult > 1.05 ? mult : bonus,
    });
  };

  // --- SURGE HANDLERS (МНОЖИТЕЛЬ ИЛИ СУММА) ---
  const handleSwitchSurgeMode = (mode: SurgeType) => {
    setSurgeMode(mode);
    const base = detailedTariffFare.totalCalculatedFare;
    if (mode === 'multiplier') {
      const newFare = Math.round(base * multiplierVal);
      setTripInput((prev) => ({
        ...prev,
        fareAmount: newFare,
        surgeType: 'multiplier',
        surgeValue: multiplierVal,
      }));
    } else {
      const newFare = Math.round(base + fixedBonusVal);
      setTripInput((prev) => ({
        ...prev,
        fareAmount: newFare,
        surgeType: 'fixed',
        surgeValue: fixedBonusVal,
      }));
    }
  };

  const handleMultiplierInputChange = (val: string) => {
    if (!/^[0-9]*[.,]?[0-9]*$/.test(val)) return;
    setMultiplierInput(val);
    const parsed = parseFloat(val.replace(',', '.'));
    if (!isNaN(parsed) && parsed > 0) {
      setMultiplierVal(parsed);
      const base = detailedTariffFare.totalCalculatedFare;
      const newFare = Math.round(base * parsed);
      setTripInput((prev) => ({
        ...prev,
        fareAmount: newFare,
        surgeType: 'multiplier',
        surgeValue: parsed,
      }));
      const bonus = Math.max(0, newFare - base);
      setFixedBonusVal(bonus);
      setFixedBonusInput(bonus.toString());
    }
  };

  const handleAdjustMultiplier = (delta: number) => {
    const next = Math.max(0.5, Number((multiplierVal + delta).toFixed(1)));
    setMultiplierVal(next);
    setMultiplierInput(next.toString());
    const base = detailedTariffFare.totalCalculatedFare;
    const newFare = Math.round(base * next);
    setTripInput((prev) => ({
      ...prev,
      fareAmount: newFare,
      surgeType: 'multiplier',
      surgeValue: next,
    }));
    const bonus = Math.max(0, newFare - base);
    setFixedBonusVal(bonus);
    setFixedBonusInput(bonus.toString());
  };

  const handleApplyMultiplierPreset = (m: number) => {
    setMultiplierVal(m);
    setMultiplierInput(m.toString());
    const base = detailedTariffFare.totalCalculatedFare;
    const newFare = Math.round(base * m);
    setTripInput((prev) => ({
      ...prev,
      fareAmount: newFare,
      surgeType: 'multiplier',
      surgeValue: m,
    }));
    const bonus = Math.max(0, newFare - base);
    setFixedBonusVal(bonus);
    setFixedBonusInput(bonus.toString());
  };

  const handleFixedBonusInputChange = (val: string) => {
    if (!/^[0-9]*[.,]?[0-9]*$/.test(val)) return;
    setFixedBonusInput(val);
    const parsed = parseFloat(val.replace(',', '.'));
    if (!isNaN(parsed) && parsed >= 0) {
      setFixedBonusVal(parsed);
      const base = detailedTariffFare.totalCalculatedFare;
      const newFare = Math.round(base + parsed);
      setTripInput((prev) => ({
        ...prev,
        fareAmount: newFare,
        surgeType: 'fixed',
        surgeValue: parsed,
      }));
      const mult = base > 0 ? Number(((base + parsed) / base).toFixed(2)) : 1.0;
      setMultiplierVal(mult);
      setMultiplierInput(mult.toString());
    }
  };

  const handleAdjustFixedBonus = (delta: number) => {
    const next = Math.max(0, fixedBonusVal + delta);
    setFixedBonusVal(next);
    setFixedBonusInput(next.toString());
    const base = detailedTariffFare.totalCalculatedFare;
    const newFare = Math.round(base + next);
    setTripInput((prev) => ({
      ...prev,
      fareAmount: newFare,
      surgeType: 'fixed',
      surgeValue: next,
    }));
    const mult = base > 0 ? Number(((base + next) / base).toFixed(2)) : 1.0;
    setMultiplierVal(mult);
    setMultiplierInput(mult.toString());
  };

  const handleApplyFixedBonusPreset = (b: number) => {
    setFixedBonusVal(b);
    setFixedBonusInput(b.toString());
    const base = detailedTariffFare.totalCalculatedFare;
    const newFare = Math.round(base + b);
    setTripInput((prev) => ({
      ...prev,
      fareAmount: newFare,
      surgeType: 'fixed',
      surgeValue: b,
    }));
    const mult = base > 0 ? Number(((base + b) / base).toFixed(2)) : 1.0;
    setMultiplierVal(mult);
    setMultiplierInput(mult.toString());
  };

  const handleDirectFareChange = (rawVal: number) => {
    const val = Math.max(0, rawVal);
    const base = detailedTariffFare.totalCalculatedFare;
    setTripInput((prev) => ({
      ...prev,
      fareAmount: val,
    }));
    if (base > 0) {
      const derivedMult = Number((val / base).toFixed(2));
      const derivedBonus = Math.max(0, val - base);
      setMultiplierVal(derivedMult);
      setMultiplierInput(derivedMult.toString());
      setFixedBonusVal(derivedBonus);
      setFixedBonusInput(derivedBonus.toString());
    }
  };

  // Button to automatically set fareAmount based on active tariff calculation (без кэфа)
  const handleApplyCalculatedTariffFare = () => {
    const base = detailedTariffFare.totalCalculatedFare;
    setMultiplierVal(1.0);
    setMultiplierInput('1.0');
    setFixedBonusVal(0);
    setFixedBonusInput('0');
    setTripInput((prev) => ({
      ...prev,
      fareAmount: base,
      surgeType: undefined,
      surgeValue: undefined,
    }));
  };

  const handleResetToTariffBase = handleApplyCalculatedTariffFare;

  const getVerdictStyle = () => {
    switch (evaluation.verdict) {
      case 'excellent':
        return {
          border: 'border-emerald-500/50',
          bg: 'bg-emerald-950/20',
          text: 'text-emerald-400',
          badgeBg: 'bg-emerald-950 text-emerald-300 border-emerald-800',
          icon: CheckCircle,
        };
      case 'good':
        return {
          border: 'border-cyan-500/50',
          bg: 'bg-cyan-950/20',
          text: 'text-cyan-400',
          badgeBg: 'bg-cyan-950 text-cyan-300 border-cyan-800',
          icon: CheckCircle,
        };
      case 'mediocre':
        return {
          border: 'border-amber-500/50',
          bg: 'bg-amber-950/20',
          text: 'text-amber-400',
          badgeBg: 'bg-amber-950 text-amber-300 border-amber-800',
          icon: AlertTriangle,
        };
      case 'unprofitable':
      default:
        return {
          border: 'border-rose-500/50',
          bg: 'bg-rose-950/20',
          text: 'text-rose-400',
          badgeBg: 'bg-rose-950 text-rose-300 border-rose-800',
          icon: XCircle,
        };
    }
  };

  const style = getVerdictStyle();
  const IconComponent = style.icon;
  const ownershipInfo = OWNERSHIP_META[settings.ownershipType] || OWNERSHIP_META.rent;
  const ownershipLabel = ownershipInfo.shortName;

  return (
    <div className="space-y-6">
      
      {/* Title Card */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs uppercase tracking-wider text-amber-500 font-bold">Экспресс-анализ рентабельности</span>
              <span className="text-neutral-600">·</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded ${ownershipInfo.badgeClass}`}>
                {ownershipLabel}
              </span>
              <span className="text-neutral-600">·</span>
              <span className="text-xs text-neutral-400">Стоит ли брать предложенную поездку?</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white mt-1">
              Радар заказов: «Брать или пропустить?»
            </h1>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="bg-neutral-950 border border-neutral-800 px-3.5 py-2 rounded-lg text-xs">
              <div className="flex items-center gap-1.5 text-neutral-300 font-medium">
                <Car className="w-3.5 h-3.5 text-amber-400" />
                <span className="truncate max-w-[150px]">{settings.carName}</span>
              </div>
              <div className="text-[11px] text-neutral-400 mt-0.5">
                Форма: <strong className="text-amber-400">{ownershipLabel}</strong>
                {settings.ownershipType === 'loan' && (
                  <span className="text-neutral-500 ml-1">(~{Math.round(calculateDailyLoanShare(settings, 24))} ₽/см)</span>
                )}
                {settings.ownershipType === 'rent' && (
                  <span className="text-neutral-500 ml-1">({settings.rentDailyCost} ₽/сут)</span>
                )}
                {settings.ownershipType === 'rent_to_own' && (
                  <span className="text-neutral-500 ml-1">(выкуп {settings.rentDailyCost} ₽/сут)</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Scenario Buttons */}
        <div className="mt-4 pt-4 border-t border-neutral-800 flex flex-wrap items-center gap-2">
          <span className="text-xs text-neutral-400">Типовые ситуации:</span>
          {presets.map((p, idx) => (
            <button
              key={idx}
              onClick={() => applyPreset(p)}
              className="text-xs px-3 py-1.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-neutral-300 rounded-lg transition-colors whitespace-nowrap"
            >
              {p.label} <span className="font-mono text-amber-400 font-semibold">{p.fare} ₽</span>
            </button>
          ))}
        </div>
      </div>

      {/* =========================================================================
          BLOCK: TARIFF PARAMETERS WITH PERSISTENT STORAGE & YELLOW HIGHLIGHTING
          (Including what is included in base fare: km, minutes, free waiting)
         ========================================================================= */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2.5">
            <SlidersHorizontal className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-base font-semibold text-white">
                Параметры тарифов агрегатора
              </h2>
              <span className="text-xs text-neutral-400">
                Базовые расценки и включенные лимиты (сохраняются отдельно для каждого тарифа)
              </span>
            </div>
          </div>

          {/* Action buttons for Tariffs */}
          <div className="flex items-center gap-2 shrink-0">
            {hasUnsavedTariffs && (
              <button
                type="button"
                onClick={handleResetTariffs}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-300 hover:text-white bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 rounded-lg transition-colors"
                title="Отменить изменения и вернуть сохраненные из базы"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Отменить</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSaveTariffs}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg shadow-md transition-all ${
                hasUnsavedTariffs
                  ? 'bg-amber-500 hover:bg-amber-400 text-neutral-950 ring-2 ring-amber-400/50 animate-pulse'
                  : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
              }`}
            >
              <Save className="w-3.5 h-3.5" />
              <span>
                {hasUnsavedTariffs ? `Сохранить тарифы (${changedCount})` : 'Сохранить тарифы'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowTariffSettings((v) => !v)}
              className="p-2 text-neutral-400 hover:text-white bg-neutral-950 border border-neutral-800 rounded-lg transition-colors"
              title={showTariffSettings ? 'Свернуть блок тарифов' : 'Развернуть блок тарифов'}
            >
              {showTariffSettings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Status Line */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            {hasUnsavedTariffs ? (
              <div className="flex items-center gap-1.5 text-amber-400 font-medium">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  Есть несохраненные параметры ({changedCount}). Измененные поля выделены желтым цветом.
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Все параметры тарифа «{TARIFF_LABELS[activeCategory].name}» сохранены в базе и актуальны.</span>
              </div>
            )}
          </div>

          {saveSuccessToast && (
            <div className="text-emerald-300 bg-emerald-950/90 border border-emerald-700 px-3 py-1 rounded-lg text-xs font-semibold animate-fade-in flex items-center gap-1.5 shadow-md">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Тарифы успешно записаны в базу данных!</span>
            </div>
          )}
        </div>

        {showTariffSettings && (
          <div className="space-y-4 pt-1">
            
            {/* Category Selector Tabs */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-neutral-400 mr-1">Тарифный класс:</span>
              {(['economy', 'comfort', 'comfort_plus', 'business'] as TariffCategory[]).map((cat) => {
                const isSelected = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleSelectCategory(cat)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                      isSelected
                        ? 'bg-amber-500 text-neutral-950 border-amber-400 font-bold shadow-sm'
                        : 'bg-neutral-950 text-neutral-400 hover:text-white border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    {TARIFF_LABELS[cat].name}
                  </button>
                );
              })}
            </div>

            {/* Sub-block 1: Core Rates */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-neutral-300 block">
                1. Стоимость подачи, километража, времени и комиссия агрегатора
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
                
                {/* 1. Base Fare (Подача / Минималка) */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-neutral-300 font-medium">
                      Подача (посадка)
                    </label>
                    {isBasePriceChanged && (
                      <span className="text-[10px] text-amber-400 font-bold animate-pulse">● изменено</span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={basePriceInput}
                      onChange={(e) => handleBasePriceChange(e.target.value)}
                      onBlur={() => {
                        const p = parseFloat(basePriceInput.replace(',', '.'));
                        if (isNaN(p) || p < 0) {
                          setBasePriceInput(currentActiveTariff.basePrice.toString());
                        } else {
                          setBasePriceInput(p.toString());
                        }
                      }}
                      className={getInputClass(isBasePriceChanged, 'pr-8')}
                      placeholder="179"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 font-semibold">₽</span>
                  </div>
                  <span className="text-[10px] text-neutral-500">Базовый чек подачи</span>
                </div>

                {/* 2. Price per Kilometer */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-neutral-300 font-medium">
                      Стоимость 1 км
                    </label>
                    {isKmPriceChanged && (
                      <span className="text-[10px] text-amber-400 font-bold animate-pulse">● изменено</span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={pricePerKmInput}
                      onChange={(e) => handlePricePerKmChange(e.target.value)}
                      onBlur={() => {
                        const p = parseFloat(pricePerKmInput.replace(',', '.'));
                        if (isNaN(p) || p < 0) {
                          setPricePerKmInput(currentActiveTariff.pricePerKm.toString());
                        } else {
                          setPricePerKmInput(p.toString());
                        }
                      }}
                      className={getInputClass(isKmPriceChanged, 'pr-12')}
                      placeholder="14"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 font-semibold">₽/км</span>
                  </div>
                  <span className="text-[10px] text-neutral-500">Сверх включенного км</span>
                </div>

                {/* 3. Price per Minute */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-neutral-300 font-medium">
                      Стоимость 1 минуты
                    </label>
                    {isMinPriceChanged && (
                      <span className="text-[10px] text-amber-400 font-bold animate-pulse">● изменено</span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={pricePerMinInput}
                      onChange={(e) => handlePricePerMinChange(e.target.value)}
                      onBlur={() => {
                        const p = parseFloat(pricePerMinInput.replace(',', '.'));
                        if (isNaN(p) || p < 0) {
                          setPricePerMinInput(currentActiveTariff.pricePerMinute.toString());
                        } else {
                          setPricePerMinInput(p.toString());
                        }
                      }}
                      className={getInputClass(isMinPriceChanged, 'pr-12')}
                      placeholder="9"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 font-semibold">₽/мин</span>
                  </div>
                  <span className="text-[10px] text-neutral-500">Сверх включенных минут</span>
                </div>

                {/* 4. Price of Paid Waiting */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-neutral-300 font-medium">
                      Платное ожидание
                    </label>
                    {isWaitingPriceChanged && (
                      <span className="text-[10px] text-amber-400 font-bold animate-pulse">● изменено</span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={waitingPriceInput}
                      onChange={(e) => handleWaitingPriceChange(e.target.value)}
                      onBlur={() => {
                        const p = parseFloat(waitingPriceInput.replace(',', '.'));
                        if (isNaN(p) || p < 0) {
                          setWaitingPriceInput(currentActiveTariff.paidWaitingPricePerMinute.toString());
                        } else {
                          setWaitingPriceInput(p.toString());
                        }
                      }}
                      className={getInputClass(isWaitingPriceChanged, 'pr-12')}
                      placeholder="11"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 font-semibold">₽/мин</span>
                  </div>
                  <span className="text-[10px] text-neutral-500">Сверх бесплатного</span>
                </div>

                {/* 5. Aggregator Commission for this Tariff */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-neutral-300 font-medium">
                      Комиссия агрегатора
                    </label>
                    {isCommissionChanged && (
                      <span className="text-[10px] text-amber-400 font-bold animate-pulse">● изменено</span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={commissionPercentInput}
                      onChange={(e) => handleCommissionChange(e.target.value)}
                      onBlur={() => {
                        const p = parseFloat(commissionPercentInput.replace(',', '.'));
                        if (isNaN(p) || p < 0) {
                          setCommissionPercentInput((currentActiveTariff.aggregatorCommissionPercent ?? DEFAULT_TARIFFS[activeCategory].aggregatorCommissionPercent).toString());
                        } else {
                          setCommissionPercentInput(p.toString());
                        }
                      }}
                      className={getInputClass(isCommissionChanged, 'pr-8')}
                      placeholder="16.8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 font-semibold">%</span>
                  </div>
                  <span className="text-[10px] text-neutral-500">Яндекс «{TARIFF_LABELS[activeCategory].name}»</span>
                </div>

              </div>
            </div>

            {/* Sub-block 2: What is INCLUDED in Base Fare (км, минуты, бесплатное ожидание) */}
            <div className="p-4 bg-neutral-950/80 rounded-xl border border-neutral-800 space-y-3">
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-semibold text-white">
                  2. Включено в стоимость подачи тарифа «{TARIFF_LABELS[activeCategory].name}» (настраивается отдельно для каждого тарифа)
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">
                За эти лимиты пассажир не платит дополнительно — они уже оплачены в сумме подачи. Плата за километры и минуты начисляется только за превышение этих порогов.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                
                {/* 1. Included Km in Base Fare */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-neutral-300 font-medium">
                      Включено км пути в подачу
                    </label>
                    {isIncludedKmChanged && (
                      <span className="text-[10px] text-amber-400 font-bold animate-pulse">● изменено</span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={includedKmInput}
                      onChange={(e) => handleIncludedKmChange(e.target.value)}
                      onBlur={() => {
                        const p = parseFloat(includedKmInput.replace(',', '.'));
                        if (isNaN(p) || p < 0) {
                          setIncludedKmInput(currentActiveTariff.includedKm.toString());
                        } else {
                          setIncludedKmInput(p.toString());
                        }
                      }}
                      className={getInputClass(isIncludedKmChanged, 'pr-10')}
                      placeholder="1.0"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 font-semibold">км</span>
                  </div>
                  <span className="text-[10px] text-neutral-500">Например: 1 км пути</span>
                </div>

                {/* 2. Included Minutes in Base Fare */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-neutral-300 font-medium">
                      Включено минут пути в подачу
                    </label>
                    {isIncludedMinChanged && (
                      <span className="text-[10px] text-amber-400 font-bold animate-pulse">● изменено</span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={includedMinInput}
                      onChange={(e) => handleIncludedMinChange(e.target.value)}
                      onBlur={() => {
                        const p = parseFloat(includedMinInput.replace(',', '.'));
                        if (isNaN(p) || p < 0) {
                          setIncludedMinInput(currentActiveTariff.includedMinutes.toString());
                        } else {
                          setIncludedMinInput(p.toString());
                        }
                      }}
                      className={getInputClass(isIncludedMinChanged, 'pr-12')}
                      placeholder="1.5"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 font-semibold">мин</span>
                  </div>
                  <span className="text-[10px] text-neutral-500">Например: 1.5 мин пути</span>
                </div>

                {/* 3. Free Waiting Minutes */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-neutral-300 font-medium">
                      Бесплатное ожидание клиента
                    </label>
                    {isFreeWaitingChanged && (
                      <span className="text-[10px] text-amber-400 font-bold animate-pulse">● изменено</span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={freeWaitingInput}
                      onChange={(e) => handleFreeWaitingChange(e.target.value)}
                      onBlur={() => {
                        const p = parseFloat(freeWaitingInput.replace(',', '.'));
                        if (isNaN(p) || p < 0) {
                          setFreeWaitingInput(currentActiveTariff.freeWaitingMinutes.toString());
                        } else {
                          setFreeWaitingInput(p.toString());
                        }
                      }}
                      className={getInputClass(isFreeWaitingChanged, 'pr-12')}
                      placeholder="2"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 font-semibold">мин</span>
                  </div>
                  <span className="text-[10px] text-neutral-500">Например: 2 мин ожидания</span>
                </div>

              </div>
            </div>

            {/* Quick Tariff Summary Banner */}
            <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="text-neutral-400">
                Тариф <strong className="text-amber-400 font-sans">{TARIFF_LABELS[activeCategory].name}</strong>:
                {' '}подача {basePriceInput} ₽ (включает {includedKmInput} км и {includedMinInput} мин, {freeWaitingInput} мин ожидания бесплатно)
                {' '}· далее {pricePerKmInput} ₽/км, {pricePerMinInput} ₽/мин, ожидание {waitingPriceInput} ₽/мин.
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-neutral-500">Пример 10 км (20 мин):</span>
                <span className="font-mono text-white font-bold tabular-nums">
                  {detailedTariffFare.totalCalculatedFare} ₽
                </span>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* =========================================================================
          MAIN GRID: ORDER PARAMETERS & REAL-TIME PROFITABILITY EVALUATION
         ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left: Input parameters */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Radar className="w-5 h-5 text-amber-400" />
                Параметры входящего заказа
              </h2>
              <button
                type="button"
                onClick={handleApplyCalculatedTariffFare}
                className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold"
                title="Подставить расчетную цену по тарифу агрегатора"
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>По тарифу ({evaluation.tariffBaseCalculated} ₽)</span>
              </button>
            </div>

            {/* Fare Amount (Итоговая стоимость заказа) */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-sm font-medium text-neutral-300">
                  Итоговая стоимость заказа (по таксометру)
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-neutral-400">
                    База: <strong className="text-white">{detailedTariffFare.totalCalculatedFare} ₽</strong>
                  </span>
                  {tripInput.fareAmount !== detailedTariffFare.totalCalculatedFare && (
                    <button
                      type="button"
                      onClick={handleResetToTariffBase}
                      className="text-[11px] text-neutral-400 hover:text-amber-400 flex items-center gap-1 transition-colors"
                      title="Сбросить на базовый тариф без спроса"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Сбросить кэф</span>
                    </button>
                  )}
                </div>
              </div>
              <div className="relative">
                <input
                  type="number"
                  min="50"
                  step="20"
                  value={tripInput.fareAmount || ''}
                  onChange={(e) => handleDirectFareChange(Number(e.target.value))}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-lg px-4 py-2.5 text-xl font-mono text-white tabular-nums pr-12 font-bold"
                  placeholder="500"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 font-semibold text-lg">₽</span>
              </div>
            </div>

            {/* =========================================================================
                КОЭФФИЦИЕНТ СПРОСА (ДВА ВАРИАНТА: МНОЖИТЕЛЬ ИЛИ СУММА)
               ========================================================================= */}
            <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800/90 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Коэффициент спроса
                  </span>
                </div>
                {evaluation.surgeMultiplier > 1.05 ? (
                  <span className="text-[11px] font-mono text-amber-400 font-bold bg-amber-950/60 border border-amber-500/40 px-2 py-0.5 rounded">
                    ×{evaluation.surgeMultiplier} (+{evaluation.surgeBonusRub} ₽)
                  </span>
                ) : evaluation.surgeMultiplier < 0.95 ? (
                  <span className="text-[11px] font-mono text-rose-400 font-semibold bg-rose-950/60 border border-rose-500/40 px-2 py-0.5 rounded">
                    Ниже базы ({evaluation.surgeMultiplier}x)
                  </span>
                ) : (
                  <span className="text-[11px] font-mono text-neutral-400 bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded">
                    Базовый спрос 1.0x (+0 ₽)
                  </span>
                )}
              </div>

              {/* Segmented Control: 2 Options */}
              <div className="grid grid-cols-2 p-1 bg-neutral-900 border border-neutral-800 rounded-lg text-xs font-medium">
                <button
                  type="button"
                  onClick={() => handleSwitchSurgeMode('multiplier')}
                  className={`py-1.5 px-3 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                    surgeMode === 'multiplier'
                      ? 'bg-amber-500 text-neutral-950 font-bold shadow'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <span>1. Множитель (х)</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                    surgeMode === 'multiplier' ? 'bg-amber-600/30 text-neutral-950 font-bold' : 'bg-neutral-800 text-neutral-300'
                  }`}>
                    ×{multiplierVal.toFixed(1)}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSwitchSurgeMode('fixed')}
                  className={`py-1.5 px-3 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                    surgeMode === 'fixed'
                      ? 'bg-amber-500 text-neutral-950 font-bold shadow'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <span>2. Сумма (+₽)</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                    surgeMode === 'fixed' ? 'bg-amber-600/30 text-neutral-950 font-bold' : 'bg-neutral-800 text-neutral-300'
                  }`}>
                    +{fixedBonusVal} ₽
                  </span>
                </button>
              </div>

              {/* Variant 1: Multiplier */}
              {surgeMode === 'multiplier' ? (
                <div className="space-y-2.5 pt-0.5">
                  <div className="flex items-center justify-between text-xs">
                    <label className="text-neutral-300 font-medium">
                      Множитель к тарифу (например х1.8):
                    </label>
                    <span className="text-[11px] text-amber-400 font-mono font-semibold">
                      +{Math.round((multiplierVal - 1) * 100)}% к базе
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400 font-bold font-mono text-base">
                        ×
                      </span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={multiplierInput}
                        onChange={(e) => handleMultiplierInputChange(e.target.value)}
                        onBlur={() => {
                          const p = parseFloat(multiplierInput.replace(',', '.'));
                          if (isNaN(p) || p <= 0) {
                            setMultiplierInput(multiplierVal.toString());
                          } else {
                            setMultiplierInput(p.toString());
                          }
                        }}
                        placeholder="1.8"
                        className="w-full bg-neutral-900 border border-neutral-700 focus:border-amber-500 rounded-lg pl-8 pr-3 py-2 text-base font-mono text-white tabular-nums font-bold"
                      />
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleAdjustMultiplier(-0.1)}
                        disabled={multiplierVal <= 0.6}
                        className="px-2.5 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 disabled:opacity-40 text-white rounded-lg font-mono font-bold text-sm transition-colors"
                        title="Уменьшить на 0.1"
                      >
                        -0.1
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAdjustMultiplier(0.1)}
                        className="px-2.5 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-white rounded-lg font-mono font-bold text-sm transition-colors"
                        title="Увеличить на 0.1"
                      >
                        +0.1
                      </button>
                    </div>
                  </div>

                  {/* Multiplier Presets */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="text-[10px] text-neutral-500 mr-1">Быстрый кэф:</span>
                    {[1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.5].map((m) => {
                      const isSelected = Math.abs(multiplierVal - m) < 0.04;
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => handleApplyMultiplierPreset(m)}
                          className={`px-2 py-1 text-xs font-mono rounded border transition-colors ${
                            isSelected
                              ? 'bg-amber-500/25 text-amber-300 border-amber-500 font-bold'
                              : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border-neutral-800'
                          }`}
                        >
                          ×{m === 1.0 ? '1.0' : m.toFixed(1)}
                        </button>
                      );
                    })}
                  </div>

                  {/* Live Breakdown for Multiplier */}
                  <div className="text-[11px] text-neutral-400 bg-neutral-900/80 p-2.5 rounded-lg border border-neutral-800/80 flex flex-wrap items-center justify-between gap-2">
                    <span>Базовый чек: <strong className="text-white font-mono">{detailedTariffFare.totalCalculatedFare} ₽</strong></span>
                    <span>Надбавка: <strong className="text-amber-400 font-mono">+{Math.max(0, tripInput.fareAmount - detailedTariffFare.totalCalculatedFare)} ₽</strong></span>
                    <span>Итог: <strong className="text-white font-mono font-bold text-xs">{tripInput.fareAmount} ₽</strong></span>
                  </div>
                </div>
              ) : (
                /* Variant 2: Fixed Sum */
                <div className="space-y-2.5 pt-0.5">
                  <div className="flex items-center justify-between text-xs">
                    <label className="text-neutral-300 font-medium">
                      Сумма доплаты к тарифу (например +150 ₽):
                    </label>
                    <span className="text-[11px] text-amber-400 font-mono font-semibold">
                      Эквивалент: ×{multiplierVal.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400 font-bold font-mono text-base">
                        +
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={fixedBonusInput}
                        onChange={(e) => handleFixedBonusInputChange(e.target.value)}
                        onBlur={() => {
                          const p = parseFloat(fixedBonusInput.replace(',', '.'));
                          if (isNaN(p) || p < 0) {
                            setFixedBonusInput(fixedBonusVal.toString());
                          } else {
                            setFixedBonusInput(p.toString());
                          }
                        }}
                        placeholder="150"
                        className="w-full bg-neutral-900 border border-neutral-700 focus:border-amber-500 rounded-lg pl-8 pr-8 py-2 text-base font-mono text-white tabular-nums font-bold"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 font-semibold text-sm">
                        ₽
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleAdjustFixedBonus(-50)}
                        disabled={fixedBonusVal <= 0}
                        className="px-2.5 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 disabled:opacity-40 text-white rounded-lg font-mono font-bold text-sm transition-colors"
                        title="Уменьшить на 50 ₽"
                      >
                        -50
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAdjustFixedBonus(50)}
                        className="px-2.5 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-white rounded-lg font-mono font-bold text-sm transition-colors"
                        title="Увеличить на 50 ₽"
                      >
                        +50
                      </button>
                    </div>
                  </div>

                  {/* Fixed Sum Presets */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="text-[10px] text-neutral-500 mr-1">Быстрая доплата:</span>
                    {[0, 50, 100, 150, 200, 300, 500].map((b) => {
                      const isSelected = fixedBonusVal === b;
                      return (
                        <button
                          key={b}
                          type="button"
                          onClick={() => handleApplyFixedBonusPreset(b)}
                          className={`px-2 py-1 text-xs font-mono rounded border transition-colors ${
                            isSelected
                              ? 'bg-amber-500/25 text-amber-300 border-amber-500 font-bold'
                              : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border-neutral-800'
                          }`}
                        >
                          {b === 0 ? '+0 ₽' : `+${b} ₽`}
                        </button>
                      );
                    })}
                  </div>

                  {/* Live Breakdown for Fixed Sum */}
                  <div className="text-[11px] text-neutral-400 bg-neutral-900/80 p-2.5 rounded-lg border border-neutral-800/80 flex flex-wrap items-center justify-between gap-2">
                    <span>Базовый чек: <strong className="text-white font-mono">{detailedTariffFare.totalCalculatedFare} ₽</strong></span>
                    <span>Доплата: <strong className="text-amber-400 font-mono">+{fixedBonusVal} ₽</strong></span>
                    <span>Итог: <strong className="text-white font-mono font-bold text-xs">{tripInput.fareAmount} ₽</strong></span>
                  </div>
                </div>
              )}
            </div>

            {/* Pickup */}
            <div className="bg-neutral-950 p-3.5 rounded-lg border border-neutral-800/80 space-y-2.5">
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wide block">
                1. Подача к клиенту
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Расстояние подачи, км</label>
                  <input
                    type="number"
                    min="0"
                    step="0.2"
                    value={tripInput.pickupDistanceKm || ''}
                    onChange={(e) => setTripInput({ ...tripInput, pickupDistanceKm: Number(e.target.value) })}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1.5 text-sm font-mono text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Время подачи, мин</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={tripInput.pickupTimeMin || ''}
                    onChange={(e) => setTripInput({ ...tripInput, pickupTimeMin: Number(e.target.value) })}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1.5 text-sm font-mono text-white tabular-nums"
                  />
                </div>
              </div>
            </div>

            {/* Trip */}
            <div className="bg-neutral-950 p-3.5 rounded-lg border border-neutral-800/80 space-y-2.5">
              <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wide block">
                2. Сама поездка с пассажиром
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Длина поездки, км</label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={tripInput.tripDistanceKm || ''}
                    onChange={(e) => setTripInput({ ...tripInput, tripDistanceKm: Number(e.target.value) })}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1.5 text-sm font-mono text-white tabular-nums"
                  />
                  <span className="text-[10px] text-neutral-500">
                    {tripInput.tripDistanceKm > liveActiveTariffConfig.includedKm 
                      ? `${formatDecimal(detailedTariffFare.chargeableKm, 1)} км платно`
                      : 'Включено в подачу'}
                  </span>
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Время поездки, мин</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={tripInput.tripTimeMin || ''}
                    onChange={(e) => setTripInput({ ...tripInput, tripTimeMin: Number(e.target.value) })}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1.5 text-sm font-mono text-white tabular-nums"
                  />
                  <span className="text-[10px] text-neutral-500">
                    {tripInput.tripTimeMin > liveActiveTariffConfig.includedMinutes 
                      ? `${formatDecimal(detailedTariffFare.chargeableMin, 1)} мин платно`
                      : 'Включено в подачу'}
                  </span>
                </div>
              </div>
            </div>

            {/* Total Waiting (Время ожидания) */}
            <div className="bg-neutral-950 p-3.5 rounded-lg border border-neutral-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">
                  3. Ожидание клиента
                </span>
                {evaluation.waitingEarnings > 0 ? (
                  <span className="text-xs font-mono text-emerald-400 font-bold">
                    +{formatCurrency(evaluation.waitingEarnings)} к чеку
                  </span>
                ) : (
                  <span className="text-xs text-neutral-500">
                    {liveActiveTariffConfig.freeWaitingMinutes} мин бесплатно
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Общее ожидание, мин</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={tripInput.waitingTotalMin ?? 0}
                    onChange={(e) => setTripInput({ 
                      ...tripInput, 
                      waitingTotalMin: Math.max(0, Number(e.target.value)),
                      paidWaitingMin: Math.max(0, Number(e.target.value) - liveActiveTariffConfig.freeWaitingMinutes),
                    })}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1.5 text-sm font-mono text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Платное ожидание</label>
                  <div className="px-3 py-1.5 bg-neutral-900 rounded-lg border border-neutral-800 text-neutral-300 font-mono text-sm tabular-nums flex items-center justify-between">
                    <span>{calculatedPaidWaitingMin} мин</span>
                    <span className="text-[11px] text-neutral-500">({liveActiveTariffConfig.paidWaitingPricePerMinute} ₽/мин)</span>
                  </div>
                </div>
              </div>
              <div className="text-[10px] text-neutral-500">
                Бесплатно: {liveActiveTariffConfig.freeWaitingMinutes} мин. 
                {calculatedPaidWaitingMin > 0 && ` Платное: ${calculatedPaidWaitingMin} мин × ${liveActiveTariffConfig.paidWaitingPricePerMinute} ₽ = ${evaluation.waitingEarnings} ₽.`}
              </div>
            </div>

            {/* Quick summary line */}
            <div className="flex items-center justify-between text-xs text-neutral-400 pt-1 border-t border-neutral-800/60">
              <span>Итоговый километраж: <span className="font-mono text-white font-semibold">{formatDecimal(evaluation.totalKm, 1)} км</span></span>
              <span>Общее время: <span className="font-mono text-white font-semibold">{evaluation.totalTimeMin} мин</span></span>
            </div>
          </div>
        </div>

        {/* Right: Instant Verdict and Breakdown */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* Verdict Banner */}
          <div className={`border ${style.border} ${style.bg} rounded-xl p-5 backdrop-blur-sm transition-all`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <IconComponent className={`w-6 h-6 ${style.text} shrink-0 mt-0.5`} />
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${style.badgeBg}`}>
                      {evaluation.verdict === 'excellent' && 'Высокая прибыль'}
                      {evaluation.verdict === 'good' && 'Приемлемо'}
                      {evaluation.verdict === 'mediocre' && 'Сомнительно'}
                      {evaluation.verdict === 'unprofitable' && 'Опасно: работа в минус'}
                    </span>
                    {evaluation.surgeMultiplier > 1.05 && (
                      <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/60 border border-amber-500/40 px-2 py-0.5 rounded flex items-center gap-1">
                        <Zap className="w-3 h-3 text-amber-400" />
                        <span>Кэф ×{evaluation.surgeMultiplier} (+{evaluation.surgeBonusRub} ₽)</span>
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-bold text-white mt-1.5">
                    {evaluation.verdictText}
                  </h3>
                  <p className="text-sm text-neutral-300 mt-1 leading-relaxed">
                    {evaluation.reason}
                  </p>
                </div>
              </div>

              {/* Net profit badge */}
              <div className="text-right shrink-0">
                <span className="text-xs text-neutral-400 block font-sans">На руки сразу с заказа</span>
                <span className={`text-2xl sm:text-3xl font-extrabold font-mono tabular-nums ${
                  evaluation.directNetProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  +{formatCurrency(evaluation.directNetProfit)}
                </span>
                <span className="text-[10px] text-neutral-400 block mt-0.5">
                  чистыми после топлива и комиссий
                </span>
              </div>
            </div>

            {/* Core Rates KPI Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-5 pt-4 border-t border-neutral-800/80">
              <div className="bg-neutral-950/80 p-3 rounded-lg border border-neutral-800">
                <span className="text-[11px] text-neutral-400 block">Доход в час на руки</span>
                <span className="text-base font-bold font-mono text-amber-400 tabular-nums">
                  {formatCurrency(evaluation.directNetPerHour)}/ч
                </span>
              </div>
              <div className="bg-neutral-950/80 p-3 rounded-lg border border-neutral-800">
                <span className="text-[11px] text-neutral-400 block">Доход на 1 км на руки</span>
                <span className="text-base font-bold font-mono text-cyan-400 tabular-nums">
                  {formatDecimal(evaluation.directNetPerKm, 1)} ₽/км
                </span>
              </div>
              <div className="bg-neutral-950/80 p-3 rounded-lg border border-neutral-800 col-span-2 sm:col-span-1">
                <span className="text-[11px] text-neutral-400 block">Прямые расходы на заказ</span>
                <span className="text-base font-bold font-mono text-neutral-300 tabular-nums">
                  {formatCurrency(evaluation.directCostsTotal)}
                </span>
              </div>
            </div>
          </div>

          {/* Breakdown of where the money goes for this exact order */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 border-b border-neutral-800 pb-3">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              Детализация расходов на эту поездку ({evaluation.totalKm.toFixed(1)} км, {evaluation.totalTimeMin} мин)
            </h3>

            <div className="space-y-4 text-xs">
              
              {/* Order Fare */}
              <div className="flex justify-between items-center py-1 border-b border-neutral-800/60">
                <div>
                  <span className="text-neutral-300 font-medium">Стоимость заказа для клиента</span>
                  <div className="text-[11px] text-neutral-400 flex flex-wrap items-center gap-1.5 mt-0.5">
                    <span>Базовый тариф: <strong className="text-neutral-200 font-mono">{evaluation.tariffBaseCalculated} ₽</strong></span>
                    {evaluation.surgeBonusRub > 0 && (
                      <span className="text-amber-400 font-semibold bg-amber-950/60 border border-amber-500/30 px-1.5 py-0.2 rounded font-mono">
                        Повышенный спрос: +{evaluation.surgeBonusRub} ₽ (×{evaluation.surgeMultiplier})
                      </span>
                    )}
                    {evaluation.waitingEarnings > 0 && (
                      <span className="text-emerald-400 font-mono">
                        · Платное ожидание: +{evaluation.waitingEarnings} ₽
                      </span>
                    )}
                  </div>
                </div>
                <span className="font-mono text-white tabular-nums font-semibold text-sm">
                  +{formatCurrency(evaluation.grossAmount)}
                </span>
              </div>

              {/* Tariff Composition Formula */}
              <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800/70 space-y-1.5 text-[11px]">
                <div className="font-semibold text-neutral-300 flex items-center justify-between">
                  <span>Формула расчета тарифа агрегатора:</span>
                  <span className="font-mono text-amber-400">{detailedTariffFare.totalCalculatedFare} ₽</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-neutral-400 font-mono">
                  <div>Подача: <span className="text-white">{detailedTariffFare.basePrice} ₽</span> (вкл {detailedTariffFare.includedKm} км, {detailedTariffFare.includedMinutes} мин)</div>
                  <div>Км сверх подачи: <span className="text-white">{detailedTariffFare.chargeableKm.toFixed(1)} км × {liveActiveTariffConfig.pricePerKm} ₽ = {detailedTariffFare.distanceCost} ₽</span></div>
                  <div>Время сверх подачи: <span className="text-white">{detailedTariffFare.chargeableMin.toFixed(1)} мин × {liveActiveTariffConfig.pricePerMinute} ₽ = {detailedTariffFare.timeCost} ₽</span></div>
                  <div>Ожидание: <span className="text-white">{calculatedPaidWaitingMin} мин = {detailedTariffFare.waitingCost} ₽</span></div>
                </div>
              </div>

              {/* =========================================================================
                  SECTION 1: DIRECT RUNNING COSTS OF THIS ORDER (Списываются сразу)
                 ========================================================================= */}
              <div className="space-y-2 pt-1">
                <span className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                  <span>1. Прямые переменные расходы на поездку</span>
                  <span className="text-[10px] text-neutral-500 font-normal">(списываются моментально по факту)</span>
                </span>

                <div className="bg-neutral-950/60 rounded-xl border border-neutral-800/80 p-3 space-y-2.5">
                  <div className="flex justify-between items-center text-neutral-400">
                    <div>
                      <span>Комиссия агрегатора ({evaluation.aggregatorCommissionPercent}%)</span>
                      <span className="text-[10px] text-neutral-500 block">Яндекс Про / Сервис такси</span>
                    </div>
                    <span className="font-mono text-rose-400 tabular-nums">
                      -{formatCurrency(evaluation.aggregatorFee)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-neutral-400">
                    <span>Комиссия таксопарка ({settings.parkCommissionPercent}%)</span>
                    <span className="font-mono text-rose-400 tabular-nums">
                      -{formatCurrency(evaluation.parkFee)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-neutral-400">
                    <span>Налог ({settings.taxPercent}%)</span>
                    <span className="font-mono text-rose-400 tabular-nums">
                      -{formatCurrency(evaluation.taxAmount)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-neutral-400">
                    <div>
                      <span>Топливо на поездку ({evaluation.totalKm.toFixed(1)} км)</span>
                      <span className="text-[10px] text-neutral-500 block">
                        С учетом {tripInput.pickupDistanceKm} км подачи
                      </span>
                    </div>
                    <span className="font-mono text-rose-400 tabular-nums">
                      -{formatCurrency(evaluation.fuelCost)}
                    </span>
                  </div>

                  {/* Cash-in-pocket immediate balance */}
                  <div className="pt-2 border-t border-neutral-800 flex items-center justify-between bg-emerald-950/20 p-2.5 rounded-lg border border-emerald-500/30">
                    <div>
                      <span className="font-bold text-white block">
                        Остается на руки сразу с заказа:
                      </span>
                      <span className="text-[10px] text-emerald-300">
                        Реальный заработок водителя после топлива, комиссий и налогов
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold font-mono text-emerald-400 text-base tabular-nums block">
                        +{formatCurrency(evaluation.directNetProfit)}
                      </span>
                      <span className="text-[10px] font-mono text-neutral-400">
                        {formatCurrency(evaluation.directNetPerHour)}/ч
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* =========================================================================
                  SECTION 2: DEDICATED HIGHLIGHTED SUB-BLOCK FOR SHIFT OVERHEADS
                  (Амортизация, аренда, ТО, штрафы, ОСАГО — накладываются на всю смену)
                 ========================================================================= */}
              <div className="space-y-2 pt-2">
                <div className="bg-neutral-950 p-4 rounded-xl border-2 border-amber-500/50 shadow-lg space-y-3">
                  
                  {/* Header with car/wrench icon */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-neutral-800/80 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Car className="w-4 h-4 text-amber-400" />
                      <span className="font-bold text-amber-300 uppercase tracking-wide text-xs">
                        2. Постоянные расходы владения и смены ({settings.ownershipType === 'loan' ? 'автокредит / ТО / ОСАГО' : settings.ownershipType === 'own' ? 'амортизация / ТО / ОСАГО' : settings.ownershipType === 'rent_to_own' ? 'выкуп / ТО' : 'аренда парка'})
                      </span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 bg-amber-500/20 text-amber-300 font-semibold rounded-full border border-amber-500/40 w-fit">
                      Накладывается на всю смену
                    </span>
                  </div>

                  {/* Crucial Explanation Box */}
                  <div className="bg-amber-950/30 border border-amber-500/40 rounded-lg p-3 text-neutral-200 text-xs space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-amber-300">
                      <Info className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Почему эта категория не списывается с одного заказа:</span>
                    </div>
                    <p className="text-neutral-300 leading-relaxed text-[11px]">
                      Эта категория расходов <strong>накладывается на итоговую сумму чистой прибыли за смену</strong>. Показывать, что амортизация или аренда «съедают» большую часть прибыли в расчете одного заказа — некорректно.
                    </p>
                    <p className="text-neutral-400 leading-relaxed text-[11px]">
                      {settings.ownershipType === 'rent' ? (
                        <>Например: водитель сделал <strong>30 заказов за смену</strong>, из которых за первые <strong>10 заказов он полностью отбил суточную аренду ({settings.rentDailyCost} ₽) и топливо</strong>, а остальные 20 заказов приносят чистую прибыль!</>
                      ) : settings.ownershipType === 'loan' ? (
                        <>При автокредите водитель за первые <strong>7–9 заказов отбивает сменную долю кредита банку ({Math.round(calculateDailyLoanShare(settings, 24))} ₽), фонд ТО ({calculateMaintenanceCostPerKm(settings).toFixed(2)} ₽/км) и бензин</strong>, после чего каждый последующий заказ формирует чистую прибыль!</>
                      ) : settings.ownershipType === 'rent_to_own' ? (
                        <>По договору выкупа водитель за первые <strong>8–10 заказов окупает суточный платеж ({settings.rentDailyCost} ₽) и бензин</strong>, после чего каждый последующий заказ работает в чистый плюс!</>
                      ) : (
                        <>Например: сделав <strong>15 заказов на своей машине</strong>, водитель за первые <strong>5–7 заказов окупает суточные расходы на владение авто</strong> (ТО, страховка, износ железа), а все последующие заказы формируют чистый плюс!</>
                      )}
                    </p>
                  </div>

                  {/* Items breakdown inside subblock */}
                  <div className="space-y-2 pt-1 text-[11px]">
                    <div className="flex justify-between items-center text-neutral-300 py-0.5">
                      <span className="flex items-center gap-1.5">
                        <Wrench className="w-3.5 h-3.5 text-neutral-400" />
                        <span>Резерв на плановое ТО и расходники ({evaluation.totalKm.toFixed(1)} км):</span>
                      </span>
                      <span className="font-mono text-amber-400 font-semibold tabular-nums">
                        ~{formatCurrency(evaluation.maintenanceShareCost)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-neutral-300 py-0.5">
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-neutral-400" />
                        <span>
                          {settings.ownershipType === 'own'
                            ? `Амортизация железа машины (${evaluation.totalKm.toFixed(1)} км):`
                            : settings.ownershipType === 'loan'
                            ? `Сменная доля платежа по автокредиту на заказ:`
                            : settings.ownershipType === 'rent_to_own'
                            ? `Выкупной суточный платеж на дистанцию заказа:`
                            : `Суточная аренда парка на дистанцию заказа:`}
                        </span>
                      </span>
                      <span className="font-mono text-amber-400 font-semibold tabular-nums">
                        ~{formatCurrency(evaluation.depreciationShareCost)}
                      </span>
                    </div>

                    {/* Break-even contribution banner */}
                    <div className="mt-2 p-2.5 bg-neutral-900/90 rounded-lg border border-neutral-800 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-white">
                          Вклад этого заказа в окупаемость смены:
                        </span>
                        <span className="font-bold font-mono text-amber-400">
                          {evaluation.breakEvenSharePercent}% от плана
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-amber-500 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${Math.min(100, Math.max(5, evaluation.breakEvenSharePercent))}%` }}
                        />
                      </div>

                      <p className="text-[10px] text-neutral-400">
                        Этот заказ приносит <strong className="text-emerald-400 font-mono">+{formatCurrency(evaluation.directNetProfit)}</strong> на руки. Чтобы полностью закрыть суточные расходы смены (~{formatCurrency(evaluation.dailyRentOrFixedTarget)}), достаточно выполнить всего <strong className="text-white font-mono">~{evaluation.ordersToBreakEven} таких заказов</strong>.
                      </p>
                    </div>

                    {/* Bottom theoretical strictly amortized net profit */}
                    <div className="flex justify-between items-center pt-2 border-t border-neutral-800/80 text-xs">
                      <span className="text-neutral-400">
                        Справочно: остаток при строгом списании всех фондов на этот заказ:
                      </span>
                      <span className={`font-mono font-bold tabular-nums ${
                        evaluation.netProfit >= 0 ? 'text-neutral-300' : 'text-rose-400'
                      }`}>
                        {formatCurrency(evaluation.netProfit)}
                      </span>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          </div>

          {/* Golden Rule Tip */}
          <div className="bg-neutral-950 border border-neutral-800 p-4 rounded-xl flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-neutral-300 space-y-1">
              <span className="font-semibold text-white">Золотое правило опытного таксиста:</span>
              <p className="text-neutral-400">
                Никогда не берите заказ, где подача занимает больше 30% от общей дистанции поездки без повышенного коэффициента. Длинная неоплачиваемая подача мгновенно обнуляет вашу часовую ставку.
              </p>
            </div>
          </div>

          {/* Integrated Partner Ad Block for Order Radar */}
          <IntegratedAdBanner placement="radar" variant="compact" />

        </div>

      </div>

    </div>
  );
};
