import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { CreateClassModal } from '../../components/CreateClassModal';
import { Settings, Save, Plus, ExternalLink, Loader2, Check, Trash2, GraduationCap } from 'lucide-react';

export const AdminSettingsPage = () => {
  const [resultUrl, setResultUrl] = useState('http://skilllab.sheat.ac.in');
  const [currentCycle, setCurrentCycle] = useState('Odd sem 2026-2027');
  const [defaultDuration, setDefaultDuration] = useState(60);
  const [contexts, setContexts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    const { data: set } = await supabase.from('system_settings').select('*').eq('id', 'global').single();
    if (set) {
      setResultUrl(set.result_url || 'http://skilllab.sheat.ac.in');
      setCurrentCycle(set.current_cycle || 'Odd sem 2026-2027');
      setDefaultDuration(set.default_duration_mins || 60);
    }

    const { data: ctx } = await supabase.from('academic_contexts').select('*').order('created_at', { ascending: false });
    if (ctx) setContexts(ctx);

    setLoading(false);
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    await supabase.from('system_settings').upsert({
      id: 'global',
      result_url: resultUrl.trim(),
      current_cycle: currentCycle.trim(),
      default_duration_mins: defaultDuration,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleDeleteClass = async (id) => {
    if (!window.confirm('Are you sure you want to delete this class?')) return;
    await supabase.from('academic_contexts').delete().eq('id', id);
    loadSettings();
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#f5f6fa] p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-amber-600" />
            Skill Lab Settings & Configuration
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Configure system defaults, academic cycles, and external institution links.
          </p>
        </div>

        {/* Global Settings Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <h2 className="text-base font-bold text-gray-900 border-b pb-3 mb-4">
            System & Result Link Configuration
          </h2>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Institutional Result URL (Target of the top-right Result button)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  required
                  value={resultUrl}
                  onChange={(e) => setResultUrl(e.target.value)}
                  className="flex-1 px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
                <a
                  href={resultUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-lg border border-gray-300 text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  title="Test Link"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Current Academic Cycle
                </label>
                <input
                  type="text"
                  required
                  value={currentCycle}
                  onChange={(e) => setCurrentCycle(e.target.value)}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Default Test Duration (Minutes)
                </label>
                <input
                  type="number"
                  min={10}
                  max={240}
                  value={defaultDuration}
                  onChange={(e) => setDefaultDuration(parseInt(e.target.value) || 60)}
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg text-xs sm:text-sm flex items-center gap-1.5 shadow-sm"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : saved ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" /> Saved!
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> Save Configuration
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Academic Classes Management */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h2 className="text-base font-bold text-gray-900">
              Configured Academic Classes ({contexts.length})
            </h2>
            <button
              onClick={() => setIsClassModalOpen(true)}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> + New Class
            </button>
          </div>

          {contexts.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-xs">
              No classes configured yet. Click "+ New Class" to create one.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {contexts.map((ctx) => (
                <div key={ctx.id} className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/60 relative group flex justify-between items-start">
                  <div>
                    <span className="font-bold text-gray-900 block text-sm">
                      {ctx.course} {ctx.branch ? `(${ctx.branch})` : ''}
                    </span>
                    <span className="text-xs text-gray-500 block mt-0.5">
                      {ctx.year ? `${ctx.year} • ` : ''}Sem {ctx.semester} • Sec <strong>{ctx.section}</strong>
                    </span>
                    <span className="text-[11px] text-amber-700 font-mono block mt-0.5">
                      {ctx.academic_year}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteClass(ctx.id)}
                    className="text-gray-400 hover:text-rose-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete Class"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal for Creating New Class */}
        <CreateClassModal
          isOpen={isClassModalOpen}
          onClose={() => setIsClassModalOpen(false)}
          onSuccess={() => {
            loadSettings();
          }}
        />
      </div>
    </div>
  );
};
