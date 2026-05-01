'use client';

import React from 'react';

interface ModernCardTailwindProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  children?: React.ReactNode;
  badge?: string;
  stats?: { label: string; value: string }[];
}

/**
 * Modern Card Component - Tailwind CSS Version
 * "Khilne Wala Effect" - Blooming hover interaction
 * Purple color palette with smooth animations
 */
export default function ModernCardTailwind({
  title,
  description,
  icon,
  onClick,
  children,
  badge,
  stats,
}: ModernCardTailwindProps) {
  return (
    <div className="relative group cursor-pointer h-full">
      {/* Animated Background Blur (optional) */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-purple-400 rounded-2xl blur opacity-0 group-hover:opacity-20 transition duration-300" />

      {/* Main Card */}
      <div
        className={`
          relative h-full rounded-2xl p-6 md:p-8
          bg-gradient-to-br from-purple-600 to-purple-700
          transition-all duration-300 ease-in-out
          transform group-hover:scale-102
          shadow-lg group-hover:shadow-2xl
          overflow-hidden
        `}
        onClick={onClick}
      >
        {/* Shine Effect on Hover */}
        <div
          className={`
            absolute inset-0 rounded-2xl
            bg-gradient-to-r from-transparent via-white to-transparent
            opacity-0 group-hover:opacity-20
            transition-opacity duration-300
            translate-x-[-100%] group-hover:translate-x-[100%]
            duration-700
          `}
          style={{
            animation: 'none',
          }}
        />

        {/* Gradient Overlay */}
        <div
          className={`
            absolute inset-0 rounded-2xl
            bg-gradient-to-br from-purple-500/0 to-purple-900/20
            group-hover:from-purple-400/20 group-hover:to-purple-900/40
            transition-all duration-300
            pointer-events-none
          `}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full">
          {/* Badge */}
          {badge && (
            <div
              className={`
                inline-flex w-fit px-3 py-1 rounded-full text-xs font-bold mb-4
                bg-purple-400/30 text-purple-100
                backdrop-blur-sm
                group-hover:bg-purple-300/50
                transition-all duration-300
              `}
            >
              {badge}
            </div>
          )}

          {/* Header Section */}
          <div className="flex items-start gap-4 mb-4">
            {icon && (
              <div
                className={`
                  text-3xl md:text-4xl
                  transition-all duration-300
                  group-hover:scale-110 group-hover:-rotate-12
                  flex-shrink-0
                `}
              >
                {icon}
              </div>
            )}

            <div className="flex-1">
              <h3
                className={`
                  text-xl md:text-2xl font-bold text-white
                  transition-all duration-300
                  group-hover:translate-y-[-2px]
                  line-clamp-2
                `}
              >
                {title}
              </h3>
            </div>
          </div>

          {/* Description */}
          {description && (
            <p
              className={`
                text-sm md:text-base text-purple-100
                transition-all duration-300
                group-hover:text-white group-hover:translate-x-1
                mb-4 leading-relaxed
                line-clamp-3
              `}
            >
              {description}
            </p>
          )}

          {/* Stats Grid */}
          {stats && stats.length > 0 && (
            <div
              className={`
                grid gap-3 mb-4
                transition-all duration-300
                group-hover:translate-y-[-4px]
              `}
              style={{
                gridTemplateColumns: `repeat(${Math.min(stats.length, 3)}, 1fr)`,
              }}
            >
              {stats.map((stat, idx) => (
                <div
                  key={idx}
                  className="text-center"
                >
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-xs text-purple-200">{stat.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Children Content */}
          {children && (
            <div
              className={`
                flex-1
                transition-all duration-300
                group-hover:translate-y-[-2px]
              `}
            >
              {children}
            </div>
          )}

          {/* CTA Button */}
          {onClick && (
            <button
              className={`
                mt-6 w-full px-4 py-3
                bg-gradient-to-r from-purple-400 to-purple-300
                hover:from-purple-300 hover:to-purple-200
                text-purple-900 font-bold text-sm
                rounded-lg
                transition-all duration-300
                group-hover:translate-y-[-4px]
                group-hover:shadow-xl
                active:scale-95
                focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-purple-700
              `}
            >
              Explore More →
            </button>
          )}
        </div>

        {/* Animated Gradient Border */}
        <div
          className={`
            absolute inset-0 rounded-2xl
            bg-gradient-to-r from-purple-400/0 via-purple-300/0 to-purple-400/0
            group-hover:from-purple-400/30 group-hover:via-purple-300/30 group-hover:to-purple-400/30
            transition-all duration-300
            pointer-events-none
            p-[2px]
          `}
        />
      </div>

      {/* Blooming Particles Effect (optional - CSS animation) */}
      <style>{`
        @keyframes bloom-pulse {
          0% {
            transform: scale(0.5);
            opacity: 1;
          }
          100% {
            transform: scale(2);
            opacity: 0;
          }
        }

        .group:hover::before {
          content: '';
          position: absolute;
          width: 100%;
          height: 100%;
          background: radial-gradient(circle, rgba(167, 139, 250, 0.4) 0%, transparent 70%);
          border-radius: 1rem;
          animation: bloom-pulse 0.6s ease-out;
        }

        .scale-102 {
          transform: scale(1.02);
        }
      `}</style>
    </div>
  );
}
