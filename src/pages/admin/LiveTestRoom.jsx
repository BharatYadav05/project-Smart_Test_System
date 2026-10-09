import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Users, 
  CheckCircle, 
  Clock, 
  Copy, 
  Check, 
  AlertTriangle, 
  ArrowLeft, 
  Loader2, 
  StopCircle, 
  Eye, 
  Award,
  CheckCircle2,
  ArrowRight,
  FileCheck,
  GraduationCap,
  QrCode,
  Maximize2,
  Smartphone,
  X
} from 'lucide-react';

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
  const [showQrModal, setShowQrModal] = useState(false);
  const [ending, setEnding] = useState(false);
  const isAutoEndingRef = useRef(false);

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

    const testSub = supabase
      .channel('live-test-status')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tests', filter: `id=eq.${id}` },
        (payload) => {
          if (payload?.new) {
            setTest((prev) => ({ ...prev, ...payload.new }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(attemptSub);
      supabase.removeChannel(submissionSub);
      supabase.removeChannel(testSub);
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
      // Check if test has already passed its end time but status is still 'active'
      const now = Date.now();
      const end = testData.end_at ? new Date(testData.end_at).getTime() : 0;
      if (testData.status === 'active' && end > 0 && now >= end) {
        // Auto-end in database immediately
        await supabase
          .from('tests')
          .update({
            status: 'ended',
            ended_at: new Date().toISOString(),
          })
          .eq('id', id);
        testData.status = 'ended';
      }
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

  // Timer Countdown with Automatic Test Ending
  useEffect(() => {
    if (!test || !test.end_at || test.status !== 'active') {
      if (test?.status === 'ended') {
        setTimeRemaining('00:00:00 (Time Up)');
      }
      return;
    }

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(test.end_at).getTime();
      const distance = end - now;

      if (distance <= 0) {
        setTimeRemaining('00:00:00 (Time Up)');
        clearInterval(interval);
        // Trigger auto-end test session in database
        handleAutoEndTest();
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

  const handleAutoEndTest = async () => {
    if (isAutoEndingRef.current) return;
    isAutoEndingRef.current = true;

    try {
      await supabase
        .from('tests')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString(),
        })
        .eq('id', id);

      setTest((prev) => (prev ? { ...prev, status: 'ended' } : null));
      await loadTestDetails();
    } catch (err) {
      console.error('Error auto-ending test:', err);
    } finally {
      isAutoEndingRef.current = false;
    }
  };

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
    setTest((prev) => (prev ? { ...prev, status: 'ended' } : null));
    await loadTestDetails();
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

  const isTestEnded = test.status === 'ended';
  const activeCount = attempts.filter((a) => a.status === 'in_progress').length;
  const submittedCount = submissions.length;
  const evaluatedCount = submissions.filter((s) => s.evaluation_status === 'evaluated' || s.evaluation_status === 'locked').length;
  const pendingCount = submissions.filter((s) => s.evaluation_status === 'pending').length;

  const joinUrl = test?.access_code 
    ? `${window.location.origin}/join/${test.access_code}`
    : window.location.origin;

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
                  !isTestEnded
                    ? 'bg-emerald-100 text-emerald-800 animate-pulse'
                    : 'bg-gray-200 text-gray-800'
                }`}>
                  ● {isTestEnded ? 'CONCLUDED / ENDED' : 'ACTIVE SESSION'}
                </span>
                <span className="text-xs text-gray-500 font-medium">
                  {test.academic_context?.course} {test.academic_context?.branch ? `(${test.academic_context?.branch})` : ''} • Sem {test.academic_context?.semester} • Sec {test.academic_context?.section}
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
              View Submissions ({submissions.length})
            </Link>

            {!isTestEnded && (
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

        {/* HERO SECTION: ACTIVE vs ENDED STATE */}
        {!isTestEnded ? (
          /* ACTIVE ROOM: SCANNABLE QR CODE & COMPACT ACCESS CODE & LIVE TIMER */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* DYNAMIC QR CODE & ACCESS CODE CARD */}
            <div className="lg:col-span-2 bg-gradient-to-br from-[#1a1612] via-[#2a2219] to-[#1a1612] text-white rounded-2xl p-6 sm:p-7 shadow-xl border border-amber-600/30 flex flex-col justify-between relative overflow-hidden">
              {/* Header inside Card */}
              <div className="relative z-10 flex items-center justify-between pb-3 border-b border-[#3e3428]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-xs font-mono tracking-widest text-amber-400 uppercase font-bold">
                    Classroom Entry Portal
                  </span>
                </div>
                <button
                  onClick={() => setShowQrModal(true)}
                  className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-xs font-medium border border-amber-500/30 flex items-center gap-1.5 transition-colors"
                  title="Expand QR for Projector View"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Projector Zoom</span>
                </button>
              </div>

              {/* TWO COLUMN GRID: ACCESS CODE ON LEFT, BIG HIGH-CONTRAST QR ON RIGHT */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center my-4">
                {/* Left Side: Instructions, Smaller Font Access Code & Steps */}
                <div className="sm:col-span-7 space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Smartphone className="w-5 h-5 text-amber-400" />
                      Scan QR or Enter Code
                    </h3>
                    <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                      Students scanning the QR code will be <strong>directly redirected</strong> to enter their <strong>Name & Roll No.</strong> and begin the test.
                    </p>
                  </div>

                  {/* Access Code Box (Compact / Small Font) */}
                  <div className="bg-[#120f0d] border border-amber-600/40 rounded-xl p-3.5 flex items-center justify-between gap-3 shadow-inner">
                    <div>
                      <span className="text-[10px] text-gray-400 font-mono tracking-wider uppercase block">
                        Manual Access Code
                      </span>
                      <span className="font-mono text-2xl sm:text-3xl font-extrabold tracking-widest text-amber-400 select-all">
                        {test.access_code || '------'}
                      </span>
                    </div>

                    <button
                      onClick={copyCode}
                      className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-xs font-medium border border-amber-500/30 flex items-center gap-1.5 transition-colors"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>

                  {/* Manual Join Link */}
                  <div className="text-[11px] text-gray-400 font-mono flex flex-wrap items-center gap-1">
                    <span>Direct Link:</span>
                    <span className="text-amber-300 font-semibold select-all break-all">{joinUrl}</span>
                  </div>
                </div>

                {/* Right Side: High-Contrast Dynamic Scannable QR Code */}
                <div className="sm:col-span-5 flex flex-col items-center justify-center">
                  <div 
                    onClick={() => setShowQrModal(true)}
                    className="bg-white p-3.5 sm:p-4 rounded-2xl shadow-2xl border-4 border-amber-400/90 hover:border-amber-300 hover:scale-[1.02] transition-all cursor-pointer group flex flex-col items-center text-center relative"
                    title="Click to expand QR Code for large projector"
                  >
                    <QRCodeSVG
                      value={joinUrl}
                      size={175}
                      level="H"
                      includeMargin={false}
                      className="rounded-lg"
                    />

                    <div className="mt-2.5 flex items-center gap-1.5 text-gray-900 font-extrabold text-xs">
                      <QrCode className="w-3.5 h-3.5 text-amber-600 group-hover:scale-110 transition-transform" />
                      <span>Scan to Join Instantly</span>
                    </div>
                    <span className="text-[10px] text-gray-500 font-medium">
                      Direct to Student Identity
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Context Summary */}
              <div className="pt-3 border-t border-[#3e3428] flex flex-wrap items-center justify-between text-xs text-gray-300">
                <span>Course: <strong>{test.academic_context?.course}</strong></span>
                <span>Branch: <strong>{test.academic_context?.branch || 'General'}</strong></span>
                <span>Semester: <strong>{test.academic_context?.semester}</strong></span>
                <span>Section: <strong>{test.academic_context?.section}</strong></span>
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
                  {timeRemaining}
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
        ) : (
          /* ENDED TEST STATE: DEDICATED CONCLUDED SESSION OVERVIEW & RESULTS */
          <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-6 sm:p-8 space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-100 pb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shadow-inner">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-300">
                      SESSION CONCLUDED
                    </span>
                    <span className="text-xs text-gray-500 font-mono">
                      Code: <strong className="line-through text-gray-400">{test.access_code}</strong> (Closed)
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 mt-1">
                    Assessment Completed
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                    Test session has ended. All student attempts have been finalized and recorded.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <Link
                  to="/admin/dashboard"
                  className="px-4 py-2.5 border border-gray-300 hover:bg-gray-100 text-gray-700 font-semibold rounded-xl text-xs sm:text-sm transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  to={`/admin/submissions?testId=${test.id}`}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md hover:shadow-lg flex items-center gap-2 transition-all"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>Review & Grade Submissions ({submissions.length})</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Session Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-gray-50/80 border border-gray-200 text-center">
                <span className="text-xs text-gray-500 font-semibold uppercase block">Total Joined</span>
                <span className="text-2xl font-bold font-mono text-gray-900 mt-1 block">{attempts.length}</span>
                <span className="text-[11px] text-gray-400 mt-0.5 block">Students started</span>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200 text-center">
                <span className="text-xs text-emerald-800 font-semibold uppercase block">Submissions</span>
                <span className="text-2xl font-bold font-mono text-emerald-700 mt-1 block">{submissions.length}</span>
                <span className="text-[11px] text-emerald-600 mt-0.5 block">Completed assessment</span>
              </div>

              <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200 text-center">
                <span className="text-xs text-blue-800 font-semibold uppercase block">Evaluated</span>
                <span className="text-2xl font-bold font-mono text-blue-700 mt-1 block">{evaluatedCount}</span>
                <span className="text-[11px] text-blue-600 mt-0.5 block">Grading finished</span>
              </div>

              <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-center">
                <span className="text-xs text-amber-800 font-semibold uppercase block">Pending Grading</span>
                <span className="text-2xl font-bold font-mono text-amber-700 mt-1 block">{pendingCount}</span>
                <span className="text-[11px] text-amber-600 mt-0.5 block">Coding review needed</span>
              </div>
            </div>
          </div>
        )}

        {/* RECENT SUBMISSIONS / PARTICIPANTS LIST */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-600" />
              Classroom Activity & Student Submissions
            </h2>
            <span className="text-xs text-gray-500 font-medium">
              Total {attempts.length} student{attempts.length === 1 ? '' : 's'} recorded
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
                  <th className="px-6 py-3 text-left">Evaluation</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {attempts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-gray-400">
                      {!isTestEnded ? (
                        <>Waiting for students to join with code <span className="font-mono font-bold text-amber-600">{test.access_code}</span>...</>
                      ) : (
                        <>No students participated in this test session.</>
                      )}
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
                          {attempt.status === 'submitted' || sub ? (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                              ✓ Submitted
                            </span>
                          ) : isTestEnded ? (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                              Ended
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
                        <td className="px-6 py-3">
                          {sub ? (
                            sub.evaluation_status === 'evaluated' || sub.evaluation_status === 'locked' ? (
                              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                                Evaluated ({sub.total_score} pts)
                              </span>
                            ) : (
                              <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                                Pending Coding
                              </span>
                            )
                          ) : (
                            <span className="text-xs text-gray-400">--</span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-right">
                          {sub ? (
                            <Link
                              to={`/admin/submissions?submissionId=${sub.id}`}
                              className="text-xs font-semibold text-amber-600 hover:text-amber-800 hover:underline inline-flex items-center gap-1"
                            >
                              <span>Evaluate Coding</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          ) : (
                            <span className="text-xs text-gray-400">{isTestEnded ? 'No submission' : 'Writing...'}</span>
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
                This will immediately invalidate the access code <strong>{test.access_code}</strong> and conclude the assessment. No new students can join.
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

        {/* PROJECTOR ZOOM / FULLSCREEN QR MODAL */}
        {showQrModal && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-gray-100 text-center relative">
              <button
                onClick={() => setShowQrModal(false)}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-1 mb-4">
                <span className="text-[11px] font-bold font-mono px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                  CLASSROOM PROJECTOR DISPLAY
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 mt-2">
                  {test.title}
                </h2>
                <p className="text-xs text-gray-500">
                  {test.academic_context?.course} {test.academic_context?.branch ? `(${test.academic_context?.branch})` : ''} • Sem {test.academic_context?.semester} • Sec {test.academic_context?.section}
                </p>
              </div>

              {/* Giant QR SVG */}
              <div className="bg-white p-4 rounded-2xl shadow-xl border-4 border-amber-500 inline-block mx-auto my-2">
                <QRCodeSVG
                  value={joinUrl}
                  size={260}
                  level="H"
                  includeMargin={true}
                  className="rounded-lg"
                />
              </div>

              <div className="mt-4 space-y-2">
                <div className="text-sm font-bold text-gray-900">
                  Scan QR with any phone camera to begin test
                </div>
                <div className="text-xs text-gray-500 font-mono">
                  Or enter access code: <strong className="text-amber-600 text-base font-bold">{test.access_code}</strong> at <span className="text-gray-800">{window.location.origin}</span>
                </div>
              </div>

              <button
                onClick={() => setShowQrModal(false)}
                className="mt-6 w-full py-3 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl text-sm transition-colors shadow-md"
              >
                Close Projector View
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
