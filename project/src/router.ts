export type Route = 'home' | 'signin' | 'signup' | 'track' | 'emergency-report' | 'secretary' | 'resident' | 'captain' | 'chief' | 'pio' | 'superadmin';

export function getRouteFromPathname(pathname: string): Route {
  if (pathname === '/signup') return 'signup';
  if (pathname === '/track') return 'track';
  if (pathname === '/emergency-report') return 'emergency-report';
  if (pathname === '/signin') return 'signin';
  if (pathname === '/superadmin') return 'superadmin';
  if (pathname === '/secretary') return 'secretary';
  if (pathname === '/captain') return 'captain';
  if (pathname === '/chief') return 'chief';
  if (pathname === '/pio') return 'pio';
  if (pathname === '/resident') return 'resident';
  return 'home';
}
