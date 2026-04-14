import { AlertTriangle, Volume2, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import emergencySoundUrl from '../../../EmergencySound/Philippines EAS alarm (NDRRMC-Alert).mp3';

type EmergencyAlertUpdate = {
  type: string;
  data?: Record<string, unknown> | null;
};

type EmergencyAlert = {
  id: string;
  trackingNumber: string;
  incidentType: string;
  sitio: string;
  createdAt: string;
};

function textValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return '';
}

function emergencyAlertFromUpdate(update: EmergencyAlertUpdate): EmergencyAlert | null {
  if (update.type !== 'incident' || !update.data) return null;

  const trackingNumber = textValue(update.data.tracking_number);
  const incidentType = textValue(update.data.incident_type);
  const incidentCategory = textValue(update.data.incident_category);
  const isEmergency =
    trackingNumber.toUpperCase().startsWith('EMG-') ||
    incidentType.toUpperCase().includes('EMERGENCY') ||
    incidentCategory.toUpperCase().includes('EMERGENCY');

  if (!isEmergency) return null;

  const createdAt = textValue(update.data.created_at);
  const id = textValue(update.data.id) || trackingNumber || `${incidentType}-${createdAt}`;

  return {
    id,
    trackingNumber: trackingNumber || 'Emergency report',
    incidentType: incidentType || incidentCategory || 'Emergency',
    sitio: textValue(update.data.sitio) || 'Location pending',
    createdAt,
  };
}

function parseIncidentTime(createdAt: string): number | null {
  if (!createdAt) return null;

  const parsed = new Date(createdAt.includes('T') ? createdAt : createdAt.replace(' ', 'T')).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function sortAlertsBySubmittedTime(alerts: EmergencyAlert[]): EmergencyAlert[] {
  return [...alerts].sort((a, b) => {
    const aTime = parseIncidentTime(a.createdAt) ?? 0;
    const bTime = parseIncidentTime(b.createdAt) ?? 0;
    return aTime - bTime;
  });
}

export function EmergencyAlertOverlay({
  updates,
  onOpenIncidents,
}: {
  updates: EmergencyAlertUpdate[];
  onOpenIncidents: () => void;
}) {
  const [alertQueue, setAlertQueue] = useState<EmergencyAlert[]>([]);
  const [soundBlocked, setSoundBlocked] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const alertedIncidentIdsRef = useRef<Set<string>>(new Set());
  const pollInitializedRef = useRef(false);
  const mountedAtRef = useRef(Date.now());
  const activeAlert = alertQueue[0] ?? null;
  const queuedAlerts = alertQueue.slice(1);

  useEffect(() => {
    const audio = new Audio(emergencySoundUrl);
    audio.preload = 'auto';
    audio.loop = true;
    audioRef.current = audio;

    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  const startLoopingSound = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.loop = true;
    audio.volume = 1;
    if (!audio.paused) return;

    audio.currentTime = 0;
    void audio.play().catch(() => {
      setSoundBlocked(true);
    });
  }, []);

  const enqueueAlerts = useCallback((incomingAlerts: EmergencyAlert[]) => {
    const freshAlerts = sortAlertsBySubmittedTime(incomingAlerts).filter((alert) => {
      if (alertedIncidentIdsRef.current.has(alert.id)) return false;
      alertedIncidentIdsRef.current.add(alert.id);
      return true;
    });

    if (freshAlerts.length === 0) return;

    setSoundBlocked(false);
    setAlertQueue((currentQueue) => [...currentQueue, ...freshAlerts]);
  }, []);

  useEffect(() => {
    const nextAlerts = updates
      .map(emergencyAlertFromUpdate)
      .filter((alert): alert is EmergencyAlert => Boolean(alert));

    enqueueAlerts(nextAlerts);
  }, [enqueueAlerts, updates]);

  useEffect(() => {
    if (alertQueue.length > 0) {
      startLoopingSound();
      return;
    }

    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setSoundBlocked(false);
  }, [alertQueue.length, startLoopingSound]);

  useEffect(() => {
    let stopped = false;

    const pollLatestEmergency = async () => {
      try {
        const response = await fetch('/api/incidents/list.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'ACTIVE', all: true }),
        });

        const data = (await response.json()) as { ok?: boolean; incidents?: Record<string, unknown>[] };
        if (stopped || !response.ok || !data.ok || !Array.isArray(data.incidents)) return;

        const emergencyAlerts = data.incidents
          .map((row) => emergencyAlertFromUpdate({ type: 'incident', data: row }))
          .filter((alert): alert is EmergencyAlert => Boolean(alert));

        if (!pollInitializedRef.current) {
          pollInitializedRef.current = true;

          const justSubmittedAlerts = emergencyAlerts.filter((alert) => {
            const submittedAt = parseIncidentTime(alert.createdAt);
            return submittedAt !== null && submittedAt >= mountedAtRef.current - 15000;
          });
          const justSubmittedIds = new Set(justSubmittedAlerts.map((alert) => alert.id));

          emergencyAlerts.forEach((alert) => {
            if (!justSubmittedIds.has(alert.id)) {
              alertedIncidentIdsRef.current.add(alert.id);
            }
          });

          enqueueAlerts(justSubmittedAlerts);
          return;
        }

        enqueueAlerts(emergencyAlerts);
      } catch {
        // Realtime SSE remains the primary path; polling is only a fallback.
      }
    };

    void pollLatestEmergency();
    const interval = window.setInterval(() => {
      void pollLatestEmergency();
    }, 5000);

    return () => {
      stopped = true;
      window.clearInterval(interval);
    };
  }, [enqueueAlerts]);

  const stopSound = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.loop = false;
      audio.pause();
      audio.currentTime = 0;
    }
    setSoundBlocked(false);
  }, []);

  const dismissCurrentAlert = () => {
    setAlertQueue((currentQueue) => currentQueue.slice(1));
  };

  const dismissAllAlerts = () => {
    setAlertQueue([]);
    stopSound();
  };

  const replaySound = () => {
    const audio = audioRef.current;
    if (!audio) return;

    setSoundBlocked(false);
    audio.loop = true;
    audio.pause();
    audio.currentTime = 0;
    void audio.play().catch(() => {
      setSoundBlocked(true);
    });
  };

  if (!activeAlert) return null;

  const totalAlertCount = alertQueue.length;
  const hiddenQueueCount = Math.max(0, queuedAlerts.length - 3);

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="emergency-alert-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-red-950/75 px-4 py-6 backdrop-blur-sm"
    >
      <div className="w-full max-w-xl overflow-hidden rounded-lg border-4 border-red-500 bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-3 bg-red-600 px-5 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="text-sm font-black uppercase tracking-[0.2em]">Emergency Report</div>
            {totalAlertCount > 1 ? (
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-red-600">
                {totalAlertCount} pending
              </span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={dismissCurrentAlert}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 text-white hover:bg-white/25"
            aria-label="Dismiss current emergency alert"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-8 text-center">
          <div className="relative mx-auto h-36 w-36">
            <div className="absolute inset-0 rounded-full bg-red-500/25 animate-ping" />
            <div className="relative flex h-36 w-36 items-center justify-center rounded-full bg-red-100 ring-8 ring-red-200">
              <AlertTriangle className="h-24 w-24 animate-pulse text-red-600" />
            </div>
          </div>

          <h2 id="emergency-alert-title" className="mt-7 text-3xl font-black uppercase text-red-700">
            {totalAlertCount > 1 ? 'Multiple Emergencies' : 'New Emergency'}
          </h2>
          <p className="mt-2 text-base font-semibold text-gray-900">
            {totalAlertCount > 1
              ? `${totalAlertCount} emergency reports are waiting for review.`
              : 'A resident submitted an emergency report.'}
          </p>

          <div className="mt-6 grid gap-3 text-left sm:grid-cols-2">
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="text-xs font-semibold uppercase text-red-600">Tracking Number</div>
              <div className="mt-1 break-all text-lg font-black text-gray-900">{activeAlert.trackingNumber}</div>
            </div>
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="text-xs font-semibold uppercase text-red-600">Location</div>
              <div className="mt-1 text-lg font-black text-gray-900">{activeAlert.sitio}</div>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 text-left">
            <div className="text-xs font-semibold uppercase text-gray-500">Type</div>
            <div className="mt-1 text-sm font-semibold text-gray-900">{activeAlert.incidentType}</div>
            {activeAlert.createdAt ? (
              <div className="mt-2 text-xs font-medium text-gray-500">Submitted: {activeAlert.createdAt}</div>
            ) : null}
          </div>

          {queuedAlerts.length > 0 ? (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-left">
              <div className="text-xs font-black uppercase text-red-600">Also Pending</div>
              <div className="mt-3 space-y-2">
                {queuedAlerts.slice(0, 3).map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-black text-gray-900">{alert.trackingNumber}</div>
                      <div className="truncate text-xs font-medium text-gray-500">{alert.sitio}</div>
                    </div>
                    <div className="shrink-0 text-xs font-semibold text-red-600">{alert.incidentType}</div>
                  </div>
                ))}
              </div>
              {hiddenQueueCount > 0 ? (
                <div className="mt-2 text-xs font-semibold text-red-600">
                  +{hiddenQueueCount} more emergency {hiddenQueueCount === 1 ? 'report' : 'reports'}
                </div>
              ) : null}
            </div>
          ) : null}

          {soundBlocked ? (
            <button
              type="button"
              onClick={replaySound}
              className="mt-5 inline-flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-100"
            >
              <Volume2 className="h-4 w-4" />
              Play looping emergency sound
            </button>
          ) : null}

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => {
                dismissAllAlerts();
                onOpenIncidents();
              }}
              className="rounded-lg bg-red-600 px-6 py-3 text-sm font-black uppercase text-white hover:bg-red-700"
            >
              View Incident Reports
            </button>
            {queuedAlerts.length > 0 ? (
              <button
                type="button"
                onClick={dismissCurrentAlert}
                className="rounded-lg border border-red-300 bg-red-50 px-6 py-3 text-sm font-black uppercase text-red-700 hover:bg-red-100"
              >
                Next Emergency ({queuedAlerts.length})
              </button>
            ) : null}
            <button
              type="button"
              onClick={dismissCurrentAlert}
              className="rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50"
            >
              {queuedAlerts.length > 0 ? 'Dismiss Current' : 'Dismiss'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
