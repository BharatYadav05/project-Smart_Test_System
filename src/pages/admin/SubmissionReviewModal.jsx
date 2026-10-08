import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  X, 
  Lock, 
  Loader2, 
  Save, 
  FileCode, 
  Image as ImageIcon, 
  HelpCircle, 
  CheckCircle2, 
  XCircle, 
  AlertCircle 
} from 'lucide-react';

export const SubmissionReviewModal = ({
  submissionId,
  onClose,
  onUpdated,
}) => {
  const [submission, setSubmission] = useState(null);
  const [codingResponses, setCodingResponses] = useState([]);
  const [codingQuestions, setCodingQuestions] = useState([]);
  const [mcqAnswers, setMcqAnswers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Active view tab in review
  const [activeTab, setActiveTab] = useState('coding');

  // Evaluation states
  const [evalMarks, setEvalMarks] = useState({});
  const [evalFeedbacks, setEvalFeedbacks] = useState({});
  const [generalFeedback, setGeneralFeedback] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  useEffect(() => {
    if (submissionId) {
      loadSubmissionDetails();
    }
  }, [submissionId]);

  const loadSubmissionDetails = async () => {
    if (!submissionId) return;
    setLoading(true);
    setError(null);

    // Fetch submission with student & test
    const { data: subData } = await supabase
      .from('submissions')
      .select('*, student:students(*), test:tests(*, academic_context:academic_contexts(*))')
      .eq('id', submissionId)
      .single();

    if (subData) {
      setSubmission(subData);
      setGeneralFeedback(subData.teacher_feedback || '');

      // 1. Fetch coding questions
      const { data: qData } = await supabase
        .from('coding_questions')
        .select('*')
        .eq('test_id', subData.test_id)
        .order('position');

      if (qData) setCodingQuestions(qData);

      // 2. Fetch coding responses
      const { data: respData } = await supabase
        .from('coding_responses')
        .select('*')
        .eq('attempt_id', subData.attempt_id);

      if (respData) setCodingResponses(respData);

      // 3. Fetch marked MCQ answers with question and options
      const { data: ansData } = await supabase
        .from('mcq_answers')
        .select('*, question:mcq_questions(*, options:mcq_options(*))')
        .eq('attempt_id', subData.attempt_id);

      if (ansData) setMcqAnswers(ansData);

      // 4. Fetch existing evaluations
      const { data: evalData } = await supabase
        .from('coding_evaluations')
        .select('*')
        .eq('submission_id', submissionId);

      const initialMarks = {};
      const initialFeedbacks = {};

      if (evalData) {
        evalData.forEach((ev) => {
          initialMarks[ev.coding_question_id] = ev.marks_awarded;
          initialFeedbacks[ev.coding_question_id] = ev.feedback || '';
        });
      }

      if (qData && evalData?.length === 0) {
        qData.forEach((q) => {
          initialMarks[q.id] = q.marks;
        });
      }

      setEvalMarks(initialMarks);
      setEvalFeedbacks(initialFeedbacks);
    }

    setLoading(false);
  };

  const handleSaveEvaluation = async (lock) => {
    if (!submission) return;
    setSaving(true);
    setError(null);

    const evaluationsArray = codingQuestions.map((q) => ({
      coding_question_id: q.id,
      marks_awarded: evalMarks[q.id] !== undefined ? Number(evalMarks[q.id]) : 0,
      feedback: evalFeedbacks[q.id] || '',
    }));

    // Call evaluate_submission RPC
    const { data, error: rpcError } = await supabase.rpc('evaluate_submission', {
      p_submission_id: submission.id,
      p_evaluations: evaluationsArray,
      p_general_feedback: generalFeedback,
      p_lock: lock,
    });

    setSaving(false);

    if (rpcError || (data && !data.success)) {
      setError(rpcError?.message || data?.error || 'Failed to save evaluation.');
    } else {
      onUpdated();
      onClose();
    }
  };

  if (!submissionId) return null;

  const currentCodingTotal = Object.values(evalMarks).reduce((a, b) => a + Number(b || 0), 0);
  const currentTotal = (submission?.mcq_score || 0) + currentCodingTotal;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/70">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                Roll No: {submission?.student?.roll_no}
              </span>
              <span className="text-sm font-semibold text-gray-900">
                {submission?.student?.name}
              </span>
              <span className="text-xs text-gray-400">•</span>
              <span className="text-xs text-gray-600">
                {submission?.test?.academic_context?.course} Sem {submission?.test?.academic_context?.semester} ({submission?.test?.academic_context?.section})
              </span>
            </div>
            <h2 className="text-base font-bold text-gray-900 mt-0.5">
              {submission?.test?.title}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Auto MCQ Score Badge */}
            <div className="text-right">
              <span className="text-[11px] font-semibold text-gray-500 uppercase block">
                Auto-Scored MCQ
              </span>
              <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-sm">
                {submission?.mcq_score} pts
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Selector: Coding Work vs Marked MCQs */}
        <div className="flex border-b border-gray-200 bg-gray-100/50 px-6 pt-2 gap-4">
          <button
            onClick={() => setActiveTab('coding')}
            className={`pb-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'coding'
                ? 'border-amber-600 text-amber-800'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <FileCode className="w-4 h-4" />
            Coding Evidence & Evaluation ({codingQuestions.length})
          </button>
          <button
            onClick={() => setActiveTab('mcq')}
            className={`pb-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'mcq'
                ? 'border-amber-600 text-amber-800'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            Marked MCQ Answers ({mcqAnswers.length})
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-3 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Content split */}
        {loading ? (
          <div className="p-16 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
          </div>
        ) : (
          <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT PANE */}
            <div className="lg:col-span-7 space-y-6">
              {activeTab === 'coding' ? (
                <>
                  <h3 className="text-sm font-bold text-gray-900 border-b pb-2 flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-amber-600" />
                    Submitted Coding Work & Photo Evidence
                  </h3>

                  {codingQuestions.map((q, idx) => {
                    const resp = codingResponses.find((r) => r.coding_question_id === q.id);
                    const codePhotos = resp?.code_photo_urls?.length 
                      ? resp.code_photo_urls 
                      : (resp?.code_photo_url ? [resp.code_photo_url] : []);
                    const outputPhotos = resp?.output_photo_urls?.length 
                      ? resp.output_photo_urls 
                      : (resp?.output_photo_url ? [resp.output_photo_url] : []);

                    return (
                      <div key={q.id} className="p-4 rounded-xl border border-gray-200 bg-gray-50/60 space-y-3">
                        <div>
                          <span className="text-xs font-bold text-gray-500 uppercase">
                            Question {idx + 1} ({q.marks} Max Marks)
                          </span>
                          <p className="text-sm font-semibold text-gray-900 mt-1">
                            {q.question_text}
                          </p>
                          {q.instructions && (
                            <p className="text-xs text-gray-500 italic mt-0.5">
                              {q.instructions}
                            </p>
                          )}
                        </div>

                        {/* Student Code Text */}
                        {resp?.code_text ? (
                          <div>
                            <span className="text-xs font-semibold text-gray-700 flex items-center gap-1 mb-1">
                              <FileCode className="w-3.5 h-3.5" /> Student Code:
                            </span>
                            <pre className="p-3 bg-[#1e1e1e] text-emerald-400 font-mono text-xs rounded-lg overflow-x-auto max-h-56 leading-relaxed select-text">
                              <code>{resp.code_text}</code>
                            </pre>
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 italic">No code text submitted.</p>
                        )}

                        {/* Code Photos Gallery (up to 20) */}
                        <div className="space-y-1.5 pt-2">
                          <span className="text-[11px] font-semibold text-gray-700 flex items-center gap-1">
                            <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                            Code Photos ({codePhotos.length} uploaded)
                          </span>
                          {codePhotos.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {codePhotos.map((url, pIdx) => (
                                <div
                                  key={pIdx}
                                  onClick={() => setSelectedPhoto(url)}
                                  className="aspect-video bg-gray-200 rounded-lg overflow-hidden border border-gray-300 relative group cursor-pointer"
                                >
                                  <img
                                    src={url}
                                    alt={`Code evidence ${pIdx + 1}`}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[11px] font-medium transition-opacity">
                                    Enlarge #{pIdx + 1}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-2.5 rounded-lg border border-dashed text-center text-gray-400 text-xs">
                              No code photos uploaded
                            </div>
                          )}
                        </div>

                        {/* Output Photos Gallery (up to 5) */}
                        <div className="space-y-1.5 pt-2">
                          <span className="text-[11px] font-semibold text-gray-700 flex items-center gap-1">
                            <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                            Output Photos ({outputPhotos.length} uploaded)
                          </span>
                          {outputPhotos.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {outputPhotos.map((url, oIdx) => (
                                <div
                                  key={oIdx}
                                  onClick={() => setSelectedPhoto(url)}
                                  className="aspect-video bg-gray-200 rounded-lg overflow-hidden border border-gray-300 relative group cursor-pointer"
                                >
                                  <img
                                    src={url}
                                    alt={`Output evidence ${oIdx + 1}`}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[11px] font-medium transition-opacity">
                                    Enlarge #{oIdx + 1}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-2.5 rounded-lg border border-dashed text-center text-gray-400 text-xs">
                              No output photos uploaded
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </>
              ) : (
                /* MARKED MCQ ANSWERS TAB */
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-gray-900 border-b pb-2 flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-amber-600" />
                    Student's Marked MCQ Answers
                  </h3>

                  {mcqAnswers.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-xs">
                      No MCQ answers recorded for this attempt.
                    </div>
                  ) : (
                    mcqAnswers.map((ans, idx) => {
                      const q = ans.question;
                      const selectedIds = ans.selected_options || [];

                      return (
                        <div key={ans.id} className="p-4 rounded-xl border border-gray-200 bg-white space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-500 uppercase">
                              Q{idx + 1}: {q?.question_text}
                            </span>
                            <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                              Score: {ans.awarded_marks} / {q?.marks} pts
                            </span>
                          </div>

                          <div className="space-y-1.5 pt-1">
                            {q?.options?.map((opt) => {
                              const isStudentSelected = selectedIds.includes(opt.id);
                              const isCorrect = opt.is_correct;

                              return (
                                <div
                                  key={opt.id}
                                  className={`p-2 rounded-lg text-xs flex items-center justify-between border ${
                                    isStudentSelected && isCorrect
                                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-semibold'
                                      : isStudentSelected && !isCorrect
                                      ? 'bg-rose-50 border-rose-300 text-rose-950 font-semibold'
                                      : isCorrect
                                      ? 'bg-gray-50 border-gray-300 text-gray-700'
                                      : 'border-transparent text-gray-500'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    {isStudentSelected ? (
                                      isCorrect ? (
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                                      ) : (
                                        <XCircle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                                      )
                                    ) : (
                                      <div className="w-3.5 h-3.5 rounded-full border border-gray-300 flex-shrink-0" />
                                    )}
                                    <span>{opt.option_text}</span>
                                  </div>

                                  <div className="flex items-center gap-2 text-[10px]">
                                    {isStudentSelected && (
                                      <span className="px-1.5 py-0.5 rounded bg-black/10 font-mono">
                                        Marked by Student
                                      </span>
                                    )}
                                    {isCorrect && (
                                      <span className="text-emerald-700 font-bold">
                                        (Correct)
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* RIGHT PANE: TEACHER EVALUATION FORM */}
            <div className="lg:col-span-5 bg-gray-50/80 p-5 rounded-xl border border-gray-200 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <h3 className="text-sm font-bold text-gray-900">
                    Teacher Evaluation
                  </h3>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    submission?.evaluation_status === 'locked'
                      ? 'bg-rose-100 text-rose-800'
                      : submission?.evaluation_status === 'evaluated'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {submission?.evaluation_status?.toUpperCase()}
                  </span>
                </div>

                {/* Score Summary Box */}
                <div className="p-3 rounded-xl bg-white border border-gray-200 shadow-sm grid grid-cols-3 text-center">
                  <div>
                    <span className="text-[10px] text-gray-400 font-semibold block uppercase">MCQ Score</span>
                    <span className="text-base font-bold text-gray-800">{submission?.mcq_score}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 font-semibold block uppercase">Coding Marks</span>
                    <span className="text-base font-bold text-amber-600">{currentCodingTotal}</span>
                  </div>
                  <div className="border-l border-gray-100">
                    <span className="text-[10px] text-gray-400 font-semibold block uppercase">Total Score</span>
                    <span className="text-base font-bold text-emerald-600">{currentTotal}</span>
                  </div>
                </div>

                {/* Question-wise Marks Inputs */}
                <div className="space-y-3">
                  {codingQuestions.map((q, idx) => (
                    <div key={q.id} className="p-3 bg-white rounded-lg border border-gray-200 shadow-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-gray-700">
                          Q{idx + 1} Marks (Max {q.marks}):
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={q.marks}
                          step={0.5}
                          value={evalMarks[q.id] !== undefined ? evalMarks[q.id] : ''}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setEvalMarks({
                              ...evalMarks,
                              [q.id]: isNaN(val) ? 0 : Math.min(q.marks, Math.max(0, val)),
                            });
                          }}
                          className="w-20 px-2.5 py-1 text-sm font-bold border border-gray-300 rounded text-right focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        />
                      </div>
                      <input
                        type="text"
                        value={evalFeedbacks[q.id] || ''}
                        onChange={(e) =>
                          setEvalFeedbacks({ ...evalFeedbacks, [q.id]: e.target.value })
                        }
                        placeholder="Optional note on logic, syntax..."
                        className="w-full px-2.5 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-amber-500 focus:outline-none text-gray-700"
                      />
                    </div>
                  ))}
                </div>

                {/* Overall Teacher Feedback */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Overall Teacher Feedback / Remarks
                  </label>
                  <textarea
                    rows={2}
                    value={generalFeedback}
                    onChange={(e) => setGeneralFeedback(e.target.value)}
                    placeholder="e.g. Well executed. Good code structure and verified output."
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  disabled={saving || submission?.evaluation_status === 'locked'}
                  onClick={() => handleSaveEvaluation(false)}
                  className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-60 transition-all"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save & Finalize Evaluation
                </button>

                <button
                  type="button"
                  disabled={saving || submission?.evaluation_status === 'locked'}
                  onClick={() => handleSaveEvaluation(true)}
                  className="w-full py-2 px-4 bg-gray-900 hover:bg-black text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all disabled:opacity-60"
                  title="Lock to prevent future changes"
                >
                  <Lock className="w-3.5 h-3.5 text-rose-400" />
                  Save and Lock Permanently
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PHOTO LIGHTBOX MODAL */}
        {selectedPhoto && (
          <div
            onClick={() => setSelectedPhoto(null)}
            className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
          >
            <div className="relative max-w-4xl max-h-[90vh]">
              <img
                src={selectedPhoto}
                alt="Enlarged evidence"
                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
              />
              <button
                onClick={() => setSelectedPhoto(null)}
                className="absolute top-2 right-2 p-2 bg-black/60 text-white rounded-full hover:bg-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
