
import React from 'react';

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  change?: string;
  changeType?: 'increase' | 'decrease';
}

const StatCard: React.FC<StatCardProps> = ({ icon, title, value, change, changeType }) => {
  const changeColor = changeType === 'increase' ? 'text-green-500' : 'text-red-500';

  return (
    <div className="bg-white p-5 rounded-lg shadow-md border border-gray-200 flex items-center">
      <div className="p-3 bg-blue-100 rounded-full">
        {icon}
      </div>
      <div className="mr-4">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        {change && (
          <p className={`text-sm ${changeColor}`}>
            {change}
          </p>
        )}
      </div>
    </div>
  );
};

export default StatCard;
