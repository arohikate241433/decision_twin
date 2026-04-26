'use client';

import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Play, Brain, TreeDeciduous, BarChart3, CheckCircle2, XCircle } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

type ModelType = 'logistic' | 'random_forest' | 'decision_tree';

interface ModelResult {
  model: ModelType;
  metrics: {
    demographic_parity_difference: number;
    demographic_parity_ratio: number;
    approval_rate_overall: number;
    accuracy?: number;
  };
  bias_flags: Array<{
    category: string;
    severity: string;
    value: number;
  }>;
}

const modelInfo = {
  logistic: {
    name: 'Logistic Regression',
    icon: Brain,
    description: 'Linear model that learns the relationship between features and outcomes',
    color: '#3b82f6'
  },
  random_forest: {
    name: 'Random Forest',
    icon: TreeDeciduous,
    description: 'Ensemble method using multiple decision trees for robust predictions',
    color: '#22c55e'
  },
  decision_tree: {
    name: 'Decision Tree',
    icon: BarChart3,
    description: 'Tree-based model that makes decisions based on feature thresholds',
    color: '#f59e0b'
  }
};

export default function ModelCompare() {
  const [selectedModels, setSelectedModels] = useState<ModelType[]>(['logistic']);
  const [sensitiveFeature, setSensitiveFeature] = useState('gender');
  const [yearsToSimulate, setYearsToSimulate] = useState(5);
  const [results, setResults] = useState<ModelResult[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);

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

  useEffect(() => {
    if (!generateData.isSuccess) {
      generateData.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runComparison = async () => {
    if (!generateData.isSuccess) {
      generateData.mutate();
      return;
    }

    setIsSimulating(true);
    setResults([]);

    for (const model of selectedModels) {
      const res = await fetch('http://localhost:8000/simulate-bias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          years_to_simulate: yearsToSimulate, 
          sensitive_feature: sensitiveFeature, 
          threshold_adjustment: 0,
          model_type: model
        })
      });
      const data = await res.json();
      setResults(prev => [...prev, { model, ...data }]);
    }

    setIsSimulating(false);
  };

  const toggleModel = (model: ModelType) => {
    setSelectedModels(prev => 
      prev.includes(model) 
        ? prev.filter(m => m !== model)
        : [...prev, model]
    );
  };

  const radarData = results.map(r => ({
    model: modelInfo[r.model].name,
    fairness: r.metrics.demographic_parity_ratio * 100,
    approval: r.metrics.approval_rate_overall * 100,
    parity: (1 - Math.abs(r.metrics.demographic_parity_difference)) * 100,
    accuracy: (r.metrics.accuracy || 0.75) * 100
  }));

  const barData = results.map(r => ({
    model: modelInfo[r.model].name,
    'Fairness Ratio': r.metrics.demographic_parity_ratio,
    'Approval Rate': r.metrics.approval_rate_overall,
    'Accuracy': r.metrics.accuracy || 0.75
  }));

  return (
    <main className="min-h-screen p-8 max-w-7xl mx-auto space-y-8">
      <header className="border-b border-zinc-800 pb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Model Comparison</h1>
        <p className="text-zinc-400">Compare different ML models for bias and performance</p>
      </header>

      <div className="grid grid-cols-12 gap-8">
        {/* Model Selection Panel */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="glass-card p-6 space-y-6">
            <h2 className="text-xl font-semibold">Select Models</h2>
            
            <div className="space-y-3">
              {(Object.keys(modelInfo) as ModelType[]).map(model => {
                const info = modelInfo[model];
                const Icon = info.icon;
                const isSelected = selectedModels.includes(model);
                return (
                  <button
                    key={model}
                    onClick={() => toggleModel(model)}
                    className={`w-full p-4 rounded-lg border transition-all text-left ${
                      isSelected 
                        ? 'border-blue-500/50 bg-blue-500/10' 
                        : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${info.color}20` }}
                      >
                        <Icon className="w-5 h-5" style={{ color: info.color }} />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-white">{info.name}</div>
                        <div className="text-xs text-zinc-400">{info.description}</div>
                      </div>
                      <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                        isSelected ? 'border-blue-500 bg-blue-500' : 'border-zinc-600'
                      }`}>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Simulation Parameters */}
          <div className="glass-card p-6 space-y-6">
            <h2 className="text-xl font-semibold">Parameters</h2>
            
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

            <div className="space-y-4">
              <label className="block text-sm font-medium text-zinc-400 flex justify-between">
                <span>Years to Simulate</span>
                <span className="text-blue-500 font-mono">{yearsToSimulate}</span>
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={yearsToSimulate}
                onChange={(e) => setYearsToSimulate(parseInt(e.target.value))}
                className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            <button
              onClick={runComparison}
              disabled={selectedModels.length === 0 || isSimulating}
              className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSimulating ? (
                <span className="animate-spin">⟳</span>
              ) : (
                <Play className="w-4 h-4" />
              )}
              {isSimulating ? 'Running Simulations...' : 'Run Comparison'}
            </button>
          </div>
        </div>

        {/* Results Area */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {results.length === 0 ? (
            <div className="glass-card p-12 flex flex-col items-center justify-center text-center">
              <Brain className="w-16 h-16 text-zinc-700 mb-4" />
              <h3 className="text-xl font-medium text-zinc-400 mb-2">No Results Yet</h3>
              <p className="text-zinc-500">Select models and run comparison to see bias analysis</p>
            </div>
          ) : (
            <>
              {/* Results Table */}
              <div className="glass-card p-6">
                <h3 className="text-lg font-medium mb-4">Comparison Results</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-zinc-800">
                        <th className="text-left py-3 px-4 text-zinc-400 font-medium">Model</th>
                        <th className="text-right py-3 px-4 text-zinc-400 font-medium">Fairness Ratio</th>
                        <th className="text-right py-3 px-4 text-zinc-400 font-medium">Approval Rate</th>
                        <th className="text-right py-3 px-4 text-zinc-400 font-medium">Parity Diff</th>
                        <th className="text-right py-3 px-4 text-zinc-400 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((result, i) => {
                        const info = modelInfo[result.model];
                        const passesThreshold = result.metrics.demographic_parity_ratio >= 0.8;
                        return (
                          <tr key={i} className="border-b border-zinc-800/50">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <info.icon className="w-4 h-4" style={{ color: info.color }} />
                                <span className="text-white">{info.name}</span>
                              </div>
                            </td>
                            <td className="text-right py-3 px-4 font-mono text-white">
                              {result.metrics.demographic_parity_ratio.toFixed(4)}
                            </td>
                            <td className="text-right py-3 px-4 font-mono text-white">
                              {(result.metrics.approval_rate_overall * 100).toFixed(1)}%
                            </td>
                            <td className="text-right py-3 px-4 font-mono text-white">
                              {result.metrics.demographic_parity_difference.toFixed(4)}
                            </td>
                            <td className="text-right py-3 px-4">
                              {passesThreshold ? (
                                <span className="flex items-center justify-end gap-1 text-emerald-500">
                                  <CheckCircle2 className="w-4 h-4" /> Pass
                                </span>
                              ) : (
                                <span className="flex items-center justify-end gap-1 text-rose-500">
                                  <XCircle className="w-4 h-4" /> Fail
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Radar Chart */}
              <div className="glass-card p-6">
                <h3 className="text-lg font-medium mb-4">Performance Radar</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#3f3f46" />
                    <PolarAngleAxis dataKey="model" stroke="#71717a" />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#71717a" />
                    {selectedModels.map((model, i) => (
                      <Radar
                        key={model}
                        name={modelInfo[model].name}
                        dataKey={['fairness', 'approval', 'parity', 'accuracy'][i % 4]}
                        stroke={modelInfo[model].color}
                        fill={modelInfo[model].color}
                        fillOpacity={0.2}
                      />
                    ))}
                    <Legend />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Bar Chart Comparison */}
              <div className="glass-card p-6">
                <h3 className="text-lg font-medium mb-4">Metrics Comparison</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                    <XAxis dataKey="model" stroke="#71717a" />
                    <YAxis stroke="#71717a" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                    />
                    <Legend />
                    <Bar dataKey="Fairness Ratio" fill="#3b82f6" />
                    <Bar dataKey="Approval Rate" fill="#22c55e" />
                    <Bar dataKey="Accuracy" fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}