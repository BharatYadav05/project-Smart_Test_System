import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { CreateClassModal } from '../../components/CreateClassModal';
import { X, Plus, Trash2, CheckCircle2, ChevronRight, ChevronLeft, Loader2, Sparkles } from 'lucide-react';

export const CreateTestModal = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [contexts, setContexts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedContextId, setSelectedContextId] = useState('');
  const [durationMins, setDurationMins] = useState(60);

  // MCQs
  const [mcqs, setMcqs] = useState([
    {
      question_text: 'Which HTML tag is used to define an internal style sheet?',
      question_type: 'single',
      marks: 1,
      options: [
        { option_text: '<style>', is_correct: true },
        { option_text: '<css>', is_correct: false },
        { option_text: '<script>', is_correct: false },
        { option_text: '<link>', is_correct: false },
      ],
    },
    {
      question_text: 'Which of the following are valid C data types? (Select all that apply)',
      question_type: 'multiple',
      marks: 2,
      options: [
        { option_text: 'int', is_correct: true },
        { option_text: 'float', is_correct: true },
        { option_text: 'char', is_correct: true },
        { option_text: 'number', is_correct: false },
      ],
    },
  ]);

  // Coding Questions
  const [codingQuestions, setCodingQuestions] = useState([
    {
      question_text: 'Write a C program to find the largest element in an array and print its index.',
      instructions: 'Ensure proper indentation and include comments for clarity.',
      marks: 10,
      require_code_text: true,
      require_code_photo: true,
      require_output_photo: true,
    },
  ]);

  useEffect(() => {
    if (isOpen) {
      loadContexts();
    }
  }, [isOpen]);

  const loadContexts = async (preferredId = null) => {
    setLoading(true);
    const { data } = await supabase.from('academic_contexts').select('*').order('created_at', { ascending: false });
    if (data && data.length > 0) {
      setContexts(data);
      if (preferredId) {
        setSelectedContextId(preferredId);
      } else if (!data.some((c) => c.id === selectedContextId)) {
        setSelectedContextId(data[0].id);
      }
    } else {
      setContexts([]);
      setSelectedContextId('');
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  // Add MCQ Question
  const addMCQ = () => {
    setMcqs([
      ...mcqs,
      {
        question_text: '',
        question_type: 'single',
        marks: 1,
        options: [
          { option_text: '', is_correct: true },
          { option_text: '', is_correct: false },
          { option_text: '', is_correct: false },
          { option_text: '', is_correct: false },
        ],
      },
    ]);
  };

  const removeMCQ = (idx) => {
    setMcqs(mcqs.filter((_, i) => i !== idx));
  };

  // Add Coding Question
  const addCoding = () => {
    setCodingQuestions([
      ...codingQuestions,
      {
        question_text: '',
        instructions: '',
        marks: 10,
        require_code_text: true,
        require_code_photo: true,
        require_output_photo: true,
      },
    ]);
  };

  const removeCoding = (idx) => {
    setCodingQuestions(codingQuestions.filter((_, i) => i !== idx));
  };

  // Generate 6-char access code
  const generateAccessCode = () => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleCreateTest = async (startLiveImmediately) => {
    if (!title.trim()) {
      setError('Please provide a test title.');
      setStep(1);
      return;
    }
    if (!selectedContextId) {
      setError('Please select or create a class/academic context first.');
      setStep(1);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const code = generateAccessCode();
      const now = new Date();
      const endAt = new Date(now.getTime() + durationMins * 60 * 1000);

      // 1. Insert Test
      const { data: testData, error: testErr } = await supabase
        .from('tests')
        .insert({
          academic_context_id: selectedContextId,
          title: title.trim(),
          description: description.trim(),
          duration_seconds: durationMins * 60,
          status: startLiveImmediately ? 'active' : 'scheduled',
          access_code: code,
          access_code_expires_at: endAt.toISOString(),
          started_at: startLiveImmediately ? now.toISOString() : null,
          start_at: now.toISOString(),
          end_at: endAt.toISOString(),
        })
        .select()
        .single();

      if (testErr || !testData) {
        throw new Error(testErr?.message || 'Could not create test.');
      }

      const testId = testData.id;

      // 2. Insert MCQs and options
      for (let i = 0; i < mcqs.length; i++) {
        const q = mcqs[i];
        if (!q.question_text.trim()) continue;

        const { data: qData } = await supabase
          .from('mcq_questions')
          .insert({
            test_id: testId,
            question_text: q.question_text,
            question_type: q.question_type,
            marks: q.marks,
            position: i + 1,
          })
          .select()
          .single();

        if (qData) {
          const optionsToInsert = q.options.map((opt, oIdx) => ({
            question_id: qData.id,
            option_text: opt.option_text || `Option ${oIdx + 1}`,
            position: oIdx + 1,
            is_correct: opt.is_correct,
          }));

          await supabase.from('mcq_options').insert(optionsToInsert);
        }
      }

      // 3. Insert Coding Questions
      for (let j = 0; j < codingQuestions.length; j++) {
        const cq = codingQuestions[j];
        if (!cq.question_text.trim()) continue;

        await supabase.from('coding_questions').insert({
          test_id: testId,
          question_text: cq.question_text,
          instructions: cq.instructions,
          marks: cq.marks,
          require_code_text: cq.require_code_text,
          require_code_photo: cq.require_code_photo,
          require_output_photo: cq.require_output_photo,
          position: j + 1,
        });
      }

      setSubmitting(false);
      onSuccess(testId);
    } catch (err) {
      setSubmitting(false);
      setError(err.message || 'Failed to initialize test.');
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-gray-100">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Create New Skill Lab Test</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Step {step} of 3: {step === 1 ? 'Class Context & Timing' : step === 2 ? 'Part A: MCQ Questions' : 'Part B: Coding Questions'}
              </p>
            </div>
            <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stepper Progress */}
          <div className="grid grid-cols-3 border-b border-gray-100 text-xs font-semibold">
            <div className={`py-2 text-center border-b-2 transition-all ${step === 1 ? 'border-amber-500 text-amber-700 bg-amber-50/30' : 'border-transparent text-gray-400'}`}>
              1. Context & Timing
            </div>
            <div className={`py-2 text-center border-b-2 transition-all ${step === 2 ? 'border-amber-500 text-amber-700 bg-amber-50/30' : 'border-transparent text-gray-400'}`}>
              2. Part A: MCQs ({mcqs.length})
            </div>
            <div className={`py-2 text-center border-b-2 transition-all ${step === 3 ? 'border-amber-500 text-amber-700 bg-amber-50/30' : 'border-transparent text-gray-400'}`}>
              3. Part B: Coding ({codingQuestions.length})
            </div>
          </div>

          {error && (
            <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
              {error}
            </div>
          )}

          {/* Content Body */}
          <div className="p-6 overflow-y-auto flex-1 space-y-6">
            {/* STEP 1 */}
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">
                    Test Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. BCA Sem 3 - C Programming Practical Exam"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:outline-none text-sm"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-semibold text-gray-800">
                      Target Academic Class & Section *
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsClassModalOpen(true)}
                      className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> + New Class
                    </button>
                  </div>

                  {loading ? (
                    <div className="flex items-center text-sm text-gray-500 py-2">
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading classes...
                    </div>
                  ) : contexts.length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-amber-300 bg-amber-50/60 text-center space-y-2">
                      <p className="text-xs text-amber-900 font-medium">
                        No academic classes available yet. Please create a class first.
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsClassModalOpen(true)}
                        className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1 shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" /> Create Class Now
                      </button>
                    </div>
                  ) : (
                    <select
                      value={selectedContextId}
                      onChange={(e) => setSelectedContextId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:outline-none text-sm font-medium text-gray-900"
                    >
                      {contexts.map((ctx) => (
                        <option key={ctx.id} value={ctx.id}>
                          {ctx.course} {ctx.branch ? `(${ctx.branch})` : ''} • {ctx.year ? `${ctx.year} • ` : ''}Semester {ctx.semester} • Section {ctx.section} ({ctx.academic_year || '2026-2027'})
                        </option>
                      ))}
                    </select>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    The generated access code will automatically map students to this specific class context.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-1">
                      Duration (Minutes)
                    </label>
                    <input
                      type="number"
                      min={5}
                      max={240}
                      value={durationMins}
                      onChange={(e) => setDurationMins(parseInt(e.target.value) || 60)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-1">
                      Instructions / Notes (Optional)
                    </label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="e.g. Total 3 questions. Upload code & output."
                      className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:outline-none text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: MCQs */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-800">
                    Multiple Choice Questions (Auto-Graded)
                  </span>
                  <button
                    type="button"
                    onClick={addMCQ}
                    className="px-3 py-1.5 rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Question
                  </button>
                </div>

                {mcqs.map((q, qIdx) => (
                  <div key={qIdx} className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-3 relative group">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Question {qIdx + 1}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <label className="text-xs text-gray-500">Marks:</label>
                          <input
                            type="number"
                            min={0.5}
                            step={0.5}
                            value={q.marks}
                            onChange={(e) => {
                              const newMcqs = [...mcqs];
                              newMcqs[qIdx].marks = parseFloat(e.target.value) || 1;
                              setMcqs(newMcqs);
                            }}
                            className="w-14 px-2 py-1 text-xs border border-gray-300 rounded"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeMCQ(qIdx)}
                          className="text-gray-400 hover:text-rose-500 p-1"
                          title="Remove question"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <input
                      type="text"
                      value={q.question_text}
                      onChange={(e) => {
                        const newMcqs = [...mcqs];
                        newMcqs[qIdx].question_text = e.target.value;
                        setMcqs(newMcqs);
                      }}
                      placeholder="Enter question text..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />

                    {/* Options */}
                    <div className="space-y-2 pt-1">
                      <span className="text-xs font-medium text-gray-500 block">
                        Options (Click checkmark to set correct answer):
                      </span>
                      {q.options.map((opt, oIdx) => (
                        <div key={oIdx} className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const newMcqs = [...mcqs];
                              if (q.question_type === 'single') {
                                newMcqs[qIdx].options.forEach((o, idx) => (o.is_correct = idx === oIdx));
                              } else {
                                newMcqs[qIdx].options[oIdx].is_correct = !newMcqs[qIdx].options[oIdx].is_correct;
                              }
                              setMcqs(newMcqs);
                            }}
                            className={`p-1.5 rounded-full border transition-all ${
                              opt.is_correct
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'bg-white border-gray-300 text-gray-300 hover:border-gray-400'
                            }`}
                            title={opt.is_correct ? 'Correct answer' : 'Mark as correct'}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <input
                            type="text"
                            value={opt.option_text}
                            onChange={(e) => {
                              const newMcqs = [...mcqs];
                              newMcqs[qIdx].options[oIdx].option_text = e.target.value;
                              setMcqs(newMcqs);
                            }}
                            placeholder={`Option ${oIdx + 1}`}
                            className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md text-xs bg-white focus:ring-1 focus:ring-amber-500 focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* STEP 3: CODING QUESTIONS */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-800">
                    Part B: Practical / Coding Questions (Manual Review)
                  </span>
                  <button
                    type="button"
                    onClick={addCoding}
                    className="px-3 py-1.5 rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Coding Question
                  </button>
                </div>

                {codingQuestions.map((cq, cIdx) => (
                  <div key={cIdx} className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Coding Question {cIdx + 1}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <label className="text-xs text-gray-500">Marks:</label>
                          <input
                            type="number"
                            min={1}
                            value={cq.marks}
                            onChange={(e) => {
                              const newCqs = [...codingQuestions];
                              newCqs[cIdx].marks = parseFloat(e.target.value) || 10;
                              setCodingQuestions(newCqs);
                            }}
                            className="w-14 px-2 py-1 text-xs border border-gray-300 rounded"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeCoding(cIdx)}
                          className="text-gray-400 hover:text-rose-500 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <textarea
                      rows={2}
                      value={cq.question_text}
                      onChange={(e) => {
                        const newCqs = [...codingQuestions];
                        newCqs[cIdx].question_text = e.target.value;
                        setCodingQuestions(newCqs);
                      }}
                      placeholder="Enter programming problem statement..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />

                    <input
                      type="text"
                      value={cq.instructions}
                      onChange={(e) => {
                        const newCqs = [...codingQuestions];
                        newCqs[cIdx].instructions = e.target.value;
                        setCodingQuestions(newCqs);
                      }}
                      placeholder="Instructions / constraints (optional)..."
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-xs bg-white focus:ring-1 focus:ring-amber-500 focus:outline-none"
                    />

                    {/* Required Evidence toggles */}
                    <div className="pt-2 border-t border-gray-200">
                      <span className="text-xs font-medium text-gray-600 block mb-1.5">
                        Required Evidence from Student:
                      </span>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-700">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={cq.require_code_text}
                            onChange={(e) => {
                              const newCqs = [...codingQuestions];
                              newCqs[cIdx].require_code_text = e.target.checked;
                              setCodingQuestions(newCqs);
                            }}
                            className="rounded text-amber-600 focus:ring-amber-500"
                          />
                          <span>Code as Text</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={cq.require_code_photo}
                            onChange={(e) => {
                              const newCqs = [...codingQuestions];
                              newCqs[cIdx].require_code_photo = e.target.checked;
                              setCodingQuestions(newCqs);
                            }}
                            className="rounded text-amber-600 focus:ring-amber-500"
                          />
                          <span>Live Code Photo (Camera)</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={cq.require_output_photo}
                            onChange={(e) => {
                              const newCqs = [...codingQuestions];
                              newCqs[cIdx].require_output_photo = e.target.checked;
                              setCodingQuestions(newCqs);
                            }}
                            className="rounded text-amber-600 focus:ring-amber-500"
                          />
                          <span>Live Output Photo (Camera)</span>
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Navigation */}
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div>
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {step < 3 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (step === 1 && !title.trim()) {
                      setError('Please provide a test title.');
                      return;
                    }
                    if (step === 1 && !selectedContextId) {
                      setError('Please select or create a class/academic context first.');
                      return;
                    }
                    setError(null);
                    setStep(step + 1);
                  }}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-semibold flex items-center gap-1 shadow-sm"
                >
                  Next Step <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleCreateTest(false)}
                    className="px-4 py-2.5 border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    Save as Draft
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleCreateTest(true)}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 shadow-md disabled:opacity-70 transition-all"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Starting...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" /> Start Live Test (Get Code)
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Nested Class Creator */}
      <CreateClassModal
        isOpen={isClassModalOpen}
        onClose={() => setIsClassModalOpen(false)}
        onSuccess={(newClass) => {
          loadContexts(newClass?.id);
        }}
      />
    </>
  );
};
