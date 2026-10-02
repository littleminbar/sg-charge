import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Station } from '../types/charging';
import { getCookie, setCookie, COOKIE_KEYS } from '../utils/cookies';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface InteractiveMapProps {
  stations: Station[];
  selectedStation: Station | null;
  userLocation: { lat: number; lng: number };
  onSelectStation: (station: Station) => void;
  onOpenStationDetails: (station: Station) => void;
  onStartNavigation: (station: Station) => void;
  savedStationIds: string[];
  onToggleSaveStation: (stationId: string) => void;
  onLocateUser?: () => void;
  isLocating?: boolean;
}

interface MapCluster {
  id: string;
  areaName: string;
  lat: number;
  lng: number;
  count: number;
  availableBays: number;
  totalBays: number;
  stations: Station[];
}

// Singapore Whole Island Official Bounding Box (GeospatialWholeIsland reference)
const SINGAPORE_BOUNDS = L.latLngBounds([
  [1.15, 103.58], // Southwest (Tuas / Singapore Straits)
  [1.48, 104.08], // Northeast (Changi / Pulau Tekong)
]);

const SINGAPORE_CENTER: [number, number] = [1.29027, 103.851959];

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  stations,
  selectedStation,
  userLocation,
  onSelectStation,
  onOpenStationDetails,
  onStartNavigation,
  savedStationIds,
  onToggleSaveStation,
  onLocateUser,
  isLocating,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilterState] = useState<string>(() =>
    getCookie(COOKIE_KEYS.FILTER_PREF, 'all')
  );
  const [mapType, setMapTypeState] = useState<'roadmap' | 'satellite'>(() =>
    (getCookie(COOKIE_KEYS.MAP_TYPE, 'roadmap') as 'roadmap' | 'satellite')
  );

  const setActiveFilter = (filter: string) => {
    setActiveFilterState(filter);
    setCookie(COOKIE_KEYS.FILTER_PREF, filter);
  };

  const setMapType = (typeOrFn: 'roadmap' | 'satellite' | ((prev: 'roadmap' | 'satellite') => 'roadmap' | 'satellite')) => {
    setMapTypeState((prev) => {
      const next = typeof typeOrFn === 'function' ? typeOrFn(prev) : typeOrFn;
      setCookie(COOKIE_KEYS.MAP_TYPE, next);
      return next;
    });
  };

  const [recenteredToast, setRecenteredToast] = useState<boolean>(false);
  const [mapZoom, setMapZoom] = useState<number>(15.2); // Guaranteed 2km street-level zoom

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.LayerGroup | null>(null);
  const radarCircleRef = useRef<L.Circle | null>(null);

  // Filter stations based on search query and active quick filter
  const filteredStations = useMemo(() => {
    return stations.filter((station) => {
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        station.name.toLowerCase().includes(query) ||
        station.address.toLowerCase().includes(query) ||
        station.postalCode.includes(query) ||
        station.provider.toLowerCase().includes(query);

      if (!matchesSearch) return false;

      if (activeFilter === 'available') {
        return station.availableBays > 0;
      }
      if (activeFilter === 'sp') {
        return station.provider.toLowerCase().includes('sp');
      }
      if (activeFilter === 'cdg') {
        return station.provider.toLowerCase().includes('cdg');
      }
      return true;
    });
  }, [stations, searchQuery, activeFilter]);

  // Compute nearest available station for the floating navigation button in viewing area
  const nearestNavTarget = useMemo(() => {
    if (selectedStation) return selectedStation;
    if (filteredStations.length === 0) return null;
    const available = filteredStations.filter((s) => s.availableBays > 0);
    const pool = available.length > 0 ? available : filteredStations;
    return pool.reduce((closest, current) => {
      return current.distanceKm < closest.distanceKm ? current : closest;
    }, pool[0]);
  }, [selectedStation, filteredStations]);

  // Aggressive clustering: Group distant stations aggressively into bold regional hubs
  const { individualStations, clusters } = useMemo(() => {
    const centerLat = userLocation.lat || SINGAPORE_CENTER[0];
    const centerLng = userLocation.lng || SINGAPORE_CENTER[1];

    const nearby: Station[] = [];
    const distant: Station[] = [];

    // Force individual reveal only when searching or zoomed in close (>=16)
    const forceRevealAll = searchQuery.trim().length > 0 || mapZoom >= 16;
    // Reveal radius: ~1.8 km around center at default zoom, adapts with zoom level
    const dynamicRevealRadiusKm = mapZoom >= 15 ? 1.8 : mapZoom >= 14 ? 1.2 : 0.8;

    filteredStations.forEach((station) => {
      const dist = getDistanceKm(centerLat, centerLng, station.lat, station.lng);
      if (forceRevealAll || dist <= dynamicRevealRadiusKm) {
        nearby.push(station);
      } else {
        distant.push(station);
      }
    });

    // Aggressive geographic clustering grid size (much larger grouping)
    const gridSize =
      mapZoom <= 12
        ? 0.12 // ~13 km mega grouping (e.g. North, South, East, West)
        : mapZoom <= 13
        ? 0.075 // ~8.5 km regional grouping
        : mapZoom <= 14.5
        ? 0.045 // ~5.0 km sub-regional grouping
        : 0.025; // ~2.8 km local cluster

    const clusterMap = new Map<string, { latSum: number; lngSum: number; stations: Station[] }>();
    distant.forEach((station) => {
      const gridLat = Math.round(station.lat / gridSize) * gridSize;
      const gridLng = Math.round(station.lng / gridSize) * gridSize;
      const key = `${gridLat.toFixed(3)}_${gridLng.toFixed(3)}`;

      if (!clusterMap.has(key)) {
        clusterMap.set(key, { latSum: 0, lngSum: 0, stations: [] });
      }
      const item = clusterMap.get(key)!;
      item.latSum += station.lat;
      item.lngSum += station.lng;
      item.stations.push(station);
    });

    const clusterList: MapCluster[] = [];
    clusterMap.forEach((val, key) => {
      const count = val.stations.length;
      const avgLat = val.latSum / count;
      const avgLng = val.lngSum / count;
      const availableBays = val.stations.reduce((acc, s) => acc + s.availableBays, 0);
      const totalBays = val.stations.reduce((acc, s) => acc + s.totalBays, 0);

      // Extract regional hub name
      const firstStation = val.stations[0];
      const areaName = firstStation.zone || firstStation.address.split(' ')[0] || 'EV Hub';

      clusterList.push({
        id: key,
        areaName,
        lat: avgLat,
        lng: avgLng,
        count,
        availableBays,
        totalBays,
        stations: val.stations,
      });
    });

    return { individualStations: nearby, clusters: clusterList };
  }, [filteredStations, userLocation, mapZoom, searchQuery]);

  // Recenter to guaranteed 2km zoomed-in view
  const handleRecenter2km = useCallback(() => {
    if (onLocateUser) {
      onLocateUser();
    }
    if (!mapInstanceRef.current) return;
    const centerLat = userLocation.lat || SINGAPORE_CENTER[0];
    const centerLng = userLocation.lng || SINGAPORE_CENTER[1];

    mapInstanceRef.current.invalidateSize();
    mapInstanceRef.current.setView([centerLat, centerLng], 15.2, { animate: true });
    setRecenteredToast(true);
    setTimeout(() => setRecenteredToast(false), 2000);
  }, [onLocateUser, userLocation]);

  // Initialize Leaflet Map with Google Maps Tiles and GUARANTEED 2km zoomed-in view
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const initialCenterLat = userLocation.lat && userLocation.lng ? userLocation.lat : SINGAPORE_CENTER[0];
    const initialCenterLng = userLocation.lat && userLocation.lng ? userLocation.lng : SINGAPORE_CENTER[1];

    // Explicitly initialize directly at zoom 15.2 (2km street-level radius view)
    const map = L.map(mapContainerRef.current, {
      center: [initialCenterLat, initialCenterLng],
      zoom: 15.2,
      minZoom: 11,
      maxZoom: 19,
      maxBounds: SINGAPORE_BOUNDS,
      maxBoundsViscosity: 0.85,
      zoomControl: false,
      attributionControl: false,
      touchZoom: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      boxZoom: true,
      keyboard: true,
    });
    mapInstanceRef.current = map;

    // Google Maps Tile Layer
    const tileUrl =
      mapType === 'satellite'
        ? 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'
        : 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';
    const tileLayer = L.tileLayer(tileUrl, {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    }).addTo(map);
    tileLayerRef.current = tileLayer;

    // Layer Groups
    const markersGroup = L.layerGroup().addTo(map);
    markersLayerGroupRef.current = markersGroup;

    const userGroup = L.layerGroup().addTo(map);
    userMarkerRef.current = userGroup;

    // Guaranteed execution: Invalidate size and enforce 15.2 street zoom
    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
        mapInstanceRef.current.setView([initialCenterLat, initialCenterLng], 15.2, { animate: false });
        setMapZoom(mapInstanceRef.current.getZoom());
      }
    }, 120);

    const handleMapMovement = () => {
      setMapZoom(map.getZoom());
    };

    map.on('zoomend moveend', handleMapMovement);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update center when user GPS location arrives
  useEffect(() => {
    if (mapInstanceRef.current && userLocation.lat && userLocation.lng) {
      mapInstanceRef.current.invalidateSize();
      mapInstanceRef.current.setView([userLocation.lat, userLocation.lng], 15.2, { animate: true });
    }
  }, [userLocation.lat, userLocation.lng]);

  // Switch Tile Layer when mapType changes
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;

    const newUrl =
      mapType === 'satellite'
        ? 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'
        : 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';

    tileLayerRef.current.setUrl(newUrl);
  }, [mapType]);

  // Update User GPS Marker and visual 2km boundary circle
  useEffect(() => {
    if (!mapInstanceRef.current || !userMarkerRef.current) return;

    const group = userMarkerRef.current;
    group.clearLayers();

    if (userLocation.lat && userLocation.lng) {
      // 2.0 km Reveal Boundary Circle
      const circle = L.circle([userLocation.lat, userLocation.lng], {
        radius: 2000,
        color: '#006948',
        weight: 2,
        dashArray: '5, 8',
        fillColor: '#85f8c4',
        fillOpacity: 0.08,
        interactive: false,
      });
      radarCircleRef.current = circle;
      group.addLayer(circle);

      // User Pulse Beacon
      const userDotIcon = L.divIcon({
        className: 'user-gps-dot',
        html: `
          <div style="position:relative;width:24px;height:24px;">
            <div style="position:absolute;inset:0;border-radius:50%;background:#4285f4;opacity:0.3;animation:ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position:absolute;inset:3px;border-radius:50%;background:white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>
            <div style="position:absolute;inset:6px;border-radius:50%;background:#4285f4;"></div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const userMarker = L.marker([userLocation.lat, userLocation.lng], {
        icon: userDotIcon,
        zIndexOffset: 1000,
      });
      group.addLayer(userMarker);
    }
  }, [userLocation]);

  // Render individual stations & aggressively scaled dynamic clusters
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerGroupRef.current) return;

    const group = markersLayerGroupRef.current;
    group.clearLayers();

    // 1. Render Individual Station Pins (within 2km street view)
    individualStations.forEach((station) => {
      const isSelected = selectedStation?.id === station.id;
      const isAvailable = station.availableBays > 0;
      const bgColor = isSelected ? '#0d1c2f' : isAvailable ? '#006948' : '#475569';
      const borderColor = isSelected ? '#85f8c4' : '#ffffff';
      const textColor = '#ffffff';

      const pinHtml = `
        <div class="group cursor-pointer select-none transition-transform hover:scale-115 flex flex-col items-center">
          <div style="
            background:${bgColor};
            color:${textColor};
            border:2px solid ${borderColor};
            padding:2px 6px;
            border-radius:12px;
            box-shadow:0 3px 10px rgba(0,0,0,0.35);
            display:flex;
            align-items:center;
            gap:3px;
            font-size:10px;
            font-weight:800;
            white-space:nowrap;
            line-height:1;
          ">
            <span style="color:#85f8c4;font-size:11px;">⚡</span>
            <span>${station.availableBays}</span>
          </div>
          <div style="
            width:0;
            height:0;
            border-left:4px solid transparent;
            border-right:4px solid transparent;
            border-top:5px solid ${bgColor};
            margin-top:-1px;
          "></div>
          ${
            isSelected
              ? `<div style="
                  background:rgba(13,28,47,0.95);
                  color:#85f8c4;
                  border:1px solid #85f8c4;
                  padding:1px 5px;
                  border-radius:6px;
                  font-size:8.5px;
                  font-weight:700;
                  margin-top:2px;
                  max-width:95px;
                  overflow:hidden;
                  text-overflow:ellipsis;
                  white-space:nowrap;
                ">${station.name}</div>`
              : ''
          }
        </div>
      `;

      const stationIcon = L.divIcon({
        className: 'station-marker',
        html: pinHtml,
        iconSize: [48, 40],
        iconAnchor: [20, 28],
      });

      const marker = L.marker([station.lat, station.lng], {
        icon: stationIcon,
        zIndexOffset: isSelected ? 800 : 100,
      });

      marker.on('click', () => {
        onSelectStation(station);
        mapInstanceRef.current?.panTo([station.lat, station.lng], { animate: true, duration: 0.5 });
      });

      group.addLayer(marker);
    });

    // Aggressive scaling factor based on zoom level and station count
    const baseScale =
      mapZoom <= 12 ? 1.3 : mapZoom <= 13 ? 1.18 : mapZoom <= 14.5 ? 1.05 : 0.95;

    // 2. Render Aggressively Scaled Regional Clusters
    clusters.forEach((cluster) => {
      const hasFree = cluster.availableBays > 0;
      const clusterBg = hasFree ? '#006948' : '#3d4a42';

      // Aggressive sizing based on cluster count
      const badgeSize = cluster.count >= 15 ? 54 : cluster.count >= 6 ? 46 : 38;
      const fontSize = cluster.count >= 15 ? 15 : cluster.count >= 6 ? 13 : 11;

      const clusterHtml = `
        <div style="transform:scale(${baseScale});transform-origin:center;" class="cursor-pointer select-none transition-transform hover:scale-115 flex flex-col items-center">
          <!-- Aggressively Sized Circular Cluster Badge -->
          <div style="
            background:${clusterBg};
            color:white;
            border:3px solid white;
            width:${badgeSize}px;
            height:${badgeSize}px;
            border-radius:50%;
            display:flex;
            flex-direction:column;
            align-items:center;
            justify-content:center;
            box-shadow:0 4px 18px rgba(0,0,0,0.5);
          ">
            <span style="font-size:${fontSize}px;font-weight:900;line-height:1;">${cluster.count}</span>
            <span style="font-size:7.5px;font-weight:800;color:#85f8c4;text-transform:uppercase;line-height:1;margin-top:1px;">EV</span>
          </div>

          <!-- Bold Dynamic Cluster Reporting Pill -->
          <div style="
            background:rgba(13,28,47,0.95);
            color:#ffffff;
            border:1.5px solid rgba(255,255,255,0.25);
            padding:2.5px 8px;
            border-radius:8px;
            box-shadow:0 3px 12px rgba(0,0,0,0.4);
            font-size:9.5px;
            font-weight:800;
            white-space:nowrap;
            margin-top:3px;
            display:flex;
            align-items:center;
            gap:4px;
          ">
            <span style="color:#85f8c4;">⚡ ${cluster.availableBays} Free</span>
            <span style="color:#cbd5e1;">• ${cluster.areaName}</span>
          </div>
        </div>
      `;

      const clusterIcon = L.divIcon({
        className: 'cluster-marker',
        html: clusterHtml,
        iconSize: [96, 68],
        iconAnchor: [48, 34],
      });

      const clusterMarker = L.marker([cluster.lat, cluster.lng], {
        icon: clusterIcon,
        zIndexOffset: 300,
      });

      // Tapping cluster flies smoothly in to unpack
      clusterMarker.on('click', () => {
        if (!mapInstanceRef.current) return;
        const targetZoom = Math.min(mapInstanceRef.current.getZoom() + 2.5, 17);
        mapInstanceRef.current.flyTo([cluster.lat, cluster.lng], targetZoom, { duration: 0.6 });
      });

      group.addLayer(clusterMarker);
    });
  }, [individualStations, clusters, selectedStation, mapZoom, onSelectStation]);

  const handleResetSingapore = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.fitBounds(SINGAPORE_BOUNDS, { padding: [20, 20] });
    }
  };

  return (
    <div className="relative w-full flex-1 min-h-0 overflow-hidden bg-[#e5e3df] select-none flex flex-col justify-between">
      {/* Real Google Maps Tile Engine */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0" />

      {/* Top Floating Search & Quick Filters (Clean, Uncluttered Strip) */}
      <div className="relative z-10 p-2 sm:p-3.5 flex flex-col gap-1.5 max-w-lg sm:max-w-xl lg:max-w-2xl mx-auto w-full pointer-events-none">
        {/* Search Bar */}
        <div className="h-12 bg-white/95 backdrop-blur-md rounded-full shadow-md px-3.5 flex items-center justify-between gap-2 border border-slate-200 pointer-events-auto">
          <span className="material-symbols-outlined text-[#006948] text-[20px] shrink-0">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search postal code, mall, street..."
            className="w-full bg-transparent text-base text-[#0d1c2f] placeholder-slate-400 focus:outline-none font-medium"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="w-11 h-11 -mr-2 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[15px]">close</span>
            </button>
          )}
        </div>

        {/* Quick Filter Chips (Horizontal compact scroll, no cluttered status HUD) */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 pointer-events-auto">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`px-4 min-h-11 rounded-full text-sm font-semibold whitespace-nowrap transition-all shadow-sm cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-[#006948] text-white'
                : 'bg-white/95 text-slate-700 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            {stations.length === 0 ? 'Loading stations…' : `All (${stations.length})`}
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('available')}
            className={`px-4 min-h-11 rounded-full text-sm font-semibold whitespace-nowrap transition-all shadow-sm cursor-pointer ${
              activeFilter === 'available'
                ? 'bg-[#006948] text-white'
                : 'bg-white/95 text-slate-700 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            Available Now
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('sp')}
            className={`px-4 min-h-11 rounded-full text-sm font-semibold whitespace-nowrap transition-all shadow-sm cursor-pointer ${
              activeFilter === 'sp'
                ? 'bg-[#006948] text-white'
                : 'bg-white/95 text-slate-700 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            SP Mobility
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('cdg')}
            className={`px-4 min-h-11 rounded-full text-sm font-semibold whitespace-nowrap transition-all shadow-sm cursor-pointer ${
              activeFilter === 'cdg'
                ? 'bg-[#006948] text-white'
                : 'bg-white/95 text-slate-700 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            CDG ENGIE
          </button>
        </div>
      </div>

      {/* Recentered Toast */}
      {recenteredToast && (
        <div className="absolute top-20 inset-x-4 z-20 max-w-xs mx-auto bg-[#0d1c2f]/95 text-white px-3 py-1.5 rounded-xl text-[11px] flex items-center justify-center gap-1.5 shadow-lg backdrop-blur-md animate-in fade-in">
          <span className="material-symbols-outlined text-[#4285f4] text-[15px]">my_location</span>
          <span>Zoomed to 2.0 km street view from your location</span>
        </div>
      )}

      {/* Floating Right Map Controls (Google Maps Zoom, 2km Radius Snap, Recenter, Layer) */}
      <div className="absolute right-2.5 sm:right-4 lg:right-6 bottom-36 sm:bottom-44 z-10 flex flex-col gap-1.5">
        {/* Recenter GPS & Snap to 2km Radius */}
        <button
          type="button"
          onClick={handleRecenter2km}
          aria-label="Snap to 2km"
          title="Recenter & Snap to 2km Street View"
          className="w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center text-[#4285f4] hover:bg-blue-50 active:scale-95 transition-all border border-slate-200 cursor-pointer"
        >
          <span className={`material-symbols-outlined text-[18px] ${isLocating ? 'animate-spin' : ''}`}>
            my_location
          </span>
        </button>

        {/* Satellite / Roadmap Toggle */}
        <button
          type="button"
          onClick={() => setMapType((prev) => (prev === 'roadmap' ? 'satellite' : 'roadmap'))}
          aria-label="Toggle Satellite"
          title="Toggle Google Maps Satellite"
          className="w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center text-[#0d1c2f] hover:bg-slate-50 active:scale-95 transition-all border border-slate-200 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[17px]">
            {mapType === 'roadmap' ? 'satellite_alt' : 'map'}
          </span>
        </button>

        {/* Zoom Controls with 2km and 1x Presets */}
        <div className="bg-white rounded-xl shadow-md border border-slate-200 flex flex-col overflow-hidden">
          <button
            type="button"
            onClick={() => mapInstanceRef.current?.zoomIn()}
            aria-label="Zoom in"
            title="Zoom In (+)"
            className="w-12 h-11 flex items-center justify-center text-[#0d1c2f] hover:bg-slate-50 active:scale-95 transition-all border-b border-slate-100 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
          </button>
          <button
            type="button"
            onClick={() => mapInstanceRef.current?.zoomOut()}
            aria-label="Zoom out"
            title="Zoom Out (-)"
            className="w-12 h-11 flex items-center justify-center text-[#0d1c2f] hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">remove</span>
          </button>
          {/* Quick 2km Snap Button */}
          <button
            type="button"
            onClick={handleRecenter2km}
            aria-label="2km Radius View"
            title="Snap to 2km Street View"
            className="w-12 h-10 flex items-center justify-center text-[#006948] hover:bg-emerald-50 active:scale-95 transition-all text-[9.5px] font-black border-t border-slate-100 cursor-pointer"
          >
            2km
          </button>
          {/* Whole Island 1x Snap */}
          <button
            type="button"
            onClick={handleResetSingapore}
            aria-label="Reset Zoom"
            title="Fit Whole Singapore Island"
            className="w-12 h-10 flex items-center justify-center text-slate-600 hover:bg-slate-50 active:scale-95 transition-all text-[10px] font-bold border-t border-slate-100 cursor-pointer"
          >
            1x
          </button>
        </div>
      </div>

      {/* Bottom Place Card (In-App Selection & Location Card with Navigate Button) */}
      {(() => {
        const activeCardStation = selectedStation || nearestNavTarget;
        if (!activeCardStation) return null;
        return (
          <div className="relative z-20 mb-16 sm:mb-20 px-2.5 sm:px-4 max-w-lg sm:max-w-xl lg:max-w-2xl mx-auto w-full pointer-events-auto">
            <div className="bg-white/95 backdrop-blur-md rounded-2xl p-3 shadow-xl border border-slate-200 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-1.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded-full bg-[#85f8c4] text-[#002114] text-[9px] font-bold">
                      {activeCardStation.provider}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      {activeCardStation.distanceKm} km away • ~{activeCardStation.driveTimeMins} mins drive
                    </span>
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-[#0d1c2f] mt-0.5 truncate" title={activeCardStation.name}>
                    {activeCardStation.name}
                  </h3>
                  <p className="text-[10px] text-slate-500 truncate" title={activeCardStation.address}>{activeCardStation.address}</p>
                </div>

                <button
                  type="button"
                  onClick={() => onToggleSaveStation(activeCardStation.id)}
                  className="w-11 h-11 rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 active:scale-95 cursor-pointer shrink-0"
                >
                  <span
                    className="material-symbols-outlined text-[26px]"
                    style={{
                      fontVariationSettings: savedStationIds.includes(activeCardStation.id) ? "'FILL' 1" : "'FILL' 0",
                      color: savedStationIds.includes(activeCardStation.id) ? '#ba1a1a' : undefined,
                    }}
                  >
                    bookmark
                  </span>
                </button>
              </div>

              {/* Availability & Charger Info */}
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <div className="p-1.5 rounded-lg bg-slate-50 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-medium">Bays</span>
                  <span className="font-bold text-[#006948] text-[11px]">
                    {activeCardStation.availableBays} / {activeCardStation.totalBays} Free
                  </span>
                </div>
                <div className="p-1.5 rounded-lg bg-slate-50 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-medium">Max Speed</span>
                  <span className="font-bold text-[#0d1c2f] text-[11px]">
                    {activeCardStation.connectors[0]?.powerKw || 22} kW
                  </span>
                </div>
              </div>

              {/* In-App Actions with Prominent Navigate Button in the location card at the bottom */}
              <div className="flex items-center gap-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => onOpenStationDetails(activeCardStation)}
                  className="min-h-12 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#0d1c2f] text-sm font-bold transition-colors cursor-pointer"
                >
                  Details
                </button>
                <button
                  type="button"
                  onClick={() => onStartNavigation(activeCardStation)}
                  className="flex-1 min-h-12 px-3 rounded-xl bg-[#006948] hover:bg-[#00855d] text-white text-base font-black flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-98 cursor-pointer border border-[#85f8c4]/30"
                >
                  <span className="material-symbols-outlined text-[17px] text-[#85f8c4]">navigation</span>
                  <span>Navigate</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
