/**
 * React hook that integrates the recommendation engine with the UI.
 * Provides real-time personalized recommendations based on:
 * - User's explicit category preferences (from Profile page)
 * - Browsing/purchase history (tracked via interactions)
 * - Collaborative signals from other users
 */

import { useMemo, useEffect } from 'react';
import { useAccount } from 'wagmi';
import type { GiftNFT, GiftCategory } from '../types';
import {
  generateRecommendations,
  getColdStartRecommendations,
  loadUserInteractions,
  loadAllInteractions,
  trackInteraction,
  type Recommendation,
  type UserInteraction,
} from '../lib/recommendationEngine';

export function useRecommendations(
  allGifts: GiftNFT[],
  topK: number = 8,
) {
  const { address } = useAccount();

  const recommendations: Recommendation[] = useMemo(() => {
    if (allGifts.length === 0) return [];

    if (!address) {
      // Cold start: no wallet connected
      return getColdStartRecommendations(allGifts, topK);
    }

    const wallet = address.toLowerCase();

    // Load user's preference from localStorage
    const prefsKey = `giftchain_prefs_${wallet}`;
    let userPreferences: GiftCategory[] = [];
    try {
      userPreferences = JSON.parse(localStorage.getItem(prefsKey) || '[]');
    } catch { /* default empty */ }

    // Load interaction history
    const userInteractions: UserInteraction[] = loadUserInteractions(wallet);
    const allInteractions = loadAllInteractions();

    // Add this user's interactions to the map if not present
    if (!allInteractions.has(wallet) && userInteractions.length > 0) {
      allInteractions.set(wallet, userInteractions);
    }

    // Generate recommendations
    return generateRecommendations(
      wallet,
      allGifts,
      userInteractions,
      allInteractions,
      userPreferences,
      new Set(), // no exclusions for now
      topK,
    );
  }, [allGifts, address, topK]);

  return {
    recommendations,
    hasPersonalization: !!address,
  };
}

/**
 * Hook to track user interactions automatically.
 * Call this when a user views, clicks, or purchases a gift.
 */
export function useTrackInteraction() {
  const { address } = useAccount();

  return {
    trackView: (giftId: string, category?: GiftCategory) => {
      if (address) trackInteraction(address, giftId, 'view', category);
    },
    trackClick: (giftId: string, category?: GiftCategory) => {
      if (address) trackInteraction(address, giftId, 'click', category);
    },
    trackPurchase: (giftId: string, category?: GiftCategory) => {
      if (address) trackInteraction(address, giftId, 'purchase', category);
    },
    trackWishlist: (giftId: string, category?: GiftCategory) => {
      if (address) trackInteraction(address, giftId, 'wishlist', category);
    },
  };
}

/** Track page view on mount */
export function useTrackPageView(giftId: string, category?: GiftCategory) {
  const { address } = useAccount();

  useEffect(() => {
    if (address && giftId) {
      trackInteraction(address, giftId, 'view', category);
    }
  }, [address, giftId, category]);
}
