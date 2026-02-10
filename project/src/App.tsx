 import { useEffect, useState } from 'react';
import HomePage from './pages/HomePage';
import SignInPage from './pages/SignInPage';
import SignUpPage from './pages/SignUpPage';
import ResidentDashboardPage from './pages/ResidentDashboardPage';
import SecretaryDashboardPage from './pages/SecretaryDashboardPage';
import CaptainDashboardPage from './pages/CaptainDashboardPage';
import ChiefDashboardPage from './pages/ChiefDashboardPage';
import PioDashboardPage from './pages/PioDashboardPage';
import TrackStatusPage from './pages/TrackStatusPage';
import { type Route, getRouteFromPathname } from './router';

function App() {
  const [route, setRoute] = useState<Route>(() => getRouteFromPathname(window.location.pathname));

  const navigate = (to: string) => {
    window.history.pushState({}, '', to);
    setRoute(getRouteFromPathname(to));
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    const onPopState = () => {
      setRoute(getRouteFromPathname(window.location.pathname));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  if (route === 'signup') {
    return <SignUpPage onNavigate={navigate} />;
  }

  if (route === 'track') {
    return <TrackStatusPage onNavigate={navigate} />;
  }

  if (route === 'signin') {
    return <SignInPage onNavigate={navigate} />;
  }

  if (route === 'secretary') {
    return <SecretaryDashboardPage onNavigate={navigate} />;
  }

  if (route === 'captain') {
    return <CaptainDashboardPage onNavigate={navigate} />;
  }

  if (route === 'chief') {
    return <ChiefDashboardPage onNavigate={navigate} />;
  }

  if (route === 'pio') {
    return <PioDashboardPage onNavigate={navigate} />;
  }

  if (route === 'resident') {
    return <ResidentDashboardPage onNavigate={navigate} />;
  }

  return <HomePage onNavigate={navigate} />;
}

export default App;
