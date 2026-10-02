import React, { useState } from 'react';
import { Station, ChargingBay } from '../types/charging';

interface StationDetailsProps {
  station: Station;
  onBackToMap: () => void;
  onStartNavigation: (station: Station) => void;
  onPlugInToStart: (bay: ChargingBay) => void;
  onScanQR: () => void;
  onOpenPortSelector: () => void;
  onOpenReserveModal: () => void;
  onOpenReportModal: () => void;
  onOpenReviewsModal: () => void;
  isSaved: boolean;
  onToggleSave: () => void;
}

export const StationDetails: React.FC<StationDetailsProps> = ({
  station,
  onBackToMap,
  onStartNavigation,
  onPlugInToStart,
  onScanQR,
  onOpenPortSelector,
  onOpenReserveModal,
  onOpenReportModal,
  onOpenReviewsModal,
  isSaved,
  onToggleSave,
}) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [notifiedBays, setNotifiedBays] = useState<string[]>([]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCopyPostal = async () => {
    try {
      await navigator.clipboard.writeText(station.postalCode);
      showToast(`Postal Code ${station.postalCode} copied to clipboard! Ready for GPS.`);
    } catch {
      showToast(`Postal code: ${station.postalCode}`);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `ChargeSG - ${station.name}`,
          text: `Charging bay available at ${station.name} (${station.availableBays}/${station.totalBays} free)`,
          url: window.location.href,
        });
        return;
      } catch {
        // fallback
      }
    }
    await navigator.clipboard.writeText(`${station.name}, ${station.address}`);
    showToast('Station details copied to clipboard!');
  };

  const handleNotifyWhenFree = (bayCode: string) => {
    if (notifiedBays.includes(bayCode)) {
      setNotifiedBays((prev) => prev.filter((b) => b !== bayCode));
      showToast(`Alert removed for Bay ${bayCode}.`);
    } else {
      setNotifiedBays((prev) => [...prev, bayCode]);
      showToast(`Push alert set for Bay ${bayCode}. We will ping you when it's free!`);
    }
  };

  return (
    <div className="flex flex-col w-full pb-32 max-w-lg sm:max-w-2xl lg:max-w-4xl mx-auto bg-[#f8f9ff]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 inset-x-4 z-50 max-w-sm mx-auto bg-[#0d1c2f] text-white p-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-semibold animate-in fade-in">
          <span className="material-symbols-outlined text-[18px] text-[#85f8c4]">check_circle</span>
          <span className="flex-1">{toastMessage}</span>
          <button
            type="button"
            className="text-slate-400 hover:text-white"
            onClick={() => setToastMessage(null)}
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* Top Navigation & Context Bar */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToMap}
          className="inline-flex items-center gap-1.5 text-[#3d4a42] hover:text-[#006948] transition-colors min-h-11 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          <span className="font-semibold text-sm">Back to Map</span>
        </button>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Favorite Station"
            onClick={onToggleSave}
            className={`w-10 h-10 rounded-full bg-[#e6eeff] flex items-center justify-center transition-colors cursor-pointer ${
              isSaved ? 'text-[#ba1a1a]' : 'text-[#3d4a42] hover:text-[#ba1a1a]'
            }`}
          >
            <span
              className="material-symbols-outlined text-[20px]"
              style={{ fontVariationSettings: isSaved ? "'FILL' 1" : "'FILL' 0" }}
            >
              {isSaved ? 'favorite' : 'favorite_border'}
            </span>
          </button>

          <button
            type="button"
            aria-label="Share Station"
            onClick={handleShare}
            className="w-10 h-10 rounded-full bg-[#e6eeff] flex items-center justify-center text-[#3d4a42] hover:text-[#006948] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">share</span>
          </button>
        </div>
      </div>

      {/* Hero Station Identity Banner */}
      <div className="px-4 pt-1 pb-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#85f8c4] text-[#002114] text-[10px] font-bold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-[#006948] animate-pulse" />
            {station.provider}
          </span>
          <span className="inline-flex items-center gap-1 text-[#3d4a42] text-xs font-medium">
            <span className="material-symbols-outlined text-[14px]">local_parking</span>
            B3 Green Bay
          </span>
        </div>

        <h2 className="text-2xl font-extrabold text-[#0d1c2f] tracking-tight leading-tight">
          {station.name}
        </h2>
        <p className="text-xs text-[#3d4a42] mt-0.5">{station.zone}</p>

        {/* Address snippet & Copy quick trigger */}
        <div className="mt-3 p-3 rounded-2xl bg-[#eff4ff] flex items-center justify-between gap-3 border border-[#dde9ff]/70">
          <div className="flex items-start gap-2 min-w-0">
            <span className="material-symbols-outlined text-[#006948] text-[18px] mt-0.5 shrink-0">
              pin_drop
            </span>
            <span className="text-xs text-[#0d1c2f] font-medium truncate">{station.address}</span>
          </div>
          <button
            type="button"
            onClick={handleCopyPostal}
            className="shrink-0 px-3 min-h-11 rounded-lg bg-[#d5e3fd] text-[#0d1c2f] text-sm font-bold active:scale-95 transition-transform flex items-center gap-1 hover:bg-[#cce5ff] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[14px]">content_copy</span>
            <span>Copy</span>
          </button>
        </div>

        {/* Quick Status Pill Banner */}
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded-2xl bg-[#eff4ff] flex flex-col items-center justify-center border border-[#dde9ff]/50">
            <span className="text-[10px] text-[#3d4a42] uppercase font-bold tracking-wider">
              Access
            </span>
            <span className="text-xs text-[#006948] font-bold flex items-center gap-0.5 mt-0.5">
              <span className="material-symbols-outlined text-[14px]">schedule</span> 24/7 Open
            </span>
          </div>

          <div className="p-2 rounded-2xl bg-[#85f8c4]/40 flex flex-col items-center justify-center border border-[#68dba9]/30">
            <span className="text-[10px] text-[#005137] uppercase font-bold tracking-wider">
              Available
            </span>
            <span className="text-xs text-[#006948] font-extrabold mt-0.5">
              {station.availableBays} of {station.totalBays} Free
            </span>
          </div>

          <div className="p-2 rounded-2xl bg-[#eff4ff] flex flex-col items-center justify-center border border-[#dde9ff]/50">
            <span className="text-[10px] text-[#3d4a42] uppercase font-bold tracking-wider">
              Shelter
            </span>
            <span className="text-xs text-[#0d1c2f] font-bold flex items-center gap-0.5 mt-0.5">
              <span className="material-symbols-outlined text-[14px]">roofing</span> Covered
            </span>
          </div>
        </div>
      </div>

      {/* Primary Navigation Action Deck */}
      <div className="px-4 pt-1 pb-3 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => onStartNavigation(station)}
          className="w-full min-h-14 px-4 rounded-2xl bg-[#006948] text-white shadow-md shadow-emerald-900/15 flex items-center justify-between active:scale-[0.99] transition-transform hover:bg-[#00855d] cursor-pointer"
        >
          <div className="flex items-center gap-3 text-left">
            <div className="w-9 h-9 rounded-full bg-[#00855d] flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-[20px]">navigation</span>
            </div>
            <div>
              <div className="text-sm font-bold">Start Navigation</div>
              <div className="text-xs text-[#68dba9]">{station.routeVia}</div>
            </div>
          </div>
          <span className="material-symbols-outlined text-[20px]">open_in_new</span>
        </button>

        {/* Secondary Quick Controls */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onOpenReserveModal}
            className="min-h-12 px-3 rounded-2xl bg-[#dde9ff] text-[#0d1c2f] text-sm font-bold flex items-center justify-center gap-1.5 active:bg-[#d5e3fd] hover:bg-[#d5e3fd] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[#006398] text-[18px]">lock_clock</span>
            <span>Reserve (15m hold)</span>
          </button>

          <button
            type="button"
            onClick={onOpenReportModal}
            className="min-h-12 px-3 rounded-2xl bg-[#dde9ff] text-[#0d1c2f] text-sm font-bold flex items-center justify-center gap-1.5 active:bg-[#d5e3fd] hover:bg-[#d5e3fd] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[#3d4a42] text-[18px]">flag</span>
            <span>Report Issue</span>
          </button>
        </div>
      </div>

      {/* Real-Time Charger Bays Breakdown */}
      <div className="px-4 pt-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-[#0d1c2f]">Charging Bays</h3>
            <span className="px-2 py-0.5 rounded-full bg-[#d5e3fd] text-[#3d4a42] text-[10px] font-bold">
              Live Status
            </span>
          </div>
          <span className="text-xs text-[#006948] font-semibold flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">sync</span> SP Grid
          </span>
        </div>

        <div className="flex flex-col gap-2.5">
          {station.bays.map((bay) => {
            const isAvailable = bay.status === 'available';
            const isNotified = notifiedBays.includes(bay.code);

            return (
              <div
                key={bay.id}
                className={`p-3.5 rounded-2xl shadow-sm flex flex-col gap-2 border transition-all ${
                  isAvailable
                    ? 'bg-white border-[#dde9ff]/80'
                    : 'bg-[#eff4ff] border-[#dde9ff]/60 opacity-95'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${
                        isAvailable
                          ? 'bg-[#85f8c4] text-[#002114]'
                          : 'bg-[#d5e3fd] text-[#3d4a42]'
                      }`}
                    >
                      {bay.code}
                    </span>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-[#0d1c2f]">
                          {bay.powerKw} kW {bay.category}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            bay.connectorType === 'CCS2'
                              ? 'bg-[#cce5ff] text-[#001d31]'
                              : 'bg-[#dde9ff] text-[#0d1c2f]'
                          }`}
                        >
                          {bay.connectorType}
                        </span>
                      </div>

                      <p className="text-xs text-[#3d4a42]">
                        {isAvailable ? (
                          <>
                            {bay.hasPublishedTariff && bay.pricePerKwh !== undefined ? (
                              <span className="text-[#006948] font-bold">
                                S${bay.pricePerKwh.toFixed(3)} / kWh (Live) •{' '}
                              </span>
                            ) : (
                              <span className="text-amber-800 font-bold">
                                ~S${(bay.pricePerKwh || (bay.category.includes('DC') ? 0.65 : 0.55)).toFixed(3)} / kWh (Nominal rate) •{' '}
                              </span>
                            )}
                            {bay.provider}
                          </>
                        ) : (
                          <>{bay.currentVehicle || 'Vehicle'} • {bay.batteryPercent ?? 80}% Charged</>
                        )}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                      isAvailable
                        ? 'bg-[#85f8c4] text-[#002114]'
                        : 'bg-[#ffdad6] text-[#ba1a1a]'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isAvailable ? 'bg-[#006948]' : 'bg-[#ba1a1a]'
                      }`}
                    />
                    {isAvailable ? 'Available' : 'In Use'}
                  </span>
                </div>

                {/* Progress bar if In Use */}
                {!isAvailable && bay.batteryPercent !== undefined && (
                  <div className="w-full bg-[#d5e3fd] rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-[#006398] h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${bay.batteryPercent}%` }}
                    />
                  </div>
                )}

                {/* Actions row */}
                <div className="flex items-center justify-between pt-1">
                  {isAvailable ? (
                    <>
                      <span className="text-xs text-[#006948] font-semibold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">bolt</span>
                        Ready to plug
                      </span>
                      <button
                        type="button"
                        onClick={() => onPlugInToStart(bay)}
                        className="px-4 min-h-11 rounded-xl bg-[#006948] text-white text-sm font-bold active:opacity-90 hover:bg-[#00855d] transition-colors cursor-pointer"
                      >
                        Plug In to Start
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-xs text-[#3d4a42] flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">timer</span>
                        ~{bay.minsRemaining} mins remaining
                      </span>
                      <button
                        type="button"
                        onClick={() => handleNotifyWhenFree(bay.code)}
                        className={`text-xs font-bold hover:underline cursor-pointer ${
                          isNotified ? 'text-[#006948]' : 'text-[#006398]'
                        }`}
                      >
                        {isNotified ? '✓ Notification Set' : 'Notify When Free'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pricing & Tariffs Breakdown */}
      <div className="px-4 pt-5">
        <div className="p-4 rounded-3xl bg-white shadow-sm flex flex-col gap-3 border border-[#dde9ff]/80">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[#0d1c2f]">Tariff Information</h3>
            <span className="material-symbols-outlined text-[#006948] text-[20px]">payments</span>
          </div>

          {/* Live Data vs Nominal Rate Indicator */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-[#3d4a42]">Data Source:</span>
            {station.tariffs.hasPublishedTariff ? (
              <span className="px-2 py-0.5 rounded-full bg-[#85f8c4]/30 border border-[#85f8c4] text-[#002114] text-[10px] font-extrabold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#006948] animate-pulse" />
                Live Data Feed (Operator Published)
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-extrabold flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px] text-amber-700">info</span>
                Nominal Rate (Indicative Market Benchmark)
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-2xl bg-[#eff4ff] flex flex-col border border-[#dde9ff]/80">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#3d4a42] font-semibold">DC Fast Charging</span>
                {station.tariffs.hasPublishedTariff ? (
                  <span className="text-[9px] font-extrabold text-[#006948] bg-[#85f8c4]/40 px-1.5 py-0.5 rounded">Live</span>
                ) : (
                  <span className="text-[9px] font-extrabold text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded">Nominal Rate</span>
                )}
              </div>
              <span className="text-lg text-[#0d1c2f] font-extrabold mt-0.5">
                S${(station.tariffs.dcPrice ?? 0.650).toFixed(3)}
              </span>
              <span className="text-[10px] text-[#3d4a42]">
                {station.tariffs.hasPublishedTariff ? 'per kWh (Live Tariff)' : 'per kWh (Nominal Rate)'}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-[#eff4ff] flex flex-col border border-[#dde9ff]/80">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#3d4a42] font-semibold">AC Normal Charging</span>
                {station.tariffs.hasPublishedTariff ? (
                  <span className="text-[9px] font-extrabold text-[#006948] bg-[#85f8c4]/40 px-1.5 py-0.5 rounded">Live</span>
                ) : (
                  <span className="text-[9px] font-extrabold text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded">Nominal Rate</span>
                )}
              </div>
              <span className="text-lg text-[#0d1c2f] font-extrabold mt-0.5">
                S${(station.tariffs.acPrice ?? 0.550).toFixed(3)}
              </span>
              <span className="text-[10px] text-[#3d4a42]">
                {station.tariffs.hasPublishedTariff ? 'per kWh (Live Tariff)' : 'per kWh (Nominal Rate)'}
              </span>
            </div>
          </div>

          {!station.tariffs.hasPublishedTariff && (
            <p className="text-[11px] text-amber-900 bg-amber-50 p-2.5 rounded-xl border border-amber-200 leading-snug">
              <strong>Notice on Nominal Rate:</strong> Operator has not published a live tariff feed to LTA for this point. Indicative Singapore market nominal rates shown (~S$0.65/kWh DC, ~S$0.55/kWh AC). Actual rate determined by operator app.
            </p>
          )}
        </div>
      </div>

      {/* Carpark Rates & Step-by-Step Location Guide */}
      <div className="px-4 pt-4">
        <div className="p-4 rounded-3xl bg-white shadow-sm flex flex-col gap-3.5 border border-[#dde9ff]/80">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[#0d1c2f]">Carpark & Access</h3>
            <span className="text-xs text-[#3d4a42] font-semibold">Tower 3 Carpark</span>
          </div>

          {/* Parking Fee Summary */}
          <div className="flex items-center gap-2.5 text-[#3d4a42] text-xs p-3 rounded-2xl bg-[#eff4ff] border border-[#dde9ff]/60">
            <span className="material-symbols-outlined text-[#0d1c2f] text-[18px] shrink-0">
              receipt_long
            </span>
            <div>
              <span className="font-bold text-[#0d1c2f]">{station.parkingFee.title}:</span>{' '}
              {station.parkingFee.description}
            </div>
          </div>

          {/* Step-by-step Drive Guide */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-[#0d1c2f]">How to find chargers:</span>
            {station.directions.map((step, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-[#3d4a42] text-xs">
                <span className="w-5 h-5 rounded-full bg-[#dde9ff] text-[#0d1c2f] flex items-center justify-center font-bold text-[11px] shrink-0">
                  {idx + 1}
                </span>
                <span className="leading-relaxed">{step}</span>
              </div>
            ))}
          </div>

          {/* Visual Context Photo of Carpark Location */}
          <div className="w-full h-36 rounded-2xl overflow-hidden shadow-inner relative border border-[#dde9ff]">
            <img
              src={station.photoUrl}
              alt="Underground well-lit Singapore modern luxury shopping mall carpark with green painted electric vehicle charging bays clearly marked pillars"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg bg-[#233144]/85 backdrop-blur-md text-[#ebf1ff] text-[10px] font-bold">
              {station.photoCaption}
            </div>
          </div>
        </div>
      </div>

      {/* Verified Amenities Nearby */}
      <div className="px-4 pt-4">
        <h3 className="text-base font-bold text-[#0d1c2f] mb-2">Amenities While Charging</h3>
        <div className="grid grid-cols-2 gap-2">
          {station.amenities.map((amenity, idx) => (
            <div
              key={idx}
              className="p-3 rounded-2xl bg-white shadow-sm flex items-center gap-2.5 border border-[#dde9ff]/70"
            >
              <span className="material-symbols-outlined text-[#006398] text-[20px] shrink-0">
                {amenity.icon}
              </span>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-[#0d1c2f] truncate">{amenity.title}</span>
                <span className="text-[10px] text-[#3d4a42] truncate">{amenity.sub}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Community Feedback & Driver Check-ins */}
      <div className="px-4 pt-4 mb-3">
        <div className="p-4 rounded-3xl bg-white shadow-sm flex flex-col gap-2.5 border border-[#dde9ff]/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#006948] text-[20px]">
                verified
              </span>
              <span className="text-sm font-bold text-[#0d1c2f]">
                {station.reviews.length > 0
                  ? `${station.reviews.length} Verified Reviews`
                  : 'LTA DataMall Verified'}
              </span>
            </div>
            <button
              type="button"
              onClick={onOpenReviewsModal}
              className="text-xs text-[#006948] font-bold hover:underline cursor-pointer"
            >
              {station.reviews.length > 0 ? 'See all' : 'Add Check-in'}
            </button>
          </div>

          {station.reviews.length === 0 ? (
            <div className="p-3 rounded-2xl bg-[#eff4ff] text-xs text-[#3d4a42]">
              No driver reviews submitted yet for this charging hub. Tap above to leave a live check-in note.
            </div>
          ) : (
            station.reviews.slice(0, 1).map((review) => (
              <div
                key={review.id}
                className="p-3 rounded-2xl bg-[#eff4ff] flex items-start gap-2.5 border border-[#dde9ff]/50"
              >
                <div className="w-8 h-8 rounded-full bg-[#00855d] text-white flex items-center justify-center font-bold text-xs shrink-0">
                  {review.author[0] || 'D'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#0d1c2f]">
                      {review.author} ({review.vehicle})
                    </span>
                    <span className="text-[10px] text-[#3d4a42]">{review.timeAgo}</span>
                  </div>
                  <p className="text-xs text-[#3d4a42] mt-0.5 leading-relaxed">{review.content}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Sticky Mobile Action Footer */}
      <div className="fixed bottom-0 inset-x-0 bg-[#f8f9ff]/90 backdrop-blur-xl shadow-[0_-8px_20px_rgba(0,0,0,0.06)] px-4 py-3 border-t border-[#dde9ff]/60 flex items-center gap-2 z-40 max-w-lg mx-auto">
        <button
          type="button"
          onClick={onOpenPortSelector}
          className="px-4 min-h-14 rounded-2xl bg-[#d5e3fd] text-[#0d1c2f] text-sm font-bold flex items-center gap-1.5 shrink-0 active:scale-95 transition-transform hover:bg-[#cce5ff] cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">tune</span>
          <span>Port</span>
        </button>

        <button
          type="button"
          onClick={onScanQR}
          className="flex-1 min-h-14 px-4 rounded-2xl bg-[#006948] text-white text-base font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-900/15 active:scale-[0.99] transition-transform hover:bg-[#00855d] cursor-pointer"
        >
          <span className="material-symbols-outlined text-[22px]">qr_code_scanner</span>
          <span>Scan QR to Charge</span>
        </button>
      </div>
    </div>
  );
};
