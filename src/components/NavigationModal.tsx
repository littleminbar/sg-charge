import React, { useState, useEffect, useRef } from 'react';
import { Station } from '../types/charging';
import { fetchDrivingRoute, RouteStep } from '../utils/routeNavigation';
import { speakNavigationInstruction, stopSpeaking } from '../utils/voiceNavigation';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface NavigationModalProps {
  station: Station;
  userLocation: { lat: number; lng: number };
  onArrived: () => void;
  onClose: () => void;
}

export const NavigationModal: React.FC<NavigationModalProps> = ({
  station,
  userLocation,
  onArrived,
  onClose,
}) => {
  const [distanceRemaining, setDistanceRemaining] = useState<number>(station.distanceKm);
  const [minsRemaining, setMinsRemaining] = useState<number>(station.driveTimeMins);
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [simulatedSpeed, setSimulatedSpeed] = useState<number>(48);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);
  const [steps, setSteps] = useState<RouteStep[]>([
    { instruction: 'Head towards destination along legal road network', distance: '350m', icon: 'straight' },
    { instruction: 'Follow traffic signs across bridge / intersection', distance: '500m', icon: 'turn_right' },
    { instruction: `Follow green EV bay signs to ${station.name}`, distance: 'Arrived', icon: 'ev_station' },
  ]);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const routeBorderRef = useRef<L.Polyline | null>(null);
  const carMarkerRef = useRef<L.Marker | null>(null);

  // Fetch real road-network navigation route
  useEffect(() => {
    const startLat = userLocation.lat || 1.29027;
    const startLng = userLocation.lng || 103.851959;

    let isCancelled = false;
    fetchDrivingRoute(startLat, startLng, station.lat, station.lng, station.name).then((data) => {
      if (isCancelled) return;
      setRouteCoordinates(data.coordinates);
      setDistanceRemaining(data.distanceKm);
      setMinsRemaining(data.durationMins);
      if (data.steps.length > 0) {
        setSteps(data.steps);
      }
      if (voiceEnabled) {
        speakNavigationInstruction(`Starting route to ${station.name}. ${data.steps[0]?.instruction || 'Proceed along road corridor.'}`);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [station, userLocation]);

  // Initialize in-app navigation map
  useEffect(() => {
    if (!mapContainerRef.current) return;

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
    const carIcon = L.divIcon({
      className: 'car-marker',
      html: `
        <div style="position:relative;width:36px;height:36px;display:flex;align-items:center;justify-content:center;">
          <div style="position:absolute;inset:0;border-radius:50%;background:#4285f4;opacity:0.3;animation:ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="background:#1a73e8;border:3px solid #ffffff;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(26,115,232,0.6);">
            <span style="color:#ffffff;font-size:18px;transform:rotate(45deg);">➤</span>
          </div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });
    const carMarker = L.marker([startLat, startLng], { icon: carIcon, zIndexOffset: 800 }).addTo(map);
    carMarkerRef.current = carMarker;

    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 150);

    return () => {
      stopSpeaking();
      clearTimeout(timer);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [userLocation, station]);

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
    if (!voiceEnabled || !station || steps.length === 0) return;

    const currentStep = steps[stepIndex];
    if (currentStep) {
      if (currentStep.distance === 'Arrived') {
        speakNavigationInstruction(`You have arrived at ${station.name}. Connect your vehicle to start charging.`);
      } else {
        speakNavigationInstruction(`In ${currentStep.distance}, ${currentStep.instruction}`);
      }
    }
  }, [stepIndex, voiceEnabled, steps, station]);

  // Live in-app drive simulation timer along actual road coordinates
  useEffect(() => {
    if (routeCoordinates.length === 0) return;

    const timer = setInterval(() => {
      setDistanceRemaining((prev) => {
        if (prev <= 0.2) return 0.1;
        return +(prev - 0.2).toFixed(1);
      });
      setMinsRemaining((prev) => (prev > 1 ? prev - 1 : 1));
      setStepIndex((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
      setSimulatedSpeed((prev) => Math.max(30, Math.min(65, prev + (Math.random() > 0.5 ? 2 : -3))));

      if (carMarkerRef.current && routeCoordinates.length > 2) {
        const nextCoordIdx = Math.min(
          routeCoordinates.length - 1,
          Math.floor((stepIndex / Math.max(1, steps.length - 1)) * (routeCoordinates.length - 1))
        );
        const [nextLat, nextLng] = routeCoordinates[nextCoordIdx];
        carMarkerRef.current.setLatLng([nextLat, nextLng]);
      }
    }, 4000);

    return () => clearInterval(timer);
  }, [steps.length, routeCoordinates, stepIndex]);

  const handleArrivalClick = () => {
    stopSpeaking();
    onArrived();
    onClose();
  };

  const etaFormatted = new Date(Date.now() + minsRemaining * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="fixed inset-0 z-[100] bg-[#0d1c2f] flex flex-col justify-between text-white p-2.5 sm:p-4 lg:p-6 w-full h-[100dvh] max-h-[100dvh] overflow-hidden select-none">
      <div className="w-full max-w-5xl mx-auto h-full flex flex-col justify-between min-h-0">
      {/* Top Turn Maneuver Banner (Google Maps Navigation Style) with Route Time Estimate & Voice Audio Controls */}
      <div className="bg-[#005a36] p-3 sm:p-3.5 rounded-2xl shadow-xl flex items-center justify-between gap-3 border border-[#85f8c4]/40 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0">
            <span className="material-symbols-outlined text-[26px] sm:text-[30px]">
              {steps[stepIndex]?.icon || 'straight'}
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#85f8c4]">
                In {steps[stepIndex]?.distance || '300m'}
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-black/30 text-white font-extrabold">
                ~{minsRemaining}m est.
              </span>
            </div>
            <h4 className="text-xs sm:text-sm font-extrabold leading-tight text-white truncate">
              {steps[stepIndex]?.instruction || 'Follow road network'}
            </h4>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Voice Guidance Toggle */}
          <button
            type="button"
            onClick={() => {
              setVoiceEnabled(!voiceEnabled);
              if (!voiceEnabled && steps[stepIndex]) {
                speakNavigationInstruction(`In ${steps[stepIndex].distance}, ${steps[stepIndex].instruction}`);
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
              onClose();
            }}
            className="w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white active:scale-95 transition-all shrink-0 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      </div>

      {/* Central In-App Navigation Viewport (Live Map + Speedometer HUD) */}
      <div className="relative flex-1 my-2 rounded-2xl overflow-hidden border border-white/15 bg-slate-900 shadow-2xl">
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Speedometer HUD Floating Top-Left */}
        <div className="absolute top-3 left-3 z-[400] p-2 rounded-2xl bg-[#0d1c2f]/95 backdrop-blur-md border border-white/20 flex items-center gap-2 shadow-lg">
          <div className="text-center px-1">
            <div className="text-xl font-black text-white font-mono leading-none">
              {simulatedSpeed}
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

        {/* In-App Live Driving Banner with Route Time Estimate */}
        <div className="absolute bottom-2.5 inset-x-2.5 z-[400] p-2.5 rounded-xl bg-[#0d1c2f]/95 backdrop-blur-md border border-white/20 flex items-center justify-between text-xs shadow-xl">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-[#85f8c4] animate-ping shrink-0" />
            <div className="min-w-0">
              <span className="font-extrabold text-white text-[11px] block truncate">
                {station.name}
              </span>
              <span className="text-[9.5px] text-emerald-300 font-semibold">
                Route Time Estimate: ~{minsRemaining} mins ({distanceRemaining} km) · ETA {etaFormatted}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setStepIndex((prev) => Math.min(prev + 1, steps.length - 1))}
            className="px-3 min-h-11 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold text-white shrink-0 active:scale-95 transition-all cursor-pointer"
          >
            Next Step →
          </button>
        </div>
      </div>

      {/* Bottom Route Summary & In-App Actions with Prominent Route Time Estimate */}
      <div className="bg-[#101724] p-3 sm:p-3.5 rounded-2xl flex flex-col gap-2 border border-slate-800 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-bold text-[#85f8c4] tracking-wider flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">schedule</span>
              <span>Route Time Estimate</span>
            </div>
            <div className="text-xl font-black text-white leading-tight">
              ~{minsRemaining} <span className="text-xs font-semibold text-slate-400">mins</span>
            </div>
            <div className="text-[10.5px] text-slate-300 font-medium mt-0.5">
              {distanceRemaining} km driving distance · ETA {etaFormatted}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="px-2.5 py-1 rounded-lg bg-[#006948] text-[#85f8c4] text-[10px] font-extrabold shadow-sm">
              Live GPS Route
            </span>
          </div>
        </div>

        {/* Arrival Action: Directly leads into Start Charging interface */}
        <button
          type="button"
          onClick={handleArrivalClick}
          className="w-full min-h-14 rounded-xl bg-[#85f8c4] text-[#002114] font-black text-base shadow-md hover:bg-[#a6ffd6] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer mt-1"
        >
          <span className="material-symbols-outlined text-[18px]">bolt</span>
          <span>I Have Arrived at EV Bay (Start Charging)</span>
        </button>
      </div>
      </div>
    </div>
  );
};
