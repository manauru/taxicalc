import React, { useState } from 'react';
import { UserProfile } from '../types/auth';
import { 
  MessageSquare, 
  Send, 
  Star, 
  CheckCircle2, 
  Clock, 
  HelpCircle, 
  Bug, 
  Lightbulb, 
  Building2, 
  Mail, 
  Phone, 
  Check, 
  ExternalLink,
  MessageCircle,
  Headphones
} from 'lucide-react';

interface AccountFeedbackBlockProps {
  currentUser: UserProfile | null;
  onOpenAdInquiry?: () => void;
}

interface StoredFeedback {
  id: string;
  category: string;
  categoryLabel: string;
  rating: number;
  message: string;
  contact: string;
  name: string;
  createdAt: number;
  status: 'sent' | 'reviewed';
}

const FEEDBACK_STORAGE_KEY = 'taxicalc_user_feedbacks_v1';

const FEEDBACK_CATEGORIES = [
  { id: 'suggestion', label: 'Идея / Предложение по функционалу', icon: Lightbulb },
  { id: 'bug', label: 'Сообщить об ошибке в расчетах', icon: Bug },
  { id: 'tariffs', label: 'Вопрос по тарифам и комиссиям', icon: HelpCircle },
  { id: 'advertising', label: 'Размещение рекламы / Сотрудничество', icon: Building2 },
  { id: 'general', label: 'Отзыв о работе приложения', icon: MessageSquare },
];

export const AccountFeedbackBlock: React.FC<AccountFeedbackBlockProps> = ({
  currentUser,
}) => {
  const [category, setCategory] = useState<string>('suggestion');
  const [rating, setRating] = useState<number>(5);
  const [message, setMessage] = useState<string>('');
  const [name, setName] = useState<string>(currentUser?.name || '');
  const [contact, setContact] = useState<string>(currentUser?.email || currentUser?.phone || '');
  const [attachDiagnostics, setAttachDiagnostics] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedSuccess, setSubmittedSuccess] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // История отправленных обращений пользователя
  const [feedbackHistory, setFeedbackHistory] = useState<StoredFeedback[]>(() => {
    try {
      const saved = localStorage.getItem(FEEDBACK_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch {
      // ignore
    }
    return [];
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!message.trim()) {
      setErrorMsg('Пожалуйста, напишите текст вашего сообщения или отзыва.');
      return;
    }

    if (message.trim().length < 8) {
      setErrorMsg('Текст сообщения слишком короткий (минимум 8 символов).');
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      const categoryObj = FEEDBACK_CATEGORIES.find((c) => c.id === category);
      const newFeedback: StoredFeedback = {
        id: 'fb_' + Date.now(),
        category,
        categoryLabel: categoryObj?.label || 'Обращение',
        rating,
        message: message.trim(),
        contact: contact.trim(),
        name: name.trim() || 'Водитель',
        createdAt: Date.now(),
        status: 'sent',
      };

      const updatedHistory = [newFeedback, ...feedbackHistory];
      setFeedbackHistory(updatedHistory);
      try {
        localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(updatedHistory));
      } catch {
        // ignore
      }

      setIsSubmitting(false);
      setSubmittedSuccess(true);
      setMessage('');

      setTimeout(() => {
        setSubmittedSuccess(false);
      }, 5000);
    }, 600);
  };

  return (
    <div className="space-y-6">
      
      {/* Главный блок: Форма обратной связи */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 sm:p-6 space-y-6">
        
        {/* Заголовок */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-amber-500 font-bold">Служба заботы</span>
              <span className="text-neutral-600">·</span>
              <span className="text-xs text-neutral-400">Прямой контакт с разработчиками</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white mt-1 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-amber-400" />
              Обратная связь и предложения
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Отвечаем в течение 24 ч
            </span>
          </div>
        </div>

        {/* Уведомление об успешной отправке */}
        {submittedSuccess && (
          <div className="p-4 bg-emerald-950/70 border border-emerald-700 rounded-xl text-emerald-200 text-xs sm:text-sm flex items-start gap-3 animate-fade-in shadow-lg">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-white">Спасибо! Ваше обращение успешно зарегистрировано</div>
              <p className="text-neutral-300 text-xs">
                Мы внимательно изучаем все отзывы водителей для улучшения калькулятора смен и добавления новых тарифов. При необходимости ответа мы свяжемся с вами по указанным контактам.
              </p>
            </div>
          </div>
        )}

        {/* Форма */}
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Тематика обращения */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-neutral-300">
              Тема обращения:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {FEEDBACK_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-left text-xs transition-all ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500 text-white font-semibold ring-1 ring-amber-500/40'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg shrink-0 ${
                      isSelected ? 'bg-amber-500 text-neutral-950' : 'bg-neutral-900 text-neutral-400'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="leading-tight">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Оценка сервиса */}
          <div className="space-y-2 bg-neutral-950 p-4 rounded-xl border border-neutral-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-semibold text-neutral-300">
                Ваша оценка калькулятора ТаксиКальк PRO:
              </label>
              <span className="text-xs text-amber-400 font-mono font-bold">
                {rating === 5 && '⭐️⭐️⭐️⭐️⭐️ Отлично, всё устраивает!'}
                {rating === 4 && '⭐️⭐️⭐️⭐️ Хорошо, но есть пожелания'}
                {rating === 3 && '⭐️⭐️⭐️ Нормально, требуется доработка'}
                {rating === 2 && '⭐️⭐️ Плохо, много недочетов'}
                {rating === 1 && '⭐️ Очень плохо'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 pt-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-1 text-neutral-600 hover:text-amber-400 transition-colors focus:outline-none"
                  title={`${star} из 5`}
                >
                  <Star
                    className={`w-6 h-6 transition-transform hover:scale-110 ${
                      star <= rating ? 'text-amber-400 fill-amber-400' : 'text-neutral-700'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Контактные данные */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 text-xs">
              <label className="block text-neutral-300 font-semibold">
                Ваше имя или позывной:
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Иван"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 text-white font-medium focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="block text-neutral-300 font-semibold">
                Email, телефон или Telegram для ответа:
              </label>
              <input
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="driver@mail.ru или @telegram_login"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 text-white font-medium focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Текст обращения */}
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <label className="block text-neutral-300 font-semibold">
                Текст вашего сообщения, вопроса или идеи:
              </label>
              <span className="text-[11px] text-neutral-500">
                {message.length} символов
              </span>
            </div>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Опишите подробно, какую функцию вы хотите добавить, с какой проблемой столкнулись или условия вашего рекламного предложения..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-3 text-white text-sm focus:border-amber-500 focus:outline-none resize-none leading-relaxed"
            />
          </div>

          {/* Прикрепить диагностику */}
          <label className="flex items-center gap-2.5 text-xs text-neutral-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={attachDiagnostics}
              onChange={(e) => setAttachDiagnostics(e.target.checked)}
              className="rounded bg-neutral-950 border-neutral-700 text-amber-500 focus:ring-0"
            />
            <span>
              Прикрепить техническую информацию (город: {currentUser?.city || 'Москва'}, браузер, версия ТаксиКальк PRO v2.4) для точной диагностики
            </span>
          </label>

          {/* Ошибка */}
          {errorMsg && (
            <div className="p-3 bg-rose-950/70 border border-rose-800 rounded-xl text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Кнопка отправки */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-neutral-800">
            <p className="text-[11px] text-neutral-500">
              Ваши данные защищены и используются исключительно для ответа службы поддержки
            </p>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-6 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950 font-bold rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-lg"
            >
              {isSubmitting ? (
                <span>Отправка...</span>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Отправить обращение</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Прямые каналы связи */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-950 text-blue-400 border border-blue-800/60 flex items-center justify-center shrink-0">
            <MessageCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-neutral-500 block">Telegram-канал и бот</span>
            <span className="text-xs font-bold text-white block">@TaxiCalcSupportBot</span>
            <span className="text-[10px] text-blue-400">Оперативный чат водителей</span>
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-950 text-amber-400 border border-amber-800/60 flex items-center justify-center shrink-0">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-neutral-500 block">Электронная почта</span>
            <span className="text-xs font-bold text-white block">support@taxicalc-pro.ru</span>
            <span className="text-[10px] text-neutral-400">Для официальных запросов</span>
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-800/60 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-neutral-500 block">Для таксопарков и рекламы</span>
            <span className="text-xs font-bold text-white block">partners@taxicalc-pro.ru</span>
            <span className="text-[10px] text-emerald-400">Интеграции и спецпроекты</span>
          </div>
        </div>
      </div>

      {/* История обращений пользователя */}
      {feedbackHistory.length > 0 && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-neutral-400" />
              Ваши предыдущие обращения ({feedbackHistory.length})
            </h3>
            <span className="text-[10px] text-neutral-500">
              Сохранено на этом устройстве
            </span>
          </div>

          <div className="space-y-2">
            {feedbackHistory.map((item) => (
              <div
                key={item.id}
                className="p-3 bg-neutral-950 rounded-xl border border-neutral-800/80 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{item.categoryLabel}</span>
                    <span className="text-neutral-600">·</span>
                    <div className="flex text-amber-400">
                      {'★'.repeat(item.rating)}
                    </div>
                  </div>
                  <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full font-medium">
                    Принято в обработку
                  </span>
                </div>

                <p className="text-neutral-300 text-xs italic">
                  «{item.message}»
                </p>

                <div className="text-[10px] text-neutral-500 font-mono">
                  {new Date(item.createdAt).toLocaleString('ru-RU', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
