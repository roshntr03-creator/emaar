
import React from 'react';
import { Wrench } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
  message?: string;
}

const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ 
  title, 
  message = "هذه الصفحة قيد التطوير حاليًا. يرجى التحقق مرة أخرى قريبًا!" 
}) => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center bg-white p-10 rounded-lg shadow-md border border-gray-200">
      <Wrench className="w-16 h-16 text-gray-400 mb-4" />
      <h1 className="text-3xl font-bold text-gray-800 mb-2">{title}</h1>
      <p className="text-lg text-gray-600">{message}</p>
    </div>
  );
};

export default PlaceholderPage;
