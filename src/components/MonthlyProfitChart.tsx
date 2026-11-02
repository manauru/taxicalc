import React, { useState, useMemo } from 'react';
import { ShiftRecord } from '../types/taxi';
import { formatCurrency } from '../utils/storage';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  BarChart3,
  Coffee,
} from 'lucide-react';

interface MonthlyProfitChartProps {
  shifts: ShiftRecord[];
  onSelectShift?: (shift: ShiftRecord) => void;
}

interface DayDataPoint {
  dayNumber: number;
  dateStr: string;
  displayDate: string;
  weekdayStr: string;
  isToday: boolean;
  hasShift: boolean;
  shiftRecord?: ShiftRecord;
  netProfit: number;
  grossRevenue: number;
  shiftHours: number;
  ordersCount: number;
  fuelCost: number;
  totalExpenses: number;
  hourlyNetRate: number;
  cumulativeNetProfit: number;
  cumulativeGrossRevenue: number;
}

const MONTH_NAMES_RU = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

const WEEKDAY_NAMES_RU = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

export const MonthlyProfitChart: React.FC<MonthlyProfitChartProps> = ({
  shifts,
  onSelectShift,
}) => {
  // Определяем доступные месяцы на основе смен
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    shifts.forEach((s) => {
      if (s.date && s.date.length >= 7) {
        monthsSet.add(s.date.substring(0, 7)); // YYYY-MM
      }
    });

    // Текущий месяц всегда доступен
    const currentYearMonth = new Date().toISOString().substring(0, 7);
    monthsSet.add(currentYearMonth);

    // Сортировка по убыванию (сначала свежие)
    return Array.from(monthsSet).sort().reverse();
  }, [shifts]);

  // Выбранный месяц (YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    if (shifts.length > 0) {
      // Берем месяц последней смены
      const sorted = [...shifts].sort((a, b) => b.date.localeCompare(a.date));
      return sorted[0].date.substring(0, 7);
    }
    return new Date().toISOString().substring(0, 7);
  });

  // Режим отображения: ежедневный или накопительный
  const [chartMode, setChartMode] = useState<'daily' | 'cumulative'>('daily');
  // Фильтр дней: все дни месяца или только рабочие смены
  const [displayFilter, setDisplayFilter] = useState<'all_days' | 'working_only'>('all_days');
  // Отображать ли линию грязной выручки
  const [showGrossLine, setShowGrossLine] = useState<boolean>(true);

  // Навигация по месяцам
  const handlePrevMonth = () => {
    const [yearStr, monthStr] = selectedMonth.split('-');
    let year = parseInt(yearStr, 10);
    let month = parseInt(monthStr, 10) - 1;
    if (month < 1) {
      month = 12;
      year -= 1;
    }
    const newMonth = `${year}-${String(month).padStart(2, '0')}`;
    setSelectedMonth(newMonth);
  };

  const handleNextMonth = () => {
    const [yearStr, monthStr] = selectedMonth.split('-');
    let year = parseInt(yearStr, 10);
    let month = parseInt(monthStr, 10) + 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
    const newMonth = `${year}-${String(month).padStart(2, '0')}`;
    setSelectedMonth(newMonth);
  };

  // Построение данных по дням для выбранного месяца
  const { monthData, monthStats } = useMemo(() => {
    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10); // 1-indexed

    // Количество дней в выбранном месяце
    const daysInMonth = new Date(year, month, 0).getDate();
    const todayStr = new Date().toISOString().substring(0, 10);

    // Группировка смен текущего месяца по дате
    const shiftsByDate: Record<string, ShiftRecord[]> = {};
    shifts.forEach((s) => {
      if (s.date && s.date.startsWith(selectedMonth)) {
        if (!shiftsByDate[s.date]) {
          shiftsByDate[s.date] = [];
        }
        shiftsByDate[s.date].push(s);
      }
    });

    let runningCumulativeNet = 0;
    let runningCumulativeGross = 0;
    const allDaysData: DayDataPoint[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${selectedMonth}-${String(day).padStart(2, '0')}`;
      const dayDate = new Date(year, month - 1, day);
      const weekdayStr = WEEKDAY_NAMES_RU[dayDate.getDay()];
      const isToday = dateStr === todayStr;

      const dayShifts = shiftsByDate[dateStr] || [];
      const hasShift = dayShifts.length > 0;

      let netProfit = 0;
      let grossRevenue = 0;
      let shiftHours = 0;
      let ordersCount = 0;
      let fuelCost = 0;
      let totalExpenses = 0;

      dayShifts.forEach((s) => {
        netProfit += s.calculated?.netProfit ?? 0;
        grossRevenue += s.grossRevenue ?? s.calculated?.grossIncome ?? 0;
        shiftHours += s.shiftHours ?? 0;
        ordersCount += s.ordersCount ?? 0;
        fuelCost += s.calculated?.fuelCost ?? 0;
        totalExpenses += s.calculated?.totalExpenses ?? 0;
      });

      runningCumulativeNet += netProfit;
      runningCumulativeGross += grossRevenue;

      const hourlyNetRate = shiftHours > 0 ? netProfit / shiftHours : 0;

      allDaysData.push({
        dayNumber: day,
        dateStr,
        displayDate: `${day} ${MONTH_NAMES_RU[month - 1].substring(0, 3).toLowerCase()}`,
        weekdayStr,
        isToday,
        hasShift,
        shiftRecord: dayShifts[0], // для детального просмотра
        netProfit: Math.round(netProfit),
        grossRevenue: Math.round(grossRevenue),
        shiftHours: Math.round(shiftHours * 10) / 10,
        ordersCount,
        fuelCost: Math.round(fuelCost),
        totalExpenses: Math.round(totalExpenses),
        hourlyNetRate: Math.round(hourlyNetRate),
        cumulativeNetProfit: Math.round(runningCumulativeNet),
        cumulativeGrossRevenue: Math.round(runningCumulativeGross),
      });
    }

    // Расчет сводных показателей месяца
    const workingDays = allDaysData.filter((d) => d.hasShift);
    const totalMonthNet = workingDays.reduce((acc, d) => acc + d.netProfit, 0);
    const totalMonthGross = workingDays.reduce((acc, d) => acc + d.grossRevenue, 0);
    const totalMonthHours = workingDays.reduce((acc, d) => acc + d.shiftHours, 0);
    const totalMonthOrders = workingDays.reduce((acc, d) => acc + d.ordersCount, 0);

    const avgNetPerWorkingDay = workingDays.length > 0 ? totalMonthNet / workingDays.length : 0;
    const avgNetPerHour = totalMonthHours > 0 ? totalMonthNet / totalMonthHours : 0;

    // Лучший день по прибыли
    let bestDay: DayDataPoint | null = null;
    if (workingDays.length > 0) {
      bestDay = [...workingDays].sort((a, b) => b.netProfit - a.netProfit)[0];
    }

    const restDaysCount = daysInMonth - workingDays.length;

    return {
      monthData: allDaysData,
      monthStats: {
        totalMonthNet,
        totalMonthGross,
        totalMonthHours,
        totalMonthOrders,
        workingDaysCount: workingDays.length,
        restDaysCount,
        daysInMonth,
        avgNetPerWorkingDay: Math.round(avgNetPerWorkingDay),
        avgNetPerHour: Math.round(avgNetPerHour),
        bestDay,
      },
    };
  }, [selectedMonth, shifts]);

  // Данные для графика в зависимости от фильтра
  const chartData = useMemo(() => {
    if (displayFilter === 'working_only') {
      return monthData.filter((d) => d.hasShift);
    }
    return monthData;
  }, [monthData, displayFilter]);

  // Человекочитаемое название выбранного месяца
  const [currentYear, currentMonthNum] = selectedMonth.split('-');
  const monthTitle = `${MONTH_NAMES_RU[parseInt(currentMonthNum, 10) - 1]} ${currentYear}`;

  // Кастомный тултип для Recharts
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: DayDataPoint = payload[0].payload;
      const isPositive = data.netProfit >= 0;

      return (
        <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-3.5 shadow-2xl text-xs space-y-2 min-w-[210px] pointer-events-none">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-1.5">
            <span className="font-semibold text-white">
              {data.dayNumber} {MONTH_NAMES_RU[parseInt(currentMonthNum, 10) - 1]}, {data.weekdayStr}
            </span>
            {data.hasShift ? (
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800/60">
                Смена на линии
              </span>
            ) : (
              <span className="text-[10px] text-neutral-400 bg-neutral-800/80 px-1.5 py-0.5 rounded">
                Выходной
              </span>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-neutral-400">Чистая прибыль:</span>
              <span className={`font-mono font-bold text-sm ${
                data.hasShift
                  ? isPositive ? 'text-emerald-400' : 'text-rose-400'
                  : 'text-neutral-500'
              }`}>
                {data.hasShift ? formatCurrency(data.netProfit) : '—'}
              </span>
            </div>

            {chartMode === 'cumulative' && (
              <div className="flex justify-between items-center text-neutral-300">
                <span className="text-neutral-400">Накоплено с 1-го:</span>
                <span className="font-mono font-semibold text-emerald-300">
                  {formatCurrency(data.cumulativeNetProfit)}
                </span>
              </div>
            )}

            {data.hasShift && (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-400">Грязная выручка:</span>
                  <span className="font-mono text-cyan-300">
                    {formatCurrency(data.grossRevenue)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-neutral-400">Расходы (АЗС+ТО+комис):</span>
                  <span className="font-mono text-rose-300">
                    {formatCurrency(data.totalExpenses)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-neutral-400">Часов / Заказов:</span>
                  <span className="font-mono text-white">
                    {data.shiftHours} ч · {data.ordersCount} зак.
                  </span>
                </div>

                <div className="flex justify-between items-center pt-1 border-t border-neutral-800">
                  <span className="text-neutral-400">Доход в час:</span>
                  <span className="font-mono text-amber-400 font-bold">
                    {formatCurrency(data.hourlyNetRate)}/ч
                  </span>
                </div>

                {data.shiftRecord?.carName && (
                  <div className="pt-1 text-[11px] text-neutral-400 truncate max-w-[200px]">
                    🚗 {data.shiftRecord.carName}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Верхний блок: Выбор месяца и панель управления */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-emerald-400 font-bold">Аналитика Recharts</span>
              <span className="text-neutral-600">·</span>
              <span className="text-xs text-neutral-400">Динамика чистой прибыли по дням</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mt-1 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-emerald-400" />
              {monthTitle}
            </h2>
          </div>

          {/* Переключение месяцев и режимов */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Стрелки переключения месяца */}
            <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded-lg p-1">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors"
                title="Предыдущий месяц"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-xs font-semibold text-neutral-200 px-2 py-1 focus:outline-none cursor-pointer"
              >
                {availableMonths.map((ym) => {
                  const [y, m] = ym.split('-');
                  return (
                    <option key={ym} value={ym} className="bg-neutral-900 text-white">
                      {MONTH_NAMES_RU[parseInt(m, 10) - 1]} {y}
                    </option>
                  );
                })}
              </select>

              <button
                onClick={handleNextMonth}
                className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors"
                title="Следующий месяц"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Переключатель: Ежедневно vs Накопительно */}
            <div className="flex items-center p-1 bg-neutral-950 border border-neutral-800 rounded-lg text-xs font-semibold">
              <button
                onClick={() => setChartMode('daily')}
                className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                  chartMode === 'daily'
                    ? 'bg-emerald-500 text-neutral-950 font-bold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                По дням
              </button>
              <button
                onClick={() => setChartMode('cumulative')}
                className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                  chartMode === 'cumulative'
                    ? 'bg-emerald-500 text-neutral-950 font-bold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Накопительно
              </button>
            </div>

            {/* Фильтр: Все дни vs Только смены */}
            <div className="flex items-center p-1 bg-neutral-950 border border-neutral-800 rounded-lg text-xs font-semibold">
              <button
                onClick={() => setDisplayFilter('all_days')}
                className={`px-2.5 py-1.5 rounded-md transition-colors ${
                  displayFilter === 'all_days'
                    ? 'bg-neutral-800 text-white font-bold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Весь месяц
              </button>
              <button
                onClick={() => setDisplayFilter('working_only')}
                className={`px-2.5 py-1.5 rounded-md transition-colors ${
                  displayFilter === 'working_only'
                    ? 'bg-neutral-800 text-white font-bold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Только смены
              </button>
            </div>
          </div>
        </div>

        {/* Сводные KPI за выбранный месяц */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-5 pt-4 border-t border-neutral-800">
          <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800">
            <span className="text-[11px] text-neutral-400 block">Чистая прибыль за месяц</span>
            <span className="text-lg font-bold font-mono text-emerald-400 tabular-nums">
              {formatCurrency(monthStats.totalMonthNet)}
            </span>
            <span className="text-[10px] text-neutral-500 block">
              из {formatCurrency(monthStats.totalMonthGross)} вала
            </span>
          </div>

          <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800">
            <span className="text-[11px] text-neutral-400 block">Средняя за рабочий день</span>
            <span className="text-lg font-bold font-mono text-white tabular-nums">
              {formatCurrency(monthStats.avgNetPerWorkingDay)}
            </span>
            <span className="text-[10px] text-neutral-500 block">
              в смену на линии
            </span>
          </div>

          <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800">
            <span className="text-[11px] text-neutral-400 block">Средний доход в час</span>
            <span className="text-lg font-bold font-mono text-amber-400 tabular-nums">
              {formatCurrency(monthStats.avgNetPerHour)}/ч
            </span>
            <span className="text-[10px] text-neutral-500 block">
              {monthStats.totalMonthHours.toFixed(1)} ч на линии
            </span>
          </div>

          <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800">
            <span className="text-[11px] text-neutral-400 block">Рабочих смен / Отдых</span>
            <span className="text-lg font-bold font-mono text-cyan-400 tabular-nums">
              {monthStats.workingDaysCount} / {monthStats.restDaysCount} дн.
            </span>
            <span className="text-[10px] text-neutral-500 block">
              {monthStats.totalMonthOrders} выполненных заказов
            </span>
          </div>

          <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800">
            <span className="text-[11px] text-neutral-400 block">Рекордный день месяца</span>
            {monthStats.bestDay ? (
              <>
                <span className="text-lg font-bold font-mono text-amber-300 tabular-nums">
                  {formatCurrency(monthStats.bestDay.netProfit)}
                </span>
                <span className="text-[10px] text-neutral-500 block truncate">
                  {monthStats.bestDay.dayNumber} {MONTH_NAMES_RU[parseInt(currentMonthNum, 10) - 1].toLowerCase()} ({monthStats.bestDay.weekdayStr})
                </span>
              </>
            ) : (
              <span className="text-sm text-neutral-500">Нет смен</span>
            )}
          </div>

          <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800">
            <span className="text-[11px] text-neutral-400 block">Маржинальность смен</span>
            <span className="text-lg font-bold font-mono text-emerald-300 tabular-nums">
              {monthStats.totalMonthGross > 0
                ? `${Math.round((monthStats.totalMonthNet / monthStats.totalMonthGross) * 100)}%`
                : '0%'}
            </span>
            <span className="text-[10px] text-neutral-500 block">
              доля остатка в карман
            </span>
          </div>
        </div>
      </div>

      {/* Основной график Recharts */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-neutral-800 gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              {chartMode === 'daily'
                ? `График ежедневной чистой прибыли (${monthTitle})`
                : `График накопительной чистой прибыли (${monthTitle})`}
            </h3>
            {monthStats.workingDaysCount > 0 && (
              <span className="text-xs bg-emerald-950/70 text-emerald-400 border border-emerald-800/60 px-2 py-0.5 rounded-full font-mono">
                {monthStats.workingDaysCount} {monthStats.workingDaysCount === 1 ? 'смена' : 'смен'}
              </span>
            )}
          </div>

          {/* Чекбокс показа валовой выручки */}
          <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showGrossLine}
              onChange={(e) => setShowGrossLine(e.target.checked)}
              className="rounded bg-neutral-950 border-neutral-700 text-cyan-500 focus:ring-0 focus:ring-offset-0"
            />
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block"></span>
              Показывать грязную выручку
            </span>
          </label>
        </div>

        {/* Recharts Container */}
        <div className="mt-6 w-full h-[360px] sm:h-[400px]">
          {chartData.length === 0 || monthStats.workingDaysCount === 0 ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
              <Calendar className="w-10 h-10 text-neutral-600" />
              <div className="text-neutral-300 font-medium text-sm">
                В {monthTitle} нет сохраненных смен
              </div>
              <p className="text-xs text-neutral-500 max-w-sm">
                Выберите другой месяц со сменами в верхнем переключателе или внесите смену за этот период в «Калькуляторе смены».
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 15, right: 15, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                
                <XAxis
                  dataKey="displayDate"
                  stroke="#737373"
                  tick={{ fill: '#a3a3a3', fontSize: 11 }}
                  axisLine={{ stroke: '#404040' }}
                  tickLine={{ stroke: '#404040' }}
                  interval="preserveStartEnd"
                />

                <YAxis
                  stroke="#737373"
                  tick={{ fill: '#a3a3a3', fontSize: 11 }}
                  axisLine={{ stroke: '#404040' }}
                  tickLine={{ stroke: '#404040' }}
                  tickFormatter={(val) => {
                    if (Math.abs(val) >= 1000) {
                      return `${Math.round(val / 1000)}k ₽`;
                    }
                    return `${val} ₽`;
                  }}
                />

                <Tooltip content={<CustomTooltip />} />
                
                <Legend
                  wrapperStyle={{ paddingTop: '14px', fontSize: '12px' }}
                  iconType="circle"
                />

                {/* Базовая нулевая линия */}
                <ReferenceLine y={0} stroke="#404040" strokeWidth={1} />

                {/* Линия среднего значения для режима по дням */}
                {chartMode === 'daily' && monthStats.avgNetPerWorkingDay > 0 && (
                  <ReferenceLine
                    y={monthStats.avgNetPerWorkingDay}
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    label={{
                      value: `Ср. в смену: ${monthStats.avgNetPerWorkingDay.toLocaleString('ru-RU')} ₽`,
                      fill: '#fbbf24',
                      fontSize: 10,
                      position: 'insideTopRight',
                    }}
                  />
                )}

                {/* Линия валовой выручки (опциональная) */}
                {showGrossLine && (
                  <Line
                    type="monotone"
                    dataKey={chartMode === 'cumulative' ? 'cumulativeGrossRevenue' : 'grossRevenue'}
                    name={chartMode === 'cumulative' ? 'Накопленный вал' : 'Грязная выручка'}
                    stroke="#38bdf8"
                    strokeWidth={1.8}
                    strokeDasharray="4 4"
                    dot={{ r: 2.5, fill: '#38bdf8' }}
                    activeDot={{ r: 5, fill: '#7dd3fc' }}
                  />
                )}

                {/* Основная линия чистой прибыли */}
                <Line
                  type="monotone"
                  dataKey={chartMode === 'cumulative' ? 'cumulativeNetProfit' : 'netProfit'}
                  name={chartMode === 'cumulative' ? 'Накопленная прибыль' : 'Чистая прибыль (на руки)'}
                  stroke="#10b981"
                  strokeWidth={2.8}
                  dot={(props: any) => {
                    const { cx, cy, payload } = props;
                    if (!payload.hasShift && chartMode === 'daily') {
                      return <circle key={`dot-${payload.dayNumber}`} cx={cx} cy={cy} r={2} fill="#525252" />;
                    }
                    return (
                      <circle
                        key={`dot-${payload.dayNumber}`}
                        cx={cx}
                        cy={cy}
                        r={4}
                        fill="#10b981"
                        stroke="#059669"
                        strokeWidth={1}
                        className="cursor-pointer"
                        onClick={() => {
                          if (payload.shiftRecord && onSelectShift) {
                            onSelectShift(payload.shiftRecord);
                          }
                        }}
                      />
                    );
                  }}
                  activeDot={{
                    r: 7,
                    fill: '#34d399',
                    stroke: '#064e3b',
                    strokeWidth: 2,
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between text-xs text-neutral-400 mt-4 pt-3 border-t border-neutral-800 gap-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
              Зеленая линия — фактическая чистая прибыль за вычетом всех расходов
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
              Пунктир — среднедневная планка заработка
            </span>
          </div>

          <div className="text-[11px] text-neutral-500">
            Нажмите на точку смены на графике или в календаре ниже, чтобы открыть подробный расчет
          </div>
        </div>
      </div>

      {/* Календарная матрица / Лента дней месяца */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-amber-400" />
          Календарная лента смен за {monthTitle}
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
          {monthData.map((d) => {
            const isClickable = !!d.shiftRecord && !!onSelectShift;
            return (
              <div
                key={d.dateStr}
                onClick={() => {
                  if (isClickable && d.shiftRecord) {
                    onSelectShift(d.shiftRecord);
                  }
                }}
                className={`p-2.5 rounded-lg border transition-all text-xs flex flex-col justify-between ${
                  d.hasShift
                    ? 'bg-neutral-950 border-emerald-900/50 hover:border-emerald-500 hover:bg-neutral-800/60 cursor-pointer shadow-sm'
                    : 'bg-neutral-950/40 border-neutral-800/60 opacity-60'
                } ${d.isToday ? 'ring-1 ring-amber-500' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-mono font-bold ${d.isToday ? 'text-amber-400' : 'text-neutral-300'}`}>
                    {d.dayNumber}
                  </span>
                  <span className="text-[10px] text-neutral-500 uppercase">
                    {d.weekdayStr}
                  </span>
                </div>

                <div className="my-1.5">
                  {d.hasShift ? (
                    <div>
                      <div className="font-mono font-bold text-emerald-400 text-xs tabular-nums">
                        {formatCurrency(d.netProfit)}
                      </div>
                      <div className="text-[10px] text-neutral-400 font-mono">
                        {d.shiftHours}ч · {d.ordersCount}зак
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-neutral-600 flex items-center gap-1">
                      <Coffee className="w-3 h-3" />
                      <span>Отдых</span>
                    </div>
                  )}
                </div>

                {d.hasShift && (
                  <div className="text-[9px] text-amber-400 font-mono pt-1 border-t border-neutral-800">
                    {formatCurrency(d.hourlyNetRate)}/ч
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
