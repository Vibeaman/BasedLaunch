import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Upload, Info, Rocket, ShieldCheck, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useCreateToken } from '../hooks/useCreateToken';
import { useIPFS } from '../hooks/useIPFS';
import { useNavigate } from 'react-router-dom';

const steps = [
  { id: 1, short: 'Basics', title: 'Step 1: Token Basics (name, ticker, image, supply)' },
  { id: 2, short: 'Team', title: 'Step 2: Team Wallets (optional)' },
  { id: 3, short: 'Vesting', title: 'Step 3: Vesting Schedule (optional)' },
  { id: 4, short: 'Whitelist', title: 'Step 4: Whitelist (optional)' },
  { id: 5, short: 'Rev Share', title: 'Step 5: Revenue Sharing (optional)' },
  { id: 6, short: 'Review', title: 'Step 6: Review & Pay' },
];

export function Launch() {
  const { connected } = useWallet();
  const { createToken, loading, error } = useCreateToken();
  const { uploadImage, uploadMetadata, uploading: uploadingIPFS, error: ipfsError } = useIPFS();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [currentStep, setCurrentStep] = useState(1);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    ticker: '',
    supply: 1000000000,
    teamWallets: [{ address: '', percentage: 0 }],
    cliff: 30,
    linearUnlock: 180,
    whitelist: '',
    revShare: 0,
  });

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, steps.length));
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLaunch = async () => {
    if (!connected) return;
    
    // Calculate team allocation
    const teamPercent = formData.teamWallets.reduce((acc, w) => acc + (w.percentage || 0), 0);
    const hasVesting = teamPercent > 0 && (formData.cliff > 0 || formData.linearUnlock > 0);
    
    // Parse whitelist addresses
    const whitelistAddresses = formData.whitelist
      .split(/[,\n]/)
      .map(addr => addr.trim())
      .filter(addr => addr.length > 0);
    
    try {
      let metadataUri = '';
      
      // Upload image to IPFS if provided
      if (imageFile) {
        setUploadStatus('Uploading image to IPFS...');
        const imageResult = await uploadImage(imageFile);
        if (!imageResult) {
          throw new Error('Failed to upload image to IPFS');
        }
        
        // Upload metadata JSON to IPFS
        setUploadStatus('Uploading metadata to IPFS...');
        const metadataResult = await uploadMetadata({
          name: formData.name,
          symbol: formData.ticker,
          description: `${formData.name} ($${formData.ticker}) - Launched on BasedLaunch`,
          image: imageResult.ipfsUrl,
        });
        
        if (!metadataResult) {
          throw new Error('Failed to upload metadata to IPFS');
        }
        
        metadataUri = metadataResult.ipfsUrl;
      }
      
      setUploadStatus('Creating token on-chain...');
      
      const result = await createToken({
        name: formData.name,
        symbol: formData.ticker,
        supply: formData.supply,
        teamPercent: teamPercent,
        cliffDays: hasVesting ? formData.cliff : 0,
        vestingDays: hasVesting ? formData.linearUnlock : 0,
        revSharePercent: formData.revShare,
        whitelist: whitelistAddresses.length > 0 ? whitelistAddresses : undefined,
        metadataUri: metadataUri, // Pass IPFS metadata URI
      });
      
      if (result?.mint) {
        setUploadStatus(null);
        navigate(`/token/${result.mint}`);
      }
    } catch (err) {
      console.error('Launch failed:', err);
      setUploadStatus(null);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-8">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Token Name</label>
              <input
                type="text"
                className="w-full bg-transparent border-b border-white/20 px-0 py-3 text-2xl text-white focus:outline-none focus:border-[#00ffd5] transition-colors rounded-none placeholder:text-white/20"
                placeholder="e.g. Based AI"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Ticker</label>
              <input
                type="text"
                className="w-full bg-transparent border-b border-white/20 px-0 py-3 text-2xl text-white focus:outline-none focus:border-[#00ffd5] transition-colors rounded-none placeholder:text-white/20"
                placeholder="e.g. BAI"
                value={formData.ticker}
                onChange={(e) => setFormData({ ...formData, ticker: e.target.value.toUpperCase() })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Token Image</label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageSelect}
                accept="image/*"
                className="hidden"
              />
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border border-dashed border-white/20 p-12 text-center hover:border-[#00ffd5]/50 transition-colors cursor-pointer bg-white/[0.02] group"
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="w-24 h-24 mx-auto rounded-full object-cover" />
                ) : (
                  <>
                    <Upload className="w-8 h-8 mx-auto mb-4 text-gray-500 group-hover:text-[#00ffd5] transition-colors" />
                    <p className="text-sm text-gray-400 font-medium">Click to upload or drag and drop</p>
                    <p className="text-xs text-gray-600 mt-2 uppercase tracking-widest">PNG, JPG, GIF up to 5MB</p>
                  </>
                )}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">
                Total Supply: <span className="text-[#00ffd5]">{formData.supply.toLocaleString()}</span>
              </label>
              <input
                type="range"
                min="1000000"
                max="1000000000"
                step="1000000"
                className="w-full accent-[#00ffd5]"
                value={formData.supply}
                onChange={(e) => setFormData({ ...formData, supply: parseInt(e.target.value) })}
              />
              <div className="flex justify-between text-xs text-gray-500 mt-2 font-mono">
                <span>1M</span>
                <span>1B</span>
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-8">
            <div className="flex items-start gap-4 p-6 bg-white/[0.02] border border-white/10">
              <Info className="w-5 h-5 text-[#8b5cf6] shrink-0 mt-0.5" />
              <p className="text-sm text-gray-400 leading-relaxed">
                Allocate tokens to team members. These will be subject to the vesting schedule defined in the next step.
              </p>
            </div>
            {formData.teamWallets.map((wallet, index) => (
              <div key={index} className="flex gap-6 items-end">
                <div className="flex-grow">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Wallet Address</label>
                  <input
                    type="text"
                    className="w-full bg-transparent border-b border-white/20 px-0 py-2 text-lg text-white focus:outline-none focus:border-[#00ffd5] rounded-none font-mono placeholder:text-white/20"
                    placeholder="Solana address"
                    value={wallet.address}
                    onChange={(e) => {
                      const newWallets = [...formData.teamWallets];
                      newWallets[index].address = e.target.value;
                      setFormData({ ...formData, teamWallets: newWallets });
                    }}
                  />
                </div>
                <div className="w-32">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Alloc (%)</label>
                  <input
                    type="number"
                    className="w-full bg-transparent border-b border-white/20 px-0 py-2 text-lg text-white focus:outline-none focus:border-[#00ffd5] rounded-none font-mono placeholder:text-white/20"
                    placeholder="0"
                    value={wallet.percentage}
                    onChange={(e) => {
                      const newWallets = [...formData.teamWallets];
                      newWallets[index].percentage = parseFloat(e.target.value);
                      setFormData({ ...formData, teamWallets: newWallets });
                    }}
                  />
                </div>
              </div>
            ))}
            <button
              onClick={() => setFormData({ ...formData, teamWallets: [...formData.teamWallets, { address: '', percentage: 0 }] })}
              className="text-sm font-bold uppercase tracking-widest text-[#00ffd5] hover:text-white transition-colors border-b border-[#00ffd5] hover:border-white pb-1"
            >
              + Add Wallet
            </button>
          </div>
        );
      case 3:
        return (
          <div className="space-y-8">
             <div className="flex items-start gap-4 p-6 bg-white/[0.02] border border-white/10">
              <ShieldCheck className="w-5 h-5 text-[#00ffd5] shrink-0 mt-0.5" />
              <p className="text-sm text-gray-400 leading-relaxed">
                Enforcing a vesting schedule builds trust. Team tokens will be locked in a smart contract.
              </p>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Cliff Period (Days)</label>
              <p className="text-sm text-gray-500 mb-4">Time before any team tokens can be unlocked.</p>
              <input
                type="number"
                className="w-full bg-transparent border-b border-white/20 px-0 py-3 text-2xl text-white focus:outline-none focus:border-[#00ffd5] rounded-none font-mono"
                value={formData.cliff}
                onChange={(e) => setFormData({ ...formData, cliff: parseInt(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Linear Unlock Duration (Days)</label>
              <p className="text-sm text-gray-500 mb-4">Time it takes for all tokens to unlock after the cliff.</p>
              <input
                type="number"
                className="w-full bg-transparent border-b border-white/20 px-0 py-3 text-2xl text-white focus:outline-none focus:border-[#00ffd5] rounded-none font-mono"
                value={formData.linearUnlock}
                onChange={(e) => setFormData({ ...formData, linearUnlock: parseInt(e.target.value) })}
              />
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-8">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Whitelist Addresses (Optional)</label>
              <p className="text-sm text-gray-500 mb-4">Paste Solana addresses separated by commas or newlines. These addresses get early access.</p>
              <textarea
                className="w-full h-48 bg-white/[0.02] border border-white/20 p-4 text-white focus:outline-none focus:border-[#00ffd5] font-mono text-sm resize-none rounded-none placeholder:text-white/20"
                placeholder="Address1&#10;Address2&#10;..."
                value={formData.whitelist}
                onChange={(e) => setFormData({ ...formData, whitelist: e.target.value })}
              />
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-8">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Revenue Sharing (%)</label>
              <p className="text-sm text-gray-500 mb-8">Percentage of trading fees automatically distributed to token holders.</p>
              <input
                type="range"
                min="0"
                max="10"
                step="0.5"
                className="w-full accent-[#00ffd5]"
                value={formData.revShare}
                onChange={(e) => setFormData({ ...formData, revShare: parseFloat(e.target.value) })}
              />
              <div className="text-center mt-8 font-display text-6xl font-black text-[#00ffd5]">
                {formData.revShare}%
              </div>
            </div>
          </div>
        );
      case 6:
        return (
          <div className="space-y-8">
            <h3 className="text-3xl font-display font-black mb-6 tracking-tighter">REVIEW</h3>
            <div className="bg-white/[0.02] border border-white/10 p-8 space-y-6">
              <div className="flex justify-between border-b border-white/5 pb-6">
                <span className="text-gray-500 uppercase tracking-widest text-xs font-bold">Token</span>
                <span className="font-bold text-lg">{formData.name || 'N/A'} <span className="text-gray-500 font-mono">(${formData.ticker || 'N/A'})</span></span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-6">
                <span className="text-gray-500 uppercase tracking-widest text-xs font-bold">Supply</span>
                <span className="font-mono text-lg">{formData.supply.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-6">
                <span className="text-gray-500 uppercase tracking-widest text-xs font-bold">Team Allocation</span>
                <span className="font-mono text-lg">{formData.teamWallets.reduce((acc, w) => acc + (w.percentage || 0), 0)}%</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-6">
                <span className="text-gray-500 uppercase tracking-widest text-xs font-bold">Vesting</span>
                <span className="text-lg">{formData.cliff}d cliff, {formData.linearUnlock}d unlock</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-6">
                <span className="text-gray-500 uppercase tracking-widest text-xs font-bold">Rev Share</span>
                <span className="font-mono text-lg">{formData.revShare}%</span>
              </div>
              <div className="flex justify-between pt-4">
                <span className="text-gray-500 uppercase tracking-widest text-xs font-bold">Platform Fee</span>
                <span className="font-black text-2xl text-[#00ffd5]">$1 (in SOL)</span>
              </div>
            </div>
            {(error || ipfsError) && (
              <div className="bg-red-500/10 border border-red-500/20 p-4 text-red-400 text-sm">
                {error || ipfsError}
              </div>
            )}
            {uploadStatus && (
              <div className="bg-[#00ffd5]/10 border border-[#00ffd5]/20 p-4 text-[#00ffd5] text-sm flex items-center gap-3">
                <Loader2 className="w-4 h-4 animate-spin" />
                {uploadStatus}
              </div>
            )}
            {imageFile && (
              <div className="flex justify-between border-t border-white/5 pt-6">
                <span className="text-gray-500 uppercase tracking-widest text-xs font-bold">Image</span>
                <span className="text-[#00ffd5] text-sm">{imageFile.name}</span>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-32">
      <div className="mb-16">
        <h1 className="text-5xl md:text-7xl font-display font-black mb-4 tracking-tighter">LAUNCH</h1>
        <p className="text-gray-400 text-lg">Create your token with built-in trust mechanics.</p>
      </div>

      {/* Progress Bar */}
      <div className="mb-16">
        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-display font-bold text-[#00ffd5]">
            {steps[currentStep - 1].title}
          </h2>
        </div>
        <div className="flex justify-between mb-4">
          {steps.map((step) => (
            <div
              key={step.id}
              className={cn(
                "text-xs font-bold uppercase tracking-widest transition-colors",
                currentStep >= step.id ? "text-[#00ffd5]" : "text-gray-600 hidden md:block"
              )}
            >
              {currentStep === step.id ? step.short : step.id}
            </div>
          ))}
        </div>
        <div className="h-1 bg-white/10 rounded-none overflow-hidden">
          <motion.div
            className="h-full bg-[#00ffd5]"
            initial={{ width: '0%' }}
            animate={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-transparent border border-white/10 p-8 md:p-12 relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {renderStepContent()}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between mt-16 pt-8 border-t border-white/10">
          <button
            onClick={prevStep}
            disabled={currentStep === 1}
            className={cn(
              "flex items-center px-6 py-4 font-bold uppercase tracking-widest text-sm transition-all border-b",
              currentStep === 1
                ? "opacity-50 cursor-not-allowed text-gray-600 border-transparent"
                : "text-white border-white/30 hover:border-white"
            )}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back
          </button>
          
          {currentStep < steps.length ? (
            <button
              onClick={nextStep}
              className="flex items-center px-8 py-4 font-bold uppercase tracking-widest text-sm bg-white text-black hover:bg-gray-200 transition-all border border-white"
            >
              Next Step
              <ChevronRight className="w-4 h-4 ml-2" />
            </button>
          ) : !connected ? (
            <WalletMultiButton className="!bg-[#00ffd5] !text-black hover:!bg-[#00ffd5]/90 !font-bold !uppercase !tracking-widest !text-sm !px-8 !py-4 !rounded-none !border !border-[#00ffd5]" />
          ) : (
            <button
              onClick={handleLaunch}
              disabled={loading || uploadingIPFS || !formData.name || !formData.ticker}
              className={cn(
                "flex items-center px-8 py-4 font-bold uppercase tracking-widest text-sm bg-[#00ffd5] text-black hover:bg-[#00ffd5]/90 glow-primary transition-all border border-[#00ffd5]",
                (loading || uploadingIPFS || !formData.name || !formData.ticker) && "opacity-50 cursor-not-allowed"
              )}
            >
              {(loading || uploadingIPFS) ? (
                <>
                  <Loader2 className="w-4 h-4 mr-3 animate-spin" />
                  {uploadStatus || 'Launching...'}
                </>
              ) : (
                <>
                  Pay $1 & Launch
                  <Rocket className="w-4 h-4 ml-3" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}