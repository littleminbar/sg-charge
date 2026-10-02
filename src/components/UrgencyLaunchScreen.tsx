import React from 'react';
import { Station } from '../types/charging';
import { PWAInstallButton } from './PWAInstallButton';

interface UrgencyLaunchScreenProps {
  nearestStation: Station | null;
  onFindNow: () => void;
  onShowMeAround: () => void;
}

export const UrgencyLaunchScreen: React.FC<UrgencyLaunchScreenProps> = ({
  nearestStation,
  onFindNow,
  onShowMeAround,
}) => {
  return (
    <div className="w-full h-[100dvh] max-h-[100dvh] overflow-hidden bg-gradient-to-b from-[#0d1c2f] via-[#10221e] to-[#002114] text-white flex flex-col justify-between p-4 sm:p-6 lg:p-8 selection:bg-[#85f8c4] selection:text-[#002114] relative select-none pb-16 sm:pb-20">
      {/* Background Ambient EV Energy Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 sm:w-[28rem] lg:w-[46rem] h-80 sm:h-[28rem] lg:h-[46rem] bg-[#006948]/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-8 lg:right-24 w-60 sm:w-80 lg:w-[32rem] h-60 sm:h-80 lg:h-[32rem] bg-[#85f8c4]/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Branding & One-Click Install Button */}
      <div className="relative z-10 w-full max-w-6xl mx-auto flex items-center justify-between pt-1 sm:pt-2 shrink-0">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-[#006948] flex items-center justify-center text-white shadow-lg shadow-[#006948]/30 shrink-0">
            <span className="material-symbols-outlined text-[20px] sm:text-[24px]">bolt</span>
          </div>
          <div>
            <h1 className="text-base sm:text-xl font-black tracking-tight text-white flex items-center gap-1.5 leading-tight">
              ChargeSG
              <span className="text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-white/10 text-[#85f8c4] tracking-normal">
                SG 🇸🇬
              </span>
            </h1>
            <p className="text-[10px] sm:text-xs text-slate-300 leading-tight">Singapore EV Charging</p>
          </div>
        </div>

        {/* Top Right: One-Click Install Button */}
        <div className="flex items-center gap-1.5 shrink-0">
          <PWAInstallButton variant="launch" />
        </div>
      </div>

      {/* Centered Interactive Hero Block - Shifted Up Slightly for Bottom Strip */}
      <div className="relative z-10 flex-1 flex flex-col justify-center items-center my-auto -translate-y-4 sm:-translate-y-6 w-full max-w-sm sm:max-w-md lg:max-w-lg mx-auto px-2 text-center min-w-0">
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white leading-tight text-center max-w-md">
          How urgent is your charge?
        </h2>

        {/* Streamlined Single Card: No Overflows, Zero Duplication */}
        <div className="mt-3.5 sm:mt-5 w-full max-w-full p-3.5 sm:p-4.5 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl flex flex-col items-center justify-center text-center overflow-hidden">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#85f8c4]/20 border border-[#85f8c4]/40 text-[#85f8c4] text-[10px] sm:text-xs font-black uppercase tracking-wider mb-1.5 shrink-0">
            <span className="material-symbols-outlined text-[14px]">near_me</span>
            <span>Nearest Ready Point</span>
          </div>

          {/* Location Name: Responsive, wraps cleanly without overflow */}
          <h3 className="w-full text-base sm:text-lg lg:text-xl font-black text-white leading-snug break-words line-clamp-2 px-1 text-center min-w-0">
            {nearestStation ? nearestStation.name : 'Scanning Singapore EV Network...'}
          </h3>

          {/* Concise, non-duplicated metrics row */}
          {nearestStation ? (
            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mt-2 mb-3.5 text-[11px] sm:text-xs">
              <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-slate-200 font-medium">
                {nearestStation.distanceKm} km · ~{nearestStation.driveTimeMins} mins
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#006948]/70 text-[#85f8c4] font-bold border border-[#85f8c4]/30">
                {nearestStation.availableBays} bays free
              </span>
            </div>
          ) : (
            <p className="text-xs text-slate-300 mt-2 mb-3.5">
              connecting, do not panic, try again after 1s
            </p>
          )}

          {/* Action Button: TAKE ME THERE NOW!! */}
          <button
            type="button"
            onClick={onFindNow}
            className="group relative w-full min-h-16 px-4 rounded-2xl bg-[#006948] hover:bg-[#00855d] active:scale-[0.98] transition-all duration-200 text-white font-black shadow-[0_8px_24px_rgba(0,105,72,0.5)] border border-[#85f8c4]/50 cursor-pointer overflow-hidden flex items-center justify-center gap-2 shrink-0"
          >
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-1000" />

            <span className="material-symbols-outlined text-[22px] sm:text-[24px] text-[#85f8c4] group-hover:scale-110 transition-transform shrink-0">
              bolt
            </span>
            <span className="tracking-wide text-sm sm:text-base font-black truncate">
              TAKE ME THERE NOW!!
            </span>
          </button>
        </div>

        {/* Option 2: Show me around */}
        <div className="mt-2.5 sm:mt-3 w-full">
          <button
            type="button"
            onClick={onShowMeAround}
            className="w-full min-h-14 py-2 px-4 rounded-2xl bg-white/10 hover:bg-white/15 active:scale-[0.98] transition-all duration-200 text-white font-bold border border-white/20 shadow-md cursor-pointer flex flex-col items-center justify-center text-center"
          >
            <div className="flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-[18px] sm:text-[20px] text-slate-300">
                tune
              </span>
              <span className="tracking-wide text-xs sm:text-sm font-bold">
                Show me around
              </span>
            </div>
            <div className="text-[10px] sm:text-xs font-medium text-slate-300 leading-tight mt-0.5 text-center">
              Explore charging points with filters & attributes
            </div>
          </button>
        </div>
      </div>

      {/* Bottom Status Note - Sits right above the bottom strip */}
      <div className="relative z-10 w-full max-w-6xl mx-auto pb-1 text-center text-[10px] sm:text-xs text-slate-400 shrink-0">
        <span>Singapore Land Transport Authority (LTA) Live Network</span>
      </div>
    </div>
  );
};
