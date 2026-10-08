import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { User, Hash, Play, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';

export const StudentIdentity = () => {
  const { code } = useParams();
  const navigate = useNavigate();

  const [testData, setTestData] = useState(null);
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const raw = sessionStorage.getItem('current_test_data');
    if (raw) {
      setTestData(JSON.parse(raw));
    } else {
      // Re-validate if direct reload
      fetchTest();
    }
  }, [code]);

  const fetchTest = async () => {
    if (!code) return;
    const { data } = await supabase.rpc('validate_access_code', { p_code: code });
    if (data?.success) {
      setTestData(data);
      sessionStorage.setItem('current_test_data', JSON.stringify(data));
    } else {
      navigate('/');
    }
  };

  const handleStart = async (e) => {
    e.preventDefault();
    if (!name.trim() || !rollNo.trim()) {
      setError('Please enter both your full name and institutional roll number.');
      return;
    }

    setLoading(true);
    setError(null);

    const testId = testData?.test?.id;

    // Call start_test_attempt RPC
    const { data, error: rpcError } = await supabase.rpc('start_test_attempt', {
      p_test_id: testId,
      p_roll_no: rollNo.trim().toUpperCase(),
      p_name: name.trim(),
    });

    setLoading(false);

    if (rpcError || !data || !data.success) {
      setError(data?.error || rpcError?.message || 'Failed to start test session.');
    } else {
      // Save attempt info
      sessionStorage.setItem('current_attempt_id', data.attempt_id);
      sessionStorage.setItem('current_session_token', data.session_token);
      sessionStorage.setItem('current_student_name', name.trim());
      sessionStorage.setItem('current_student_roll', rollNo.trim().toUpperCase());
      navigate('/test');
    }
  };

  if (!testData) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  const { test } = testData;
  const ctx = test.academic_context;

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-[#f5f6fa] p-4">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
        {/* Academic Context Badge (BR-001) */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-[#241f1a] to-[#1a1612] text-white border border-amber-500/30 mb-6">
          <span className="text-[10px] font-mono tracking-widest text-amber-400 uppercase font-semibold block">
            Academic Context (Determined by Code)
          </span>
          <h2 className="text-base font-bold text-white mt-1">
            {test.title}
          </h2>
          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-300">
            <span>Course: <strong className="text-amber-300">{ctx?.course}</strong></span>
            <span>Sem: <strong className="text-amber-300">{ctx?.semester}</strong></span>
            <span>Sec: <strong className="text-amber-300">{ctx?.section}</strong></span>
            <span>Cycle: <strong className="text-amber-300">{ctx?.academic_year}</strong></span>
          </div>
        </div>

        <h1 className="text-xl font-bold text-gray-900 tracking-tight">
          Student Information
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          No account needed. Your submission will automatically add you to the class roster.
        </p>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleStart} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Full Name *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                autoCapitalize="words"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Anmol"
                className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:outline-none text-sm text-gray-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              College Roll Number (3 digits) *
            </label>
            <div className="relative">
              <Hash className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                maxLength={6}
                value={rollNo}
                onChange={(e) => setRollNo(e.target.value.trim().toUpperCase())}
                placeholder="077"
                className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:outline-none text-sm font-mono text-gray-900 uppercase"
              />
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              Enter your 3-digit roll number (e.g. 077). It is used as your unique identity.
            </p>
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="p-2.5 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 text-xs"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" /> Begin Assessment
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
