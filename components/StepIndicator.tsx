
import React from 'react';

interface StepIndicatorProps {
  currentStep: number;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep }) => {
  const steps = ['Style', 'Upload', 'Try-On'];
  return (
    <div className="flex justify-center space-x-4 mb-10">
      {steps.map((step, i) => (
        <div key={step} className="flex items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${currentStep > i ? 'bg-indigo-600 text-white' : 'bg-white border-2 border-indigo-100 text-indigo-200'}`}>
            {i + 1}
          </div>
          <span className={`ml-2 text-[10px] font-black uppercase tracking-widest ${currentStep > i ? 'text-indigo-600' : 'text-slate-300'}`}>{step}</span>
          {i < 2 && <div className="ml-4 w-8 h-px bg-indigo-50" />}
        </div>
      ))}
    </div>
  );
};

export default StepIndicator;
