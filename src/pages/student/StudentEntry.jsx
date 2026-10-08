import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ArrowRight, KeyRound, Loader2, AlertCircle } from 'lucide-react';

export const StudentEntry = () => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  const handleValidate = async (e) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (cleanCode.length < 4) {
      setError('Please enter a valid access code (e.g. 7K9P2X).');
      return;
    }

    setLoading(true);
    setError(null);

    // Call validate_access_code RPC
    const { data, error: rpcError } = await supabase.rpc('validate_access_code', {
      p_code: cleanCode,
    });

    setLoading(false);

    if (rpcError || !data || !data.success) {
      setError(data?.error || rpcError?.message || 'Invalid or expired access code.');
    } else {
      // Store test data in session storage for the identity step
      sessionStorage.setItem('current_test_data', JSON.stringify(data));
      navigate(`/join/${cleanCode}`);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-[#f5f6fa] p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-200 p-8 sm:p-10 text-center">
        {/* College Icon */}
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center mx-auto mb-5 shadow-inner">
          <KeyRound className="w-8 h-8" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
          Enter Skill Lab Code
        </h1>
        <p className="text-gray-500 text-xs sm:text-sm mt-2 max-w-sm mx-auto">
          Look at the classroom projector or whiteboard and enter the 6-character code provided by your trainer.
        </p>

        {error && (
          <div className="mt-5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 text-left">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleValidate} className="mt-6 space-y-4">
          <div>
            <input
              type="text"
              required
              maxLength={8}
              autoCapitalize="characters"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setError(null);
              }}
              placeholder="E.G. 7K9P2X"
              style={{ textTransform: 'uppercase' }}
              className="w-full text-center tracking-[0.3em] font-mono text-2xl sm:text-3xl font-extrabold uppercase px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/20 focus:outline-none transition-all placeholder:tracking-normal placeholder:font-normal placeholder:text-gray-300 text-gray-900"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center text-sm disabled:opacity-70 group"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying Code...
              </>
            ) : (
              <>
                Continue to Test <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 text-xs text-gray-400">
          SHEAT College of Engineering • Department Skill Lab
        </div>
      </div>
    </div>
  );
};
