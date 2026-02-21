import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HiArrowLeft, HiArrowRight, HiUpload, HiShieldCheck, HiLightningBolt, HiExternalLink, HiPhotograph, HiClipboardCopy } from 'react-icons/hi';
import confetti from 'canvas-confetti';
import { Link } from 'react-router-dom';
import { useSignMessage } from 'wagmi';
import { useGiftChain } from '../hooks/useGiftChain';
import { encryptData, categoryEmoji, categoryLabel, explorerUrl, copyToClipboard } from '../lib/utils';
import { uploadMetadataToIPFS, uploadFileToIPFS, type GiftMetadata } from '../lib/pinata';
import type { GiftCategory, VoucherType } from '../types';

const categories: GiftCategory[] = ['streaming', 'gaming', 'food', 'travel', 'shopping', 'music', 'education', 'fitness'];
const voucherTypes: { value: VoucherType; label: string }[] = [
  { value: 'subscription', label: 'Subscription Code' },
  { value: 'redemption_key', label: 'Redemption Key' },
  { value: 'activation_link', label: 'Activation Link' },
  { value: 'credit', label: 'Credit Balance' },
];

const steps = ['Details', 'Credentials', 'Preview', 'Mint'];

export default function MintGift() {
  const [step, setStep] = useState(0);
  const [minting, setMinting] = useState(false);
  const [minted, setMinted] = useState(false);
  const [mintTxHash, setMintTxHash] = useState('');
  const { mintGift, userAddress, txHash } = useGiftChain();
  const { signMessageAsync } = useSignMessage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: '', description: '', brand: '', category: '' as GiftCategory | '',
    voucherType: 'subscription' as VoucherType, credential: '',
    quantity: 1, price: '', expiryDate: '', image: '🎁',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const update = (field: string, value: string | number) => setForm(prev => ({ ...prev, [field]: value }));

  // Image file handler
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('Image must be under 10MB');
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Validation per step
  const validateStep = (s: number): string[] => {
    const errors: string[] = [];
    if (s === 0) {
      if (!form.title.trim()) errors.push('Title is required');
      if (!form.brand.trim()) errors.push('Brand is required');
      if (!form.category) errors.push('Category is required');
      if (!form.price || parseFloat(form.price) <= 0) errors.push('Price must be greater than 0');
    }
    if (s === 1) {
      if (!form.credential.trim()) errors.push('Voucher credential is required');
    }
    return errors;
  };

  const goNext = () => {
    const errors = validateStep(step);
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors([]);
    setStep(step + 1);
  };

  const handleMint = async () => {
    if (!userAddress) {
      alert('Please connect your wallet first!');
      return;
    }
    setMinting(true);
    setUploadProgress('Signing encryption key...');
    try {
      // 1. Signature for Encryption
      let signature;
      try {
        signature = await signMessageAsync({ message: 'Sign to encrypt your gift voucher credential for GiftChain.' });
      } catch (err: any) {
        console.error('[MintGift] Signing Error:', err);
        if (err.message?.includes('getChainId')) {
          throw new Error('Wallet connector error. Please try disconnecting and reconnecting your wallet.');
        }
        throw err;
      }

      // 2. Encrypt Data
      setUploadProgress('Encrypting credential...');
      const encryptedCredential = await encryptData(form.credential, signature);

      // 3. Upload image to IPFS if provided
      let imageCID = '';
      let imageField = form.image; // default: emoji
      if (imageFile) {
        setUploadProgress('Uploading image to IPFS...');
        imageCID = await uploadFileToIPFS(imageFile);
        imageField = `ipfs://${imageCID}`;
        console.log('[IPFS] Image uploaded:', imageCID);
      }

      // 4. Upload metadata to IPFS via Pinata
      setUploadProgress('Uploading metadata to IPFS...');
      const metadata: GiftMetadata = {
        name: form.title,
        description: form.description || `${form.brand} gift card`,
        image: imageField,
        attributes: [
          { trait_type: 'Category', value: form.category },
          { trait_type: 'Brand', value: form.brand },
          { trait_type: 'Value', value: form.price + ' ETH' },
          { trait_type: 'Voucher Type', value: form.voucherType },
        ],
        properties: {
          category: form.category,
          brand: form.brand,
          value: form.price,
          currency: 'ETH',
          encrypted_code: encryptedCredential,
          expiry_date: form.expiryDate || undefined,
        },
      };

      const metadataCID = await uploadMetadataToIPFS(metadata);
      console.log('[IPFS] Metadata CID:', metadataCID);

      // 5. Mint NFT on-chain
      setUploadProgress('Confirming in MetaMask...');
      const hash = await mintGift(
        userAddress,
        form.quantity,
        metadataCID,
        form.category,
        voucherTypes.findIndex(v => v.value === form.voucherType),
        form.price
      );

      setMintTxHash(hash);
      console.log('Minted:', hash);
      setMinted(true);
      confetti({ particleCount: 200, spread: 80, origin: { y: 0.6 }, colors: ['#7C3AED', '#F59E0B', '#A78BFA', '#10B981'] });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[MintGift] Error:', message, err);
      alert(`Minting failed: ${message}`);
    } finally {
      setMinting(false);
      setUploadProgress('');
    }
  };

  if (minted) {
    const finalHash = mintTxHash || txHash;
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', duration: 0.6 }}>
          <span className="text-7xl block mb-6">🎉</span>
          <h1 className="text-3xl font-bold mb-3" style={{ fontFamily: 'var(--font-display)' }}>Gift NFT Minted!</h1>
          <p className="text-text-muted mb-4">Your gift card has been minted and is now live on the blockchain.</p>

          {finalHash && (
            <a href={explorerUrl(finalHash)} target="_blank" rel="noopener noreferrer"
               className="inline-flex items-center gap-2 text-primary-light hover:text-primary text-sm mb-6">
              <HiExternalLink /> View Transaction on Polygonscan
            </a>
          )}

          <div className="rounded-2xl glass-card p-6 text-left mb-8">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-text-muted text-xs block">Title</span><span className="font-semibold">{form.title}</span></div>
              <div><span className="text-text-muted text-xs block">Quantity</span><span className="font-semibold">{form.quantity}</span></div>
              <div><span className="text-text-muted text-xs block">Category</span><span className="font-semibold capitalize">{form.category}</span></div>
              <div><span className="text-text-muted text-xs block">Price</span><span className="font-semibold text-accent">{form.price} ETH</span></div>
              <div className="col-span-2"><span className="text-text-muted text-xs block">Credential</span><span className="font-mono text-xs text-green-400">✓ Encrypted & stored on IPFS</span></div>
              {finalHash && (
                <div className="col-span-2">
                  <span className="text-text-muted text-xs block mb-1">Tx Hash</span>
                  <div className="flex items-center gap-2">
                    <a href={explorerUrl(finalHash)} target="_blank" rel="noopener noreferrer" className="font-mono text-[10px] text-primary-light hover:underline break-all block flex-1 bg-black/20 p-2 rounded">
                      {finalHash}
                    </a>
                    <button 
                      onClick={async () => {
                        const success = await copyToClipboard(finalHash);
                        if (success) alert('Transaction hash copied!');
                      }}
                      className="p-2 rounded-lg bg-surface-lighter hover:bg-white/10 transition-colors cursor-pointer text-text-muted hover:text-primary-light"
                      title="Copy Hash"
                    >
                      <HiClipboardCopy size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-4 justify-center flex-wrap">
            <Link to="/collection" 
               className="px-6 py-3 rounded-xl gradient-primary text-white font-semibold hover:opacity-90 transition-opacity flex items-center gap-2">
               🏷️ List for Sale
            </Link>
            <Link to="/marketplace" className="px-6 py-3 rounded-xl glass font-semibold hover:bg-white/10 transition-colors">Browse Marketplace</Link>
            <Link to="/collection" className="px-6 py-3 rounded-xl glass font-semibold hover:bg-white/10 transition-colors">My Collection</Link>
            <button onClick={() => { setMinted(false); setStep(0); setMintTxHash(''); setImageFile(null); setImagePreview(null); setForm({ title: '', description: '', brand: '', category: '', voucherType: 'subscription', credential: '', quantity: 1, price: '', expiryDate: '', image: '🎁' }); }} className="px-6 py-3 rounded-xl glass font-semibold hover:bg-white/10 transition-colors cursor-pointer">Mint Another</button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'var(--font-display)' }}>Mint New Gift NFT</h1>
      <p className="text-text-muted mb-8">Create and list a new digital gift card on the blockchain</p>

      {/* Step Indicator */}
      <div className="flex items-center justify-between mb-10 px-4">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center">
            <div className={`flex items-center gap-2 ${i <= step ? 'text-primary-light' : 'text-text-muted'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                i < step ? 'bg-primary text-white' : i === step ? 'bg-primary/20 border-2 border-primary text-primary-light' : 'bg-surface-light text-text-muted'
              }`}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className="text-xs font-medium hidden sm:block">{s}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-12 sm:w-20 h-0.5 mx-2 ${i < step ? 'bg-primary' : 'bg-border'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 mb-4">
          {validationErrors.map((err, i) => (
            <p key={i} className="text-sm text-red-400 flex items-center gap-2">⚠️ {err}</p>
          ))}
        </div>
      )}

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
          {step === 0 && (
            <div className="rounded-2xl glass-card p-6 space-y-5">
              <h2 className="font-bold text-lg">Gift Details</h2>
              <div>
                <label className="text-xs text-text-muted mb-1.5 block">Title *</label>
                <input value={form.title} onChange={e => update('title', e.target.value)} placeholder="e.g., Netflix Premium 1 Year" className="w-full px-4 py-3 rounded-xl bg-surface-light border border-border text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div>
                <label className="text-xs text-text-muted mb-1.5 block">Description</label>
                <textarea value={form.description} onChange={e => update('description', e.target.value)} rows={3} placeholder="Describe the gift card..." className="w-full px-4 py-3 rounded-xl bg-surface-light border border-border text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-text-muted mb-1.5 block">Brand / Service *</label>
                  <input value={form.brand} onChange={e => update('brand', e.target.value)} placeholder="Netflix, Spotify..." className="w-full px-4 py-3 rounded-xl bg-surface-light border border-border text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="text-xs text-text-muted mb-1.5 block">Category *</label>
                  <select value={form.category} onChange={e => update('category', e.target.value)} className="w-full px-4 py-3 rounded-xl bg-surface-light border border-border text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                    <option value="">Select...</option>
                    {categories.map(c => <option key={c} value={c}>{categoryEmoji(c)} {categoryLabel(c)}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-text-muted mb-1.5 block">Price (ETH) *</label>
                  <input type="number" step="0.001" min="0.001" value={form.price} onChange={e => update('price', e.target.value)} placeholder="0.05" className="w-full px-4 py-3 rounded-xl bg-surface-light border border-border text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="text-xs text-text-muted mb-1.5 block">Quantity (ERC-1155)</label>
                  <input type="number" min={1} value={form.quantity} onChange={e => update('quantity', parseInt(e.target.value) || 1)} className="w-full px-4 py-3 rounded-xl bg-surface-light border border-border text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-text-muted mb-1.5 block">Voucher Type</label>
                  <select value={form.voucherType} onChange={e => update('voucherType', e.target.value)} className="w-full px-4 py-3 rounded-xl bg-surface-light border border-border text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                    {voucherTypes.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-text-muted mb-1.5 block">Expiry Date (optional)</label>
                  <input type="date" value={form.expiryDate} onChange={e => update('expiryDate', e.target.value)} className="w-full px-4 py-3 rounded-xl bg-surface-light border border-border text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              </div>

              {/* Image Upload Section */}
              <div>
                <label className="text-xs text-text-muted mb-1.5 block">Cover Image</label>
                <div className="space-y-3">
                  {/* Image upload */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-xl border-2 border-dashed border-border hover:border-primary/50 p-6 text-center cursor-pointer transition-colors group"
                  >
                    {imagePreview ? (
                      <div className="relative inline-block">
                        <img src={imagePreview} alt="Preview" className="max-h-40 rounded-lg mx-auto object-cover" />
                        <button
                          onClick={e => { e.stopPropagation(); removeImage(); }}
                          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center hover:bg-red-600"
                        >✕</button>
                      </div>
                    ) : (
                      <>
                        <HiPhotograph className="text-3xl text-text-muted mx-auto mb-2 group-hover:text-primary-light transition-colors" />
                        <p className="text-sm text-text-muted">Click to upload an image (PNG, JPG, GIF, max 10MB)</p>
                        <p className="text-xs text-text-muted mt-1">Image will be stored permanently on IPFS</p>
                      </>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />

                  {/* Fallback emoji selector */}
                  <div>
                    <p className="text-xs text-text-muted mb-2">{imageFile ? 'Or replace with an emoji:' : 'Or pick an emoji instead:'}</p>
                    <div className="flex gap-2 flex-wrap">
                      {['🎬', '🎵', '🎮', '🍔', '✈️', '📦', '📚', '🏋️', '🎁', '💳'].map(e => (
                        <button key={e} onClick={() => { update('image', e); removeImage(); }} className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all cursor-pointer ${!imageFile && form.image === e ? 'bg-primary/20 border-2 border-primary ring-2 ring-primary/30' : 'bg-surface-light hover:bg-surface-lighter'}`}>
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="rounded-2xl glass-card p-6 space-y-5">
              <h2 className="font-bold text-lg">Voucher Credentials</h2>
              <div className="rounded-xl bg-primary/10 border border-primary/20 p-4 flex gap-3">
                <HiShieldCheck className="text-primary-light text-xl shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-primary-light">End-to-end encrypted</p>
                  <p className="text-xs text-text-muted mt-1">Your voucher credential will be encrypted using your wallet signature and stored on IPFS. Only the NFT owner can decrypt it by signing a message.</p>
                </div>
              </div>
              <div>
                <label className="text-xs text-text-muted mb-1.5 block">Voucher Credential *</label>
                <textarea
                  id="voucher-credential"
                  value={form.credential}
                  onChange={e => update('credential', e.target.value)}
                  rows={4}
                  placeholder={
                    form.voucherType === 'subscription' ? 'XXXX-XXXX-XXXX-XXXX' :
                    form.voucherType === 'activation_link' ? 'https://example.com/activate?code=...' :
                    form.voucherType === 'credit' ? '$50.00 credit balance' :
                    'Enter your redemption key...'
                  }
                  className="w-full px-4 py-3 rounded-xl bg-surface-light border border-border text-text font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none z-10 relative"
                  spellCheck={false}
                />
              </div>
              <p className="text-xs text-text-muted flex items-center gap-1.5">
                <HiLightningBolt className="text-accent" />
                Credential is encrypted client-side with AES-256-GCM before leaving your browser
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="rounded-2xl glass-card p-6">
              <h2 className="font-bold text-lg mb-6">Preview</h2>
              <div className="rounded-2xl glass-card overflow-hidden max-w-sm mx-auto">
                <div className="h-44 bg-gradient-to-br from-primary/20 to-primary-dark/30 flex items-center justify-center overflow-hidden">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Gift" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-6xl">{form.image}</span>
                  )}
                </div>
                <div className="p-5">
                  <h3 className="font-bold mb-1">{form.title || 'Untitled Gift'}</h3>
                  <p className="text-xs text-text-muted mb-3">{form.description || 'No description'}</p>
                  <div className="flex justify-between items-center text-sm mb-3">
                    <span className="font-bold text-accent">{form.price || '0'} ETH</span>
                    <span className="text-text-muted">Qty: {form.quantity}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="px-3 py-2 rounded-lg bg-surface-light"><span className="text-text-muted">Brand:</span> {form.brand || '-'}</div>
                    <div className="px-3 py-2 rounded-lg bg-surface-light"><span className="text-text-muted">Category:</span> {form.category ? categoryLabel(form.category) : '-'}</div>
                    <div className="px-3 py-2 rounded-lg bg-surface-light"><span className="text-text-muted">Type:</span> {form.voucherType.replace('_', ' ')}</div>
                    <div className="px-3 py-2 rounded-lg bg-surface-light"><span className="text-text-muted">Expiry:</span> {form.expiryDate || 'None'}</div>
                  </div>
                  {imageFile && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-green-400">
                      <HiPhotograph /> Custom image — will be uploaded to IPFS
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-6 rounded-xl bg-surface-light p-4">
                <h3 className="text-sm font-semibold mb-3">What happens on Mint</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2"><span className="text-green-400">✓</span> Credential encrypted with AES-256-GCM</div>
                  {imageFile && <div className="flex items-center gap-2"><span className="text-green-400">✓</span> Image uploaded to IPFS via Pinata</div>}
                  <div className="flex items-center gap-2"><span className="text-green-400">✓</span> Metadata pinned to IPFS (permanent)</div>
                  <div className="flex items-center gap-2"><span className="text-green-400">✓</span> ERC-1155 token minted on Amoy</div>
                  <div className="flex justify-between mt-3 pt-3 border-t border-border font-semibold"><span>Est. Gas Fee</span><span className="text-accent">~0.003 ETH</span></div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="rounded-2xl glass-card p-8 text-center">
              <h2 className="font-bold text-lg mb-6">Minting Your Gift NFT</h2>
              {minting ? (
                <div className="py-8">
                  <div className="w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto mb-6" />
                  <h3 className="text-lg font-semibold mb-2">Processing...</h3>
                  <p className="text-sm text-text-muted mb-4">Please confirm signature and transaction in your wallet.</p>
                  {uploadProgress && (
                    <p className="text-sm text-accent animate-pulse">{uploadProgress}</p>
                  )}
                  <div className="mt-6 space-y-2 text-left max-w-xs mx-auto">
                    <div className="flex items-center gap-3 text-sm"><span className="text-green-400">✓</span> Wallet connected</div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className={uploadProgress.includes('Encrypt') || uploadProgress.includes('Signing') ? 'animate-spin' : 'text-green-400'}>{uploadProgress.includes('Encrypt') || uploadProgress.includes('Signing') ? '⏳' : '✓'}</span>
                      Encrypting credential
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className={uploadProgress.includes('IPFS') || uploadProgress.includes('Uploading') ? 'animate-spin' : uploadProgress.includes('MetaMask') || uploadProgress.includes('Confirming') ? 'text-green-400' : 'text-text-muted'}>{uploadProgress.includes('IPFS') || uploadProgress.includes('Uploading') ? '⏳' : uploadProgress.includes('MetaMask') || uploadProgress.includes('Confirming') ? '✓' : '○'}</span>
                      Uploading to IPFS
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className={uploadProgress.includes('MetaMask') || uploadProgress.includes('Confirming') ? 'animate-spin' : 'text-text-muted'}>{uploadProgress.includes('MetaMask') || uploadProgress.includes('Confirming') ? '⏳' : '○'}</span>
                      Minting on blockchain
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-4">
                  <HiUpload className="text-5xl text-primary-light mx-auto mb-4" />
                  <p className="text-text-muted mb-2">Ready to mint your gift card as an ERC-1155 NFT</p>
                  <p className="text-xs text-text-muted mb-6">You will be asked to sign a message (free) and then confirm a transaction (gas fee ~0.003 ETH)</p>
                  <button onClick={handleMint} className="px-10 py-4 rounded-2xl gradient-primary text-white font-bold text-lg hover:opacity-90 transition-opacity shadow-xl glow cursor-pointer">
                    🚀 Sign & Mint NFT
                  </button>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation Buttons */}
      {!minting && (
        <div className="flex justify-between mt-6">
          <button
            onClick={() => { setValidationErrors([]); setStep(Math.max(0, step - 1)); }}
            disabled={step === 0}
            className={`px-6 py-3 rounded-xl text-sm font-medium flex items-center gap-2 transition-all cursor-pointer ${step === 0 ? 'opacity-30 cursor-not-allowed' : 'glass hover:bg-white/10'}`}
          >
            <HiArrowLeft /> Back
          </button>
          {step < 3 && (
            <button
              onClick={goNext}
              className="px-6 py-3 rounded-xl gradient-primary text-white text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity cursor-pointer"
            >
              Next <HiArrowRight />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
