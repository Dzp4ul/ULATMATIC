export type Route = 'home' | 'signin' | 'signup' | 'secretary' | 'resident' | 'captain' | 'chief' | 'pio';

export function getRouteFromPathname(pathname: string): Route {
  if (pathname === '/signup') return 'signup';
  if (pathname === '/signin') return 'signin';
  if (pathname === '/secretary') return 'secretary';
  if (pathname === '/captain') return 'captain';
  if (pathname === '/chief') return 'chief';
  if (pathname === '/pio') return 'pio';
  if (pathname === '/resident') return 'resident';
  return 'home';
}
