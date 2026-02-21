/**
 * GiftChain Admin Access Control
 * ================================
 * Role-Based Access Control (RBAC) for the admin dashboard.
 *
 * Architecture:
 * - Contract owner (deployer) is always a super-admin
 * - Additional admin wallets are stored in localStorage per-deployment
 * - The contract's `owner()` function is checked on-chain for verification
 * - Admin roles: 'super_admin' (full control), 'admin' (dashboard access),
 *                'moderator' (fraud review only)
 *
 * This provides frontend-level access control. For production,
 * this should be backed by on-chain role checks (e.g., OpenZeppelin AccessControl).
 */

import { useState, useEffect, useCallback } from 'react';
import { useAccount, usePublicClient } from 'wagmi';

const NFT_ADDRESS = (import.meta.env.VITE_GIFT_NFT_ADDRESS || '0x') as `0x${string}`;
const MARKETPLACE_ADDRESS = (import.meta.env.VITE_MARKETPLACE_ADDRESS || '0x') as `0x${string}`;

const ADMIN_STORAGE_KEY = 'giftchain_admin_roles';

export type AdminRole = 'super_admin' | 'admin' | 'moderator';

export interface AdminEntry {
  wallet: string;
  role: AdminRole;
  addedBy: string;
  addedAt: string;
  label?: string; // human-readable name
}

const OWNER_ABI = [
  {
    inputs: [],
    name: 'owner',
    outputs: [{ type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

function loadAdminList(): AdminEntry[] {
  try {
    return JSON.parse(localStorage.getItem(ADMIN_STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveAdminList(list: AdminEntry[]) {
  localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(list));
}

export function useAdminAccess() {
  const { address } = useAccount();
  const publicClient = usePublicClient();

  const [contractOwner, setContractOwner] = useState<string | null>(null);
  const [adminList, setAdminList] = useState<AdminEntry[]>(loadAdminList);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch on-chain owner
  useEffect(() => {
    if (!publicClient || !NFT_ADDRESS || NFT_ADDRESS === '0x') {
      setLoading(false);
      return;
    }

    async function fetchOwner() {
      try {
        // Check GiftNFT owner
        const nftOwner = await publicClient!.readContract({
          address: NFT_ADDRESS,
          abi: OWNER_ABI,
          functionName: 'owner',
        }) as string;
        setContractOwner(nftOwner.toLowerCase());
      } catch (err) {
        console.warn('[AdminAccess] Could not fetch contract owner:', err);
        setError('Could not verify contract owner');
      } finally {
        setLoading(false);
      }
    }

    fetchOwner();
  }, [publicClient]);

  /** Get the role of the currently connected wallet */
  const currentRole = useCallback((): AdminRole | null => {
    if (!address) return null;
    const addr = address.toLowerCase();

    // Contract owner is always super_admin
    if (contractOwner && addr === contractOwner) return 'super_admin';

    // Check explicit admin list
    const entry = adminList.find(a => a.wallet.toLowerCase() === addr);
    return entry?.role || null;
  }, [address, contractOwner, adminList]);

  /** Check if current wallet has admin access (any level) */
  const isAdmin = useCallback((): boolean => {
    return currentRole() !== null;
  }, [currentRole]);

  /** Check if current wallet is super admin */
  const isSuperAdmin = useCallback((): boolean => {
    return currentRole() === 'super_admin';
  }, [currentRole]);

  /** Check if current wallet can perform a specific action */
  const canPerform = useCallback((action: 'view_dashboard' | 'manage_fraud' | 'manage_admins' | 'withdraw_fees'): boolean => {
    const role = currentRole();
    if (!role) return false;

    switch (action) {
      case 'view_dashboard':
        return ['super_admin', 'admin', 'moderator'].includes(role);
      case 'manage_fraud':
        return ['super_admin', 'admin', 'moderator'].includes(role);
      case 'manage_admins':
        return role === 'super_admin';
      case 'withdraw_fees':
        return role === 'super_admin';
      default:
        return false;
    }
  }, [currentRole]);

  /** Add a new admin wallet (only super_admin can do this) */
  const addAdmin = useCallback((wallet: string, role: AdminRole, label?: string): boolean => {
    if (!isSuperAdmin()) return false;
    if (!address) return false;

    const normalized = wallet.toLowerCase();

    // Don't add duplicates
    const existing = adminList.find(a => a.wallet.toLowerCase() === normalized);
    if (existing) return false;

    const newEntry: AdminEntry = {
      wallet: normalized,
      role,
      addedBy: address.toLowerCase(),
      addedAt: new Date().toISOString(),
      label,
    };

    const updated = [...adminList, newEntry];
    setAdminList(updated);
    saveAdminList(updated);
    return true;
  }, [isSuperAdmin, address, adminList]);

  /** Remove an admin wallet */
  const removeAdmin = useCallback((wallet: string): boolean => {
    if (!isSuperAdmin()) return false;

    const normalized = wallet.toLowerCase();
    // Can't remove contract owner
    if (normalized === contractOwner) return false;

    const updated = adminList.filter(a => a.wallet.toLowerCase() !== normalized);
    setAdminList(updated);
    saveAdminList(updated);
    return true;
  }, [isSuperAdmin, contractOwner, adminList]);

  /** Update an admin's role */
  const updateRole = useCallback((wallet: string, newRole: AdminRole): boolean => {
    if (!isSuperAdmin()) return false;

    const normalized = wallet.toLowerCase();
    const updated = adminList.map(a =>
      a.wallet.toLowerCase() === normalized ? { ...a, role: newRole } : a
    );
    setAdminList(updated);
    saveAdminList(updated);
    return true;
  }, [isSuperAdmin, adminList]);

  /** Get the full list of all admins (including contract owner) */
  const getAllAdmins = useCallback((): AdminEntry[] => {
    const all: AdminEntry[] = [];

    // Add contract owner
    if (contractOwner) {
      all.push({
        wallet: contractOwner,
        role: 'super_admin',
        addedBy: 'contract',
        addedAt: 'deployment',
        label: 'Contract Owner (On-Chain)',
      });
    }

    // Add explicit admins
    all.push(...adminList.filter(a => a.wallet.toLowerCase() !== contractOwner));

    return all;
  }, [contractOwner, adminList]);

  return {
    isAdmin,
    isSuperAdmin,
    currentRole,
    canPerform,
    addAdmin,
    removeAdmin,
    updateRole,
    getAllAdmins,
    contractOwner,
    loading,
    error,
  };
}
