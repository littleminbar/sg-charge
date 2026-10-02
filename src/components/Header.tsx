import React, { useState, useEffect } from 'react';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  currentScreen: 'map' | 'details' | 'saved' | 'activity' | 'profile';
  onBackToMap?: () => void;
  onGoToLaunch?: () => void;
  onFindNearestNow?: () => void;
  onOpenNotifications?: () => void;
  onOpenProfile?: () => void;
  onOpenUrgency?: () => void;
  dataSource?: 'lta-live' | 'lta-batch' | 'cached' | 'empty';
  onRefreshApi?: () => void;
  isLoadingApi?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentScreen,
  onBackToMap,
  onGoToLaunch,
  onFindNearestNow,
  onOpenNotifications,
  onOpenProfile,
  onOpenUrgency,
  onRefreshApi,
  isLoadingApi,
}) => {
  const [showNotificationToast, setShowNotificationToast] = useState(false);

  useEffect(() => {
    async function showHealth() {
      const chip = document.getElementById("api-status");
      if (!chip) return;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      try {
        const r = await fetch("/api/health", { signal: controller.signal });
        const raw = await r.text();
        if (!r.ok) { throw new Error(r.status + " " + raw.slice(0, 80)); }
        const h = JSON.parse(raw);
        if (h.status !== "ok") { throw new Error("status " + h.status); }
        const asOf = h.model_as_of || h['as-of'] || h.as_of || h.asOf || '';
        chip.textContent = "API ok · " + asOf;
        chip.style.background = "#107850";
      } catch (err: any) {
        chip.textContent = "API down · " + err.message;
        chip.style.background = "#b53a4a";
      } finally {
        clearTimeout(timer);
      }
    }
    showHealth();
  }, []);

  const handleLogoClick = () => {
    if (onGoToLaunch) {
      onGoToLaunch();
    } else if (onOpenUrgency) {
      onOpenUrgency();
    }
  };

  const handleLowBatteryClick = () => {
    if (onFindNearestNow) {
      onFindNearestNow();
    } else if (onOpenUrgency) {
      onOpenUrgency();
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-[#f8f9ff]/90 backdrop-blur-md border-b border-[#dde9ff] shrink-0">
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2 sm:py-2.5 flex items-center justify-between">
        {/* Left: Brand logo & name linked to launch page */}
        <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1">
          {currentScreen !== 'map' && onBackToMap ? (
            <button
              type="button"
              onClick={onBackToMap}
              className="w-11 h-11 rounded-full flex items-center justify-center text-[#0d1c2f] hover:bg-[#eff4ff] active:scale-95 transition-all shrink-0 cursor-pointer"
              title="Back to Map"
            >
              <span className="material-symbols-outlined text-[24px]">arrow_back</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleLogoClick}
              className="w-11 h-11 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-[#006948] to-[#00a86b] flex items-center justify-center text-white shadow-sm shadow-[#006948]/20 shrink-0 cursor-pointer hover:scale-105 active:scale-95 transition-all"
              title="Return to Launch Page"
            >
              <span className="material-symbols-outlined text-[24px]">bolt</span>
            </button>
          )}

          {/* ChargeSG Text linked to Launch Page */}
          <button
            type="button"
            onClick={handleLogoClick}
            className="min-w-0 text-left cursor-pointer group active:opacity-80 hidden min-[420px]:block py-2"
            title="ChargeSG - Tap to return to Launch Page"
          >
            <h1 className="font-extrabold text-sm sm:text-base tracking-tight text-[#0d1c2f] group-hover:text-[#006948] leading-none transition-colors">
              ChargeSG
            </h1>
            <p className="text-[10px] font-medium text-[#3d4a42] leading-tight mt-0.5">
              Singapore EV Charging
            </p>
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-0.5 sm:gap-2 shrink-0">
          {/* One-Click Install Button (Auto-hides if installed) */}
          <PWAInstallButton variant="header" />

          {/* Low Battery Urgent Icon linked to FIND NEAREST NOW!! */}
          <button
            type="button"
            onClick={handleLowBatteryClick}
            title="TAKE ME THERE NOW!!"
            className="px-3 min-h-11 rounded-full bg-[#ffdad6] text-[#ba1a1a] hover:bg-[#ffb4ab] active:scale-95 transition-all text-xs font-black flex items-center gap-1 cursor-pointer border border-[#ba1a1a]/20 shadow-sm"
          >
            <span className="material-symbols-outlined text-[15px] animate-pulse">battery_alert</span>
            <span className="hidden min-[480px]:inline">TAKE ME THERE NOW!!</span>
            <span className="min-[480px]:hidden">Nearest</span>
          </button>

          {/* Refresh Live API */}
          {onRefreshApi && (
            <button
              type="button"
              onClick={onRefreshApi}
              disabled={isLoadingApi}
              title="Refresh live data from LTA DataMall"
              className="w-11 h-11 rounded-full flex items-center justify-center text-[#3d4a42] hover:bg-[#eff4ff] active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              <span
                className={`material-symbols-outlined text-[24px] ${isLoadingApi ? 'animate-spin text-[#006948]' : ''}`}
              >
                refresh
              </span>
            </button>
          )}

          {/* Notifications */}
          <button
            type="button"
            onClick={() => {
              if (onOpenNotifications) {
                onOpenNotifications();
              } else {
                setShowNotificationToast(true);
                setTimeout(() => setShowNotificationToast(false), 2500);
              }
            }}
            className="w-11 h-11 rounded-full flex items-center justify-center text-[#3d4a42] hover:bg-[#eff4ff] active:scale-95 transition-all relative cursor-pointer"
            title="Notifications"
          >
            <span className="material-symbols-outlined text-[24px]">notifications</span>
            <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#006948]" />
          </button>

          {/* Profile */}
          {onOpenProfile && (
            <button
              type="button"
              onClick={onOpenProfile}
              className="w-11 h-11 rounded-full bg-[#006948] text-white flex items-center justify-center font-bold text-xs hover:bg-[#00855d] active:scale-95 transition-all cursor-pointer shadow-sm"
              title="Vehicle Profile & Settings"
            >
              EV
            </button>
          )}
        </div>
      </div>

      {showNotificationToast && (
        <div className="fixed top-14 right-4 z-50 bg-[#0d1c2f] text-white text-[11px] p-2.5 rounded-xl shadow-xl border border-white/10 animate-in fade-in">
          All Singapore EV charging systems operational · LTA Live Feed Active
        </div>
      )}
    </header>
  );
};
