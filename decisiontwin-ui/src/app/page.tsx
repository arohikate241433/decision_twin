'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useSimulationStore } from '@/store/useSimulationStore';
import { Play, ShieldAlert, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

export default function Dashboard() {
  const { yearsToSimulate, setYearsToSimulate, sensitiveFeature, setSensitiveFeature, thresholdAdjustment, setThresholdAdjustment } = useSimulationStore();
  const [activeTab, setActiveTab] = useState<'simulation' | 'policy'>('simulation');

  // Trigger synthetic data generation if not exists
  const generateData = useMutation({
    mutationFn: async () => {
      const res = await fetch('http://localhost:8000/generate-synthetic-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ persona_count: 1000, characteristics: ["gender", "race", "income", "credit_score"] })
      });
      return res.json();
    }
  });

  // Fetch metrics dynamically when years slider changes
  const { data: simulation, isLoading, refetch } = useQuery({
    queryKey: ['simulate', yearsToSimulate, sensitiveFeature, thresholdAdjustment],
    queryFn: async () => {
      const res = await fetch('http://localhost:8000/simulate-bias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ years_to_simulate: yearsToSimulate, sensitive_feature: sensitiveFeature, threshold_adjustment: thresholdAdjustment })
      });
      if (!res.ok) throw new Error(`simulate-bias failed: ${res.status}`);
      return res.json();
    },
    enabled: generateData.isSuccess,
    retry: false,
  });

  const { data: report, isLoading: isReportLoading } = useQuery({
    queryKey: ['report', yearsToSimulate, sensitiveFeature, thresholdAdjustment, simulation?.metrics?.demographic_parity_ratio],
    queryFn: async () => {
      const res = await fetch('http://localhost:8000/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          demographic_parity_ratio: simulation!.metrics.demographic_parity_ratio,
          demographic_parity_difference: simulation!.metrics.demographic_parity_difference,
          sensitive_feature: sensitiveFeature,
          years_simulated: yearsToSimulate
        })
      });
      if (!res.ok) throw new Error(`generate-report failed: ${res.status}`);
      return res.json();
    },
    enabled: !!simulation?.metrics,
    retry: false,
  });

  // Initialize data on load
  useEffect(() => {
    generateData.mutate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen p-8 max-w-7xl mx-auto space-y-8 font-sans">
      
      {/* Header section */}
      <header className="flex justify-between items-end border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">DecisionTwin</h1>
          <p className="text-zinc-400">Forensic AI Bias Simulation & Audit Platform</p>
        </div>
        <div className="flex gap-4">
          <span className={`px-4 py-2 rounded border flex items-center gap-2 ${generateData.isPending ? 'border-amber-500/50 text-amber-500' : 'border-zinc-800 text-emerald-500'}`}>
             {generateData.isPending ? <RefreshCw className="animate-spin w-4 h-4" /> : <CheckCircle2 className="w-4 h-4"/>}
             {generateData.isPending ? 'Generative Engine Thinking...' : 'Gemini 1.5 Sync: Active'}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-8">
        
        {/* Left Sidebar: Control Panel */}
        <div className="col-span-12 md:col-span-4 space-y-6">
          <div className="glass-card p-6 flex flex-col space-y-6">
            <h2 className="text-xl font-semibold mb-2">Control Panel</h2>
            
            <div className="space-y-4">
              <label className="block text-sm font-medium text-zinc-400">Sensitive Feature to Track</label>
              <select 
                value={sensitiveFeature} 
                onChange={(e) => setSensitiveFeature(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-zinc-300 focus:outline-none focus:border-blue-500"
              >
                <option value="gender">Gender</option>
                <option value="race">Race</option>
                <option value="age_group">Age Group</option>
              </select>
            </div>

            <div className="space-y-4 pt-4 border-t border-zinc-800">
              <label className="block text-sm font-medium text-zinc-400 flex justify-between">
                <span>Time-Travel Horizon</span>
                <span className="text-blue-500 font-mono">Year {yearsToSimulate}</span>
              </label>
              <input 
                type="range" 
                min="1" max="10" 
                value={yearsToSimulate} 
                onChange={(e) => setYearsToSimulate(parseInt(e.target.value))}
                className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500 thumb-pulse"
              />
              <p className="text-xs text-zinc-500">Simulate compounding feedback loops year over year.</p>
            </div>
            
            <div className="space-y-4 pt-4 border-t border-zinc-800">
              <label className="block text-sm font-medium text-zinc-400 flex justify-between">
                <span>Policy Intervention: Threshold Tilt</span>
                <span className={thresholdAdjustment !== 0 ? "text-amber-500 font-mono" : "text-zinc-500 font-mono"}>
                  {thresholdAdjustment > 0 ? "+" : ""}{thresholdAdjustment}
                </span>
              </label>
              <input 
                type="range" 
                min="-50" max="50" step="5"
                value={thresholdAdjustment} 
                onChange={(e) => setThresholdAdjustment(parseFloat(e.target.value))}
                className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <p className="text-xs text-zinc-500">Inject policy changes to see 'What-If' trade-offs.</p>
            </div>

          </div>
        </div>

        {/* Right Dashboard Area */}
        <div className="col-span-12 md:col-span-8 flex flex-col space-y-6">

          {/* Metric KPIs */}
          <div className="grid grid-cols-3 gap-6">
            <div className="glass-card p-6">
              <h3 className="text-sm font-medium text-zinc-400">Systemic Disparate Impact</h3>
              <div className="mt-4 flex items-baseline gap-2">
                {isLoading ? <div className="h-8 w-24 bg-zinc-800 rounded animate-pulse"></div> : (
                  <>
                    <span className={`text-4xl font-mono font-bold ${
                      simulation?.metrics?.demographic_parity_ratio < 0.8 ? 'text-rose-600' : 'text-emerald-500'
                    }`}>
                      {simulation?.metrics?.demographic_parity_ratio || 0.00}
                    </span>
                    <span className="text-sm text-zinc-500">Target &gt; 0.80</span>
                  </>
                )}
              </div>
            </div>

            <div className="glass-card p-6">
              <h3 className="text-sm font-medium text-zinc-400">Demographic Parity Diff</h3>
              <div className="mt-4 flex items-baseline gap-2">
                {isLoading ? <div className="h-8 w-24 bg-zinc-800 rounded animate-pulse"></div> : (
                  <>
                    <span className="text-4xl font-mono font-bold text-amber-500">
                      {simulation?.metrics?.demographic_parity_difference || 0.00}
                    </span>
                    <span className="text-sm text-zinc-500">variance</span>
                  </>
                )}
              </div>
            </div>

            <div className="glass-card p-6">
              <h3 className="text-sm font-medium text-zinc-400">Global Approval Rate (Profit)</h3>
              <div className="mt-4 flex items-baseline gap-2">
                 {isLoading ? <div className="h-8 w-24 bg-zinc-800 rounded animate-pulse"></div> : (
                  <>
                    <span className="text-4xl font-mono font-bold text-blue-500">
                      {((simulation?.metrics?.approval_rate_overall || 0) * 100).toFixed(1)}%
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Visual Bias Output / Audit Report Box */}
          <div className="glass-card p-6 flex flex-col min-h-[300px]">
            <div className="flex justify-between">
              <h3 className="text-lg font-medium border-b border-zinc-800 pb-4 w-full">Longitudinal Audit Logs & Bias Flags</h3>
            </div>
            
            <div className="mt-6 flex-grow">
              {isLoading || generateData.isPending ? (
                <div className="flex flex-col items-center justify-center h-full space-y-4 pt-10">
                   <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                   <p className="text-zinc-400 text-sm font-mono">Running FairLearn matrices for Year {yearsToSimulate}...</p>
                </div>
              ) : (
                <ul className="space-y-4">
                  {simulation?.bias_flags?.map((flag: any, i: number) => (
                    <li key={i} className={`p-4 rounded border flex items-start gap-4 ${flag.severity === 'High' ? 'bg-rose-600/10 border-rose-600/30 text-rose-500' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'}`}>
                      {flag.severity === 'High' ? <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" /> : <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />}
                      <div>
                        <strong className="block">{flag.category} (Score: {flag.value})</strong>
                        <span className="text-sm opacity-80 decoration-zinc-400">
                          {flag.severity === 'High' 
                            ? "Compliance violation. The disparate impact ratio is below the legal 80% threshold. Generative insight suggests geographical correlation heavily skews negative decisions towards marginalized applicant profiles as simulation progresses."
                            : "Within acceptable statistical parity boundaries. No immediate systemic intervention required at this year benchmark."}
                        </span>
                      </div>
                    </li>
                  ))}
                  
                  {/* Generated Audit Snippet */}
                  <div className="mt-8 p-6 bg-blue-900/10 border border-blue-500/20 rounded font-mono text-sm leading-relaxed text-zinc-300">
                    <h4 className="flex items-center gap-2 text-blue-400 mb-3"><Play className="w-4 h-4"/> Gemini 1.5 Pro Forensic Summary</h4>
                    {isReportLoading ? (
                       <div className="flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin"/> Gemini is analyzing 10 years of simulated decisions...</div>
                    ) : (
                       <p>{report?.report || "Audit summary unavailable."}</p>
                    )}
                  </div>
                </ul>
              )}
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
