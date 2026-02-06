import { AlertCircle, Clock, FileText, MapPin, Shield } from 'lucide-react';

export default function HomeCategories() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h3 className="text-3xl font-bold text-gray-900 mb-4">Report Categories</h3>
          <p className="text-lg text-gray-600">Select the type of incident or complaint you want to report</p>
        </div>
        <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[
            { name: 'Public Safety', icon: Shield },
            { name: 'Road Issues', icon: AlertCircle },
            { name: 'Noise Complaint', icon: FileText },
            { name: 'Street Lighting', icon: Clock },
            { name: 'Waste Management', icon: MapPin },
            { name: 'Water Issues', icon: AlertCircle },
            { name: 'Property Damage', icon: FileText },
            { name: 'Other Concerns', icon: Shield },
          ].map((category) => (
            <button
              key={category.name}
              className="bg-white hover:bg-gray-50 border border-gray-200 hover:border-brand rounded-xl p-6 transition-all text-left group hover:shadow-lg"
            >
              <category.icon className="w-10 h-10 text-brand mb-4 group-hover:scale-110 transition-transform" />
              <h4 className="font-semibold text-gray-900">{category.name}</h4>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
