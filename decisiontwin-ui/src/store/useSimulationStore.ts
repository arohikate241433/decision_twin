import { create } from 'zustand';

interface SimulationState {
  yearsToSimulate: number;
  setYearsToSimulate: (years: number) => void;
  sensitiveFeature: string;
  setSensitiveFeature: (feature: string) => void;
  thresholdAdjustment: number;
  setThresholdAdjustment: (val: number) => void;
  isSimulating: boolean;
  setIsSimulating: (simulating: boolean) => void;
}

export const useSimulationStore = create<SimulationState>((set) => ({
  yearsToSimulate: 1,
  setYearsToSimulate: (years) => set({ yearsToSimulate: years }),
  sensitiveFeature: 'gender',
  setSensitiveFeature: (feature) => set({ sensitiveFeature: feature }),
  thresholdAdjustment: 0.0,
  setThresholdAdjustment: (val) => set({ thresholdAdjustment: val }),
  isSimulating: false,
  setIsSimulating: (simulating) => set({ isSimulating: simulating }),
}));
