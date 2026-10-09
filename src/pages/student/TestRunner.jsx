import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ImageUpload } from '../../components/ImageUpload';
import { 
  Clock, 
  CheckCircle2, 
  Send, 
  Code2, 
  HelpCircle, 
  AlertTriangle, 
  Loader2, 
  FileCheck,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  X,
  Cloud
} from 'lucide-react';

export const TestRunner = () => {
  const navigate = useNavigate();

  const [testData, setTestData] = useState(null);
  const [attemptId, setAttemptId] = useState('');
  const [sessionToken, setSessionToken] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentRoll, setStudentRoll] = useState('');

  const [activeTab, setActiveTab] = useState('mcq');

  // Answers State
  const [mcqAnswers, setMcqAnswers] = useState({});
  const [codingTexts, setCodingTexts] = useState({});
  const [codePhotoUrls, setCodePhotoUrls] = useState({});
  const [outputPhotoUrls, setOutputPhotoUrls] = useState({});
  const [resumedBanner, setResumedBanner] = useState(null);
  const [saveStatus, setSaveStatus] = useState('Saved');

  // Refs to avoid stale closures in timers and realtime subscriptions
  const mcqAnswersRef = useRef(mcqAnswers);
  mcqAnswersRef.current = mcqAnswers;
  const codingTextsRef = useRef(codingTexts);
  codingTextsRef.current = codingTexts;
  const codePhotoUrlsRef = useRef(codePhotoUrls);
  codePhotoUrlsRef.current = codePhotoUrls;
  const outputPhotoUrlsRef = useRef(outputPhotoUrls);
  outputPhotoUrlsRef.current = outputPhotoUrls;
  const testDataRef = useRef(testData);
  testDataRef.current = testData;
  const attemptIdRef = useRef(attemptId);
  attemptIdRef.current = attemptId;
  const sessionTokenRef = useRef(sessionToken);
  sessionTokenRef.current = sessionToken;
  const isSubmittingRef = useRef(false);
  const autoSaveTimerRef = useRef(null);

  // Timer
  const [timeRemaining, setTimeRemaining] = useState('--:--');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const rawTest = sessionStorage.getItem('current_test_data');
    const aId = sessionStorage.getItem('current_attempt_id');
    const sToken = sessionStorage.getItem('current_session_token');
    const sName = sessionStorage.getItem('current_student_name');
    const sRoll = sessionStorage.getItem('current_student_roll');
    const isResumed = sessionStorage.getItem('is_resumed_attempt') === 'true';

    if (!rawTest || !aId || !sToken) {
      navigate('/');
      return;
    }

    const parsedTest = JSON.parse(rawTest);
    setTestData(parsedTest);
    testDataRef.current = parsedTest;
    setAttemptId(aId);
    attemptIdRef.current = aId;
    setSessionToken(sToken);
    sessionTokenRef.current = sToken;
    setStudentName(sName || '');
    setStudentRoll(sRoll || '');

    // Load saved progress (both local device storage and cloud database draft)
    loadSavedProgress(parsedTest.test.id, sRoll, aId, isResumed);
  }, []);

  const loadSavedProgress = async (testId, rollNo, aId, isResumed) => {
    let recoveredMcq = {};
    let recoveredCoding = {};
    let recoveredCodePhotos = {};
    let recoveredOutputPhotos = {};
    let recoveredTab = 'mcq';
    let hadSavedProgress = false;

    // 1. Recover from LocalStorage (Instant / Same Device)
    const localKey = `test_progress_${testId}_${rollNo}`;
    const localSaved = localStorage.getItem(localKey);
    if (localSaved) {
      try {
        const parsed = JSON.parse(localSaved);
        if (parsed.mcqAnswers && Object.keys(parsed.mcqAnswers).length > 0) {
          recoveredMcq = { ...parsed.mcqAnswers };
          hadSavedProgress = true;
        }
        if (parsed.codingTexts && Object.keys(parsed.codingTexts).length > 0) {
          recoveredCoding = { ...parsed.codingTexts };
          hadSavedProgress = true;
        }
        if (parsed.codePhotoUrls && Object.keys(parsed.codePhotoUrls).length > 0) {
          recoveredCodePhotos = { ...parsed.codePhotoUrls };
          hadSavedProgress = true;
        }
        if (parsed.outputPhotoUrls && Object.keys(parsed.outputPhotoUrls).length > 0) {
          recoveredOutputPhotos = { ...parsed.outputPhotoUrls };
          hadSavedProgress = true;
        }
        if (parsed.activeTab) {
          recoveredTab = parsed.activeTab;
        }
      } catch (e) {}
    }

    // 2. Recover from Supabase Cloud Draft (Cross-Device & Device Switch)
    try {
      const { data: attemptRow } = await supabase
        .from('test_attempts')
        .select('draft_data')
        .eq('id', aId)
        .single();

      if (attemptRow?.draft_data) {
        const cloudDraft = attemptRow.draft_data;
        if (cloudDraft.mcqAnswers && Object.keys(cloudDraft.mcqAnswers).length > 0) {
          recoveredMcq = { ...recoveredMcq, ...cloudDraft.mcqAnswers };
          hadSavedProgress = true;
        }
        if (cloudDraft.codingTexts && Object.keys(cloudDraft.codingTexts).length > 0) {
          recoveredCoding = { ...recoveredCoding, ...cloudDraft.codingTexts };
          hadSavedProgress = true;
        }
        if (cloudDraft.codePhotoUrls && Object.keys(cloudDraft.codePhotoUrls).length > 0) {
          recoveredCodePhotos = { ...recoveredCodePhotos, ...cloudDraft.codePhotoUrls };
          hadSavedProgress = true;
        }
        if (cloudDraft.outputPhotoUrls && Object.keys(cloudDraft.outputPhotoUrls).length > 0) {
          recoveredOutputPhotos = { ...recoveredOutputPhotos, ...cloudDraft.outputPhotoUrls };
          hadSavedProgress = true;
        }
        if (cloudDraft.activeTab) {
          recoveredTab = cloudDraft.activeTab;
        }
      }
    } catch (err) {
      console.log('Draft recovery notice:', err);
    }

    // 3. Fallback to legacy key
    const legacyMcq = localStorage.getItem(`mcq_answers_${aId}`);
    if (legacyMcq) {
      try {
        const parsedLegacy = JSON.parse(legacyMcq);
        recoveredMcq = { ...recoveredMcq, ...parsedLegacy };
        hadSavedProgress = true;
      } catch (e) {}
    }

    // Apply recovered answers
    if (Object.keys(recoveredMcq).length > 0) {
      setMcqAnswers(recoveredMcq);
      mcqAnswersRef.current = recoveredMcq;
    }
    if (Object.keys(recoveredCoding).length > 0) {
      setCodingTexts(recoveredCoding);
      codingTextsRef.current = recoveredCoding;
    }
    if (Object.keys(recoveredCodePhotos).length > 0) {
      setCodePhotoUrls(recoveredCodePhotos);
      codePhotoUrlsRef.current = recoveredCodePhotos;
    }
    if (Object.keys(recoveredOutputPhotos).length > 0) {
      setOutputPhotoUrls(recoveredOutputPhotos);
      outputPhotoUrlsRef.current = recoveredOutputPhotos;
    }

    // Auto-Resume Step: If student had answered MCQs, completed Part A, was on coding, or resumed:
    const sName = sessionStorage.getItem('current_student_name') || 'Student';
    if (isResumed || recoveredTab === 'coding' || (Object.keys(recoveredMcq).length > 0 && recoveredTab !== 'mcq')) {
      setActiveTab('coding');
      setResumedBanner(`Welcome back, ${sName}! Your previous progress has been restored. Continuing at Part B (Coding Work).`);
    } else if (hadSavedProgress) {
      setActiveTab(recoveredTab);
      setResumedBanner(`Welcome back, ${sName}! Your saved test answers have been restored.`);
    }
  };

  // Helper function to auto-save progress both locally & to cloud database
  const saveProgressDraft = (newMcq, newCoding, newCodePhotos, newOutputPhotos, newTab) => {
    const tData = testDataRef.current;
    const aId = attemptIdRef.current;
    const sRoll = sessionStorage.getItem('current_student_roll');
    if (!tData?.test?.id || !sRoll) return;

    const draftPayload = {
      mcqAnswers: newMcq !== undefined ? newMcq : mcqAnswersRef.current,
      codingTexts: newCoding !== undefined ? newCoding : codingTextsRef.current,
      codePhotoUrls: newCodePhotos !== undefined ? newCodePhotos : codePhotoUrlsRef.current,
      outputPhotoUrls: newOutputPhotos !== undefined ? newOutputPhotos : outputPhotoUrlsRef.current,
      activeTab: newTab !== undefined ? newTab : activeTab,
      updatedAt: Date.now(),
    };

    // 1. Instant LocalStorage Write
    localStorage.setItem(`test_progress_${tData.test.id}_${sRoll}`, JSON.stringify(draftPayload));
    if (aId) {
      localStorage.setItem(`mcq_answers_${aId}`, JSON.stringify(draftPayload.mcqAnswers));
    }

    // 2. Debounced Cloud Database Sync to Supabase
    setSaveStatus('Saving...');
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        if (aId) {
          await supabase
            .from('test_attempts')
            .update({
              draft_data: draftPayload,
              last_activity_at: new Date().toISOString(),
            })
            .eq('id', aId);
        }
        setSaveStatus('All progress saved');
      } catch (e) {
        setSaveStatus('Saved locally');
      }
    }, 800);
  };

  // Realtime subscription: if teacher ends test manually or status becomes ended
  useEffect(() => {
    const testId = testData?.test?.id;
    if (!testId) return;

    const channel = supabase
      .channel(`student-test-session-${testId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tests', filter: `id=eq.${testId}` },
        (payload) => {
          if (payload?.new?.status === 'ended') {
            handleSubmitTest();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [testData?.test?.id]);

  // Timer countdown
  useEffect(() => {
    if (!testData?.test?.end_at) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(testData.test.end_at).getTime();
      const distance = end - now;

      if (distance <= 0) {
        setTimeRemaining('00:00 (Time Up)');
        clearInterval(interval);
        handleSubmitTest();
      } else {
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        setTimeRemaining(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [testData]);

  if (!testData) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  const { test, mcq_questions = [], coding_questions = [] } = testData;

  const handleSelectMCQ = (questionId, optionId, isSingle) => {
    let updated;
    if (isSingle) {
      updated = { ...mcqAnswers, [questionId]: [optionId] };
    } else {
      const current = mcqAnswers[questionId] || [];
      const nextOpts = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];
      updated = { ...mcqAnswers, [questionId]: nextOpts };
    }
    setMcqAnswers(updated);
    mcqAnswersRef.current = updated;
    saveProgressDraft(updated, undefined, undefined, undefined, activeTab);
  };

  const handleCodingTextChange = (questionId, text) => {
    const updated = { ...codingTexts, [questionId]: text };
    setCodingTexts(updated);
    codingTextsRef.current = updated;
    saveProgressDraft(undefined, updated, undefined, undefined, activeTab);
  };

  const handleCodePhotosChange = (questionId, urls) => {
    const updated = { ...codePhotoUrls, [questionId]: urls };
    setCodePhotoUrls(updated);
    codePhotoUrlsRef.current = updated;
    saveProgressDraft(undefined, undefined, updated, undefined, activeTab);
  };

  const handleOutputPhotosChange = (questionId, urls) => {
    const updated = { ...outputPhotoUrls, [questionId]: urls };
    setOutputPhotoUrls(updated);
    outputPhotoUrlsRef.current = updated;
    saveProgressDraft(undefined, undefined, undefined, updated, activeTab);
  };

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    saveProgressDraft(undefined, undefined, undefined, undefined, newTab);
  };

  const handleSubmitTest = async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setSubmitting(true);
    setError(null);

    const currentAttemptId = attemptIdRef.current || attemptId;
    const currentSessionToken = sessionTokenRef.current || sessionToken;
    const currentMcqAnswers = mcqAnswersRef.current || mcqAnswers;
    const currentCodingTexts = codingTextsRef.current || codingTexts;
    const currentCodePhotoUrls = codePhotoUrlsRef.current || codePhotoUrls;
    const currentOutputPhotoUrls = outputPhotoUrlsRef.current || outputPhotoUrls;
    const currentCodingQuestions = testDataRef.current?.coding_questions || coding_questions;

    // Format MCQ payload
    const formattedMcqAnswers = Object.entries(currentMcqAnswers).map(([qId, opts]) => ({
      question_id: qId,
      selected_options: opts,
    }));

    // Format Coding payload (supporting arrays of up to 20 code photos & 5 output photos)
    const formattedCodingResponses = currentCodingQuestions.map((cq) => {
      const cPhotos = currentCodePhotoUrls[cq.id] || [];
      const oPhotos = currentOutputPhotoUrls[cq.id] || [];
      return {
        coding_question_id: cq.id,
        code_text: currentCodingTexts[cq.id] || '',
        code_photo_url: cPhotos[0] || null,
        output_photo_url: oPhotos[0] || null,
        code_photo_urls: cPhotos,
        output_photo_urls: oPhotos,
      };
    });

    try {
      // Call submit_test_attempt RPC (Atomic Transaction)
      const { data, error: rpcError } = await supabase.rpc('submit_test_attempt', {
        p_attempt_id: currentAttemptId,
        p_session_token: currentSessionToken,
        p_mcq_answers: formattedMcqAnswers,
        p_coding_responses: formattedCodingResponses,
      });

      if (rpcError || !data || !data.success) {
        setError(data?.error || rpcError?.message || 'Failed to submit test.');
        isSubmittingRef.current = false;
        setSubmitting(false);
      } else {
        const sRoll = sessionStorage.getItem('current_student_roll');
        if (testData?.test?.id && sRoll) {
          localStorage.removeItem(`test_progress_${testData.test.id}_${sRoll}`);
        }
        localStorage.removeItem(`mcq_answers_${currentAttemptId}`);
        sessionStorage.removeItem('current_test_data');
        sessionStorage.removeItem('current_attempt_id');
        sessionStorage.removeItem('current_session_token');
        sessionStorage.removeItem('is_resumed_attempt');
        sessionStorage.setItem('submitted_success', 'true');
        sessionStorage.setItem('submitted_student_name', studentName);
        navigate('/submitted');
      }
    } catch (err) {
      console.error('Submission error:', err);
      setError('An unexpected error occurred during submission.');
      isSubmittingRef.current = false;
      setSubmitting(false);
    }
  };

  const answeredMcqCount = Object.keys(mcqAnswers).filter((k) => mcqAnswers[k]?.length > 0).length;
  const answeredCodingCount = coding_questions.filter((cq) => {
    return (
      (codingTexts[cq.id] && codingTexts[cq.id].trim().length > 0) ||
      (codePhotoUrls[cq.id] && codePhotoUrls[cq.id].length > 0) ||
      (outputPhotoUrls[cq.id] && outputPhotoUrls[cq.id].length > 0)
    );
  }).length;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#f5f6fa] pb-16">
      {/* Sticky Test Header with Timer */}
      <div className="bg-[#1a1612] text-white border-b border-[#352c22] sticky top-16 z-40 px-4 sm:px-6 py-3 shadow-md">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Roll: {studentRoll}
                </span>
                <span className="text-sm font-semibold text-gray-200">
                  {studentName}
                </span>
              </div>
              <span className="text-xs text-gray-400 block mt-0.5 truncate max-w-sm sm:max-w-md">
                {test.title}
              </span>
            </div>

            {/* Cloud Auto-Saved Status Indicator */}
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-gray-300 font-mono bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg shadow-inner">
              <span className={`w-2 h-2 rounded-full ${saveStatus === 'Saving...' ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`}></span>
              <span>{saveStatus}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Timer Badge */}
            <div className="flex items-center gap-2 bg-[#2a2219] px-3.5 py-1.5 rounded-xl border border-amber-600/40 text-amber-400 font-mono text-base font-bold shadow-inner">
              <Clock className="w-4 h-4 animate-pulse text-amber-500" />
              <span>{timeRemaining}</span>
            </div>

            <button
              onClick={() => handleTabChange('review')}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-sm transition-all flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" /> Submit Test
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-5">
        {/* RESUMED PROGRESS ALERT BANNER */}
        {resumedBanner && (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-950 via-[#1a2e22] to-emerald-950 border border-emerald-500/40 text-white text-xs sm:text-sm flex items-center justify-between gap-3 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center flex-shrink-0 shadow-inner">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-emerald-300 block text-xs uppercase tracking-wider">
                  Session Restored
                </span>
                <p className="text-gray-200 text-xs sm:text-sm mt-0.5">
                  {resumedBanner}
                </p>
              </div>
            </div>
            <button
              onClick={() => setResumedBanner(null)}
              className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Navigation Tabs (MCQ, Coding, Review) */}
        <div className="flex items-center gap-2 border-b border-gray-200 bg-white p-2 rounded-xl shadow-xs">
          <button
            onClick={() => handleTabChange('mcq')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'mcq'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Part A: MCQ ({answeredMcqCount}/{mcq_questions.length})</span>
          </button>

          <button
            onClick={() => handleTabChange('coding')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'coding'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>Part B: Coding Work ({answeredCodingCount}/{coding_questions.length})</span>
          </button>

          <button
            onClick={() => handleTabChange('review')}
            className={`py-2 px-4 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'review'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            <span>Review & Submit</span>
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* TAB 1: MCQ QUESTIONS */}
        {activeTab === 'mcq' && (
          <div className="space-y-6">
            {mcq_questions.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl text-center text-gray-500 border border-gray-200">
                No objective questions configured for this test.
              </div>
            ) : (
              mcq_questions.map((q, idx) => {
                const selectedOpts = mcqAnswers[q.id] || [];
                const isSingle = q.question_type === 'single';

                return (
                  <div key={q.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-xs font-bold font-mono px-2.5 py-1 rounded bg-amber-50 text-amber-800 border border-amber-200">
                        Question {idx + 1} ({q.marks} Mark{q.marks > 1 ? 's' : ''})
                      </span>
                      <span className="text-xs text-gray-400 font-medium">
                        {isSingle ? 'Single Choice' : 'Multiple Choice (Select all that apply)'}
                      </span>
                    </div>

                    <h3 className="text-base font-semibold text-gray-900 leading-snug">
                      {q.question_text}
                    </h3>

                    {/* Options list */}
                    <div className="space-y-2.5 pt-2">
                      {q.options?.map((opt) => {
                        const isSelected = selectedOpts.includes(opt.id);

                        return (
                          <div
                            key={opt.id}
                            onClick={() => handleSelectMCQ(q.id, opt.id, isSingle)}
                            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                              isSelected
                                ? 'bg-amber-50/70 border-amber-500 text-amber-950 font-medium shadow-xs'
                                : 'bg-white border-gray-200 hover:border-gray-300 text-gray-800'
                            }`}
                          >
                            <div
                              className={`w-5 h-5 rounded-${isSingle ? 'full' : 'md'} border flex items-center justify-center transition-all ${
                                isSelected
                                  ? 'bg-amber-600 border-amber-600 text-white'
                                  : 'border-gray-300 bg-white'
                              }`}
                            >
                              {isSelected && <CheckCircle2 className="w-3.5 h-3.5 fill-current" />}
                            </div>
                            <span className="text-sm">{opt.option_text}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => handleTabChange('coding')}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-sm flex items-center gap-2 shadow-sm"
              >
                Proceed to Coding Section <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: CODING QUESTIONS */}
        {activeTab === 'coding' && (
          <div className="space-y-8">
            {coding_questions.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl text-center text-gray-500 border border-gray-200">
                No coding questions in this test.
              </div>
            ) : (
              coding_questions.map((cq, idx) => (
                <div key={cq.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 space-y-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-bold font-mono px-2.5 py-1 rounded bg-blue-50 text-blue-800 border border-blue-200">
                        Coding Problem {idx + 1} ({cq.marks} Marks)
                      </span>
                      <h3 className="text-base font-bold text-gray-900 mt-2">
                        {cq.question_text}
                      </h3>
                      {cq.instructions && (
                        <p className="text-xs text-gray-500 mt-1 italic">
                          Instructions: {cq.instructions}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 1. Code Text Area with Auto-Save */}
                  {cq.require_code_text && (
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-gray-700 flex items-center justify-between">
                        <span>Type or Paste Your Program Code:</span>
                        <span className="text-[10px] text-emerald-600 font-normal">● Cloud auto-saved</span>
                      </label>
                      <textarea
                        rows={8}
                        value={codingTexts[cq.id] || ''}
                        onChange={(e) => handleCodingTextChange(cq.id, e.target.value)}
                        placeholder="#include <stdio.h>&#10;&#10;int main() {&#10;    // Write your code here&#10;    return 0;&#10;}"
                        className="w-full p-4 rounded-xl border border-gray-300 font-mono text-xs sm:text-sm bg-gray-900 text-emerald-400 focus:outline-none focus:ring-2 focus:ring-amber-500 leading-relaxed shadow-inner"
                      />
                    </div>
                  )}

                  {/* 2. Photo Uploads (Native Camera / Gallery Picker, max 20 for code, max 5 for output) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    {cq.require_code_photo && (
                      <ImageUpload
                        label="Code Photo(s) (from Monitor / Notebook)"
                        maxPhotos={20}
                        photoUrls={codePhotoUrls[cq.id] || []}
                        onPhotosChange={(urls) => handleCodePhotosChange(cq.id, urls)}
                      />
                    )}

                    {cq.require_output_photo && (
                      <ImageUpload
                        label="Code Output Photo(s) (Execution Result Screen)"
                        maxPhotos={5}
                        photoUrls={outputPhotoUrls[cq.id] || []}
                        onPhotosChange={(urls) => handleOutputPhotosChange(cq.id, urls)}
                      />
                    )}
                  </div>
                </div>
              ))
            )}

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => handleTabChange('mcq')}
                className="px-4 py-2 border border-gray-300 rounded-xl text-xs sm:text-sm font-semibold text-gray-700 hover:bg-gray-100 flex items-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" /> Back to MCQs
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('review')}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm flex items-center gap-2 shadow-sm"
              >
                Review & Submit <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: REVIEW & FINAL SUBMIT */}
        {activeTab === 'review' && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-200 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Final Submission Audit
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Please verify that you have answered all sections before final submission.
              </p>
            </div>

            {/* Completeness Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/70 space-y-1">
                <span className="text-xs font-semibold text-gray-500 uppercase">Part A: Objective MCQs</span>
                <div className="text-2xl font-bold text-gray-900">
                  {answeredMcqCount} of {mcq_questions.length} Answered
                </div>
                <p className="text-xs text-emerald-600 font-medium">
                  {answeredMcqCount === mcq_questions.length ? '✓ All questions attempted' : 'Some questions left blank'}
                </p>
              </div>

              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/70 space-y-1">
                <span className="text-xs font-semibold text-gray-500 uppercase">Part B: Coding Work</span>
                <div className="text-2xl font-bold text-gray-900">
                  {answeredCodingCount} of {coding_questions.length} Attempted
                </div>
                <p className="text-xs text-gray-500">
                  Code text & uploaded photo evidence included
                </p>
              </div>
            </div>

            {/* Orange notice */}
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm">
              <strong>Notice:</strong> Once submitted, your answers cannot be modified. Your coding submission will be sent to the trainer for grading.
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => handleTabChange('coding')}
                className="px-4 py-2.5 border border-gray-300 text-gray-700 hover:bg-gray-100 rounded-xl text-xs sm:text-sm font-semibold"
              >
                Back to Editing
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmitTest}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-md flex items-center gap-2 disabled:opacity-70 transition-all"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Submitting Work...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Confirm & Submit Assessment
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
