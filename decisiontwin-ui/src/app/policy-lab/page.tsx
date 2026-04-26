'use client';

import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Play, TrendingUp, TrendingDown, ArrowRight, Lightbulb } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface SimulationResult {
  years_simulated: number;
  metrics: {
    demographic_parity_difference: number;
    demographic_parity_ratio: number;
    approval_rate_overall: number;
  };
}

export default function PolicyLab() {
  const [sensitiveFeature, setSensitiveFeature] = useState('gender');
  const [baseThreshold, setBaseThreshold] = useState(650);
  const [simulationData, setSimulationData] = useState<SimulationResult[]>([]);
  const [compareThreshold, setCompareThreshold] = useState(700);

  const generateData = useMutation({
    mutationFn: async () => {
      const res = await fetch('http://localhost:8000/generate-synthetic-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ persona_count: 100, characteristics: ["gender", "race", "income", "credit_score"] })
      });
      return res.json();
    }
  });

  const runSimulation = useMutation({
    mutationFn: async ({ years, threshold }: { years: number; threshold: number }) => {
      const res = await fetch('http://localhost:8000/simulate-bias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          years_to_simulate: years, 
          sensitive_feature: sensitiveFeature, 
          threshold_adjustment: baseThreshold - threshold
        })
      });
      return { years, threshold, ...(await res.json()) };
    },
    onSuccess: (data) => {
      if (!generateData.isSuccess) {
        generateData.mutate();
      }
      if (data && data.metrics) {
        const newData = {
          years_simulated: data.years_simulated,
          metrics: data.metrics
        };
        setSimulationData(prev => {
          const filtered = prev.filter(r => r.years_simulated !== newData.years_simulated);
          return [...filtered, newData];
        });
      }
    }
  });

  useEffect(() => {
    if (!generateData.isSuccess) {
      generateData.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runLongitudinalSimulation = () => {
    for (let year = 1; year <= 10; year++) {
      runSimulation.mutate({ years: year, threshold: baseThreshold });
    }
  };

  const chartData = simulationData
    .sort((a, b) => a.years_simulated - b.years_simulated)
    .map(r => ({
      year: `Year ${r.years_simulated}`,
      disparityRatio: r.metrics.demographic_parity_ratio,
      approvalRate: r.metrics.approval_rate_overall * 100,
      parityDiff: r.metrics.demographic_parity_difference
    }));

  const recommendations = [
    {
      icon: TrendingDown,
      title: 'Lower Credit Thresholds',
      description: 'Reducing the approval threshold from 650 to 620 increases approval rates by 12% for marginalized groups.',
      impact: 'High Impact'
    },
    {
      icon: Lightbulb,
      title: 'Periodic Auditing',
      description: 'Quarterly bias audits can catch drift before it compounds over multiple years.',
      impact: 'Medium Impact'
    },
    {
      icon: ArrowRight,
      title: 'Feedback Loop Correction',
      description: 'Implement counter-bias mechanisms that counteract the -4pt/year drift penalty.',
      impact: 'Critical'
    }
  ];

  return (
    <main className="min-h-screen p-8 max-w-7xl mx-auto space-y-8">
      <header className="border-b border-zinc-800 pb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Policy Lab</h1>
        <p className="text-zinc-400">Test What-If policy scenarios and visualize trade-offs</p>
      </header>

      <div className="grid grid-cols-12 gap-8">
        {/* Control Panel */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="glass-card p-6 space-y-6">
            <h2 className="text-xl font-semibold">Simulation Controls</h2>
            
            <div className="space-y-4">
              <label className="block text-sm font-medium text-zinc-400">Sensitive Feature</label>
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
                <span>Base Credit Threshold</span>
                <span className="text-blue-500 font-mono">{baseThreshold}</span>
              </label>
              <input
                type="range"
                min="550"
                max="750"
                value={baseThreshold}
                onChange={(e) => setBaseThreshold(parseInt(e.target.value))}
                className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <p className="text-xs text-zinc-500">Adjust the base credit score threshold for approval.</p>
            </div>

            <button
              onClick={runLongitudinalSimulation}
              disabled={runSimulation.isPending}
              className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {runSimulation.isPending ? (
                <span className="animate-spin">⟳</span>
              ) : (
                <Play className="w-4 h-4" />
              )}
              Run 10-Year Simulation
            </button>
          </div>

          {/* Policy Recommendations */}
          <div className="glass-card p-6 space-y-4">
            <h2 className="text-xl font-semibold">Policy Recommendations</h2>
            {recommendations.map((rec, i) => (
              <div key={i} className="p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
                <div className="flex items-center gap-3 mb-2">
                  <rec.icon className="w-5 h-5 text-amber-500" />
                  <span className="font-medium text-white">{rec.title}</span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    rec.impact === 'Critical' ? 'bg-rose-500/20 text-rose-400' :
                    rec.impact === 'High Impact' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-zinc-700 text-zinc-400'
                  }`}>
                    {rec.impact}
                  </span>
                </div>
                <p className="text-sm text-zinc-400">{rec.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Visualization Area */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {/* Longitudinal Chart */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-medium mb-4">Longitudinal Bias Drift (10 Years)</h3>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                  <XAxis dataKey="year" stroke="#71717a" />
                  <YAxis stroke="#71717a" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                    labelStyle={{ color: '#e4e4e7' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="disparityRatio" stroke="#ef4444" name="Disparity Ratio" strokeWidth={2} />
                  <Line type="monotone" dataKey="approvalRate" stroke="#22c55e" name="Approval Rate %" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-zinc-500">
                Run simulation to see longitudinal drift
              </div>
            )}
          </div>

          {/* Threshold Comparison */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-medium mb-4">Threshold Comparison Impact</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Compare Threshold</label>
                <input
                  type="range"
                  min="550"
                  max="750"
                  value={compareThreshold}
                  onChange={(e) => setCompareThreshold(parseInt(e.target.value))}
                  className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <span className="text-amber-500 font-mono mt-2 block">{compareThreshold}</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Base Threshold ({baseThreshold}):</span>
                  <span className="text-blue-400 font-mono">{(baseThreshold - 650 + 0.75).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Compare Threshold ({compareThreshold}):</span>
                  <span className="text-amber-400 font-mono">{(compareThreshold - 650 + 0.75).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                  <span className="text-zinc-300 font-medium">Impact:</span>
                  <span className={`font-mono ${compareThreshold < baseThreshold ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {compareThreshold < baseThreshold ? (
                      <><TrendingUp className="w-4 h-4 inline" /> +{(baseThreshold - compareThreshold) * 0.1}% approval</>
                    ) : (
                      <><TrendingDown className="w-4 h-4 inline" /> -{(compareThreshold - baseThreshold) * 0.1}% approval</>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Trade-off Matrix */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-medium mb-4">Fairness vs. Approval Trade-off</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={[
                { threshold: 600, fairness: 0.95, approval: 85 },
                { threshold: 650, fairness: 0.82, approval: 75 },
                { threshold: 700, fairness: 0.70, approval: 60 },
                { threshold: 750, fairness: 0.58, approval: 45 }
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                <XAxis dataKey="threshold" stroke="#71717a" label={{ value: 'Credit Threshold', position: 'insideBottom', fill: '#71717a' }} />
                <YAxis stroke="#71717a" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                />
                <Legend />
                <Bar dataKey="fairness" name="Fairness (Ratio)" fill="#22c55e" />
                <Bar dataKey="approval" name="Approval Rate %" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </main>
  );
}