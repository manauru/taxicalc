import { 
  DailyShiftInput, 
  FuelType, 
  ShiftRecord, 
  TariffCategory, 
  TariffConfig, 
  VehicleSettings 
} from '../types/taxi';
import { calculateDailyShift } from './calculations';
import { 
  DEFAULT_FUEL_CONSUMPTIONS, 
  DEFAULT_FUEL_PRICES, 
  DEFAULT_TARIFFS, 
  INITIAL_SHIFT_INPUT, 
  INITIAL_VEHICLE_SETTINGS 
} from './constants';

const SETTINGS_KEY = 'taxicalc_vehicle_settings_v1';
const SHIFTS_KEY = 'taxicalc_shifts_history_v1';

export function loadVehicleSettings(): VehicleSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      return {
        ...INITIAL_VEHICLE_SETTINGS,
        customFuelPrices: { ...DEFAULT_FUEL_PRICES },
        customFuelConsumptions: { ...DEFAULT_FUEL_CONSUMPTIONS },
      };
    }
    const parsed = JSON.parse(raw);
    const merged: VehicleSettings = { ...INITIAL_VEHICLE_SETTINGS, ...parsed };

    // 1. Восстанавливаем полный реестр цен на все виды топлива с учетом настроек админки
    let adminFuelPrices: Partial<Record<FuelType, number>> = {};
    try {
      const adminTariffsRaw = localStorage.getItem('taxicalc_platform_tariffs_v1');
      if (adminTariffsRaw) {
        const pt = JSON.parse(adminTariffsRaw);
        if (pt) {
          if (typeof pt.gasoline92Price === 'number' && pt.gasoline92Price > 0) adminFuelPrices.gasoline_92 = pt.gasoline92Price;
          if (typeof pt.gasoline95Price === 'number' && pt.gasoline95Price > 0) adminFuelPrices.gasoline_95 = pt.gasoline95Price;
          if (typeof pt.dieselPrice === 'number' && pt.dieselPrice > 0) adminFuelPrices.diesel = pt.dieselPrice;
          if (typeof pt.propanePrice === 'number' && pt.propanePrice > 0) adminFuelPrices.propane = pt.propanePrice;
          if (typeof pt.methanePrice === 'number' && pt.methanePrice > 0) adminFuelPrices.methane = pt.methanePrice;
          if (typeof pt.electricityPrice === 'number' && pt.electricityPrice > 0) adminFuelPrices.electric = pt.electricityPrice;
        }
      }
    } catch {
      // ignore
    }

    const prices: Record<FuelType, number> = {
      ...DEFAULT_FUEL_PRICES,
      ...adminFuelPrices,
      ...(parsed.customFuelPrices || {}),
    };
    // Если была сохранена активная цена fuelPricePerUnit для fuelType, синхронизируем ее
    if (parsed.fuelType && typeof parsed.fuelPricePerUnit === 'number' && parsed.fuelPricePerUnit > 0) {
      prices[parsed.fuelType as FuelType] = parsed.fuelPricePerUnit;
    }

    // 2. Восстанавливаем полный реестр норм расхода на все виды топлива
    const consumptions: Record<FuelType, number> = {
      ...DEFAULT_FUEL_CONSUMPTIONS,
      ...(parsed.customFuelConsumptions || {}),
    };
    if (parsed.fuelType && typeof parsed.fuelConsumptionPer100Km === 'number' && parsed.fuelConsumptionPer100Km > 0) {
      consumptions[parsed.fuelType as FuelType] = parsed.fuelConsumptionPer100Km;
    }

    merged.customFuelPrices = prices;
    merged.customFuelConsumptions = consumptions;

    // 3. Активное топливо и его конкретные параметры
    const activeFuel: FuelType = (merged.fuelType in DEFAULT_FUEL_PRICES) ? merged.fuelType : 'gasoline_95';
    merged.fuelType = activeFuel;
    merged.fuelPricePerUnit = prices[activeFuel] ?? DEFAULT_FUEL_PRICES[activeFuel];
    merged.fuelConsumptionPer100Km = consumptions[activeFuel] ?? DEFAULT_FUEL_CONSUMPTIONS[activeFuel];

    // 4. Восстанавливаем настройки тарифов для Радара заказов
    const savedTariffs = parsed.tariffSettings?.tariffs || {};
    const mergedTariffs: Record<TariffCategory, TariffConfig> = {
      economy: { ...DEFAULT_TARIFFS.economy, ...(savedTariffs.economy || {}) },
      comfort: { ...DEFAULT_TARIFFS.comfort, ...(savedTariffs.comfort || {}) },
      comfort_plus: { ...DEFAULT_TARIFFS.comfort_plus, ...(savedTariffs.comfort_plus || {}) },
      business: { ...DEFAULT_TARIFFS.business, ...(savedTariffs.business || {}) },
    };

    const activeCat: TariffCategory = 
      parsed.tariffSettings?.activeCategory && parsed.tariffSettings.activeCategory in DEFAULT_TARIFFS
        ? parsed.tariffSettings.activeCategory
        : (merged.category in DEFAULT_TARIFFS ? (merged.category as TariffCategory) : 'economy');

    merged.tariffSettings = {
      activeCategory: activeCat,
      tariffs: mergedTariffs,
    };

    return merged;
  } catch (e) {
    console.error('Failed to load vehicle settings from storage', e);
    return INITIAL_VEHICLE_SETTINGS;
  }
}

export function saveVehicleSettings(settings: VehicleSettings): void {
  try {
    const fuel = settings.fuelType || 'gasoline_95';

    // Гарантируем, что для активного топлива цены и нормы обновлены в общих реестрах
    const prices: Record<FuelType, number> = {
      ...DEFAULT_FUEL_PRICES,
      ...(settings.customFuelPrices || {}),
    };
    if (typeof settings.fuelPricePerUnit === 'number' && settings.fuelPricePerUnit > 0) {
      prices[fuel] = settings.fuelPricePerUnit;
    }

    const consumptions: Record<FuelType, number> = {
      ...DEFAULT_FUEL_CONSUMPTIONS,
      ...(settings.customFuelConsumptions || {}),
    };
    if (typeof settings.fuelConsumptionPer100Km === 'number' && settings.fuelConsumptionPer100Km > 0) {
      consumptions[fuel] = settings.fuelConsumptionPer100Km;
    }

    const payload: VehicleSettings = {
      ...settings,
      fuelType: fuel,
      fuelPricePerUnit: prices[fuel],
      fuelConsumptionPer100Km: consumptions[fuel],
      customFuelPrices: prices,
      customFuelConsumptions: consumptions,
    };

    localStorage.setItem(SETTINGS_KEY, JSON.stringify(payload));
  } catch (e) {
    console.error('Failed to save vehicle settings', e);
  }
}

export function getSampleShifts(settings: VehicleSettings): ShiftRecord[] {
  const today = new Date();
  const sampleDays = [
    { offset: 0, gross: 8200, bonuses: 900, tips: 350, km: 195, paidKm: 138, hours: 10, orders: 18 },
    { offset: 1, gross: 7500, bonuses: 600, tips: 200, km: 175, paidKm: 120, hours: 9, orders: 15 },
    { offset: 2, gross: 9100, bonuses: 1200, tips: 420, km: 215, paidKm: 155, hours: 10.5, orders: 20 },
    { offset: 3, gross: 6800, bonuses: 400, tips: 180, km: 160, paidKm: 110, hours: 8, orders: 14 },
    { offset: 4, gross: 8600, bonuses: 1000, tips: 300, km: 205, paidKm: 146, hours: 10, orders: 19 },
  ];

  return sampleDays.map((d, index) => {
    const dateObj = new Date(today);
    dateObj.setDate(today.getDate() - d.offset);
    const dateStr = dateObj.toISOString().split('T')[0];

    const input: DailyShiftInput = {
      date: dateStr,
      grossRevenue: d.gross,
      bonuses: d.bonuses,
      tips: d.tips,
      totalMileageKm: d.km,
      paidMileageKm: d.paidKm,
      shiftHours: d.hours,
      ordersCount: d.orders,
      useShiftPurchase: false,
      shiftPurchaseCost: 1950,
      customFuelSpent: null,
      customExpenses: 0,
      notes: index === 0 ? 'Пятничный вечер, повышенный спрос' : '',
    };

    const calculated = calculateDailyShift(input, settings);

    return {
      ...input,
      id: `sample_shift_${Date.now() - d.offset * 86400000}_${index}`,
      createdAt: Date.now() - d.offset * 86400000,
      calculated,
      carName: settings.carName,
      driverName: 'Илья Мартынов',
      ownershipType: settings.ownershipType,
    };
  });
}

export function loadShiftsHistory(settings: VehicleSettings): ShiftRecord[] {
  try {
    const raw = localStorage.getItem(SHIFTS_KEY);
    if (!raw) {
      const samples = getSampleShifts(settings);
      saveShiftsHistory(samples);
      return samples;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed to load shifts from storage', e);
    return [];
  }
}

export function saveShiftsHistory(shifts: ShiftRecord[]): void {
  try {
    localStorage.setItem(SHIFTS_KEY, JSON.stringify(shifts));
  } catch (e) {
    console.error('Failed to save shifts', e);
  }
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDecimal(amount: number, digits = 1): string {
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount);
}
