import React, { useState } from 'react';

export const ProfileTab: React.FC = () => {
  const [vehicleModel, setVehicleModel] = useState<string>('BYD Atto 3');
  const [carPlate, setCarPlate] = useState<string>('');
  const [preferredPlug, setPreferredPlug] = useState<'CCS2' | 'Type 2'>('CCS2');
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="flex flex-col w-full pb-24 max-w-lg sm:max-w-2xl lg:max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 gap-4 sm:gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-[#0d1c2f]">Driver Profile</h2>
          <p className="text-xs text-[#3d4a42]">Vehicle & Charging Preferences</p>
        </div>
        <span className="px-2.5 py-0.5 rounded-full bg-[#85f8c4] text-[#002114] text-[10px] font-bold">
          Singapore EV Network
        </span>
      </div>

      {/* Vehicle Configuration Form */}
      <form onSubmit={handleSave} className="p-4 rounded-3xl bg-white shadow-sm border border-[#dde9ff] flex flex-col gap-3.5">
        <span className="text-xs font-bold text-[#0d1c2f] flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[#006948] text-[18px]">electric_car</span>
          Vehicle Information
        </span>

        <div>
          <label className="text-[11px] font-bold text-[#3d4a42] uppercase tracking-wider block mb-1">
            Electric Vehicle Model
          </label>
          <input
            type="text"
            value={vehicleModel}
            onChange={(e) => setVehicleModel(e.target.value)}
            placeholder="e.g. BYD Atto 3, Tesla Model Y, Hyundai Ioniq 5"
            className="w-full px-3 min-h-12 text-base rounded-xl border border-slate-200 focus:outline-none focus:border-[#006948]"
          />
        </div>

        <div>
          <label className="text-[11px] font-bold text-[#3d4a42] uppercase tracking-wider block mb-1">
            Vehicle License Plate (Optional)
          </label>
          <input
            type="text"
            value={carPlate}
            onChange={(e) => setCarPlate(e.target.value.toUpperCase())}
            placeholder="e.g. SNE 1234 A"
            className="w-full px-3 min-h-12 text-base rounded-xl border border-slate-200 focus:outline-none focus:border-[#006948] uppercase"
          />
        </div>

        <div>
          <label className="text-[11px] font-bold text-[#3d4a42] uppercase tracking-wider block mb-1">
            Default Connector Standard
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPreferredPlug('CCS2')}
              className={`min-h-12 px-3 rounded-xl text-sm font-bold border transition-all ${
                preferredPlug === 'CCS2'
                  ? 'bg-[#006948] text-white border-[#006948]'
                  : 'bg-[#eff4ff] text-[#3d4a42] border-transparent hover:border-slate-300'
              }`}
            >
              CCS2 (DC Fast)
            </button>
            <button
              type="button"
              onClick={() => setPreferredPlug('Type 2')}
              className={`min-h-12 px-3 rounded-xl text-sm font-bold border transition-all ${
                preferredPlug === 'Type 2'
                  ? 'bg-[#006948] text-white border-[#006948]'
                  : 'bg-[#eff4ff] text-[#3d4a42] border-transparent hover:border-slate-300'
              }`}
            >
              Type 2 (AC)
            </button>
          </div>
        </div>

        {savedSuccess && (
          <div className="p-2.5 rounded-xl bg-[#e6f8ef] text-[#006948] text-xs font-semibold flex items-center gap-1.5 animate-in fade-in">
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            Preferences updated successfully!
          </div>
        )}

        <button
          type="submit"
          className="w-full min-h-12 rounded-xl bg-[#006948] text-white text-sm font-bold hover:bg-[#00855d] transition-colors"
        >
          Save Preferences
        </button>
      </form>

      {/* Live Data Connection Info */}
      <div className="p-4 rounded-3xl bg-white shadow-sm border border-[#dde9ff] flex flex-col gap-2">
        <span className="text-xs font-bold text-[#0d1c2f] flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[#006948] text-[18px]">dataset</span>
          LTA DataMall Singapore Feeds
        </span>
        <div className="text-[11px] text-[#3d4a42] flex flex-col gap-1.5">
          <div className="flex items-center justify-between p-2 rounded-xl bg-[#eff4ff]">
            <span>1. EVChargingPoints (Postal Code)</span>
            <span className="font-bold text-[#006948]">Active</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded-xl bg-[#eff4ff]">
            <span>2. EVCBatch (All Charging Points)</span>
            <span className="font-bold text-[#006948]">Active</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded-xl bg-[#eff4ff]">
            <span>3. GeospatialWholeIsland (SHP Layer)</span>
            <span className="font-bold text-[#006948]">Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};
