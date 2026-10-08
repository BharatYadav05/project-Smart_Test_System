import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Users, CheckCircle, Clock, Copy, Check, AlertTriangle, ArrowLeft, Loader2, StopCircle, Eye } from 'lucide-react';

export const LiveTestRoom = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [test, setTest] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('--:--');
  const [showEndModal, setShowEndModal] = useState(false);
  const [ending, setEnding] = useState(false);

  useEffect(() => {
    if (!id) return;
    loadTestDetails();

    // Set up Realtime subscriptions for classroom live updates
    const attemptSub = supabase
      .channel('live-attempts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'test_attempts', filter: `test_id=eq.${id}` },
        () => {
          loadAttempts();
        }
      )
      .subscribe();

    const submissionSub = supabase
      .channel('live-submissions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'submissions', filter: `test_id=eq.${id}` },
        () => {
          loadSubmissions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(attemptSub);
      supabase.removeChannel(submissionSub);
    };
  }, [id]);

  const loadTestDetails = async () => {
    setLoading(true);
    const { data: testData } = await supabase
      .from('tests')
      .select('*, academic_context:academic_contexts(*)')
      .eq('id', id)
      .single();

    if (testData) {
      setTest(testData);
    }
    await loadAttempts();
    await loadSubmissions();
    setLoading(false);
  };

  const loadAttempts = async () => {
    const { data } = await supabase
      .from('test_attempts')
      .select('*')
      .eq('test_id', id)
      .order('started_at', { ascending: false });

    if (data) setAttempts(data);
  };

  const loadSubmissions = async () => {
    const { data } = await supabase
      .from('submissions')
      .select('*, student:students(*)')
      .eq('test_id', id)
      .order('submitted_at', { ascending: false });

    if (data) setSubmissions(data);
  };

  // Timer Countdown
  useEffect(() => {
    if (!test || !test.end_at || test.status !== 'active') return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(test.end_at).getTime();
      const distance = end - now;

      if (distance <= 0) {
        setTimeRemaining('00:00:00 (Time Up)');
        clearInterval(interval);
      } else {
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        setTimeRemaining(
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [test]);

  const copyCode = () => {
    if (test?.access_code) {
      navigator.clipboard.writeText(test.access_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleEndTest = async () => {
    if (!test) return;
    setEnding(true);
    await supabase
      .from('tests')
      .update({
        status: 'ended',
        ended_at: new Date().toISOString(),
      })
      .eq('id', test.id);

    setEnding(false);
    setShowEndModal(false);
    loadTestDetails();
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-[#f8f9fc]">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  if (!test) {
    return (
      <div className="p-8 text-center text-gray-500">
        Test not found.
      </div>
    );
  }

  const activeCount = attempts.filter((a) => a.status === 'in_progress').length;
  const submittedCount = submissions.length;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#f5f6fa] p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to="/admin/dashboard"
              className="p-2 bg-white rounded-lg border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  test.status === 'active'
                    ? 'bg-emerald-100 text-emerald-800 animate-pulse'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  ● {test.status.toUpperCase()}
                </span>
                <span className="text-xs text-gray-500 font-medium">
                  {test.academic_context?.course} • Sem {test.academic_context?.semester} • Sec {test.academic_context?.section}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                {test.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to={`/admin/submissions?testId=${test.id}`}
              className="px-4 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm"
            >
              <Eye className="w-4 h-4 text-gray-500" />
              View All Submissions ({submissions.length})
            </Link>

            {test.status === 'active' && (
              <button
                onClick={() => setShowEndModal(true)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-md transition-colors"
              >
                <StopCircle className="w-4 h-4" />
                End Test Session
              </button>
            )}
          </div>
        </div>

        {/* HERO SECTION: ACCESS CODE & TIMER */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* GIANT ACCESS CODE CARD */}
          <div className="lg:col-span-2 bg-gradient-to-br from-[#1a1612] via-[#2a2219] to-[#1a1612] text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-amber-600/30 flex flex-col justify-between relative overflow-hidden">
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <span className="text-xs font-mono tracking-widest text-amber-400 uppercase font-semibold">
                  Classroom Access Code
                </span>
                <p className="text-gray-300 text-sm mt-0.5">
                  Display this code on the classroom screen/projector for students.
                </p>
              </div>
              <button
                onClick={copyCode}
                className="px-3.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-xs font-medium border border-amber-500/30 flex items-center gap-1.5 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy Code'}
              </button>
            </div>

            {/* BIG CODE */}
            <div className="my-6 text-center">
              <span className="font-mono text-5xl sm:text-7xl font-extrabold tracking-widest text-amber-400 select-all drop-shadow-md">
                {test.access_code || '------'}
              </span>
              <p className="text-xs text-gray-400 mt-2 font-mono">
                Students join at: <span className="text-amber-300 font-semibold">{window.location.origin}</span>
              </p>
            </div>

            {/* Quick Context Summary */}
            <div className="pt-4 border-t border-[#3e3428] flex flex-wrap items-center justify-between text-xs text-gray-300">
              <span>Course: <strong>{test.academic_context?.course}</strong></span>
              <span>Semester: <strong>{test.academic_context?.semester}</strong></span>
              <span>Section: <strong>{test.academic_context?.section}</strong></span>
              <span>Academic Year: <strong>{test.academic_context?.academic_year}</strong></span>
            </div>
          </div>

          {/* TIMER & LIVE COUNTERS */}
          <div className="space-y-6 flex flex-col">
            {/* Timer Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 flex-1 flex flex-col justify-center items-center text-center">
              <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
                <Clock className="w-6 h-6" />
              </div>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Time Remaining
              </span>
              <span className="font-mono text-3xl font-extrabold text-gray-900 mt-1">
                {test.status === 'active' ? timeRemaining : 'Session Ended'}
              </span>
              <span className="text-xs text-gray-400 mt-1">
                Total Duration: {Math.round(test.duration_seconds / 60)} mins
              </span>
            </div>

            {/* Live Counter Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 grid grid-cols-2 gap-4">
              <div className="text-center p-3 rounded-xl bg-blue-50/60 border border-blue-100">
                <div className="flex items-center justify-center gap-1.5 text-blue-700 text-xs font-semibold mb-1">
                  <Users className="w-4 h-4" /> Active Now
                </div>
                <div className="text-3xl font-extrabold text-blue-900">
                  {activeCount}
                </div>
              </div>

              <div className="text-center p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
                <div className="flex items-center justify-center gap-1.5 text-emerald-700 text-xs font-semibold mb-1">
                  <CheckCircle className="w-4 h-4" /> Submitted
                </div>
                <div className="text-3xl font-extrabold text-emerald-900">
                  {submittedCount}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RECENT SUBMISSIONS / PARTICIPANTS LIST */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-600" />
              Classroom Activity Stream
            </h2>
            <span className="text-xs text-gray-400 font-mono">
              Live updates enabled
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3 text-left">Roll No.</th>
                  <th className="px-6 py-3 text-left">Student Name</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-left">Started At</th>
                  <th className="px-6 py-3 text-left">MCQ Score</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {attempts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-gray-400">
                      Waiting for students to join with code <span className="font-mono font-bold text-amber-600">{test.access_code}</span>...
                    </td>
                  </tr>
                ) : (
                  attempts.map((attempt) => {
                    const sub = submissions.find((s) => s.attempt_id === attempt.id);
                    return (
                      <tr key={attempt.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-6 py-3 font-mono font-semibold text-gray-900">
                          {attempt.roll_no}
                        </td>
                        <td className="px-6 py-3 font-medium text-gray-800">
                          {attempt.name}
                        </td>
                        <td className="px-6 py-3">
                          {attempt.status === 'submitted' ? (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                              ✓ Submitted
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 animate-pulse">
                              ✍ In Progress
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-xs text-gray-500">
                          {new Date(attempt.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                        <td className="px-6 py-3 text-xs font-mono font-semibold">
                          {sub ? (
                            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                              {sub.mcq_score} pts
                            </span>
                          ) : (
                            <span className="text-gray-400">--</span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-right">
                          {sub ? (
                            <Link
                              to={`/admin/submissions?submissionId=${sub.id}`}
                              className="text-xs font-semibold text-amber-600 hover:text-amber-800 hover:underline"
                            >
                              Evaluate Coding &rarr;
                            </Link>
                          ) : (
                            <span className="text-xs text-gray-400">Writing...</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* END TEST CONFIRMATION MODAL */}
        {showEndModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">
                End Active Test Session?
              </h3>
              <p className="text-sm text-gray-500 mt-2">
                This will immediately invalidate the access code <strong>{test.access_code}</strong>. New students will not be able to join, and active attempts will be closed.
              </p>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEndModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={ending}
                  onClick={handleEndTest}
                  className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg flex items-center gap-1.5 shadow-md disabled:opacity-70"
                >
                  {ending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Yes, End Test'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
