// Storage and synchronization for platform tariffs and fuel price benchmarks
import { FuelType, TariffCategory, TariffConfig, VehicleSettings } from '../types/taxi';
import { DEFAULT_FUEL_PRICES, DEFAULT_TARIFFS } from './constants';
import { saveVehicleSettings } from './storage';

export interface PlatformTariffSettings {
  economyAggregatorPercent: number;
  comfortAggregatorPercent: number;
  comfortPlusAggregatorPercent: number;
  businessAggregatorPercent: number;
  parkCommissionPercent: number;
  gasoline92Price: number;
  gasoline95Price: number;
  gasoline98Price: number;
  dieselPrice: number;
  propanePrice: number;
  methanePrice: number;
  electricityPrice: number;
  updatedAt?: number;
}

export const DEFAULT_PLATFORM_TARIFFS: PlatformTariffSettings = {
  economyAggregatorPercent: 21.4,
  comfortAggregatorPercent: 22.0,
  comfortPlusAggregatorPercent: 23.5,
  businessAggregatorPercent: 26.0,
  parkCommissionPercent: 3.5,
  gasoline92Price: 53.8,
  gasoline95Price: 58.9,
  gasoline98Price: 72.0,
  dieselPrice: 66.5,
  propanePrice: 28.5,
  methanePrice: 23.9,
  electricityPrice: 12.0,
};

export const PLATFORM_TARIFFS_STORAGE_KEY = 'taxicalc_platform_tariffs_v1';
export const EVENT_TARIFFS_UPDATED = 'taxicalc_tariffs_updated';

export function getPlatformTariffs(currentSettings?: VehicleSettings): PlatformTariffSettings {
  try {
    const raw = localStorage.getItem(PLATFORM_TARIFFS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          ...DEFAULT_PLATFORM_TARIFFS,
          ...parsed,
        };
      }
    }
  } catch (e) {
    console.error('Failed to read platform tariffs from localStorage', e);
  }

  // Fallback / Initial seed from active settings if available
  if (currentSettings) {
    const prices = currentSettings.customFuelPrices || DEFAULT_FUEL_PRICES;
    const tariffs = currentSettings.tariffSettings?.tariffs;
    return {
      economyAggregatorPercent: tariffs?.economy?.aggregatorCommissionPercent ?? 21.4,
      comfortAggregatorPercent: tariffs?.comfort?.aggregatorCommissionPercent ?? 22.0,
      comfortPlusAggregatorPercent: tariffs?.comfort_plus?.aggregatorCommissionPercent ?? 23.5,
      businessAggregatorPercent: tariffs?.business?.aggregatorCommissionPercent ?? 26.0,
      parkCommissionPercent: currentSettings.parkCommissionPercent ?? 3.5,
      gasoline92Price: prices.gasoline_92 ?? DEFAULT_FUEL_PRICES.gasoline_92,
      gasoline95Price: prices.gasoline_95 ?? DEFAULT_FUEL_PRICES.gasoline_95,
      gasoline98Price: 72.0,
      dieselPrice: prices.diesel ?? DEFAULT_FUEL_PRICES.diesel,
      propanePrice: prices.propane ?? DEFAULT_FUEL_PRICES.propane,
      methanePrice: prices.methane ?? DEFAULT_FUEL_PRICES.methane,
      electricityPrice: prices.electric ?? DEFAULT_FUEL_PRICES.electric,
    };
  }

  return { ...DEFAULT_PLATFORM_TARIFFS };
}

export function savePlatformTariffs(
  tariffs: PlatformTariffSettings,
  currentSettings?: VehicleSettings,
  onUpdateSettings?: (s: VehicleSettings) => void
): { success: boolean; updatedSettings?: VehicleSettings } {
  try {
    const payload: PlatformTariffSettings = {
      ...tariffs,
      updatedAt: Date.now(),
    };
    localStorage.setItem(PLATFORM_TARIFFS_STORAGE_KEY, JSON.stringify(payload));

    let updatedVehicleSettings: VehicleSettings | undefined;

    if (currentSettings) {
      const fuelMap: Record<FuelType, number> = {
        ...currentSettings.customFuelPrices,
        gasoline_92: tariffs.gasoline92Price,
        gasoline_95: tariffs.gasoline95Price,
        diesel: tariffs.dieselPrice,
        propane: tariffs.propanePrice,
        methane: tariffs.methanePrice,
        electric: tariffs.electricityPrice,
      };

      const updatedTariffs: Record<TariffCategory, TariffConfig> = {
        economy: {
          ...(currentSettings.tariffSettings?.tariffs?.economy || DEFAULT_TARIFFS.economy),
          aggregatorCommissionPercent: tariffs.economyAggregatorPercent,
        },
        comfort: {
          ...(currentSettings.tariffSettings?.tariffs?.comfort || DEFAULT_TARIFFS.comfort),
          aggregatorCommissionPercent: tariffs.comfortAggregatorPercent,
        },
        comfort_plus: {
          ...(currentSettings.tariffSettings?.tariffs?.comfort_plus || DEFAULT_TARIFFS.comfort_plus),
          aggregatorCommissionPercent: tariffs.comfortPlusAggregatorPercent,
        },
        business: {
          ...(currentSettings.tariffSettings?.tariffs?.business || DEFAULT_TARIFFS.business),
          aggregatorCommissionPercent: tariffs.businessAggregatorPercent,
        },
      };

      updatedVehicleSettings = {
        ...currentSettings,
        parkCommissionPercent: tariffs.parkCommissionPercent,
        customFuelPrices: fuelMap,
        fuelPricePerUnit: fuelMap[currentSettings.fuelType] ?? currentSettings.fuelPricePerUnit,
        aggregatorCommissionPercent: updatedTariffs[currentSettings.category]?.aggregatorCommissionPercent ?? currentSettings.aggregatorCommissionPercent,
        tariffSettings: {
          activeCategory: currentSettings.tariffSettings?.activeCategory || currentSettings.category || 'economy',
          cityName: currentSettings.tariffSettings?.cityName || 'Москва и регионы',
          cityId: currentSettings.tariffSettings?.cityId || 'moscow',
          tariffs: updatedTariffs,
        },
      };

      saveVehicleSettings(updatedVehicleSettings);
      if (onUpdateSettings) {
        onUpdateSettings(updatedVehicleSettings);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(EVENT_TARIFFS_UPDATED, { detail: payload }));
      window.dispatchEvent(new Event('storage'));
    }

    return { success: true, updatedSettings: updatedVehicleSettings };
  } catch (e) {
    console.error('Failed to save platform tariffs', e);
    return { success: false };
  }
}

export function resetPlatformTariffsToDefault(
  currentSettings?: VehicleSettings,
  onUpdateSettings?: (s: VehicleSettings) => void
): PlatformTariffSettings {
  savePlatformTariffs(DEFAULT_PLATFORM_TARIFFS, currentSettings, onUpdateSettings);
  return { ...DEFAULT_PLATFORM_TARIFFS, updatedAt: Date.now() };
}
