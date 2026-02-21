/**
 * useGiftChain — Core Web3 hook for all GiftChain contract interactions.
 *
 * Uses Wagmi's useWriteContract + useWaitForTransactionReceipt pattern
 * recommended by MetaMask SDK docs for proper tx lifecycle tracking.
 *
 * Error codes handled:
 *   4001  — User rejected transaction
 *  -32603 — Insufficient funds
 *  -32000 — Gas too low
 *  -32002 — Request already pending
 */
import { useAccount, useWriteContract, usePublicClient } from 'wagmi';
import { parseEther, parseGwei } from 'viem';
import { useState, useCallback } from 'react';
import confetti from 'canvas-confetti';
import GiftNFTArtifact from '../abis/GiftNFT.json';
import MarketplaceArtifact from '../abis/GiftMarketplace.json';

// Placeholder addresses — update after deploying to Sepolia
const NFT_ADDRESS = (import.meta.env.VITE_GIFT_NFT_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`;
const MARKETPLACE_ADDRESS = (import.meta.env.VITE_MARKETPLACE_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`;

/**
 * Amoy gas override — Polygon PoS generally has low fees, but we set a 
 * 25 gwei priority fee to ensure fast inclusion in blocks.
 */
const AMOY_GAS = {
  maxPriorityFeePerGas: parseGwei('25'),
  maxFeePerGas: parseGwei('50'),
} as const;

/** Map common MetaMask error codes to user-friendly messages */
function friendlyError(err: unknown): string {
  const error = err as { code?: number; shortMessage?: string; message?: string };
  switch (error.code) {
    case 4001:  return 'Transaction rejected — you cancelled in MetaMask.';
    case -32603: return 'Insufficient funds — check your wallet balance.';
    case -32000: return 'Gas estimation failed — the transaction may revert.';
    case -32002: return 'A MetaMask request is already pending — check your wallet.';
    default:     return error.shortMessage || error.message || 'Transaction failed.';
  }
}

export type TxStatus = 'idle' | 'signing' | 'confirming' | 'confirmed' | 'error';

export function useGiftChain() {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const [txStatus, setTxStatus] = useState<TxStatus>('idle');
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [txError, setTxError] = useState<string | undefined>();

  /** Reset transaction state */
  const resetTx = useCallback(() => {
    setTxStatus('idle');
    setTxHash(undefined);
    setTxError(undefined);
  }, []);

  /**
   * Internal helper — wraps every contract write with:
   *  1. Status tracking (signing → confirming → confirmed)
   *  2. waitForTransactionReceipt for on-chain confirmation
   *  3. MetaMask error code handling
   */
  const execTx = useCallback(async (
    writeFn: () => Promise<`0x${string}`>,
    celebrate = false,
  ): Promise<`0x${string}`> => {
    resetTx();
    setTxStatus('signing');
    try {
      const hash = await writeFn();
      setTxHash(hash);
      setTxStatus('confirming');

      // Wait for on-chain confirmation (generous timeout for Sepolia)
      if (publicClient) {
        try {
          await publicClient.waitForTransactionReceipt({
            hash,
            confirmations: 1,
            timeout: 120_000,       // 2 minutes
            pollingInterval: 3_000, // check every 3s
          });
        } catch (receiptErr) {
          // Transaction was sent — it may still confirm. Don't fail the whole flow.
          console.warn('[GiftChain] Receipt wait timed out, but tx was sent:', hash, receiptErr);
        }
      }

      setTxStatus('confirmed');
      if (celebrate) {
        confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 }, colors: ['#6C5CE7', '#F6B93B', '#a29bfe'] });
      }
      return hash;
    } catch (err) {
      const msg = friendlyError(err);
      setTxError(msg);
      setTxStatus('error');
      console.error('[GiftChain TX Error]', err);
      throw new Error(msg);
    }
  }, [publicClient, resetTx]);

  // ─── MINT ─────────────────────────────────────────────
  const mintGift = useCallback(async (
    to: string,
    quantity: number,
    ipfsCID: string,
    category: string,
    baseTokenType: number,
    _priceETH: string,
  ) => {
    return execTx(() => writeContractAsync({
      address: NFT_ADDRESS,
      abi: GiftNFTArtifact.abi,
      functionName: 'mint',
      args: [to, BigInt(quantity), ipfsCID, category, BigInt(baseTokenType), `ipfs://${ipfsCID}`],
      ...AMOY_GAS,
    }), true);
  }, [writeContractAsync, execTx]);

  // ─── LIST ─────────────────────────────────────────────
  const listGift = useCallback(async (tokenId: number, quantity: number, priceETH: string) => {
    if (!publicClient || !address) throw new Error('Wallet not connected');

    // 1. Check + request approval if needed
    const isApproved = await publicClient.readContract({
      address: NFT_ADDRESS,
      abi: GiftNFTArtifact.abi,
      functionName: 'isApprovedForAll',
      args: [address, MARKETPLACE_ADDRESS],
    });

    if (!isApproved) {
      // Fire approval tx first and wait for it
      await execTx(() => writeContractAsync({
        address: NFT_ADDRESS,
        abi: GiftNFTArtifact.abi,
        functionName: 'setApprovalForAll',
        args: [MARKETPLACE_ADDRESS, true],
        ...AMOY_GAS,
      }));
    }

    // 2. List item
    return execTx(() => writeContractAsync({
      address: MARKETPLACE_ADDRESS,
      abi: MarketplaceArtifact.abi,
      functionName: 'listItem',
      args: [NFT_ADDRESS, BigInt(tokenId), BigInt(quantity), parseEther(priceETH)],
      ...AMOY_GAS,
    }));
  }, [address, publicClient, writeContractAsync, execTx]);

  // ─── BUY ──────────────────────────────────────────────
  const buyGift = useCallback(async (listingId: number, quantity: number, totalPriceETH: string) => {
    return execTx(() => writeContractAsync({
      address: MARKETPLACE_ADDRESS,
      abi: MarketplaceArtifact.abi,
      functionName: 'buyItem',
      args: [BigInt(listingId), BigInt(quantity)],
      value: parseEther(totalPriceETH),
      ...AMOY_GAS,
    }), true);
  }, [writeContractAsync, execTx]);

  // ─── REDEEM (burn-to-reveal) ──────────────────────────
  const redeemGift = useCallback(async (tokenId: number, quantity: number) => {
    return execTx(() => writeContractAsync({
      address: NFT_ADDRESS,
      abi: GiftNFTArtifact.abi,
      functionName: 'redeem',
      args: [BigInt(tokenId), BigInt(quantity)],
      ...AMOY_GAS,
    }));
  }, [writeContractAsync, execTx]);

  // ─── TRANSFER (safeTransferFrom) ──────────────────────
  const transferGift = useCallback(async (tokenId: number, toAddress: string) => {
    if (!address) throw new Error('Wallet not connected');
    return execTx(() => writeContractAsync({
      address: NFT_ADDRESS,
      abi: GiftNFTArtifact.abi,
      functionName: 'safeTransferFrom',
      args: [address, toAddress as `0x${string}`, BigInt(tokenId), BigInt(1), '0x'],
      ...AMOY_GAS,
    }));
  }, [address, writeContractAsync, execTx]);

  // ─── CANCEL LISTING ───────────────────────────────────
  const cancelListing = useCallback(async (listingId: number) => {
    return execTx(() => writeContractAsync({
      address: MARKETPLACE_ADDRESS,
      abi: MarketplaceArtifact.abi,
      functionName: 'cancelListing',
      args: [BigInt(listingId)],
      ...AMOY_GAS,
    }));
  }, [writeContractAsync, execTx]);

  return {
    // Actions
    mintGift,
    listGift,
    buyGift,
    redeemGift,
    transferGift,
    cancelListing,
    resetTx,
    // State
    txStatus,
    txHash,
    txError,
    isPending: txStatus === 'signing' || txStatus === 'confirming',
    isConfirmed: txStatus === 'confirmed',
    // Wallet
    userAddress: address,
    addresses: { nft: NFT_ADDRESS, marketplace: MARKETPLACE_ADDRESS },
  };
}
