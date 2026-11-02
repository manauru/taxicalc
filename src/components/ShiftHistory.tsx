import React, { useState } from 'react';
import { ShiftRecord } from '../types/taxi';
import { formatCurrency, formatDecimal } from '../utils/storage';
import { MonthlyProfitChart } from './MonthlyProfitChart';
import { 
  History, 
  Calendar, 
  Clock, 
  Milestone, 
  Download, 
  Trash2, 
  ArrowUpRight, 
  DollarSign, 
  PiggyBank, 
  FileText,
  Filter,
  TrendingUp,
  LineChart as LineChartIcon
} from 'lucide-react';

interface ShiftHistoryProps {
  shifts: ShiftRecord[];
  onDeleteShift: (id: string) => void;
  onClearAll: () => void;
  onSelectShift: (shift: ShiftRecord) => void;
}

export const ShiftHistory: React.FC<ShiftHistoryProps> = ({
  shifts,
  onDeleteShift,
  onClearAll,
  onSelectShift,
}) => {
  const [activeTab, setActiveTab] = useState<'records' | 'monthly_chart'>('records');
  const [filterPeriod, setFilterPeriod] = useState<'all' | '7days' | '30days'>('all');

  // Фильтрация по дате
  const filteredShifts = shifts.filter((s) => {
    if (filterPeriod === 'all') return true;
    const shiftDate = new Date(s.date).getTime();
    const now = Date.now();
    const daysDiff = (now - shiftDate) / (1000 * 3600 * 24);
    if (filterPeriod === '7days') return daysDiff <= 7;
    if (filterPeriod === '30days') return daysDiff <= 30;
    return true;
  });

  // Агрегированные показатели
  const totalNet = filteredShifts.reduce((acc, s) => acc + s.calculated.netProfit, 0);
  const totalGross = filteredShifts.reduce((acc, s) => acc + s.calculated.grossIncome, 0);
  const totalHours = filteredShifts.reduce((acc, s) => acc + s.shiftHours, 0);
  const totalKm = filteredShifts.reduce((acc, s) => acc + s.totalMileageKm, 0);
  const totalFuelCost = filteredShifts.reduce((acc, s) => acc + s.calculated.fuelCost, 0);
  const totalMaintenance = filteredShifts.reduce(
    (acc, s) => acc + (s.calculated.maintenanceReserve + s.calculated.depreciationCost),
    0
  );
  const totalOrders = filteredShifts.reduce((acc, s) => acc + s.ordersCount, 0);

  const avgNetPerHour = totalHours > 0 ? totalNet / totalHours : 0;
  const avgShiftProfit = filteredShifts.length > 0 ? totalNet / filteredShifts.length : 0;

  // Экспорт в CSV
  const handleExportCSV = () => {
    if (filteredShifts.length === 0) return;

    const headers = [
      'Дата',
      'Выручка_Грязная_руб',
      'Бонусы_руб',
      'Чаевые_руб',
      'Чистая_Прибыль_руб',
      'Часы',
      'Заказов',
      'Пробег_Общий_км',
      'Пробег_Платный_км',
      'Топливо_руб',
      'Комиссии_руб',
      'Налог_руб',
      'Фонд_ТО_руб',
      'Доход_в_час_руб',
    ];

    const rows = filteredShifts.map((s) => [
      s.date,
      s.grossRevenue,
      s.bonuses,
      s.tips,
      Math.round(s.calculated.netProfit),
      s.shiftHours,
      s.ordersCount,
      s.totalMileageKm,
      s.paidMileageKm,
      Math.round(s.calculated.fuelCost),
      Math.round(s.calculated.totalCommissions),
      Math.round(s.calculated.taxAmount),
      Math.round(s.calculated.maintenanceReserve + s.calculated.depreciationCost),
      Math.round(s.calculated.hourlyNetRate),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `taxicalc_shifts_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Вкладки раздела "Журнал смен" */}
      <div className="flex items-center gap-2 p-1 bg-neutral-900 border border-neutral-800 rounded-xl">
        <button
          onClick={() => setActiveTab('records')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
            activeTab === 'records'
              ? 'bg-amber-500 text-neutral-950 font-bold shadow-md'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Таблица смен</span>
          <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-mono ${
            activeTab === 'records' ? 'bg-neutral-950/20 text-neutral-900' : 'bg-neutral-800 text-neutral-400'
          }`}>
            {shifts.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('monthly_chart')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
            activeTab === 'monthly_chart'
              ? 'bg-emerald-500 text-neutral-950 font-bold shadow-md'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>График чистой прибыли за месяц</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
            activeTab === 'monthly_chart' ? 'bg-emerald-950/30 text-neutral-950 font-bold' : 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
          }`}>
            Recharts
          </span>
        </button>
      </div>

      {/* Отображение выбранной вкладки */}
      {activeTab === 'monthly_chart' ? (
        <MonthlyProfitChart shifts={shifts} onSelectShift={onSelectShift} />
      ) : (
        <>
          {/* Top Header & Filter Controls */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wider text-amber-500 font-bold">Архив и статистика</span>
                  <span className="text-neutral-600">·</span>
                  <span className="text-xs text-neutral-400">История смен и финансовые итоги</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-white mt-1">
                  Журнал смен водителя
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Period Segmented Filter */}
                <div className="flex items-center p-1 bg-neutral-950 border border-neutral-800 rounded-lg">
                  <button
                    onClick={() => setFilterPeriod('all')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                      filterPeriod === 'all'
                        ? 'bg-amber-500 text-neutral-950 font-bold'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Все смены
                  </button>
                  <button
                    onClick={() => setFilterPeriod('30days')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                      filterPeriod === '30days'
                        ? 'bg-amber-500 text-neutral-950 font-bold'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    30 дней
                  </button>
                  <button
                    onClick={() => setFilterPeriod('7days')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                      filterPeriod === '7days'
                        ? 'bg-amber-500 text-neutral-950 font-bold'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    7 дней
                  </button>
                </div>

                {/* Export button */}
                <button
                  onClick={handleExportCSV}
                  disabled={filteredShifts.length === 0}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-neutral-200 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 rounded-lg transition-colors disabled:opacity-50"
                  title="Экспорт в Excel / CSV"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>Экспорт CSV</span>
                </button>
              </div>
            </div>

        {/* Aggregated KPI Cards Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-5 pt-4 border-t border-neutral-800">
          <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800">
            <span className="text-[11px] text-neutral-400 block">Чистая прибыль</span>
            <span className="text-lg font-bold font-mono text-emerald-400 tabular-nums">
              {formatCurrency(totalNet)}
            </span>
            <span className="text-[10px] text-neutral-500 block">
              из {formatCurrency(totalGross)}
            </span>
          </div>

          <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800">
            <span className="text-[11px] text-neutral-400 block">Средний доход в час</span>
            <span className="text-lg font-bold font-mono text-amber-400 tabular-nums">
              {formatCurrency(avgNetPerHour)}/ч
            </span>
            <span className="text-[10px] text-neutral-500 block">
              Всего {totalHours.toFixed(1)} ч
            </span>
          </div>

          <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800">
            <span className="text-[11px] text-neutral-400 block">Средняя с за смену</span>
            <span className="text-lg font-bold font-mono text-white tabular-nums">
              {formatCurrency(avgShiftProfit)}
            </span>
            <span className="text-[10px] text-neutral-500 block">
              Смен: {filteredShifts.length}
            </span>
          </div>

          <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800">
            <span className="text-[11px] text-neutral-400 block">Накатано километров</span>
            <span className="text-lg font-bold font-mono text-cyan-400 tabular-nums">
              {totalKm.toLocaleString('ru-RU')} км
            </span>
            <span className="text-[10px] text-neutral-500 block">
              {totalOrders} заказов
            </span>
          </div>

          <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800">
            <span className="text-[11px] text-neutral-400 block">Потрачено на бензин</span>
            <span className="text-lg font-bold font-mono text-rose-400 tabular-nums">
              {formatCurrency(totalFuelCost)}
            </span>
            <span className="text-[10px] text-neutral-500 block">
              АЗС / Заправки
            </span>
          </div>

          <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800">
            <span className="text-[11px] text-neutral-400 block">Накоплено в фонд ТО</span>
            <span className="text-lg font-bold font-mono text-amber-300 tabular-nums">
              {formatCurrency(totalMaintenance)}
            </span>
            <span className="text-[10px] text-neutral-500 block">
              Копилка на сервис
            </span>
          </div>
        </div>
      </div>

      {/* Shifts List or Empty State */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-neutral-800 flex justify-between items-center">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <History className="w-4 h-4 text-amber-400" />
            Список записей ({filteredShifts.length})
          </h2>

          {filteredShifts.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm('Вы действительно хотите удалить все записи из журнала?')) {
                  onClearAll();
                }
              }}
              className="text-xs text-neutral-500 hover:text-rose-400 flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Очистить журнал
            </button>
          )}
        </div>

        {filteredShifts.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <History className="w-10 h-10 text-neutral-600 mx-auto" />
            <h3 className="text-base font-medium text-white">Журнал смен пуст</h3>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto">
              Заполните параметры текущей смены во вкладке «Калькулятор смены» и нажмите «Сохранить смену в журнал».
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-950/70 border-b border-neutral-800 text-neutral-400">
                <tr>
                  <th className="py-3 px-4 font-medium">Дата смены</th>
                  <th className="py-3 px-4 font-medium">Выручка (Грязная)</th>
                  <th className="py-3 px-4 font-medium">Чистая прибыль</th>
                  <th className="py-3 px-4 font-medium">Ставка в час</th>
                  <th className="py-3 px-4 font-medium">Пробег / Заказы</th>
                  <th className="py-3 px-4 font-medium">Топливо</th>
                  <th className="py-3 px-4 font-medium">Отложено на ТО</th>
                  <th className="py-3 px-4 font-medium text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {filteredShifts.map((shift) => {
                  const isProfit = shift.calculated.netProfit >= 0;
                  return (
                    <tr
                      key={shift.id}
                      className="hover:bg-neutral-800/40 transition-colors cursor-pointer"
                      onClick={() => onSelectShift(shift)}
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-mono text-white font-semibold">
                          {shift.date}
                        </div>
                        {shift.carName && (
                          <span className="text-[10px] text-amber-400/90 block truncate max-w-[140px]">
                            {shift.carName}
                          </span>
                        )}
                        {shift.notes && (
                          <span className="text-[10px] text-neutral-500 block truncate max-w-[140px]">
                            {shift.notes}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono tabular-nums text-neutral-300">
                        {formatCurrency(shift.calculated.grossIncome)}
                        {shift.bonuses > 0 && (
                          <span className="text-[10px] text-amber-500 block">+{shift.bonuses} ₽ бонус</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`font-mono tabular-nums font-bold text-sm ${
                          isProfit ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {formatCurrency(shift.calculated.netProfit)}
                        </span>
                        <span className="text-[10px] text-neutral-500 block">
                          {Math.round((shift.calculated.netProfit / (shift.calculated.grossIncome || 1)) * 100)}% от вала
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-mono text-amber-400 font-semibold tabular-nums">
                          {formatCurrency(shift.calculated.hourlyNetRate)}/ч
                        </span>
                        <span className="text-[10px] text-neutral-500 block">
                          {shift.shiftHours} ч на линии
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono tabular-nums text-neutral-300">
                        <div>{shift.totalMileageKm} км ({shift.paidMileageKm} с пасс.)</div>
                        <span className="text-[10px] text-neutral-500 block">
                          {shift.ordersCount} заказов
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono tabular-nums text-neutral-300">
                        {formatCurrency(shift.calculated.fuelCost)}
                      </td>

                      <td className="py-3.5 px-4 font-mono tabular-nums text-amber-300">
                        {formatCurrency(shift.calculated.maintenanceReserve + shift.calculated.depreciationCost)}
                      </td>

                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onDeleteShift(shift.id)}
                          className="p-1.5 text-neutral-500 hover:text-rose-400 rounded hover:bg-neutral-800 transition-colors"
                          title="Удалить смену"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
        </>
      )}

    </div>
  );
};
