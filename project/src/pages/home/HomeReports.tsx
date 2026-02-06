import { Clock, MapPin } from 'lucide-react';

export default function HomeReports() {
  return (
    <section id="reports" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h3 className="text-3xl font-bold text-gray-900 mb-4">Recent Reports</h3>
          <p className="text-lg text-gray-600">Transparency in action - see what's being reported and resolved</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { id: 'BR-2024-001', category: 'Road Issues', status: 'resolved', location: 'Main Street', date: '2 days ago' },
            { id: 'BR-2024-002', category: 'Street Lighting', status: 'in-progress', location: 'Park Avenue', date: '3 days ago' },
            { id: 'BR-2024-003', category: 'Waste Management', status: 'pending', location: 'Market Area', date: '5 days ago' },
          ].map((report) => (
            <div key={report.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-mono text-gray-500">{report.id}</span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    report.status === 'resolved'
                      ? 'bg-green-100 text-green-700'
                      : report.status === 'in-progress'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {report.status === 'resolved' ? 'Resolved' : report.status === 'in-progress' ? 'In Progress' : 'Pending'}
                </span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-3 text-lg">{report.category}</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-2" />
                  {report.location}
                </div>
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  {report.date}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
