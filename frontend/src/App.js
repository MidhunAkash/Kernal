import React from 'react';
import './App.css';

function App() {
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

      {/* Three Steps Section */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-center mb-16">
            Three steps to resolution.
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 border border-gray-200" data-testid="step-ai-hit-wall">
              <h3 className="text-2xl font-bold mb-4">AI Hit a Wall</h3>
              <p className="text-gray-600 leading-relaxed">
                Your AI agent encounters a task it can't handle—maybe it's ambiguous, requires human judgment, or just too complex.
              </p>
            </div>
            <div className="bg-white p-8 border border-gray-200" data-testid="step-escalate">
              <h3 className="text-2xl font-bold mb-4">Escalate Instantly</h3>
              <p className="text-gray-600 leading-relaxed">
                With one API call (or SDK method), the task gets posted as a bounty. Skilled humans see it and jump in to help.
              </p>
            </div>
            <div className="bg-white p-8 border border-gray-200" data-testid="step-problem-solved">
              <h3 className="text-2xl font-bold mb-4">Problem Solved</h3>
              <p className="text-gray-600 leading-relaxed">
                A solver delivers the answer. Your agent receives the solution via webhook or polling—and your user never knows there was a hiccup.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* For Builders / For Solvers Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8">
            {/* For Builders */}
            <div className="bg-black text-white p-12" data-testid="for-builders-section">
              <h2 className="text-3xl font-bold mb-6">FOR BUILDERS</h2>
              <ul className="space-y-4 text-gray-300">
                <li className="flex items-start">
                  <span className="mr-3">—</span>
                  <span>Integrate in minutes with one API call or SDK method</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-3">—</span>
                  <span>Only pay when a task is solved</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-3">—</span>
                  <span>No contract. Cancel any time</span>
                </li>
              </ul>
              <button className="mt-8 border-2 border-white text-white px-8 py-3 font-medium hover:bg-white hover:text-black transition" data-testid="start-building-footer-btn">
                START BUILDING
              </button>
            </div>

            {/* For Solvers */}
            <div className="bg-gray-50 p-12" data-testid="for-solvers-section">
              <h2 className="text-3xl font-bold mb-6">FOR SOLVERS</h2>
              <ul className="space-y-4 text-gray-700">
                <li className="flex items-start">
                  <span className="mr-3">—</span>
                  <span>Earn by solving real-world AI edge cases</span>
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

      {/* Add Human Layer Section */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-center mb-12">
            ADD HUMAN LAYER IN SECONDS
          </h2>
          <p className="text-center text-gray-600 text-lg mb-12 max-w-3xl mx-auto">
            Drop in our SDK or call our API. When your AI can't proceed, escalate to humans in one line of code.
          </p>
          <div className="max-w-4xl mx-auto">
            <div className="bg-gray-900 text-green-400 p-8 rounded font-mono text-sm overflow-x-auto" data-testid="code-snippet">
              <pre>
                <code>{`import { HumanLayer } from '@humanlayer/sdk';

const hl = new HumanLayer({ apiKey: process.env.HL_API_KEY });

// When AI gets stuck:
const solution = await hl.escalate({
  taskDescription: "Summarize this ambiguous email",
  context: { emailBody: "..." },
  bounty: 5 // dollars
});

console.log(solution.result);`}</code>
              </pre>
            </div>
            <div className="text-center mt-8">
              <button className="bg-black text-white px-8 py-4 text-lg font-medium hover:bg-gray-800" data-testid="view-docs-btn">
                VIEW DOCS
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Bounties Section */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold">Recent Bounties</h2>
            <a href="#" className="text-sm underline hover:no-underline">VIEW ALL →</a>
          </div>
          <div className="space-y-4" data-testid="bounties-list">
            <div className="bg-white border border-gray-200 p-6 flex justify-between items-center hover:border-gray-400 transition" data-testid="bounty-item">
              <div className="flex-1">
                <div className="flex items-center gap-4">
                  <span className="text-gray-400 text-sm">#01</span>
                  <h3 className="font-bold text-lg">Fix React useEffect loop</h3>
                </div>
                <p className="text-gray-600 text-sm mt-2 ml-12">Component re-renders infinitely. Need help identifying the dependency issue.</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">$20</div>
                <button className="mt-2 text-sm border border-black px-4 py-1 hover:bg-black hover:text-white transition" data-testid="claim-bounty-btn">
                  CLAIM
                </button>
              </div>
            </div>

            <div className="bg-white border border-gray-200 p-6 flex justify-between items-center hover:border-gray-400 transition" data-testid="bounty-item">
              <div className="flex-1">
                <div className="flex items-center gap-4">
                  <span className="text-gray-400 text-sm">#02</span>
                  <h3 className="font-bold text-lg">Optimize postgres SQL join</h3>
                </div>
                <p className="text-gray-600 text-sm mt-2 ml-12">Query taking 30s+. Three tables, 100k rows each. Need indexing advice.</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">$120</div>
                <button className="mt-2 text-sm border border-black px-4 py-1 hover:bg-black hover:text-white transition" data-testid="claim-bounty-btn">
                  CLAIM
                </button>
              </div>
            </div>

            <div className="bg-white border border-gray-200 p-6 flex justify-between items-center hover:border-gray-400 transition" data-testid="bounty-item">
              <div className="flex-1">
                <div className="flex items-center gap-4">
                  <span className="text-gray-400 text-sm">#03</span>
                  <h3 className="font-bold text-lg">Explain AWS Auth flow</h3>
                </div>
                <p className="text-gray-600 text-sm mt-2 ml-12">Getting 403 on S3. Cognito + IAM roles. Can someone walk through this?</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">$40</div>
                <button className="mt-2 text-sm border border-black px-4 py-1 hover:bg-black hover:text-white transition" data-testid="claim-bounty-btn">
                  CLAIM
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="bg-black text-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-6xl font-black tracking-tight mb-12">
            NEVER GET STUCK<br />AGAIN.
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-2xl mx-auto">
            <input
              type="email"
              placeholder="YOUR EMAIL"
              className="flex-1 px-6 py-4 bg-white text-black placeholder-gray-400 text-center"
              data-testid="footer-email-input"
            />
            <button className="bg-white text-black px-8 py-4 font-medium hover:bg-gray-200" data-testid="join-us-btn">
              JOIN US
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