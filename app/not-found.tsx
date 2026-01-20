'use client';

import Link from 'next/link';
import { Home, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0a1628] flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-[#1a2332] rounded-2xl shadow-xl p-6 sm:p-8 border border-gray-700/50 text-center">
        <div className="flex flex-col items-center">
          <div className="bg-teal-900/30 rounded-full p-3 sm:p-4 mb-4 sm:mb-6 border-2 border-teal-500/50">
            <Search size={40} className="sm:w-12 sm:h-12 text-teal-400" />
          </div>
          
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">
            Page Not Found
          </h1>
          
          <p className="text-sm sm:text-base text-gray-300 mb-4 sm:mb-6">
            The page you're looking for doesn't exist or has been moved.
          </p>
          
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors"
          >
            <Home size={20} />
            Go to Home
          </Link>
        </div>
      </div>
    </div>
  );
}







