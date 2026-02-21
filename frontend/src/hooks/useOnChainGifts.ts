/**
 * useOnChainGifts — Fetches tokens and their active marketplace listings.
 * 
 * 1. Fetches all tokens minted (via totalSupply)
 * 2. Fetches ItemListed events to find all listings
 * 3. Filters for active listings (not sold or canceled)
 * 4. Combines with IPFS metadata
 */
import { useEffect, useState, useCallback, useMemo } from 'react';
import { usePublicClient, useAccount } from 'wagmi';
import { parseAbiItem, formatEther } from 'viem';
import { ipfsGatewayURL } from '../lib/pinata';
import GiftNFTArtifact from '../abis/GiftNFT.json';
import MarketplaceArtifact from '../abis/GiftMarketplace.json';
import type { GiftNFT, GiftCategory } from '../types';

const NFT_ADDRESS = (import.meta.env.VITE_GIFT_NFT_ADDRESS || '0x') as `0x${string}`;
const MARKETPLACE_ADDRESS = (import.meta.env.VITE_MARKETPLACE_ADDRESS || '0x') as `0x${string}`;

const VOUCHER_TYPES = ['subscription', 'redemption_key', 'activation_link', 'credit'] as const;

interface Listing {
  listingId: number;
  seller: string;
  tokenId: number;
  quantity: number;
  pricePerUnit: bigint;
  active: boolean;
}

export function useOnChainGifts() {
  const publicClient = usePublicClient();
  const { address } = useAccount();
  const [gifts, setGifts] = useState<GiftNFT[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  useEffect(() => {
    if (!publicClient || !NFT_ADDRESS || NFT_ADDRESS === '0x') return;

    let cancelled = false;

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        // 1. Get Listings from Events (More reliable for history)
        const listedLogs = await publicClient!.getLogs({
          address: MARKETPLACE_ADDRESS,
          event: parseAbiItem('event ItemListed(uint256 indexed listingId, address indexed seller, address indexed nftContract, uint256 tokenId, uint256 quantity, uint256 pricePerUnit)'),
          fromBlock: 34000000n,
        });

        const soldLogs = await publicClient!.getLogs({
          address: MARKETPLACE_ADDRESS,
          event: parseAbiItem('event ItemSold(uint256 indexed listingId, address indexed buyer, address indexed nftContract, uint256 tokenId, uint256 quantity, uint256 totalPrice)'),
          fromBlock: 34000000n,
        });

        const canceledLogs = await publicClient!.getLogs({
          address: MARKETPLACE_ADDRESS,
          event: parseAbiItem('event ItemCanceled(uint256 indexed listingId)'),
          fromBlock: 30000000n,
        });

        const soldIds = new Set(soldLogs.map(l => Number(l.args.listingId)));
        const canceledIds = new Set(canceledLogs.map(l => Number(l.args.listingId)));

        const activeListings: Listing[] = listedLogs.map(log => ({
          listingId: Number(log.args.listingId),
          seller: log.args.seller!,
          tokenId: Number(log.args.tokenId),
          quantity: Number(log.args.quantity),
          pricePerUnit: log.args.pricePerUnit!,
          active: !soldIds.has(Number(log.args.listingId)) && !canceledIds.has(Number(log.args.listingId)),
        })).filter(l => l.active);

        if (!cancelled) setListings(activeListings);

        // 2. Get Tokens
        const totalSupply = await publicClient!.readContract({
          address: NFT_ADDRESS,
          abi: GiftNFTArtifact.abi,
          functionName: 'totalSupply',
        }) as bigint;

        const count = Number(totalSupply);
        if (count === 0) {
          if (!cancelled) setGifts([]);
          setLoading(false);
          return;
        }

        const giftPromises: Promise<GiftNFT | null>[] = [];

        for (let tokenId = 1; tokenId <= count; tokenId++) {
          giftPromises.push((async () => {
            try {
              const meta = await publicClient!.readContract({
                address: NFT_ADDRESS,
                abi: GiftNFTArtifact.abi,
                functionName: 'getGiftMetadata',
                args: [BigInt(tokenId)],
              }) as any;

              let userBalance = 0;
              if (address) {
                const bal = await publicClient!.readContract({
                  address: NFT_ADDRESS,
                  abi: GiftNFTArtifact.abi,
                  functionName: 'balanceOf',
                  args: [address, BigInt(tokenId)],
                }) as bigint;
                userBalance = Number(bal);
              }

              let ipfsData: any = {};
              try {
                // Try multiple gateways for better reliability
                const gateways = [
                  ipfsGatewayURL(meta.ipfsCID), // https://ipfs.io/ipfs/
                  `https://dweb.link/ipfs/${meta.ipfsCID}`,
                  `https://gateway.pinata.cloud/ipfs/${meta.ipfsCID}`,
                  `https://ipfs.jbb.one/ipfs/${meta.ipfsCID}`
                ];
                
                let success = false;
                for (const url of gateways) {
                  try {
                    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
                    if (res.ok) {
                      ipfsData = await res.json();
                      success = true;
                      break;
                    }
                  } catch (e) {
                    console.warn(`[IPFS] Failed to fetch from ${url}, trying next...`);
                  }
                }
              } catch { /* use fallback */ }

              const category = (meta.category || 'shopping') as GiftCategory;
              const properties = (ipfsData.properties || {}) as any;

              // Find if this token has an active listing
              const activeListing = activeListings.find(l => l.tokenId === tokenId);

              const gift: GiftNFT = {
                id: `onchain-${tokenId}`,
                tokenId,
                title: ipfsData.name || `Gift #${tokenId}`,
                description: ipfsData.description || `Verified gift card`,
                brand: properties.brand || category,
                category,
                voucherType: VOUCHER_TYPES[Number(meta.baseTokenType)] || 'subscription',
                price: activeListing ? formatEther(activeListing.pricePerUnit) : (properties.value || '0.01'),
                priceUSD: 0,
                quantity: Number(meta.initialSupply),
                available: activeListing ? activeListing.quantity : 0,
                image: ipfsData.image?.startsWith('ipfs://') 
                  ? ipfsGatewayURL(ipfsData.image.replace('ipfs://', '')) 
                  : (ipfsData.image || '🎁'),
                seller: activeListing ? activeListing.seller : meta.creator,
                sellerRating: 5,
                ipfsCID: meta.ipfsCID,
                status: activeListing ? 'listed' : (userBalance > 0 ? 'active' : 'expired'),
                createdAt: new Date(Number(meta.createdAt) * 1000).toISOString(),
                ownershipHistory: [],
                _userBalance: userBalance,
                listingId: activeListing ? activeListing.listingId : undefined,
                _rawPricePerUnit: activeListing ? activeListing.pricePerUnit : undefined,
              };

              return gift;
            } catch (err) {
              return null;
            }
          })());
        }

        const results = await Promise.all(giftPromises);
        if (!cancelled) {
          setGifts(results.filter((g): g is GiftNFT => g !== null));
        }

      } catch (err) {
        console.error('[useOnChainGifts] Fetch Error:', err);
        if (!cancelled) {
          setError('Failed to load on-chain gifts. This may be due to RPC connection issues. Please try refreshing or check your connection.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [publicClient, address, refreshKey]);

  return { gifts, loading, error, refresh };
}
