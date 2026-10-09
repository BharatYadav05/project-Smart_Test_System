import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { QRCodeSVG } from 'qrcode.react';
import { CreateTestModal } from './CreateTestModal';
import { 
  Users, 
  GraduationCap, 
  FileText, 
  Clock, 
  CheckCircle2, 
  Plus, 
  Play, 
  Sparkles, 
  Loader2, 
  Radio,
  ArrowRight,
  QrCode
} from 'lucide-react';

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [contexts, setContexts] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [activeTest, setActiveTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    loadDashboardData();

    // Subscribe to test changes
    const testChannel = supabase
      .channel('dashboard-tests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tests' }, () => {
        loadDashboardData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(testChannel);
    };
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);

    // 1. Fetch Tests
    const { data: testData } = await supabase
      .from('tests')
      .select('*, academic_context:academic_contexts(*)')
      .order('created_at', { ascending: false });

    if (testData) {
      const now = Date.now();
      // Check and auto-end any expired active tests
      for (const t of testData) {
        if (t.status === 'active' && t.end_at && new Date(t.end_at).getTime() <= now) {
          t.status = 'ended';
          supabase
            .from('tests')
            .update({ status: 'ended', ended_at: new Date().toISOString() })
            .eq('id', t.id)
            .then(() => {});
        }
      }
      setTests([...testData]);
      const active = testData.find((t) => t.status === 'active' && (!t.end_at || new Date(t.end_at).getTime() > now));
      setActiveTest(active || null);
    }

    // 2. Fetch Classes
    const { data: contextData } = await supabase.from('academic_contexts').select('*');
    if (contextData) setContexts(contextData);

    // 3. Fetch Submissions
    const { data: subData } = await supabase
      .from('submissions')
      .select('*')
      .order('submitted_at', { ascending: false });

    if (subData) setSubmissions(subData);

    setLoading(false);
  };

  const handleStartTest = async (testId) => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const now = new Date();
    const test = tests.find((t) => t.id === testId);
    const duration = test?.duration_seconds || 3600;
    const endAt = new Date(now.getTime() + duration * 1000);

    await supabase
      .from('tests')
      .update({
        status: 'active',
        access_code: code,
        started_at: now.toISOString(),
        start_at: now.toISOString(),
        end_at: endAt.toISOString(),
        access_code_expires_at: endAt.toISOString(),
      })
      .eq('id', testId);

    navigate(`/admin/tests/${testId}/monitor`);
  };

  const pendingReviewsCount = submissions.filter((s) => s.evaluation_status === 'pending').length;
  const completedReviewsCount = submissions.filter((s) => s.evaluation_status === 'evaluated' || s.evaluation_status === 'locked').length;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#f5f6fa] p-4 sm:p-6 lg:p-8 relative">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Skill Lab Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              SHEAT College of Engineering — Odd Sem 2026-2027
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Test</span>
            </button>
          </div>
        </div>

        {/* 4 PRIMARY METRICS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Classes */}
          <Link to="/admin/classes" className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between hover:border-amber-400 transition-colors group">
            <div>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block group-hover:text-amber-700">
                Configured Classes
              </span>
              <span className="text-2xl font-extrabold text-gray-900 mt-1 block">
                {contexts.length}
              </span>
              <span className="text-[11px] text-gray-400 mt-0.5 block">
                {contexts.length > 0 ? 'Manage active batches' : 'Click to add first class'}
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <GraduationCap className="w-6 h-6" />
            </div>
          </Link>

          {/* Card 2: Active Test & Code */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
                Active Classroom Code
              </span>
              <span className="text-2xl font-mono font-extrabold text-amber-600 mt-1 block">
                {activeTest ? activeTest.access_code : 'None'}
              </span>
              <span className="text-[11px] text-gray-400 mt-0.5 block">
                {activeTest ? `${activeTest.academic_context?.course || ''} Sem ${activeTest.academic_context?.semester || ''}` : 'No live session'}
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Radio className={`w-6 h-6 ${activeTest ? 'animate-pulse text-amber-600' : 'text-gray-400'}`} />
            </div>
          </div>

          {/* Card 3: Total Submissions */}
          <Link to="/admin/submissions" className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between hover:border-emerald-400 transition-colors">
            <div>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
                Total Submissions
              </span>
              <span className="text-2xl font-extrabold text-gray-900 mt-1 block">
                {submissions.length}
              </span>
              <span className="text-[11px] text-emerald-600 font-medium mt-0.5 block">
                {completedReviewsCount} Evaluated
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </Link>

          {/* Card 4: Pending Reviews */}
          <Link to="/admin/submissions?status=pending" className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between hover:border-rose-400 transition-colors">
            <div>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
                Pending Reviews
              </span>
              <span className="text-2xl font-extrabold text-rose-600 mt-1 block">
                {pendingReviewsCount}
              </span>
              <span className="text-[11px] text-gray-400 mt-0.5 block">
                Requires manual coding mark
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
          </Link>
        </div>

        {/* ACTIVE TEST BANNER */}
        {activeTest && (
          <div className="bg-gradient-to-r from-[#1a1612] via-[#2d2216] to-[#1a1612] rounded-2xl p-6 text-white border border-amber-500/40 shadow-xl flex flex-wrap items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span> LIVE TEST SESSION IN PROGRESS
                </span>
                <span className="text-xs text-amber-300/80 font-mono">
                  {activeTest.academic_context?.course} {activeTest.academic_context?.branch ? `(${activeTest.academic_context?.branch})` : ''} • Sem {activeTest.academic_context?.semester} (Sec {activeTest.academic_context?.section})
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                {activeTest.title}
              </h2>
              <p className="text-xs text-gray-300">
                Classroom entry is open. Students can scan the QR code or enter the code.
              </p>
            </div>

            <div className="flex items-center gap-4">
              {/* Mini QR Code */}
              <div className="bg-white p-2 rounded-xl shadow-md border-2 border-amber-400 flex flex-col items-center">
                <QRCodeSVG
                  value={`${window.location.origin}/join/${activeTest.access_code}`}
                  size={64}
                  level="M"
                  includeMargin={false}
                />
                <span className="text-[9px] text-gray-800 font-bold mt-1 flex items-center gap-0.5">
                  <QrCode className="w-2.5 h-2.5 text-amber-600" /> Scan QR
                </span>
              </div>

              <div className="bg-black/40 border border-amber-500/40 px-4 py-2.5 rounded-xl text-center">
                <span className="text-[10px] text-amber-400/80 block uppercase font-mono tracking-widest">
                  ACCESS CODE
                </span>
                <span className="text-2xl font-mono font-extrabold text-amber-400 tracking-wider">
                  {activeTest.access_code}
                </span>
              </div>

              <Link
                to={`/admin/tests/${activeTest.id}/monitor`}
                className="px-5 py-3.5 bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold rounded-xl text-sm flex items-center gap-2 shadow-lg transition-all"
              >
                <span>Open Live Room</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {/* TESTS DIRECTORY & MANAGEMENT */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Recent Skill Lab Tests
              </h2>
              <p className="text-xs text-gray-500">
                Manage test states, launch sessions, or review submissions.
              </p>
            </div>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> New Assessment
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5 text-left">Test Name</th>
                  <th className="px-6 py-3.5 text-left">Class Context</th>
                  <th className="px-6 py-3.5 text-left">Status</th>
                  <th className="px-6 py-3.5 text-center">Access Code</th>
                  <th className="px-6 py-3.5 text-center">Duration</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                      <Loader2 className="w-6 h-6 animate-spin text-amber-600 mx-auto mb-2" />
                      Loading tests...
                    </td>
                  </tr>
                ) : tests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                      No tests created yet. Click "Create New Test" to get started.
                    </td>
                  </tr>
                ) : (
                  tests.map((test) => (
                    <tr key={test.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-semibold text-gray-900 block">
                          {test.title}
                        </span>
                        <span className="text-[11px] text-gray-400 block mt-0.5">
                          Created {new Date(test.created_at).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-700">
                        <span className="font-medium text-gray-900">
                          {test.academic_context?.course} {test.academic_context?.branch ? `(${test.academic_context?.branch})` : ''}
                        </span>{' '}
                        • Sem {test.academic_context?.semester} (Sec {test.academic_context?.section})
                      </td>
                      <td className="px-6 py-4">
                        {test.status === 'active' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 animate-pulse flex items-center gap-1 w-fit">
                            ● Active
                          </span>
                        ) : test.status === 'ended' ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 w-fit block">
                            Ended
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 w-fit block">
                            {test.status?.toUpperCase()}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center font-mono font-bold text-amber-700">
                        {test.access_code || '---'}
                      </td>
                      <td className="px-6 py-4 text-center text-xs text-gray-600">
                        {Math.round(test.duration_seconds / 60)} mins
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {test.status === 'active' ? (
                          <Link
                            to={`/admin/tests/${test.id}/monitor`}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
                          >
                            Live Room
                          </Link>
                        ) : test.status === 'draft' || test.status === 'scheduled' ? (
                          <button
                            onClick={() => handleStartTest(test.id)}
                            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1 ml-auto"
                          >
                            <Play className="w-3 h-3" /> Start Test
                          </button>
                        ) : (
                          <Link
                            to={`/admin/submissions?testId=${test.id}`}
                            className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-100 text-gray-700 text-xs font-medium"
                          >
                            View Submissions
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* FLOATING ACTION BUTTON */}
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-amber-600 hover:bg-amber-700 text-white px-5 py-3.5 rounded-full shadow-2xl flex items-center gap-2 font-bold text-sm hover:scale-105 active:scale-95 transition-all border border-amber-400/40"
          title="Create New Test"
        >
          <Sparkles className="w-4 h-4" />
          <span>+ Create Test</span>
        </button>

        {/* Modal */}
        <CreateTestModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={(newTestId) => {
            setIsCreateModalOpen(false);
            loadDashboardData();
            navigate(`/admin/tests/${newTestId}/monitor`);
          }}
        />
      </div>
    </div>
  );
};
