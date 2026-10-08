import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { CheckCircle2, ExternalLink } from 'lucide-react';

export const SubmissionConfirmation = () => {
  useEffect(() => {
    // Launch celebratory confetti
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });
  }, []);

  const studentName = sessionStorage.getItem('submitted_student_name') || 'Student';

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-[#f5f6fa] p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-200 p-8 sm:p-10 text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
          <CheckCircle2 className="w-12 h-12" />
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Assessment Submitted!
          </h1>
          <p className="text-sm text-gray-600 mt-2">
            Well done, <strong className="text-gray-900">{studentName}</strong>. Your MCQ answers and practical coding evidence have been securely recorded.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-500 space-y-1">
          <p className="font-semibold text-gray-700">What happens next?</p>
          <p>Your objective score is registered, and your trainer will review your coding output.</p>
          <p className="pt-1 text-emerald-700 font-medium">You may now close this browser window or tab.</p>
        </div>

        <div className="pt-2">
          <a
            href="http://skilllab.sheat.ac.in"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 px-4 bg-[#241f1a] hover:bg-[#1a1612] text-amber-300 hover:text-amber-200 border border-amber-500/30 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <span>Hall of Fame</span>
            <ExternalLink className="w-4 h-4 text-amber-400" />
          </a>
        </div>
      </div>
    </div>
  );
};
