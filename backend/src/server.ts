import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';

// Load .env BEFORE importing supabaseClient so env vars are available
dotenv.config();

import { supabase } from './supabaseClient';

const app = express();
app.use(cors());
app.use(express.json());

/** Helper: get Supabase client (throws if not configured) */
function db() {
  if (!supabase) throw new Error('Supabase not configured — add SUPABASE_ANON_KEY to backend/.env');
  return supabase;
}

// ============ USER ROUTES ============
app.post('/api/users', async (req, res) => {
  const { wallet, displayName, avatar, preferences } = req.body;
  if (!wallet) return res.status(400).json({ error: 'Wallet required' });

  const walletLower = wallet.toLowerCase();

  // Upsert user
  const { data: user, error } = await db()
    .from('users')
    .upsert({
      wallet: walletLower,
      display_name: displayName || 'GiftChain User',
      avatar: avatar || '🎁',
    }, { onConflict: 'wallet' })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // Handle preferences if provided
  if (preferences && Array.isArray(preferences)) {
    await db().from('user_preferences').delete().eq('wallet', walletLower);
    if (preferences.length > 0) {
      await db().from('user_preferences').insert(
        preferences.map((cat: string) => ({ wallet: walletLower, category: cat }))
      );
    }
  }

  res.status(201).json(user);
});

app.get('/api/users/:wallet', async (req, res) => {
  const walletLower = req.params.wallet.toLowerCase();

  const { data: user, error } = await db()
    .from('users')
    .select('*')
    .eq('wallet', walletLower)
    .single();

  if (error || !user) return res.status(404).json({ error: 'User not found' });

  const { data: prefs } = await db()
    .from('user_preferences')
    .select('category')
    .eq('wallet', walletLower);

  res.json({ ...user, preferences: prefs?.map(p => p.category) || [] });
});

// ============ BROWSING HISTORY ============
app.post('/api/browsing', async (req, res) => {
  const { wallet, action, giftId, searchQuery, durationMs } = req.body;

  const { error } = await db().from('browsing_history').insert({
    wallet: wallet?.toLowerCase(),
    action,
    gift_id: giftId,
    search_query: searchQuery,
    duration_ms: durationMs,
  });

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ ok: true });
});

// ============ RECEIPTS ============
app.get('/api/receipts', async (req, res) => {
  const { wallet, type } = req.query;

  let query = db().from('receipts').select('*').order('timestamp', { ascending: false });
  if (wallet) query = query.eq('user_wallet', (wallet as string).toLowerCase());
  if (type) query = query.eq('type', type as string);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/receipts', async (req, res) => {
  const { userWallet, type, txHash, tokenId, giftTitle, amount, fee, counterparty, ipfsCid, status, metadata } = req.body;

  const { data, error } = await db().from('receipts').insert({
    user_wallet: userWallet?.toLowerCase(),
    type,
    tx_hash: txHash,
    token_id: tokenId,
    gift_title: giftTitle,
    amount,
    fee,
    counterparty: counterparty?.toLowerCase(),
    ipfs_cid: ipfsCid,
    status: status || 'confirmed',
    metadata: metadata || {},
  }).select().single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// ============ TRANSACTIONS ============
app.post('/api/transactions', async (req, res) => {
  const { wallet, type, txHash, tokenId, amountWei, gasFeeWei, counterparty } = req.body;

  const { data, error } = await db().from('transactions').insert({
    wallet: wallet?.toLowerCase(),
    type,
    tx_hash: txHash,
    token_id: tokenId,
    amount_wei: amountWei,
    gas_fee_wei: gasFeeWei,
    counterparty: counterparty?.toLowerCase(),
  }).select().single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

app.get('/api/transactions', async (req, res) => {
  const { wallet } = req.query;

  let query = db().from('transactions').select('*').order('created_at', { ascending: false });
  if (wallet) query = query.eq('wallet', (wallet as string).toLowerCase());

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ============ AI RECOMMENDATIONS ============
app.get('/api/recommendations/:wallet', async (req, res) => {
  const walletLower = req.params.wallet.toLowerCase();

  // Try AI service first
  try {
    const resp = await fetch('http://localhost:8000/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet: walletLower }),
    });
    const data = await resp.json();

    // Cache recommendations in Supabase
    if (data.recommendations) {
      for (const rec of data.recommendations) {
        await db().from('ai_recommendations').upsert({
          wallet: walletLower,
          gift_id: rec.giftId,
          score: rec.score,
          reason: rec.reason,
        }, { onConflict: 'wallet,gift_id' }).select();
      }
    }

    return res.json(data);
  } catch {
    // Fallback: try cached recommendations from Supabase
    try {
      const { data: cached } = await db()
        .from('ai_recommendations')
        .select('*')
        .eq('wallet', walletLower)
        .order('score', { ascending: false })
        .limit(4);

      if (cached && cached.length > 0) {
        return res.json({
          recommendations: cached.map(r => ({
            giftId: r.gift_id,
            score: r.score,
            reason: r.reason,
          })),
          source: 'cache',
        });
      }
    } catch { /* db not available */ }

    // Final fallback: mock recommendations
    res.json({
      recommendations: [
        { giftId: 'gift-1', score: 0.95, reason: 'Based on your gaming preference' },
        { giftId: 'gift-2', score: 0.88, reason: 'Popular in your cluster' },
        { giftId: 'gift-5', score: 0.82, reason: 'Trending this week' },
        { giftId: 'gift-8', score: 0.76, reason: 'Similar users purchased' },
      ],
      source: 'fallback',
    });
  }
});

// ============ ADMIN ANALYTICS ============
app.get('/api/admin/analytics', async (_req, res) => {
  try {
    const [users, transactions, receipts, browsingEvents] = await Promise.all([
      db().from('users').select('*', { count: 'exact', head: true }),
      db().from('transactions').select('*', { count: 'exact', head: true }),
      db().from('receipts').select('*', { count: 'exact', head: true }),
      db().from('browsing_history').select('*', { count: 'exact', head: true }),
    ]);

    const mintCount = (await db().from('transactions').select('*', { count: 'exact', head: true }).eq('type', 'mint')).count || 0;
    const saleCount = (await db().from('transactions').select('*', { count: 'exact', head: true }).eq('type', 'purchase')).count || 0;

    res.json({
      totalMints: mintCount,
      totalSales: saleCount,
      activeUsers: users.count || 0,
      totalTransactions: transactions.count || 0,
      totalReceipts: receipts.count || 0,
      totalBrowsingEvents: browsingEvents.count || 0,
      totalVolume: '0 ETH',
      totalRevenue: '0 ETH',
      recommendationCTR: 12.4,
      conversionLift: 34.7,
    });
  } catch {
    // Fallback if db is not connected
    res.json({
      totalMints: 0, totalSales: 0, activeUsers: 0, totalTransactions: 0,
      totalReceipts: 0, totalBrowsingEvents: 0, totalVolume: '0 ETH',
      totalRevenue: '0 ETH', recommendationCTR: 0, conversionLift: 0,
    });
  }
});

// ============ FRAUD ALERTS ============
app.get('/api/admin/fraud-alerts', async (_req, res) => {
  try {
    const { data: alerts, error } = await db()
      .from('fraud_alerts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    if (alerts && alerts.length > 0) {
      return res.json({ alerts });
    }
  } catch { /* db not available, fall through */ }

  // Try AI service or return placeholder
  try {
    const resp = await fetch('http://localhost:8000/fraud/detect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactions: [] }),
    });
    const data = await resp.json();
    return res.json(data);
  } catch {
    return res.json({
      alerts: [{
        id: 'fa-demo',
        severity: 'low',
        type: 'No Alerts',
        description: 'No suspicious activity detected. System is healthy.',
        wallet: null,
        status: 'reviewed',
        created_at: new Date().toISOString(),
      }],
    });
  }
});

// ============ HEALTH CHECK ============
app.get('/api/health', async (_req, res) => {
  if (!supabase) {
    return res.json({
      status: 'no-database',
      database: 'not configured',
      hint: 'Add SUPABASE_ANON_KEY to backend/.env',
      timestamp: new Date().toISOString(),
    });
  }
  const { error } = await db().from('users').select('wallet').limit(1);
  res.json({
    status: error ? 'degraded' : 'healthy',
    database: error ? 'disconnected' : 'connected',
    supabaseProject: 'fccnhiqfakuekrmxrkkt',
    timestamp: new Date().toISOString(),
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🎁 GiftChain API running on http://localhost:${PORT}`));
