'use client';

import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

interface KPICardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  variant?: 'default' | 'revenue' | 'users' | 'transactions' | 'success' | 'warning' | 'error';
  loading?: boolean;
  className?: string;
  trend?: number[];
}

export default function KPICard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon: Icon,
  variant = 'default',
  loading = false,
  className,
  trend,
}: KPICardProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'revenue':
        return {
          card: 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 dark:from-green-900/20 dark:to-emerald-900/20 dark:border-green-800/50',
          iconBg: 'bg-gradient-to-br from-green-500 to-emerald-600',
          iconColor: 'text-white'
        };
      case 'users':
        return {
          card: 'bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200 dark:from-blue-900/20 dark:to-cyan-900/20 dark:border-blue-800/50',
          iconBg: 'bg-gradient-to-br from-blue-500 to-cyan-600',
          iconColor: 'text-white'
        };
      case 'transactions':
        return {
          card: 'bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200 dark:from-purple-900/20 dark:to-pink-900/20 dark:border-purple-800/50',
          iconBg: 'bg-gradient-to-br from-purple-500 to-pink-600',
          iconColor: 'text-white'
        };
      case 'success':
        return {
          card: 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 dark:from-green-900/20 dark:to-emerald-900/20 dark:border-green-800/50',
          iconBg: 'bg-gradient-to-br from-green-500 to-emerald-600',
          iconColor: 'text-white'
        };
      case 'warning':
        return {
          card: 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200 dark:from-yellow-900/20 dark:to-orange-900/20 dark:border-yellow-800/50',
          iconBg: 'bg-gradient-to-br from-yellow-500 to-orange-600',
          iconColor: 'text-white'
        };
      case 'error':
        return {
          card: 'bg-gradient-to-br from-red-50 to-pink-50 border-red-200 dark:from-red-900/20 dark:to-pink-900/20 dark:border-red-800/50',
          iconBg: 'bg-gradient-to-br from-red-500 to-pink-600',
          iconColor: 'text-white'
        };
      default:
        return {
          card: 'bg-white/80 backdrop-blur-xl border-white/20 shadow-xl dark:bg-gray-900/80 dark:border-gray-700/30',
          iconBg: 'bg-gradient-to-br from-gray-500 to-gray-600',
          iconColor: 'text-white'
        };
    }
  };

  const getChangeColor = () => {
    switch (changeType) {
      case 'positive':
        return 'text-green-600 dark:text-green-400';
      case 'negative':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getChangeIcon = () => {
    switch (changeType) {
      case 'positive':
        return <TrendingUp className="h-3 w-3" />;
      case 'negative':
        return <TrendingDown className="h-3 w-3" />;
      default:
        return <Minus className="h-3 w-3" />;
    }
  };

  const styles = getVariantStyles();

  if (loading) {
    return (
      <Card className={cn("p-6 animate-pulse", className)}>
        <div className="flex items-center justify-between">
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
          </div>
          <div className="h-14 w-14 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "p-6 transition-all duration-300 hover:shadow-xl hover:scale-105 cursor-pointer",
      styles.card,
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-3 flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
            {title}
          </p>
          <div className="space-y-1">
            <p className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
              {value}
            </p>
            {change && (
              <div className={cn("flex items-center gap-1 text-sm font-medium", getChangeColor())}>
                {getChangeIcon()}
                <span>{change}</span>
              </div>
            )}
          </div>
        </div>
        <div className={cn(
          "h-14 w-14 rounded-xl shadow-lg flex items-center justify-center",
          styles.iconBg
        )}>
          <Icon className={cn("h-7 w-7", styles.iconColor)} />
        </div>
      </div>
      
      {/* Mini trend sparkline */}
      {trend && trend.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">Trend</span>
            <div className="flex items-end space-x-1 h-6">
              {trend.slice(-12).map((point, index) => (
                <div
                  key={index}
                  className={cn(
                    "w-1 bg-gray-300 dark:bg-gray-600 rounded-full transition-all",
                    point > 0 && "bg-green-400 dark:bg-green-500",
                    point < 0 && "bg-red-400 dark:bg-red-500"
                  )}
                  style={{ height: `${Math.abs(point) * 20 + 4}px` }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}