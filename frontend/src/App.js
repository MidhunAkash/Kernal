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
    // Try modern clipboard API first
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(mcpConfig)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(() => {
          // Fallback to older method
          fallbackCopy();
        });
    } else {
      // Use fallback for browsers that don't support clipboard API
      fallbackCopy();
    }
  };

  const fallbackCopy = () => {
    // Create a temporary textarea element
    const textarea = document.createElement('textarea');
    textarea.value = mcpConfig;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
      document.execCommand('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
    
    document.body.removeChild(textarea);
  };

  const scrollToIntegration = () => {
    const integrationSection = document.getElementById('integration-section');
    if (integrationSection) {
      integrationSection.scrollIntoView({ behavior: 'smooth' });
      // Also copy the code when scrolling
      handleCopy();
    }
  };

  return (
    <div className="App bg-white text-black">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="text-xl font-bold tracking-tight">KERNAL.TECH.HELP</div>
            <div className="flex items-center space-x-4">
              <button className="text-sm hover:text-gray-600">Sign In</button>
              <button className="bg-black text-white px-6 py-2 text-sm font-medium hover:bg-gray-800">
                GET STARTED
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
        <div className="text-center">
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter mb-8 leading-none">
            WHEN AI GETS<br />STUCK, EXPERTS<br />STEP IN.
          </h1>
          <p className="text-gray-600 text-lg md:text-xl mb-12 max-w-3xl mx-auto leading-relaxed">
            AI isn't perfect. When your AI agent encounters a problem it can't solve, expert humans step in instantly. Get your problems solved fast while your AI keeps learning and improving.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-black text-white px-8 py-4 text-lg font-medium hover:bg-gray-800" data-testid="start-building-btn">
              START BUILDING
            </button>
            <button className="border-2 border-black text-black px-8 py-4 text-lg font-medium hover:bg-gray-50" data-testid="get-chosen-btn">
              BECOME AN EXPERT
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
                    <h3 className="text-3xl font-bold mb-4">AI Hits a Wall</h3>
                    <p className="text-gray-600 leading-relaxed text-lg">
                      Your AI agent encounters a complex problem—something ambiguous, requiring expert judgment, or simply beyond its current capabilities. It recognizes its limitations and needs human expertise.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 md:order-2">
              <div className="bg-white rounded-lg overflow-hidden border-2 border-gray-200 shadow-lg flex items-center justify-center p-8">
                <img 
                  src="https://customer-assets.emergentagent.com/job_landing-gen-8/artifacts/adbbks3a_software-engineer-makes-bug-concept-coder-search-problem-upset-programmer-work-with-error-screen-with-broken-code-woman-have-failure-development-flat-isolated-illustration-white-background_633472-2162.avif" 
                  alt="AI encountering a problem" 
                  className="w-full h-auto object-contain max-h-80"
                />
              </div>
            </div>
          </div>

          {/* Step 2 - Right */}
          <div className="grid md:grid-cols-2 gap-12 items-center mb-16" data-testid="step-escalate">
            <div className="order-1">
              <div className="bg-white rounded-lg overflow-hidden border-2 border-gray-200 shadow-lg flex items-center justify-center p-8">
                <img 
                  src="https://customer-assets.emergentagent.com/job_landing-gen-8/artifacts/9lgyabkt_problem-solving-line-filled-free-vector.jpg" 
                  alt="Expert collaboration and help" 
                  className="w-full h-auto object-contain max-h-80"
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
                      Just type "ask an expert to solve this" and your problem gets instantly posted. Skilled experts see it immediately and jump in to provide solutions, insights, and guidance.
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
                      An expert delivers the perfect solution. Your AI agent receives the answer, learns from it, and continues its work seamlessly. Your users never experience a hiccup.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 md:order-2">
              <div className="bg-white rounded-lg overflow-hidden border-2 border-gray-200 shadow-lg flex items-center justify-center p-8">
                <img 
                  src="https://customer-assets.emergentagent.com/job_landing-gen-8/artifacts/8nfm3gw5_graph-growth-with-arrow-single-continuous-one-line-drawing-business-financial-sales-market-growth-one-stroke-sketch-outline-draw-illustration-vector.jpg" 
                  alt="Success and problem solved" 
                  className="w-full h-auto object-contain max-h-80"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* For Stuck People / For Experts Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8">
            {/* For People Stuck */}
            <div className="bg-black text-white p-12" data-testid="for-stuck-section">
              <h2 className="text-3xl font-bold mb-6">FOR DEVELOPERS</h2>
              <p className="text-gray-300 mb-6">
                When you hit a roadblock and need expert help fast, Kernal connects you with skilled professionals who can unblock you instantly.
              </p>
              <ul className="space-y-4 text-gray-300">
                <li className="flex items-start">
                  <span className="mr-3">—</span>
                  <span>Get unstuck in minutes with expert guidance</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-3">—</span>
                  <span>Pay only when your problem is solved</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-3">—</span>
                  <span>Access expert help 24/7, whenever you need it</span>
                </li>
              </ul>
              <button 
                onClick={scrollToIntegration}
                className="mt-8 border-2 border-white text-white px-8 py-3 font-medium hover:bg-white hover:text-black transition" 
                data-testid="copy-mcp-btn"
              >
                COPY MCP CODE
              </button>
            </div>

            {/* For Experts */}
            <div className="bg-gray-50 p-12" data-testid="for-experts-section">
              <h2 className="text-3xl font-bold mb-6">FOR EXPERTS</h2>
              <p className="text-gray-700 mb-6">
                Use your expertise to help developers and AI systems while earning money on your own schedule.
              </p>
              <ul className="space-y-4 text-gray-700">
                <li className="flex items-start">
                  <span className="mr-3">—</span>
                  <span>Earn by solving real-world technical problems</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-3">—</span>
                  <span>Work flexibly on your own schedule</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-3">—</span>
                  <span>Build reputation and increase your earnings</span>
                </li>
              </ul>
              <button 
                onClick={scrollToIntegration}
                className="mt-8 bg-black text-white px-8 py-3 font-medium hover:bg-gray-800" 
                data-testid="become-expert-btn"
              >
                COPY MCP CODE
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* MCP Configuration Section */}
      <section id="integration-section" className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-center mb-12">
            INTEGRATE IN SECONDS
          </h2>
          <p className="text-center text-gray-600 text-lg mb-12 max-w-3xl mx-auto">
            Add Kernal to your MCP configuration and start escalating stuck tasks to expert humans immediately.
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
            Join thousands of developers who are building better AI products with expert human support when they need it most.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={scrollToIntegration}
              className="bg-white text-black px-12 py-4 text-lg font-medium hover:bg-gray-200 transition" 
              data-testid="cta-copy-mcp-btn"
            >
              COPY MCP CODE
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-bold mb-4">KERNAL.TECH.HELP</h3>
              <p className="text-sm text-gray-600">When AI gets stuck,<br />experts step in.</p>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-sm">COMPANY</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#" className="hover:text-black">About</a></li>
                <li><a href="#" className="hover:text-black">Blog</a></li>
                <li><a href="#" className="hover:text-black">Careers</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-200 text-center text-sm text-gray-600">
            <p>© 2026 Kernal. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
