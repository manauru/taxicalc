import React, { useState } from 'react';
import { 
  useAdOffers, 
  AdOffer, 
  trackAdClick, 
  trackAdView 
} from '../utils/adsStorage';
import { 
  Megaphone, 
  Tag, 
  ExternalLink, 
  Copy, 
  Check, 
  Fuel, 
  ShieldCheck, 
  Car, 
  Sparkles, 
  Wrench, 
  Scale, 
  ArrowRight,
  BadgeCheck,
  Flame,
  PhoneCall
} from 'lucide-react';

interface AccountAdsBlockProps {
  onGoToFeedbackAdvertising?: () => void;
}

export const AccountAdsBlock: React.FC<AccountAdsBlockProps> = ({
  onGoToFeedbackAdvertising,
}) => {
  // Show all active partner discount offers in account
  const { ads } = useAdOffers();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Track impressions
  React.useEffect(() => {
    if (ads.length > 0) {
      ads.forEach((ad) => trackAdView(ad.id));
    }
  }, [ads]);

  const handleCopyPromo = (offer: AdOffer) => {
    if (!offer.promoCode) return;
    navigator.clipboard.writeText(offer.promoCode);
    setCopiedCode(offer.promoCode);
    trackAdClick(offer.id);
    setTimeout(() => {
      setCopiedCode(null);
    }, 2500);
  };

  const handleLinkClick = (offer: AdOffer) => {
    trackAdClick(offer.id);
    if (offer.linkUrl) {
      window.open(offer.linkUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const filteredOffers = ads.filter((offer) => {
    if (selectedCategory === 'all') return true;
    return offer.category === selectedCategory;
  });

  return (
    <div className="space-y-6">
      
      {/* Главный промо-баннер раздела */}
      <div className="bg-gradient-to-r from-amber-950/50 via-neutral-900 to-neutral-900 border border-amber-500/30 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Спецпредложения и клубные скидки
              </span>
              <span className="text-neutral-600">·</span>
              <span className="text-xs text-neutral-400">Только для пользователей ТаксиКальк PRO</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              Экономьте на топливе, ТО и аренде с нашими партнерами
            </h2>
            <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
              Мы отобрали выгодные предложения от проверенных сетей АЗС, страховых компаний, парков и сервисов, которые помогают снизить себестоимость километра и повысить чистую прибыль с каждой смены.
            </p>
          </div>

          <div className="shrink-0 flex flex-col sm:flex-row md:flex-col gap-2.5">
            <div className="bg-neutral-950/80 border border-amber-500/30 rounded-xl p-3 text-center sm:text-left">
              <div className="text-[10px] text-neutral-400 uppercase font-semibold">Средняя экономия водителя:</div>
              <div className="text-xl font-bold font-mono text-emerald-400">до 18 500 ₽/мес</div>
              <div className="text-[10px] text-neutral-500">по клубным промокодам</div>
            </div>
          </div>
        </div>

        {/* Фоновое свечение */}
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Фильтр по категориям */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {[
          { id: 'all', label: 'Все предложения' },
          { id: 'fuel', label: 'Топливо и АЗС' },
          { id: 'insurance', label: 'ОСАГО для такси' },
          { id: 'auto', label: 'Аренда и авто' },
          { id: 'service', label: 'Мойка и ТО' },
          { id: 'legal', label: 'Юристы' },
          { id: 'partner', label: 'Партнеры' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedCategory(tab.id)}
            className={`px-3.5 py-2 rounded-xl font-semibold transition-all whitespace-nowrap ${
              selectedCategory === tab.id
                ? 'bg-amber-500 text-neutral-950 font-bold shadow-md'
                : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Сетка предложений партнеров */}
      {filteredOffers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredOffers.map((offer) => (
            <div
              key={offer.id}
              className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:border-neutral-700 transition-all shadow-lg relative group"
            >
              {/* Header карточки */}
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full border ${offer.badgeColor || 'bg-amber-500/10 text-amber-400 border-amber-500/30'} flex items-center gap-1`}>
                    {offer.isHot && <Flame className="w-3 h-3 text-amber-400" />}
                    {offer.badge || 'Партнер'}
                  </span>

                  <span className="text-sm font-bold font-mono text-emerald-400 bg-emerald-950/70 border border-emerald-800/80 px-2.5 py-1 rounded-lg">
                    {offer.discount}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition-colors leading-snug">
                  {offer.title}
                </h3>

                <div className="text-[11px] text-neutral-500 font-medium">
                  {offer.partnerName}
                </div>

                <p className="text-xs text-neutral-300 leading-relaxed pt-1">
                  {offer.description}
                </p>
              </div>

              {/* Детали условий */}
              {offer.details && offer.details.length > 0 && (
                <div className="space-y-1.5 bg-neutral-950/70 p-3 rounded-xl border border-neutral-800/80 text-[11px]">
                  {offer.details.map((detail, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-neutral-300">
                      <BadgeCheck className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span>{detail}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Промокод и кнопка действия */}
              <div className="space-y-3 pt-2 border-t border-neutral-800">
                {offer.promoCode && (
                  <div className="flex items-center justify-between gap-2 bg-neutral-950 p-2 rounded-xl border border-neutral-800">
                    <div className="flex items-center gap-2 pl-2 min-w-0">
                      <Tag className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="text-[11px] text-neutral-400 shrink-0">Промокод:</span>
                      <span className="font-mono font-bold text-xs text-amber-300 tracking-wider truncate">
                        {offer.promoCode}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopyPromo(offer)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        copiedCode === offer.promoCode
                          ? 'bg-emerald-500 text-neutral-950 font-bold'
                          : 'bg-neutral-800 hover:bg-neutral-700 text-white'
                      }`}
                      title="Скопировать промокод"
                    >
                      {copiedCode === offer.promoCode ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Скопировано!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Копировать</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleLinkClick(offer)}
                  className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
                >
                  <span>{offer.linkText || 'Воспользоваться предложением'}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-2 p-6">
          <Megaphone className="w-8 h-8 text-neutral-600 mx-auto" />
          <h4 className="text-sm font-bold text-white">В данной категории пока нет активных предложений</h4>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            Следите за обновлениями или переключитесь на вкладку «Все предложения», чтобы увидеть действующие клубные скидки.
          </p>
        </div>
      )}

      {/* Блок для рекламодателей и партнеров */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
              <Megaphone className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider text-amber-400 font-bold block">
                Для таксопарков, сервисов и брендов
              </span>
              <h3 className="text-base sm:text-lg font-bold text-white">
                Разместить рекламу в ТаксиКальк PRO
              </h3>
            </div>
          </div>

          {onGoToFeedbackAdvertising && (
            <button
              type="button"
              onClick={onGoToFeedbackAdvertising}
              className="px-4 py-2 bg-neutral-950 hover:bg-neutral-800 border border-amber-500/40 text-amber-400 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 self-start sm:self-auto cursor-pointer"
            >
              <span>Подать заявку на рекламу</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-neutral-300">
          <div className="bg-neutral-950 p-3.5 rounded-xl border border-neutral-800 space-y-1">
            <div className="font-bold text-white flex items-center gap-1.5">
              <Car className="w-4 h-4 text-amber-400" />
              Целевая аудитория
            </div>
            <p className="text-[11px] text-neutral-400">
              Действующие водители такси на линии: самозанятые, ИП, парковые водители и арендаторы.
            </p>
          </div>

          <div className="bg-neutral-950 p-3.5 rounded-xl border border-neutral-800 space-y-1">
            <div className="font-bold text-white flex items-center gap-1.5">
              <Tag className="w-4 h-4 text-emerald-400" />
              Высокая конверсия
            </div>
            <p className="text-[11px] text-neutral-400">
              Нативная интеграция предложений в расчет смены, радар заказов и оптимизатор затрат.
            </p>
          </div>

          <div className="bg-neutral-950 p-3.5 rounded-xl border border-neutral-800 space-y-1">
            <div className="font-bold text-white flex items-center gap-1.5">
              <PhoneCall className="w-4 h-4 text-cyan-400" />
              Прямой контакт
            </div>
            <p className="text-[11px] text-neutral-400">
              Быстрый запуск кампании через форму обратной связи или менеджера партнерских программ.
            </p>
          </div>
        </div>

        <div className="text-[11px] text-neutral-500 text-center pt-1 border-t border-neutral-800/60">
          Контакты рекламного отдела: <strong className="text-neutral-400">ads@taxicalc-pro.ru</strong> · Партнерские интеграции по всей России
        </div>
      </div>

    </div>
  );
};
