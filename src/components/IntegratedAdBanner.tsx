import React, { useState, useEffect } from 'react';
import { 
  useAdOffers, 
  AdPlacement, 
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
  Sparkles, 
  ChevronRight, 
  ChevronLeft,
  Flame,
  Fuel,
  ShieldCheck,
  Car,
  Wrench,
  Scale,
  Percent
} from 'lucide-react';

interface IntegratedAdBannerProps {
  placement: AdPlacement;
  variant?: 'compact' | 'card' | 'banner';
  maxItems?: number;
  className?: string;
  categoryFilter?: string;
}

export const IntegratedAdBanner: React.FC<IntegratedAdBannerProps> = ({
  placement,
  variant = 'compact',
  maxItems = 1,
  className = '',
  categoryFilter,
}) => {
  const { ads } = useAdOffers(placement);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Filter by category if requested
  const relevantAds = ads.filter((ad) => {
    if (categoryFilter && categoryFilter !== 'all') {
      return ad.category === categoryFilter;
    }
    return true;
  });

  // Track impressions on mount / ad change
  useEffect(() => {
    if (relevantAds.length > 0 && relevantAds[activeIndex]) {
      trackAdView(relevantAds[activeIndex].id);
    }
  }, [relevantAds, activeIndex]);

  if (relevantAds.length === 0) {
    return null;
  }

  const currentAd = relevantAds[activeIndex % relevantAds.length];

  const handleCopyCode = (ad: AdOffer, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!ad.promoCode) return;
    navigator.clipboard.writeText(ad.promoCode);
    setCopiedId(ad.id);
    trackAdClick(ad.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleLinkClick = (ad: AdOffer) => {
    trackAdClick(ad.id);
    if (ad.linkUrl) {
      window.open(ad.linkUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'fuel':
        return <Fuel className="w-4 h-4 text-amber-400" />;
      case 'insurance':
        return <ShieldCheck className="w-4 h-4 text-emerald-400" />;
      case 'auto':
        return <Car className="w-4 h-4 text-cyan-400" />;
      case 'service':
        return <Wrench className="w-4 h-4 text-blue-400" />;
      case 'legal':
        return <Scale className="w-4 h-4 text-purple-400" />;
      default:
        return <Tag className="w-4 h-4 text-amber-400" />;
    }
  };

  // 1. VARIANT: COMPACT (Used in sidebars, calculators, and radar cards)
  if (variant === 'compact') {
    return (
      <div 
        className={`bg-gradient-to-br from-neutral-900 via-neutral-900 to-amber-950/20 border border-neutral-800 hover:border-amber-500/40 rounded-2xl p-4 transition-all shadow-lg space-y-3 relative overflow-hidden group ${className}`}
      >
        {/* Subtle decorative background glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

        {/* Top Header: Category Icon + Badge + Partner & Discount + Carousel Nav */}
        <div className="flex items-center justify-between gap-2 relative z-10">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
              {getCategoryIcon(currentAd.category)}
            </div>
            <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-md shrink-0">
                {currentAd.badge || 'Партнер PRO'}
              </span>
              <span className="text-[11px] text-neutral-400 font-medium truncate max-w-[160px]">
                {currentAd.partnerName}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {currentAd.discount && (
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-800/80 px-2 py-0.5 rounded-md whitespace-nowrap shadow-sm">
                {currentAd.discount}
              </span>
            )}

            {relevantAds.length > 1 && (
              <div className="flex items-center gap-0.5 pl-1.5 border-l border-neutral-800">
                <button
                  type="button"
                  onClick={() => setActiveIndex((prev) => (prev - 1 + relevantAds.length) % relevantAds.length)}
                  className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors"
                  title="Предыдущее предложение"
                  aria-label="Предыдущее предложение"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] font-mono text-neutral-500 px-0.5">
                  {activeIndex + 1}/{relevantAds.length}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveIndex((prev) => (prev + 1) % relevantAds.length)}
                  className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors"
                  title="Следующее предложение"
                  aria-label="Следующее предложение"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Title & Description: Dedicated full-width block (never crushed) */}
        <div className="space-y-1 relative z-10">
          <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors leading-snug break-words">
            {currentAd.title}
          </h4>
          {currentAd.description && (
            <p className="text-xs text-neutral-300 leading-relaxed line-clamp-2">
              {currentAd.description}
            </p>
          )}
        </div>

        {/* Action Row: Promo Code & Link CTA */}
        <div className="pt-2.5 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-2 relative z-10">
          {currentAd.promoCode ? (
            <button
              type="button"
              onClick={(e) => handleCopyCode(currentAd, e)}
              className="flex-1 sm:flex-initial min-w-[140px] px-3 py-1.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-700/80 rounded-xl text-xs font-mono font-bold text-amber-300 transition-colors flex items-center justify-center gap-1.5 shadow-sm truncate"
              title="Нажмите, чтобы скопировать промокод"
            >
              {copiedId === currentAd.id ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-emerald-400 text-[11px]">Код скопирован!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                  <span className="truncate">Код: <strong className="text-amber-300">{currentAd.promoCode}</strong></span>
                </>
              )}
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={() => handleLinkClick(currentAd)}
            className="flex-1 sm:flex-initial px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-md whitespace-nowrap cursor-pointer ml-auto"
          >
            <span>{currentAd.linkText || 'Воспользоваться предложением'}</span>
            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
          </button>
        </div>
      </div>
    );
  }

  // 2. VARIANT: BANNER / CARD (Full presentation with bullet points)
  return (
    <div 
      className={`bg-neutral-900 border border-neutral-800 hover:border-amber-500/40 rounded-2xl p-4 sm:p-5 transition-all shadow-xl space-y-4 relative overflow-hidden group ${className}`}
    >
      <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

      {/* Top Header */}
      <div className="flex items-start justify-between gap-3 relative z-10">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5">
            {getCategoryIcon(currentAd.category)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">
                {currentAd.badge || 'Спецпредложение'}
              </span>
              <span className="text-xs text-neutral-400 font-medium truncate">
                {currentAd.partnerName}
              </span>
            </div>
            <h4 className="text-base font-bold text-white mt-1 group-hover:text-amber-300 transition-colors leading-snug break-words">
              {currentAd.title}
            </h4>
          </div>
        </div>

        <div className="text-right shrink-0">
          {currentAd.discount && (
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-800/80 px-2.5 py-1 rounded-xl block shadow-sm">
              {currentAd.discount}
            </span>
          )}
          <span className="text-[9px] text-neutral-500 block mt-1 uppercase tracking-wider">
            Реклама PRO
          </span>
        </div>
      </div>

      <p className="text-xs text-neutral-300 leading-relaxed relative z-10">
        {currentAd.description}
      </p>

      {/* Details List */}
      {currentAd.details && currentAd.details.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 relative z-10 bg-neutral-950/50 p-3 rounded-xl border border-neutral-800/70">
          {currentAd.details.slice(0, 4).map((detail, idx) => (
            <div key={idx} className="flex items-start gap-2 text-xs text-neutral-300">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
              <span className="leading-snug">{detail}</span>
            </div>
          ))}
        </div>
      )}

      {/* Action Footer */}
      <div className="pt-3 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-3 relative z-10">
        <div className="flex items-center gap-2 flex-wrap">
          {currentAd.promoCode && (
            <button
              type="button"
              onClick={(e) => handleCopyCode(currentAd, e)}
              className="px-3 py-1.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-700 rounded-xl text-xs font-mono font-bold text-amber-300 transition-colors flex items-center gap-1.5 shadow-sm"
              title="Скопировать промокод"
            >
              {copiedId === currentAd.id ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-emerald-400 font-bold">Код скопирован!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                  <span>Промокод: <strong className="text-amber-300">{currentAd.promoCode}</strong></span>
                </>
              )}
            </button>
          )}

          {currentAd.contactPhone && (
            <span className="text-xs font-mono text-neutral-400">
              тел: {currentAd.contactPhone}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {relevantAds.length > 1 && (
            <div className="flex items-center gap-1 bg-neutral-950 px-2 py-1 rounded-xl border border-neutral-800 text-xs font-mono text-neutral-400">
              <button
                type="button"
                onClick={() => setActiveIndex((prev) => (prev - 1 + relevantAds.length) % relevantAds.length)}
                className="p-0.5 hover:text-white transition-colors"
                title="Предыдущее"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span>{activeIndex + 1}/{relevantAds.length}</span>
              <button
                type="button"
                onClick={() => setActiveIndex((prev) => (prev + 1) % relevantAds.length)}
                className="p-0.5 hover:text-white transition-colors"
                title="Следующее"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => handleLinkClick(currentAd)}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-md cursor-pointer"
          >
            <span>{currentAd.linkText || 'Воспользоваться предложением'}</span>
            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
};
