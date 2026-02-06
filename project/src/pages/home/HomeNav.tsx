import logo from '../../../Logo/406613648_313509771513180_7654072355038554241_n.png';

export default function HomeNav({ onNavigate }: { onNavigate: (to: string) => void }) {
  return (
    <nav className="bg-brand shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <img src={logo} alt="Barangay SafeReport logo" className="w-12 h-12 object-contain" />
            <div>
              <h1 className="text-xl font-bold text-white">Barangay Bigte, Norzagaray, Bulacan</h1>
              <p className="text-xs text-white/80">ULATMATIC: Incident & Complaint Reporting System</p>
            </div>
          </div>
          <div className="hidden md:flex items-center space-x-8">
            <a href="#home" className="text-white/90 hover:text-white font-medium transition-colors">Home</a>
            <a href="#reports" className="text-white/90 hover:text-white font-medium transition-colors">Reports</a>
            <a href="#about" className="text-white/90 hover:text-white font-medium transition-colors">About</a>
            <a href="#contact" className="text-white/90 hover:text-white font-medium transition-colors">Contact</a>
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
