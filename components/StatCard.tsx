import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  subtext?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtext, icon: Icon, trend }) => {
  return (
    <div className="bg-white border-2 border-charcoal p-6 shadow-[4px_4px_0px_#1A1E1C] transition-transform hover:-translate-y-1 hover:shadow-[6px_6px_0px_#2D4A3E]">
      <div className="flex justify-between items-start mb-4">
        <div className="bg-forest/10 p-3 rounded-none border border-forest">
          <Icon className="w-6 h-6 text-forest" />
        </div>
        {trend && (
          <span className={`text-xs font-bold px-2 py-1 border border-charcoal ${
            trend === 'up' ? 'bg-lime text-charcoal' : 'bg-gray-200'
          }`}>
            {trend === 'up' ? '↗' : '↘'}
          </span>
        )}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">{title}</p>
        <h3 className="text-3xl font-display font-bold text-charcoal mt-1">{value}</h3>
        {subtext && <p className="text-xs text-gray-500 mt-2 font-medium">{subtext}</p>}
      </div>
    </div>
  );
};

export default StatCard;