import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function HomeHero({
  backgroundSrc,
  backgroundPosition,
  onPrevBackground,
  onNextBackground,
  onNavigate,
}: {
  backgroundSrc: string;
  backgroundPosition: string;
  onPrevBackground: () => void;
  onNextBackground: () => void;
  onNavigate: (to: string) => void;
}) {
  const [prevSrc, setPrevSrc] = useState<string | null>(null);
  const [currentSrc, setCurrentSrc] = useState(backgroundSrc);
  const [showNew, setShowNew] = useState(true);

  useEffect(() => {
    if (backgroundSrc === currentSrc) return;

    const durationMs = 700;

    setPrevSrc(currentSrc);
    setCurrentSrc(backgroundSrc);
    setShowNew(false);

    const raf = requestAnimationFrame(() => setShowNew(true));
    const timeout = window.setTimeout(() => setPrevSrc(null), durationMs);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timeout);
    };
  }, [backgroundSrc, currentSrc]);

  return (
    <section id="home" className="pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="inline-block mb-4">
            <span className="bg-brand/10 text-brand text-sm font-semibold px-4 py-2 rounded-full">
              Serving the Community
            </span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6 leading-tight">
            Report Incidents and Complaints.<br />
            Track Progress.<br />
            <span className="text-brand">Build Safer Communities.</span>
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 mb-8 leading-relaxed">
            A transparent and efficient system for residents to report incidents and complaints directly to barangay officials. Your voice matters in building a better community.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <button onClick={() => onNavigate('/signin')} className="bg-brand hover:bg-brand/90 text-white font-semibold px-8 py-4 rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5">
              File a Report
            </button>
            <button onClick={() => onNavigate('/track')} className="bg-white hover:bg-gray-50 text-gray-700 font-semibold px-8 py-4 rounded-lg border-2 border-gray-300 transition-all">
              Track Report Status
            </button>
          </div>
        </div>

        <div className="relative mx-auto mt-10 w-full max-w-7xl overflow-hidden bg-white">
          <div className="relative h-[340px] sm:h-[480px] lg:h-[560px] bg-white">
            {prevSrc ? (
              <img
                src={prevSrc}
                alt="Home banner"
                className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-700 ${
                  showNew ? 'opacity-0' : 'opacity-100'
                }`}
                style={{ objectPosition: backgroundPosition }}
              />
            ) : null}

            <img
              src={currentSrc}
              alt="Home banner"
              className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-700 ${
                showNew ? 'opacity-100' : 'opacity-0'
              }`}
              style={{ objectPosition: backgroundPosition }}
            />

            <button
              type="button"
              aria-label="Previous background"
              onClick={onPrevBackground}
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/70 hover:bg-white text-gray-900 rounded-full p-3 shadow-lg transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              type="button"
              aria-label="Next background"
              onClick={onNextBackground}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/70 hover:bg-white text-gray-900 rounded-full p-3 shadow-lg transition-colors"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
