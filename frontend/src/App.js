import React, { useState } from 'react';
import './App.css';

function App() {
  const [copied, setCopied] = useState(false);

  const mcpConfig = `{
  "mcpServers": {
    "kernal": {
      "command": "npx",
      "args": [
        "-y",
        "@kernal/mcp-server"
      ],
      "env": {
        "KERNAL_API_KEY": "your_api_key_here"
      }
    }
  }
}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(mcpConfig);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="App bg-white text-black">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="text-xl font-bold tracking-tight">KERNAL.TECH.HELP</div>
            <nav className="hidden md:flex space-x-8 text-sm">
              <a href="#" className="hover:text-gray-600">BUILDERS</a>
              <a href="#" className="hover:text-gray-600">SOLVERS</a>
              <a href="#" className="hover:text-gray-600">PRICING</a>
              <a href="#" className="hover:text-gray-600">DOCS</a>
            </nav>
            <div className="flex items-center space-x-4">
              <button className="text-sm hover:text-gray-600">Sign In</button>
              <button className="bg-black text-white px-6 py-2 text-sm font-medium hover:bg-gray-800">
                START BUILDING FOR FREE
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
        <div className="text-center">
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter mb-8 leading-none">
            WHEN AI GETS<br />STUCK, HUMANS<br />STEP IN.
          </h1>
          <p className="text-gray-600 text-lg md:text-xl mb-12 max-w-3xl mx-auto leading-relaxed">
            Let's face it: AI isn't perfect. When your agent hits a wall, don't let your product grind to a halt. Instantly escalate stuck tasks to real humans who solve them fast—so your AI (and your users) keep moving forward.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-black text-white px-8 py-4 text-lg font-medium hover:bg-gray-800" data-testid="start-building-btn">
              START BUILDING
            </button>
            <button className="border-2 border-black text-black px-8 py-4 text-lg font-medium hover:bg-gray-50" data-testid="get-chosen-btn">
              GET CHOSEN
            </button>
          </div>
        </div>
      </section>

      {/* Works With Section */}
      <section className="border-t border-b border-gray-200 py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-center text-sm font-semibold text-gray-500 mb-8 tracking-wider">WORKS WITH</h3>
          <div className="flex justify-center items-center gap-16 flex-wrap">
            <div className="flex items-center justify-center">
              <img 
                src="https://lovable.dev/img/logo/lovable-logo-bg-dark.png" 
                alt="Lovable" 
                className="h-12 w-auto object-contain"
              />
            </div>
            <div className="flex items-center justify-center">
              <img 
                src="https://assets.emergent.sh/assets/Landing-Hero-E.gif" 
                alt="Emergent" 
                className="h-12 w-auto object-contain"
              />
            </div>
            <div className="flex items-center justify-center">
              <img 
                src="https://ptht05hbb1ssoooe.public.blob.vercel-storage.com/assets/brand/brand-logo-1.svg" 
                alt="Cursor" 
                className="h-12 w-auto object-contain"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Three Steps Section - Alternating Layout */}
      <section className="bg-gray-50 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-center mb-20">
            Three steps to resolution.
          </h2>
          
          {/* Step 1 - Left */}
          <div className="grid md:grid-cols-2 gap-12 items-center mb-16" data-testid="step-ai-hit-wall">
            <div className="order-2 md:order-1">
              <div className="bg-white p-10 border-2 border-gray-200 hover:border-black transition-all duration-300 hover:shadow-xl">
                <div className="flex items-start gap-6">
                  <div className="w-12 h-12 bg-black text-white flex items-center justify-center text-2xl font-black flex-shrink-0">
                    1
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold mb-4">AI Hit a Wall</h3>
                    <p className="text-gray-600 leading-relaxed text-lg">
                      Your AI agent encounters a task it can't handle—maybe it's ambiguous, requires human judgment, or just too complex.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 md:order-2">
              <div className="bg-white rounded-lg overflow-hidden border-2 border-gray-200 shadow-lg">
                <img 
                  src="https://images.unsplash.com/photo-1686386084459-8d9d14400a4b?w=800&q=80" 
                  alt="AI encountering a problem" 
                  className="w-full h-80 object-cover"
                />
              </div>
            </div>
          </div>

          {/* Step 2 - Right */}
          <div className="grid md:grid-cols-2 gap-12 items-center mb-16" data-testid="step-escalate">
            <div className="order-1">
              <div className="bg-white rounded-lg overflow-hidden border-2 border-gray-200 shadow-lg">
                <img 
                  src="https://images.unsplash.com/photo-1642132652859-3ef5a1048fd1?w=800&q=80" 
                  alt="Human collaboration and help" 
                  className="w-full h-80 object-cover"
                />
              </div>
            </div>
            <div className="order-2">
              <div className="bg-white p-10 border-2 border-gray-200 hover:border-black transition-all duration-300 hover:shadow-xl">
                <div className="flex items-start gap-6">
                  <div className="w-12 h-12 bg-black text-white flex items-center justify-center text-2xl font-black flex-shrink-0">
                    2
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold mb-4">Escalate Instantly</h3>
                    <p className="text-gray-600 leading-relaxed text-lg">
                      With one API call (or SDK method), the task gets posted as a bounty. Skilled humans see it and jump in to help.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3 - Left */}
          <div className="grid md:grid-cols-2 gap-12 items-center" data-testid="step-problem-solved">
            <div className="order-2 md:order-1">
              <div className="bg-white p-10 border-2 border-gray-200 hover:border-black transition-all duration-300 hover:shadow-xl">
                <div className="flex items-start gap-6">
                  <div className="w-12 h-12 bg-black text-white flex items-center justify-center text-2xl font-black flex-shrink-0">
                    3
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold mb-4">Problem Solved</h3>
                    <p className="text-gray-600 leading-relaxed text-lg">
                      A solver delivers the answer. Your agent receives the solution via webhook or polling—and your user never knows there was a hiccup.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 md:order-2">
              <div className="bg-white rounded-lg overflow-hidden border-2 border-gray-200 shadow-lg">
                <img 
                  src="https://images.unsplash.com/photo-1758691737492-48e8fdd336f7?w=800&q=80" 
                  alt="Success and problem solved" 
                  className="w-full h-80 object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* For Stuck People / For Solvers Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8">
            {/* For People Stuck */}
            <div className="bg-black text-white p-12" data-testid="for-stuck-section">
              <h2 className="text-3xl font-bold mb-6">FOR PEOPLE STUCK</h2>
              <p className="text-gray-300 mb-6">
                When you hit a roadblock and need expert help fast, Kernal connects you with skilled solvers who can unblock you.
              </p>
              <ul className="space-y-4 text-gray-300">
                <li className="flex items-start">
                  <span className="mr-3">—</span>
                  <span>Get unstuck in minutes, not hours</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-3">—</span>
                  <span>Pay only when your problem is solved</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-3">—</span>
                  <span>Access expert help 24/7</span>
                </li>
              </ul>
              <button className="mt-8 border-2 border-white text-white px-8 py-3 font-medium hover:bg-white hover:text-black transition" data-testid="get-help-btn">
                GET HELP NOW
              </button>
            </div>

            {/* For Solvers */}
            <div className="bg-gray-50 p-12" data-testid="for-solvers-section">
              <h2 className="text-3xl font-bold mb-6">FOR SOLVERS</h2>
              <p className="text-gray-700 mb-6">
                Use your expertise to help others while earning money on your own schedule.
              </p>
              <ul className="space-y-4 text-gray-700">
                <li className="flex items-start">
                  <span className="mr-3">—</span>
                  <span>Earn by solving real-world problems</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-3">—</span>
                  <span>Work on your own schedule</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-3">—</span>
                  <span>Build reputation and increase earnings</span>
                </li>
              </ul>
              <button className="mt-8 bg-black text-white px-8 py-3 font-medium hover:bg-gray-800" data-testid="become-solver-btn">
                BECOME A SOLVER
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* MCP Configuration Section */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-center mb-12">
            INTEGRATE IN SECONDS
          </h2>
          <p className="text-center text-gray-600 text-lg mb-12 max-w-3xl mx-auto">
            Add Kernal to your MCP configuration and start escalating stuck tasks immediately.
          </p>
          <div className="max-w-4xl mx-auto">
            <div className="relative bg-gray-900 text-green-400 p-8 rounded font-mono text-sm overflow-x-auto" data-testid="code-snippet">
              <button
                onClick={handleCopy}
                className="absolute top-4 right-4 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded text-xs font-sans transition"
                data-testid="copy-button"
              >
                {copied ? '✓ Copied!' : 'Copy'}
              </button>
              <pre>
                <code>{mcpConfig}</code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="bg-black text-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-6xl font-black tracking-tight mb-8">
            NEVER GET STUCK<br />AGAIN.
          </h2>
          <p className="text-gray-300 text-lg mb-12 max-w-2xl mx-auto">
            Join thousands of developers who are building better AI products with human-in-the-loop support.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-white text-black px-12 py-4 text-lg font-medium hover:bg-gray-200 transition" data-testid="cta-start-btn">
              START NOW
            </button>
            <button className="border-2 border-white text-white px-12 py-4 text-lg font-medium hover:bg-white hover:text-black transition" data-testid="cta-learn-btn">
              LEARN MORE
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-bold mb-4">KERNAL.TECH.HELP</h3>
              <p className="text-sm text-gray-600">When AI gets stuck,<br />humans step in.</p>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-sm">COMPANY</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#" className="hover:text-black">About</a></li>
                <li><a href="#" className="hover:text-black">Blog</a></li>
                <li><a href="#" className="hover:text-black">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-sm">RESOURCES</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#" className="hover:text-black">Documentation</a></li>
                <li><a href="#" className="hover:text-black">API Reference</a></li>
                <li><a href="#" className="hover:text-black">Support</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-sm">COMMUNITY</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#" className="hover:text-black">Discord</a></li>
                <li><a href="#" className="hover:text-black">Twitter</a></li>
                <li><a href="#" className="hover:text-black">GitHub</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-200 text-center text-sm text-gray-600">
            <p>© 2025 Kernal. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
