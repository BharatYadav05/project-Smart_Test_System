import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { CreateClassModal } from '../../components/CreateClassModal';
import { Users, Search, Loader2, Plus, GraduationCap, Trash2, AlertCircle } from 'lucide-react';

export const ClassRosterPage = () => {
  const [contexts, setContexts] = useState([]);
  const [selectedContextId, setSelectedContextId] = useState('');
  const [students, setStudents] = useState([]);
  const [submissionCounts, setSubmissionCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    loadClasses();
  }, []);

  useEffect(() => {
    if (selectedContextId) {
      loadStudentsForClass(selectedContextId);
    } else {
      setStudents([]);
    }
  }, [selectedContextId]);

  const loadClasses = async (preferredSelectId = null) => {
    setLoading(true);
    const { data } = await supabase
      .from('academic_contexts')
      .select('*')
      .order('created_at', { ascending: false });

    if (data && data.length > 0) {
      setContexts(data);
      if (preferredSelectId && data.some((c) => c.id === preferredSelectId)) {
        setSelectedContextId(preferredSelectId);
      } else if (!data.some((c) => c.id === selectedContextId)) {
        setSelectedContextId(data[0].id);
      }
    } else {
      setContexts([]);
      setSelectedContextId('');
      setStudents([]);
    }
    setLoading(false);
  };

  const loadStudentsForClass = async (contextId) => {
    setLoading(true);
    const { data: studentList } = await supabase
      .from('students')
      .select('*')
      .eq('academic_context_id', contextId)
      .order('roll_no');

    if (studentList) {
      setStudents(studentList);

      // Count submissions for each student
      const { data: subs } = await supabase
        .from('submissions')
        .select('student_id');

      if (subs) {
        const counts = {};
        subs.forEach((s) => {
          counts[s.student_id] = (counts[s.student_id] || 0) + 1;
        });
        setSubmissionCounts(counts);
      }
    } else {
      setStudents([]);
    }
    setLoading(false);
  };

  const handleDeleteClass = async (contextId) => {
    if (!window.confirm('Are you sure you want to delete this class and its roster?')) {
      return;
    }
    setDeletingId(contextId);
    await supabase.from('academic_contexts').delete().eq('id', contextId);
    setDeletingId(null);
    loadClasses();
  };

  const selectedContext = contexts.find((c) => c.id === selectedContextId);

  const filteredStudents = students.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return s.roll_no?.toLowerCase().includes(q) || s.name?.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#f5f6fa] p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header with New Class button */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <Users className="w-6 h-6 text-amber-600" />
              Academic Classes & Student Rosters
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Create classes and manage student rosters. Students are automatically enrolled upon submitting tests.
            </p>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Class</span>
          </button>
        </div>

        {/* If NO classes exist yet */}
        {!loading && contexts.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-200 shadow-sm max-w-xl mx-auto space-y-4 my-8">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center mx-auto">
              <GraduationCap className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">No Classes Created Yet</h2>
              <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                Get started by adding your first academic class/batch. Choose Course, Branch, Year, Semester, and Section.
              </p>
            </div>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs sm:text-sm font-bold inline-flex items-center gap-2 shadow-md transition-all"
            >
              <Plus className="w-4 h-4" /> Create First Class
            </button>
          </div>
        ) : (
          <>
            {/* Class Selection & Search Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-6">
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Select Class / Section
                </label>
                <select
                  value={selectedContextId}
                  onChange={(e) => setSelectedContextId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none font-medium text-gray-800"
                >
                  {contexts.map((ctx) => (
                    <option key={ctx.id} value={ctx.id}>
                      {ctx.course} {ctx.branch ? `(${ctx.branch})` : ''} • {ctx.year ? `${ctx.year} • ` : ''}Semester {ctx.semester} • Section {ctx.section} ({ctx.academic_year || '2026-2027'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-6">
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Filter Students in Selected Class
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by student name or roll number..."
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Current Class Overview Card */}
            {selectedContext && (
              <div className="bg-gradient-to-r from-[#241f1a] to-[#1a1612] text-white p-6 rounded-2xl border border-amber-600/30 shadow-md flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold text-base">
                    {selectedContext.course}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      {selectedContext.course} {selectedContext.branch ? `— ${selectedContext.branch}` : ''}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-amber-400/90 font-mono">
                      {selectedContext.year && <span>{selectedContext.year} •</span>}
                      <span>Semester {selectedContext.semester}</span>
                      <span>• Section {selectedContext.section}</span>
                      <span>• Cycle: {selectedContext.academic_year}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <span className="text-xs text-gray-400 block font-medium">Enrolled Students</span>
                    <span className="text-2xl font-bold font-mono text-amber-400">{students.length}</span>
                  </div>

                  <button
                    onClick={() => handleDeleteClass(selectedContext.id)}
                    disabled={deletingId === selectedContext.id}
                    className="p-2.5 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
                    title="Delete Class"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Students Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3.5 text-left">Roll Number</th>
                      <th className="px-6 py-3.5 text-left">Student Name</th>
                      <th className="px-6 py-3.5 text-left">First Enrolled</th>
                      <th className="px-6 py-3.5 text-left">Last Activity</th>
                      <th className="px-6 py-3.5 text-center">Tests Submitted</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                          <Loader2 className="w-6 h-6 animate-spin text-amber-600 mx-auto mb-2" />
                          Loading class roster...
                        </td>
                      </tr>
                    ) : filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                          No students enrolled in this class yet. When students join and submit an assessment with this class's access code, they will appear here automatically.
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((st) => (
                        <tr key={st.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="px-6 py-4 font-mono font-bold text-gray-900">
                            {st.roll_no}
                          </td>
                          <td className="px-6 py-4 font-semibold text-gray-800">
                            {st.name}
                          </td>
                          <td className="px-6 py-4 text-xs text-gray-500">
                            {new Date(st.first_submitted_at).toLocaleDateString([], {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </td>
                          <td className="px-6 py-4 text-xs text-gray-500">
                            {new Date(st.last_submitted_at).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="font-mono font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full text-xs border border-amber-200">
                              {submissionCounts[st.id] || 1}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Modal for Creating New Class */}
        <CreateClassModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={(newClass) => {
            loadClasses(newClass?.id);
          }}
        />
      </div>
    </div>
  );
};
