import React, { useState, useEffect } from 'react';
import { ActiveChargingSession } from '../types/charging';

interface ChargingSessionModalProps {
  session: ActiveChargingSession;
  onStopSession: (finalKwh: number, finalCost: number) => void;
  onClose: () => void;
}

export const ChargingSessionModal: React.FC<ChargingSessionModalProps> = ({
  session,
  onStopSession,
  onClose,
}) => {
  const [currentSoc, setCurrentSoc] = useState(session.currentSoc);
  const [energyKwh, setEnergyKwh] = useState(session.energyDeliveredKwh);
  const [powerKw, setPowerKw] = useState(session.currentPowerKw);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [confirmStop, setConfirmStop] = useState(false);
  const isDc = session.connectorType.includes('DC') || session.maxPowerKw >= 50;

  // Live charging simulation ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);

      // Add gradual kWh
      setEnergyKwh((prev) => +(prev + (session.maxPowerKw * 0.95) / 3600).toFixed(3));

      // Fluctuate kW slightly realistically around 115-121 kW
      setPowerKw(() => +(session.maxPowerKw * (0.95 + Math.random() * 0.05)).toFixed(1));

      // Increment battery percent every few seconds
      setCurrentSoc((prev) => {
        if (prev >= session.targetSoc) return session.targetSoc;
        return +(prev + 0.1).toFixed(1);
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [session.targetSoc, session.maxPowerKw]);

    const rateToUse = session.pricePerKwh ?? (session.connectorType.includes('DC') || session.maxPowerKw >= 50 ? 0.65 : 0.55);
    const costSgd = +(energyKwh * rateToUse).toFixed(2);
    const minsElapsed = Math.floor(secondsElapsed / 60);
    const secsRemaining = secondsElapsed % 60;

    return (
      <div className="fixed inset-0 z-[100] bg-[#0d1c2f]/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 flex flex-col gap-5 border border-[#dde9ff] max-h-[92vh] overflow-y-auto no-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#006948] animate-ping" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#006948]">
              Live Charging Session
            </span>
          </div>
          <button
            type="button"
            aria-label="Minimize"
            onClick={onClose}
            className="w-11 h-11 rounded-full bg-[#eff4ff] flex items-center justify-center text-[#3d4a42] hover:bg-[#dde9ff]"
          >
            <span className="material-symbols-outlined text-[18px]">expand_more</span>
          </button>
        </div>

        {/* Station and Bay info */}
        <div>
          <h3 className="text-xl font-extrabold text-[#0d1c2f]">{session.stationName}</h3>
          <p className="text-xs text-[#3d4a42] mt-0.5">
            {session.bayCode} • {session.connectorType} ({session.maxPowerKw}kW Max)
          </p>
        </div>

        {/* Live Battery Graphic */}
        <div className="relative p-6 rounded-3xl bg-gradient-to-b from-[#eff4ff] to-[#dde9ff] flex flex-col items-center justify-center border border-[#bccac0]/40 overflow-hidden">
          {/* Glowing pulses */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(133,248,196,0.35)_0%,transparent_70%)] pointer-events-none" />

          {/* Battery Percentage Display */}
          <div className="relative z-10 flex flex-col items-center">
            <span className="material-symbols-outlined text-[#006948] text-[32px] animate-pulse">
              bolt
            </span>
            <div className="text-5xl font-black text-[#0d1c2f] tracking-tight mt-1">
              {Math.min(Math.round(currentSoc), 100)}%
            </div>
            <span className="text-xs font-bold text-[#006948] mt-1 bg-white/80 px-3 py-0.5 rounded-full shadow-sm">
              Target: {session.targetSoc}%
            </span>
          </div>

          {/* Battery Capacity Bar */}
          <div className="w-full mt-5 relative">
            <div className="h-4 w-full bg-white/80 rounded-full overflow-hidden p-0.5 border border-[#bccac0]/50 shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-[#006948] via-[#00855d] to-[#85f8c4] rounded-full transition-all duration-300 relative overflow-hidden"
                style={{ width: `${Math.min(currentSoc, 100)}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        {/* Telemetry Dashboard Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-2xl bg-[#eff4ff] flex flex-col border border-[#dde9ff]">
            <span className="text-[11px] text-[#3d4a42] font-semibold flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px] text-[#006398]">speed</span>
              Charging Speed
            </span>
            <span className="text-xl font-black text-[#0d1c2f] mt-1">{powerKw} kW</span>
            <span className="text-[10px] text-[#3d4a42]">{isDc ? 'DC fast' : 'AC'} • {session.voltage ?? (isDc ? 400 : 230)}V • {Math.round((powerKw * 1000) / (session.voltage ?? (isDc ? 400 : 230)))}A</span>
          </div>

          <div className="p-3 rounded-2xl bg-[#eff4ff] flex flex-col border border-[#dde9ff]">
            <span className="text-[11px] text-[#3d4a42] font-semibold flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px] text-[#006948]">
                battery_charging_full
              </span>
              Energy Added
            </span>
            <span className="text-xl font-black text-[#0d1c2f] mt-1">{energyKwh.toFixed(2)} kWh</span>
            <span className="text-[10px] text-[#006948] font-bold">
              +{(energyKwh * 6.2).toFixed(1)} km range
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-[#eff4ff] flex flex-col border border-[#dde9ff]">
            <span className="text-[11px] text-[#3d4a42] font-semibold flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px] text-[#825100]">timer</span>
              Time Elapsed
            </span>
            <span className="text-xl font-black text-[#0d1c2f] mt-1">
              {minsElapsed}m {secsRemaining}s
            </span>
            <span className="text-[10px] text-[#3d4a42]">~14 mins to 80%</span>
          </div>

          <div className="p-3 rounded-2xl bg-[#eff4ff] flex flex-col border border-[#dde9ff]">
            <span className="text-[11px] text-[#3d4a42] font-semibold flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px] text-[#006948]">payments</span>
              Estimated Cost
            </span>
            <span className="text-xl font-black text-[#006948] mt-1">
              S${costSgd.toFixed(2)}
            </span>
            <span className="text-[10px] text-[#3d4a42] flex items-center gap-1 mt-0.5">
              <span>@ S${rateToUse.toFixed(3)}/kWh</span>
              {session.hasPublishedTariff ? (
                <span className="text-[8.5px] font-bold px-1.5 py-0.2 rounded bg-[#85f8c4] text-[#002114]">Live</span>
              ) : (
                <span className="text-[8.5px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300">Nominal Rate</span>
              )}
            </span>
          </div>
        </div>

        {/* Anti-Hogging Remind Policy */}
        <div className="p-2.5 rounded-xl bg-[#ffddb8]/30 flex items-center gap-2 text-[11px] text-[#2a1700]">
          <span className="material-symbols-outlined text-[#825100] text-[16px] shrink-0">info</span>
          <span>15 min grace period after 100% before S$0.50/min idle fee kicks in.</span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-1">
          {confirmStop ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmStop(false)}
                className="flex-1 min-h-14 rounded-2xl bg-[#eff4ff] text-[#0d1c2f] font-bold text-base cursor-pointer"
              >
                Keep Charging
              </button>
              <button
                type="button"
                onClick={() => onStopSession(energyKwh, costSgd)}
                className="flex-1 min-h-14 rounded-2xl bg-[#ba1a1a] text-white font-bold text-base cursor-pointer"
              >
                Yes, Stop
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmStop(true)}
              className="w-full min-h-14 rounded-2xl bg-[#ba1a1a] text-white font-bold text-base shadow-md active:scale-[0.99] transition-transform hover:bg-[#93000a] flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[22px]">stop_circle</span>
              <span>Stop Charging & Unplug</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-12 rounded-2xl bg-[#eff4ff] text-[#0d1c2f] font-semibold text-sm hover:bg-[#dde9ff] transition-colors cursor-pointer"
          >
            Keep Charging in Background
          </button>
        </div>
      </div>
    </div>
  );
};
