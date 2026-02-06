import logo from '../../../Logo/406613648_313509771513180_7654072355038554241_n.png';

export default function HomeFooter() {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div className="md:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <img src={logo} alt="Barangay SafeReport logo" className="w-8 h-8 object-contain" />
              <div>
                <h1 className="text-xl font-bold">Barangay Bigte, Norzagaray, Bulacan</h1>
                <p className="text-sm text-gray-400">ULATMATIC: Incident & Complaint Reporting System</p>
              </div>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              Empowering communities through transparent and efficient incident reporting. Together, we build safer neighborhoods.
            </p>
          </div>
          <div>
            <h5 className="font-semibold mb-4">Quick Links</h5>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="#home" className="hover:text-white transition-colors">Home</a></li>
              <li><a href="#reports" className="hover:text-white transition-colors">Reports</a></li>
              <li><a href="#about" className="hover:text-white transition-colors">About</a></li>
              <li><a href="#contact" className="hover:text-white transition-colors">Contact</a></li>
            </ul>
          </div>
          <div>
            <h5 className="font-semibold mb-4">Legal</h5>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Data Protection</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-400">
          <p>&copy; 2024 Barangay SafeReport. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
