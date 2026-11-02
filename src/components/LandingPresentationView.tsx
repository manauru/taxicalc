import React from 'react';
import { 
  Calculator, 
  Radar, 
  TrendingUp, 
  Tag, 
  History, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight, 
  LogIn, 
  UserPlus, 
  Fuel, 
  Car, 
  Percent, 
  Sparkles, 
  Clock, 
  ChevronRight, 
  Wallet, 
  HelpCircle,
  Award,
  Zap,
  Check,
  Smartphone,
  Layers
} from 'lucide-react';

interface LandingPresentationViewProps {
  onOpenAuth: (mode?: 'login' | 'register') => void;
}

export const LandingPresentationView: React.FC<LandingPresentationViewProps> = ({
  onOpenAuth,
}) => {
  return (
    <div className="space-y-12 sm:space-y-16 pb-12 animate-fade-in text-neutral-100">
      
      {/* =========================================================================
          HERO SECTION & TOP CTA BAR
         ========================================================================= */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-neutral-900 via-neutral-900/90 to-neutral-950 border border-neutral-800 p-6 sm:p-10 lg:p-14 shadow-2xl">
        {/* Glow ambient background accents */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6">
          
          {/* Top Pill / Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Профессиональная финансовая экосистема водителя такси</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight sm:leading-tight">
            Считайте реальную чистую прибыль и зарабатывайте больше на каждой смене
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base lg:text-lg text-neutral-300 max-w-2xl mx-auto leading-relaxed">
            ТаксиКальк PRO показывает, сколько денег <strong>реально остается у вас в кармане</strong> после вычета комиссий агрегатора, топлива, налога, аренды или кредита и фонда ТО.
          </p>

          {/* TOP CTA BUTTONS (Required by user: кнопки "войти" вверху страницы) */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4 max-w-md mx-auto">
            <button
              type="button"
              onClick={() => onOpenAuth('login')}
              className="w-full sm:w-auto px-7 py-3.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black rounded-xl text-sm transition-all shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer group"
            >
              <LogIn className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              <span>Войти в систему</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenAuth('register')}
              className="w-full sm:w-auto px-7 py-3.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-700 hover:border-amber-500/50 text-white font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-amber-400" />
              <span>Регистрация водителя</span>
            </button>
          </div>

          {/* Quick Trust & Compatibility strip */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-y-2 gap-x-6 text-xs text-neutral-400">
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Бесплатный старт без привязки карт</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Автосохранение всех расчетов</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Работает с Яндекс Про, Ситимобил, Максим</span>
            </span>
          </div>

        </div>
      </section>

      {/* =========================================================================
          KEY BENEFITS IN NUMBERS (Выгоды в цифрах)
         ========================================================================= */}
      <section className="space-y-4">
        <div className="text-center space-y-1.5">
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            Какую выгоду дает ТаксиКальк PRO
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 max-w-xl mx-auto">
            Точный финансовый контроль исключает скрытую работу в минус и увеличивает дневной чистый доход.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-2 relative overflow-hidden group hover:border-amber-500/40 transition-all">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-400">
              +18 500 ₽
            </div>
            <span className="text-xs font-bold text-white block">
              Экономия на расходах в месяц
            </span>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Партнерские скидки на топливо, официальное ОСАГО такси без наценок, запчасти и мойку.
            </p>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-2 relative overflow-hidden group hover:border-amber-500/40 transition-all">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-amber-400">
              +25–35%
            </div>
            <span className="text-xs font-bold text-white block">
              Прирост чистой прибыли
            </span>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Отсев невыгодных дальних подач и холостого наката с помощью встроенного Радара заказов.
            </p>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-2 relative overflow-hidden group hover:border-amber-500/40 transition-all">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-cyan-400">
              0 ₽ убытка
            </div>
            <span className="text-xs font-bold text-white block">
              Защита от кассового разрыва
            </span>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Четкий учет амортизации железа, платежа по кредиту или аренде и резерва на колодки и масло.
            </p>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-2 relative overflow-hidden group hover:border-amber-500/40 transition-all">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-purple-400">
              2 минуты
            </div>
            <span className="text-xs font-bold text-white block">
              Время на расчет смены
            </span>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Моментальный автоматический расчет после ввода пробега и кассы из таксометра.
            </p>
          </div>
        </div>
      </section>

      {/* =========================================================================
          CORE CAPABILITIES / MODULES (Возможности платформы)
         ========================================================================= */}
      <section className="space-y-6">
        <div className="text-center space-y-1.5">
          <div className="text-xs font-bold uppercase tracking-wider text-amber-400">
            Возможности сервиса
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            Инструменты для каждого этапа работы на линии
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 max-w-xl mx-auto">
            Все необходимое для водителя собрано в одном месте с понятным интерфейсом на русском языке.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          
          {/* Module 1: Shift Calculator */}
          <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-6 space-y-3.5 hover:border-amber-500/40 transition-all shadow-md group">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">Модуль 1</span>
              <h3 className="text-base font-bold text-white mt-0.5 group-hover:text-amber-300 transition-colors">
                Калькулятор смены водителя
              </h3>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed">
              Расчет чистой прибыли «на руки» в карман. Учитывает тип владения (собственное авто, автокредит, аренда парка, аренда с выкупом), вид топлива, комиссию агрегатора, процент парка, мойку и отчисления в фонд ТО.
            </p>
            <ul className="text-xs text-neutral-400 space-y-1.5 pt-2 border-t border-neutral-800/80">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Чистая часовая ставка (₽/час)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Реальная себестоимость 1 км пути</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Эффективность полезного наката (%)</span>
              </li>
            </ul>
          </div>

          {/* Module 2: Order Radar */}
          <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-6 space-y-3.5 hover:border-amber-500/40 transition-all shadow-md group">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Radar className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">Модуль 2</span>
              <h3 className="text-base font-bold text-white mt-0.5 group-hover:text-cyan-300 transition-colors">
                Радар заказов (Экспресс-оценка)
              </h3>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed">
              Моментальная оценка привлекательности заказа ДО нажатия кнопки «Принять». Помогает мгновенно понять, принесет ли поездка прибыль или сожжет топливо впустую из-за длинной подачи.
            </p>
            <ul className="text-xs text-neutral-400 space-y-1.5 pt-2 border-t border-neutral-800/80">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Учет коэффициентов повышенного спроса</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Расчет дохода с учетом подачи и ожидания</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Предупреждения о невыгодных заказах</span>
              </li>
            </ul>
          </div>

          {/* Module 3: Profit Optimizer */}
          <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-6 space-y-3.5 hover:border-amber-500/40 transition-all shadow-md group">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Модуль 3</span>
              <h3 className="text-base font-bold text-white mt-0.5 group-hover:text-emerald-300 transition-colors">
                Оптимизатор прибыли и расходов
              </h3>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed">
              Аналитический симулятор: сравнение бензина с пропаном и метаном (расчет срока окупаемости ГБО), сравнение автокредита и парковой аренды, а также 12 проверенных правил опытных водителей.
            </p>
            <ul className="text-xs text-neutral-400 space-y-1.5 pt-2 border-t border-neutral-800/80">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Сравнение Бензин / Дизель / Пропан / Метан</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Окупаемость покупки смены в агрегаторе</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Сокращение холостого пробега</span>
              </li>
            </ul>
          </div>

          {/* Module 4: Partner Marketplace & Discounts */}
          <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-6 space-y-3.5 hover:border-amber-500/40 transition-all shadow-md group">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Tag className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider">Модуль 4</span>
              <h3 className="text-base font-bold text-white mt-0.5 group-hover:text-purple-300 transition-colors">
                Спецпредложения и клубные скидки
              </h3>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed">
              Эксклюзивные предложения от партнерских сетей АЗС (Лукойл, Газпромнефть, Роснефть), страховых агрегаторов по ОСАГО для такси с лицензией, автосервисов, моек и юристов.
            </p>
            <ul className="text-xs text-neutral-400 space-y-1.5 pt-2 border-t border-neutral-800/80">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span>Топливные карты с постоплатой до 7 дней</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span>100% официальное ОСАГО без наценок</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span>Клубные промокоды с копированием в 1 клик</span>
              </li>
            </ul>
          </div>

          {/* Module 5: Shifts History & Journal */}
          <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-6 space-y-3.5 hover:border-amber-500/40 transition-all shadow-md group">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <History className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">Модуль 5</span>
              <h3 className="text-base font-bold text-white mt-0.5 group-hover:text-blue-300 transition-colors">
                Журнал смен и чеки-квитанции
              </h3>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed">
              Полный учет истории работы: сохраняйте каждую смену, открывайте детальные чеки расходов, анализируйте динамику дохода по дням и формируйте понятные отчеты для себя или таксопарка.
            </p>
            <ul className="text-xs text-neutral-400 space-y-1.5 pt-2 border-t border-neutral-800/80">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>Квитанция смены с полным списком расходов</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>Экспорт и печать финансовых отчетов</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>Автосохранение данных в личном кабинете</span>
              </li>
            </ul>
          </div>

          {/* Module 6: Driver Account & Auto-Sync */}
          <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-6 space-y-3.5 hover:border-amber-500/40 transition-all shadow-md group">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Модуль 6</span>
              <h3 className="text-base font-bold text-white mt-0.5 group-hover:text-emerald-300 transition-colors">
                Безопасность и автоматический вход
              </h3>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed">
              Один раз войдите в аккаунт — и сервис всегда будет помнить вас и ваши сохраненные настройки автомобиля. Никакого ввода пароля каждый день. Полная защита персональных данных по 152-ФЗ.
            </p>
            <ul className="text-xs text-neutral-400 space-y-1.5 pt-2 border-t border-neutral-800/80">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Автоматическое сохранение сессии</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Изолированное хранение настроек авто</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Управление активными сессиями и устройствами</span>
              </li>
            </ul>
          </div>

        </div>
      </section>

      {/* =========================================================================
          HOW IT WORKS (Как начать пользоваться за 3 шага)
         ========================================================================= */}
      <section className="bg-neutral-900/70 border border-neutral-800 rounded-3xl p-6 sm:p-10 space-y-8">
        <div className="text-center space-y-1.5 max-w-xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Быстрый старт</span>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            Как начать зарабатывать больше уже сегодня
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400">
            Всего 3 простых шага без установки тяжелых программ — работает прямо в браузере
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          
          <div className="bg-neutral-950 p-6 rounded-2xl border border-neutral-800 space-y-3 relative">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-neutral-950 font-black flex items-center justify-center text-base shadow-md">
              1
            </div>
            <h3 className="text-base font-bold text-white">
              Зарегистрируйтесь за 1 минуту
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Укажите имя, город и удобный пароль. Никаких сложных подтверждений и скрытых платежей.
            </p>
          </div>

          <div className="bg-neutral-950 p-6 rounded-2xl border border-neutral-800 space-y-3 relative">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-neutral-950 font-black flex items-center justify-center text-base shadow-md">
              2
            </div>
            <h3 className="text-base font-bold text-white">
              Настройте параметры авто
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Выберите тип топлива (бензин, газ, дизель) и формат работы: свое авто, кредит или аренда.
            </p>
          </div>

          <div className="bg-neutral-950 p-6 rounded-2xl border border-neutral-800 space-y-3 relative">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-neutral-950 font-black flex items-center justify-center text-base shadow-md">
              3
            </div>
            <h3 className="text-base font-bold text-white">
              Считайте смену и чистый плюс
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Вводите пробег и кассу после смены или оценивайте заказы в радаре перед приемом на линии.
            </p>
          </div>

        </div>
      </section>

      {/* =========================================================================
          FAQ ACCORDION / HIGHLIGHTS
         ========================================================================= */}
      <section className="space-y-4 max-w-3xl mx-auto">
        <div className="text-center space-y-1.5 pb-2">
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            Часто задаваемые вопросы водителей
          </h2>
        </div>

        <div className="space-y-3 text-xs">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-1.5">
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Нужно ли каждый раз вводить логин и пароль?</span>
            </h4>
            <p className="text-neutral-300 leading-relaxed pl-6">
              Нет! Если вы однажды вошли в систему на своем телефоне или компьютере, ваша сессия сохраняется автоматически. При повторном открытии сайта вы сразу попадаете в свой личный профиль без ввода пароля.
            </p>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-1.5">
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Почему нельзя ориентироваться только на сумму из таксометра?</span>
            </h4>
            <p className="text-neutral-300 leading-relaxed pl-6">
              Таксометр показывает общую «грязную» выручку до вычета комиссии парка, топлива, мойки, налога, амортизации машины и суточного платежа за аренду. В итоге водитель часто думает, что заработал 8 000 ₽, а реальный чистый остаток в кармане составляет лишь 1 800 ₽. ТаксиКальк PRO считает настоящие живые деньги.
            </p>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-1.5">
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Может ли другой человек увидеть мои расчеты?</span>
            </h4>
            <p className="text-neutral-300 leading-relaxed pl-6">
              Нет. Все ваши смены, журнал и персональные настройки автомобиля привязаны строго к вашему личному аккаунту и надежно изолированы.
            </p>
          </div>
        </div>
      </section>

      {/* =========================================================================
          BOTTOM CALL-TO-ACTION BAR (Required by user: кнопки "войти" снизу страницы)
         ========================================================================= */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500/20 via-neutral-900 to-neutral-900 border-2 border-amber-500/40 p-7 sm:p-10 shadow-2xl text-center space-y-6">
        <div className="max-w-2xl mx-auto space-y-3">
          <span className="text-xs uppercase tracking-wider text-amber-400 font-bold block">
            Готовы взять финансы под контроль?
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            Войдите в личный кабинет или зарегистрируйтесь бесплатно
          </h2>
          <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
            Присоединяйтесь к тысячам водителей, которые работают осознанно и не отдают заработанные деньги в скрытые расходы.
          </p>
        </div>

        {/* BOTTOM CTA BUTTONS (Required by user) */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-md mx-auto pt-1">
          <button
            type="button"
            onClick={() => onOpenAuth('login')}
            className="w-full sm:w-auto px-8 py-3.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black rounded-xl text-sm transition-all shadow-xl shadow-amber-500/30 flex items-center justify-center gap-2 cursor-pointer group"
          >
            <LogIn className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            <span>Войти в аккаунт</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenAuth('register')}
            className="w-full sm:w-auto px-8 py-3.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-700 hover:border-amber-500 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-amber-400" />
            <span>Создать аккаунт водителя</span>
          </button>
        </div>

        <div className="text-[11px] text-neutral-500 pt-2">
          Вход осуществляется автоматически при повторных визитах · Доступ с любого устройства
        </div>
      </section>

    </div>
  );
};
