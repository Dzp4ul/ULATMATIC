import { CheckCircle } from 'lucide-react';

export default function HomeAbout() {
  return (
    <section id="about" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h3 className="text-3xl font-bold text-gray-900 mb-6">Why Use ULATMATIC?</h3>
            <div className="space-y-6">
              {[
                {
                  title: 'Fast Response',
                  desc: 'Reports are immediately forwarded to the appropriate barangay officials for quick action.',
                },
                {
                  title: 'Full Transparency',
                  desc: 'Track your report status in real-time and see how the community is improving.',
                },
                { title: 'Secure & Private', desc: 'Your information is protected and only shared with authorized personnel.' },
                {
                  title: 'Community Impact',
                  desc: 'Help build a safer, better community by reporting issues that matter.',
                },
              ].map((feature) => (
                <div key={feature.title} className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">{feature.title}</h4>
                    <p className="text-gray-600">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-gradient-to-br from-blue-600 to-green-600 rounded-2xl p-12 text-white">
            <h4 className="text-2xl font-bold mb-6">How It Works</h4>
            <div className="space-y-8">
              {[
                { step: '1', title: 'Report an Incident', desc: 'Fill out a simple form describing the issue and location' },
                { step: '2', title: 'Automatic Routing', desc: 'Your report is sent to the right department instantly' },
                { step: '3', title: 'Track Progress', desc: 'Receive updates and track resolution progress' },
                { step: '4', title: 'Resolution', desc: 'Issue resolved and community improved' },
              ].map((item) => (
                <div key={item.step} className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center font-bold">
                      {item.step}
                    </div>
                  </div>
                  <div>
                    <h5 className="font-semibold mb-1">{item.title}</h5>
                    <p className="text-white/80 text-sm">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
