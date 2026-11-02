import React, { useState, useEffect } from 'react';
import { 
  FuelType, 
  MaintenanceItem, 
  OwnershipType, 
  TariffCategory, 
  TariffConfig, 
  TariffSettings, 
  TaxType, 
  VehicleSettings 
} from '../types/taxi';
import { 
  calculateCarLoan,
  calculateDepreciationPerKm, 
  calculateEffectiveDailyRent, 
  calculateFuelCostPerKm, 
  calculateFullCostPerKm, 
  calculateMaintenanceCostPerKm 
} from '../utils/calculations';
import { 
  DEFAULT_FUEL_CONSUMPTIONS, 
  DEFAULT_FUEL_PRICES, 
  DEFAULT_MAINTENANCE_ITEMS, 
  DEFAULT_TARIFF_SETTINGS, 
  DEFAULT_TARIFFS, 
  FUEL_LABELS, 
  TARIFF_LABELS, 
  VEHICLE_PRESETS, 
  VehiclePreset 
} from '../utils/constants';
import { formatCurrency, formatDecimal } from '../utils/storage';
import { 
  Save, 
  RotateCcw, 
  Car, 
  Fuel, 
  Wrench, 
  Percent, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Check,
  ShieldCheck,
  KeyRound,
  FileText,
  CreditCard
} from 'lucide-react';

interface VehicleSettingsViewProps {
  currentSettings: VehicleSettings;
  onSaveSettings: (settings: VehicleSettings) => void;
}

export const VehicleSettingsView: React.FC<VehicleSettingsViewProps> = ({
  currentSettings,
  onSaveSettings,
}) => {
  // Local editable draft state with full fuel and tariff dictionaries guaranteed
  const [formState, setFormState] = useState<VehicleSettings>(() => {
    const tariffSettings = currentSettings.tariffSettings || DEFAULT_TARIFF_SETTINGS;
    return {
      ...currentSettings,
      tariffSettings,
      buyoutTermMonths: currentSettings.buyoutTermMonths ?? 36,
      buyoutResidualPrice: currentSettings.buyoutResidualPrice ?? 0,
      loanCarPrice: currentSettings.loanCarPrice ?? currentSettings.carMarketValue ?? 1650000,
      loanDownPayment: currentSettings.loanDownPayment ?? Math.round((currentSettings.loanCarPrice ?? currentSettings.carMarketValue ?? 1650000) * 0.2),
      loanTermMonths: currentSettings.loanTermMonths ?? 36,
      loanAnnualRatePercent: currentSettings.loanAnnualRatePercent ?? 19.5,
      loanMonthlyPayment: currentSettings.loanMonthlyPayment ?? undefined,
      customFuelPrices: {
        ...DEFAULT_FUEL_PRICES,
        ...(currentSettings.customFuelPrices || {}),
        [currentSettings.fuelType]: currentSettings.fuelPricePerUnit,
      },
      customFuelConsumptions: {
        ...DEFAULT_FUEL_CONSUMPTIONS,
        ...(currentSettings.customFuelConsumptions || {}),
        [currentSettings.fuelType]: currentSettings.fuelConsumptionPer100Km,
      },
    };
  });

  const [saveSuccessToast, setSaveSuccessToast] = useState(false);
  const [showAllFuelTable, setShowAllFuelTable] = useState(true);

  // String state for decimal inputs of the active fuel
  const [fuelConsumptionInput, setFuelConsumptionInput] = useState<string>(
    (currentSettings.fuelConsumptionPer100Km ?? 9.4).toString()
  );
  const [fuelPriceInput, setFuelPriceInput] = useState<string>(
    (currentSettings.fuelPricePerUnit ?? 58.9).toString()
  );

  // New maintenance item inputs
  const [newItemName, setNewItemName] = useState('');
  const [newItemCost, setNewItemCost] = useState<number>(5000);
  const [newItemInterval, setNewItemInterval] = useState<number>(30000);

  // Synchronize when currentSettings updates externally
  useEffect(() => {
    const prices: Record<FuelType, number> = {
      ...DEFAULT_FUEL_PRICES,
      ...(currentSettings.customFuelPrices || {}),
      [currentSettings.fuelType]: currentSettings.fuelPricePerUnit,
    };
    const consumptions: Record<FuelType, number> = {
      ...DEFAULT_FUEL_CONSUMPTIONS,
      ...(currentSettings.customFuelConsumptions || {}),
      [currentSettings.fuelType]: currentSettings.fuelConsumptionPer100Km,
    };

    setFormState({
      ...currentSettings,
      tariffSettings: currentSettings.tariffSettings || DEFAULT_TARIFF_SETTINGS,
      buyoutTermMonths: currentSettings.buyoutTermMonths ?? 36,
      buyoutResidualPrice: currentSettings.buyoutResidualPrice ?? 0,
      loanCarPrice: currentSettings.loanCarPrice ?? currentSettings.carMarketValue ?? 1650000,
      loanDownPayment: currentSettings.loanDownPayment ?? Math.round((currentSettings.loanCarPrice ?? currentSettings.carMarketValue ?? 1650000) * 0.2),
      loanTermMonths: currentSettings.loanTermMonths ?? 36,
      loanAnnualRatePercent: currentSettings.loanAnnualRatePercent ?? 19.5,
      loanMonthlyPayment: currentSettings.loanMonthlyPayment ?? undefined,
      customFuelPrices: prices,
      customFuelConsumptions: consumptions,
    });
    setFuelConsumptionInput((currentSettings.fuelConsumptionPer100Km ?? 9.4).toString());
    setFuelPriceInput((currentSettings.fuelPricePerUnit ?? 58.9).toString());
  }, [currentSettings]);

  const updateField = <K extends keyof VehicleSettings>(field: K, value: VehicleSettings[K]) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // --- Tariff Commission Change Handler (per tariff class) ---
  const handleTariffCommissionChange = (category: TariffCategory, val: number) => {
    setFormState((prev) => {
      const existingTariffSettings = prev.tariffSettings || DEFAULT_TARIFF_SETTINGS;
      const currentTariffConfig = existingTariffSettings.tariffs[category] || DEFAULT_TARIFFS[category];
      const updatedTariffConfig: TariffConfig = {
        ...currentTariffConfig,
        aggregatorCommissionPercent: val,
      };
      const updatedTariffs = {
        ...existingTariffSettings.tariffs,
        [category]: updatedTariffConfig,
      };
      const isCurrentCarCategory = prev.category === category;
      return {
        ...prev,
        aggregatorCommissionPercent: isCurrentCarCategory ? val : prev.aggregatorCommissionPercent,
        tariffSettings: {
          ...existingTariffSettings,
          tariffs: updatedTariffs,
        },
      };
    });
  };

  // --- Category change with auto-sync of aggregator commission ---
  const handleCategoryChange = (newCat: TariffCategory) => {
    const commissionForNewCat =
      formState.tariffSettings?.tariffs?.[newCat]?.aggregatorCommissionPercent ??
      DEFAULT_TARIFFS[newCat].aggregatorCommissionPercent;
    setFormState((prev) => ({
      ...prev,
      category: newCat,
      aggregatorCommissionPercent: commissionForNewCat,
    }));
  };

  // --- Switching Fuel Type Handler ---
  // Saves edits of previous fuel, then loads saved price & consumption of the new fuel
  const handleSelectFuelType = (newFuel: FuelType) => {
    const oldFuel = formState.fuelType;

    // 1. Commit whatever was typed in the inputs for the old fuel
    const parsedOldPrice = parseFloat(fuelPriceInput.replace(',', '.'));
    const parsedOldConsumption = parseFloat(fuelConsumptionInput.replace(',', '.'));

    const updatedPrices: Record<FuelType, number> = {
      ...DEFAULT_FUEL_PRICES,
      ...(formState.customFuelPrices || {}),
    };
    if (!isNaN(parsedOldPrice) && parsedOldPrice > 0) {
      updatedPrices[oldFuel] = parsedOldPrice;
    }

    const updatedConsumptions: Record<FuelType, number> = {
      ...DEFAULT_FUEL_CONSUMPTIONS,
      ...(formState.customFuelConsumptions || {}),
    };
    if (!isNaN(parsedOldConsumption) && parsedOldConsumption > 0) {
      updatedConsumptions[oldFuel] = parsedOldConsumption;
    }

    // 2. Retrieve previously saved or customized value for the new fuel
    const loadedPrice =
      updatedPrices[newFuel] ??
      currentSettings.customFuelPrices?.[newFuel] ??
      DEFAULT_FUEL_PRICES[newFuel];

    const loadedConsumption =
      updatedConsumptions[newFuel] ??
      currentSettings.customFuelConsumptions?.[newFuel] ??
      DEFAULT_FUEL_CONSUMPTIONS[newFuel];

    // 3. Update both state and string inputs
    setFormState((prev) => ({
      ...prev,
      fuelType: newFuel,
      fuelPricePerUnit: loadedPrice,
      fuelConsumptionPer100Km: loadedConsumption,
      customFuelPrices: updatedPrices,
      customFuelConsumptions: updatedConsumptions,
    }));

    setFuelPriceInput(loadedPrice.toString());
    setFuelConsumptionInput(loadedConsumption.toString());
  };

  // --- Price input change for active fuel ---
  const handlePriceInputChange = (val: string) => {
    if (!/^[0-9]*[.,]?[0-9]*$/.test(val)) return;
    setFuelPriceInput(val);
    const parsed = parseFloat(val.replace(',', '.'));
    if (!isNaN(parsed) && parsed > 0) {
      setFormState((prev) => ({
        ...prev,
        fuelPricePerUnit: parsed,
        customFuelPrices: {
          ...prev.customFuelPrices,
          [prev.fuelType]: parsed,
        },
      }));
    }
  };

  // --- Consumption input change for active fuel ---
  const handleConsumptionInputChange = (val: string) => {
    if (!/^[0-9]*[.,]?[0-9]*$/.test(val)) return;
    setFuelConsumptionInput(val);
    const parsed = parseFloat(val.replace(',', '.'));
    if (!isNaN(parsed) && parsed > 0) {
      setFormState((prev) => ({
        ...prev,
        fuelConsumptionPer100Km: parsed,
        customFuelConsumptions: {
          ...prev.customFuelConsumptions,
          [prev.fuelType]: parsed,
        },
      }));
    }
  };

  // --- Direct price edit for any fuel from the all-fuels table ---
  const handleAnyFuelPriceChange = (fuel: FuelType, newPrice: number) => {
    if (isNaN(newPrice) || newPrice <= 0) return;
    setFormState((prev) => {
      const nextPrices = {
        ...prev.customFuelPrices,
        [fuel]: newPrice,
      };
      const isCurrent = prev.fuelType === fuel;
      if (isCurrent) {
        setFuelPriceInput(newPrice.toString());
      }
      return {
        ...prev,
        fuelPricePerUnit: isCurrent ? newPrice : prev.fuelPricePerUnit,
        customFuelPrices: nextPrices,
      };
    });
  };

  // --- Direct consumption edit for any fuel from the all-fuels table ---
  const handleAnyFuelConsumptionChange = (fuel: FuelType, newConsumption: number) => {
    if (isNaN(newConsumption) || newConsumption <= 0) return;
    setFormState((prev) => {
      const nextConsumptions = {
        ...prev.customFuelConsumptions,
        [fuel]: newConsumption,
      };
      const isCurrent = prev.fuelType === fuel;
      if (isCurrent) {
        setFuelConsumptionInput(newConsumption.toString());
      }
      return {
        ...prev,
        fuelConsumptionPer100Km: isCurrent ? newConsumption : prev.fuelConsumptionPer100Km,
        customFuelConsumptions: nextConsumptions,
      };
    });
  };

  // --- Dirty tracking against currentSettings (saved in localStorage / DB) ---
  const isCarNameChanged = formState.carName !== currentSettings.carName;
  const isOwnershipTypeChanged = formState.ownershipType !== currentSettings.ownershipType;
  const isCategoryChanged = formState.category !== currentSettings.category;

  const isCarMarketValueChanged = formState.carMarketValue !== currentSettings.carMarketValue;
  const isPlannedUsageKmChanged = formState.plannedUsageKm !== currentSettings.plannedUsageKm;
  const isResidualValueChanged = formState.residualValuePercent !== currentSettings.residualValuePercent;

  const isRentDailyCostChanged = formState.rentDailyCost !== currentSettings.rentDailyCost;
  const isRentDepositDailyChanged = (formState.rentDepositDaily ?? 0) !== (currentSettings.rentDepositDaily ?? 0);
  const isRentScheduleOnChanged = formState.rentScheduleDaysOn !== currentSettings.rentScheduleDaysOn;
  const isRentScheduleOffChanged = (formState.rentScheduleDaysOff ?? 0) !== (currentSettings.rentScheduleDaysOff ?? 0);
  const isRentChargeOnDaysOffChanged = (formState.rentChargeOnDaysOff !== false) !== (currentSettings.rentChargeOnDaysOff !== false);
  const isBuyoutTermChanged = (formState.buyoutTermMonths ?? 36) !== (currentSettings.buyoutTermMonths ?? 36);
  const isBuyoutResidualChanged = (formState.buyoutResidualPrice ?? 0) !== (currentSettings.buyoutResidualPrice ?? 0);

  const isLoanCarPriceChanged = (formState.loanCarPrice ?? formState.carMarketValue) !== (currentSettings.loanCarPrice ?? currentSettings.carMarketValue);
  const isLoanDownPaymentChanged = (formState.loanDownPayment ?? 0) !== (currentSettings.loanDownPayment ?? 0);
  const isLoanTermChanged = (formState.loanTermMonths ?? 36) !== (currentSettings.loanTermMonths ?? 36);
  const isLoanRateChanged = (formState.loanAnnualRatePercent ?? 19.5) !== (currentSettings.loanAnnualRatePercent ?? 19.5);
  const isLoanMonthlyPaymentChanged = (formState.loanMonthlyPayment ?? 0) !== (currentSettings.loanMonthlyPayment ?? 0);

  const isFuelTypeChanged = formState.fuelType !== currentSettings.fuelType;

  // Active fuel price compared against what is currently saved in DB for this fuel type:
  const savedPriceForActiveFuel =
    currentSettings.customFuelPrices?.[formState.fuelType] ??
    (formState.fuelType === currentSettings.fuelType ? currentSettings.fuelPricePerUnit : DEFAULT_FUEL_PRICES[formState.fuelType]);

  const parsedPrice = parseFloat(fuelPriceInput.replace(',', '.'));
  const isFuelPriceChanged =
    !isNaN(parsedPrice) && Math.abs(parsedPrice - savedPriceForActiveFuel) > 0.001;

  // Active fuel consumption compared against what is currently saved in DB for this fuel type:
  const savedConsumptionForActiveFuel =
    currentSettings.customFuelConsumptions?.[formState.fuelType] ??
    (formState.fuelType === currentSettings.fuelType ? currentSettings.fuelConsumptionPer100Km : DEFAULT_FUEL_CONSUMPTIONS[formState.fuelType]);

  const parsedConsumption = parseFloat(fuelConsumptionInput.replace(',', '.'));
  const isFuelConsumptionChanged =
    !isNaN(parsedConsumption) && Math.abs(parsedConsumption - savedConsumptionForActiveFuel) > 0.001;

  // Check if any other non-active fuel price or consumption was edited:
  const areOtherFuelPricesChanged = (Object.keys(DEFAULT_FUEL_PRICES) as FuelType[]).some((fKey) => {
    if (fKey === formState.fuelType) return false;
    const currentVal = formState.customFuelPrices?.[fKey] ?? DEFAULT_FUEL_PRICES[fKey];
    const savedVal = currentSettings.customFuelPrices?.[fKey] ?? DEFAULT_FUEL_PRICES[fKey];
    return Math.abs(currentVal - savedVal) > 0.001;
  });

  const areOtherFuelConsumptionsChanged = (Object.keys(DEFAULT_FUEL_CONSUMPTIONS) as FuelType[]).some((fKey) => {
    if (fKey === formState.fuelType) return false;
    const currentVal = formState.customFuelConsumptions?.[fKey] ?? DEFAULT_FUEL_CONSUMPTIONS[fKey];
    const savedVal = currentSettings.customFuelConsumptions?.[fKey] ?? DEFAULT_FUEL_CONSUMPTIONS[fKey];
    return Math.abs(currentVal - savedVal) > 0.001;
  });

  const isAggregatorFeeChanged = formState.aggregatorCommissionPercent !== currentSettings.aggregatorCommissionPercent;

  // Tariff commissions dirty tracking (per category)
  const isTariffCommissionChanged = (cat: TariffCategory) => {
    const curVal = formState.tariffSettings?.tariffs?.[cat]?.aggregatorCommissionPercent ?? DEFAULT_TARIFFS[cat].aggregatorCommissionPercent;
    const savedVal = currentSettings.tariffSettings?.tariffs?.[cat]?.aggregatorCommissionPercent ?? DEFAULT_TARIFFS[cat].aggregatorCommissionPercent;
    return Math.abs(curVal - savedVal) > 0.001;
  };

  const areTariffCommissionsChanged = (['economy', 'comfort', 'comfort_plus', 'business'] as TariffCategory[]).some(isTariffCommissionChanged);

  const isParkFeeChanged = formState.parkCommissionPercent !== currentSettings.parkCommissionPercent;
  const isPayoutFeeChanged = formState.payoutFeePercent !== currentSettings.payoutFeePercent;

  const isTaxTypeChanged = formState.taxType !== currentSettings.taxType;
  const isTaxRateChanged = formState.taxPercent !== currentSettings.taxPercent;

  const isInsuranceChanged = formState.insuranceAnnualCost !== currentSettings.insuranceAnnualCost;
  const isCarWashChanged = formState.carWashPerShift !== currentSettings.carWashPerShift;
  const isMiscChanged = formState.miscPerShift !== currentSettings.miscPerShift;

  const isMaintenanceChanged = JSON.stringify(formState.maintenanceItems) !== JSON.stringify(currentSettings.maintenanceItems);

  const changedFieldsCount = [
    isCarNameChanged,
    isOwnershipTypeChanged,
    isCategoryChanged,
    isCarMarketValueChanged,
    isPlannedUsageKmChanged,
    isResidualValueChanged,
    isRentDailyCostChanged,
    isRentDepositDailyChanged,
    isRentScheduleOnChanged,
    isRentScheduleOffChanged,
    isRentChargeOnDaysOffChanged,
    isBuyoutTermChanged,
    isBuyoutResidualChanged,
    isLoanCarPriceChanged,
    isLoanDownPaymentChanged,
    isLoanTermChanged,
    isLoanRateChanged,
    isLoanMonthlyPaymentChanged,
    isFuelTypeChanged,
    isFuelConsumptionChanged,
    isFuelPriceChanged,
    areOtherFuelPricesChanged,
    areOtherFuelConsumptionsChanged,
    isAggregatorFeeChanged,
    areTariffCommissionsChanged,
    isParkFeeChanged,
    isPayoutFeeChanged,
    isTaxTypeChanged,
    isTaxRateChanged,
    isInsuranceChanged,
    isCarWashChanged,
    isMiscChanged,
    isMaintenanceChanged,
  ].filter(Boolean).length;

  const hasUnsavedChanges = changedFieldsCount > 0;

  // --- Dynamic yellow styling helper for modified inputs ---
  const getInputClass = (isChanged: boolean, extra = '') =>
    `w-full rounded-lg px-3 py-2 text-sm font-mono tabular-nums transition-all focus:outline-none ${
      isChanged
        ? 'bg-amber-950/40 border-2 border-amber-400 text-amber-100 ring-2 ring-amber-400/40 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
        : 'bg-neutral-950 border border-neutral-800 text-white focus:border-amber-500'
    } ${extra}`;

  const getSelectClass = (isChanged: boolean, extra = '') =>
    `w-full rounded-lg px-3 py-2 text-xs transition-all focus:outline-none ${
      isChanged
        ? 'bg-amber-950/40 border-2 border-amber-400 text-amber-100 ring-2 ring-amber-400/40 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
        : 'bg-neutral-950 border border-neutral-800 text-white focus:border-amber-500'
    } ${extra}`;

  const renderChangedBadge = (isChanged: boolean) =>
    isChanged ? (
      <span className="text-[10px] text-amber-400 font-bold ml-1.5 animate-pulse whitespace-nowrap">
        ● не сохранено
      </span>
    ) : null;

  // --- Save Handler ---
  const handleSave = () => {
    // 1. Parse active fuel inputs
    const cleanConsumption = parseFloat(fuelConsumptionInput.replace(',', '.'));
    const finalConsumption =
      !isNaN(cleanConsumption) && cleanConsumption > 0
        ? cleanConsumption
        : formState.fuelConsumptionPer100Km || DEFAULT_FUEL_CONSUMPTIONS[formState.fuelType];

    const cleanPrice = parseFloat(fuelPriceInput.replace(',', '.'));
    const finalPrice =
      !isNaN(cleanPrice) && cleanPrice > 0
        ? cleanPrice
        : formState.fuelPricePerUnit || DEFAULT_FUEL_PRICES[formState.fuelType];

    // 2. Merge all prices and consumptions for all fuel types
    const finalPrices: Record<FuelType, number> = {
      ...DEFAULT_FUEL_PRICES,
      ...(formState.customFuelPrices || {}),
      [formState.fuelType]: finalPrice,
    };

    const finalConsumptions: Record<FuelType, number> = {
      ...DEFAULT_FUEL_CONSUMPTIONS,
      ...(formState.customFuelConsumptions || {}),
      [formState.fuelType]: finalConsumption,
    };

    const finalSettingsToSave: VehicleSettings = {
      ...formState,
      fuelPricePerUnit: finalPrice,
      fuelConsumptionPer100Km: finalConsumption,
      customFuelPrices: finalPrices,
      customFuelConsumptions: finalConsumptions,
      tariffSettings: formState.tariffSettings || DEFAULT_TARIFF_SETTINGS,
    };

    setFormState(finalSettingsToSave);
    setFuelConsumptionInput(finalConsumption.toString());
    setFuelPriceInput(finalPrice.toString());

    // 3. Save to database / localStorage via parent callback
    onSaveSettings(finalSettingsToSave);
    setSaveSuccessToast(true);
    setTimeout(() => setSaveSuccessToast(false), 3500);
  };

  const handleResetToCurrent = () => {
    const prices: Record<FuelType, number> = {
      ...DEFAULT_FUEL_PRICES,
      ...(currentSettings.customFuelPrices || {}),
      [currentSettings.fuelType]: currentSettings.fuelPricePerUnit,
    };
    const consumptions: Record<FuelType, number> = {
      ...DEFAULT_FUEL_CONSUMPTIONS,
      ...(currentSettings.customFuelConsumptions || {}),
      [currentSettings.fuelType]: currentSettings.fuelConsumptionPer100Km,
    };

    setFormState({
      ...currentSettings,
      tariffSettings: currentSettings.tariffSettings || DEFAULT_TARIFF_SETTINGS,
      buyoutTermMonths: currentSettings.buyoutTermMonths ?? 36,
      buyoutResidualPrice: currentSettings.buyoutResidualPrice ?? 0,
      loanCarPrice: currentSettings.loanCarPrice ?? currentSettings.carMarketValue ?? 1650000,
      loanDownPayment: currentSettings.loanDownPayment ?? Math.round((currentSettings.loanCarPrice ?? currentSettings.carMarketValue ?? 1650000) * 0.2),
      loanTermMonths: currentSettings.loanTermMonths ?? 36,
      loanAnnualRatePercent: currentSettings.loanAnnualRatePercent ?? 19.5,
      loanMonthlyPayment: currentSettings.loanMonthlyPayment ?? undefined,
      customFuelPrices: prices,
      customFuelConsumptions: consumptions,
    });
    setFuelConsumptionInput((currentSettings.fuelConsumptionPer100Km ?? 9.4).toString());
    setFuelPriceInput((currentSettings.fuelPricePerUnit ?? 58.9).toString());
  };

  const handleApplyPreset = (preset: VehiclePreset) => {
    const presetPrice =
      formState.customFuelPrices?.[preset.fuelType] ??
      FUEL_LABELS[preset.fuelType]?.defaultPrice ??
      DEFAULT_FUEL_PRICES[preset.fuelType];

    const presetCarPrice = preset.carMarketValue || formState.loanCarPrice || 1650000;

    setFormState((prev) => ({
      ...prev,
      carName: preset.name,
      category: preset.category,
      ownershipType: preset.ownershipType,
      fuelType: preset.fuelType,
      fuelConsumptionPer100Km: preset.fuelConsumptionPer100Km,
      fuelPricePerUnit: presetPrice,
      carMarketValue: preset.carMarketValue,
      loanCarPrice: presetCarPrice,
      loanDownPayment: Math.round(presetCarPrice * 0.2),
      rentDailyCost: preset.rentDailyCost,
    }));
    setFuelConsumptionInput(preset.fuelConsumptionPer100Km.toString());
    setFuelPriceInput(presetPrice.toString());
  };

  // Maintenance operations
  const handleAddMaintenanceItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || newItemCost <= 0 || newItemInterval <= 0) return;

    const newItem: MaintenanceItem = {
      id: `custom_${Date.now()}`,
      name: newItemName.trim(),
      cost: newItemCost,
      intervalKm: newItemInterval,
    };

    setFormState((prev) => ({
      ...prev,
      maintenanceItems: [...prev.maintenanceItems, newItem],
    }));
    setNewItemName('');
    setNewItemCost(5000);
    setNewItemInterval(30000);
  };

  const handleRemoveMaintenanceItem = (id: string) => {
    setFormState((prev) => ({
      ...prev,
      maintenanceItems: prev.maintenanceItems.filter((i) => i.id !== id),
    }));
  };

  const handleResetDefaultMaintenance = () => {
    setFormState((prev) => ({
      ...prev,
      maintenanceItems: DEFAULT_MAINTENANCE_ITEMS,
    }));
  };

  // Live preview metrics
  const previewFuelCost = calculateFuelCostPerKm(formState);
  const previewMaintCost = calculateMaintenanceCostPerKm(formState);
  const previewDeprCost = calculateDepreciationPerKm(formState);
  const previewFullCost = calculateFullCostPerKm(formState);
  const previewDailyRent = calculateEffectiveDailyRent(formState);

  // Loan metrics
  const loanCarPrice = formState.loanCarPrice || formState.carMarketValue || 1650000;
  const loanDownPayment = typeof formState.loanDownPayment === 'number' ? formState.loanDownPayment : Math.round(loanCarPrice * 0.2);
  const loanRate = formState.loanAnnualRatePercent ?? 19.5;
  const loanTerm = formState.loanTermMonths ?? 36;
  const previewLoan = calculateCarLoan(loanCarPrice, loanDownPayment, loanRate, loanTerm, 24);
  const autoCalculatedMonthlyPayment = Math.round(previewLoan.monthlyPayment);

  return (
    <div className="space-y-6">
      
      {/* =========================================================================
          SINGLE UNIFIED MASTER STICKY HEADER & SAVE BAR
          (No duplicate save blocks or confusing extra status bars)
         ========================================================================= */}
      <div className="sticky top-16 z-30 bg-neutral-900/95 backdrop-blur-md border border-neutral-800 rounded-xl p-4 sm:p-5 shadow-xl transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-amber-500 font-bold">
                Единый раздел параметров
              </span>
              <span className="text-neutral-600">·</span>
              <span className="text-xs text-neutral-400">
                Характеристики авто, топливо, комиссии и налоги
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-white mt-0.5">
              Параметры автомобиля и постоянные затраты
            </h1>
          </div>

          {/* Master Action Buttons */}
          <div className="flex items-center gap-2.5 shrink-0">
            {hasUnsavedChanges && (
              <button
                type="button"
                onClick={handleResetToCurrent}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-neutral-300 hover:text-white bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 rounded-lg transition-colors"
                title="Отменить все внесенные изменения и вернуть сохраненные"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Отменить</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSave}
              className={`flex items-center gap-2 px-6 py-2.5 font-bold text-sm rounded-lg shadow-lg transition-all ${
                hasUnsavedChanges
                  ? 'bg-amber-500 hover:bg-amber-400 text-neutral-950 ring-2 ring-amber-400/50 animate-pulse'
                  : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
              }`}
            >
              <Save className="w-4 h-4" />
              <span>
                {hasUnsavedChanges ? `Сохранить изменения (${changedFieldsCount})` : 'Сохранить изменения'}
              </span>
            </button>
          </div>
        </div>

        {/* Clear status line */}
        <div className="mt-3 pt-3 border-t border-neutral-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            {hasUnsavedChanges ? (
              <div className="flex items-center gap-1.5 text-amber-400 font-medium">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  Есть несохраненные параметры ({changedFieldsCount}). Измененные поля подсвечены желтым цветом.
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Все параметры сохранены в базу данных и актуальны.</span>
              </div>
            )}
          </div>

          {saveSuccessToast && (
            <div className="text-emerald-300 bg-emerald-950/90 border border-emerald-700 px-3 py-1 rounded-lg text-xs font-semibold animate-fade-in flex items-center gap-1.5 shadow-lg">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Параметры успешно записаны в базу данных!</span>
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          MAIN SETTINGS GRID
         ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column: Car, Fuel, Commissions & Taxes */}
        <div className="lg:col-span-7 space-y-6">

          {/* 1. Vehicle & Ownership Model */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Car className="w-5 h-5 text-amber-400" />
                1. Автомобиль и форма владения
              </h2>

              {/* Ownership Type Switch (4 options) */}
              <div className={`flex items-center p-1 rounded-lg border gap-1 flex-wrap ${isOwnershipTypeChanged ? 'border-amber-400 bg-amber-950/40 ring-1 ring-amber-400/50' : 'bg-neutral-950 border-neutral-800'}`}>
                <button
                  type="button"
                  onClick={() => updateField('ownershipType', 'own')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    formState.ownershipType === 'own'
                      ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Свой авто
                </button>
                <button
                  type="button"
                  onClick={() => updateField('ownershipType', 'loan')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    formState.ownershipType === 'loan'
                      ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Автокредит
                </button>
                <button
                  type="button"
                  onClick={() => updateField('ownershipType', 'rent')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    formState.ownershipType === 'rent'
                      ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Аренда в парке
                </button>
                <button
                  type="button"
                  onClick={() => updateField('ownershipType', 'rent_to_own')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    formState.ownershipType === 'rent_to_own'
                      ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Аренда с выкупом
                </button>
              </div>
            </div>

            {/* Quick Vehicle Presets inside Block 1 */}
            <div className="flex flex-wrap items-center gap-1.5 pb-1">
              <span className="text-[11px] text-neutral-500 mr-1">Быстрый шаблон:</span>
              {VEHICLE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className="text-[11px] px-2 py-0.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-neutral-300 rounded transition-colors whitespace-nowrap"
                >
                  {preset.name.split(' (')[0]}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-neutral-300 font-medium mb-1">
                  Марка и модель авто {renderChangedBadge(isCarNameChanged)}
                </label>
                <input
                  type="text"
                  value={formState.carName}
                  onChange={(e) => updateField('carName', e.target.value)}
                  className={getInputClass(isCarNameChanged, 'font-sans text-sm')}
                  placeholder="Hyundai Solaris 1.6 AT"
                />
              </div>

              <div>
                <label className="block text-neutral-300 font-medium mb-1">
                  Тарифный класс {renderChangedBadge(isCategoryChanged)}
                </label>
                <select
                  value={formState.category}
                  onChange={(e) => handleCategoryChange(e.target.value as TariffCategory)}
                  className={getSelectClass(isCategoryChanged)}
                >
                  <option value="economy">Эконом</option>
                  <option value="comfort">Комфорт</option>
                  <option value="comfort_plus">Комфорт+</option>
                  <option value="business">Бизнес</option>
                </select>
                <span className="text-[10px] text-neutral-500">Автоматически синхронизирует комиссию агрегатора</span>
              </div>
            </div>

            {/* Condition 1: Own Car */}
            {formState.ownershipType === 'own' && (
              <div className="bg-neutral-950/70 p-4 rounded-xl border border-neutral-800/80 space-y-3 text-xs">
                <span className="font-semibold text-amber-400 block uppercase tracking-wider text-[11px]">
                  Параметры амортизации железа (для личного авто)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-neutral-400 mb-1">
                      Рыночная цена, ₽ {renderChangedBadge(isCarMarketValueChanged)}
                    </label>
                    <input
                      type="number"
                      step="50000"
                      value={formState.carMarketValue || ''}
                      onChange={(e) => updateField('carMarketValue', Number(e.target.value))}
                      className={getInputClass(isCarMarketValueChanged)}
                    />
                  </div>

                  <div>
                    <label className="block text-neutral-400 mb-1">
                      Ресурс до продажи, км {renderChangedBadge(isPlannedUsageKmChanged)}
                    </label>
                    <input
                      type="number"
                      step="10000"
                      value={formState.plannedUsageKm || ''}
                      onChange={(e) => updateField('plannedUsageKm', Number(e.target.value))}
                      className={getInputClass(isPlannedUsageKmChanged)}
                    />
                  </div>

                  <div>
                    <label className="block text-neutral-400 mb-1">
                      Остаточная цена, % {renderChangedBadge(isResidualValueChanged)}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formState.residualValuePercent || ''}
                      onChange={(e) => updateField('residualValuePercent', Number(e.target.value))}
                      className={getInputClass(isResidualValueChanged)}
                    />
                  </div>
                </div>
                <div className="text-[11px] text-neutral-500">
                  Потеря рыночной стоимости составляет <strong className="text-cyan-400 font-mono">{formatDecimal(previewDeprCost, 2)} ₽</strong> с каждого пройденного километра.
                </div>
              </div>
            )}

            {/* Condition 2: Car Loan (Автокредит) */}
            {formState.ownershipType === 'loan' && (
              <div className="bg-neutral-950/70 p-4 rounded-xl border border-sky-500/30 space-y-4 text-xs animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-sky-400" />
                    <span className="font-semibold text-sky-400 block uppercase tracking-wider text-[11px]">
                      Параметры покупки авто в кредит (банковский автокредит)
                    </span>
                  </div>

                  {/* Quick Term Presets */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-neutral-400">Срок:</span>
                    {[
                      { months: 24, label: '2 года' },
                      { months: 36, label: '3 года' },
                      { months: 48, label: '4 года' },
                      { months: 60, label: '5 лет' },
                    ].map((term) => (
                      <button
                        key={term.months}
                        type="button"
                        onClick={() => updateField('loanTermMonths', term.months)}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                          (formState.loanTermMonths ?? 36) === term.months
                            ? 'bg-sky-500 text-neutral-950 font-bold'
                            : 'bg-neutral-900 text-neutral-300 hover:text-white border border-neutral-800'
                        }`}
                      >
                        {term.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Important notice banner for loan */}
                <div className="bg-sky-950/30 border border-sky-600/40 rounded-lg p-3 text-sky-200/90 text-[11px] space-y-1">
                  <div className="flex items-center gap-2 font-semibold text-sky-300">
                    <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0" />
                    <span>Особенность формы «Автокредит»:</span>
                  </div>
                  <p className="text-neutral-300 leading-relaxed">
                    Водитель оформляет автомобиль в собственность. Ежемесячный платеж банку распределяется на рабочие смены водителя в месяц (по умолчанию 24 смены). Расходы на плановые ТО, замену масла, колодок, ремонт и ОСАГО <strong>водитель несет самостоятельно</strong> (настраиваются в блоках 3 и 4) и учитываются в себестоимости каждого километра.
                  </p>
                </div>

                {/* Primary loan inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  
                  {/* Car Price */}
                  <div>
                    <label className="block text-neutral-400 mb-1">
                      Стоимость авто, ₽ {renderChangedBadge(isLoanCarPriceChanged)}
                    </label>
                    <input
                      type="number"
                      step="50000"
                      value={formState.loanCarPrice || formState.carMarketValue || ''}
                      onChange={(e) => {
                        const price = Number(e.target.value);
                        updateField('loanCarPrice', price);
                        updateField('carMarketValue', price);
                      }}
                      className={getInputClass(isLoanCarPriceChanged)}
                      placeholder="1650000"
                    />
                    <span className="text-[10px] text-neutral-500">Цена покупки по договору</span>
                  </div>

                  {/* Down payment */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-neutral-400">
                        Первый взнос, ₽ {renderChangedBadge(isLoanDownPaymentChanged)}
                      </label>
                      <span className="text-[10px] text-sky-400 font-mono">
                        {loanCarPrice > 0 ? `${Math.round((loanDownPayment / loanCarPrice) * 100)}%` : '0%'}
                      </span>
                    </div>
                    <input
                      type="number"
                      step="20000"
                      value={formState.loanDownPayment ?? ''}
                      onChange={(e) => updateField('loanDownPayment', Number(e.target.value))}
                      className={getInputClass(isLoanDownPaymentChanged)}
                      placeholder="330000"
                    />
                    
                    {/* Quick percentage buttons */}
                    <div className="flex items-center gap-1 mt-1">
                      {[0, 10, 20, 30, 50].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => updateField('loanDownPayment', Math.round((loanCarPrice * pct) / 100))}
                          className="px-1.5 py-0.2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-[10px] text-neutral-400 hover:text-white rounded transition-colors"
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Loan Term */}
                  <div>
                    <label className="block text-neutral-400 mb-1">
                      Срок кредита, мес. {renderChangedBadge(isLoanTermChanged)}
                    </label>
                    <input
                      type="number"
                      min="6"
                      max="120"
                      step="6"
                      value={formState.loanTermMonths ?? 36}
                      onChange={(e) => updateField('loanTermMonths', Number(e.target.value))}
                      className={getInputClass(isLoanTermChanged)}
                    />
                    <span className="text-[10px] text-neutral-500">
                      {(formState.loanTermMonths ?? 36) >= 12
                        ? `${((formState.loanTermMonths ?? 36) / 12).toFixed(1).replace('.0', '')} года / лет`
                        : `${formState.loanTermMonths ?? 36} мес.`}
                    </span>
                  </div>

                  {/* Interest rate */}
                  <div>
                    <label className="block text-neutral-400 mb-1">
                      Ставка банка, % {renderChangedBadge(isLoanRateChanged)}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="60"
                      step="0.5"
                      value={formState.loanAnnualRatePercent ?? 19.5}
                      onChange={(e) => updateField('loanAnnualRatePercent', Number(e.target.value))}
                      className={getInputClass(isLoanRateChanged)}
                    />
                    <span className="text-[10px] text-neutral-500">Годовая процентная ставка</span>
                  </div>

                </div>

                {/* Monthly Payment: Auto vs Manual */}
                <div className="p-3 bg-neutral-900/80 border border-neutral-800 rounded-xl space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="font-semibold text-white block">
                        Ежемесячный платеж по кредиту
                      </span>
                      <span className="text-[11px] text-neutral-400">
                        {formState.loanMonthlyPayment && formState.loanMonthlyPayment > 0
                          ? 'Установлен точный платеж из кредитного договора'
                          : 'Рассчитан автоматически по формуле аннуитета'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {formState.loanMonthlyPayment && formState.loanMonthlyPayment > 0 ? (
                        <button
                          type="button"
                          onClick={() => updateField('loanMonthlyPayment', undefined)}
                          className="px-2.5 py-1 text-[11px] text-sky-400 hover:text-sky-300 bg-neutral-950 border border-sky-800/60 rounded-lg transition-colors"
                        >
                          Сбросить на авторасчет ({formatCurrency(autoCalculatedMonthlyPayment)})
                        </button>
                      ) : null}

                      <div className="flex items-center gap-1.5">
                        <span className="text-neutral-400 text-xs">Платеж, ₽/мес:</span>
                        <input
                          type="number"
                          step="100"
                          value={formState.loanMonthlyPayment ?? autoCalculatedMonthlyPayment}
                          onChange={(e) => updateField('loanMonthlyPayment', Number(e.target.value))}
                          className={getInputClass(isLoanMonthlyPaymentChanged, 'w-36 text-right font-bold')}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Transparent Financial Analytics Strip */}
                <div className="bg-neutral-900/90 border border-neutral-800 p-3.5 rounded-lg text-neutral-300 text-[11px] space-y-2">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800/80">
                      <span className="text-[10px] text-neutral-500 block">Тело кредита (долг):</span>
                      <span className="font-bold text-white font-mono text-xs sm:text-sm">
                        {formatCurrency(previewLoan.principal)}
                      </span>
                    </div>

                    <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800/80">
                      <span className="text-[10px] text-neutral-500 block">Платеж в смену (24 смены):</span>
                      <span className="font-bold text-amber-400 font-mono text-xs sm:text-sm">
                        {formatCurrency(Math.round((formState.loanMonthlyPayment || autoCalculatedMonthlyPayment) / 24))}/смена
                      </span>
                    </div>

                    <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800/80">
                      <span className="text-[10px] text-neutral-500 block">Доля кредита на 1 км:</span>
                      <span className="font-bold text-cyan-400 font-mono text-xs sm:text-sm">
                        {formatDecimal((formState.loanMonthlyPayment || autoCalculatedMonthlyPayment) / (24 * 180), 2)} ₽/км
                      </span>
                    </div>

                    <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800/80">
                      <span className="text-[10px] text-neutral-500 block">Переплата по % за срок:</span>
                      <span className="font-bold text-rose-300 font-mono text-xs sm:text-sm">
                        {formatCurrency(previewLoan.totalInterest)}
                      </span>
                    </div>
                  </div>

                  <p className="text-neutral-400 text-[11px] leading-relaxed pt-1">
                    Сумма кредита <strong className="text-white font-mono">{formatCurrency(previewLoan.principal)}</strong> под <strong className="text-white font-mono">{loanRate}%</strong> на <strong className="text-white font-mono">{loanTerm} мес</strong>. Ежемесячный платеж составляет <strong className="text-amber-400 font-mono">{formatCurrency(formState.loanMonthlyPayment || autoCalculatedMonthlyPayment)}/мес</strong>. При графике 24 рабочих смены в месяц кредитная нагрузка на смену равна <strong className="text-white font-mono">{formatCurrency(Math.round((formState.loanMonthlyPayment || autoCalculatedMonthlyPayment) / 24))}</strong>.
                  </p>
                </div>
              </div>
            )}

            {/* Condition 3: Regular Fleet Rent */}
            {formState.ownershipType === 'rent' && (
              <div className="bg-neutral-950/70 p-4 rounded-xl border border-neutral-800/80 space-y-3.5 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="font-semibold text-amber-400 block uppercase tracking-wider text-[11px]">
                    Условия аренды в таксопарке
                  </span>
                  
                  {/* Quick Schedule Presets */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-neutral-400">График:</span>
                    <button
                      type="button"
                      onClick={() => {
                        updateField('rentScheduleDaysOn', 7);
                        updateField('rentScheduleDaysOff', 0);
                      }}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                        formState.rentScheduleDaysOn === 7 && formState.rentScheduleDaysOff === 0
                          ? 'bg-amber-500 text-neutral-950'
                          : 'bg-neutral-900 text-neutral-300 hover:text-white border border-neutral-800'
                      }`}
                    >
                      7/0
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        updateField('rentScheduleDaysOn', 6);
                        updateField('rentScheduleDaysOff', 1);
                      }}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                        formState.rentScheduleDaysOn === 6 && formState.rentScheduleDaysOff === 1
                          ? 'bg-amber-500 text-neutral-950'
                          : 'bg-neutral-900 text-neutral-300 hover:text-white border border-neutral-800'
                      }`}
                    >
                      6/1
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        updateField('rentScheduleDaysOn', 5);
                        updateField('rentScheduleDaysOff', 2);
                      }}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                        formState.rentScheduleDaysOn === 5 && formState.rentScheduleDaysOff === 2
                          ? 'bg-amber-500 text-neutral-950'
                          : 'bg-neutral-900 text-neutral-300 hover:text-white border border-neutral-800'
                      }`}
                    >
                      5/2
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-neutral-400 mb-1">
                      Аренда за сутки, ₽ {renderChangedBadge(isRentDailyCostChanged)}
                    </label>
                    <input
                      type="number"
                      step="50"
                      value={formState.rentDailyCost || ''}
                      onChange={(e) => updateField('rentDailyCost', Number(e.target.value))}
                      className={getInputClass(isRentDailyCostChanged)}
                    />
                  </div>

                  <div>
                    <label className="block text-neutral-400 mb-1">
                      Депозит/смена, ₽ {renderChangedBadge(isRentDepositDailyChanged)}
                    </label>
                    <input
                      type="number"
                      step="50"
                      value={formState.rentDepositDaily ?? 0}
                      onChange={(e) => updateField('rentDepositDaily', Number(e.target.value))}
                      className={getInputClass(isRentDepositDailyChanged)}
                    />
                    <span className="text-[10px] text-neutral-500">0 если нет залога</span>
                  </div>

                  <div>
                    <label className="block text-neutral-400 mb-1">
                      Дней работы {renderChangedBadge(isRentScheduleOnChanged)}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="7"
                      value={formState.rentScheduleDaysOn}
                      onChange={(e) => updateField('rentScheduleDaysOn', Number(e.target.value))}
                      className={getInputClass(isRentScheduleOnChanged)}
                    />
                  </div>

                  <div>
                    <label className="block text-neutral-400 mb-1">
                      Дней отдыха {renderChangedBadge(isRentScheduleOffChanged)}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="7"
                      value={formState.rentScheduleDaysOff ?? 0}
                      onChange={(e) => updateField('rentScheduleDaysOff', Number(e.target.value))}
                      className={getInputClass(isRentScheduleOffChanged)}
                    />
                  </div>
                </div>

                {/* Park Charging Policy Toggle */}
                {formState.rentScheduleDaysOff > 0 && (
                  <div className={`flex items-center gap-2 p-2 rounded-lg border ${isRentChargeOnDaysOffChanged ? 'border-amber-400 bg-amber-950/40' : 'border-transparent'}`}>
                    <input
                      type="checkbox"
                      id="rentChargeOnDaysOff"
                      checked={formState.rentChargeOnDaysOff !== false}
                      onChange={(e) => updateField('rentChargeOnDaysOff', e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-neutral-900 border-neutral-700"
                    />
                    <label htmlFor="rentChargeOnDaysOff" className="text-neutral-300 text-xs cursor-pointer">
                      Парк списывает аренду и за выходные дни {renderChangedBadge(isRentChargeOnDaysOffChanged)}
                    </label>
                  </div>
                )}

                {/* Transparent Formula Breakdown */}
                <div className="bg-neutral-900/90 border border-neutral-800 p-3 rounded-lg text-neutral-300 text-[11px] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">
                      Итоговая аренда в рабочую смену:
                    </span>
                    <span className="text-sm font-bold font-mono text-amber-400 tabular-nums">
                      {formatCurrency(previewDailyRent)}/смена
                    </span>
                  </div>

                  {formState.rentScheduleDaysOff === 0 ? (
                    <p className="text-neutral-400">
                      График 7/0 (без выходных): суточная аренда ровно <strong className="text-white font-mono">{formState.rentDailyCost} ₽</strong>
                      {formState.rentDepositDaily ? ` + депозит ${formState.rentDepositDaily} ₽` : ''} = <strong className="text-amber-400 font-mono">{formatCurrency(previewDailyRent)}</strong> за смену.
                    </p>
                  ) : formState.rentChargeOnDaysOff === false ? (
                    <p className="text-neutral-400">
                      В выходные дни аренда не начисляется: суточная ставка <strong className="text-white font-mono">{formState.rentDailyCost} ₽</strong>
                      {formState.rentDepositDaily ? ` + депозит ${formState.rentDepositDaily} ₽` : ''} = <strong className="text-amber-400 font-mono">{formatCurrency(previewDailyRent)}</strong> за смену.
                    </p>
                  ) : (
                    <p className="text-neutral-400">
                      График {formState.rentScheduleDaysOn}/{formState.rentScheduleDaysOff}: за {formState.rentScheduleDaysOn + formState.rentScheduleDaysOff} дней недели парк начисляет {formatCurrency(formState.rentDailyCost * (formState.rentScheduleDaysOn + formState.rentScheduleDaysOff))}. Эта сумма распределяется на {formState.rentScheduleDaysOn} рабочих смен = <strong className="text-white font-mono">{Math.round((formState.rentDailyCost * (formState.rentScheduleDaysOn + formState.rentScheduleDaysOff)) / formState.rentScheduleDaysOn)} ₽</strong>
                      {formState.rentDepositDaily ? ` + депозит ${formState.rentDepositDaily} ₽` : ''} = <strong className="text-amber-400 font-mono">{formatCurrency(previewDailyRent)}</strong>/смена.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Condition 3: Rent to Own (Аренда с выкупом) */}
            {formState.ownershipType === 'rent_to_own' && (
              <div className="bg-neutral-950/70 p-4 rounded-xl border border-amber-500/30 space-y-3.5 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-amber-400" />
                    <span className="font-semibold text-amber-400 block uppercase tracking-wider text-[11px]">
                      Условия аренды с выкупом (лизинг / договор выкупа)
                    </span>
                  </div>

                  {/* Quick Schedule Presets */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-neutral-400">График:</span>
                    <button
                      type="button"
                      onClick={() => {
                        updateField('rentScheduleDaysOn', 7);
                        updateField('rentScheduleDaysOff', 0);
                      }}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                        formState.rentScheduleDaysOn === 7 && formState.rentScheduleDaysOff === 0
                          ? 'bg-amber-500 text-neutral-950'
                          : 'bg-neutral-900 text-neutral-300 hover:text-white border border-neutral-800'
                      }`}
                    >
                      7/0
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        updateField('rentScheduleDaysOn', 6);
                        updateField('rentScheduleDaysOff', 1);
                      }}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                        formState.rentScheduleDaysOn === 6 && formState.rentScheduleDaysOff === 1
                          ? 'bg-amber-500 text-neutral-950'
                          : 'bg-neutral-900 text-neutral-300 hover:text-white border border-neutral-800'
                      }`}
                    >
                      6/1
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        updateField('rentScheduleDaysOn', 5);
                        updateField('rentScheduleDaysOff', 2);
                      }}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                        formState.rentScheduleDaysOn === 5 && formState.rentScheduleDaysOff === 2
                          ? 'bg-amber-500 text-neutral-950'
                          : 'bg-neutral-900 text-neutral-300 hover:text-white border border-neutral-800'
                      }`}
                    >
                      5/2
                    </button>
                  </div>
                </div>

                {/* Important notice banner for rent_to_own */}
                <div className="bg-amber-950/30 border border-amber-600/40 rounded-lg p-3 text-amber-200/90 text-[11px] space-y-1">
                  <div className="flex items-center gap-2 font-semibold text-amber-300">
                    <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Особенность формы «Аренда с выкупом»:</span>
                  </div>
                  <p className="text-neutral-300 leading-relaxed">
                    Водитель вносит суточный арендный платеж за выкуп автомобиля, но <strong>все расходы по ТО, замене масла, колодок, резины, ремонту и ОСАГО несет самостоятельно как по собственному авто</strong>. Все эти расходы настраиваются в блоках 3 и 4 и закладываются в себестоимость км.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-neutral-400 mb-1">
                      Платеж выкупа/сутки, ₽ {renderChangedBadge(isRentDailyCostChanged)}
                    </label>
                    <input
                      type="number"
                      step="50"
                      value={formState.rentDailyCost || ''}
                      onChange={(e) => updateField('rentDailyCost', Number(e.target.value))}
                      className={getInputClass(isRentDailyCostChanged)}
                    />
                    <span className="text-[10px] text-neutral-500">По договору выкупа</span>
                  </div>

                  <div>
                    <label className="block text-neutral-400 mb-1">
                      Депозит/смена, ₽ {renderChangedBadge(isRentDepositDailyChanged)}
                    </label>
                    <input
                      type="number"
                      step="50"
                      value={formState.rentDepositDaily ?? 0}
                      onChange={(e) => updateField('rentDepositDaily', Number(e.target.value))}
                      className={getInputClass(isRentDepositDailyChanged)}
                    />
                    <span className="text-[10px] text-neutral-500">0 если нет залога</span>
                  </div>

                  <div>
                    <label className="block text-neutral-400 mb-1">
                      Дней работы {renderChangedBadge(isRentScheduleOnChanged)}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="7"
                      value={formState.rentScheduleDaysOn}
                      onChange={(e) => updateField('rentScheduleDaysOn', Number(e.target.value))}
                      className={getInputClass(isRentScheduleOnChanged)}
                    />
                  </div>

                  <div>
                    <label className="block text-neutral-400 mb-1">
                      Дней отдыха {renderChangedBadge(isRentScheduleOffChanged)}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="7"
                      value={formState.rentScheduleDaysOff ?? 0}
                      onChange={(e) => updateField('rentScheduleDaysOff', Number(e.target.value))}
                      className={getInputClass(isRentScheduleOffChanged)}
                    />
                  </div>
                </div>

                {/* Additional Buyout Terms: Contract duration and residual payment */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-neutral-800/80">
                  <div>
                    <label className="block text-neutral-400 mb-1">
                      Срок договора выкупа, мес. {renderChangedBadge(isBuyoutTermChanged)}
                    </label>
                    <input
                      type="number"
                      min="6"
                      max="84"
                      step="6"
                      value={formState.buyoutTermMonths ?? 36}
                      onChange={(e) => updateField('buyoutTermMonths', Number(e.target.value))}
                      className={getInputClass(isBuyoutTermChanged)}
                    />
                    <span className="text-[10px] text-neutral-500">Обычно 24, 36 или 48 месяцев</span>
                  </div>

                  <div>
                    <label className="block text-neutral-400 mb-1">
                      Остаточный выкупной платеж, ₽ {renderChangedBadge(isBuyoutResidualChanged)}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="10000"
                      value={formState.buyoutResidualPrice ?? 0}
                      onChange={(e) => updateField('buyoutResidualPrice', Number(e.target.value))}
                      className={getInputClass(isBuyoutResidualChanged)}
                    />
                    <span className="text-[10px] text-neutral-500">Сумма в конце срока (0 если без доплаты)</span>
                  </div>
                </div>

                {/* Park Charging Policy Toggle */}
                {formState.rentScheduleDaysOff > 0 && (
                  <div className={`flex items-center gap-2 p-2 rounded-lg border ${isRentChargeOnDaysOffChanged ? 'border-amber-400 bg-amber-950/40' : 'border-transparent'}`}>
                    <input
                      type="checkbox"
                      id="rentToOwnChargeOnDaysOff"
                      checked={formState.rentChargeOnDaysOff !== false}
                      onChange={(e) => updateField('rentChargeOnDaysOff', e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-neutral-900 border-neutral-700"
                    />
                    <label htmlFor="rentToOwnChargeOnDaysOff" className="text-neutral-300 text-xs cursor-pointer">
                      Платеж выкупа списывается и за выходные дни {renderChangedBadge(isRentChargeOnDaysOffChanged)}
                    </label>
                  </div>
                )}

                {/* Transparent Formula Breakdown */}
                <div className="bg-neutral-900/90 border border-neutral-800 p-3 rounded-lg text-neutral-300 text-[11px] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">
                      Итоговый платеж выкупа в рабочую смену:
                    </span>
                    <span className="text-sm font-bold font-mono text-amber-400 tabular-nums">
                      {formatCurrency(previewDailyRent)}/смена
                    </span>
                  </div>

                  <p className="text-neutral-400">
                    При графике {formState.rentScheduleDaysOn}/{formState.rentScheduleDaysOff} эффективный суточный платеж составляет <strong className="text-white font-mono">{formatCurrency(previewDailyRent)}</strong>.
                  </p>

                  <div className="pt-1.5 border-t border-neutral-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <span className="text-neutral-400">
                      ТО и расходники (блок 4): <strong className="text-amber-400 font-mono">+{formatDecimal(previewMaintCost, 2)} ₽/км</strong>
                    </span>
                    <span className="text-neutral-400">
                      ОСАГО такси водителя: <strong className="text-amber-400 font-mono">+{formatDecimal(formState.insuranceAnnualCost / (formState.annualEstimatedMileage || 48000), 2)} ₽/км</strong>
                    </span>
                    <span className="text-neutral-300 font-semibold">
                      Полная себестоимость: <strong className="text-emerald-400 font-mono">{formatDecimal(previewFullCost, 2)} ₽/км</strong>
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. Fuel & Energy (Fully persistent across fuel changes) */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Fuel className="w-5 h-5 text-amber-400" />
                2. Топливо и нормы расхода
              </h2>

              {/* Quick consumption shortcut badges */}
              <div className="hidden sm:flex items-center gap-1.5 text-[11px]">
                <span className="text-neutral-500">Нормы:</span>
                {[8.5, 9.5, 10.5, 12.0].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      setFuelConsumptionInput(val.toString());
                      setFormState((prev) => ({
                        ...prev,
                        fuelConsumptionPer100Km: val,
                        customFuelConsumptions: {
                          ...prev.customFuelConsumptions,
                          [prev.fuelType]: val,
                        },
                      }));
                    }}
                    className={`px-2 py-0.5 rounded transition-colors font-mono ${
                      parsedConsumption === val
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                        : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {/* Active Fuel Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-neutral-300 font-medium mb-1">
                  Вид топлива {renderChangedBadge(isFuelTypeChanged)}
                </label>
                <select
                  value={formState.fuelType}
                  onChange={(e) => handleSelectFuelType(e.target.value as FuelType)}
                  className={getSelectClass(isFuelTypeChanged)}
                >
                  {Object.entries(FUEL_LABELS).map(([key, item]) => (
                    <option key={key} value={key}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-neutral-500">При смене загрузятся сохраненные тарифы</span>
              </div>

              <div>
                <label className="block text-neutral-300 font-medium mb-1">
                  Расход на 100 км {renderChangedBadge(isFuelConsumptionChanged)}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={fuelConsumptionInput}
                    onChange={(e) => handleConsumptionInputChange(e.target.value)}
                    onBlur={() => {
                      const parsed = parseFloat(fuelConsumptionInput.replace(',', '.'));
                      if (isNaN(parsed) || parsed <= 0) {
                        const fallback =
                          formState.customFuelConsumptions?.[formState.fuelType] ||
                          DEFAULT_FUEL_CONSUMPTIONS[formState.fuelType];
                        setFuelConsumptionInput(fallback.toString());
                      } else {
                        setFuelConsumptionInput(parsed.toString());
                      }
                    }}
                    className={getInputClass(isFuelConsumptionChanged, 'pr-12')}
                    placeholder="9.4"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 text-xs font-semibold">
                    {FUEL_LABELS[formState.fuelType]?.unit}
                  </span>
                </div>
                <span className="text-[10px] text-neutral-500">Для активного топлива</span>
              </div>

              <div>
                <label className="block text-neutral-300 font-medium mb-1">
                  Цена за 1 {FUEL_LABELS[formState.fuelType]?.unit}, ₽ {renderChangedBadge(isFuelPriceChanged)}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={fuelPriceInput}
                    onChange={(e) => handlePriceInputChange(e.target.value)}
                    onBlur={() => {
                      const parsed = parseFloat(fuelPriceInput.replace(',', '.'));
                      if (isNaN(parsed) || parsed <= 0) {
                        const fallback =
                          formState.customFuelPrices?.[formState.fuelType] ||
                          DEFAULT_FUEL_PRICES[formState.fuelType];
                        setFuelPriceInput(fallback.toString());
                      } else {
                        setFuelPriceInput(parsed.toString());
                      }
                    }}
                    className={getInputClass(isFuelPriceChanged, 'pr-8')}
                    placeholder="58.9"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 text-xs font-semibold">₽</span>
                </div>
                <span className="text-[10px] text-neutral-500">Тариф АЗС/АГНКС</span>
              </div>
            </div>

            {/* Active Fuel Kilometer Rate */}
            <div className={`p-3 rounded-lg border transition-all flex justify-between items-center text-xs ${
              isFuelPriceChanged || isFuelConsumptionChanged
                ? 'bg-amber-950/30 border-amber-500/50'
                : 'bg-neutral-950 border-neutral-800'
            }`}>
              <div className="flex items-center gap-2">
                <span className="text-neutral-400">Стоимость 1 км по активному топливу:</span>
                {(isFuelPriceChanged || isFuelConsumptionChanged) && (
                  <span className="text-[10px] text-amber-400 font-semibold">(не сохранено)</span>
                )}
              </div>
              <span className="font-mono text-amber-400 font-bold tabular-nums">
                {formatDecimal(previewFuelCost, 2)} ₽/км
                <span className="text-[11px] font-normal text-neutral-500 ml-1.5">
                  ({formatCurrency(previewFuelCost * 100)} на 100 км)
                </span>
              </span>
            </div>

            {/* Complete Registry of Saved Fuel Prices for All Fuel Types */}
            <div className="pt-2 border-t border-neutral-800/80">
              <button
                type="button"
                onClick={() => setShowAllFuelTable((v) => !v)}
                className="flex items-center justify-between w-full text-xs text-neutral-400 hover:text-white transition-colors py-1"
              >
                <span className="flex items-center gap-2 font-semibold text-neutral-300">
                  <span>Реестр тарифов на все виды топлива (сохраняются отдельно в базе)</span>
                  {(areOtherFuelPricesChanged || areOtherFuelConsumptionsChanged) && (
                    <span className="text-[10px] text-amber-400 font-bold">● есть изменения</span>
                  )}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-amber-400">
                  {showAllFuelTable ? 'Свернуть' : 'Развернуть'}
                  {showAllFuelTable ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </span>
              </button>

              {showAllFuelTable && (
                <div className="mt-2.5 overflow-x-auto rounded-lg border border-neutral-800 bg-neutral-950">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-neutral-800 text-[11px] text-neutral-400 bg-neutral-900/60">
                        <th className="py-2 px-3 font-medium">Топливо</th>
                        <th className="py-2 px-3 font-medium">Расход / 100 км</th>
                        <th className="py-2 px-3 font-medium">Цена за единицу</th>
                        <th className="py-2 px-3 font-medium">1 км</th>
                        <th className="py-2 px-3 text-right font-medium">Статус</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/60 font-mono">
                      {(Object.keys(DEFAULT_FUEL_PRICES) as FuelType[]).map((fType) => {
                        const meta = FUEL_LABELS[fType];
                        const isActive = formState.fuelType === fType;
                        const currentPrice = formState.customFuelPrices?.[fType] ?? DEFAULT_FUEL_PRICES[fType];
                        const savedPrice = currentSettings.customFuelPrices?.[fType] ?? DEFAULT_FUEL_PRICES[fType];
                        const isPriceDiff = Math.abs(currentPrice - savedPrice) > 0.001;

                        const currentCons = formState.customFuelConsumptions?.[fType] ?? DEFAULT_FUEL_CONSUMPTIONS[fType];
                        const savedCons = currentSettings.customFuelConsumptions?.[fType] ?? DEFAULT_FUEL_CONSUMPTIONS[fType];
                        const isConsDiff = Math.abs(currentCons - savedCons) > 0.001;

                        const kmCost = (currentCons / 100) * currentPrice;

                        return (
                          <tr
                            key={fType}
                            className={`transition-colors ${
                              isActive ? 'bg-amber-500/10' : 'hover:bg-neutral-900/40'
                            }`}
                          >
                            <td className="py-2.5 px-3 font-sans">
                              <div className="flex items-center gap-1.5">
                                <span className={isActive ? 'font-bold text-amber-400' : 'text-neutral-200'}>
                                  {meta.name}
                                </span>
                                {isActive && (
                                  <span className="text-[10px] px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded font-semibold border border-amber-500/30">
                                    активно
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  step="0.1"
                                  min="1"
                                  value={currentCons}
                                  onChange={(e) => handleAnyFuelConsumptionChange(fType, Number(e.target.value))}
                                  className={`w-18 px-1.5 py-1 rounded text-xs border ${
                                    isConsDiff
                                      ? 'bg-amber-950/60 border-amber-400 text-amber-200'
                                      : 'bg-neutral-900 border-neutral-700 text-white'
                                  }`}
                                />
                                <span className="text-neutral-500 text-[10px]">{meta.unit}</span>
                              </div>
                            </td>

                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  step="0.5"
                                  min="1"
                                  value={currentPrice}
                                  onChange={(e) => handleAnyFuelPriceChange(fType, Number(e.target.value))}
                                  className={`w-20 px-1.5 py-1 rounded text-xs border ${
                                    isPriceDiff
                                      ? 'bg-amber-950/60 border-amber-400 text-amber-200'
                                      : 'bg-neutral-900 border-neutral-700 text-white'
                                  }`}
                                />
                                <span className="text-neutral-500 text-[10px]">₽</span>
                              </div>
                            </td>

                            <td className="py-2.5 px-3 font-bold text-amber-400 tabular-nums">
                              {formatDecimal(kmCost, 2)} ₽
                            </td>

                            <td className="py-2.5 px-3 text-right">
                              {isActive ? (
                                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-sans font-medium">
                                  <Check className="w-3 h-3" /> Выбрано
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleSelectFuelType(fType)}
                                  className="text-[11px] font-sans px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors"
                                >
                                  Выбрать
                                </button>
                              )}
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

          {/* 3. Aggregator, Park Commissions & Taxes */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-3">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Percent className="w-5 h-5 text-amber-400" />
                3. Комиссии агрегатора, парка и налоги
              </h2>
              {areTariffCommissionsChanged && (
                <span className="text-[11px] text-amber-400 font-bold animate-pulse">
                  ● комиссии тарифов изменены
                </span>
              )}
            </div>

            {/* Per-Tariff Aggregator Commissions Grid */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block text-neutral-300 font-semibold text-xs">
                  Комиссия агрегатора в зависимости от тарифа (Яндекс Про)
                </label>
                <span className="text-[11px] text-neutral-500">
                  Сохраняется отдельно для каждого класса
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {(['economy', 'comfort', 'comfort_plus', 'business'] as TariffCategory[]).map((cat) => {
                  const isCurrentCarCat = formState.category === cat;
                  const isChanged = isTariffCommissionChanged(cat);
                  const currentCommission =
                    formState.tariffSettings?.tariffs?.[cat]?.aggregatorCommissionPercent ??
                    DEFAULT_TARIFFS[cat].aggregatorCommissionPercent;

                  return (
                    <div
                      key={cat}
                      className={`p-3 rounded-xl border transition-all ${
                        isCurrentCarCat
                          ? 'bg-neutral-950 border-amber-500/60 ring-1 ring-amber-500/30'
                          : 'bg-neutral-950/60 border-neutral-800/80 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-xs font-semibold ${isCurrentCarCat ? 'text-amber-400' : 'text-neutral-200'}`}>
                          {TARIFF_LABELS[cat].name}
                        </span>
                        {isCurrentCarCat && (
                          <span className="text-[9px] px-1 py-0.2 bg-amber-500/20 text-amber-300 rounded font-bold border border-amber-500/30">
                            авто
                          </span>
                        )}
                      </div>

                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="50"
                          value={currentCommission}
                          onChange={(e) => handleTariffCommissionChange(cat, Number(e.target.value))}
                          className={getInputClass(isChanged, 'pr-7 py-1 text-xs')}
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 text-xs font-semibold">
                          %
                        </span>
                      </div>

                      <div className="mt-1 flex items-center justify-between text-[10px]">
                        <span className="text-neutral-500">
                          {cat === 'economy' ? '16.8%' : cat === 'comfort' ? '18.5%' : cat === 'comfort_plus' ? '20.5%' : '24.0%'}
                        </span>
                        {renderChangedBadge(isChanged)}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="text-[11px] text-neutral-400 bg-neutral-950/60 p-2.5 rounded-lg border border-neutral-800 flex items-center justify-between">
                <span>
                  Активная комиссия авто ({TARIFF_LABELS[formState.category].name}):
                </span>
                <span className="font-mono font-bold text-amber-400 text-xs">
                  {formState.aggregatorCommissionPercent}%
                </span>
              </div>
            </div>

            {/* Park Commission & Payout Fees */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-3 border-t border-neutral-800/80">
              <div>
                <label className="block text-neutral-300 font-medium mb-1">
                  Комиссия таксопарка, % {renderChangedBadge(isParkFeeChanged)}
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="15"
                  value={formState.parkCommissionPercent || ''}
                  onChange={(e) => updateField('parkCommissionPercent', Number(e.target.value))}
                  className={getInputClass(isParkFeeChanged)}
                />
                <span className="text-[10px] text-neutral-500">0% для прямых самозанятых</span>
              </div>

              <div>
                <label className="block text-neutral-300 font-medium mb-1">
                  Вывод безнала (эквайринг), % {renderChangedBadge(isPayoutFeeChanged)}
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={formState.payoutFeePercent || ''}
                  onChange={(e) => updateField('payoutFeePercent', Number(e.target.value))}
                  className={getInputClass(isPayoutFeeChanged)}
                />
                <span className="text-[10px] text-neutral-500">Банковский процент за выплаты</span>
              </div>
            </div>

            {/* Taxes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-3 border-t border-neutral-800/80">
              <div>
                <label className="block text-neutral-300 font-medium mb-1">
                  Налоговый статус {renderChangedBadge(isTaxTypeChanged)}
                </label>
                <select
                  value={formState.taxType}
                  onChange={(e) => {
                    const type = e.target.value as TaxType;
                    let rate = 4.3;
                    if (type === 'usn_6') rate = 6.0;
                    if (type === 'none' || type === 'park_fleet') rate = 0;
                    setFormState((prev) => ({
                      ...prev,
                      taxType: type,
                      taxPercent: rate,
                    }));
                  }}
                  className={getSelectClass(isTaxTypeChanged)}
                >
                  <option value="self_employed_npd">Самозанятый (НПД ~4.3%)</option>
                  <option value="usn_6">ИП УСН (Доходы 6%)</option>
                  <option value="park_fleet">Парковый водитель (без налога)</option>
                  <option value="none">Без налога (0%)</option>
                </select>
              </div>

              <div>
                <label className="block text-neutral-300 font-medium mb-1">
                  Ставка налога, % {renderChangedBadge(isTaxRateChanged)}
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="20"
                  value={formState.taxPercent || ''}
                  onChange={(e) => updateField('taxPercent', Number(e.target.value))}
                  className={getInputClass(isTaxRateChanged)}
                />
                <span className="text-[10px] text-neutral-500">Считается от валовой выручки</span>
              </div>
            </div>

            {/* Regular Overheads */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-3 border-t border-neutral-800/80">
              <div>
                <label className="block text-neutral-300 font-medium mb-1">
                  ОСАГО такси в год, ₽ {renderChangedBadge(isInsuranceChanged)}
                </label>
                <input
                  type="number"
                  step="1000"
                  value={formState.insuranceAnnualCost || ''}
                  onChange={(e) => updateField('insuranceAnnualCost', Number(e.target.value))}
                  className={getInputClass(isInsuranceChanged)}
                />
              </div>

              <div>
                <label className="block text-neutral-300 font-medium mb-1">
                  Мойка кузова, ₽/смена {renderChangedBadge(isCarWashChanged)}
                </label>
                <input
                  type="number"
                  step="50"
                  value={formState.carWashPerShift || ''}
                  onChange={(e) => updateField('carWashPerShift', Number(e.target.value))}
                  className={getInputClass(isCarWashChanged)}
                />
              </div>

              <div>
                <label className="block text-neutral-300 font-medium mb-1">
                  Омывайка/кофе, ₽/смена {renderChangedBadge(isMiscChanged)}
                </label>
                <input
                  type="number"
                  step="50"
                  value={formState.miscPerShift || ''}
                  onChange={(e) => updateField('miscPerShift', Number(e.target.value))}
                  className={getInputClass(isMiscChanged)}
                />
              </div>
            </div>

          </div>

        </div>

        {/* Right Column: Maintenance items & Consumables */}
        <div className="lg:col-span-5 space-y-6">

          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-amber-400" />
                  4. Стоимость ТО и расходников {renderChangedBadge(isMaintenanceChanged)}
                </h2>
                <span className="text-xs text-neutral-400">
                  Суммарная ставка: <strong className="font-mono text-amber-400">{formatDecimal(previewMaintCost, 2)} ₽/км</strong>
                </span>
              </div>

              <button
                type="button"
                onClick={handleResetDefaultMaintenance}
                className="text-xs text-neutral-400 hover:text-white px-2 py-1 rounded bg-neutral-950 border border-neutral-800 hover:bg-neutral-800 transition-colors"
              >
                Сброс норм
              </button>
            </div>

            {formState.ownershipType === 'rent' ? (
              <div className="p-5 bg-neutral-950 rounded-xl border border-neutral-800 text-center space-y-2 text-xs">
                <span className="text-amber-400 font-bold block">Режим аренды</span>
                <p className="text-neutral-400 leading-relaxed">
                  При стандартной аренде автомобиля все плановые ТО, замену масла, колодок и резины оплачивает таксопарк. Эти расходы включены в суточную стоимость аренды.
                </p>
              </div>
            ) : (
              <>
                {formState.ownershipType === 'rent_to_own' && (
                  <div className="bg-amber-950/30 border border-amber-600/40 rounded-lg p-3 text-amber-200 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold text-amber-400">
                      <ShieldCheck className="w-4 h-4 shrink-0" />
                      <span>Аренда с выкупом: ТО оплачивает водитель</span>
                    </div>
                    <p className="text-neutral-300 text-[11px] leading-relaxed">
                      По договору выкупа все плановые ТО, колодки, фильтры и масло водитель покупает и меняет за свой счет (как на собственном авто). Они закладываются в себестоимость км.
                    </p>
                  </div>
                )}
                {formState.ownershipType === 'loan' && (
                  <div className="bg-sky-950/30 border border-sky-600/40 rounded-lg p-3 text-sky-200 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold text-sky-400">
                      <ShieldCheck className="w-4 h-4 shrink-0" />
                      <span>Автокредит: ТО и расходники оплачивает водитель</span>
                    </div>
                    <p className="text-neutral-300 text-[11px] leading-relaxed">
                      Автомобиль находится в вашей собственности — расходы на плановое ТО, замену расходников и текущий ремонт закладываются в себестоимость каждого километра.
                    </p>
                  </div>
                )}
                {/* Consumables List */}
                <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                  {formState.maintenanceItems.map((item) => {
                    const itemPerKm = item.intervalKm > 0 ? item.cost / item.intervalKm : 0;
                    return (
                      <div
                        key={item.id}
                        className="bg-neutral-950/80 border border-neutral-800 rounded-lg p-3 hover:border-neutral-700 transition-colors text-xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <span className="font-medium text-white block">{item.name}</span>
                            <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-0.5">
                              <span>Каждые {item.intervalKm / 1000} тыс. км</span>
                              <span>·</span>
                              <span className="font-mono text-neutral-300 font-semibold">{formatCurrency(item.cost)}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-mono text-amber-400 font-bold tabular-nums">
                              {formatDecimal(itemPerKm, 2)} ₽/км
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveMaintenanceItem(item.id)}
                              className="text-neutral-500 hover:text-rose-400 p-1 transition-colors"
                              title="Удалить"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Add new consumable item form */}
                <form onSubmit={handleAddMaintenanceItem} className="bg-neutral-950 p-3.5 rounded-lg border border-neutral-800 space-y-2.5 text-xs">
                  <span className="font-semibold text-neutral-300 block">
                    Добавить статью расхода
                  </span>

                  <input
                    type="text"
                    placeholder="Название (например: Сцепление / Вариатор)"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1.5 text-white placeholder:text-neutral-600 focus:border-amber-500"
                    required
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="Цена, ₽"
                      min="100"
                      step="100"
                      value={newItemCost || ''}
                      onChange={(e) => setNewItemCost(Number(e.target.value))}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1.5 font-mono text-white tabular-nums placeholder:text-neutral-600 focus:border-amber-500"
                      required
                    />
                    <input
                      type="number"
                      placeholder="Интервал, км"
                      min="1000"
                      step="1000"
                      value={newItemInterval || ''}
                      onChange={(e) => setNewItemInterval(Number(e.target.value))}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1.5 font-mono text-white tabular-nums placeholder:text-neutral-600 focus:border-amber-500"
                      required
                    />
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-white rounded transition-colors border border-neutral-700"
                    >
                      <Plus className="w-3.5 h-3.5 text-amber-400" />
                      Добавить в список
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
