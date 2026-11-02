import { FuelType, OwnershipType, VehicleSettings } from '../types/taxi';
import { getActiveUser } from './authStorage';

export interface OwnershipComparisonRecord {
  id: string;
  userId: string; // Bound to user account id
  userEmail?: string;
  title: string;
  createdAt: number;
  notes?: string;

  // Baseline variant (from Settings / «Параметры»)
  baseline: {
    carName: string;
    ownershipType: OwnershipType;
    ownershipLabel: string;
    fuelType: FuelType;
    fuelLabel: string;
    fuelConsumption: number;
    fuelPrice: number;
    costPerKm: number;
    fuelCostPerKm: number;
    maintenanceCostPerKm: number;
    depreciationCostPerKm: number;
    monthlyFixedCost: number;
    monthlyExpenses: number;
    monthlyNetProfit: number;
    dailyNetProfit: number;
    settingsSnapshot: Partial<VehicleSettings>;
  };

  // Alternative variant (configured by user)
  alternative: {
    carName: string;
    ownershipType: OwnershipType;
    ownershipLabel: string;
    fuelType: FuelType;
    fuelLabel: string;
    fuelConsumption: number;
    fuelPrice: number;
    costPerKm: number;
    fuelCostPerKm: number;
    maintenanceCostPerKm: number;
    depreciationCostPerKm: number;
    monthlyFixedCost: number;
    monthlyExpenses: number;
    monthlyNetProfit: number;
    dailyNetProfit: number;
    settingsSnapshot: Partial<VehicleSettings>;
  };

  // Simulation parameters used
  simulationParams: {
    dailyMileageKm: number;
    daysPerMonth: number;
    dailyGrossRevenue: number;
    monthlyKm: number;
    monthlyGross: number;
  };

  // Comparison conclusion
  result: {
    costPerKmDiff: number; // alternative.costPerKm - baseline.costPerKm
    monthlyNetDiff: number; // alternative.monthlyNetProfit - baseline.monthlyNetProfit
    annualNetDiff: number; // monthlyNetDiff * 12
    winner: 'baseline' | 'alternative' | 'equal';
    winnerLabel: string;
    verdict: string;
  };
}

const COMPARISONS_STORAGE_KEY = 'taxicalc_ownership_comparisons_v1';
export const EVENT_COMPARISONS_UPDATED = 'taxicalc_ownership_comparisons_updated';

function getAllStoredComparisons(): OwnershipComparisonRecord[] {
  try {
    const raw = localStorage.getItem(COMPARISONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistComparisons(records: OwnershipComparisonRecord[]): void {
  try {
    localStorage.setItem(COMPARISONS_STORAGE_KEY, JSON.stringify(records));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(EVENT_COMPARISONS_UPDATED, { detail: records }));
    }
  } catch (e) {
    console.error('Failed to save ownership comparison records:', e);
  }
}

/**
 * Get all saved comparisons for the current user account
 */
export function getSavedComparisons(targetUserId?: string): OwnershipComparisonRecord[] {
  const active = getActiveUser();
  const effectiveUserId = targetUserId || active?.id || 'guest_user';
  const effectiveEmail = active?.email?.trim().toLowerCase();

  const all = getAllStoredComparisons();
  return all
    .filter((c) => {
      if (c.userId === effectiveUserId) return true;
      if (effectiveEmail && c.userEmail && c.userEmail.trim().toLowerCase() === effectiveEmail) return true;
      // Allow viewing guest records if not logged in
      if (!active && (c.userId === 'guest_user' || !c.userId)) return true;
      return false;
    })
    .sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Save a new comparison record bound to user account
 */
export function saveComparison(
  recordData: Omit<OwnershipComparisonRecord, 'id' | 'createdAt'>
): OwnershipComparisonRecord {
  const active = getActiveUser();
  const userId = recordData.userId || active?.id || 'guest_user';
  const userEmail = recordData.userEmail || active?.email || '';

  const newRecord: OwnershipComparisonRecord = {
    ...recordData,
    id: `comp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    userId,
    userEmail,
    createdAt: Date.now(),
  };

  const all = getAllStoredComparisons();
  const updated = [newRecord, ...all].slice(0, 100); // keep up to 100 comparisons
  persistComparisons(updated);
  return newRecord;
}

/**
 * Delete a comparison record by ID
 */
export function deleteComparison(id: string, targetUserId?: string): boolean {
  const active = getActiveUser();
  const effectiveUserId = targetUserId || active?.id || 'guest_user';
  const effectiveEmail = active?.email?.trim().toLowerCase();

  const all = getAllStoredComparisons();
  const filtered = all.filter((c) => {
    if (c.id !== id) return true;
    // Check permission: only delete if belongs to user
    const belongs =
      c.userId === effectiveUserId ||
      (effectiveEmail && c.userEmail && c.userEmail.trim().toLowerCase() === effectiveEmail) ||
      (!active && (c.userId === 'guest_user' || !c.userId)) ||
      active?.role === 'admin';
    return !belongs;
  });

  if (filtered.length !== all.length) {
    persistComparisons(filtered);
    return true;
  }
  return false;
}

/**
 * Clear all comparisons for the active user
 */
export function clearUserComparisons(targetUserId?: string): void {
  const active = getActiveUser();
  const effectiveUserId = targetUserId || active?.id || 'guest_user';
  const effectiveEmail = active?.email?.trim().toLowerCase();

  const all = getAllStoredComparisons();
  const kept = all.filter((c) => {
    if (c.userId === effectiveUserId) return false;
    if (effectiveEmail && c.userEmail && c.userEmail.trim().toLowerCase() === effectiveEmail) return false;
    if (!active && (c.userId === 'guest_user' || !c.userId)) return false;
    return true;
  });

  persistComparisons(kept);
}
