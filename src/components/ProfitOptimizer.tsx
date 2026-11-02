import React, { useState, useMemo } from 'react';
import { VehicleSettings } from '../types/taxi';
import { 
  calculateFuelSavingsAnnual, 
  calculateShiftPurchaseBreakEven, 
  calculateFullCostPerKm,
  calculateEffectiveDailyRent,
  calculateFuelCostPerKm,
  calculateMaintenanceCostPerKm,
  calculateDepreciationPerKm,
  calculateCarLoan
} from '../utils/calculations';
import { FUEL_LABELS, DEFAULT_FUEL_PRICES, DEFAULT_FUEL_CONSUMPTIONS, TARIFF_LABELS } from '../utils/constants';
import { formatCurrency, formatDecimal } from '../utils/storage';
import { 
  Flame, 
  Zap, 
  Car, 
  Ticket, 
  Compass, 
  Lightbulb, 
  CheckCircle2,
  DollarSign,
  CreditCard,
  Percent,
  Gauge,
  Shield,
  Info,
  RefreshCw,
  Leaf,
  BatteryCharging,
  Layers,
  Sparkles,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  HelpCircle,
  Wallet,
  Fuel,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { IntegratedAdBanner } from './IntegratedAdBanner';
import { UserProfile } from '../types/auth';
import { OwnershipPairComparison } from './OwnershipPairComparison';

interface ProfitOptimizerProps {
  settings: VehicleSettings;
  currentUser?: UserProfile | null;
  onGoToSettings?: () => void;
}

type FuelEfficiencyType = 'stock_gasoline' | 'diesel' | 'propane' | 'methane' | 'hybrid' | 'electric';

interface FuelOptionConfig {
  id: FuelEfficiencyType;
  title: string;
  badge: string;
  unit: string;
  defaultPrice: number;
  defaultConsumption: number;
  upgradeCost: number; // Стоимость ГБО / доплата за авто
  description: string;
  pros: string;
  cons: string;
  icon: React.ElementType;
  isStock?: boolean;
}

export const ProfitOptimizer: React.FC<ProfitOptimizerProps> = ({ 
  settings, 
  currentUser, 
  onGoToSettings 
}) => {
  const [showAllFormsMatrix, setShowAllFormsMatrix] = useState(false);
  // -------------------------------------------------------------
  // Общие параметры симуляции работы (пробег, смены, выручка)
  // -------------------------------------------------------------
  const [simDailyMileage, setSimDailyMileage] = useState<number>(190);
  const [simDaysPerMonth, setSimDaysPerMonth] = useState<number>(24);
  const [simDailyGross, setSimDailyGross] = useState<number>(8500);

  const monthlySimKm = simDailyMileage * simDaysPerMonth;
  const annualSimKm = monthlySimKm * 12;

  // -------------------------------------------------------------
  // 1. Параметры топливной эффективности: Бензин vs Дизель vs Газ vs Гибрид vs Электро
  // -------------------------------------------------------------
  const [selectedFuelTab, setSelectedFuelTab] = useState<FuelEfficiencyType>('methane');

  // Базовые стоковые значения на бензине (АИ-92/95)
  const isSettingsPetrol = settings.fuelType === 'gasoline_92' || settings.fuelType === 'gasoline_95';
  const baselinePetrolPrice = isSettingsPetrol
    ? settings.fuelPricePerUnit
    : (settings.customFuelPrices?.gasoline_95 ?? DEFAULT_FUEL_PRICES.gasoline_95);

  const baselinePetrolConsumption = isSettingsPetrol
    ? settings.fuelConsumptionPer100Km
    : (settings.customFuelConsumptions?.gasoline_95 ?? DEFAULT_FUEL_CONSUMPTIONS.gasoline_95);

  // Кастомные параметры для каждого типа топлива в калькуляторе
  const [fuelParams, setFuelParams] = useState<Record<FuelEfficiencyType, { price: number; consumption: number; upgradeCost: number }>>(() => ({
    stock_gasoline: {
      price: baselinePetrolPrice,
      consumption: baselinePetrolConsumption,
      upgradeCost: 0,
    },
    diesel: {
      price: settings.customFuelPrices?.diesel ?? DEFAULT_FUEL_PRICES.diesel,
      consumption: settings.customFuelConsumptions?.diesel ?? DEFAULT_FUEL_CONSUMPTIONS.diesel,
      upgradeCost: 180000,
    },
    propane: {
      price: settings.customFuelPrices?.propane ?? DEFAULT_FUEL_PRICES.propane,
      consumption: settings.customFuelConsumptions?.propane ?? Number((baselinePetrolConsumption * 1.15).toFixed(1)),
      upgradeCost: 55000,
    },
    methane: {
      price: settings.customFuelPrices?.methane ?? DEFAULT_FUEL_PRICES.methane,
      consumption: settings.customFuelConsumptions?.methane ?? Number((baselinePetrolConsumption * 1.05).toFixed(1)),
      upgradeCost: 85000,
    },
    hybrid: {
      price: baselinePetrolPrice,
      consumption: 4.8,
      upgradeCost: 280000,
    },
    electric: {
      price: settings.customFuelPrices?.electric ?? DEFAULT_FUEL_PRICES.electric,
      consumption: settings.customFuelConsumptions?.electric ?? DEFAULT_FUEL_CONSUMPTIONS.electric,
      upgradeCost: 650000,
    },
  }));

  const fuelOptions: FuelOptionConfig[] = [
    {
      id: 'stock_gasoline',
      title: 'Сток на бензине (База)',
      badge: 'Эталон 100%',
      unit: 'л',
      defaultPrice: baselinePetrolPrice,
      defaultConsumption: baselinePetrolConsumption,
      upgradeCost: 0,
      description: 'Базовый бензиновый автомобиль (АИ-92/95) без доработок и переплат.',
      pros: '0 ₽ затрат на переоборудование, максимальная ликвидность при перепродаже, заправка за 2 минуты везде.',
      cons: 'Максимальная себестоимость 1 км в городе. Топливо «съедает» до 28–32% всей выручки смены.',
      icon: Gauge,
      isStock: true,
    },
    {
      id: 'diesel',
      title: 'Дизельное топливо (ДТ)',
      badge: 'Турбодизель',
      unit: 'л',
      defaultPrice: settings.customFuelPrices?.diesel ?? DEFAULT_FUEL_PRICES.diesel,
      defaultConsumption: settings.customFuelConsumptions?.diesel ?? DEFAULT_FUEL_CONSUMPTIONS.diesel,
      upgradeCost: 180000,
      description: 'Современный турбодизель (TDI / CRDi) с отличной тягой на низах и низким расходом.',
      pros: 'Расход 6.8–7.5 л в городе, высокий ресурс ДВС (до 450 000+ км), уверенный крутящий момент с низких оборотов.',
      cons: 'Выше первоначальная цена авто, требовательность к качеству зимнего ДТ, дороговизна ремонта форсунок и ТНВД.',
      icon: Fuel,
    },
    {
      id: 'propane',
      title: 'Пропан-Бутан (LPG)',
      badge: 'ГБО 4 пок.',
      unit: 'л',
      defaultPrice: settings.customFuelPrices?.propane ?? DEFAULT_FUEL_PRICES.propane,
      defaultConsumption: settings.customFuelConsumptions?.propane ?? 11.5,
      upgradeCost: 55000,
      description: 'Сжиженный нефтяной газ. Тороидальный баллон монтируется в нишу запасного колеса.',
      pros: 'АГЗС на каждом шагу, багажник остается свободным для чемоданов, доступная установка.',
      cons: 'Расход на 15–20% выше бензина, сезонные колебания цен на пропан зимой.',
      icon: Flame,
    },
    {
      id: 'methane',
      title: 'Метан (CNG)',
      badge: 'Макс. экономия',
      unit: 'м³',
      defaultPrice: settings.customFuelPrices?.methane ?? DEFAULT_FUEL_PRICES.methane,
      defaultConsumption: settings.customFuelConsumptions?.methane ?? 10.0,
      upgradeCost: 85000,
      description: 'Природный компримированный газ. Самое дешевое моторное топливо в РФ.',
      pros: 'Стоимость 1 км в 2.4 раза ниже бензина. Государственные субсидии на переоборудование.',
      cons: 'Тяжелый баллон высокого давления занимает 40–50% багажника, меньше заправок АГНКС, очереди.',
      icon: Flame,
    },
    {
      id: 'hybrid',
      title: 'Гибрид (HEV / PHEV)',
      badge: 'Эко-город',
      unit: 'л',
      defaultPrice: baselinePetrolPrice,
      defaultConsumption: 4.8,
      upgradeCost: 280000,
      description: 'Параллельный или последовательный гибрид. ДВС + электромотор с рекуперацией.',
      pros: 'Расход 4.5–5.0 л в городских пробках, огромный ресурс тормозных колодок (рекуперация), тишина.',
      cons: 'Выше первоначальная стоимость автомобиля, необходимость обслуживания гибридной батареи.',
      icon: Leaf,
    },
    {
      id: 'electric',
      title: 'Электромобиль (EV)',
      badge: 'Будущее такси',
      unit: 'кВт·ч',
      defaultPrice: settings.customFuelPrices?.electric ?? DEFAULT_FUEL_PRICES.electric,
      defaultConsumption: settings.customFuelConsumptions?.electric ?? 18.0,
      upgradeCost: 650000,
      description: 'Чистый электрокар. Зарядка от бытовой/ночной розетки или на городских станциях.',
      pros: 'Рекордно низкая себестоимость 1 км, экономия на ТО до 55% (нет масла, свечей, коробки передач).',
      cons: 'Запас хода зимой падает до 180–230 км, привязка к зарядкам, время быстрой зарядки 30-50 мин.',
      icon: BatteryCharging,
    },
  ];

  const handleUpdateFuelParam = (type: FuelEfficiencyType, field: 'price' | 'consumption' | 'upgradeCost', val: number) => {
    setFuelParams(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: Math.max(0, val),
      },
    }));
  };

  const handleResetFuelParams = () => {
    setFuelParams({
      stock_gasoline: {
        price: baselinePetrolPrice,
        consumption: baselinePetrolConsumption,
        upgradeCost: 0,
      },
      diesel: {
        price: settings.customFuelPrices?.diesel ?? DEFAULT_FUEL_PRICES.diesel,
        consumption: settings.customFuelConsumptions?.diesel ?? DEFAULT_FUEL_CONSUMPTIONS.diesel,
        upgradeCost: 180000,
      },
      propane: {
        price: settings.customFuelPrices?.propane ?? DEFAULT_FUEL_PRICES.propane,
        consumption: settings.customFuelConsumptions?.propane ?? Number((baselinePetrolConsumption * 1.15).toFixed(1)),
        upgradeCost: 55000,
      },
      methane: {
        price: settings.customFuelPrices?.methane ?? DEFAULT_FUEL_PRICES.methane,
        consumption: settings.customFuelConsumptions?.methane ?? Number((baselinePetrolConsumption * 1.05).toFixed(1)),
        upgradeCost: 85000,
      },
      hybrid: {
        price: baselinePetrolPrice,
        consumption: 4.8,
        upgradeCost: 280000,
      },
      electric: {
        price: settings.customFuelPrices?.electric ?? DEFAULT_FUEL_PRICES.electric,
        consumption: settings.customFuelConsumptions?.electric ?? DEFAULT_FUEL_CONSUMPTIONS.electric,
        upgradeCost: 650000,
      },
    });
  };

  // Расчет стоимости 1 км для каждого топлива
  const fuelMetrics = useMemo(() => {
    const stockKmCost = (fuelParams.stock_gasoline.consumption * fuelParams.stock_gasoline.price) / 100;
    const stockMonthlyFuel = stockKmCost * monthlySimKm;
    const stockAnnualFuel = stockKmCost * annualSimKm;

    return Object.keys(fuelParams).reduce((acc, key) => {
      const type = key as FuelEfficiencyType;
      const param = fuelParams[type];
      const kmCost = (param.consumption * param.price) / 100;
      const monthlyCost = kmCost * monthlySimKm;
      const annualCost = kmCost * annualSimKm;

      const monthlySavings = Math.max(0, stockMonthlyFuel - monthlyCost);
      const annualSavings = Math.max(0, stockAnnualFuel - annualCost);

      const paybackMonths =
        param.upgradeCost > 0 && monthlySavings > 0
          ? Number((param.upgradeCost / monthlySavings).toFixed(1))
          : 0;

      acc[type] = {
        kmCost,
        monthlyCost,
        annualCost,
        monthlySavings,
        annualSavings,
        paybackMonths,
        diffPercent: stockKmCost > 0 ? Math.round(((stockKmCost - kmCost) / stockKmCost) * 100) : 0,
      };
      return acc;
    }, {} as Record<FuelEfficiencyType, { kmCost: number; monthlyCost: number; annualCost: number; monthlySavings: number; annualSavings: number; paybackMonths: number; diffPercent: number }>);
  }, [fuelParams, monthlySimKm, annualSimKm]);

  // Определение текущего типа топлива из раздела "Параметры и расходы"
  const activeSettingsFuelType: FuelEfficiencyType = useMemo(() => {
    if (settings.fuelType === 'diesel') return 'diesel';
    if (settings.fuelType === 'propane') return 'propane';
    if (settings.fuelType === 'methane') return 'methane';
    if (settings.fuelType === 'electric') return 'electric';
    return 'stock_gasoline';
  }, [settings.fuelType]);

  // Исключаем текущий выбранный в настройках тип топлива из плиток вариантов перехода
  const availableFuelOptions = useMemo(() => {
    return fuelOptions.filter((opt) => opt.id !== activeSettingsFuelType);
  }, [fuelOptions, activeSettingsFuelType]);

  // Выбранная вкладка из доступных плиток
  const activeSelectedFuelTab = useMemo(() => {
    const exists = availableFuelOptions.some((o) => o.id === selectedFuelTab);
    return exists ? selectedFuelTab : (availableFuelOptions[0]?.id ?? 'methane');
  }, [availableFuelOptions, selectedFuelTab]);

  // -------------------------------------------------------------
  // 2. Сравнение 4 форм владения: Свой авто vs Автокредит vs Парковая аренда vs Аренда с выкупом
  // -------------------------------------------------------------
  const carName = settings.carName && settings.carName.trim() ? settings.carName.trim() : 'Ваш автомобиль';
  const carMarketValue = settings.carMarketValue > 0 ? settings.carMarketValue : 1650000;

  // Параметры автокредита
  const [loanCarPrice, setLoanCarPrice] = useState<number>(() => {
    return (settings.loanCarPrice && settings.loanCarPrice > 0) ? settings.loanCarPrice : carMarketValue;
  });
  const [loanDownPayment, setLoanDownPayment] = useState<number>(() => {
    if (typeof settings.loanDownPayment === 'number' && settings.loanDownPayment > 0) {
      return settings.loanDownPayment;
    }
    const basePrice = (settings.loanCarPrice && settings.loanCarPrice > 0) ? settings.loanCarPrice : carMarketValue;
    return Math.round(basePrice * 0.2);
  });
  const [loanRatePercent, setLoanRatePercent] = useState<number>(() => {
    return settings.loanAnnualRatePercent || 19.5;
  });
  const [loanTermMonths, setLoanTermMonths] = useState<number>(() => {
    return settings.loanTermMonths || 36;
  });

  // Параметры аренды парка
  const [simRentDailyCost, setSimRentDailyCost] = useState<number>(() => {
    return settings.ownershipType === 'rent' && settings.rentDailyCost > 0
      ? settings.rentDailyCost
      : 2400;
  });

  // Параметры аренды с выкупом
  const [simBuyoutDailyCost, setSimBuyoutDailyCost] = useState<number>(() => {
    return settings.ownershipType === 'rent_to_own' && settings.rentDailyCost > 0
      ? settings.rentDailyCost
      : 3200;
  });

  const [buyoutTermMonths, setBuyoutTermMonths] = useState<number>(() => {
    return settings.buyoutTermMonths && settings.buyoutTermMonths > 0
      ? settings.buyoutTermMonths
      : 30;
  });

  const [estimatedCarMarketAtEnd, setEstimatedCarMarketAtEnd] = useState<number>(() => {
    return Math.round(carMarketValue * 0.55);
  });

  // Расчет кредита
  const carLoan = useMemo(() => {
    return calculateCarLoan(
      loanCarPrice,
      loanDownPayment,
      loanRatePercent,
      loanTermMonths,
      simDaysPerMonth,
      monthlySimKm
    );
  }, [loanCarPrice, loanDownPayment, loanRatePercent, loanTermMonths, simDaysPerMonth, monthlySimKm]);

  // Сброс параметров владения к значениям из "Параметры и расходы"
  const handleResetOwnershipToSettings = () => {
    const val = (settings.loanCarPrice && settings.loanCarPrice > 0)
      ? settings.loanCarPrice
      : (settings.carMarketValue > 0 ? settings.carMarketValue : 1650000);
    setLoanCarPrice(val);
    setLoanDownPayment(
      typeof settings.loanDownPayment === 'number' && settings.loanDownPayment > 0
        ? settings.loanDownPayment
        : Math.round(val * 0.2)
    );
    setLoanRatePercent(settings.loanAnnualRatePercent || 19.5);
    setLoanTermMonths(settings.loanTermMonths || 36);
    setSimRentDailyCost(settings.ownershipType === 'rent' && settings.rentDailyCost > 0 ? settings.rentDailyCost : 2400);
    setSimBuyoutDailyCost(settings.ownershipType === 'rent_to_own' && settings.rentDailyCost > 0 ? settings.rentDailyCost : 3200);
    setBuyoutTermMonths(settings.buyoutTermMonths && settings.buyoutTermMonths > 0 ? settings.buyoutTermMonths : 30);
    setEstimatedCarMarketAtEnd(Math.round(val * 0.55));
  };

  // Сводный расчет всех 4 моделей владения
  const ownershipComparison = useMemo(() => {
    const monthlyGrossRevenue = simDailyGross * simDaysPerMonth;
    const effectiveCommission = settings.aggregatorCommissionPercent || 18.5;
    const parkCommission = settings.parkCommissionPercent || 0;
    const taxPercent = settings.taxPercent || 0;

    const totalDeductionPercent = effectiveCommission + parkCommission + taxPercent;
    const commissionsAndTaxes = monthlyGrossRevenue * (totalDeductionPercent / 100);
    const netRevenueBeforeCar = monthlyGrossRevenue - commissionsAndTaxes;

    // Общие затраты на топливо и мойку
    const fuelCostPerKmCurrent = calculateFuelCostPerKm(settings);
    const monthlyFuelCost = fuelCostPerKmCurrent * monthlySimKm;
    const monthlyWashMisc = (settings.carWashPerShift + settings.miscPerShift) * simDaysPerMonth;

    // ВАЖНО: Если в настройках выбрана аренда (settings.ownershipType === 'rent'),
    // в функциях ТО, амортизация и страховка обнуляются (так как в таксопарке это включено в аренду).
    // Но для сравнительного анализа Оптимизатора нужно полноценно рассчитать альтернативные варианты:
    // Свой автомобиль, Автокредит и Аренду с выкупом, даже если сейчас водитель на аренде!
    // Вычисляем эталонные затраты:
    const customMaintCostPerKm = settings.maintenanceItems?.reduce((acc, item) => {
      if (item.intervalKm <= 0 || item.cost <= 0) return acc;
      return acc + item.cost / item.intervalKm;
    }, 0) || 0;

    const benchmarkMaintPerKm =
      (settings.maintenancePerKmOverride != null && settings.maintenancePerKmOverride > 0)
        ? settings.maintenancePerKmOverride
        : (customMaintCostPerKm > 0 ? customMaintCostPerKm : 2.35);

    const benchmarkCarPrice = settings.carMarketValue > 0 ? settings.carMarketValue : 1650000;
    const plannedKm = settings.plannedUsageKm > 0 ? settings.plannedUsageKm : 250000;
    const residualPercent = typeof settings.residualValuePercent === 'number' && settings.residualValuePercent > 0
      ? settings.residualValuePercent
      : 30;
    const benchmarkDeprPerKm = (benchmarkCarPrice * (1 - residualPercent / 100)) / plannedKm;

    const benchmarkAnnualInsurance = settings.insuranceAnnualCost > 0 ? settings.insuranceAnnualCost : 42000;
    const benchmarkMonthlyInsurance = benchmarkAnnualInsurance / 12;

    const ownMonthlyMaint = benchmarkMaintPerKm * monthlySimKm;
    const ownMonthlyDepr = benchmarkDeprPerKm * monthlySimKm;

    // 1. СВОЙ АВТОМОБИЛЬ (без долгов)
    const ownTotalCarExpenses = monthlyFuelCost + ownMonthlyMaint + ownMonthlyDepr + benchmarkMonthlyInsurance + monthlyWashMisc;
    const ownNetProfit = netRevenueBeforeCar - ownTotalCarExpenses;

    // 2. АВТОКРЕДИТ НА СЕБЯ
    // Платеж по кредиту + ТО за свой счет + страховка ОСАГО + мойка + топливо
    const loanTotalCarExpenses = carLoan.monthlyPayment + ownMonthlyMaint + benchmarkMonthlyInsurance + monthlyWashMisc + monthlyFuelCost;
    const loanNetProfitCash = netRevenueBeforeCar - loanTotalCarExpenses;
    const loanMonthlyAssetGain = loanTermMonths > 0 ? estimatedCarMarketAtEnd / loanTermMonths : 0;
    const loanEffectiveNetWithAsset = loanNetProfitCash + loanMonthlyAssetGain;

    // 3. ПАРКОВАЯ АРЕНДА (30 дней с учетом условий списания в выходные)
    const daysOn = Math.max(1, typeof settings.rentScheduleDaysOn === 'number' ? settings.rentScheduleDaysOn : 6);
    const daysOff = Math.max(0, typeof settings.rentScheduleDaysOff === 'number' ? settings.rentScheduleDaysOff : 1);
    const totalCycleDays = daysOn + daysOff;
    const rentChargeOnDaysOff = settings.rentChargeOnDaysOff !== false;
    const effectiveDailyRent = rentChargeOnDaysOff
      ? simRentDailyCost
      : (simRentDailyCost * (daysOn / totalCycleDays));
    const rentMonthlyCost = effectiveDailyRent * 30;

    const rentTotalCarExpenses = rentMonthlyCost + monthlyFuelCost + monthlyWashMisc;
    const rentNetProfit = netRevenueBeforeCar - rentTotalCarExpenses;

    // 4. АРЕНДА С ВЫКУПОМ (РАСКАТ)
    const buyoutMonthlyCost = simBuyoutDailyCost * 30;
    const buyoutMonthlyMaint = ownMonthlyMaint; // ТО за счет водителя
    const buyoutMonthlyInsurance = benchmarkMonthlyInsurance;
    const buyoutTotalCarExpenses = buyoutMonthlyCost + monthlyFuelCost + buyoutMonthlyMaint + buyoutMonthlyInsurance + monthlyWashMisc;
    const buyoutNetProfitCash = netRevenueBeforeCar - buyoutTotalCarExpenses;
    const buyoutMonthlyAssetGain = buyoutTermMonths > 0 ? estimatedCarMarketAtEnd / buyoutTermMonths : 0;
    const buyoutEffectiveNetWithAsset = buyoutNetProfitCash + buyoutMonthlyAssetGain;

    return {
      monthlyGrossRevenue,
      commissionsAndTaxes,
      netRevenueBeforeCar,
      monthlyFuelCost,
      monthlyWashMisc,
      ownMaintPerKm: benchmarkMaintPerKm,
      ownDeprPerKm: benchmarkDeprPerKm,
      monthlyInsurance: benchmarkMonthlyInsurance,
      own: {
        monthlyMaint: ownMonthlyMaint,
        monthlyDepr: ownMonthlyDepr,
        totalExpenses: ownTotalCarExpenses,
        netProfit: ownNetProfit,
        netPerShift: ownNetProfit / simDaysPerMonth,
        netPerKm: ownNetProfit / monthlySimKm,
        carCostPerKm: ownTotalCarExpenses / monthlySimKm,
      },
      loan: {
        monthlyPayment: carLoan.monthlyPayment,
        monthlyMaint: ownMonthlyMaint,
        monthlyInsurance: benchmarkMonthlyInsurance,
        totalExpenses: loanTotalCarExpenses,
        netProfitCash: loanNetProfitCash,
        monthlyAssetGain: loanMonthlyAssetGain,
        effectiveNetWithAsset: loanEffectiveNetWithAsset,
        netPerShift: loanNetProfitCash / simDaysPerMonth,
        netPerKm: loanNetProfitCash / monthlySimKm,
        carCostPerKm: loanTotalCarExpenses / monthlySimKm,
      },
      rent: {
        dailyRent: simRentDailyCost,
        monthlyRent: rentMonthlyCost,
        totalExpenses: rentTotalCarExpenses,
        netProfit: rentNetProfit,
        netPerShift: rentNetProfit / simDaysPerMonth,
        netPerKm: rentNetProfit / monthlySimKm,
        carCostPerKm: rentTotalCarExpenses / monthlySimKm,
      },
      buyout: {
        dailyRent: simBuyoutDailyCost,
        monthlyRent: buyoutMonthlyCost,
        monthlyMaint: buyoutMonthlyMaint,
        monthlyInsurance: buyoutMonthlyInsurance,
        totalExpenses: buyoutTotalCarExpenses,
        netProfitCash: buyoutNetProfitCash,
        monthlyAssetGain: buyoutMonthlyAssetGain,
        effectiveNetWithAsset: buyoutEffectiveNetWithAsset,
        netPerShift: buyoutNetProfitCash / simDaysPerMonth,
        netPerKm: buyoutNetProfitCash / monthlySimKm,
        carCostPerKm: buyoutTotalCarExpenses / monthlySimKm,
      },
    };
  }, [
    simDailyGross,
    simDaysPerMonth,
    settings,
    monthlySimKm,
    carLoan.monthlyPayment,
    loanTermMonths,
    simRentDailyCost,
    simBuyoutDailyCost,
    buyoutTermMonths,
    estimatedCarMarketAtEnd,
  ]);

  // -------------------------------------------------------------
  // 3. Покупка смены в агрегаторе (Break-even)
  // -------------------------------------------------------------
  const [sampleShiftPurchaseCost, setSampleShiftPurchaseCost] = useState<number>(1950);
  const [estimatedDailyGross, setEstimatedDailyGross] = useState<number>(9800);

  const breakEvenRevenue = calculateShiftPurchaseBreakEven(
    sampleShiftPurchaseCost,
    settings.aggregatorCommissionPercent
  );

  const commissionAtEstimated = (estimatedDailyGross * settings.aggregatorCommissionPercent) / 100;
  const shiftPurchaseSavingsPerDay = commissionAtEstimated - sampleShiftPurchaseCost;
  const shiftPurchaseMonthlySavings = shiftPurchaseSavingsPerDay * simDaysPerMonth;

  // -------------------------------------------------------------
  // 4. Оптимизация холостого наката
  // -------------------------------------------------------------
  const [currentEfficiencyPercent, setCurrentEfficiencyPercent] = useState<number>(62);
  const [targetEfficiencyPercent, setTargetEfficiencyPercent] = useState<number>(78);

  const paidTargetKm = 135;
  const currentTotalKm = paidTargetKm / (currentEfficiencyPercent / 100);
  const targetTotalKm = paidTargetKm / (targetEfficiencyPercent / 100);
  const savedKmPerDay = Math.max(0, currentTotalKm - targetTotalKm);
  const fullKmRate = calculateFullCostPerKm(settings);
  const dailyEfficiencySavings = savedKmPerDay * fullKmRate;
  const monthlyEfficiencySavings = dailyEfficiencySavings * simDaysPerMonth;

  // -------------------------------------------------------------
  // 5. 12 Практических золотых правил для водителя такси
  // -------------------------------------------------------------
  const taxiRules = [
    {
      id: 1,
      category: 'Заработок и кэфы',
      title: 'Ловите фиолетовые кэфы, а не пустые километры',
      description: 'Поездка с доплатой +250..+400 ₽ приносит почти вдвое больше чистых денег за то же время при неизменном расходе бензина и износе подвески.',
      tag: '+35% к прибыли',
    },
    {
      id: 2,
      category: 'Заработок и кэфы',
      title: 'Гарантия и бонусные цели агрегатора',
      description: 'В дни с доплатой за количество заказов (например за 20 поездок) короткие заказы по 1.5–3 км во дворах становятся самым высокооплачиваемым километражем.',
      tag: 'Короткие заказы',
    },
    {
      id: 3,
      category: 'Экономия пробега',
      title: 'Не выкатывайте пробег в «мертвые дневные часы»',
      description: 'С 11:30 до 15:30 в будни спрос падает на 35–45%, а часовой доход снижается до минимума. Лучше пообедать и отдохнуть перед вечерним пиком.',
      tag: 'Тайм-менеджмент',
    },
    {
      id: 4,
      category: 'Экономия пробега',
      title: 'Автоназначение по цепочке и «По пути домой»',
      description: 'Не кружите по району в поисках заказов. Принимайте следующий заказ по цепочке за 2 минуты до высадки либо вставайте на стоянку у ТЦ или метро.',
      tag: '-20% холостого хода',
    },
    {
      id: 5,
      category: 'Экономия расходов',
      title: 'Плавный разгон и накат в городском цикле',
      description: 'Агрессивное вождение увеличивает расход топлива на 1.8–2.5 л/100 км и стирает колодки в 2 раза быстрее. Спокойный накат бережет до 14 000 ₽ в месяц.',
      tag: 'Топливо и тормоза',
    },
    {
      id: 6,
      category: 'Экономия расходов',
      title: 'Заправка по топливным картам и кэшбэк 5–10%',
      description: 'Оплата бензина или газа картами с кэшбэком в категории «АЗС» возвращает от 2 500 до 4 500 ₽ живых денег каждый месяц.',
      tag: 'Живой кэшбэк',
    },
    {
      id: 7,
      category: 'Сервис и чаевые',
      title: 'Рейтинг 4.98+ и чаевые за счет базового сервиса',
      description: 'Чистые пороги, 3 кабеля зарядки (Type-C, Lightning), нейтральное радио и ненавязчивая вежливость стабильно приносят +300..+600 ₽ чаевых за смену.',
      tag: '+12 000 ₽/мес чаем',
    },
    {
      id: 8,
      category: 'Финансовая дисциплина',
      title: 'Ежедневный фонд ТО — неприкосновенный резерв',
      description: 'Откладывайте по 3–4 ₽ с каждого пройденного км сразу после смены на отдельный счет. Тогда замена сцепления, ступицы или резины не станет ударом по бюджету.',
      tag: 'Фонд безопасности',
    },
    {
      id: 9,
      category: 'Налоги и комиссии',
      title: 'Прямая самозанятость (НПД) без парковых посредников',
      description: 'Прямой договор самозанятого с агрегатором экономит 2.5–4% комиссии таксопарка и дает налоговый вычет 10 000 ₽, уменьшая ставку налога до 3–4%.',
      tag: 'Экономия комиссии',
    },
    {
      id: 10,
      category: 'Локации и зоны',
      title: 'Не стойте в накопителях аэропортов по 2 часа',
      description: 'Простой в очереди терминала сжигает драгоценное рабочее время. Быстрая подача в город приносит за 2 часа больше выручки, чем один дальний заказ.',
      tag: 'Аэропорты',
    },
    {
      id: 11,
      category: 'Сезонность',
      title: 'Сезонные золотые окна: снегопад, ливень, праздники',
      description: 'Первый сильный снегопад, проливной дождь в пятницу и предновогодняя неделя позволяют заработать за 4–5 дней месячную норму водителя за счет стабильного кэфа ×2.5.',
      tag: 'Погодные пики',
    },
    {
      id: 12,
      category: 'Безопасность',
      title: 'Двухканальный видеорегистратор (салон + улица)',
      description: 'Запись происходящего в салоне и перед капотом мгновенно снимает ложные жалобы конфликтных клиентов в поддержку агрегатора и защищает в спорных ДТП.',
      tag: 'Защита от блокировок',
    },
  ];

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-amber-500 font-bold">Оптимизатор рентабельности</span>
              <span className="text-neutral-600">·</span>
              <span className="text-xs text-neutral-400">Стратегический анализ прибыли</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white mt-1">
              Финансовые рычаги увеличения чистой зарплаты
            </h1>
            <p className="text-xs text-neutral-400 mt-1 max-w-2xl">
              Сравнение форм владения с автокредитом, топливная эффективность (бензин, газ, гибрид, электро) и 12 золотых правил заработка.
            </p>
          </div>

          {/* Quick Simulation Presets */}
          <div className="flex items-center gap-2 bg-neutral-950 border border-neutral-800 p-2.5 rounded-lg text-xs">
            <div>
              <span className="text-neutral-500 block text-[10px]">Смен/мес:</span>
              <input
                type="number"
                min="10"
                max="31"
                value={simDaysPerMonth}
                onChange={(e) => setSimDaysPerMonth(Math.max(1, Number(e.target.value)))}
                className="w-14 bg-neutral-900 border border-neutral-700 rounded px-1.5 py-0.5 text-center font-mono text-white text-xs font-bold"
              />
            </div>
            <div>
              <span className="text-neutral-500 block text-[10px]">Км/смена:</span>
              <input
                type="number"
                step="10"
                min="50"
                max="500"
                value={simDailyMileage}
                onChange={(e) => setSimDailyMileage(Math.max(10, Number(e.target.value)))}
                className="w-16 bg-neutral-900 border border-neutral-700 rounded px-1.5 py-0.5 text-center font-mono text-white text-xs font-bold"
              />
            </div>
            <div>
              <span className="text-neutral-500 block text-[10px]">Выручка/смена:</span>
              <input
                type="number"
                step="200"
                min="1000"
                value={simDailyGross}
                onChange={(e) => setSimDailyGross(Math.max(0, Number(e.target.value)))}
                className="w-20 bg-neutral-900 border border-neutral-700 rounded px-1.5 py-0.5 text-center font-mono text-amber-400 text-xs font-bold"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. БЛОК: СРАВНЕНИЕ ТИПОВ ВЛАДЕНИЯ: ТЕКУЩИЙ ИЗ ПАРАМЕТРОВ VS АЛЬТЕРНАТИВА */}
      {/* ========================================================================= */}
      <OwnershipPairComparison
        settings={settings}
        currentUser={currentUser}
        onGoToSettings={onGoToSettings}
        simDailyMileage={simDailyMileage}
        simDaysPerMonth={simDaysPerMonth}
        simDailyGross={simDailyGross}
        setSimDailyMileage={setSimDailyMileage}
        setSimDaysPerMonth={setSimDaysPerMonth}
        setSimDailyGross={setSimDailyGross}
      />

      {/* Кнопка раскрытия общей матрицы всех 4 форм владения */}
      <div className="flex justify-center pt-1 pb-1">
        <button
          type="button"
          onClick={() => setShowAllFormsMatrix((prev) => !prev)}
          className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 rounded-xl text-xs font-semibold text-neutral-300 hover:text-white transition-colors flex items-center gap-2 cursor-pointer shadow"
        >
          <Layers className="w-4 h-4 text-amber-400" />
          <span>{showAllFormsMatrix ? 'Скрыть общую матрицу всех 4 форм владения' : 'Показать общую матрицу всех 4 форм владения (Свой, Кредит, Аренда, Выкуп)'}</span>
          {showAllFormsMatrix ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {showAllFormsMatrix && (
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-5 animate-fade-in">
        
        {/* Header with Car Info from Settings */}
        <div className="border-b border-neutral-800 pb-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Car className="w-5 h-5 text-amber-400" />
              <h2 className="text-base sm:text-lg font-bold text-white">
                Общая матрица: Свой авто vs Автокредит vs Парковая аренда vs Выкуп
              </h2>
            </div>
            <button
              onClick={handleResetOwnershipToSettings}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-neutral-400 hover:text-white bg-neutral-950 border border-neutral-800 hover:border-neutral-700 rounded transition-colors self-start sm:self-auto"
              title="Восстановить параметры из настроек"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Сбросить к профилю</span>
            </button>
          </div>

          {/* Car profile live data callout */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-neutral-900 border border-neutral-700 flex items-center justify-center text-amber-400 font-extrabold text-sm">
                🚗
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm">{carName}</span>
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-[10px] uppercase">
                    {TARIFF_LABELS[settings.category]?.name || settings.category}
                  </span>
                  <span className="text-neutral-500">·</span>
                  <span className="text-neutral-400 font-mono">
                    Рыночная цена: <strong className="text-white">{formatCurrency(carMarketValue)}</strong>
                  </span>
                </div>
                <div className="text-[11px] text-neutral-400 mt-0.5 flex flex-wrap items-center gap-2">
                  <span>Текущий режим в настройках: <strong className="text-amber-400">
                    {settings.ownershipType === 'own' ? 'Свой автомобиль' : settings.ownershipType === 'loan' ? 'Автокредит' : settings.ownershipType === 'rent' ? 'Парковая аренда' : 'Аренда с выкупом'}
                  </strong></span>
                  <span>·</span>
                  <span>Топливо: <strong className="text-white">{FUEL_LABELS[settings.fuelType]?.name}</strong> ({settings.fuelConsumptionPer100Km} {FUEL_LABELS[settings.fuelType]?.unit}/100 км)</span>
                  <span>·</span>
                  <span>ТО: <strong className="text-white">{formatDecimal(ownershipComparison.ownMaintPerKm)} ₽/км</strong></span>
                </div>
              </div>
            </div>

            <div className="text-right text-[11px] font-mono text-neutral-400">
              Выручка: <strong className="text-emerald-400">{formatCurrency(ownershipComparison.monthlyGrossRevenue)}/мес</strong>
              <div className="text-neutral-500 text-[10px]">({simDaysPerMonth} смен × {formatCurrency(simDailyGross)})</div>
            </div>
          </div>
        </div>

        {/* Interactive Sliders / Inputs for fine-tuning */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs bg-neutral-950 p-3.5 rounded-xl border border-neutral-800/80">
          <div>
            <label className="block text-neutral-400 mb-1">
              Автокредит: первоначальный взнос
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="20000"
                min="0"
                max={loanCarPrice}
                value={loanDownPayment}
                onChange={(e) => setLoanDownPayment(Number(e.target.value))}
                className="w-full bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1.5 font-mono text-white text-xs tabular-nums focus:border-amber-500 focus:outline-none"
              />
              <span className="text-neutral-500 shrink-0 font-mono">₽</span>
            </div>
            <span className="text-[10px] text-neutral-500 mt-1 block">
              Ставка {loanRatePercent}% на {loanTermMonths} мес.
            </span>
          </div>

          <div>
            <label className="block text-neutral-400 mb-1">
              Срок кредита (месяцев):
            </label>
            <div className="grid grid-cols-4 gap-1">
              {[24, 36, 48, 60].map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => setLoanTermMonths(term)}
                  className={`py-1 text-xs font-mono font-bold rounded transition-colors ${
                    loanTermMonths === term
                      ? 'bg-amber-500 text-neutral-950'
                      : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                  }`}
                >
                  {term}м
                </button>
              ))}
            </div>
            <span className="text-[10px] text-neutral-500 mt-1 block text-center">
              Платеж: {formatCurrency(carLoan.monthlyPayment)}/мес
            </span>
          </div>

          <div>
            <label className="block text-neutral-400 mb-1">
              Парковая аренда (сутки):
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="100"
                value={simRentDailyCost}
                onChange={(e) => setSimRentDailyCost(Number(e.target.value))}
                className="w-full bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1.5 font-mono text-white text-xs tabular-nums focus:border-amber-500 focus:outline-none"
              />
              <span className="text-neutral-500 shrink-0">₽/сут</span>
            </div>
            <span className="text-[10px] text-neutral-500 mt-1 block">
              ТО и ОСАГО оплачивает таксопарк
            </span>
          </div>

          <div>
            <label className="block text-neutral-400 mb-1">
              Аренда с выкупом (раскат):
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="100"
                value={simBuyoutDailyCost}
                onChange={(e) => setSimBuyoutDailyCost(Number(e.target.value))}
                className="w-full bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1.5 font-mono text-white text-xs tabular-nums focus:border-amber-500 focus:outline-none"
              />
              <span className="text-neutral-500 shrink-0">₽/сут</span>
            </div>
            <span className="text-[10px] text-neutral-500 mt-1 block">
              Срок {buyoutTermMonths} мес, ТО за водителем
            </span>
          </div>
        </div>

        {/* 4-Column Comparative Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          
          {/* 1. Свой автомобиль */}
          <div className={`bg-neutral-950 border rounded-xl p-4 flex flex-col justify-between space-y-4 transition-all ${
            settings.ownershipType === 'own' ? 'border-emerald-500/80 shadow-md ring-1 ring-emerald-500/40' : 'border-neutral-800'
          }`}>
            <div>
              <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    Свой автомобиль
                  </h3>
                  <span className="text-[11px] text-neutral-400">Собственность (без кредита)</span>
                </div>
                {settings.ownershipType === 'own' && (
                  <span className="text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 py-0.5 rounded">
                    ★ В профиле
                  </span>
                )}
              </div>

              <div className="space-y-2 mt-3 text-xs">
                <div className="flex justify-between text-neutral-400">
                  <span>Топливо ({monthlySimKm} км):</span>
                  <span className="font-mono text-white font-medium tabular-nums">{formatCurrency(ownershipComparison.monthlyFuelCost)}</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>ТО и запчасти ({formatDecimal(ownershipComparison.ownMaintPerKm)} ₽/км):</span>
                  <span className="font-mono text-white font-medium tabular-nums">{formatCurrency(ownershipComparison.own.monthlyMaint)}</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Амортизация железа ({formatDecimal(ownershipComparison.ownDeprPerKm)} ₽/км):</span>
                  <span className="font-mono text-white font-medium tabular-nums">{formatCurrency(ownershipComparison.own.monthlyDepr)}</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>ОСАГО такси в месяц:</span>
                  <span className="font-mono text-white font-medium tabular-nums">{formatCurrency(ownershipComparison.monthlyInsurance)}</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Мойка и омывайка ({simDaysPerMonth} смен):</span>
                  <span className="font-mono text-white font-medium tabular-nums">{formatCurrency(ownershipComparison.monthlyWashMisc)}</span>
                </div>
                <div className="pt-2 border-t border-neutral-800 flex justify-between text-neutral-300 font-semibold">
                  <span>Все расходы на авто:</span>
                  <span className="font-mono text-amber-400 tabular-nums">{formatCurrency(ownershipComparison.own.totalExpenses)}/мес</span>
                </div>
              </div>
            </div>

            <div className="bg-neutral-900 p-3.5 rounded-lg border border-neutral-800/80 space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-neutral-400">Чистая прибыль в карман:</span>
                <span className="text-lg font-bold font-mono text-emerald-400 tabular-nums">
                  +{formatCurrency(ownershipComparison.own.netProfit)}/мес
                </span>
              </div>
              <div className="flex justify-between text-[11px] text-neutral-400 border-t border-neutral-800 pt-1.5">
                <span>За смену: <strong className="text-white font-mono">{formatCurrency(ownershipComparison.own.netPerShift)}</strong></span>
                <span>1 км: <strong className="text-white font-mono">{formatDecimal(ownershipComparison.own.netPerKm)} ₽</strong></span>
              </div>
              <p className="text-[10px] text-emerald-400/90 leading-tight">
                ✓ Максимальный доход. Машина уже куплена, амортизация идет в ваш личный резерв.
              </p>
            </div>
          </div>

          {/* 2. Автокредит на автомобиль */}
          <div className={`bg-neutral-950 border rounded-xl p-4 flex flex-col justify-between space-y-4 transition-all ${
            settings.ownershipType === 'loan' ? 'border-amber-500/80 shadow-md ring-1 ring-amber-500/40' : 'border-neutral-800'
          }`}>
            <div>
              <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-amber-400" />
                    Автокредит
                  </h3>
                  <span className="text-[11px] text-neutral-400">Покупка в кредит на себя</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono text-neutral-400 bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-800">
                    {loanTermMonths} мес.
                  </span>
                  {settings.ownershipType === 'loan' && (
                    <span className="text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-800 px-1.5 py-0.5 rounded">
                      ★ В профиле
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2 mt-3 text-xs">
                <div className="flex justify-between text-neutral-400">
                  <span>Платеж банку ({loanRatePercent}%):</span>
                  <span className="font-mono text-white font-medium tabular-nums">{formatCurrency(ownershipComparison.loan.monthlyPayment)}</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Топливо ({monthlySimKm} км):</span>
                  <span className="font-mono text-white font-medium tabular-nums">{formatCurrency(ownershipComparison.monthlyFuelCost)}</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>ТО и запчасти (свой счет):</span>
                  <span className="font-mono text-white font-medium tabular-nums">{formatCurrency(ownershipComparison.loan.monthlyMaint)}</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>ОСАГО такси в месяц:</span>
                  <span className="font-mono text-white font-medium tabular-nums">{formatCurrency(ownershipComparison.loan.monthlyInsurance)}</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Мойка и омывайка ({simDaysPerMonth} смен):</span>
                  <span className="font-mono text-white font-medium tabular-nums">{formatCurrency(ownershipComparison.monthlyWashMisc)}</span>
                </div>
                <div className="pt-2 border-t border-neutral-800 flex justify-between text-neutral-300 font-semibold">
                  <span>Отток денег (кэшфлоу):</span>
                  <span className="font-mono text-amber-400 tabular-nums">{formatCurrency(ownershipComparison.loan.totalExpenses)}/мес</span>
                </div>
              </div>
            </div>

            <div className="bg-neutral-900 p-3.5 rounded-lg border border-neutral-800/80 space-y-2">
              <div className="flex justify-between items-baseline">
                <div>
                  <span className="text-xs text-neutral-400 block">Живые деньги на руки:</span>
                  <span className="text-[10px] text-neutral-500">После платежа банку</span>
                </div>
                <span className="text-base font-bold font-mono text-white tabular-nums">
                  +{formatCurrency(ownershipComparison.loan.netProfitCash)}/мес
                </span>
              </div>
              <div className="bg-amber-950/40 border border-amber-800/50 p-1.5 rounded text-[11px] text-amber-300 flex justify-between items-center">
                <span>+ Капитал (выкуп авто):</span>
                <span className="font-mono font-bold text-amber-200">+{formatCurrency(ownershipComparison.loan.monthlyAssetGain)}/мес</span>
              </div>
              <div className="pt-1 border-t border-neutral-800 flex justify-between items-baseline">
                <span className="text-xs font-semibold text-neutral-200">С учетом машины:</span>
                <span className="text-base font-extrabold font-mono text-amber-400 tabular-nums">
                  +{formatCurrency(ownershipComparison.loan.effectiveNetWithAsset)}/мес
                </span>
              </div>
            </div>
          </div>

          {/* 3. Парковая аренда */}
          <div className={`bg-neutral-950 border rounded-xl p-4 flex flex-col justify-between space-y-4 transition-all ${
            settings.ownershipType === 'rent' ? 'border-blue-500/80 shadow-md ring-1 ring-blue-500/40' : 'border-neutral-800'
          }`}>
            <div>
              <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Car className="w-4 h-4 text-blue-400" />
                    Парковая аренда
                  </h3>
                  <span className="text-[11px] text-neutral-400">Аренда парку (без выкупа)</span>
                </div>
                {settings.ownershipType === 'rent' && (
                  <span className="text-[10px] font-bold bg-blue-950 text-blue-400 border border-blue-800 px-1.5 py-0.5 rounded">
                    ★ В профиле
                  </span>
                )}
              </div>

              <div className="space-y-2 mt-3 text-xs">
                <div className="flex justify-between text-neutral-400">
                  <span>Аренда парку (30 дн × {formatCurrency(simRentDailyCost)}):</span>
                  <span className="font-mono text-white font-medium tabular-nums">{formatCurrency(ownershipComparison.rent.monthlyRent)}</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Топливо ({monthlySimKm} км):</span>
                  <span className="font-mono text-white font-medium tabular-nums">{formatCurrency(ownershipComparison.monthlyFuelCost)}</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>ТО, резина, ремонты:</span>
                  <span className="font-mono text-emerald-400 font-medium">0 ₽ (платит парк)</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>ОСАГО такси и амортизация:</span>
                  <span className="font-mono text-emerald-400 font-medium">0 ₽ (платит парк)</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Мойка и омывайка ({simDaysPerMonth} смен):</span>
                  <span className="font-mono text-white font-medium tabular-nums">{formatCurrency(ownershipComparison.monthlyWashMisc)}</span>
                </div>
                <div className="pt-2 border-t border-neutral-800 flex justify-between text-neutral-300 font-semibold">
                  <span>Все расходы на авто:</span>
                  <span className="font-mono text-rose-400 tabular-nums">{formatCurrency(ownershipComparison.rent.totalExpenses)}/мес</span>
                </div>
              </div>
            </div>

            <div className="bg-neutral-900 p-3.5 rounded-lg border border-neutral-800/80 space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-neutral-400">Чистая прибыль в карман:</span>
                <span className="text-lg font-bold font-mono text-white tabular-nums">
                  +{formatCurrency(ownershipComparison.rent.netProfit)}/мес
                </span>
              </div>
              <div className="flex justify-between text-[11px] text-neutral-400 border-t border-neutral-800 pt-1.5">
                <span>За смену: <strong className="text-white font-mono">{formatCurrency(ownershipComparison.rent.netPerShift)}</strong></span>
                <span>1 км: <strong className="text-white font-mono">{formatDecimal(ownershipComparison.rent.netPerKm)} ₽</strong></span>
              </div>
              <p className="text-[10px] text-neutral-500 leading-tight">
                ✕ 0 ₽ накоплений: после сдачи авто водителю ничего не принадлежит.
              </p>
            </div>
          </div>

          {/* 4. Аренда с выкупом (Раскат) */}
          <div className={`bg-neutral-950 border rounded-xl p-4 flex flex-col justify-between space-y-4 transition-all ${
            settings.ownershipType === 'rent_to_own' ? 'border-purple-500/80 shadow-md ring-1 ring-purple-500/40' : 'border-neutral-800'
          }`}>
            <div>
              <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-purple-400" />
                    Аренда с выкупом
                  </h3>
                  <span className="text-[11px] text-neutral-400">Раскат под себя ({buyoutTermMonths} мес.)</span>
                </div>
                {settings.ownershipType === 'rent_to_own' && (
                  <span className="text-[10px] font-bold bg-purple-950 text-purple-400 border border-purple-800 px-1.5 py-0.5 rounded">
                    ★ В профиле
                  </span>
                )}
              </div>

              <div className="space-y-2 mt-3 text-xs">
                <div className="flex justify-between text-neutral-400">
                  <span>Выкуп (30 дн × {formatCurrency(simBuyoutDailyCost)}):</span>
                  <span className="font-mono text-white font-medium tabular-nums">{formatCurrency(ownershipComparison.buyout.monthlyRent)}</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Топливо ({monthlySimKm} км):</span>
                  <span className="font-mono text-white font-medium tabular-nums">{formatCurrency(ownershipComparison.monthlyFuelCost)}</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>ТО и обслуживание (свой счет):</span>
                  <span className="font-mono text-white font-medium tabular-nums">{formatCurrency(ownershipComparison.buyout.monthlyMaint)}</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>ОСАГО такси в месяц:</span>
                  <span className="font-mono text-white font-medium tabular-nums">{formatCurrency(ownershipComparison.buyout.monthlyInsurance)}</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Мойка и омывайка ({simDaysPerMonth} смен):</span>
                  <span className="font-mono text-white font-medium tabular-nums">{formatCurrency(ownershipComparison.monthlyWashMisc)}</span>
                </div>
                <div className="pt-2 border-t border-neutral-800 flex justify-between text-neutral-300 font-semibold">
                  <span>Отток денег (кэшфлоу):</span>
                  <span className="font-mono text-rose-400 tabular-nums">{formatCurrency(ownershipComparison.buyout.totalExpenses)}/мес</span>
                </div>
              </div>
            </div>

            <div className="bg-neutral-900 p-3.5 rounded-lg border border-neutral-800/80 space-y-2">
              <div className="flex justify-between items-baseline">
                <div>
                  <span className="text-xs text-neutral-400 block">Живые деньги на руки:</span>
                  <span className="text-[10px] text-neutral-500">В процессе раската</span>
                </div>
                <span className="text-base font-bold font-mono text-white tabular-nums">
                  +{formatCurrency(ownershipComparison.buyout.netProfitCash)}/мес
                </span>
              </div>
              <div className="bg-purple-950/40 border border-purple-800/50 p-1.5 rounded text-[11px] text-purple-300 flex justify-between items-center">
                <span>+ Капитал (выкуп авто):</span>
                <span className="font-mono font-bold text-purple-200">+{formatCurrency(ownershipComparison.buyout.monthlyAssetGain)}/мес</span>
              </div>
              <div className="pt-1 border-t border-neutral-800 flex justify-between items-baseline">
                <span className="text-xs font-semibold text-neutral-200">С учетом машины:</span>
                <span className="text-base font-extrabold font-mono text-purple-400 tabular-nums">
                  +{formatCurrency(ownershipComparison.buyout.effectiveNetWithAsset)}/мес
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Strategic Comparison Conclusion */}
        <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="text-neutral-300 leading-relaxed">
              <span>
                Кредитный автомобиль при платеже <strong className="text-amber-400">{formatCurrency(carLoan.monthlyPayment)}/мес</strong> обходится в пересчете на сутки в <strong className="text-white">{formatCurrency(carLoan.dailyPaymentCalendar)}/сут</strong> (против <strong className="text-rose-400">{formatCurrency(simRentDailyCost)}/сут</strong> парковой аренды). Разница в карман водителя: <strong className="text-emerald-400">+{formatCurrency((simRentDailyCost * 30) - (carLoan.monthlyPayment + ownershipComparison.loan.monthlyMaint + ownershipComparison.loan.monthlyInsurance))}/мес</strong>, плюс автомобиль переходит в вашу полную собственность!
              </span>
            </div>
          </div>
          <div className="text-neutral-400 font-mono text-[11px] shrink-0 bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded-lg">
            Нагрузка кредита: <strong className="text-white">{formatCurrency(carLoan.paymentPerShift)}/смена</strong>
          </div>
        </div>

      </div>
      )}

      {/* ========================================================================= */}
      {/* 2. БЛОК: ТОПЛИВНАЯ ЭФФЕКТИВНОСТЬ: БЕНЗИН VS ГАЗ VS ГИБРИД VS ЭЛЕКТРО */}
      {/* ========================================================================= */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-400" />
              <h2 className="text-base sm:text-lg font-bold text-white">
                Топливная эффективность: Бензин, Газ, Гибрид, Электро
              </h2>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Сравнение со стоковым бензиновым авто и синхронизация с параметрами из раздела «Параметры и расходы»
            </p>
          </div>

          <button
            onClick={handleResetFuelParams}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-neutral-400 hover:text-white bg-neutral-950 border border-neutral-800 hover:border-neutral-700 rounded transition-colors self-start sm:self-auto"
            title="Восстановить значения из Параметров и расходов"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Сбросить к настройкам</span>
          </button>
        </div>

        {/* Live sync badge with "Параметры и расходы" */}
        <div className="bg-amber-950/30 border border-amber-800/60 rounded-lg p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span className="text-neutral-300">
              Ваш выбор в разделе «Параметры и расходы»:
            </span>
            <strong className="text-amber-400 font-mono font-semibold">
              {FUEL_LABELS[settings.fuelType]?.name || settings.fuelType}
            </strong>
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px] text-neutral-300">
            <span>Расход: <strong className="text-white">{settings.fuelConsumptionPer100Km}</strong> {FUEL_LABELS[settings.fuelType]?.unit}/100 км</span>
            <span>Цена: <strong className="text-white">{formatDecimal(settings.fuelPricePerUnit)}</strong> ₽/{FUEL_LABELS[settings.fuelType]?.unit}</span>
            <span>1 км пути: <strong className="text-emerald-400">{formatDecimal((settings.fuelConsumptionPer100Km * settings.fuelPricePerUnit) / 100)} ₽</strong></span>
          </div>
        </div>

        {/* Multi-fuel selector pills (текущий выбор из настроек скрыт из плиток сравнения) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {availableFuelOptions.map((opt) => {
            const isSelected = activeSelectedFuelTab === opt.id;
            const metrics = fuelMetrics[opt.id];
            const Icon = opt.icon;

            return (
              <button
                key={opt.id}
                onClick={() => setSelectedFuelTab(opt.id)}
                className={`text-left p-3 rounded-xl border transition-all relative ${
                  isSelected
                    ? 'bg-neutral-800 border-amber-500 shadow-md ring-1 ring-amber-500/50'
                    : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-amber-400' : 'text-neutral-500'}`} />
                  <span className="text-[10px] font-mono text-neutral-400 px-1 py-0.5 rounded bg-neutral-900 border border-neutral-800">
                    {opt.badge}
                  </span>
                </div>
                <div className="text-xs font-bold text-white truncate">{opt.title}</div>
                <div className="mt-1 font-mono text-sm font-extrabold text-amber-400 tabular-nums">
                  {formatDecimal(metrics.kmCost)} <span className="text-[10px] font-normal text-neutral-400">₽/км</span>
                </div>
                {opt.id !== 'stock_gasoline' ? (
                  <div className="mt-0.5 text-[10px] font-mono text-emerald-400 tabular-nums">
                    -{metrics.diffPercent}% к бензину
                  </div>
                ) : (
                  <div className="mt-0.5 text-[10px] font-mono text-neutral-500">
                    Базовый эталон
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected Fuel Deep Dive Analysis */}
        {(() => {
          const currentOpt = fuelOptions.find(o => o.id === activeSelectedFuelTab) || availableFuelOptions[0];
          const currentParam = fuelParams[activeSelectedFuelTab];
          const currentMetric = fuelMetrics[activeSelectedFuelTab];
          const stockMetric = fuelMetrics.stock_gasoline;
          const isStock = currentOpt.isStock;

          // Себестоимость на текущем топливе водителя из настроек профиля:
          const profileKmCost = (settings.fuelConsumptionPer100Km * settings.fuelPricePerUnit) / 100;
          const profileMonthlyCost = profileKmCost * monthlySimKm;
          const profileMonthlySavings = profileMonthlyCost - currentMetric.monthlyCost;

          return (
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">{currentOpt.title}</span>
                  <span className="text-xs text-neutral-500">·</span>
                  <span className="text-xs text-neutral-400">{currentOpt.description}</span>
                </div>
                <span className="text-xs font-mono text-neutral-400">
                  Расчет при пробеге: <strong className="text-white">{monthlySimKm.toLocaleString('ru-RU')} км/мес</strong>
                </span>
              </div>

              {/* Editable parameters for selected fuel */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-neutral-900/80 p-3 rounded-lg border border-neutral-800">
                  <label className="block text-neutral-400 mb-1">
                    Расход ({currentOpt.unit} / 100 км):
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    value={currentParam.consumption}
                    onChange={(e) => handleUpdateFuelParam(activeSelectedFuelTab, 'consumption', Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 font-mono text-white text-sm tabular-nums focus:border-amber-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-neutral-500 mt-1 block">
                    {activeSelectedFuelTab === 'electric' ? 'Средний расход батареи' : 'Норма в городском цикле'}
                  </span>
                </div>

                <div className="bg-neutral-900/80 p-3 rounded-lg border border-neutral-800">
                  <label className="block text-neutral-400 mb-1">
                    Цена топлива (₽ / {currentOpt.unit}):
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={currentParam.price}
                    onChange={(e) => handleUpdateFuelParam(activeSelectedFuelTab, 'price', Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 font-mono text-white text-sm tabular-nums focus:border-amber-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-neutral-500 mt-1 block">
                    {activeSelectedFuelTab === 'electric' ? 'Тариф зарядной станции/ЭЗС' : 'Стоимость на АЗС/АГЗС'}
                  </span>
                </div>

                <div className="bg-neutral-900/80 p-3 rounded-lg border border-neutral-800">
                  <label className="block text-neutral-400 mb-1">
                    {isStock ? 'Затраты на переоборудование' : 'Стоимость оборудования / доплата, ₽:'}
                  </label>
                  <input
                    type="number"
                    step="5000"
                    min="0"
                    disabled={isStock}
                    value={currentParam.upgradeCost}
                    onChange={(e) => handleUpdateFuelParam(activeSelectedFuelTab, 'upgradeCost', Number(e.target.value))}
                    className={`w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 font-mono text-white text-sm tabular-nums focus:border-amber-500 focus:outline-none ${
                      isStock ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  />
                  <span className="text-[10px] text-neutral-500 mt-1 block">
                    {isStock ? 'Сток — доплата 0 ₽' : 'Оборудование под ключ или разница в авто'}
                  </span>
                </div>
              </div>

              {/* Comparative Results Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="bg-neutral-900 p-3.5 rounded-lg border border-neutral-800">
                  <span className="text-[11px] text-neutral-400 block">Себестоимость 1 км:</span>
                  <div className="text-xl font-mono font-bold text-white mt-1 tabular-nums">
                    {formatDecimal(currentMetric.kmCost)} ₽/км
                  </div>
                  <div className="text-[10px] font-mono text-neutral-500 mt-0.5">
                    {isStock ? 'Базовый сток' : `Бензин: ${formatDecimal(stockMetric.kmCost)} ₽/км`}
                  </div>
                </div>

                <div className="bg-neutral-900 p-3.5 rounded-lg border border-neutral-800">
                  <span className="text-[11px] text-neutral-400 block">Затраты на топливо/мес:</span>
                  <div className="text-xl font-mono font-bold text-amber-400 mt-1 tabular-nums">
                    {formatCurrency(currentMetric.monthlyCost)}
                  </div>
                  <div className="text-[10px] font-mono text-neutral-500 mt-0.5">
                    при {monthlySimKm.toLocaleString('ru-RU')} км пробега
                  </div>
                </div>

                <div className="bg-neutral-900 p-3.5 rounded-lg border border-neutral-800">
                  <span className="text-[11px] text-neutral-400 block">Чистая экономия в месяц:</span>
                  <div className={`text-xl font-mono font-bold mt-1 tabular-nums ${
                    isStock ? 'text-neutral-500' : 'text-emerald-400'
                  }`}>
                    {isStock ? '0 ₽' : `+${formatCurrency(currentMetric.monthlySavings)}/мес`}
                  </div>
                  <div className="text-[10px] font-mono text-neutral-500 mt-0.5">
                    {isStock ? 'База сравнения' : `За год: +${formatCurrency(currentMetric.annualSavings)}`}
                  </div>
                  {activeSettingsFuelType !== 'stock_gasoline' && (
                    <div className="text-[10px] font-mono text-neutral-400 mt-1 pt-1 border-t border-neutral-800/80">
                      к вашему профилю: <span className={profileMonthlySavings >= 0 ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                        {profileMonthlySavings >= 0 ? '+' : ''}{formatCurrency(profileMonthlySavings)}/мес
                      </span>
                    </div>
                  )}
                </div>

                <div className="bg-neutral-900 p-3.5 rounded-lg border border-neutral-800">
                  <span className="text-[11px] text-neutral-400 block">Окупаемость перехода:</span>
                  <div className="text-xl font-mono font-bold text-white mt-1 tabular-nums">
                    {isStock ? (
                      <span className="text-neutral-500 text-sm font-normal">Не требуется</span>
                    ) : currentMetric.paybackMonths > 0 ? (
                      <span className="text-amber-400 font-extrabold">~{currentMetric.paybackMonths} мес.</span>
                    ) : (
                      <span className="text-rose-400 text-sm font-normal">Не окупается</span>
                    )}
                  </div>
                  <div className="text-[10px] font-mono text-neutral-500 mt-0.5">
                    {!isStock && currentParam.upgradeCost > 0 ? `при вложениях ${formatCurrency(currentParam.upgradeCost)}` : '—'}
                  </div>
                </div>
              </div>

              {/* Pros & Cons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                <div className="bg-emerald-950/20 border border-emerald-900/40 p-2.5 rounded-lg text-emerald-300">
                  <strong className="block text-emerald-400 font-semibold mb-0.5">Преимущества в такси:</strong>
                  {currentOpt.pros}
                </div>
                <div className="bg-amber-950/20 border border-amber-900/40 p-2.5 rounded-lg text-amber-300">
                  <strong className="block text-amber-400 font-semibold mb-0.5">Ограничения и нюансы:</strong>
                  {currentOpt.cons}
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* ========================================================================= */}
      {/* 3. БЛОКИ: ПОКУПКА СМЕНЫ И СОКРАЩЕНИЕ ХОЛОСТОГО ПРОБЕГА */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Покупка смены в агрегаторе (Break-even) */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Ticket className="w-5 h-5 text-amber-400" />
              Покупка смены без комиссии агрегатора
            </h2>
            <span className="text-xs text-neutral-400 font-mono">
              Комиссия {settings.aggregatorCommissionPercent}%
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-neutral-400 mb-1">Стоимость смены (12 ч), ₽</label>
              <input
                type="number"
                step="50"
                value={sampleShiftPurchaseCost}
                onChange={(e) => setSampleShiftPurchaseCost(Number(e.target.value))}
                className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 font-mono text-white text-sm tabular-nums focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-neutral-400 mb-1">Ваша выручка в смену, ₽</label>
              <input
                type="number"
                step="200"
                value={estimatedDailyGross}
                onChange={(e) => setEstimatedDailyGross(Number(e.target.value))}
                className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 font-mono text-white text-sm tabular-nums focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Break-even calculation card */}
          <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800/80 space-y-3">
            <div className="flex justify-between items-baseline">
              <div>
                <span className="text-xs text-neutral-400 block">Порог окупаемости покупки:</span>
                <span className="text-[10px] text-neutral-500">Если делаете больше этой суммы — покупайте</span>
              </div>
              <span className="text-xl font-bold font-mono text-amber-400 tabular-nums">
                {formatCurrency(breakEvenRevenue)}
              </span>
            </div>

            <div className="pt-2 border-t border-neutral-800 flex justify-between items-baseline">
              <span className="text-xs text-neutral-400">Результат при вашей выручке ({formatCurrency(estimatedDailyGross)}):</span>
              <span className={`text-lg font-bold font-mono tabular-nums ${
                shiftPurchaseSavingsPerDay > 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {shiftPurchaseSavingsPerDay > 0 ? '+' : ''}{formatCurrency(shiftPurchaseSavingsPerDay)}/смена
              </span>
            </div>

            {shiftPurchaseSavingsPerDay > 0 && (
              <div className="text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-900/60 p-2 rounded flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Экономия за {simDaysPerMonth} смен: <strong>+{formatCurrency(shiftPurchaseMonthlySavings)}</strong> в карман!</span>
              </div>
            )}
          </div>

          <p className="text-[11px] text-neutral-500 leading-normal">
            В дни повышенного спроса (пятница, снегопад, праздники) покупка смены приносит ощутимый плюс к зарплате.
          </p>
        </div>

        {/* Оптимизация холостого наката */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Compass className="w-5 h-5 text-amber-400" />
              Сокращение холостого пробега
            </h2>
            <span className="text-xs text-neutral-400">
              Подача + возврат в район
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between mb-1 text-neutral-400">
                <span>Текущая доля платного пробега:</span>
                <span className="font-mono text-white font-semibold">{currentEfficiencyPercent}%</span>
              </div>
              <input
                type="range"
                min="45"
                max="85"
                value={currentEfficiencyPercent}
                onChange={(e) => setCurrentEfficiencyPercent(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1 text-neutral-400">
                <span>Целевая доля после оптимизации:</span>
                <span className="font-mono text-emerald-400 font-semibold">{targetEfficiencyPercent}%</span>
              </div>
              <input
                type="range"
                min={currentEfficiencyPercent}
                max="90"
                value={targetEfficiencyPercent}
                onChange={(e) => setTargetEfficiencyPercent(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>
          </div>

          <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800/80 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-neutral-400">Холостой накат сократится на:</span>
              <span className="font-mono text-white font-semibold tabular-nums">
                ~{Math.round(savedKmPerDay)} км/смена
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Сбереженные деньги на топливе и ТО:</span>
              <span className="font-mono text-emerald-400 font-bold tabular-nums">
                +{formatCurrency(dailyEfficiencySavings)}/смена
              </span>
            </div>
            <div className="pt-2 border-t border-neutral-800 flex justify-between items-baseline text-sm">
              <span className="font-medium text-white">Прибавка к чистой прибыли за месяц:</span>
              <span className="font-mono text-emerald-400 font-extrabold tabular-nums">
                +{formatCurrency(monthlyEfficiencySavings)}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-neutral-500 leading-normal">
            Используйте автоназначение заказов «по цепочке» и функцию «По пути домой/по делам», не кружите по городу в поисках заказов без стоянки.
          </p>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 4. БЛОК: 12 ЗОЛОТЫХ ПРАВИЛ МАКСИМИЗАЦИИ ЧИСТОЙ ПРИБЫЛИ */}
      {/* ========================================================================= */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              12 практических золотых правил максимизации чистой прибыли водителя такси
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Проверенные лайфхаки и стратегия опытных водителей для увеличения дохода на руки
            </p>
          </div>
          <span className="text-xs font-mono text-amber-400 bg-amber-950/40 border border-amber-800/60 px-2 py-0.5 rounded self-start sm:self-auto">
            12 практических правил
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          {taxiRules.map((rule) => (
            <div 
              key={rule.id} 
              className="p-3.5 bg-neutral-950 rounded-xl border border-neutral-800/80 hover:border-neutral-700 transition-colors flex flex-col justify-between space-y-2"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-[10px] font-mono text-neutral-400 px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800">
                    {rule.category}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-400 font-mono">
                    {rule.tag}
                  </span>
                </div>
                <strong className="text-white block font-semibold text-xs leading-snug">
                  {rule.id}. {rule.title}
                </strong>
                <p className="text-neutral-400 text-[11px] leading-relaxed mt-1">
                  {rule.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Integrated Partner Optimization Offers */}
      <IntegratedAdBanner placement="optimizer" variant="banner" />

    </div>
  );
};
