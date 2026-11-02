import {
  DailyShiftCalculation,
  DailyShiftInput,
  SurgeType,
  TariffCategory,
  TariffConfig,
  TripOrderEvaluation,
  TripOrderInput,
  VehicleSettings,
} from '../types/taxi';
import { DEFAULT_TARIFFS } from './constants';

/**
 * Расчет итоговой стоимости с учетом коэффициента спроса
 * (множитель х1.8 или фиксированная надбавка +150 ₽)
 */
export function calculateFareWithSurge(
  baseFare: number,
  surgeType: SurgeType,
  surgeValue: number
): number {
  if (surgeType === 'multiplier') {
    const mult = surgeValue > 0 ? surgeValue : 1;
    return Math.round(baseFare * mult);
  }
  // fixed: доплата суммой в рублях
  const bonus = surgeValue || 0;
  return Math.round(Math.max(0, baseFare + bonus));
}

/**
 * Расчет стоимости планового ТО и расходников на 1 км (руб/км)
 */
export function calculateMaintenanceCostPerKm(settings: VehicleSettings): number {
  if (settings.ownershipType === 'rent') {
    // В аренде плановое ТО и ремонт обычно берет на себя таксопарк
    return 0;
  }
  
  if (settings.maintenancePerKmOverride != null && settings.maintenancePerKmOverride > 0) {
    return settings.maintenancePerKmOverride;
  }

  return settings.maintenanceItems.reduce((acc, item) => {
    if (item.intervalKm <= 0 || item.cost <= 0) return acc;
    return acc + item.cost / item.intervalKm;
  }, 0);
}

/**
 * Расчет потери остаточной стоимости автомобиля (депрециации железа) на 1 км (руб/км)
 */
export function calculateDepreciationPerKm(settings: VehicleSettings): number {
  if (settings.ownershipType === 'rent' || settings.ownershipType === 'rent_to_own' || settings.ownershipType === 'loan') return 0;
  
  const lossAmount = settings.carMarketValue * (1 - settings.residualValuePercent / 100);
  if (lossAmount <= 0 || settings.plannedUsageKm <= 0) return 0;
  
  return lossAmount / settings.plannedUsageKm;
}

/**
 * Расчет стоимости годовой страховки (ОСАГО такси) на 1 км (руб/км)
 */
export function calculateInsurancePerKm(settings: VehicleSettings): number {
  if (settings.ownershipType === 'rent') return 0;
  if (settings.annualEstimatedMileage <= 0 || settings.insuranceAnnualCost <= 0) return 0;
  return settings.insuranceAnnualCost / settings.annualEstimatedMileage;
}

/**
 * Расчет стоимости топлива на 1 км (руб/км)
 */
export function calculateFuelCostPerKm(settings: VehicleSettings): number {
  return (settings.fuelConsumptionPer100Km / 100) * settings.fuelPricePerUnit;
}

/**
 * Суточная доля платежа по автокредиту на 1 рабочую смену
 */
export function calculateDailyLoanShare(settings: VehicleSettings, workingDaysPerMonth: number = 24): number {
  if (settings.ownershipType !== 'loan') return 0;
  
  if (typeof settings.loanMonthlyPayment === 'number' && settings.loanMonthlyPayment > 0) {
    return settings.loanMonthlyPayment / Math.max(1, workingDaysPerMonth);
  }

  const carPrice = settings.carMarketValue || settings.loanCarPrice || 1650000;
  const downPayment = typeof settings.loanDownPayment === 'number' ? settings.loanDownPayment : Math.round(carPrice * 0.2);
  const rate = settings.loanAnnualRatePercent ?? 19.5;
  const term = settings.loanTermMonths ?? 36;
  const loan = calculateCarLoan(carPrice, downPayment, rate, term, workingDaysPerMonth);
  return loan.paymentPerShift;
}

/**
 * Полная себестоимость 1 км пробега (топливо + ТО + амортизация/кредит + страховка)
 */
export function calculateFullCostPerKm(settings: VehicleSettings): number {
  const fuel = calculateFuelCostPerKm(settings);
  if (settings.ownershipType === 'rent') {
    // Для аренды базовая переменная себестоимость км — это топливо
    return fuel;
  }
  const maint = calculateMaintenanceCostPerKm(settings);
  const insur = calculateInsurancePerKm(settings);
  
  if (settings.ownershipType === 'rent_to_own') {
    // В аренде с выкупом: топливо + ТО + страховка + доля выкупного платежа на км
    const effectiveDailyRent = calculateEffectiveDailyRent(settings);
    const rentPerKmApprox = effectiveDailyRent / 180;
    return fuel + maint + insur + rentPerKmApprox;
  }

  if (settings.ownershipType === 'loan') {
    // Для авто в кредит: топливо + ТО + страховка + доля кредитного платежа на км
    const dailyLoan = calculateDailyLoanShare(settings, 24);
    const loanKmApprox = dailyLoan / 180;
    return fuel + maint + insur + loanKmApprox;
  }

  const depr = calculateDepreciationPerKm(settings);
  return fuel + maint + depr + insur;
}

/**
 * Эффективная суточная аренда с учетом графика (например 7/0, 6/1, 5/2)
 * Применяется как для обычной аренды, так и для аренды с выкупом
 */
export function calculateEffectiveDailyRent(settings: VehicleSettings): number {
  if (settings.ownershipType !== 'rent' && settings.ownershipType !== 'rent_to_own') return 0;
  
  const dailyRent = Math.max(0, Number(settings.rentDailyCost) || 0);
  const deposit = Math.max(0, Number(settings.rentDepositDaily) || 0);
  
  // ВАЖНО: 0 — это валидное число дней отдыха (график 7/0)! Нельзя использовать ||, иначе 0 превращался в 1!
  const daysOn = Math.max(1, typeof settings.rentScheduleDaysOn === 'number' && !isNaN(settings.rentScheduleDaysOn) ? settings.rentScheduleDaysOn : 7);
  const daysOff = Math.max(0, typeof settings.rentScheduleDaysOff === 'number' && !isNaN(settings.rentScheduleDaysOff) ? settings.rentScheduleDaysOff : 0);
  
  // Если дней отдыха 0 (график 7/0) или парк не начисляет аренду в выходные:
  const chargeOnDaysOff = settings.rentChargeOnDaysOff !== false;
  
  if (daysOff === 0 || !chargeOnDaysOff) {
    return dailyRent + deposit;
  }
  
  // Если есть выходные дни (например 6/1) и парк списывает аренду за все дни недели:
  // Недельная сумма аренды (dailyRent * totalDays) распределяется на фактически отработанные дни daysOn:
  const totalDays = daysOn + daysOff;
  const costPerWorkingDay = (dailyRent * totalDays) / daysOn;
  return costPerWorkingDay + deposit;
}

/**
 * Полный расчет результатов рабочей смены
 */
export function calculateDailyShift(
  input: DailyShiftInput,
  settings: VehicleSettings
): DailyShiftCalculation {
  const grossIncome = input.grossRevenue + input.bonuses + input.tips;
  
  // 1. Комиссии агрегатора:
  // Определяем тариф смены (выбранный водителем для смены или активный из настроек авто)
  const activeTariffCategory: TariffCategory =
    input.tariffCategory ||
    settings.tariffSettings?.activeCategory ||
    (settings.category as TariffCategory) ||
    'economy';

  const tariffCommissionRate =
    settings.tariffSettings?.tariffs?.[activeTariffCategory]?.aggregatorCommissionPercent;

  const effectiveAggregatorCommissionPercent =
    typeof tariffCommissionRate === 'number' && !isNaN(tariffCommissionRate)
      ? tariffCommissionRate
      : (typeof settings.aggregatorCommissionPercent === 'number' && !isNaN(settings.aggregatorCommissionPercent)
          ? settings.aggregatorCommissionPercent
          : 18.5);

  let aggregatorFee = 0;
  if (input.useShiftPurchase) {
    aggregatorFee = input.shiftPurchaseCost || 0;
  } else {
    // Агрегатор берет комиссию с заказов (и иногда с бонусов)
    aggregatorFee = (input.grossRevenue * effectiveAggregatorCommissionPercent) / 100;
  }

  // 2. Комиссия таксопарка:
  // Обычно берется с выручки (иногда с бонусов)
  const parkFee = (input.grossRevenue * settings.parkCommissionPercent) / 100;

  // 3. Комиссия за вывод средств (эквайринг/моментальные выплаты):
  // Применяется к безналичной части (обычно 80-90% оборота)
  const withdrawBase = Math.max(0, input.grossRevenue + input.bonuses - aggregatorFee - parkFee);
  const payoutFee = (withdrawBase * settings.payoutFeePercent) / 100 + (settings.payoutFixedFee || 0);

  const totalCommissions = aggregatorFee + parkFee + payoutFee;

  // 4. Налоги (например самозанятый 4.3% от чистых начислений или валовой выручки):
  let taxAmount = 0;
  if (settings.taxType !== 'none' && settings.taxPercent > 0) {
    // По закону РФ (НПД): налог считается от валовой суммы заказов до вычета комиссий сервиса
    taxAmount = (input.grossRevenue * settings.taxPercent) / 100;
  }

  // 5. Затраты на топливо:
  const fuelLiters = (input.totalMileageKm * settings.fuelConsumptionPer100Km) / 100;
  let fuelCost = 0;
  if (input.customFuelSpent != null && input.customFuelSpent > 0) {
    fuelCost = input.customFuelSpent;
  } else {
    fuelCost = fuelLiters * settings.fuelPricePerUnit;
  }

  // 6. Фонд ТО и амортизация (для своего авто) или Аренда (для арендованного / выкупа):
  let maintenanceReserve = 0;
  let depreciationCost = 0;
  let rentCost = 0;

  if (settings.ownershipType === 'own') {
    const maintPerKm = calculateMaintenanceCostPerKm(settings);
    const deprPerKm = calculateDepreciationPerKm(settings);
    maintenanceReserve = maintPerKm * input.totalMileageKm;
    depreciationCost = deprPerKm * input.totalMileageKm;
  } else if (settings.ownershipType === 'loan') {
    // Автокредит: сменная доля платежа банку + фонд ТО за счет водителя
    const dailyLoan = calculateDailyLoanShare(settings, 24);
    rentCost = dailyLoan;
    const maintPerKm = calculateMaintenanceCostPerKm(settings);
    maintenanceReserve = maintPerKm * input.totalMileageKm;
  } else if (settings.ownershipType === 'rent_to_own') {
    // Аренда с выкупом: суточный платеж по выкупу + водитель сам несет ТО и расходники
    rentCost = calculateEffectiveDailyRent(settings);
    const maintPerKm = calculateMaintenanceCostPerKm(settings);
    maintenanceReserve = maintPerKm * input.totalMileageKm;
  } else {
    rentCost = calculateEffectiveDailyRent(settings);
  }

  // 7. Постоянные накладные расходы за смену:
  const shiftInsuranceShare =
    settings.ownershipType === 'own' || settings.ownershipType === 'rent_to_own' || settings.ownershipType === 'loan'
      ? calculateInsurancePerKm(settings) * input.totalMileageKm
      : 0;

  const dailyOperatingOverhead =
    settings.carWashPerShift +
    settings.miscPerShift +
    shiftInsuranceShare +
    (input.customExpenses || 0);

  // 8. Итого расходы и чистая прибыль:
  const totalExpenses =
    totalCommissions +
    taxAmount +
    fuelCost +
    maintenanceReserve +
    depreciationCost +
    rentCost +
    dailyOperatingOverhead;

  const netProfit = grossIncome - totalExpenses;

  // Метрики эффективности:
  const hours = Math.max(0.1, input.shiftHours || 1);
  const km = Math.max(1, input.totalMileageKm || 1);
  const orders = Math.max(1, input.ordersCount || 1);

  const hourlyNetRate = netProfit / hours;
  const hourlyGrossRate = grossIncome / hours;
  const netProfitPerKm = netProfit / km;
  const costPerKm = (fuelCost + maintenanceReserve + depreciationCost + rentCost + dailyOperatingOverhead) / km;
  const grossPerKm = grossIncome / km;
  const efficiencyRatio = input.paidMileageKm > 0 ? Math.min(100, (input.paidMileageKm / km) * 100) : 65;
  
  const averageOrderCheck = input.grossRevenue / orders;
  const averageOrderNet = netProfit / orders;
  const averageOrderTimeMinutes = (hours * 60) / orders;

  return {
    grossIncome,
    aggregatorFee,
    aggregatorCommissionPercent: effectiveAggregatorCommissionPercent,
    tariffCategory: activeTariffCategory,
    parkFee,
    payoutFee,
    totalCommissions,
    taxAmount,
    fuelCost,
    fuelLiters,
    maintenanceReserve,
    depreciationCost,
    rentCost,
    shiftInsuranceShare,
    dailyOperatingOverhead,
    totalExpenses,
    netProfit,
    hourlyNetRate,
    hourlyGrossRate,
    netProfitPerKm,
    costPerKm,
    grossPerKm,
    efficiencyRatio,
    averageOrderCheck,
    averageOrderNet,
    averageOrderTimeMinutes,
  };
}

/**
 * Расчет базовой расчетной стоимости поездки по тарифу агрегатора
 * (подача + км * тариф_км + минуты * тариф_мин + платное_ожидание * тариф_ожидания)
 */
export function calculateTariffFare(
  tripDistanceKm: number,
  tripTimeMin: number,
  paidWaitingMin: number,
  tariff: TariffConfig
): {
  basePrice: number;
  includedKm: number;
  chargeableKm: number;
  distanceCost: number;
  includedMinutes: number;
  chargeableMin: number;
  timeCost: number;
  freeWaitingMinutes: number;
  waitingCost: number;
  totalCalculatedFare: number;
} {
  const incKm = Math.max(0, tariff.includedKm || 0);
  const incMin = Math.max(0, tariff.includedMinutes || 0);
  const freeWait = Math.max(0, tariff.freeWaitingMinutes || 0);

  const chargeableKm = Math.max(0, tripDistanceKm - incKm);
  const distanceCost = Math.round(chargeableKm * tariff.pricePerKm);

  const chargeableMin = Math.max(0, tripTimeMin - incMin);
  const timeCost = Math.round(chargeableMin * tariff.pricePerMinute);

  const waitingCost = Math.round(Math.max(0, paidWaitingMin) * tariff.paidWaitingPricePerMinute);

  const totalCalculatedFare = Math.round(tariff.basePrice + distanceCost + timeCost + waitingCost);

  return {
    basePrice: tariff.basePrice,
    includedKm: incKm,
    chargeableKm,
    distanceCost,
    includedMinutes: incMin,
    chargeableMin,
    timeCost,
    freeWaitingMinutes: freeWait,
    waitingCost,
    totalCalculatedFare,
  };
}

/**
 * Оценка конкретного заказа ("Брать ли заказ?") с сопоставлением с тарифом агрегатора
 */
export function evaluateTripOrder(
  trip: TripOrderInput,
  settings: VehicleSettings,
  tariffOverride?: TariffConfig
): TripOrderEvaluation {
  const totalKm = trip.pickupDistanceKm + trip.tripDistanceKm;
  const totalTimeMin = trip.pickupTimeMin + trip.tripTimeMin + (trip.paidWaitingMin || 0);
  const grossAmount = trip.fareAmount;

  // Определение активного тарифа
  const category: TariffCategory = 
    settings.tariffSettings?.activeCategory || 
    (settings.category in DEFAULT_TARIFFS ? (settings.category as TariffCategory) : 'economy');

  const activeTariff: TariffConfig = 
    tariffOverride || 
    settings.tariffSettings?.tariffs?.[category] || 
    DEFAULT_TARIFFS[category];

  const paidWaiting = Math.max(0, trip.paidWaitingMin || 0);
  const tariffResult = calculateTariffFare(trip.tripDistanceKm, trip.tripTimeMin, paidWaiting, activeTariff);

  const tariffBaseCalculated = tariffResult.totalCalculatedFare;
  const waitingEarnings = tariffResult.waitingCost;

  // Коэффициент спроса / кэф (отношение факта к базе по тарифу)
  const surgeMultiplier = tariffBaseCalculated > 0 ? Number((grossAmount / tariffBaseCalculated).toFixed(2)) : 1.0;

  // Комиссии:
  const commissionPercent = activeTariff.aggregatorCommissionPercent ?? settings.aggregatorCommissionPercent;
  const aggregatorFee = (grossAmount * commissionPercent) / 100;
  const parkFee = (grossAmount * settings.parkCommissionPercent) / 100;
  
  // Налог:
  const taxAmount = settings.taxType !== 'none' ? (grossAmount * settings.taxPercent) / 100 : 0;

  // Топливо на этот заказ (подача + поездка):
  const fuelCost = (totalKm * settings.fuelConsumptionPer100Km * settings.fuelPricePerUnit) / 100;

  // 1. Прямые переменные расходы на выполнение этого заказа:
  const directCostsTotal = aggregatorFee + parkFee + taxAmount + fuelCost;
  const directNetProfit = grossAmount - directCostsTotal;
  const hours = Math.max(0.05, totalTimeMin / 60);
  const directNetPerHour = directNetProfit / hours;
  const directNetPerKm = totalKm > 0 ? directNetProfit / totalKm : 0;

  // 2. Выделенный подблок сменных и постоянных расходов владения авто:
  let maintenanceShareCost = 0;
  let depreciationShareCost = 0;
  let maintenanceAndWearCost = 0;
  let dailyRentOrFixedTarget = 0;
  let ownershipExplanation = '';

  if (settings.ownershipType === 'own') {
    const maintPerKm = calculateMaintenanceCostPerKm(settings);
    const deprPerKm = calculateDepreciationPerKm(settings);
    maintenanceShareCost = maintPerKm * totalKm;
    depreciationShareCost = deprPerKm * totalKm;
    maintenanceAndWearCost = maintenanceShareCost + depreciationShareCost;
    
    // Суточные условные расходы на авто (ОСАГО, плановое ТО, мойка на ~150 км смены):
    const dailyFixed = (settings.insuranceAnnualCost / 365) + settings.carWashPerShift + settings.miscPerShift;
    dailyRentOrFixedTarget = Math.round(dailyFixed + (maintPerKm + deprPerKm) * 150);
    ownershipExplanation = 'Для личного авто расходы на амортизацию железа, плановое ТО и страховку не списываются с отдельного заказа, а накладываются на смену. Обычно водитель на своей машине отбивает суточные расходы за первые 5–7 заказов, после чего каждый следующий заказ приносит чистую прибыль.';
  } else if (settings.ownershipType === 'loan') {
    const maintPerKm = calculateMaintenanceCostPerKm(settings);
    const dailyLoan = calculateDailyLoanShare(settings, 24);
    const loanKmApprox = dailyLoan / 180;
    
    maintenanceShareCost = maintPerKm * totalKm;
    depreciationShareCost = loanKmApprox * totalKm;
    maintenanceAndWearCost = maintenanceShareCost + depreciationShareCost;
    
    const dailyFixed = (settings.insuranceAnnualCost / 365) + settings.carWashPerShift + settings.miscPerShift;
    dailyRentOrFixedTarget = Math.round(dailyLoan + dailyFixed + maintPerKm * 150);
    ownershipExplanation = 'Для автокредита платеж банку распределяется на рабочие смены (~24 смены/мес). Водитель покрывает платеж банку, ТО и топливо за первые 7–9 заказов смены, после чего каждый следующий заказ формирует чистую прибыль.';
  } else if (settings.ownershipType === 'rent_to_own') {
    const maintPerKm = calculateMaintenanceCostPerKm(settings);
    const effectiveDailyRent = calculateEffectiveDailyRent(settings);
    const rentPerKmApprox = effectiveDailyRent / 180;
    
    maintenanceShareCost = maintPerKm * totalKm;
    depreciationShareCost = rentPerKmApprox * totalKm;
    maintenanceAndWearCost = maintenanceShareCost + depreciationShareCost;
    dailyRentOrFixedTarget = effectiveDailyRent + settings.carWashPerShift + settings.miscPerShift;
    ownershipExplanation = 'По договору аренды с выкупом суточный платеж и фонд ТО водителя закрываются в рамках смены. За первые 8–10 заказов окупаются сутки выкупа и топлива, а все последующие заказы формируют чистую прибыль.';
  } else {
    // Обычная аренда в парке
    const effectiveDailyRent = calculateEffectiveDailyRent(settings);
    const rentPerKmApprox = effectiveDailyRent / 180;
    maintenanceShareCost = 0;
    depreciationShareCost = rentPerKmApprox * totalKm;
    maintenanceAndWearCost = depreciationShareCost;
    dailyRentOrFixedTarget = effectiveDailyRent + settings.carWashPerShift + settings.miscPerShift;
    ownershipExplanation = 'Суточная аренда в парке — это фиксированная сумма за всю смену. Водитель отбивает аренду и топливо за первые 8–10 выполненных заказов. После этого вся прибыль с заказов за вычетом комиссий и бензина идет водителю в чистый плюс.';
  }

  const ordersToBreakEven = directNetProfit > 0 ? Math.ceil(dailyRentOrFixedTarget / directNetProfit) : 0;
  const breakEvenSharePercent = dailyRentOrFixedTarget > 0 ? Math.min(100, Math.round((directNetProfit / dailyRentOrFixedTarget) * 100)) : 0;

  const totalCost = directCostsTotal + maintenanceAndWearCost;
  const netProfit = grossAmount - totalCost;
  const netPerHour = netProfit / hours;
  const netPerKm = totalKm > 0 ? netProfit / totalKm : 0;

  // Вердикт формируется на основе операционной отдачи (живые деньги на руки) и окупаемости:
  let verdict: 'excellent' | 'good' | 'mediocre' | 'unprofitable' = 'good';
  let verdictText = 'Хороший заказ';
  let reason = '';

  if (directNetProfit <= 0) {
    verdict = 'unprofitable';
    verdictText = 'Убыточный заказ (Работа в минус!)';
    reason = `Прямые расходы на топливо, комиссию и налог (${Math.round(directCostsTotal)} ₽) превышают стоимость заказа. Длинная подача (${trip.pickupDistanceKm} км) или пробки съедают весь доход.`;
  } else if (directNetPerHour < 450 || directNetPerKm < 16) {
    verdict = 'mediocre';
    verdictText = 'Низкая маржинальность';
    reason = `На руки остается +${Math.round(directNetProfit)} ₽ (${Math.round(directNetPerHour)} ₽/час, ${Math.round(directNetPerKm)} ₽/км). Медленно окупает смену. Брать только как попутный или в зону высокого спроса.`;
  } else if (directNetPerHour >= 850 && directNetPerKm >= 30) {
    verdict = 'excellent';
    verdictText = 'Отличный выгодный заказ';
    reason = `Высокая отдача: +${Math.round(directNetProfit)} ₽ на руки сразу (${Math.round(directNetPerHour)} ₽/час).${surgeMultiplier > 1.15 ? ` Повышенный кэф ×${surgeMultiplier}.` : ''} Закрывает ${breakEvenSharePercent}% суточных затрат!`;
  } else {
    verdict = 'good';
    verdictText = 'Рабочий нормальный заказ';
    reason = `Приносит +${Math.round(directNetProfit)} ₽ на руки сразу (${Math.round(directNetPerHour)} ₽/час). Окупает ${breakEvenSharePercent}% суточных расходов смены.`;
  }

  const surgeBonusRub = Math.round(grossAmount - tariffBaseCalculated);

  return {
    totalKm,
    totalTimeMin,
    grossAmount,
    tariffBaseCalculated,
    waitingEarnings,
    surgeMultiplier,
    surgeBonusRub,
    surgeType: trip.surgeType,
    surgeValue: trip.surgeValue,
    aggregatorFee,
    aggregatorCommissionPercent: commissionPercent,
    parkFee,
    taxAmount,
    fuelCost,
    directCostsTotal,
    directNetProfit,
    directNetPerHour,
    directNetPerKm,
    maintenanceAndWearCost,
    maintenanceShareCost,
    depreciationShareCost,
    dailyRentOrFixedTarget,
    ordersToBreakEven,
    breakEvenSharePercent,
    ownershipExplanation,
    totalCost,
    netProfit,
    netPerHour,
    netPerKm,
    verdict,
    verdictText,
    reason,
  };
}

/**
 * Расчет точки окупаемости покупки смены
 * Показывает, при какой выручке выгоднее купить смену за фикс, чем отдавать % комиссии агрегатору.
 */
export function calculateShiftPurchaseBreakEven(
  shiftCost: number,
  commissionPercent: number
): number {
  if (commissionPercent <= 0) return 0;
  // Покупка выгоднее, если Revenue * (commissionPercent / 100) > shiftCost
  // Revenue > shiftCost / (commissionPercent / 100)
  return shiftCost / (commissionPercent / 100);
}

/**
 * Расчет экономии при переходе на метан/пропан
 */
export function calculateFuelSavingsAnnual(
  annualKm: number,
  currentConsumption: number,
  currentPrice: number,
  targetConsumption: number,
  targetPrice: number
): { currentAnnualCost: number; targetAnnualCost: number; annualSavings: number; monthlySavings: number } {
  const currentAnnualCost = (annualKm * currentConsumption * currentPrice) / 100;
  const targetAnnualCost = (annualKm * targetConsumption * targetPrice) / 100;
  const annualSavings = Math.max(0, currentAnnualCost - targetAnnualCost);
  const monthlySavings = annualSavings / 12;

  return {
    currentAnnualCost,
    targetAnnualCost,
    annualSavings,
    monthlySavings,
  };
}

export interface CarLoanCalculation {
  carPrice: number;
  downPayment: number;
  principal: number;
  annualRatePercent: number;
  termMonths: number;
  monthlyPayment: number;
  totalPayment: number;
  totalInterest: number;
  paymentPerShift: number;
  paymentPerKm: number;
  dailyPaymentCalendar: number;
}

/**
 * Расчет автокредита на автомобиль для такси
 * Показывает аннуитетный платеж, переплату банку, нагрузку на смену и на 1 км пробега
 */
export function calculateCarLoan(
  carPrice: number,
  downPayment: number,
  annualRatePercent: number,
  termMonths: number,
  workingDaysPerMonth: number = 24,
  monthlyKm: number = 4500
): CarLoanCalculation {
  const safeCarPrice = Math.max(0, carPrice || 0);
  const safeDownPayment = Math.min(safeCarPrice, Math.max(0, downPayment || 0));
  const principal = safeCarPrice - safeDownPayment;
  const safeTerm = Math.max(1, termMonths || 12);
  const safeRate = Math.max(0, annualRatePercent || 0);

  if (principal <= 0) {
    return {
      carPrice: safeCarPrice,
      downPayment: safeDownPayment,
      principal: 0,
      annualRatePercent: safeRate,
      termMonths: safeTerm,
      monthlyPayment: 0,
      totalPayment: 0,
      totalInterest: 0,
      paymentPerShift: 0,
      paymentPerKm: 0,
      dailyPaymentCalendar: 0,
    };
  }

  const monthlyRate = (safeRate / 100) / 12;
  let monthlyPayment = 0;

  if (monthlyRate === 0) {
    monthlyPayment = principal / safeTerm;
  } else {
    const factor = Math.pow(1 + monthlyRate, safeTerm);
    monthlyPayment = principal * (monthlyRate * factor) / (factor - 1);
  }

  const totalPayment = monthlyPayment * safeTerm;
  const totalInterest = Math.max(0, totalPayment - principal);
  const safeDays = Math.max(1, workingDaysPerMonth || 24);
  const safeKm = Math.max(1, monthlyKm || 4500);

  return {
    carPrice: safeCarPrice,
    downPayment: safeDownPayment,
    principal,
    annualRatePercent: safeRate,
    termMonths: safeTerm,
    monthlyPayment,
    totalPayment,
    totalInterest,
    paymentPerShift: monthlyPayment / safeDays,
    paymentPerKm: monthlyPayment / safeKm,
    dailyPaymentCalendar: monthlyPayment / 30,
  };
}

