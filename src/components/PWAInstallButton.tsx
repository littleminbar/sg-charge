import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'header' | 'launch';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'header' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already installed, hide the button completely
  if (isInstalled) {
    return null;
  }

  // Handle click on Install button
  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      // Show guided prompt on iOS or browsers without direct prompt API
      setShowIOSGuide(true);
    }
  };

  const isLaunch = variant === 'launch';

  // Modal content to portal directly into document.body to ensure it is never blocked
  const modalContent = showIOSGuide && typeof document !== 'undefined' ? (
    createPortal(
      <div 
        className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in select-none"
        onClick={() => setShowIOSGuide(false)}
      >
        <div 
          className="w-full max-w-sm rounded-3xl bg-[#0d1c2f] border border-white/20 p-5 text-white shadow-2xl relative z-[1000000] scale-100 transition-all"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#006948] flex items-center justify-center text-[#85f8c4] shadow-md">
                <span className="material-symbols-outlined text-[20px]">bolt</span>
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-white leading-none">Install ChargeSG</h3>
                <span className="text-[10px] text-slate-300 font-medium">Add to your Home Screen</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center text-slate-300 hover:text-white active:scale-95 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          {/* Modal Steps */}
          <div className="py-4 text-xs text-slate-200 space-y-2.5">
            <p className="font-semibold text-white text-xs">
              Install for instant one-tap launch, live offline radar, and full-screen driving navigation:
            </p>
            <div className="p-2.5 rounded-2xl bg-white/10 flex items-start gap-2.5 border border-white/5">
              <div className="w-5 h-5 rounded-full bg-[#85f8c4] text-[#002114] flex items-center justify-center font-black text-[11px] shrink-0 mt-0.5">
                1
              </div>
              <span className="text-[11px] leading-relaxed">
                Tap the <strong className="text-white font-bold">Share</strong> icon <span className="inline-block text-[#85f8c4]">⎋</span> (or the browser <strong className="text-white font-bold">⋮</strong> menu button).
              </span>
            </div>
            <div className="p-2.5 rounded-2xl bg-white/10 flex items-start gap-2.5 border border-white/5">
              <div className="w-5 h-5 rounded-full bg-[#85f8c4] text-[#002114] flex items-center justify-center font-black text-[11px] shrink-0 mt-0.5">
                2
              </div>
              <span className="text-[11px] leading-relaxed">
                Scroll down and select <strong className="text-[#85f8c4] font-bold">Add to Home Screen</strong> <span className="material-symbols-outlined text-[13px] align-middle">add_to_home_screen</span>.
              </span>
            </div>
            <div className="p-2.5 rounded-2xl bg-white/10 flex items-start gap-2.5 border border-white/5">
              <div className="w-5 h-5 rounded-full bg-[#85f8c4] text-[#002114] flex items-center justify-center font-black text-[11px] shrink-0 mt-0.5">
                3
              </div>
              <span className="text-[11px] leading-relaxed">
                Tap <strong className="text-white font-bold">Add</strong>. ChargeSG is now installed as an app on your device!
              </span>
            </div>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={() => setShowIOSGuide(false)}
            className="w-full min-h-12 rounded-xl bg-[#006948] hover:bg-[#00855d] active:scale-95 transition-all text-white font-bold text-sm shadow-md cursor-pointer"
          >
            Got it, thanks!
          </button>
        </div>
      </div>,
      document.body
    )
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        title="Install ChargeSG App to Home Screen"
        className={`flex items-center gap-1.5 rounded-full font-bold transition-all shadow-sm active:scale-95 cursor-pointer ${
          isLaunch
            ? 'px-4 min-h-11 bg-[#85f8c4] text-[#002114] text-sm hover:bg-[#a6ffd6] border border-[#85f8c4]/60'
            : 'px-3 min-h-11 min-w-11 justify-center bg-[#006948] text-white text-xs hover:bg-[#00855d] border border-white/20'
        }`}
      >
        <span className="material-symbols-outlined text-[22px]">
          install_mobile
        </span>
        <span className={isLaunch ? '' : 'hidden min-[480px]:inline'}>Install App</span>
      </button>

      {modalContent}
    </>
  );
};
