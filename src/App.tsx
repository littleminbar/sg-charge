import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Station, ActiveChargingSession, PastSession } from './types/charging';
import { INITIAL_PAST_SESSIONS } from './data/pastSessions';
import { Header } from './components/Header';
import { InteractiveMap } from './components/InteractiveMap';
import { StationDetails } from './components/StationDetails';
import { ChargingSessionModal } from './components/ChargingSessionModal';
import { QRScannerModal } from './components/QRScannerModal';
import { ReservationModal } from './components/ReservationModal';
import { ReportIssueModal } from './components/ReportIssueModal';
import { PortSelectorModal } from './components/PortSelectorModal';
import { NavigationModal } from './components/NavigationModal';
import { ReviewsModal } from './components/ReviewsModal';
import { SavedTab } from './components/SavedTab';
import { ActivityTab } from './components/ActivityTab';
import { ProfileTab } from './components/ProfileTab';
import { UrgencyLaunchScreen } from './components/UrgencyLaunchScreen';
import { NearestRoutingPage } from './components/NearestRoutingPage';
import { useEvStations } from '@/api';
import { getJsonCookie, setJsonCookie, COOKIE_KEYS } from './utils/cookies';

function getDistKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

export default function App() {
  const {
    stations,
    loading: apiLoading,
    error: apiError,
    dataSource,
    refresh: refreshApi,
  } = useEvStations();

  // User real-time Geolocation service
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number }>({
    lat: 1.29027,
    lng: 103.851959, // Singapore Central coordinates default
  });
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [hasGps, setHasGps] = useState<boolean>(false);

  const requestUserLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setHasGps(true);
        setIsLocating(false);
      },
      (err) => {
        console.warn('Geolocation notice:', err.message);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  }, []);

  useEffect(() => {
    requestUserLocation();
  }, [requestUserLocation]);

  // Compute stations with genuine real-time distance from user's current GPS location
  const stationsWithRealDistance = useMemo(() => {
    if (!stations) return [];
    return stations.map((st) => {
      const dist = +(getDistKm(userLocation.lat, userLocation.lng, st.lat, st.lng)).toFixed(2);
      return {
        ...st,
        distanceKm: dist,
        driveTimeMins: Math.max(1, Math.round(dist * 2.2)),
      };
    });
  }, [stations, userLocation]);

  const [appFlowMode, setAppFlowMode] = useState<'launch' | 'routing_nearest' | 'explore'>('launch');
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [savedStationIds, setSavedStationIds] = useState<string[]>(() =>
    getJsonCookie<string[]>(COOKIE_KEYS.SAVED_STATIONS, [])
  );
  const [currentTab, setCurrentTab] = useState<'map' | 'saved' | 'activity' | 'profile'>('map');
  const [isDetailsView, setIsDetailsView] = useState<boolean>(false);

  const nearestOf = (list: Station[]) =>
    list.reduce((a, b) => ((b.distanceKm ?? Infinity) < (a.distanceKm ?? Infinity) ? b : a), list[0]);

  // Sync selected station if stations change
  useEffect(() => {
    if (stationsWithRealDistance && stationsWithRealDistance.length > 0) {
      setSelectedStation((prev) => {
        if (!prev) return nearestOf(stationsWithRealDistance);
        const found = stationsWithRealDistance.find((s: Station) => s.id === prev.id);
        return found || nearestOf(stationsWithRealDistance);
      });
    }
  }, [stationsWithRealDistance]);

  // Active charging session state
  const [activeSession, setActiveSession] = useState<ActiveChargingSession | null>(null);
  const [pastSessions, setPastSessions] = useState<PastSession[]>(() =>
    getJsonCookie<PastSession[]>(COOKIE_KEYS.PAST_SESSIONS, INITIAL_PAST_SESSIONS)
  );

  // Modals state
  const [showChargingModal, setShowChargingModal] = useState<boolean>(false);
  const [showQRScanner, setShowQRScanner] = useState<boolean>(false);
  const [showReservationModal, setShowReservationModal] = useState<boolean>(false);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [showPortSelector, setShowPortSelector] = useState<boolean>(false);
  const [showNavigationModal, setShowNavigationModal] = useState<boolean>(false);
  const [showReviewsModal, setShowReviewsModal] = useState<boolean>(false);

  // Global Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Genuine nearest available station from user's current GPS position
  const nearestStation = useMemo(() => {
    if (!stationsWithRealDistance || stationsWithRealDistance.length === 0) return null;
    const available = stationsWithRealDistance.filter((s: Station) => s.availableBays > 0);
    const pool = available.length > 0 ? available : stationsWithRealDistance;
    return [...pool].sort((a, b) => a.distanceKm - b.distanceKm)[0];
  }, [stationsWithRealDistance]);

  const handleFindNow = () => {
    if (!nearestStation) {
      showToast('connecting, do not panic, try again after 1s');
      return;
    }
    setSelectedStation(nearestStation);
    setAppFlowMode('routing_nearest');
    showToast(`Planning route from your location to ${nearestStation.name}`);
  };

  const handleShowMeAround = () => {
    setAppFlowMode('explore');
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleToggleSaveStation = (stationId: string) => {
    let nextIds: string[];
    if (savedStationIds.includes(stationId)) {
      nextIds = savedStationIds.filter((id) => id !== stationId);
      showToast('Removed from Saved Stations');
    } else {
      nextIds = [...savedStationIds, stationId];
      showToast('Saved to your favourite Singapore stations! ⚡');
    }
    setSavedStationIds(nextIds);
    setJsonCookie(COOKIE_KEYS.SAVED_STATIONS, nextIds);
  };

  const handleOpenStationDetails = (station: Station) => {
    setSelectedStation(station);
    setIsDetailsView(true);
  };

  const handleBackToMap = () => {
    setIsDetailsView(false);
    setCurrentTab('map');
  };

  const handleStartCharging = (bayCode: string, station: Station) => {
    const selectedBay = station.bays.find((b) => b.code === bayCode) || station.bays[0];
    const power = selectedBay ? selectedBay.powerKw : 50;
    const price = selectedBay && selectedBay.hasPublishedTariff ? selectedBay.pricePerKwh : undefined;
    const connType = selectedBay ? selectedBay.connectorType : 'CCS2';

    const newSession: ActiveChargingSession = {
      id: `session-${Date.now()}`,
      stationId: station.id,
      stationName: station.name,
      bayCode: selectedBay ? `Bay ${selectedBay.code} (${power}kW)` : bayCode,
      connectorType: connType,
      maxPowerKw: power,
      currentPowerKw: power,
      startedAt: new Date(),
      initialSoc: 24,
      currentSoc: 24,
      targetSoc: 80,
      energyDeliveredKwh: 0,
      pricePerKwh: price,
      hasPublishedTariff: Boolean(price && price > 0),
      voltage: 400,
      amperage: Math.round((power * 1000) / 400),
    };

    setActiveSession(newSession);
    setShowChargingModal(true);
    showToast(`Charging started at ${station.name}!`);
  };

  const handleStopCharging = (finalKwh?: number, finalCost?: number) => {
    if (activeSession) {
      const duration = Math.max(1, Math.round((Date.now() - activeSession.startedAt.getTime()) / 60000));
      const kwh = finalKwh ?? activeSession.energyDeliveredKwh;
      const rate = activeSession.pricePerKwh || 0;
      const cost = finalCost ?? +(kwh * rate).toFixed(2);

      const pastItem: PastSession = {
        id: `past-${Date.now()}`,
        stationName: activeSession.stationName,
        bayCode: activeSession.bayCode,
        durationMins: duration,
        energyKwh: kwh,
        totalCostSgd: cost,
        dateStr: 'Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        co2SavedKg: +(kwh * 0.4).toFixed(1),
      };

      const updated = [pastItem, ...pastSessions];
      setPastSessions(updated);
      setJsonCookie(COOKIE_KEYS.PAST_SESSIONS, updated);
      setActiveSession(null);
      setShowChargingModal(false);
      showToast('Charging completed! Receipt saved to Activity.');
    }
  };

  const currentScreen = isDetailsView ? 'details' : currentTab;

  // Launch screen
  if (appFlowMode === 'launch') {
    return (
      <div className="relative w-full h-[100dvh] max-h-[100dvh] overflow-hidden">
        {toastMessage && (
          <div className="pointer-events-none fixed top-4 inset-x-4 z-[200] max-w-sm mx-auto bg-[#0d1c2f] text-white p-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-semibold animate-in fade-in">
            <span className="material-symbols-outlined text-[18px] text-[#85f8c4]">check_circle</span>
            <span className="flex-1">{toastMessage}</span>
          </div>
        )}

        <UrgencyLaunchScreen
          nearestStation={nearestStation}
          onFindNow={handleFindNow}
          onShowMeAround={handleShowMeAround}
        />

        {/* Bottom Strip dynamically matched to dark Launch background */}
        <nav className="fixed bottom-0 inset-x-0 z-30 bg-[#002114]/90 backdrop-blur-md border-t border-white/10 w-full select-none">
          <div className="flex items-center justify-around py-1 px-1 sm:px-6 pb-[env(safe-area-inset-bottom)] max-w-lg sm:max-w-xl lg:max-w-2xl mx-auto">
            <button
              type="button"
              onClick={() => {
                setAppFlowMode('explore');
                setCurrentTab('map');
              }}
              className="flex-1 min-h-14 justify-center flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all cursor-pointer text-slate-300 hover:text-[#85f8c4] active:scale-95"
            >
              <span className="material-symbols-outlined text-[24px]">map</span>
              <span className="text-xs font-semibold">Explore</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAppFlowMode('explore');
                setCurrentTab('saved');
              }}
              className="flex-1 min-h-14 justify-center flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all cursor-pointer text-slate-300 hover:text-[#85f8c4] active:scale-95"
            >
              <span className="material-symbols-outlined text-[24px]">bookmark</span>
              <span className="text-xs font-semibold">Saved</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAppFlowMode('explore');
                setCurrentTab('activity');
              }}
              className="flex-1 min-h-14 justify-center flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all cursor-pointer text-slate-300 hover:text-[#85f8c4] active:scale-95 relative"
            >
              <span className="material-symbols-outlined text-[24px]">history</span>
              <span className="text-xs font-semibold">Activity</span>
              {activeSession && (
                <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-[#85f8c4] animate-ping" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setAppFlowMode('explore');
                setCurrentTab('profile');
              }}
              className="flex-1 min-h-14 justify-center flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all cursor-pointer text-slate-300 hover:text-[#85f8c4] active:scale-95"
            >
              <span className="material-symbols-outlined text-[24px]">person</span>
              <span className="text-xs font-semibold">Profile</span>
            </button>
          </div>
        </nav>
      </div>
    );
  }

  // Direct emergency nearest routing mode with embedded Google Maps
  if (appFlowMode === 'routing_nearest') {
    return (
      <>
        {toastMessage && (
          <div className="pointer-events-none fixed top-4 inset-x-4 z-[200] max-w-sm mx-auto bg-[#0d1c2f] text-white p-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-semibold animate-in fade-in">
            <span className="material-symbols-outlined text-[18px] text-[#85f8c4]">check_circle</span>
            <span className="flex-1">{toastMessage}</span>
          </div>
        )}

        <NearestRoutingPage
          station={nearestStation}
          userLocation={userLocation}
          onBackToUrgency={() => setAppFlowMode('launch')}
          onShowExplore={() => setAppFlowMode('explore')}
          onStartCharging={(bay) => {
            if (nearestStation) {
              handleStartCharging(bay, nearestStation);
            }
          }}
          onOpenReserveModal={() => setShowReservationModal(true)}
          onOpenDetails={() => {
            if (nearestStation) {
              setSelectedStation(nearestStation);
              setAppFlowMode('explore');
              setIsDetailsView(true);
            }
          }}
        />

        {showChargingModal && activeSession && (
          <ChargingSessionModal
            session={activeSession}
            onStopSession={handleStopCharging}
            onClose={() => setShowChargingModal(false)}
          />
        )}

        {showReservationModal && nearestStation && (
          <ReservationModal
            station={nearestStation}
            onConfirmReservation={(bay) => {
              showToast(`Bay ${bay} reserved for 15 minutes! Barrier lowered.`);
            }}
            onClose={() => setShowReservationModal(false)}
          />
        )}
      </>
    );
  }

  // Explore mode: landing page with options to explore EV points with their attributes
  return (
    <div className="h-[100dvh] max-h-[100dvh] overflow-hidden bg-[#f8f9ff] text-[#0d1c2f] flex flex-col justify-between selection:bg-[#85f8c4] selection:text-[#002114]">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="pointer-events-none fixed top-20 inset-x-4 z-[200] max-w-sm mx-auto bg-[#0d1c2f] text-white p-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-semibold animate-in fade-in">
          <span className="material-symbols-outlined text-[18px] text-[#85f8c4]">check_circle</span>
          <span className="flex-1">{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <Header
        currentScreen={currentScreen}
        onBackToMap={handleBackToMap}
        onGoToLaunch={() => {
          setIsDetailsView(false);
          setAppFlowMode('launch');
        }}
        onFindNearestNow={handleFindNow}
        onOpenProfile={() => {
          setIsDetailsView(false);
          setCurrentTab('profile');
        }}
        onOpenUrgency={handleFindNow}
        dataSource={dataSource}
        onRefreshApi={refreshApi}
        isLoadingApi={apiLoading}
      />

      {/* Main View Area */}
      <main className="flex-1 min-h-0 flex flex-col w-full overflow-hidden">
        {isDetailsView && selectedStation ? (
          <div className="flex-1 overflow-y-auto">
            <StationDetails
              station={selectedStation}
              onBackToMap={handleBackToMap}
              onStartNavigation={(st) => {
                setSelectedStation(st);
                setShowNavigationModal(true);
              }}
              onPlugInToStart={(bay) => handleStartCharging(bay.code, selectedStation)}
              onScanQR={() => setShowQRScanner(true)}
              onOpenPortSelector={() => setShowPortSelector(true)}
              onOpenReserveModal={() => setShowReservationModal(true)}
              onOpenReportModal={() => setShowReportModal(true)}
              onOpenReviewsModal={() => setShowReviewsModal(true)}
              isSaved={savedStationIds.includes(selectedStation.id)}
              onToggleSave={() => handleToggleSaveStation(selectedStation.id)}
            />
          </div>
        ) : (
          <>
            {currentTab === 'map' && (
              <InteractiveMap
                stations={stationsWithRealDistance}
                selectedStation={selectedStation}
                userLocation={userLocation}
                onSelectStation={(st) => setSelectedStation(st)}
                onOpenStationDetails={handleOpenStationDetails}
                onStartNavigation={(st) => {
                  setSelectedStation(st);
                  setShowNavigationModal(true);
                }}
                savedStationIds={savedStationIds}
                onToggleSaveStation={handleToggleSaveStation}
                onLocateUser={requestUserLocation}
                isLocating={isLocating}
              />
            )}

            {currentTab === 'saved' && (
              <SavedTab
                stations={stationsWithRealDistance}
                savedStationIds={savedStationIds}
                onSelectStation={(st) => {
                  setSelectedStation(st);
                  setCurrentTab('map');
                }}
                onOpenDetails={handleOpenStationDetails}
                onToggleSave={handleToggleSaveStation}
              />
            )}

            {currentTab === 'activity' && (
              <ActivityTab
                activeSession={activeSession}
                pastSessions={pastSessions}
                onOpenActiveSessionModal={() => setShowChargingModal(true)}
              />
            )}

            {currentTab === 'profile' && <ProfileTab />}
          </>
        )}
      </main>

      {/* Active Charging Pill */}
      {activeSession && !showChargingModal && (
        <div
          onClick={() => setShowChargingModal(true)}
          className="fixed bottom-20 inset-x-4 z-40 max-w-md mx-auto bg-[#006948] text-white p-3 rounded-2xl shadow-xl flex items-center justify-between cursor-pointer border border-[#85f8c4]/40 animate-in slide-in-from-bottom-2"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#85f8c4] animate-ping" />
            <div>
              <div className="text-xs font-bold leading-tight">
                {activeSession.stationName} • {activeSession.bayCode}
              </div>
              <div className="text-[10px] text-emerald-200">
                {activeSession.energyDeliveredKwh} kWh delivered • {Math.round(activeSession.currentSoc)}%
              </div>
            </div>
          </div>
          <span className="material-symbols-outlined text-[20px]">chevron_right</span>
        </div>
      )}

      {/* Bottom Floating Navigation Dock */}
      {!isDetailsView && (
        <nav className="fixed bottom-0 inset-x-0 z-30 bg-[#f8f9ff]/90 backdrop-blur-md border-t border-[#dde9ff] w-full">
          <div className="flex items-center justify-around py-1 px-1 sm:px-6 pb-[env(safe-area-inset-bottom)] max-w-lg sm:max-w-xl lg:max-w-2xl mx-auto">
            <button
              type="button"
              onClick={() => setCurrentTab('map')}
              className={`flex-1 min-h-14 justify-center flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all cursor-pointer ${
                currentTab === 'map'
                  ? 'text-[#006948] font-bold'
                  : 'text-[#3d4a42] hover:text-[#0d1c2f]'
              }`}
            >
              <span
                className="material-symbols-outlined text-[24px]"
                style={{ fontVariationSettings: currentTab === 'map' ? "'FILL' 1" : "'FILL' 0" }}
              >
                map
              </span>
              <span className="text-[11px]">Explore</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentTab('saved')}
              className={`flex-1 min-h-14 justify-center flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all cursor-pointer ${
                currentTab === 'saved'
                  ? 'text-[#006948] font-bold'
                  : 'text-[#3d4a42] hover:text-[#0d1c2f]'
              }`}
            >
              <span
                className="material-symbols-outlined text-[24px]"
                style={{ fontVariationSettings: currentTab === 'saved' ? "'FILL' 1" : "'FILL' 0" }}
              >
                bookmark
              </span>
              <span className="text-[11px]">Saved</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentTab('activity')}
              className={`flex-1 min-h-14 justify-center flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all cursor-pointer relative ${
                currentTab === 'activity'
                  ? 'text-[#006948] font-bold'
                  : 'text-[#3d4a42] hover:text-[#0d1c2f]'
              }`}
            >
              <span
                className="material-symbols-outlined text-[24px]"
                style={{ fontVariationSettings: currentTab === 'activity' ? "'FILL' 1" : "'FILL' 0" }}
              >
                history
              </span>
              <span className="text-[11px]">Activity</span>
              {activeSession && (
                <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-[#006948] animate-ping" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setCurrentTab('profile')}
              className={`flex-1 min-h-14 justify-center flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all cursor-pointer ${
                currentTab === 'profile'
                  ? 'text-[#006948] font-bold'
                  : 'text-[#3d4a42] hover:text-[#0d1c2f]'
              }`}
            >
              <span
                className="material-symbols-outlined text-[24px]"
                style={{ fontVariationSettings: currentTab === 'profile' ? "'FILL' 1" : "'FILL' 0" }}
              >
                person
              </span>
              <span className="text-[11px]">Profile</span>
            </button>
          </div>
        </nav>
      )}

      {/* Modals */}
      {showChargingModal && activeSession && (
        <ChargingSessionModal
          session={activeSession}
          onStopSession={handleStopCharging}
          onClose={() => setShowChargingModal(false)}
        />
      )}

      {showQRScanner && selectedStation && (
        <QRScannerModal
          station={selectedStation}
          onScanSuccess={(code) => {
            setShowQRScanner(false);
            handleStartCharging(code, selectedStation);
          }}
          onClose={() => setShowQRScanner(false)}
        />
      )}

      {showReservationModal && selectedStation && (
        <ReservationModal
          station={selectedStation}
          onConfirmReservation={(bay) => {
            showToast(`Bay ${bay} reserved for 15 minutes! Barrier lowered.`);
          }}
          onClose={() => setShowReservationModal(false)}
        />
      )}

      {showReportModal && selectedStation && (
        <ReportIssueModal
          station={selectedStation}
          onSubmit={(_issue) => {
            setShowReportModal(false);
            showToast('Fault report submitted to Singapore LTA network.');
          }}
          onClose={() => setShowReportModal(false)}
        />
      )}

      {showPortSelector && selectedStation && (
        <PortSelectorModal
          station={selectedStation}
          onSelectBayToCharge={(bay) => {
            setShowPortSelector(false);
            handleStartCharging(bay.code, selectedStation);
          }}
          onClose={() => setShowPortSelector(false)}
        />
      )}

      {showNavigationModal && selectedStation && (
        <NavigationModal
          station={selectedStation}
          userLocation={userLocation}
          onArrived={() => {
            setShowNavigationModal(false);
            const bestBay = selectedStation.bays.find((b) => b.status === 'available') || selectedStation.bays[0];
            if (bestBay) {
              handleStartCharging(bestBay.code, selectedStation);
            } else {
              setShowPortSelector(true);
            }
          }}
          onClose={() => setShowNavigationModal(false)}
        />
      )}

      {showReviewsModal && selectedStation && (
        <ReviewsModal
          station={selectedStation}
          onClose={() => setShowReviewsModal(false)}
        />
      )}
    </div>
  );
}
