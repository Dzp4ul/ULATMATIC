import { Mail, MapPin, Phone } from 'lucide-react';

export default function HomeContact() {
  return (
    <section id="contact" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h3 className="text-3xl font-bold text-gray-900 mb-4">Get in Touch</h3>
          <p className="text-lg text-gray-600">For urgent matters or inquiries, contact the barangay office directly</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-gray-200">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Phone className="w-8 h-8 text-blue-600" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Phone</h4>
            <p className="text-gray-600">0997-732-2787</p>
          </div>
          <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-gray-200">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-green-600" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Email</h4>
            <p className="text-gray-600">barangaybigtenorzagaraybulacan@gmail.com</p>
          </div>
          <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-gray-200">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-amber-600" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Office</h4>
            <p className="text-gray-600">Barangay Hall of Bigte, Norzagaray, Bulacan</p>
          </div>
        </div>
      </div>
    </section>
  );
}
