import React, { useState, useEffect } from 'react';
import { Station } from '../types/charging';

interface ReservationModalProps {
  station: Station;
  onConfirmReservation: (bayCode: string) => void;
  onClose: () => void;
}

export const ReservationModal: React.FC<ReservationModalProps> = ({
  station,
  onConfirmReservation,
  onClose,
}) => {
  const [selectedBay, setSelectedBay] = useState<string>('A1');
  const [isReserved, setIsReserved] = useState<boolean>(false);
  const [secondsLeft, setSecondsLeft] = useState<number>(15 * 60);

  useEffect(() => {
    let timer: any;
    if (isReserved && secondsLeft > 0) {
      timer = setInterval(() => {
        setSecondsLeft((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isReserved, secondsLeft]);

  const handleHold = () => {
    setIsReserved(true);
    onConfirmReservation(selectedBay);
  };

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;

  return (
    <div className="fixed inset-0 z-[100] bg-[#0d1c2f]/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 flex flex-col gap-4 border border-[#dde9ff]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#006398] text-[24px]">lock_clock</span>
            <h3 className="text-lg font-bold text-[#0d1c2f]">Reserve Charging Bay</h3>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="w-11 h-11 rounded-full bg-[#eff4ff] flex items-center justify-center text-[#3d4a42] hover:bg-[#dde9ff]"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div>
          <p className="text-xs text-[#3d4a42]">
            Holds a dedicated charging bay for 15 minutes while you navigate to{' '}
            <span className="font-bold text-[#0d1c2f]">{station.name}</span>.
          </p>
        </div>

        {!isReserved ? (
          <>
            {/* Choose Available Bay */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-[#0d1c2f]">Select Available Bay:</span>
              <div className="grid grid-cols-2 gap-2">
                {station.bays
                  .filter((b) => b.status === 'available')
                  .map((bay) => (
                    <button
                      key={bay.id}
                      type="button"
                      onClick={() => setSelectedBay(bay.code)}
                      className={`p-3 rounded-2xl flex flex-col items-start gap-1 border transition-all text-left ${
                        selectedBay === bay.code
                          ? 'border-[#006948] bg-[#eff4ff] ring-2 ring-[#006948]'
                          : 'border-[#dde9ff] bg-white hover:bg-[#eff4ff]'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-sm font-bold text-[#0d1c2f]">Bay {bay.code}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#85f8c4] text-[#002114]">
                          {bay.powerKw} kW
                        </span>
                      </div>
                      <span className="text-[11px] text-[#3d4a42]">{bay.connectorType} • SP Mobility</span>
                    </button>
                  ))}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-[#eff4ff] text-xs text-[#3d4a42] flex items-start gap-2 border border-[#dde9ff]">
              <span className="material-symbols-outlined text-[#006948] text-[18px] shrink-0">
                check_circle
              </span>
              <span>
                Free reservation included with your Singpass EV registered profile. No upfront deposit.
              </span>
            </div>

            <button
              type="button"
              onClick={handleHold}
              className="w-full min-h-14 rounded-2xl bg-[#006948] text-white font-bold text-sm shadow-md hover:bg-[#00855d] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">timer</span>
              <span>Confirm 15-Minute Hold</span>
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-4 py-3">
            <div className="w-16 h-16 rounded-full bg-[#85f8c4]/40 flex items-center justify-center text-[#006948]">
              <span className="material-symbols-outlined text-[36px] animate-pulse">lock</span>
            </div>

            <div className="text-center">
              <span className="text-xs uppercase font-bold text-[#006948] tracking-wider">
                Bay {selectedBay} Reserved
              </span>
              <div className="text-4xl font-black text-[#0d1c2f] mt-1 font-mono">
                {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
              </div>
              <p className="text-xs text-[#3d4a42] mt-1">
                Please arrive before time expires. The bay barrier/indicator is held for your vehicle.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full pt-2">
              <button
                type="button"
                onClick={() => setSecondsLeft((prev) => prev + 300)}
                className="flex-1 min-h-12 rounded-xl bg-[#dde9ff] text-[#0d1c2f] font-bold text-sm hover:bg-[#d5e3fd]"
              >
                +5 Mins Extension
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsReserved(false);
                  onClose();
                }}
                className="flex-1 min-h-12 rounded-xl bg-[#ffdad6] text-[#ba1a1a] font-bold text-sm hover:bg-[#ffb4ab]"
              >
                Cancel Hold
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
