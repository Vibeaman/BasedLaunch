import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// Content from docs-content.md
const docContentSections = {
  'getting-started': {
    title: 'Getting Started',
    content: (
      <div className="space-y-6">
        <h2 className="text-3xl font-display font-bold text-white mb-6">What is BasedLaunch?</h2>
        <p className="text-gray-400 leading-relaxed">
          BasedLaunch is a Solana token launchpad built for serious projects. Unlike other platforms where devs can dump on you instantly, BasedLaunch enforces vesting schedules, transparent allocations, and gives creators real tools to build communities. We're for builders who want to stick around.
        </p>

        <h3 className="text-2xl font-display font-bold text-white mt-12 mb-4">Quick Start to Launching</h3>
        <ol className="list-decimal list-inside space-y-4 text-gray-400">
          <li><strong className="text-white">Connect your wallet</strong> - We support Phantom, Solflare, and Backpack.</li>
          <li><strong className="text-white">Go to Launch</strong> - Click "Launch Token" in the navigation.</li>
          <li><strong className="text-white">Configure your token</strong> - Set name, ticker, image, supply, and optional features like vesting and team wallets.</li>
          <li><strong className="text-white">Review & Pay</strong> - Confirm all details and pay the $1 flat fee in SOL.</li>
          <li><strong className="text-white">You're live</strong> - Your token is deployed and tradeable on the bonding curve.</li>
        </ol>

        <h3 className="text-2xl font-display font-bold text-white mt-12 mb-4">Supported Wallets</h3>
        <ul className="list-disc list-inside space-y-2 text-gray-400">
          <li>Phantom</li>
          <li>Solflare</li>
          <li>Backpack</li>
        </ul>
      </div>
    )
  },
  'creating-a-token': {
    title: 'Creating a Token',
    content: (
      <div className="space-y-8">
        <div>
          <h3 className="text-2xl font-display font-bold text-white mb-4">Token Basics</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-400">
            <li><strong className="text-white">Name</strong> - Your token's full name (e.g., "Based Dog").</li>
            <li><strong className="text-white">Ticker</strong> - 3-6 character symbol (e.g., "BDOG").</li>
            <li><strong className="text-white">Image</strong> - Your project's logo. Recommended 500x500px square image.</li>
            <li><strong className="text-white">Supply</strong> - Total token supply. Minimum 1 million, maximum 1 billion. Default is 1 billion.</li>
          </ul>
        </div>

        <div>
          <h3 className="text-2xl font-display font-bold text-white mb-4">Team Wallet Splits (Optional)</h3>
          <p className="text-gray-400 leading-relaxed">
            Allocate a percentage of the total supply to team wallets. You can add multiple wallets, each with its own percentage. All team allocations are publicly visible on-chain. Perfect for co-founders, advisors, or marketing funds.
          </p>
        </div>

        <div>
          <h3 className="text-2xl font-display font-bold text-white mb-4">Vesting Schedule (Optional)</h3>
          <p className="text-gray-400 leading-relaxed mb-4">Prevent team dumps and build trust by locking tokens on-chain:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-400 mb-4">
            <li><strong className="text-white">Cliff Period</strong> - Time before any tokens unlock (e.g., 30 days).</li>
            <li><strong className="text-white">Unlock Duration</strong> - Time over which tokens gradually unlock after the cliff (e.g., 180 days).</li>
          </ul>
          <div className="bg-white/5 p-4 border-l-2 border-[#00ffd5] text-sm text-gray-300">
            <strong>Example:</strong> A 10% team allocation with a 30-day cliff and 180-day unlock means the team cannot touch their tokens for the first month, and then they unlock smoothly over the next six months.
          </div>
        </div>

        <div>
          <h3 className="text-2xl font-display font-bold text-white mb-4">Whitelist & Private Rounds (Optional)</h3>
          <p className="text-gray-400 leading-relaxed">
            Give specific wallets early access before the public launch. Set a whitelist duration (e.g., 24 hours) during which only whitelisted addresses can buy. This helps reward your early community and prevents bots from sniping all the tokens at launch.
          </p>
        </div>

        <div>
          <h3 className="text-2xl font-display font-bold text-white mb-4">Revenue Sharing (Optional)</h3>
          <p className="text-gray-400 leading-relaxed">
            Optionally share a percentage of trading fees with your token holders. You can set a percentage (1-10%) that will be automatically distributed to holders proportionally. This incentivizes holding the token.
          </p>
        </div>

        <div>
          <h3 className="text-2xl font-display font-bold text-white mb-4">Review & Pay</h3>
          <p className="text-gray-400 leading-relaxed">
            Carefully review all your token settings on the confirmation screen. Pay the $1 launch fee in SOL. Once the transaction is confirmed, your token is deployed and live on the bonding curve.
          </p>
        </div>
      </div>
    )
  },
  'fees': {
    title: 'Fees',
    content: (
      <div className="space-y-8">
        <div>
          <h3 className="text-2xl font-display font-bold text-white mb-4">Launch Fee</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-400">
            <li>A flat fee of $1 USD, paid in SOL at the current market rate.</li>
            <li>This is a one-time payment made when you launch your token.</li>
            <li>No hidden costs or setup fees.</li>
          </ul>
        </div>

        <div>
          <h3 className="text-2xl font-display font-bold text-white mb-4">Trading Fees</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-400">
            <li>BasedLaunch takes **$0** in trading fees.</li>
            <li>You will only pay standard Solana network transaction fees, which are fractions of a cent.</li>
            <li>If you enabled revenue sharing, that percentage goes directly to your token holders, not to BasedLaunch.</li>
          </ul>
        </div>

        <div>
          <h3 className="text-2xl font-display font-bold text-white mb-4">Why So Cheap?</h3>
          <p className="text-gray-400 leading-relaxed">
            We believe token creation should be accessible to everyone. Unlike other platforms that charge a percentage of your launch or take a cut of every trade, our $1 flat fee ensures you keep more of your project's value. We profit when the ecosystem grows.
          </p>
        </div>
      </div>
    )
  },
  'vesting': {
    title: 'Vesting & Lockups',
    content: (
      <div className="space-y-8">
        <div>
          <h3 className="text-2xl font-display font-bold text-white mb-4">Why Vesting Matters</h3>
          <p className="text-gray-400 leading-relaxed">
            Vesting prevents the classic "dev dump" rug pull where a team sells all their allocated tokens the moment liquidity is added. With BasedLaunch, team tokens are locked on-chain and unlock gradually according to a pre-defined schedule, providing a crucial trust signal for your community.
          </p>
        </div>

        <div>
          <h3 className="text-2xl font-display font-bold text-white mb-4">How It Works</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-400">
            <li><strong className="text-white">Cliff Period</strong> - A set duration (e.g., 30 days) where zero tokens are available to the team.</li>
            <li><strong className="text-white">Linear Unlock</strong> - After the cliff period ends, tokens unlock smoothly and gradually over a specified duration (e.g., 180 days).</li>
            <li><strong className="text-white">On-Chain Enforcement</strong> - This schedule is enforced by smart contracts, not by BasedLaunch. It's a verifiable, immutable guarantee.</li>
          </ol>
        </div>

        <div>
          <h3 className="text-2xl font-display font-bold text-white mb-4">Example Schedules</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-400">
            <li><strong className="text-white">Conservative</strong>: 90-day cliff, 365-day unlock.</li>
            <li><strong className="text-white">Standard</strong>: 30-day cliff, 180-day unlock.</li>
            <li><strong className="text-white">Aggressive</strong>: 7-day cliff, 30-day unlock.</li>
          </ul>
        </div>

        <div>
          <h3 className="text-2xl font-display font-bold text-white mb-4">Viewing Vesting Status</h3>
          <p className="text-gray-400 leading-relaxed">
            Anyone can view a token's exact vesting schedule directly on its detail page. This includes the cliff end date, the unlock progress, and the amount of tokens currently claimable by the team. Transparency builds confidence.
          </p>
        </div>
      </div>
    )
  },
  'dashboard': {
    title: 'Dashboard',
    content: (
      <div className="space-y-8">
        <div>
          <h3 className="text-2xl font-display font-bold text-white mb-4">Your Profile</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-400">
            <li><strong className="text-white">Display Name</strong> - An editable nickname that will be shown publicly.</li>
            <li><strong className="text-white">Avatar</strong> - Automatically generated based on your connected wallet address.</li>
            <li><strong className="text-white">Stats</strong> - Overview of tokens launched and total trading volume facilitated by your tokens.</li>
          </ul>
        </div>

        <div>
          <h3 className="text-2xl font-display font-bold text-white mb-4">Managing Your Tokens</h3>
          <p className="text-gray-400 leading-relaxed mb-4">For each token you've successfully launched, your dashboard provides:</p>
          <ul className="list-disc list-inside space-y-2 text-gray-400">
            <li><strong className="text-white">Analytics</strong> - Real-time data on holder count, trading volume, price charts, and liquidity.</li>
            <li><strong className="text-white">Holder List</strong> - See who the top holders are and their respective positions.</li>
            <li><strong className="text-white">Airdrop Tool</strong> - A convenient way to distribute tokens to multiple wallets in one transaction.</li>
            <li><strong className="text-white">Vesting Status</strong> - Monitor the progress of your team's token unlocks.</li>
          </ul>
        </div>

        <div>
          <h3 className="text-2xl font-display font-bold text-white mb-4">Airdrop Tool Guide</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-400">
            <li>Navigate to your Dashboard, select your Token, then go to the "Airdrop" section.</li>
            <li>Paste recipient wallet addresses and the amount of tokens to send for each, one per line (e.g., `WalletAddress AmountToken`).</li>
            <li>Review the distribution details carefully.</li>
            <li>Confirm and send the transaction. Tokens are distributed directly from your wallet.</li>
          </ol>
        </div>
      </div>
    )
  },
  'faq': {
    title: 'FAQ',
    content: (
      <div className="space-y-8">
        <div>
          <h3 className="text-2xl font-display font-bold text-white mb-6 border-b border-white/10 pb-2">General Questions</h3>
          <div className="space-y-6">
            <div>
              <h4 className="text-lg font-bold text-white mb-2">Is BasedLaunch secure and trustworthy?</h4>
              <p className="text-gray-400">Yes. All smart contracts are deployed on Solana mainnet and audited (or in the process of being audited). Vesting and other features are enforced on-chain. BasedLaunch never has access to your tokens or funds.</p>
            </div>
            <div>
              <h4 className="text-lg font-bold text-white mb-2">Do I need SOL to launch a token?</h4>
              <p className="text-gray-400">Yes. You'll need SOL for the $1 launch fee and for the small Solana network transaction fees required to deploy the contract.</p>
            </div>
            <div>
              <h4 className="text-lg font-bold text-white mb-2">Can I launch multiple tokens?</h4>
              <p className="text-gray-400">Absolutely. You can launch as many tokens as you wish through BasedLaunch.</p>
            </div>
            <div>
              <h4 className="text-lg font-bold text-white mb-2">What happens immediately after I launch my token?</h4>
              <p className="text-gray-400">Your token becomes instantly tradeable on the bonding curve. You can then manage it through your Dashboard, tracking holders, performance, and running airdrops.</p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-2xl font-display font-bold text-white mb-6 border-b border-white/10 pb-2">Token Specifics</h3>
          <div className="space-y-6">
            <div>
              <h4 className="text-lg font-bold text-white mb-2">Can token settings be changed after launch?</h4>
              <p className="text-gray-400">No. Crucial settings like name, ticker, supply, and vesting schedules are immutable once deployed. This is a security feature to prevent bait-and-switch tactics.</p>
            </div>
            <div>
              <h4 className="text-lg font-bold text-white mb-2">What if I make a mistake during setup?</h4>
              <p className="text-gray-400">Please double-check all details on the review screen before confirming the launch. If a critical mistake is made, you would need to launch a new token instance.</p>
            </div>
            <div>
              <h4 className="text-lg font-bold text-white mb-2">Where does my token trade?</h4>
              <p className="text-gray-400">Initially, tokens trade on the integrated bonding curve. Projects can later choose to migrate liquidity to decentralized exchanges like Raydium once graduation thresholds are met.</p>
            </div>
            <div>
              <h4 className="text-lg font-bold text-white mb-2">Can I add liquidity externally?</h4>
              <p className="text-gray-400">Yes. After your token is launched, you can manually add liquidity to any Solana Decentralized Exchange (DEX) by using your token's contract address.</p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-2xl font-display font-bold text-white mb-6 border-b border-white/10 pb-2">Vesting & Team Funds</h3>
          <div className="space-y-6">
            <div>
              <h4 className="text-lg font-bold text-white mb-2">Can team members unlock tokens before the schedule?</h4>
              <p className="text-gray-400">No. The vesting schedule is enforced by the smart contract. No one, including BasedLaunch or the deployer, can unlock tokens earlier than planned.</p>
            </div>
            <div>
              <h4 className="text-lg font-bold text-white mb-2">What happens if a team wallet is compromised or lost?</h4>
              <p className="text-gray-400">Locked tokens in a lost or compromised wallet will still adhere to the vesting schedule but will be inaccessible. It is critical to secure all team wallets used for allocations.</p>
            </div>
            <div>
              <h4 className="text-lg font-bold text-white mb-2">Can I add more vesting for team tokens later?</h4>
              <p className="text-gray-400">No. The initial vesting schedule is set at launch and cannot be modified for already allocated tokens.</p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-2xl font-display font-bold text-white mb-6 border-b border-white/10 pb-2">Fees & Payments</h3>
          <div className="space-y-6">
            <div>
              <h4 className="text-lg font-bold text-white mb-2">Why is the launch fee only $1?</h4>
              <p className="text-gray-400">We aim to make token creation accessible and affordable. The $1 fee covers operational costs, allowing projects to focus their capital on development and marketing rather than platform fees.</p>
            </div>
            <div>
              <h4 className="text-lg font-bold text-white mb-2">Does BasedLaunch charge trading fees?</h4>
              <p className="text-gray-400">No. BasedLaunch charges zero trading fees. Only standard Solana network transaction fees apply. Any creator-set revenue sharing is distributed to holders.</p>
            </div>
            <div>
              <h4 className="text-lg font-bold text-white mb-2">What payment methods are accepted?</h4>
              <p className="text-gray-400">SOL is the only accepted currency for the launch fee. Payment is processed directly from your connected wallet.</p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-2xl font-display font-bold text-white mb-6 border-b border-white/10 pb-2">Technical Details</h3>
          <div className="space-y-6">
            <div>
              <h4 className="text-lg font-bold text-white mb-2">On which blockchain does BasedLaunch operate?</h4>
              <p className="text-gray-400">BasedLaunch operates on the Solana mainnet.</p>
            </div>
            <div>
              <h4 className="text-lg font-bold text-white mb-2">Is the smart contract code open source?</h4>
              <p className="text-gray-400">The smart contracts will be verified and published on-chain for transparency. The frontend code is not currently open source.</p>
            </div>
            <div>
              <h4 className="text-lg font-bold text-white mb-2">How can I verify my token on a block explorer?</h4>
              <p className="text-gray-400">Your token's contract address will be displayed on its detail page after launch. You can use this address to verify it on Solscan or other Solana block explorers.</p>
            </div>
          </div>
        </div>
      </div>
    )
  },
  'contact': {
    title: 'Contact & Support',
    content: (
      <div className="space-y-4">
        <p className="text-gray-400">Need help or have questions? Reach out to us:</p>
        <ul className="list-disc list-inside space-y-2 text-gray-400">
          <li><strong className="text-white">Twitter:</strong> <a href="https://x.com/0xvibeaman" target="_blank" rel="noopener noreferrer" className="text-[#00ffd5] hover:underline">@0xvibeaman</a></li>
          <li><strong className="text-white">Support:</strong> DM on Twitter for any issues or inquiries.</li>
        </ul>
      </div>
    )
  }
};

// Existing structure from screenshot analysis
const docSections = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    content: docContentSections['getting-started'].content
  },
  {
    id: 'creating-a-token',
    title: 'Creating a Token',
    content: docContentSections['creating-a-token'].content
  },
  {
    id: 'fees',
    title: 'Fees',
    content: docContentSections['fees'].content
  },
  {
    id: 'vesting',
    title: 'Vesting & Locks',
    content: docContentSections['vesting'].content
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    content: docContentSections['dashboard'].content
  },
  {
    id: 'faq',
    title: 'FAQ',
    content: docContentSections['faq'].content
  },
   {
    id: 'contact',
    title: 'Contact & Support',
    content: docContentSections['contact'].content
  }
];

export function Docs() {
  const [activeSection, setActiveSection] = useState(docSections[0].id);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-32">
      <div className="mb-12">
        <h1 className="text-5xl md:text-7xl font-display font-black mb-4 tracking-tighter">DOCUMENTATION</h1>
        <p className="text-gray-400 text-lg">Everything you need to know about BasedLaunch.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-12">
        {/* Sidebar Navigation */}
        <div className="lg:w-64 shrink-0">
          <div className="sticky top-24 bg-white/[0.02] border border-white/10 p-4">
            <nav className="space-y-1">
              {docSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 text-sm font-bold uppercase tracking-widest transition-colors text-left",
                    activeSection === section.id
                      ? "bg-[#00ffd5]/10 text-[#00ffd5] border-l-2 border-[#00ffd5]"
                      : "text-gray-500 hover:text-white hover:bg-white/5 border-l-2 border-transparent"
                  )}
                >
                  {section.title}
                  {activeSection === section.id && <ChevronRight className="w-4 h-4" />}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="bg-transparent border border-white/10 p-8 md:p-12">
            {docSections.map((section) => (
              <div
                key={section.id}
                className={cn(
                  "transition-opacity duration-300",
                  activeSection === section.id ? "block opacity-100" : "hidden opacity-0"
                )}
              >
                {section.content}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
