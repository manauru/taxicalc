import { useState, useEffect, useCallback } from 'react';
import { TariffCategory } from '../types/taxi';

export type AdCategory = 'fuel' | 'auto' | 'insurance' | 'service' | 'legal' | 'partner';
export type AdPlacement = 'all' | 'account' | 'radar' | 'calculator' | 'optimizer';

export interface AdOffer {
  id: string;
  category: AdCategory;
  categoryLabel?: string;
  title: string;
  partnerName: string;
  badge: string;
  badgeColor?: string;
  discount: string;
  description: string;
  details: string[];
  promoCode?: string;
  linkUrl?: string;
  linkText?: string;
  contactPhone?: string;
  placement: AdPlacement;
  targetCategory?: 'all' | TariffCategory;
  targetCity?: string;
  isHot?: boolean;
  isActive: boolean;
  priority?: number;
  viewsCount: number;
  clicksCount: number;
  createdAt: number;
  updatedAt?: number;
}

export const AD_CATEGORIES: { id: AdCategory; label: string }[] = [
  { id: 'fuel', label: 'Топливо и АЗС' },
  { id: 'auto', label: 'Аренда и авто' },
  { id: 'insurance', label: 'Страхование (ОСАГО)' },
  { id: 'service', label: 'Сервис, ТО и мойка' },
  { id: 'legal', label: 'Юристы и учет' },
  { id: 'partner', label: 'Партнерские спецпредложения' },
];

export const AD_PLACEMENTS: { id: AdPlacement; label: string; description: string }[] = [
  { id: 'all', label: 'Везде (во всех разделах)', description: 'Карточка ротируется во всех блоках приложения' },
  { id: 'account', label: 'Личный кабинет (Спецпредложения)', description: 'Вкладка акций и скидок в профиле водителя' },
  { id: 'radar', label: 'Радар заказов (Подбор поездок)', description: 'Контекстный баннер под оценкой заказа' },
  { id: 'calculator', label: 'Калькулятор смены', description: 'Блок рекомендаций в смете расходов за день' },
  { id: 'optimizer', label: 'Оптимизатор прибыли', description: 'Баннеры оптимизации топлива, ГБО и лизинга' },
];

export const DEFAULT_AD_OFFERS: AdOffer[] = [
  {
    id: 'ad_fuel_card',
    category: 'fuel',
    categoryLabel: 'Топливо и АЗС',
    title: 'Топливная карта «ТаксиДрайв» с постоплатой',
    partnerName: 'Сеть АЗС: Лукойл, Газпромнефть, Роснефть, Teboil',
    badge: 'Топливо №1',
    badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/40',
    discount: 'Скидка до 7%',
    description: 'Единая топливная карта для водителей такси без абонентской платы. Скидка на литр бензина и газа с моментальным зачислением в баланс смены.',
    details: [
      'Скидка до 2.5 ₽/литр на 8 500 АЗС по всей России',
      'Заправка из приложения без очереди в кассу',
      'Отсрочка платежа до 7 дней для постоянных водителей',
      'Электронные чеки для учета расходов в ТаксиКальк PRO'
    ],
    promoCode: 'TAXIPRO7',
    linkUrl: 'https://taxidrive-cards.ru',
    linkText: 'Оформить карту с бонусом 500 ₽',
    contactPhone: '8 (800) 555-35-35',
    placement: 'all',
    targetCategory: 'all',
    isHot: true,
    isActive: true,
    priority: 1,
    viewsCount: 1420,
    clicksCount: 284,
    createdAt: Date.now() - 30 * 86400 * 1000,
  },
  {
    id: 'ad_taxi_osago',
    category: 'insurance',
    categoryLabel: 'Страхование (ОСАГО)',
    title: 'Официальное ОСАГО для такси с лицензией',
    partnerName: 'Страховой агрегатор «ТаксиСтрах»',
    badge: 'Проверено РСА',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40',
    discount: 'Выгода до 25%',
    description: 'Оформление полиса с законной отметкой «Такси» без отказов и переплат за 5 минут. Поиск лучшей цены среди 14 аккредитованных страховых компаний.',
    details: [
      '100% легальный полис с внесением в базу РСА и ЕАИСТО',
      'Одобрение для водителей с любым КБМ и стажем',
      'Электронный полис приходит на email за 10 минут',
      'Рассрочка оплаты полиса на 3 месяца без переплат'
    ],
    promoCode: 'OSAGOTAXI',
    linkUrl: 'https://taxistrah.ru',
    linkText: 'Рассчитать стоимость полиса',
    contactPhone: '8 (800) 700-12-12',
    placement: 'account',
    targetCategory: 'all',
    isHot: true,
    isActive: true,
    priority: 2,
    viewsCount: 980,
    clicksCount: 195,
    createdAt: Date.now() - 25 * 86400 * 1000,
  },
  {
    id: 'ad_fleet_rent',
    category: 'auto',
    categoryLabel: 'Аренда и авто',
    title: 'Аренда и выкуп авто под такси (Комфорт и Комфорт+)',
    partnerName: 'Таксопарк «ЛидерАвто» (сертифицированный партнер)',
    badge: 'Первый день 0 ₽',
    badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/40',
    discount: 'От 2 100 ₽/сут',
    description: 'Новые автомобили 2024-2025 года (Chery Arrizo 8, Haval Jolion, Geely Emgrand, Changan Alsvin) с лицензией, оклейкой и ГБО.',
    details: [
      'Первый рабочий день — бесплатно для адаптации',
      'Графики работы на выбор: 6/1, 7/0, 2/2 или подменный авто',
      'Полное техническое обслуживание, резина и ОСАГО за счет парка',
      'Программа честного выкупа без скрытых комиссий от 18 месяцев'
    ],
    promoCode: 'PARKFREE',
    linkUrl: 'https://lider-taxi-rent.ru',
    linkText: 'Подобрать автомобиль в парке',
    contactPhone: '+7 (495) 120-45-67',
    placement: 'radar',
    targetCategory: 'all',
    isHot: false,
    isActive: true,
    priority: 3,
    viewsCount: 1150,
    clicksCount: 167,
    createdAt: Date.now() - 20 * 86400 * 1000,
  },
  {
    id: 'ad_car_wash',
    category: 'service',
    categoryLabel: 'Сервис, ТО и мойка',
    title: 'Клубная карта: мойка самообслуживания и детейлинг',
    partnerName: 'Сеть автомоек «АкваТакси 24/7»',
    badge: 'Кэшбэк 30%',
    badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/40',
    discount: 'От 150 ₽/мойка',
    description: 'Теплые боксы самообслуживания и комплексная экспресс-мойка кузова с химией премиум-класса. Круглосуточный въезд по QR-коду водителя.',
    details: [
      'Теплая вода под давлением 180 бар и активная пена для такси',
      'Пылесос и продувка воздухом замков включены в базовый тариф',
      'Кэшбэк 30% бонусами на следующую мойку при оплате из баланса',
      'Более 45 локаций в Москве и Санкт-Петербурге рядом с путевыми точками'
    ],
    promoCode: 'CLEANTAXI',
    linkUrl: 'https://aquataxi24.ru',
    linkText: 'Получить бонус 300 бонусов',
    placement: 'calculator',
    targetCategory: 'all',
    isHot: false,
    isActive: true,
    priority: 4,
    viewsCount: 840,
    clicksCount: 112,
    createdAt: Date.now() - 15 * 86400 * 1000,
  },
  {
    id: 'ad_gbo_install',
    category: 'auto',
    categoryLabel: 'Аренда и авто',
    title: 'Установка ГБО 4/5 поколения в рассрочку под ключ',
    partnerName: 'Техцентр «ГазПроф Сервис»',
    badge: 'Экономия 45%',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40',
    discount: 'Рассрочка 0%',
    description: 'Итальянское оборудование Lovato и BRC с регистрацией в ГИБДД. Снижение затрат на топливо с первых 500 км пробега.',
    details: [
      'Полный пакет документов и регистрация в ГИБДД за 1 день',
      'Окупаемость оборудования за 2-3 месяца работы в такси',
      'Гарантия 3 года или 150 000 км без ограничения пробега',
      'Бесплатное первое ТО и диагностика через 1000 км'
    ],
    promoCode: 'GBOPRO',
    linkUrl: 'https://gazprof-service.ru',
    linkText: 'Рассчитать срок окупаемости ГБО',
    placement: 'optimizer',
    targetCategory: 'all',
    isHot: true,
    isActive: true,
    priority: 5,
    viewsCount: 730,
    clicksCount: 145,
    createdAt: Date.now() - 10 * 86400 * 1000,
  },
  {
    id: 'ad_legal_support',
    category: 'legal',
    categoryLabel: 'Юристы и учет',
    title: 'Защита прав водителей такси и помощь при ДТП',
    partnerName: 'Юридическая служба «ТаксиЗащита»',
    badge: 'Юристы 24/7',
    badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/40',
    discount: '1-я консультация 0 ₽',
    description: 'Круглосуточная правовая поддержка при спорах с агрегаторами (необоснованная блокировка), спорах со страховыми по ОСАГО и обжаловании штрафов МАДИ.',
    details: [
      'Помощь при неправомерных штрафах и эвакуации автомобиля',
      'Разблокировка аккаунта в агрегаторах через досудебную претензию',
      'Взыскание полной стоимости ущерба при ДТП со страховой или виновника',
      'Бухгалтерская помощь самозанятым и ИП водителям по налогам'
    ],
    promoCode: 'LEGALFREE',
    linkUrl: 'https://taxizashita.ru',
    linkText: 'Бесплатная экспресс-консультация',
    contactPhone: '8 (800) 333-88-99',
    placement: 'account',
    targetCategory: 'all',
    isHot: false,
    isActive: true,
    priority: 6,
    viewsCount: 620,
    clicksCount: 94,
    createdAt: Date.now() - 5 * 86400 * 1000,
  }
];

const STORAGE_KEY_ADS_V2 = 'taxicalc_admin_ads_v2';
const STORAGE_KEY_ADS_V1 = 'taxicalc_admin_ads_v1';
export const EVENT_ADS_UPDATED = 'taxicalc_ads_updated';

/**
 * Normalize and repair any ad offer to guarantee valid placement, category, and required fields
 */
export function normalizeAdOffer(item: any, idx = 0): AdOffer {
  // Normalize category
  let cat: AdCategory = 'partner';
  const c = String(item.category || '').toLowerCase();
  if (c === 'fuel' || c.includes('топлив') || c.includes('азс')) cat = 'fuel';
  else if (c === 'insurance' || c.includes('страх') || c.includes('осаго')) cat = 'insurance';
  else if (c === 'auto' || c.includes('аренд') || c.includes('авто')) cat = 'auto';
  else if (c === 'service' || c.includes('сервис') || c.includes('мойк') || c.includes('то')) cat = 'service';
  else if (c === 'legal' || c.includes('юрист') || c.includes('учет')) cat = 'legal';
  else cat = 'partner';

  // Normalize placement: if missing or invalid, default to 'all' so it is NEVER lost
  const validPlacements: AdPlacement[] = ['all', 'account', 'radar', 'calculator', 'optimizer'];
  const placement: AdPlacement = validPlacements.includes(item.placement) ? item.placement : 'all';

  const categoryLabel = AD_CATEGORIES.find(ac => ac.id === cat)?.label || 'Партнерское спецпредложение';

  return {
    id: String(item.id || `ad_${Date.now()}_${idx}`),
    category: cat,
    categoryLabel: item.categoryLabel || categoryLabel,
    title: String(item.title || 'Спецпредложение для водителей'),
    partnerName: String(item.partnerName || 'Партнер ТаксиКальк PRO'),
    badge: String(item.badge || 'Спецпредложение'),
    badgeColor: item.badgeColor || (cat === 'fuel' ? 'bg-amber-500/10 text-amber-400 border-amber-500/40' :
      cat === 'insurance' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40' :
      cat === 'auto' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/40' :
      cat === 'service' ? 'bg-blue-500/10 text-blue-400 border-blue-500/40' :
      cat === 'legal' ? 'bg-purple-500/10 text-purple-400 border-purple-500/40' :
      'bg-amber-500/10 text-amber-400 border-amber-500/30'),
    discount: String(item.discount || 'Выгода'),
    description: String(item.description || 'Выгодные условия и специальные скидки для водителей такси.'),
    details: Array.isArray(item.details) && item.details.length > 0 ? item.details : [
      'Моментальная активация по промокоду',
      'Специальные условия для пользователей ТаксиКальк PRO'
    ],
    promoCode: item.promoCode ? String(item.promoCode).trim().toUpperCase() : undefined,
    linkUrl: item.linkUrl ? String(item.linkUrl).trim() : undefined,
    linkText: item.linkText ? String(item.linkText).trim() : 'Воспользоваться предложением',
    contactPhone: item.contactPhone ? String(item.contactPhone).trim() : undefined,
    placement,
    targetCategory: item.targetCategory || 'all',
    targetCity: item.targetCity || undefined,
    isHot: Boolean(item.isHot),
    isActive: typeof item.isActive === 'boolean' ? item.isActive : true,
    priority: typeof item.priority === 'number' ? item.priority : 10,
    viewsCount: typeof item.viewsCount === 'number' ? item.viewsCount : 0,
    clicksCount: typeof item.clicksCount === 'number' ? item.clicksCount : 0,
    createdAt: typeof item.createdAt === 'number' ? item.createdAt : Date.now(),
    updatedAt: item.updatedAt,
  };
}

/**
 * Retrieve all advertising campaigns from localStorage, migrating or initializing if needed
 */
export function getAdOffers(): AdOffer[] {
  if (typeof window === 'undefined') return DEFAULT_AD_OFFERS;

  try {
    const rawV2 = localStorage.getItem(STORAGE_KEY_ADS_V2);
    if (rawV2 !== null) {
      const parsed = JSON.parse(rawV2);
      if (Array.isArray(parsed)) {
        return parsed.map((item, idx) => normalizeAdOffer(item, idx));
      }
    }

    // Check v1 migration
    const rawV1 = localStorage.getItem(STORAGE_KEY_ADS_V1);
    if (rawV1) {
      const parsedV1 = JSON.parse(rawV1);
      if (Array.isArray(parsedV1) && parsedV1.length > 0) {
        // Upgrade v1 items to v2
        const upgraded: AdOffer[] = parsedV1.map((item: any, idx: number) => normalizeAdOffer({
          ...item,
          placement: 'all',
        }, idx));
        saveAdOffers(upgraded);
        return upgraded;
      }
    }
  } catch (err) {
    console.warn('Error reading ads storage:', err);
  }

  // Initialize with rich defaults
  saveAdOffers(DEFAULT_AD_OFFERS);
  return DEFAULT_AD_OFFERS;
}

/**
 * Save ad offers and notify all components across the app in real-time
 */
export function saveAdOffers(offers: AdOffer[]): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY_ADS_V2, JSON.stringify(offers));
    // Also save simplified v1 format for backward compatibility
    localStorage.setItem(STORAGE_KEY_ADS_V1, JSON.stringify(offers));
  } catch (err) {
    console.error('Failed to save ads:', err);
  }

  // Dispatch custom DOM event for immediate cross-component sync
  try {
    window.dispatchEvent(new CustomEvent(EVENT_ADS_UPDATED, { detail: offers }));
  } catch {
    // ignore
  }
}

/**
 * Permanently delete an ad campaign by ID and notify all subscribers
 */
export function deleteAdOffer(id: string): AdOffer[] {
  const current = getAdOffers();
  const updated = current.filter((item) => item.id !== id);
  saveAdOffers(updated);
  return updated;
}

/**
 * Track an impression/view for an ad
 */
const recentViewsSet = new Set<string>();

export function trackAdView(adId: string): void {
  if (recentViewsSet.has(adId)) return;
  recentViewsSet.add(adId);

  // Debounced count update
  setTimeout(() => {
    try {
      const offers = getAdOffers();
      const target = offers.find((o) => o.id === adId);
      if (target) {
        target.viewsCount = (target.viewsCount || 0) + 1;
        saveAdOffers(offers);
      }
    } catch {
      // ignore
    }
  }, 1000);
}

/**
 * Track a click/action on an ad
 */
export function trackAdClick(adId: string): void {
  try {
    const offers = getAdOffers();
    const target = offers.find((o) => o.id === adId);
    if (target) {
      target.clicksCount = (target.clicksCount || 0) + 1;
      saveAdOffers(offers);
    }
  } catch {
    // ignore
  }
}

/**
 * Reset all ads to standard high-converting presets
 */
export function resetAdsToDefault(): AdOffer[] {
  saveAdOffers(DEFAULT_AD_OFFERS);
  return DEFAULT_AD_OFFERS;
}

/**
 * React hook to access ads with real-time sync across admin changes
 */
export function useAdOffers(placement?: AdPlacement) {
  const [allAds, setAllAds] = useState<AdOffer[]>(() => getAdOffers());

  const handleAdsChanged = useCallback(() => {
    setAllAds(getAdOffers());
  }, []);

  useEffect(() => {
    window.addEventListener(EVENT_ADS_UPDATED, handleAdsChanged);
    window.addEventListener('storage', handleAdsChanged);
    return () => {
      window.removeEventListener(EVENT_ADS_UPDATED, handleAdsChanged);
      window.removeEventListener('storage', handleAdsChanged);
    };
  }, [handleAdsChanged]);

  // Filter for placement and active status
  const filteredAds = allAds.filter((ad) => {
    if (!ad.isActive) return false;
    if (!placement || placement === 'all') return true;
    if (placement === 'account') {
      // Driver account shows all account offers, general promos and non-restricted ads
      return ad.placement === 'account' || ad.placement === 'all' || !ad.placement;
    }
    return ad.placement === 'all' || ad.placement === placement || !ad.placement;
  });

  return {
    ads: filteredAds,
    allAds,
    trackView: trackAdView,
    trackClick: trackAdClick,
    reload: handleAdsChanged,
  };
}
