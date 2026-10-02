import React, { useState, useEffect, useRef } from 'react';
import { Station } from '../types/charging';
import { fetchDrivingRoute, RouteStep } from '../utils/routeNavigation';
import { speakNavigationInstruction, stopSpeaking } from '../utils/voiceNavigation';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface NearestRoutingPageProps {
  station: Station | null;
  userLocation: { lat: number; lng: number };
  onBackToUrgency: () => void;
  onShowExplore: () => void;
  onStartCharging: (bayCode: string) => void;
  onOpenReserveModal: () => void;
  onOpenDetails: () => void;
  onStartNavigation?: () => void;
}

export const NearestRoutingPage: React.FC<NearestRoutingPageProps> = ({
  station,
  userLocation,
  onBackToUrgency,
  onShowExplore,
  onStartCharging,
  onOpenReserveModal,
  onOpenDetails,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const routeBorderRef = useRef<L.Polyline | null>(null);
  const vehicleMarkerRef = useRef<L.Marker | null>(null);

  // In-App Live Driving Navigation Mode state
  const [isLiveNavigating, setIsLiveNavigating] = useState<boolean>(false);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [navStepIndex, setNavStepIndex] = useState<number>(0);
  const [distanceRemaining, setDistanceRemaining] = useState<number>(station?.distanceKm || 1.8);
  const [minsRemaining, setMinsRemaining] = useState<number>(station?.driveTimeMins || 5);
  const [liveSpeed, setLiveSpeed] = useState<number>(48);
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);
  const [navSteps, setNavSteps] = useState<RouteStep[]>([
    { instruction: 'Head towards charging destination along road network', distance: '350m', icon: 'straight' },
    { instruction: 'Follow traffic signs across bridge / intersection', distance: '600m', icon: 'turn_right' },
    { instruction: `Follow green EV signs to ${station?.name || 'EV Bay'}`, distance: 'Arrived', icon: 'ev_station' },
  ]);

  // Fetch real road-network navigation route
  useEffect(() => {
    if (!station) return;
    const startLat = userLocation.lat || 1.29027;
    const startLng = userLocation.lng || 103.851959;

    let isCancelled = false;
    fetchDrivingRoute(startLat, startLng, station.lat, station.lng, station.name).then((routeData) => {
      if (isCancelled) return;
      setRouteCoordinates(routeData.coordinates);
      setDistanceRemaining(routeData.distanceKm);
      setMinsRemaining(routeData.durationMins);
      if (routeData.steps.length > 0) {
        setNavSteps(routeData.steps);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [station, userLocation]);

  // Initialize In-App Leaflet Google Map with real driving route
  useEffect(() => {
    if (!station || !mapContainerRef.current) return;

    const startLat = userLocation.lat || 1.29027;
    const startLng = userLocation.lng || 103.851959;
    const endLat = station.lat;
    const endLng = station.lng;

    const map = L.map(mapContainerRef.current, {
      center: [startLat, startLng],
      zoom: 14.5,
      zoomControl: false,
      attributionControl: false,
      maxBounds: L.latLngBounds([[1.15, 103.58], [1.48, 104.08]]),
    });
    mapInstanceRef.current = map;

    // Google Maps Roadmap tiles
    L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    }).addTo(map);

    // Destination Pin: Red Google Maps teardrop marker with EV bolt
    const destIcon = L.divIcon({
      className: 'dest-marker',
      html: `
        <div style="position:relative;width:34px;height:42px;display:flex;flex-direction:column;align-items:center;">
          <div style="background:#ea4335;color:white;width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(234,67,53,0.5);border:2px solid #ffffff;">
            <span style="transform:rotate(45deg);font-size:16px;font-weight:900;color:#ffffff;">⚡</span>
          </div>
          <div style="background:#0d1c2f;color:#85f8c4;padding:1px 5px;border-radius:4px;font-size:8px;font-weight:800;white-space:nowrap;margin-top:2px;box-shadow:0 2px 6px rgba(0,0,0,0.4);">
            ${station.name.slice(0, 14)}
          </div>
        </div>
      `,
      iconSize: [34, 42],
      iconAnchor: [17, 34],
    });
    L.marker([endLat, endLng], { icon: destIcon }).addTo(map);

    // Live Vehicle GPS Marker (Google Navigation 3D Chevron Arrow)
    const vehicleIcon = L.divIcon({
      className: 'vehicle-marker',
      html: `
        <div style="position:relative;width:36px;height:36px;display:flex;align-items:center;justify-content:center;">
          <div style="position:absolute;inset:0;border-radius:50%;background:#4285f4;opacity:0.3;animation:ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="background:#1a73e8;border:3px solid #ffffff;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(26,115,232,0.6);">
            <span style="color:#ffffff;font-size:18px;transform:rotate(45deg);">➤</span>
          </div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });
    const vehicleMarker = L.marker([startLat, startLng], { icon: vehicleIcon, zIndexOffset: 800 }).addTo(map);
    vehicleMarkerRef.current = vehicleMarker;

    setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      stopSpeaking();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [station, userLocation]);

  // Update map polyline whenever real road coordinates are loaded
  useEffect(() => {
    if (!mapInstanceRef.current || routeCoordinates.length === 0) return;
    const map = mapInstanceRef.current;

    if (routeBorderRef.current) map.removeLayer(routeBorderRef.current);
    if (routePolylineRef.current) map.removeLayer(routePolylineRef.current);

    // White outer casing
    const border = L.polyline(routeCoordinates, {
      color: '#ffffff',
      weight: 8,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);
    routeBorderRef.current = border;

    // Vivid Google Navigation Blue line
    const route = L.polyline(routeCoordinates, {
      color: '#1a73e8',
      weight: 5,
      opacity: 1,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);
    routePolylineRef.current = route;

    map.fitBounds(route.getBounds(), { padding: [35, 35] });
  }, [routeCoordinates]);

  // Voice Navigation announcement trigger
  useEffect(() => {
    if (!isLiveNavigating || !voiceEnabled || !station || navSteps.length === 0) return;

    const currentStep = navSteps[navStepIndex];
    if (currentStep) {
      if (currentStep.distance === 'Arrived') {
        speakNavigationInstruction(`You have arrived at ${station.name}. Connect your vehicle to start charging.`);
      } else {
        speakNavigationInstruction(`In ${currentStep.distance}, ${currentStep.instruction}`);
      }
    }
  }, [isLiveNavigating, navStepIndex, voiceEnabled, navSteps, station]);

  // Move vehicle along real road coordinates during live navigation
  useEffect(() => {
    if (!isLiveNavigating || routeCoordinates.length === 0) return;

    const timer = setInterval(() => {
      setDistanceRemaining((prev) => {
        if (prev <= 0.2) return 0.1;
        return +(prev - 0.2).toFixed(1);
      });
      setMinsRemaining((prev) => (prev > 1 ? prev - 1 : 1));
      setNavStepIndex((prev) => (prev < navSteps.length - 1 ? prev + 1 : prev));
      setLiveSpeed((prev) => Math.max(32, Math.min(62, prev + (Math.random() > 0.5 ? 2 : -3))));

      // Move marker along actual road coords
      if (vehicleMarkerRef.current && routeCoordinates.length > 2) {
        const nextCoordIdx = Math.min(
          routeCoordinates.length - 1,
          Math.floor((navStepIndex / Math.max(1, navSteps.length - 1)) * (routeCoordinates.length - 1))
        );
        const [nextLat, nextLng] = routeCoordinates[nextCoordIdx];
        vehicleMarkerRef.current.setLatLng([nextLat, nextLng]);
      }
    }, 3800);

    return () => clearInterval(timer);
  }, [isLiveNavigating, routeCoordinates, navStepIndex, navSteps.length]);

  if (!station) {
    return (
      <div className="w-full h-[100dvh] max-h-[100dvh] overflow-hidden bg-[#0d1c2f] text-white flex flex-col justify-between p-4 max-w-5xl mx-auto">
        <div className="flex items-center justify-between pt-1 pb-2 border-b border-white/10 shrink-0">
          <button
            type="button"
            onClick={onBackToUrgency}
            className="flex items-center gap-1.5 px-4 min-h-11 rounded-full bg-white/10 hover:bg-white/20 text-sm font-semibold"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Back</span>
          </button>
        </div>
        <div className="my-auto text-center flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-[#85f8c4]">
            <span className="material-symbols-outlined text-[24px]">ev_station</span>
          </div>
          <h2 className="text-lg font-bold">Connecting to EV Network</h2>
          <p className="text-xs text-slate-300 max-w-xs">
            connecting, do not panic, try again after 1s
          </p>
          <button
            type="button"
            onClick={onShowExplore}
            className="mt-3 px-6 min-h-12 rounded-full bg-[#006948] text-white text-sm font-bold"
          >
            Go to Map
          </button>
        </div>
      </div>
    );
  }

  const bestAvailableBay = station.bays.find((b) => b.status === 'available') || station.bays[0];

  const handleStartLiveDrive = () => {
    setIsLiveNavigating(true);
    if (voiceEnabled) {
      speakNavigationInstruction(`Starting route to ${station.name}. ${navSteps[0]?.instruction || 'Proceed along road corridor.'}`);
    }
  };

  const etaFormatted = new Date(Date.now() + minsRemaining * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="w-full h-[100dvh] max-h-[100dvh] overflow-hidden bg-[#0d1c2f] text-white flex flex-col justify-between p-2.5 sm:p-4 lg:p-6 selection:bg-[#85f8c4] selection:text-[#002114] select-none relative">
      <div className="w-full max-w-5xl mx-auto flex-1 flex flex-col justify-between min-h-0">
      {/* Top Header: Overview or Google Maps Navigation Maneuver Banner */}
      {isLiveNavigating ? (
        /* Real Google Maps Turn Maneuver Header with Prominent Route Time Estimate & Voice Controls */
        <div className="bg-[#005a36] p-3 rounded-2xl shadow-xl flex items-center justify-between gap-3 border border-[#85f8c4]/40 shrink-0 animate-in fade-in">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0">
              <span className="material-symbols-outlined text-[28px]">
                {navSteps[navStepIndex]?.icon || 'straight'}
              </span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#85f8c4]">
                  In {navSteps[navStepIndex]?.distance || '300m'}
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-black/30 text-white font-extrabold">
                  ~{minsRemaining}m est.
                </span>
              </div>
              <h4 className="text-xs sm:text-sm font-extrabold leading-tight text-white truncate">
                {navSteps[navStepIndex]?.instruction || 'Follow road network'}
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Voice Audio Guidance Toggle */}
            <button
              type="button"
              onClick={() => {
                setVoiceEnabled(!voiceEnabled);
                if (!voiceEnabled && navSteps[navStepIndex]) {
                  speakNavigationInstruction(`In ${navSteps[navStepIndex].distance}, ${navSteps[navStepIndex].instruction}`);
                } else {
                  stopSpeaking();
                }
              }}
              title={voiceEnabled ? 'Voice Guidance Active (Tap to Mute)' : 'Voice Muted (Tap to Unmute)'}
              className={`w-11 h-11 rounded-full flex items-center justify-center text-white active:scale-95 transition-all cursor-pointer ${
                voiceEnabled ? 'bg-[#85f8c4] text-[#002114]' : 'bg-white/15 text-slate-300 hover:bg-white/25'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">
                {voiceEnabled ? 'volume_up' : 'volume_off'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                stopSpeaking();
                setIsLiveNavigating(false);
              }}
              title="Exit Navigation"
              className="w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white active:scale-95 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>
      ) : (
        /* Standard Header */
        <div className="flex items-center justify-between pt-1 pb-2 border-b border-white/10 shrink-0">
          <button
            type="button"
            onClick={onBackToUrgency}
            className="flex items-center gap-1 px-4 min-h-11 rounded-full bg-white/10 hover:bg-white/20 text-sm font-semibold transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Back</span>
          </button>

          <div className="text-center">
            <span className="text-[9px] uppercase font-bold tracking-widest text-[#85f8c4] block leading-tight">
              Route Time Estimate: ~{minsRemaining} mins
            </span>
            <h2 className="text-xs font-bold text-white leading-tight">Nearest EV Station</h2>
          </div>

          <button
            type="button"
            onClick={onShowExplore}
            className="flex items-center gap-1 px-4 min-h-11 rounded-full bg-[#006948] hover:bg-[#00855d] text-sm font-bold text-white transition-colors cursor-pointer"
          >
            <span>Map</span>
            <span className="material-symbols-outlined text-[14px]">map</span>
          </button>
        </div>
      )}

      {/* Real Google Maps Turn-by-Turn Routing Viewport */}
      <div className="flex-1 my-1.5 flex flex-col min-h-0 relative isolate z-0 rounded-2xl overflow-hidden shadow-2xl border border-white/15 bg-slate-900">
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Speedometer HUD Floating Top-Left during navigation */}
        {isLiveNavigating && (
          <div className="absolute top-2.5 left-2.5 z-[400] p-2 rounded-2xl bg-[#0d1c2f]/95 backdrop-blur-md border border-white/20 flex items-center gap-2 shadow-lg animate-in fade-in">
            <div className="text-center px-1">
              <div className="text-xl font-black text-white font-mono leading-none">
                {liveSpeed}
              </div>
              <div className="text-[7.5px] uppercase font-bold text-[#85f8c4] tracking-widest leading-none mt-0.5">
                km/h
              </div>
            </div>
            <div className="w-px h-6 bg-white/20" />
            <div className="text-[8.5px] text-slate-300 leading-tight">
              Limit<br /><span className="font-bold text-white">60</span>
            </div>
          </div>
        )}

        {/* Floating Zoom & Controls */}
        <div className="absolute top-2.5 right-2.5 flex flex-col gap-1 z-[400]">
          <button
            type="button"
            onClick={() => mapInstanceRef.current?.zoomIn()}
            className="w-11 h-11 rounded-lg bg-[#0d1c2f]/90 text-white hover:bg-[#006948] flex items-center justify-center shadow-lg border border-white/20 active:scale-95 transition-all cursor-pointer"
            title="Zoom In"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
          </button>
          <button
            type="button"
            onClick={() => mapInstanceRef.current?.zoomOut()}
            className="w-11 h-11 rounded-lg bg-[#0d1c2f]/90 text-white hover:bg-[#006948] flex items-center justify-center shadow-lg border border-white/20 active:scale-95 transition-all cursor-pointer"
            title="Zoom Out"
          >
            <span className="material-symbols-outlined text-[16px]">remove</span>
          </button>
        </div>

        {/* Bottom Floating Route Info Pill with Prominent Route Time Estimate */}
        <div className="absolute bottom-2 inset-x-2 z-[400] flex items-center justify-between p-2 rounded-xl bg-[#0d1c2f]/95 backdrop-blur-md border border-white/20 text-xs shadow-xl">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded-full bg-[#85f8c4] animate-ping shrink-0" />
            <div className="min-w-0">
              <span className="font-extrabold text-white text-[11px] block truncate">{station.name}</span>
              <span className="text-[9.5px] text-emerald-300 font-semibold">
                Route Time Estimate: ~{minsRemaining} mins ({distanceRemaining} km) · ETA {etaFormatted}
              </span>
            </div>
          </div>

          {isLiveNavigating ? (
            <button
              type="button"
              onClick={() => setNavStepIndex((prev) => Math.min(prev + 1, navSteps.length - 1))}
              className="px-3 min-h-11 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold text-white shrink-0 active:scale-95 transition-all cursor-pointer"
            >
              Next Step →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStartLiveDrive}
              className="px-4 min-h-11 rounded-lg bg-[#1a73e8] hover:bg-[#1557b0] text-white text-sm font-black flex items-center gap-1 active:scale-95 transition-all shrink-0 cursor-pointer shadow-md"
            >
              <span className="material-symbols-outlined text-[14px]">navigation</span>
              <span>Start Drive</span>
            </button>
          )}
        </div>
      </div>

      {/* Station Overview & Route Time Estimate Card */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-2.5 border border-white/15 shadow-xl flex flex-col gap-2 shrink-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded-full bg-[#85f8c4] text-[#002114] text-[9px] font-black">
                {station.provider}
              </span>
              <span className="text-[9px] font-medium text-emerald-300 truncate">
                LTA DataMall Live Point
              </span>
            </div>
            <h3 className="text-sm font-extrabold text-white mt-0.5 truncate">{station.name}</h3>
            <p className="text-[10px] text-slate-300 truncate">{station.address}</p>
          </div>

          <div className="w-10 h-10 rounded-xl bg-[#006948] flex flex-col items-center justify-center text-white shrink-0 shadow-md">
            <span className="text-sm font-black leading-none">{station.availableBays}</span>
            <span className="text-[7px] font-bold uppercase tracking-tight text-[#85f8c4]">
              Free
            </span>
          </div>
        </div>

        {/* Highlighted Route Time Estimate Banner */}
        <div className="px-2.5 py-1.5 rounded-xl bg-[#006948]/50 border border-[#85f8c4]/30 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-[#85f8c4] font-extrabold">
            <span className="material-symbols-outlined text-[16px]">schedule</span>
            <span>Route Time Estimate:</span>
          </div>
          <div className="font-black text-white text-[11px]">
            ~{minsRemaining} mins ({distanceRemaining} km · ETA {etaFormatted})
          </div>
        </div>

        {/* Selected Bay Details Pill */}
        {bestAvailableBay && (
          <div className="p-2 rounded-xl bg-[#0d1c2f]/80 border border-white/10 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-[#85f8c4] text-[#002114] flex items-center justify-center font-bold text-[10px] shrink-0">
                {bestAvailableBay.code}
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-white truncate">
                  Bay {bestAvailableBay.code} ({bestAvailableBay.powerKw} kW {bestAvailableBay.connectorType})
                </div>
                <div className="text-[9px] text-slate-300">
                  {bestAvailableBay.hasPublishedTariff && bestAvailableBay.pricePerKwh ? (
                    <span className="text-[#85f8c4] font-semibold">
                      Live Tariff: S${bestAvailableBay.pricePerKwh.toFixed(3)}/kWh
                    </span>
                  ) : (
                    <span className="text-amber-300 font-semibold">
                      Nominal Rate: ~S${(bestAvailableBay.pricePerKwh || (bestAvailableBay.category.includes('DC') ? 0.65 : 0.55)).toFixed(3)}/kWh
                    </span>
                  )}
                </div>
              </div>
            </div>
            <span
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 ${
                bestAvailableBay.status === 'available'
                  ? 'bg-[#006948] text-[#85f8c4]'
                  : 'bg-white/10 text-slate-300'
              }`}
            >
              {bestAvailableBay.status === 'available' ? 'Available' : 'Occupied'}
            </span>
          </div>
        )}
      </div>

      {/* Immediate In-App Actions */}
      <div className="flex flex-col gap-2 pt-2 shrink-0">
        {isLiveNavigating ? (
          <button
            type="button"
            onClick={() => onStartCharging(bestAvailableBay.code)}
            className="w-full min-h-14 rounded-xl bg-[#85f8c4] text-[#002114] font-black text-base shadow-lg hover:bg-[#a6ffd6] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            <span>I Have Arrived at EV Bay (Start Charging)</span>
          </button>
        ) : (
          <>
            {bestAvailableBay && (
              <button
                type="button"
                onClick={() => onStartCharging(bestAvailableBay.code)}
                className="w-full min-h-14 rounded-xl bg-[#85f8c4] text-[#002114] font-black text-base shadow-md hover:bg-[#a6ffd6] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">bolt</span>
                <span>Plug In to Start Bay {bestAvailableBay.code}</span>
              </button>
            )}

            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={handleStartLiveDrive}
                className="min-h-12 px-2.5 rounded-xl bg-[#1a73e8] hover:bg-[#1557b0] text-white text-sm font-black transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-md"
              >
                <span className="material-symbols-outlined text-[15px]">navigation</span>
                <span>Start In-App Navigation</span>
              </button>

              <button
                type="button"
                onClick={onOpenReserveModal}
                className="min-h-12 px-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px] text-[#85f8c4]">lock_clock</span>
                <span>Reserve (15m Hold)</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onOpenDetails}
              className="min-h-11 text-center text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              View Full Station Details & Bays →
            </button>
          </>
        )}
      </div>
      </div>
    </div>
  );
};
