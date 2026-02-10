import { useEffect, useState } from 'react';
import bg1 from '../../Background img/476806522_589385950592226_1934538812222898373_na.jpg';
import bg2 from '../../Background img/Bigte_Hall.jpg';
import HomeAbout from './home/HomeAbout';
import HomeCategories from './home/HomeCategories';
import HomeContact from './home/HomeContact';
import HomeFooter from './home/HomeFooter';
import HomeHero from './home/HomeHero';
import HomeNav from './home/HomeNav';
import HomeReports from './home/HomeReports';

export default function HomePage({ onNavigate }: { onNavigate: (to: string) => void }) {
  const backgrounds = [
    { src: bg1, position: 'center 20%' },
    { src: bg2, position: 'center center' },
  ];
  const [backgroundIndex, setBackgroundIndex] = useState(0);

  const prevBackground = () => {
    setBackgroundIndex((i) => (i - 1 + backgrounds.length) % backgrounds.length);
  };

  const nextBackground = () => {
    setBackgroundIndex((i) => (i + 1) % backgrounds.length);
  };

  useEffect(() => {
    const interval = window.setInterval(() => {
      setBackgroundIndex((i) => (i + 1) % backgrounds.length);
    }, 6000);

    return () => window.clearInterval(interval);
  }, [backgrounds.length]);

  return (
    <div className="min-h-screen bg-white">
      <HomeNav onNavigate={onNavigate} />
      <HomeHero
        backgroundSrc={backgrounds[backgroundIndex].src}
        backgroundPosition={backgrounds[backgroundIndex].position}
        onPrevBackground={prevBackground}
        onNextBackground={nextBackground}
        onNavigate={onNavigate}
      />
      <HomeCategories />
      <HomeReports />
      <HomeAbout />
      <HomeContact />
      <HomeFooter />
    </div>
  );
}
