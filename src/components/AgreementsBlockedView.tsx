import React, { useState } from 'react';
import { UserProfile } from '../types/auth';
import { 
  ShieldAlert, 
  Lock, 
  FileText, 
  CheckCircle2, 
  User, 
  LogOut, 
  ChevronRight, 
  AlertTriangle,
  XCircle,
  HelpCircle
} from 'lucide-react';

interface AgreementsBlockedViewProps {
  currentUser: UserProfile;
  onAcceptAll: () => void;
  onGoToAccount: () => void;
  onLogout: () => void;
}

export const AgreementsBlockedView: React.FC<AgreementsBlockedViewProps> = ({
  currentUser,
  onAcceptAll,
  onGoToAccount,
  onLogout,
}) => {
  const [viewingDoc, setViewingDoc] = useState<'terms' | 'privacy' | null>(null);

  const agr = currentUser.agreements || {
    termsOfService: false,
    privacyPolicy: false,
    dataProcessing: false,
    analyticsCookies: true,
  };

  const isTermsRevoked = !agr.termsOfService;
  const isPrivacyRevoked = !agr.privacyPolicy;
  const isDataRevoked = !agr.dataProcessing;

  return (
    <div className="max-w-3xl mx-auto py-8 sm:py-12 px-4 space-y-6 animate-fade-in">
      
      {/* Blocked Status Card */}
      <div className="bg-neutral-900 border-2 border-rose-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        
        {/* Subtle accent backdrop */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-rose-600/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-rose-950/80 border border-rose-700/80 flex items-center justify-center shrink-0 shadow-lg text-rose-400">
            <ShieldAlert className="w-9 h-9" />
          </div>

          <div className="space-y-2 flex-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-950 text-rose-400 border border-rose-800">
              <Lock className="w-3.5 h-3.5" />
              Доступ ограничен
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Функции приложения заблокированы
            </h1>

            <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed max-w-xl">
              Вы отозвали обязательные согласия или соглашения. В соответствии с правилами сервиса и законодательством РФ, расчет смен, радар заказов, параметры автомобиля и аналитика прибыли недоступны без активного согласия с условиями использования и обработкой данных.
            </p>
          </div>
        </div>

        {/* Detailed Status of Consents */}
        <div className="mt-6 pt-6 border-t border-neutral-800/80 space-y-3">
          <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
            Статус обязательных соглашений:
          </h2>

          <div className="grid grid-cols-1 gap-2.5 text-xs">
            
            {/* Agreement 1: Terms */}
            <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
              isTermsRevoked 
                ? 'bg-rose-950/40 border-rose-800/60 text-rose-200' 
                : 'bg-neutral-950 border-neutral-800 text-neutral-300'
            }`}>
              <div className="flex items-center gap-3">
                {isTermsRevoked ? (
                  <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                )}
                <div>
                  <span className="font-semibold text-white block">
                    Пользовательское соглашение
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    {isTermsRevoked ? 'Статус: Отозвано водителем' : 'Статус: Принято'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewingDoc('terms')}
                className="px-2.5 py-1 text-[11px] font-semibold text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded-lg transition-colors flex items-center gap-1 shrink-0"
              >
                <span>Читать</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {/* Agreement 2: Data processing */}
            <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
              isDataRevoked 
                ? 'bg-rose-950/40 border-rose-800/60 text-rose-200' 
                : 'bg-neutral-950 border-neutral-800 text-neutral-300'
            }`}>
              <div className="flex items-center gap-3">
                {isDataRevoked ? (
                  <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                )}
                <div>
                  <span className="font-semibold text-white block">
                    Согласие на обработку персональных данных (ФЗ-152)
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    {isDataRevoked ? 'Статус: Отозвано водителем' : 'Статус: Принято'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewingDoc('privacy')}
                className="px-2.5 py-1 text-[11px] font-semibold text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded-lg transition-colors flex items-center gap-1 shrink-0"
              >
                <span>Читать</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {/* Agreement 3: Privacy Policy */}
            <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
              isPrivacyRevoked 
                ? 'bg-rose-950/40 border-rose-800/60 text-rose-200' 
                : 'bg-neutral-950 border-neutral-800 text-neutral-300'
            }`}>
              <div className="flex items-center gap-3">
                {isPrivacyRevoked ? (
                  <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                )}
                <div>
                  <span className="font-semibold text-white block">
                    Политика локального хранения и конфиденциальности
                  </span>
                  <span className="text-[11px] text-neutral-400">
                    {isPrivacyRevoked ? 'Статус: Отозвано водителем' : 'Статус: Принято'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewingDoc('privacy')}
                className="px-2.5 py-1 text-[11px] font-semibold text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded-lg transition-colors flex items-center gap-1 shrink-0"
              >
                <span>Читать</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="mt-6 pt-6 border-t border-neutral-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onAcceptAll}
            className="w-full sm:w-auto px-6 py-3 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-xl hover:scale-[1.01]"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Принять соглашения и восстановить доступ</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onGoToAccount}
              className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold rounded-xl text-xs transition-colors flex items-center gap-1.5"
            >
              <User className="w-3.5 h-3.5 text-neutral-400" />
              <span>Перейти в Аккаунт</span>
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="px-4 py-2.5 bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-rose-400 font-semibold rounded-xl text-xs transition-colors flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Выйти</span>
            </button>
          </div>
        </div>

      </div>

      {/* Helper FAQ Notice */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-xs text-neutral-400 flex items-start gap-3">
        <HelpCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-semibold text-white block">
            Почему доступ блокируется при отзыве согласий?
          </span>
          <p className="text-[11px] text-neutral-400 leading-relaxed">
            Калькулятор смен и Радар заказов производят непрерывную обработку ваших рабочих данных (пробег, выручка, марка автомобиля, расход топлива) и сохраняют их в памяти устройства. Без подтверждения Пользовательского соглашения и согласия на обработку данных сервис юридически не имеет права обрабатывать и хранить эти расчеты.
          </p>
        </div>
      </div>

      {/* Modal for viewing legal text */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div 
            className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-5 border-b border-neutral-800 bg-neutral-950 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-base font-bold text-white">
                    {viewingDoc === 'terms' ? 'Пользовательское соглашение' : 'Политика конфиденциальности'}
                  </h3>
                  <span className="text-[11px] text-neutral-400">ТаксиКальк PRO · Текст документа</span>
                </div>
              </div>
              <button
                onClick={() => setViewingDoc(null)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs text-neutral-300 leading-relaxed font-sans">
              {viewingDoc === 'terms' ? (
                <>
                  <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 text-[11px] text-neutral-400">
                    Настоящее Пользовательское соглашение регулирует отношения между пользователем (водителем такси / перевозчиком) и сервисом ТаксиКальк PRO по использованию расчетно-аналитического программного обеспечения.
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-white text-sm">1. Предмет соглашения</h4>
                    <p>
                      1.1. ТаксиКальк PRO предоставляет водителю доступ к инструментам персонального оперативного расчета себестоимости 1 км пути, учета смен, оценки выгодности заказов и финансового сравнения моделей владения автомобилем (собственность, кредит, аренда, раскат).
                    </p>
                    <p>
                      1.2. Приложение является аналитическим калькулятором для личного использования водителем. Приложение НЕ предназначено и не используется для ведения бухгалтерского учета, налоговой отчетности или формирования какой-либо официальной юридической документации.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-white text-sm">2. Учетная запись и права пользователя</h4>
                    <p>
                      2.1. Водитель самостоятельно определяет параметры своего автомобиля, цены на топливо, нормы расхода и комиссии своего таксопарка.
                    </p>
                    <p>
                      2.2. Пользователь самостоятельно указывает контактные данные, город и почтовый адрес исключительно для персонализации настроек и личного профиля в приложении.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-white text-sm">3. Ограничение ответственности</h4>
                    <p>
                      3.1. Все расчеты чистой прибыли, амортизации и налогов носят ознакомительный характер на основе введенных водителем параметров и не являются бухгалтерскими, налоговыми или аудиторскими документами.
                    </p>
                    <p>
                      3.2. Сервис не несет ответственности за изменения тарифных сеток или комиссионных списаний агрегаторов в режиме реального времени.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-white text-sm">4. Срок действия</h4>
                    <p>
                      4.1. Соглашение вступает в силу с момента подтверждения регистрации или начала использования калькулятора и действует бессрочно.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 text-[11px] text-neutral-400">
                    Политика обработки персональных данных разработана в строгом соответствии с Федеральным законом РФ от 27.07.2006 № 152-ФЗ «О персональных данных».
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-white text-sm">1. Категории обрабатываемых данных</h4>
                    <p>
                      1.1. Сервис обрабатывает: имя водителя, адрес электронной почты, контактный телефон, город осуществления деятельности, почтовый адрес профиля, а также параметры автомобиля и финансовые записи смен.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-white text-sm">2. Принципы локального хранения и неразглашения</h4>
                    <p>
                      2.1. Конфиденциальные данные о величине дохода, бонусах, чаевых и чистой прибыли водителя хранятся исключительно в изолированном защищенном хранилище браузера (Local Storage / Web Storage).
                    </p>
                    <p>
                      2.2. Сервис гарантирует, что финансовая статистика водителя ни при каких обстоятельствах не передается третьим лицам, таксопаркам или налоговым органам.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-white text-sm">3. Права водителя в отношении персональных данных</h4>
                    <p>
                      3.1. Водитель в любой момент вправе изменить свое фото, почтовый адрес, город или полностью экспортировать свой профиль в формате JSON.
                    </p>
                    <p>
                      3.2. Водитель имеет безусловное право на отзыв согласий, удаление своего профиля и очистку всей истории смен.
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="p-4 border-t border-neutral-800 bg-neutral-950 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingDoc(null)}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl text-xs transition-colors"
              >
                Понятно, закрыть
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
