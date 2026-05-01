'use client';

import React from 'react';

interface ModernCardProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'accent';
}

/**
 * Modern Card Component with "Khilne Wala Effect"
 * Uses a clean purple color palette with smooth hover interactions
 */
export default function ModernCard({
  title,
  description,
  icon,
  onClick,
  children,
  variant = 'primary',
}: ModernCardProps) {
  // Color palette - Purple theme
  const colorVariants = {
    primary: {
      bg: '#8B5CF6', // Primary purple
      bgLight: '#A78BFA', // Light purple
      bgLighter: '#DDD6FE', // Very light purple
      text: '#FFFFFF',
      textSecondary: '#E9D5FF',
      shadow: 'rgba(139, 92, 246, 0.25)',
      shadowHover: 'rgba(139, 92, 246, 0.45)',
    },
    secondary: {
      bg: '#7C3AED', // Deep purple
      bgLight: '#9333EA', // Bright purple
      bgLighter: '#E9D5FF', // Light background
      text: '#FFFFFF',
      textSecondary: '#F3E8FF',
      shadow: 'rgba(124, 58, 237, 0.25)',
      shadowHover: 'rgba(124, 58, 237, 0.45)',
    },
    accent: {
      bg: '#A78BFA', // Light purple
      bgLight: '#C4B5FD', // Lighter purple
      bgLighter: '#F3E8FF', // Very light purple
      text: '#6B21A8',
      textSecondary: '#7C3AED',
      shadow: 'rgba(167, 139, 250, 0.25)',
      shadowHover: 'rgba(167, 139, 250, 0.45)',
    },
  };

  const colors = colorVariants[variant];

  return (
    <div
      onClick={onClick}
      className="group relative cursor-pointer overflow-hidden"
      style={{
        perspective: '1000px',
      }}
    >
      {/* Card Container */}
      <div
        className="rounded-2xl p-6 md:p-8 transition-all duration-300 ease-in-out transform"
        style={{
          backgroundColor: colors.bg,
          boxShadow: `0 10px 30px ${colors.shadow}`,
          transform: 'translateZ(0)',
        }}
        onMouseEnter={(e) => {
          const element = e.currentTarget as HTMLDivElement;
          element.style.backgroundColor = colors.bgLight;
          element.style.boxShadow = `0 20px 50px ${colors.shadowHover}, inset 0 1px 0 rgba(255, 255, 255, 0.2)`;
          element.style.transform = 'scale(1.02) translateZ(0)';
        }}
        onMouseLeave={(e) => {
          const element = e.currentTarget as HTMLDivElement;
          element.style.backgroundColor = colors.bg;
          element.style.boxShadow = `0 10px 30px ${colors.shadow}`;
          element.style.transform = 'scale(1) translateZ(0)';
        }}
      >
        {/* Gradient Overlay (subtle) */}
        <div
          className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity duration-300"
          style={{
            background: `linear-gradient(135deg, ${colors.bgLight}, transparent)`,
            pointerEvents: 'none',
          }}
        />

        {/* Animated Background Shine */}
        <div
          className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-300"
          style={{
            background: `linear-gradient(45deg, transparent 30%, ${colors.bgLighter} 50%, transparent 70%)`,
            backgroundSize: '200% 200%',
            animation: 'shimmer 3s infinite',
            pointerEvents: 'none',
          }}
        />

        {/* Content Container */}
        <div className="relative z-10">
          {/* Icon and Title Row */}
          <div className="flex items-center gap-4 mb-4">
            {icon && (
              <div
                className="text-3xl md:text-4xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12"
                style={{
                  filter: `drop-shadow(0 4px 6px ${colors.shadow})`,
                }}
              >
                {icon}
              </div>
            )}
            <h3
              className="text-xl md:text-2xl font-bold transition-all duration-300"
              style={{
                color: colors.text,
                textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
              }}
            >
              {title}
            </h3>
          </div>

          {/* Description */}
          {description && (
            <p
              className="text-sm md:text-base mb-4 transition-all duration-300 group-hover:translate-x-1"
              style={{
                color: colors.textSecondary,
                lineHeight: '1.6',
              }}
            >
              {description}
            </p>
          )}

          {/* Children Content */}
          {children && (
            <div
              className="mt-6 transition-all duration-300"
              style={{
                color: colors.textSecondary,
              }}
            >
              {children}
            </div>
          )}

          {/* CTA Button (optional) */}
          {onClick && (
            <button
              className="mt-6 px-6 py-2 rounded-lg font-semibold text-sm transition-all duration-300 group-hover:translate-y-[-2px]"
              style={{
                backgroundColor: colors.bgLighter,
                color: variant === 'accent' ? colors.text : colors.bg,
                boxShadow: `0 4px 12px ${colors.shadow}`,
                border: 'none',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                const btn = e.currentTarget;
                btn.style.boxShadow = `0 8px 20px ${colors.shadowHover}`;
                btn.style.transform = 'translateY(-3px)';
              }}
              onMouseLeave={(e) => {
                const btn = e.currentTarget;
                btn.style.boxShadow = `0 4px 12px ${colors.shadow}`;
                btn.style.transform = 'translateY(0)';
              }}
            >
              Explore Now →
            </button>
          )}
        </div>
      </div>

      {/* CSS for shimmer animation */}
      <style>{`
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }

        @keyframes bloom {
          0% {
            transform: scale(1);
            opacity: 0;
          }
          50% {
            opacity: 0.6;
          }
          100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
