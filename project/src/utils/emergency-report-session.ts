const LAST_EMERGENCY_TRACKING_KEY = 'ulatmatic_last_emergency_tracking_number';

export function saveLastEmergencyTrackingNumber(trackingNumber: string): void {
  const value = trackingNumber.trim();
  if (!value) return;
  window.localStorage.setItem(LAST_EMERGENCY_TRACKING_KEY, value);
}

export function getLastEmergencyTrackingNumber(): string {
  return window.localStorage.getItem(LAST_EMERGENCY_TRACKING_KEY) ?? '';
}

export function clearLastEmergencyTrackingNumber(): void {
  window.localStorage.removeItem(LAST_EMERGENCY_TRACKING_KEY);
}

