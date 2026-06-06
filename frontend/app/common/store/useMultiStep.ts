import { useState, useCallback } from 'react';

interface UseMultiStepReturn {
  step: number;
  setStep: (step: number) => void;
  nextStep: (max?: number) => void;
  prevStep: (min?: number) => void;
}

export const useMultiStep = (initialStep = 0): UseMultiStepReturn => {
  const [step, setStepState] = useState(initialStep);

  const nextStep = useCallback((max: number = 2) => {
    setStepState(prevStep => Math.min(prevStep + 1, max));
  }, []);

  const prevStep = useCallback((min: number = 0) => {
    setStepState(prevStep => Math.max(prevStep - 1, min));
  }, []);

  return {
    step,
    setStep: setStepState,
    nextStep,
    prevStep,
  };
};
