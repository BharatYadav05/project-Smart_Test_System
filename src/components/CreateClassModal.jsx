import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, Plus, GraduationCap, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

const COURSE_BRANCHES = {
  'B.Tech': [
    'Computer Science & Engineering (CSE)',
    'Information Technology (IT)',
    'Artificial Intelligence & ML (AI/ML)',
    'Data Science (DS)',
    'Electronics & Communication (ECE)',
    'Mechanical Engineering (ME)',
    'Civil Engineering (CE)',
    'Electrical Engineering (EE)',
    'Other / Custom',
  ],
  'BCA': [
    'Computer Applications (General)',
    'Data Science & Analytics',
    'Cloud & Information Security',
    'Other / Custom',
  ],
  'MCA': [
    'Computer Applications (General)',
    'Artificial Intelligence',
    'Software Development',
    'Other / Custom',
  ],
  'Diploma': [
    'Computer Science & Engineering',
    'Mechanical Engineering',
    'Civil Engineering',
    'Electrical Engineering',
    'Electronics Engineering',
    'Other / Custom',
  ],
  'M.Tech': [
    'Computer Science & Engineering',
    'Digital Electronics & VLSI',
    'Thermal Engineering',
    'Structural Engineering',
    'Other / Custom',
  ],
  'B.Sc': [
    'Computer Science',
    'Information Technology',
    'General',
    'Other / Custom',
  ],
  'Other': ['General', 'Other / Custom'],
};

const YEAR_OPTIONS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

export const CreateClassModal = ({ isOpen, onClose, onSuccess }) => {
  const [course, setCourse] = useState('B.Tech');
  const [branch, setBranch] = useState('Computer Science & Engineering (CSE)');
  const [customBranch, setCustomBranch] = useState('');
  const [year, setYear] = useState('2nd Year');
  const [semester, setSemester] = useState(3);
  const [section, setSection] = useState('A');
  const [customSection, setCustomSection] = useState('');
  const [academicCycle, setAcademicCycle] = useState('2026-2027');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  // Handle Course change
  const handleCourseChange = (newCourse) => {
    setCourse(newCourse);
    const availableBranches = COURSE_BRANCHES[newCourse] || ['General'];
    setBranch(availableBranches[0]);
    setCustomBranch('');
  };

  // Handle Year change - automatically suggest semester
  const handleYearChange = (newYear) => {
    setYear(newYear);
    if (newYear === '1st Year') setSemester(1);
    else if (newYear === '2nd Year') setSemester(3);
    else if (newYear === '3rd Year') setSemester(5);
    else if (newYear === '4th Year') setSemester(7);
  };

  const effectiveBranch = branch === 'Other / Custom' ? customBranch.trim() : branch;
  const effectiveSection = section === 'Other' ? customSection.trim().toUpperCase() : section;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!course.trim()) {
      setError('Please select a Course.');
      return;
    }
    if (branch === 'Other / Custom' && !customBranch.trim()) {
      setError('Please specify the Branch name.');
      return;
    }
    if (section === 'Other' && !customSection.trim()) {
      setError('Please specify the Section name.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: insertError } = await supabase
        .from('academic_contexts')
        .insert({
          course: course.trim(),
          branch: effectiveBranch,
          year: year,
          semester: Number(semester),
          section: effectiveSection,
          academic_year: academicCycle.trim(),
          is_active: true,
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(insertError.message || 'Failed to create class.');
      }

      setLoading(false);
      onSuccess(data);
      onClose();
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Failed to save class.');
    }
  };

  // Max semesters based on course
  const maxSemesters = course === 'Diploma' || course === 'BCA' || course === 'B.Sc' ? 6 : course === 'MCA' || course === 'M.Tech' ? 4 : 8;
  const semesterOptions = Array.from({ length: maxSemesters }, (_, i) => i + 1);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Create New Class / Batch</h2>
              <p className="text-xs text-gray-500">Configure academic details for the new class roster</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* 1. Course */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Course *
            </label>
            <select
              value={course}
              onChange={(e) => handleCourseChange(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:outline-none text-sm font-medium text-gray-900"
            >
              {Object.keys(COURSE_BRANCHES).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Branch */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Branch / Specialization *
            </label>
            <select
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:outline-none text-sm font-medium text-gray-900"
            >
              {(COURSE_BRANCHES[course] || ['General']).map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>

            {branch === 'Other / Custom' && (
              <input
                type="text"
                required
                value={customBranch}
                onChange={(e) => setCustomBranch(e.target.value)}
                placeholder="Enter custom branch name..."
                className="mt-2 w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            )}
          </div>

          {/* 3. Year & Semester (Side-by-Side) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Year *
              </label>
              <select
                value={year}
                onChange={(e) => handleYearChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:outline-none text-sm font-medium text-gray-900"
              >
                {YEAR_OPTIONS.slice(0, course === 'MCA' || course === 'M.Tech' ? 2 : course === 'Diploma' || course === 'BCA' || course === 'B.Sc' ? 3 : 4).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Semester *
              </label>
              <select
                value={semester}
                onChange={(e) => setSemester(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:outline-none text-sm font-medium text-gray-900"
              >
                {semesterOptions.map((s) => (
                  <option key={s} value={s}>
                    Semester {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 4. Section & Academic Cycle */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Section *
              </label>
              <select
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:outline-none text-sm font-medium text-gray-900"
              >
                <option value="A">Section A</option>
                <option value="B">Section B</option>
                <option value="C">Section C</option>
                <option value="D">Section D</option>
                <option value="E">Section E</option>
                <option value="Other">Other (Custom)</option>
              </select>

              {section === 'Other' && (
                <input
                  type="text"
                  required
                  maxLength={4}
                  value={customSection}
                  onChange={(e) => setCustomSection(e.target.value.toUpperCase())}
                  placeholder="e.g. F"
                  className="mt-2 w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm uppercase focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Academic Cycle
              </label>
              <input
                type="text"
                value={academicCycle}
                onChange={(e) => setAcademicCycle(e.target.value)}
                placeholder="2026-2027"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:outline-none text-sm font-mono text-gray-900"
              />
            </div>
          </div>

          {/* Live Preview Card */}
          <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/80 space-y-1">
            <span className="text-[10px] font-mono tracking-wider uppercase font-semibold text-amber-800 block">
              Class Summary Preview
            </span>
            <div className="text-sm font-bold text-amber-950">
              {course} {effectiveBranch ? `(${effectiveBranch})` : ''} • {year} • Semester {semester} • Section {effectiveSection}
            </div>
            <span className="text-[11px] text-amber-700 block">
              Cycle: {academicCycle}
            </span>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-100 rounded-xl text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md disabled:opacity-60 transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating Class...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Save & Create Class
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
