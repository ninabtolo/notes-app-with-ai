import React, { useState, useEffect } from 'react';
import { MessageSquare, Lightbulb, FilePlus } from 'lucide-react';

interface WelcomeScreenProps {
  onComplete: () => void;
}

export function WelcomeScreen({ onComplete }: WelcomeScreenProps) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(true);
  
  const features = [
    { 
      icon: <FilePlus className="w-10 h-10 text-purple-600" />, 
      title: "Create Notes Easily",
      description: "Organize your ideas with a complete and intuitive editor."
    },
    { 
      icon: <Lightbulb className="w-10 h-10 text-purple-600" />, 
      title: "AI Suggestions",
      description: "Receive intelligent suggestions while you write."
    },
    { 
      icon: <MessageSquare className="w-10 h-10 text-purple-600" />, 
      title: "AI Chat",
      description: "Get answers and assistance with the integrated chat."
    },
  ];

  useEffect(() => {
    if (step < features.length) {
      const timer = setTimeout(() => {
        setStep(step + 1);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const handleComplete = () => {
    setVisible(false);
    setTimeout(() => {
      onComplete();
    }, 500); 
  };

  return (
    <div 
      className={`fixed inset-0 flex items-center justify-center bg-white z-50 transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      <div className="max-w-lg w-full p-8 rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50 shadow-lg">
        <h1 
          className="text-3xl font-bold text-center text-purple-700 mb-8 transition-all duration-500"
          style={{ 
            transitionDelay: '200ms',
            transform: visible ? 'translateY(0)' : 'translateY(-20px)',
            opacity: visible ? 1 : 0
          }}
        >
          Welcome to AI Notes App
        </h1>
        
        <div className="space-y-6 mb-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="flex items-center space-x-4 transition-all duration-500"
              style={{ 
                transitionDelay: `${index * 300 + 300}ms`,
                transform: step >= index ? 'translateX(0)' : 'translateX(-50px)',
                opacity: step >= index ? 1 : 0 
              }}
            >
              <div className="flex-shrink-0">
                {feature.icon}
              </div>
              <div>
                <h3 className="font-semibold text-lg text-purple-900">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
        
        <div 
          className="flex justify-center transition-opacity duration-500"
          style={{ 
            transitionDelay: '1500ms',
            opacity: step >= features.length ? 1 : 0
          }}
        >
          <button
            onClick={handleComplete}
            className="px-8 py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors font-medium"
          >
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
}
