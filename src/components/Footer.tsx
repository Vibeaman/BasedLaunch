import { Rocket, Twitter, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black/50 backdrop-blur-md mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <Rocket className="w-6 h-6 text-[#00ffd5]" />
              <span className="font-display font-bold text-xl tracking-tight">
                Based<span className="text-gradient">Launch</span>
              </span>
            </Link>
            <p className="text-gray-400 text-sm max-w-xs mb-6">
              The anti-rug Solana token launchpad. Team vesting, locked liquidity, transparent launches.
            </p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-gray-400 font-mono">Solana Mainnet Active</span>
            </div>
          </div>
          
          <div>
            <h3 className="text-white font-semibold mb-4">Platform</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link to="/launch" className="hover:text-[#00ffd5] transition-colors">Launch Token</Link></li>
              <li><Link to="/explore" className="hover:text-[#00ffd5] transition-colors">Explore</Link></li>
              <li><Link to="/dashboard" className="hover:text-[#00ffd5] transition-colors">Dashboard</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Community & Docs</h3>
            <div className="flex space-x-4">
              <a href="https://x.com/0xvibeaman" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#00ffd5] transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <Link to="/docs" className="text-gray-400 hover:text-white transition-colors">
                <FileText className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-sm">
            © 2026 BasedLaunch. Built on Solana.
          </p>
          <div className="flex gap-4 text-sm text-gray-500">
            <a href="https://x.com/0xvibeaman" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
              Made by Vibeaman
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
