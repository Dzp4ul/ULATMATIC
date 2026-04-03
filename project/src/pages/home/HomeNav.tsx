import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import logo from '../../../Logo/406613648_313509771513180_7654072355038554241_n.png';

export default function HomeNav({ onNavigate, activeRoute }: { onNavigate: (to: string) => void; activeRoute?: string }) {
  const isTrack = activeRoute === 'track';
  const isHome = !isTrack;

  const [activeSection, setActiveSection] = useState('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isHome) return;
    const sections = ['contact', 'about', 'reports', 'home'];
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { threshold: 0.3 }
    );
    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [isHome]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [activeRoute]);

  const handleAnchorClick = (hash: string) => {
    setMobileMenuOpen(false);
    if (window.location.pathname !== '/') {
      onNavigate('/');
      setTimeout(() => {
        const el = document.querySelector(hash);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      const el = document.querySelector(hash);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const sectionClass = (id: string) =>
    `font-medium transition-colors border-b-2 pb-0.5 ${
      isHome && activeSection === id
        ? 'text-white border-white'
        : 'text-white/90 hover:text-white border-transparent'
    }`;

  return (
    <nav className="bg-brand shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-3">
          <button
            type="button"
            className="flex min-w-0 items-center space-x-3 text-left"
            onClick={() => {
              setMobileMenuOpen(false);
              onNavigate('/');
            }}
          >
            <img src={logo} alt="Barangay SafeReport logo" className="h-10 w-10 object-contain sm:h-12 sm:w-12" />
            <div className="min-w-0">
              <h1 className="truncate text-sm font-bold text-white sm:text-base md:text-lg">Barangay Bigte, Norzagaray, Bulacan</h1>
              <p className="hidden text-xs text-white/80 sm:block">ULATMATIC: Incident & Complaint Reporting System</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/20 text-white hover:bg-white/10 md:hidden"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <div className="hidden md:flex items-center space-x-8">
            <button type="button" onClick={() => handleAnchorClick('#home')} className={sectionClass('home')}>Home</button>
            <button type="button" onClick={() => handleAnchorClick('#reports')} className={sectionClass('reports')}>Reports</button>
            <button type="button" onClick={() => handleAnchorClick('#about')} className={sectionClass('about')}>About</button>
            <button type="button" onClick={() => handleAnchorClick('#contact')} className={sectionClass('contact')}>Contact</button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onNavigate('/track');
              }}
              className={`font-semibold transition-colors border-b-2 pb-0.5 ${isTrack ? 'text-white border-white' : 'text-white/90 hover:text-white border-transparent'}`}
            >
              Track Status
            </button>
            <div className="flex items-center space-x-3 pl-2 border-l border-white/20">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigate('/signin');
                }}
                className="text-white/90 hover:text-white font-semibold transition-colors"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigate('/signup');
                }}
                className="bg-white hover:bg-white/90 text-brand font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors"
              >
                Sign Up
              </button>
            </div>
          </div>
        </div>

        {mobileMenuOpen ? (
          <div className="border-t border-white/20 pb-4 pt-3 md:hidden">
            <div className="grid gap-2">
              <button type="button" onClick={() => handleAnchorClick('#home')} className={`rounded-lg px-3 py-2 text-left text-sm font-medium ${isHome && activeSection === 'home' ? 'bg-white/20 text-white' : 'text-white/90 hover:bg-white/10'}`}>Home</button>
              <button type="button" onClick={() => handleAnchorClick('#reports')} className={`rounded-lg px-3 py-2 text-left text-sm font-medium ${isHome && activeSection === 'reports' ? 'bg-white/20 text-white' : 'text-white/90 hover:bg-white/10'}`}>Reports</button>
              <button type="button" onClick={() => handleAnchorClick('#about')} className={`rounded-lg px-3 py-2 text-left text-sm font-medium ${isHome && activeSection === 'about' ? 'bg-white/20 text-white' : 'text-white/90 hover:bg-white/10'}`}>About</button>
              <button type="button" onClick={() => handleAnchorClick('#contact')} className={`rounded-lg px-3 py-2 text-left text-sm font-medium ${isHome && activeSection === 'contact' ? 'bg-white/20 text-white' : 'text-white/90 hover:bg-white/10'}`}>Contact</button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigate('/track');
                }}
                className={`rounded-lg px-3 py-2 text-left text-sm font-semibold ${isTrack ? 'bg-white/20 text-white' : 'text-white hover:bg-white/10'}`}
              >
                Track Status
              </button>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigate('/signin');
                  }}
                  className="rounded-lg border border-white/25 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigate('/signup');
                  }}
                  className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-brand hover:bg-white/90"
                >
                  Sign Up
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </nav>
  );
}
