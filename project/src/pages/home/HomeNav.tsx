import { useState, useEffect } from 'react';
import logo from '../../../Logo/406613648_313509771513180_7654072355038554241_n.png';

export default function HomeNav({ onNavigate, activeRoute }: { onNavigate: (to: string) => void; activeRoute?: string }) {
  const isTrack = activeRoute === 'track';
  const isHome = !isTrack;

  const [activeSection, setActiveSection] = useState('home');

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

  const handleAnchorClick = (hash: string) => {
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
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onNavigate('/')}>
            <img src={logo} alt="Barangay SafeReport logo" className="w-12 h-12 object-contain" />
            <div>
              <h1 className="text-xl font-bold text-white">Barangay Bigte, Norzagaray, Bulacan</h1>
              <p className="text-xs text-white/80">ULATMATIC: Incident & Complaint Reporting System</p>
            </div>
          </div>
          <div className="hidden md:flex items-center space-x-8">
            <button type="button" onClick={() => handleAnchorClick('#home')} className={sectionClass('home')}>Home</button>
            <button type="button" onClick={() => handleAnchorClick('#reports')} className={sectionClass('reports')}>Reports</button>
            <button type="button" onClick={() => handleAnchorClick('#about')} className={sectionClass('about')}>About</button>
            <button type="button" onClick={() => handleAnchorClick('#contact')} className={sectionClass('contact')}>Contact</button>
            <button
              type="button"
              onClick={() => onNavigate('/track')}
              className={`font-semibold transition-colors border-b-2 pb-0.5 ${isTrack ? 'text-white border-white' : 'text-white/90 hover:text-white border-transparent'}`}
            >
              Track Status
            </button>
            <div className="flex items-center space-x-3 pl-2 border-l border-white/20">
              <button
                type="button"
                onClick={() => onNavigate('/signin')}
                className="text-white/90 hover:text-white font-semibold transition-colors"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => onNavigate('/signup')}
                className="bg-white hover:bg-white/90 text-brand font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors"
              >
                Sign Up
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
