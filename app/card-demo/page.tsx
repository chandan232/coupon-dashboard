'use client';

import ModernCard from '@/components/ModernCard';

export default function CardDemoPage() {
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #F3E8FF 0%, #E9D5FF 100%)',
        minHeight: '100vh',
        padding: '3rem 1rem',
      }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h1
            className="text-5xl font-black mb-4 transition-all duration-500"
            style={{
              background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Modern Card Components
          </h1>
          <p className="text-lg text-purple-700 max-w-2xl mx-auto">
            Hover over the cards to see the "khilne wala effect" - a smooth blooming interaction
            that brings your UI to life with elegant micro-animations.
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {/* Card 1 - Primary */}
          <ModernCard
            title="Premium Feature"
            description="Experience the best features with our premium collection. Smooth animations and beautiful design."
            icon="✨"
            onClick={() => alert('Premium card clicked!')}
            variant="primary"
          />

          {/* Card 2 - Secondary */}
          <ModernCard
            title="Advanced Tools"
            description="Powerful tools designed for professionals. Built with precision and attention to detail."
            icon="🚀"
            onClick={() => alert('Advanced tools card clicked!')}
            variant="secondary"
          />

          {/* Card 3 - Accent */}
          <ModernCard
            title="Quick Access"
            description="Get instant access to all your favorite features. Lightning-fast and always available."
            icon="⚡"
            onClick={() => alert('Quick access card clicked!')}
            variant="accent"
          />
        </div>

        {/* Full Width Card */}
        <div className="mb-16">
          <ModernCard
            title="Complete Solution"
            description="Transform your workflow with our comprehensive suite of tools. Everything you need in one place."
            icon="🎯"
            variant="primary"
          >
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold">100K+</div>
                <div className="text-sm opacity-80">Active Users</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">99.9%</div>
                <div className="text-sm opacity-80">Uptime</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">24/7</div>
                <div className="text-sm opacity-80">Support</div>
              </div>
            </div>
          </ModernCard>
        </div>

        {/* Animation Details */}
        <div
          className="rounded-2xl p-8 mb-16 backdrop-blur-sm"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            border: '2px solid #DDD6FE',
          }}
        >
          <h2 className="text-2xl font-bold text-purple-900 mb-6">✨ Animation Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-bold text-purple-700 mb-3">Hover Effects:</h3>
              <ul className="space-y-2 text-purple-600">
                <li>✓ Color brightening & saturation increase</li>
                <li>✓ Scale-up effect (1.02x)</li>
                <li>✓ Enhanced box-shadow "pop"</li>
                <li>✓ Smooth gradient overlay</li>
                <li>✓ Icon rotation & scale</li>
                <li>✓ Shimmer animation</li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-purple-700 mb-3">Timing:</h3>
              <ul className="space-y-2 text-purple-600">
                <li>⏱ Duration: 200-300ms</li>
                <li>⏱ Easing: ease-in-out</li>
                <li>⏱ Responsive on all devices</li>
                <li>⏱ Hardware accelerated</li>
                <li>⏱ No janky animations</li>
                <li>⏱ Smooth 60fps performance</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Code Example */}
        <div
          className="rounded-2xl p-8 overflow-hidden"
          style={{
            backgroundColor: '#1E1B4B',
            border: '2px solid #7C3AED',
          }}
        >
          <h2 className="text-2xl font-bold text-white mb-6">💻 Usage Example</h2>
          <pre
            className="overflow-x-auto"
            style={{
              color: '#E9D5FF',
              fontSize: '14px',
              fontFamily: 'Fira Code, monospace',
              lineHeight: '1.6',
            }}
          >
{`<ModernCard
  title="Your Card Title"
  description="Card description goes here"
  icon="✨"
  variant="primary"
  onClick={() => console.log('Clicked!')}
>
  {/* Optional children content */}
  <p>Additional content here</p>
</ModernCard>`}
          </pre>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center text-purple-700">
          <p className="text-sm">
            Built with React & TypeScript • Optimized for modern browsers • Production-ready
          </p>
        </div>
      </div>
    </div>
  );
}
