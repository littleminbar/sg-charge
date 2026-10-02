import React, { useState } from 'react';
import { Station } from '../types/charging';

interface ReportIssueModalProps {
  station: Station;
  onSubmit: (issue: string) => void;
  onClose: () => void;
}

export const ReportIssueModal: React.FC<ReportIssueModalProps> = ({
  station,
  onSubmit,
  onClose,
}) => {
  const [category, setCategory] = useState<string>('ice_hogging');
  const [bay, setBay] = useState<string>('A1');
  const [licensePlate, setLicensePlate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [submitted, setSubmitted] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    onSubmit(`${category} at Bay ${bay} (${licensePlate})`);
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#0d1c2f]/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 flex flex-col gap-4 border border-[#dde9ff]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#ba1a1a] text-[24px]">flag</span>
            <h3 className="text-lg font-bold text-[#0d1c2f]">Report Station Issue</h3>
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

        {submitted ? (
          <div className="py-6 flex flex-col items-center text-center gap-2">
            <span className="material-symbols-outlined text-[#006948] text-[48px]">
              check_circle
            </span>
            <h4 className="text-base font-bold text-[#0d1c2f]">Report Received</h4>
            <p className="text-xs text-[#3d4a42] max-w-xs">
              Thank you for keeping Singapore's EV charging network reliable. Carpark marshals and SP Mobility have been dispatched.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div>
              <label className="text-xs font-bold text-[#0d1c2f] block mb-1">Issue Type:</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-3 rounded-2xl bg-[#eff4ff] border border-[#dde9ff] text-xs font-semibold text-[#0d1c2f] focus:outline-none"
              >
                <option value="ice_hogging">🚗 Non-EV / ICE Car Hogging Bay</option>
                <option value="finished_idle">⏱ EV Finished Charging but Hogging Bay</option>
                <option value="damaged_cable">⚡ Damaged Connector / Cable Frayed</option>
                <option value="screen_offline">💻 Pillar Screen Frozen / Reader Offline</option>
                <option value="blocked_access">🚫 Gantry or Carpark Access Blocked</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold text-[#0d1c2f] block mb-1">Bay Affected:</label>
                <select
                  value={bay}
                  onChange={(e) => setBay(e.target.value)}
                  className="w-full p-3 rounded-2xl bg-[#eff4ff] border border-[#dde9ff] text-xs font-semibold text-[#0d1c2f] focus:outline-none"
                >
                  {station.bays.map((b) => (
                    <option key={b.id} value={b.code}>
                      Bay {b.code} ({b.powerKw}kW)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-[#0d1c2f] block mb-1">
                  Vehicle Plate (optional):
                </label>
                <input
                  type="text"
                  placeholder="e.g. SLX 8888 Y"
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                  className="w-full p-3 rounded-2xl bg-[#eff4ff] border border-[#dde9ff] text-xs font-semibold text-[#0d1c2f] focus:outline-none placeholder:text-[#6d7a72]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-[#0d1c2f] block mb-1">
                Additional Details:
              </label>
              <textarea
                rows={2}
                placeholder="Briefly describe the condition or pillar status..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-3 rounded-2xl bg-[#eff4ff] border border-[#dde9ff] text-xs text-[#0d1c2f] focus:outline-none placeholder:text-[#6d7a72]"
              />
            </div>

            <button
              type="submit"
              className="w-full min-h-14 mt-1 rounded-2xl bg-[#006948] text-white font-bold text-sm shadow-md hover:bg-[#00855d] active:scale-[0.99] transition-all cursor-pointer"
            >
              Submit Report to SP Network Ops
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
