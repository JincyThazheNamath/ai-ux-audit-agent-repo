import Link from 'next/link';
import { Home, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0a1628] flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-[#1a2332] rounded-2xl shadow-xl p-8 border border-gray-700/50">
        <div className="flex flex-col items-center text-center">
          <div className="bg-yellow-900/30 rounded-full p-4 mb-6 border-2 border-yellow-500/50">
            <Search size={48} className="text-yellow-400" />
          </div>
          
          <h1 className="text-5xl font-bold text-white mb-4">404</h1>
          
          <h2 className="text-2xl font-semibold text-gray-300 mb-4">
            Page Not Found
          </h2>
          
          <p className="text-gray-400 mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>
          
          <div className="flex gap-4">
            <Link
              href="/"
              className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              <Home size={20} />
              Go Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}



