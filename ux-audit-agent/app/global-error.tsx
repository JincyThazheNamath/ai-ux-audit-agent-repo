'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import './globals.css';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error('Global application error:', error);
  }, [error]);

  return (
    <html lang="en" className="bg-[#0a1628]">
      <body className="bg-[#0a1628] text-white" style={{ backgroundColor: '#0a1628', color: '#ffffff' }}>
        <div className="min-h-screen bg-[#0a1628] flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-[#1a2332] rounded-2xl shadow-xl p-8 border border-gray-700/50">
            <div className="flex flex-col items-center text-center">
              <div className="bg-red-900/30 rounded-full p-4 mb-6 border-2 border-red-500/50">
                <AlertCircle size={48} className="text-red-400" />
              </div>
              
              <h1 className="text-3xl font-bold text-white mb-4">
                Something went wrong!
              </h1>
              
              <p className="text-gray-300 mb-2">
                A critical error occurred. Please try refreshing the page.
              </p>
              
              {error.message && (
                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-6 w-full text-left">
                  <p className="text-sm text-red-300 font-mono break-all">
                    {error.message}
                  </p>
                </div>
              )}
              
              <div className="flex gap-4">
                <button
                  onClick={reset}
                  className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
                >
                  <RefreshCw size={20} />
                  Try Again
                </button>
                
                <button
                  onClick={() => window.location.href = '/'}
                  className="px-6 py-3 bg-[#0a1628] hover:bg-[#0f1d35] border border-gray-600 text-white rounded-lg font-medium transition-colors"
                >
                  Go Home
                </button>
              </div>
              
              {error.digest && (
                <p className="text-xs text-gray-500 mt-6">
                  Error ID: {error.digest}
                </p>
              )}
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}


