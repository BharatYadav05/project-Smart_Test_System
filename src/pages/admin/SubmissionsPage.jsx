import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { SubmissionReviewModal } from './SubmissionReviewModal';
import { Search, FileText, CheckCircle2, Clock, Lock, Loader2 } from 'lucide-react';

export const SubmissionsPage = () => {
  const [searchParams] = useSearchParams();
  const testIdParam = searchParams.get('testId');
  const subIdParam = searchParams.get('submissionId');

  const [submissions, setSubmissions] = useState([]);
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubId, setSelectedSubId] = useState(subIdParam);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTestFilter, setSelectedTestFilter] = useState(testIdParam || 'all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');

  useEffect(() => {
    loadTests();
    loadSubmissions();
  }, [selectedTestFilter, selectedStatusFilter]);

  const loadTests = async () => {
    const { data } = await supabase
      .from('tests')
      .select('*, academic_context:academic_contexts(*)')
      .order('created_at', { ascending: false });

    if (data) setTests(data);
  };

  const loadSubmissions = async () => {
    setLoading(true);
    let query = supabase
      .from('submissions')
      .select('*, student:students(*), test:tests(*, academic_context:academic_contexts(*))')
      .order('submitted_at', { ascending: false });

    if (selectedTestFilter !== 'all') {
      query = query.eq('test_id', selectedTestFilter);
    }
    if (selectedStatusFilter !== 'all') {
      query = query.eq('evaluation_status', selectedStatusFilter);
    }

    const { data } = await query;
    if (data) setSubmissions(data);
    setLoading(false);
  };

  const filteredSubmissions = submissions.filter((sub) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const roll = sub.student?.roll_no?.toLowerCase() || '';
    const name = sub.student?.name?.toLowerCase() || '';
    const testTitle = sub.test?.title?.toLowerCase() || '';
    return roll.includes(query) || name.includes(query) || testTitle.includes(query);
  });

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#f5f6fa] p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <FileText className="w-6 h-6 text-amber-600" />
              Student Submissions & Evaluation
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Review and grade classroom coding submissions with automatic MCQ scores.
            </p>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name or roll number..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          {/* Test Filter */}
          <div className="sm:col-span-3">
            <select
              value={selectedTestFilter}
              onChange={(e) => setSelectedTestFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
            >
              <option value="all">All Tests</option>
              {tests.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} ({t.access_code || 'No Code'})
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="sm:col-span-3">
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
            >
              <option value="all">All Evaluation States</option>
              <option value="pending">Pending Coding Review</option>
              <option value="evaluated">Evaluated</option>
              <option value="locked">Locked</option>
            </select>
          </div>
        </div>

        {/* Submissions Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5 text-left">Roll No</th>
                  <th className="px-6 py-3.5 text-left">Student Name</th>
                  <th className="px-6 py-3.5 text-left">Test / Class</th>
                  <th className="px-6 py-3.5 text-left">Submitted At</th>
                  <th className="px-6 py-3.5 text-center">MCQ Score</th>
                  <th className="px-6 py-3.5 text-center">Coding Marks</th>
                  <th className="px-6 py-3.5 text-center">Total Score</th>
                  <th className="px-6 py-3.5 text-left">Evaluation</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-gray-400">
                      <Loader2 className="w-6 h-6 animate-spin text-amber-600 mx-auto mb-2" />
                      Loading submissions...
                    </td>
                  </tr>
                ) : filteredSubmissions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-gray-400">
                      No submissions found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredSubmissions.map((sub) => {
                    return (
                      <tr key={sub.id} className="hover:bg-amber-50/30 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-gray-900">
                          {sub.student?.roll_no}
                        </td>
                        <td className="px-6 py-4 font-semibold text-gray-800">
                          {sub.student?.name}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900 text-xs">
                            {sub.test?.title}
                          </div>
                          <div className="text-[11px] text-gray-400 mt-0.5">
                            {sub.test?.academic_context?.course} • Sem {sub.test?.academic_context?.semester} ({sub.test?.academic_context?.section})
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-500">
                          {new Date(sub.submitted_at).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-6 py-4 text-center font-mono font-semibold text-emerald-700 bg-emerald-50/40">
                          {sub.mcq_score}
                        </td>
                        <td className="px-6 py-4 text-center font-mono font-semibold text-amber-700">
                          {sub.coding_score}
                        </td>
                        <td className="px-6 py-4 text-center font-mono font-bold text-gray-900 bg-gray-50/50">
                          {sub.total_score}
                        </td>
                        <td className="px-6 py-4">
                          {sub.evaluation_status === 'locked' ? (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 flex items-center gap-1 w-fit">
                              <Lock className="w-3 h-3 text-rose-500" /> Locked
                            </span>
                          ) : sub.evaluation_status === 'evaluated' ? (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 flex items-center gap-1 w-fit">
                              <CheckCircle2 className="w-3 h-3" /> Evaluated
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 flex items-center gap-1 w-fit">
                              <Clock className="w-3 h-3" /> Pending Review
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => setSelectedSubId(sub.id)}
                            className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition-colors"
                          >
                            Review & Grade
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal */}
        {selectedSubId && (
          <SubmissionReviewModal
            submissionId={selectedSubId}
            onClose={() => setSelectedSubId(null)}
            onUpdated={() => {
              loadSubmissions();
            }}
          />
        )}
      </div>
    </div>
  );
};
