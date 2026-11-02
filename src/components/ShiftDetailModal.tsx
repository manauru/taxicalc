import React from 'react';
import { ShiftRecord, VehicleSettings } from '../types/taxi';
import { UserProfile } from '../types/auth';
import { formatCurrency, formatDecimal } from '../utils/storage';
import { OWNERSHIP_META } from '../utils/constants';
import { X, FileText, Printer, User, Car } from 'lucide-react';

interface ShiftDetailModalProps {
  shift: ShiftRecord | null;
  onClose: () => void;
  settings: VehicleSettings;
  currentUser?: UserProfile | null;
  driverName?: string;
}

export const ShiftDetailModal: React.FC<ShiftDetailModalProps> = ({
  shift,
  onClose,
  settings,
  currentUser,
  driverName: customDriverName,
}) => {
  if (!shift) return null;

  const { calculated } = shift;
  const effectiveOwnership = shift.ownershipType || settings.ownershipType;
  const ownershipMeta = OWNERSHIP_META[effectiveOwnership] || OWNERSHIP_META.own;
  
  // Марка автомобиля и ФИО водителя
  const carName = shift.carName || settings.carName || 'Не указана';
  const driverFullName = shift.driverName || customDriverName || currentUser?.name || 'Илья Мартынов';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-800 bg-neutral-950">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-base font-bold text-white">
                Финансовый отчет смены
              </h2>
              <span className="text-xs text-neutral-400 font-mono">
                {shift.date} · {shift.shiftHours} ч · {shift.ordersCount} заказов
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt Content */}
        <div className="p-5 space-y-4 text-xs font-mono">

          {/* Водитель и Автомобиль */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-neutral-950 border border-neutral-800 rounded-xl font-sans">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-amber-400" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-neutral-400 uppercase tracking-wider block font-medium">
                  ФИО водителя
                </span>
                <span className="text-xs font-bold text-white truncate block" title={driverFullName}>
                  {driverFullName}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 border-t sm:border-t-0 sm:border-l border-neutral-800/80 pt-2.5 sm:pt-0 sm:pl-3">
              <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
                <Car className="w-4 h-4 text-sky-400" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-neutral-400 uppercase tracking-wider block font-medium">
                  Марка автомобиля
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-white truncate" title={carName}>
                    {carName}
                  </span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${ownershipMeta.badgeClass}`}>
                    {ownershipMeta.shortName}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Net Profit Big Box */}
          <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl text-center">
            <span className="text-neutral-400 text-xs block mb-1">ИТОГОВАЯ ЧИСТАЯ ПРИБЫЛЬ:</span>
            <span className="text-3xl font-extrabold text-amber-400 tabular-nums">
              {formatCurrency(calculated.netProfit)}
            </span>
            <div className="flex justify-center gap-4 text-xs text-neutral-400 mt-2 pt-2 border-t border-neutral-800/80">
              <span>{formatCurrency(calculated.hourlyNetRate)}/час</span>
              <span>·</span>
              <span>{formatDecimal(calculated.netProfitPerKm, 1)} ₽/км</span>
            </div>
          </div>

          {/* Income block */}
          <div className="space-y-1.5 pt-2">
            <div className="text-neutral-400 uppercase tracking-wider text-[11px] font-bold border-b border-neutral-800 pb-1">
              1. Доходы: {formatCurrency(calculated.grossIncome)}
            </div>
            <div className="flex justify-between text-neutral-300">
              <span>Выручка по заказам:</span>
              <span className="tabular-nums">+{formatCurrency(shift.grossRevenue)}</span>
            </div>
            {shift.bonuses > 0 && (
              <div className="flex justify-between text-neutral-300">
                <span>Бонусы и доплаты за цели:</span>
                <span className="tabular-nums">+{formatCurrency(shift.bonuses)}</span>
              </div>
            )}
            {shift.tips > 0 && (
              <div className="flex justify-between text-neutral-300">
                <span>Чаевые пассажиров:</span>
                <span className="tabular-nums">+{formatCurrency(shift.tips)}</span>
              </div>
            )}
          </div>

          {/* Deductions & Expenses block */}
          <div className="space-y-1.5 pt-2">
            <div className="text-neutral-400 uppercase tracking-wider text-[11px] font-bold border-b border-neutral-800 pb-1">
              2. Расходы и удержания: -{formatCurrency(calculated.totalExpenses)}
            </div>
            
            <div className="flex justify-between text-rose-400">
              <span>Комиссия сервиса и парка:</span>
              <span className="tabular-nums">-{formatCurrency(calculated.totalCommissions)}</span>
            </div>

            <div className="flex justify-between text-rose-400">
              <span>Налог (НПД / УСН):</span>
              <span className="tabular-nums">-{formatCurrency(calculated.taxAmount)}</span>
            </div>

            <div className="flex justify-between text-rose-400">
              <span>Топливо ({formatDecimal(calculated.fuelLiters, 1)} л/м³):</span>
              <span className="tabular-nums">-{formatCurrency(calculated.fuelCost)}</span>
            </div>

            {effectiveOwnership === 'own' ? (
              <>
                <div className="flex justify-between text-amber-300 font-semibold">
                  <span>Фонд ТО и ремонта:</span>
                  <span className="tabular-nums">-{formatCurrency(calculated.maintenanceReserve)}</span>
                </div>
                <div className="flex justify-between text-cyan-300 font-semibold">
                  <span>Амортизация автомобиля:</span>
                  <span className="tabular-nums">-{formatCurrency(calculated.depreciationCost)}</span>
                </div>
              </>
            ) : effectiveOwnership === 'loan' ? (
              <>
                <div className="flex justify-between text-sky-300 font-semibold">
                  <span>Платеж по автокредиту за смену:</span>
                  <span className="tabular-nums">-{formatCurrency(calculated.rentCost)}</span>
                </div>
                <div className="flex justify-between text-amber-300 font-semibold">
                  <span>Фонд ТО автомобиля:</span>
                  <span className="tabular-nums">-{formatCurrency(calculated.maintenanceReserve)}</span>
                </div>
              </>
            ) : effectiveOwnership === 'rent_to_own' ? (
              <>
                <div className="flex justify-between text-purple-300 font-semibold">
                  <span>Суточный взнос по выкупу:</span>
                  <span className="tabular-nums">-{formatCurrency(calculated.rentCost)}</span>
                </div>
                <div className="flex justify-between text-amber-300 font-semibold">
                  <span>Фонд ТО (за счет водителя):</span>
                  <span className="tabular-nums">-{formatCurrency(calculated.maintenanceReserve)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between text-amber-300 font-semibold">
                <span>Аренда авто за смену:</span>
                <span className="tabular-nums">-{formatCurrency(calculated.rentCost)}</span>
              </div>
            )}

            <div className="flex justify-between text-neutral-400">
              <span>Мойка, омыватель, страховка:</span>
              <span className="tabular-nums">-{formatCurrency(calculated.dailyOperatingOverhead)}</span>
            </div>
          </div>

          {/* Mileage Stats */}
          <div className="space-y-1.5 pt-2">
            <div className="text-neutral-400 uppercase tracking-wider text-[11px] font-bold border-b border-neutral-800 pb-1">
              3. Пробег и эффективность:
            </div>
            <div className="flex justify-between text-neutral-300">
              <span>Общий пробег:</span>
              <span>{shift.totalMileageKm} км</span>
            </div>
            <div className="flex justify-between text-neutral-300">
              <span>Платный пробег:</span>
              <span>{shift.paidMileageKm} км ({Math.round(calculated.efficiencyRatio)}%)</span>
            </div>
            <div className="flex justify-between text-neutral-300">
              <span>Себестоимость 1 км:</span>
              <span>{formatDecimal(calculated.costPerKm, 2)} ₽/км</span>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-950 flex justify-between items-center">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Распечатать
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded text-xs font-semibold"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
