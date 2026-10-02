import React, { useState } from 'react';
import { ActiveChargingSession, PastSession } from '../types/charging';

interface ActivityTabProps {
  activeSession: ActiveChargingSession | null;
  pastSessions: PastSession[];
  onOpenActiveSessionModal: () => void;
}

export const ActivityTab: React.FC<ActivityTabProps> = ({
  activeSession,
  pastSessions,
  onOpenActiveSessionModal,
}) => {
  const [selectedReceipt, setSelectedReceipt] = useState<PastSession | null>(null);

  const totalKwh = pastSessions.reduce((sum, s) => sum + s.energyKwh, 0);
  const totalSgd = pastSessions.reduce((sum, s) => sum + s.totalCostSgd, 0);
  const totalCo2 = pastSessions.reduce((sum, s) => sum + s.co2SavedKg, 0);

  return (
    <div className="flex flex-col w-full pb-24 max-w-lg sm:max-w-2xl lg:max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 gap-4 sm:gap-6">
      <div>
        <h2 className="text-xl font-extrabold text-[#0d1c2f]">Charging Activity</h2>
        <p className="text-xs text-[#3d4a42]">Monitor active charges & past Singapore network receipts</p>
      </div>

      {/* Active Session Highlight if running */}
      {activeSession && (
        <div className="p-4 rounded-3xl bg-gradient-to-r from-[#006948] to-[#00855d] text-white shadow-lg flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-[#85f8c4] animate-ping" />
              Charging Now
            </span>
            <span className="text-xs text-[#85f8c4] font-bold">{activeSession.bayCode}</span>
          </div>

          <div>
            <h3 className="text-lg font-bold">{activeSession.stationName}</h3>
            <p className="text-xs text-emerald-100">
              {activeSession.connectorType} • {activeSession.maxPowerKw}kW Max Power
            </p>
          </div>

          <div className="flex items-center justify-between bg-white/10 p-3 rounded-2xl">
            <div>
              <span className="text-[10px] text-emerald-200">Current Battery</span>
              <div className="text-2xl font-black">{Math.round(activeSession.currentSoc)}%</div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-emerald-200">Delivered</span>
              <div className="text-2xl font-black">{activeSession.energyDeliveredKwh} kWh</div>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenActiveSessionModal}
            className="w-full min-h-12 rounded-xl bg-white text-[#006948] text-sm font-bold hover:bg-emerald-50 transition-colors cursor-pointer"
          >
            Open Live Telemetry Dashboard
          </button>
        </div>
      )}

      {/* Green Impact & Summary Widget */}
      <div className="p-4 rounded-3xl bg-white shadow-sm border border-[#dde9ff] flex flex-col gap-3">
        <span className="text-xs font-bold text-[#0d1c2f] flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[#006948] text-[18px]">eco</span>
          Singapore EV Green Impact
        </span>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2.5 rounded-2xl bg-[#eff4ff]">
            <span className="text-[10px] text-[#3d4a42] font-semibold">Total Energy</span>
            <div className="text-base font-extrabold text-[#0d1c2f] mt-0.5">
              {totalKwh.toFixed(1)} <span className="text-[10px] font-normal">kWh</span>
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-[#eff4ff]">
            <span className="text-[10px] text-[#3d4a42] font-semibold">Total Spent</span>
            <div className="text-base font-extrabold text-[#0d1c2f] mt-0.5">
              S${totalSgd.toFixed(2)}
            </div>
          </div>

          <div className="p-2.5 rounded-2xl bg-[#85f8c4]/30">
            <span className="text-[10px] text-[#005137] font-semibold">CO₂ Offset</span>
            <div className="text-base font-extrabold text-[#006948] mt-0.5">
              {totalCo2.toFixed(1)} <span className="text-[10px] font-normal">kg</span>
            </div>
          </div>
        </div>
      </div>

      {/* Past Charging History */}
      <div className="flex flex-col gap-2.5">
        <span className="text-xs font-bold text-[#0d1c2f]">Recent Charging Sessions</span>

        {pastSessions.length === 0 ? (
          <div className="p-6 rounded-2xl bg-white border border-[#dde9ff] text-center flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-[#6d7a72] text-[36px]">history</span>
            <p className="text-xs font-semibold text-[#0d1c2f]">No charging sessions recorded yet</p>
            <p className="text-[11px] text-[#3d4a42]">Select any live charging bay on the map to start a charging session.</p>
          </div>
        ) : (
          pastSessions.map((session) => (
            <div
              key={session.id}
              className="p-3.5 rounded-2xl bg-white shadow-sm border border-[#dde9ff] flex items-center justify-between hover:border-[#006948] transition-all cursor-pointer"
              onClick={() => setSelectedReceipt(session)}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#eff4ff] text-[#006948] flex items-center justify-center font-bold text-xs shrink-0">
                  <span className="material-symbols-outlined text-[20px]">bolt</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#0d1c2f]">{session.stationName}</h4>
                  <p className="text-[11px] text-[#3d4a42]">
                    {session.bayCode} • {session.durationMins} mins
                  </p>
                  <span className="text-[10px] text-[#6d7a72]">{session.dateStr}</span>
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm font-extrabold text-[#0d1c2f]">
                  S${session.totalCostSgd.toFixed(2)}
                </div>
                <span className="text-[11px] text-[#006948] font-semibold">
                  +{session.energyKwh} kWh
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Receipt Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-[100] bg-[#0d1c2f]/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 flex flex-col gap-4 border border-[#dde9ff]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#006948] text-[24px]">
                  receipt
                </span>
                <h3 className="text-lg font-bold text-[#0d1c2f]">Charging Receipt</h3>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setSelectedReceipt(null)}
                className="w-11 h-11 rounded-full bg-[#eff4ff] flex items-center justify-center text-[#3d4a42]"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-[#eff4ff] flex flex-col gap-2 font-mono text-xs text-[#0d1c2f]">
              <div className="flex justify-between border-b pb-2 border-slate-200">
                <span>Station:</span>
                <span className="font-bold">{selectedReceipt.stationName}</span>
              </div>
              <div className="flex justify-between">
                <span>Bay:</span>
                <span>{selectedReceipt.bayCode}</span>
              </div>
              <div className="flex justify-between">
                <span>Date & Time:</span>
                <span>{selectedReceipt.dateStr}</span>
              </div>
              <div className="flex justify-between">
                <span>Energy Added:</span>
                <span>{selectedReceipt.energyKwh} kWh</span>
              </div>
              <div className="flex justify-between">
                <span>Duration:</span>
                <span>{selectedReceipt.durationMins} mins</span>
              </div>
              <div className="flex justify-between border-t pt-2 border-slate-200 font-bold text-sm text-[#006948]">
                <span>Total Paid (SGD):</span>
                <span>S${selectedReceipt.totalCostSgd.toFixed(2)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedReceipt(null)}
              className="w-full min-h-12 rounded-2xl bg-[#006948] text-white text-sm font-bold hover:bg-[#00855d]"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
