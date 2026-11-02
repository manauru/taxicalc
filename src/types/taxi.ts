export type OwnershipType = 'own' | 'loan' | 'rent' | 'rent_to_own';

export type FuelType = 'gasoline_92' | 'gasoline_95' | 'diesel' | 'propane' | 'methane' | 'electric';

export type TaxType = 'self_employed_npd' | 'usn_6' | 'park_fleet' | 'none' | 'custom';

export interface MaintenanceItem {
  id: string;
  name: string;
  cost: number; // Стоимость замены/ремонта в рублях
  intervalKm: number; // Интервал в км
  description?: string;
}

export interface CityTariffPreset {
  id: string;
  name: string;
  region: string;
  description: string;
  tariffs: Record<TariffCategory, TariffConfig>;
  defaultAggregatorCommission: number;
}

export interface VehicleSettings {
  ownershipType: OwnershipType;
  carName: string;
  category: 'economy' | 'comfort' | 'comfort_plus' | 'business';
  
  // Город и регион работы (разные тарифы в разных городах)
  cityId?: string;
  cityName?: string;
  
  // Для собственного автомобиля:
  carMarketValue: number; // Текущая стоимость авто, руб.
  plannedUsageKm: number; // Планируемый пробег до продажи (например 250,000 км)
  residualValuePercent: number; // Остаточная стоимость при продаже (% от текущей, например 30%)
  maintenancePerKmOverride?: number | null; // Если задано вручную, иначе считается по статьям
  
  // Для автокредита (авто в кредит):
  loanCarPrice?: number; // Стоимость авто при покупке в кредит, руб.
  loanDownPayment?: number; // Первоначальный взнос, руб.
  loanTermMonths?: number; // Срок кредита в месяцах (например 36 или 48)
  loanAnnualRatePercent?: number; // Процентная ставка, % годовых (например 19.5%)
  loanMonthlyPayment?: number; // Ежемесячный аннуитетный платеж банку, руб./мес
  
  // Статьи ТО и расходников
  maintenanceItems: MaintenanceItem[];
  
  // Для арендованного автомобиля и аренды с выкупом:
  rentDailyCost: number; // Арендный платеж в сутки/смену, руб.
  rentScheduleDaysOn: number; // Дней работы (например 6)
  rentScheduleDaysOff: number; // Дней отдыха (например 1)
  rentDepositDaily: number; // Накопительный депозит/залог в смену, руб.
  rentChargeOnDaysOff?: boolean; // Списывается ли аренда в выходные дни (по умолчанию true)
  buyoutTermMonths?: number; // Срок договора выкупа в месяцах (например 24 или 36)
  buyoutResidualPrice?: number; // Выкупной платеж в конце срока, руб. (если предусмотрен)

  // Топливо:
  fuelType: FuelType;
  fuelConsumptionPer100Km: number; // л или м³ или кВтч на 100 км в городском цикле
  fuelPricePerUnit: number; // Цена за 1 л/м³/кВт·ч активного топлива
  customFuelPrices: Record<FuelType, number>; // Сохраненные пользователем цены для каждого типа топлива
  customFuelConsumptions: Record<FuelType, number>; // Сохраненные пользователем нормы расхода для каждого типа топлива

  // Комиссии и налоги:
  aggregatorCommissionPercent: number; // Комиссия сервиса (например 20.4%)
  parkCommissionPercent: number; // Комиссия парка (например 3.0%)
  payoutFeePercent: number; // Комиссия за вывод безнала (например 1.0%)
  payoutFixedFee: number; // Фиксированная комиссия за вывод (например 30 руб.)
  
  taxType: TaxType;
  taxPercent: number; // Налоговая ставка (например 4.3% для самозанятого)

  // Постоянные и регулярные расходы:
  insuranceAnnualCost: number; // ОСАГО такси в год, руб.
  annualEstimatedMileage: number; // Годовой пробег для раскидывания годовых трат, км
  carWashPerShift: number; // Средняя мойка за смену, руб.
  miscPerShift: number; // Омывайка, кофе, интернет, держатель, руб./смена

  // Настройки тарифов агрегатора для Радара заказов:
  tariffSettings?: TariffSettings;
}

export interface DailyShiftInput {
  date: string; // YYYY-MM-DD
  grossRevenue: number; // Грязная выручка по заказам, руб.
  bonuses: number; // Доплаты и бонусы за цели / минималки, руб.
  tips: number; // Чаевые (не облагаются комиссией сервиса), руб.
  
  totalMileageKm: number; // Общий пробег за смену, км
  paidMileageKm: number; // Платный пробег с клиентом, км
  
  shiftHours: number; // Отработано часов
  ordersCount: number; // Количество выполненных заказов
  
  tariffCategory?: TariffCategory; // Тариф смены (Эконом, Комфорт и т.д.)
  useShiftPurchase: boolean; // Водитель купил смену без комиссии сервиса?
  shiftPurchaseCost: number; // Стоимость купленной смены, руб.
  
  customFuelSpent?: number | null; // Фактически потрачено на заправку (если известно)
  customExpenses?: number; // Дополнительные расходы (штраф, шиномонтаж, платка)
  notes?: string;
}

export interface DailyShiftCalculation {
  grossIncome: number; // Всего начислено: выручка + бонусы + чаевые
  aggregatorFee: number; // Комиссия агрегатора
  aggregatorCommissionPercent?: number; // Фактический процент комиссии агрегатора (в зависимости от тарифа)
  tariffCategory?: TariffCategory; // Примененный тариф смены
  parkFee: number; // Комиссия таксопарка
  payoutFee: number; // Комиссия за вывод средств
  totalCommissions: number; // Сумма всех комиссий
  
  taxAmount: number; // Налог
  
  fuelCost: number; // Затраты на топливо
  fuelLiters: number; // Потрачено литров/м³
  
  maintenanceReserve: number; // Отчисление в фонд ТО и ремонта
  depreciationCost: number; // Амортизация / потеря стоимости машины
  rentCost: number; // Стоимость аренды за смену (если аренда / аренда с выкупом)
  loanPaymentShare?: number; // Доля платежа по автокредиту за смену (если авто в кредит)
  shiftInsuranceShare?: number; // Доля ОСАГО такси за смену по километражу
  
  dailyOperatingOverhead: number; // Мойка, омывайка, страховка, доп. расходы
  totalExpenses: number; // Все расходы водителя
  
  netProfit: number; // Чистая прибыль на руки (в карман)
  
  // Метрики эффективности
  hourlyNetRate: number; // Чистая прибыль в час
  hourlyGrossRate: number; // Грязная выручка в час
  netProfitPerKm: number; // Чистая прибыль на 1 км общего пробега
  costPerKm: number; // Полная реальная себестоимость 1 км
  grossPerKm: number; // Выручка на 1 км общего пробега
  efficiencyRatio: number; // % полезного (платного) пробега
  averageOrderCheck: number; // Средний чек заказа
  averageOrderNet: number; // Средняя чистая прибыль с заказа
  averageOrderTimeMinutes: number; // Среднее время на 1 заказ в минутах
}

export type TariffCategory = 'economy' | 'comfort' | 'comfort_plus' | 'business';

export interface TariffConfig {
  basePrice: number; // Стоимость подачи (посадка / минималка), руб.
  pricePerKm: number; // Стоимость 1 км в поездке, руб/км
  pricePerMinute: number; // Стоимость 1 минуты в поездке, руб/мин
  paidWaitingPricePerMinute: number; // Стоимость платного ожидания, руб/мин
  includedKm: number; // Включено км пути в стоимость подачи (например 1.0 км)
  includedMinutes: number; // Включено минут пути в стоимость подачи (например 1.5 мин)
  freeWaitingMinutes: number; // Бесплатное ожидание клиента (например 2 мин)
  aggregatorCommissionPercent: number; // Комиссия агрегатора для данного тарифа, % (например 16.8% в Экономе, 18.5% в Комфорте)
}

export interface TariffSettings {
  activeCategory: TariffCategory;
  cityId?: string;
  cityName?: string;
  tariffs: Record<TariffCategory, TariffConfig>;
}

export type SurgeType = 'multiplier' | 'fixed';

export interface ShiftRecord extends DailyShiftInput {
  id: string;
  createdAt: number;
  calculated: DailyShiftCalculation;
  carName?: string;
  driverName?: string;
  ownershipType?: OwnershipType;
}

export interface TripOrderInput {
  fareAmount: number; // Итоговая стоимость заказа в рублях (с учетом кэфа или введенная вручную)
  pickupDistanceKm: number; // Подача, км
  pickupTimeMin: number; // Подача, минут
  tripDistanceKm: number; // Поездка, км
  tripTimeMin: number; // Поездка, минут
  waitingTotalMin?: number; // Общее время ожидания клиента, минут
  paidWaitingMin?: number; // Платное ожидание пассажира, минут
  surgeType?: SurgeType; // Тип повышенного спроса: 'multiplier' (множитель х1.8) или 'fixed' (сумма +150 ₽)
  surgeValue?: number; // Значение спроса (1.8 для множителя или 150 для суммы)
}

export interface TripOrderEvaluation {
  totalKm: number;
  totalTimeMin: number;
  grossAmount: number;
  tariffBaseCalculated: number; // Базовая расчетная стоимость поездки по тарифу (без кэфа)
  waitingEarnings: number; // Сумма за платное ожидание
  surgeMultiplier: number; // Коэффициент спроса (кэф, например 1.8)
  surgeBonusRub: number; // Надбавка повышенного спроса в рублях (например +150 ₽)
  surgeType?: SurgeType; // Примененный тип кэфа
  surgeValue?: number; // Примененное значение
  aggregatorFee: number;
  aggregatorCommissionPercent: number; // Процент комиссии агрегатора с учетом тарифа
  parkFee: number;
  taxAmount: number;
  fuelCost: number;

  // Прямые переменные расходы на выполнение заказа:
  directCostsTotal: number; // Комиссии + налог + топливо
  directNetProfit: number; // Деньги на руки сразу с заказа (grossAmount - directCostsTotal)
  directNetPerHour: number; // Операционная часовая ставка на руки
  directNetPerKm: number; // Операционный заработок на 1 км на руки

  // Выделенный подблок сменных/постоянных расходов владения:
  maintenanceAndWearCost: number; // Суммарная условная нагрузка (ТО + амортизация/аренда)
  maintenanceShareCost: number; // Условная доля ТО и расходников
  depreciationShareCost: number; // Условная доля амортизации железа или аренды/выкупа
  dailyRentOrFixedTarget: number; // Суточные расходы смены (аренда/выкуп + мойка + ОСАГО)
  ordersToBreakEven: number; // Сколько таких заказов окупают суточные расходы смены
  breakEvenSharePercent: number; // Процент суточных расходов, который закрывает данный заказ
  ownershipExplanation: string; // Понятное пояснение для водителя

  totalCost: number;
  netProfit: number;
  netPerHour: number;
  netPerKm: number;
  verdict: 'excellent' | 'good' | 'mediocre' | 'unprofitable';
  verdictText: string;
  reason: string;
}
