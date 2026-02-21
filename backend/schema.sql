-- GiftChain Database Schema (Supabase / PostgreSQL)
-- Run this in your Supabase SQL editor to create all tables

CREATE TABLE IF NOT EXISTS users (
  wallet VARCHAR(42) PRIMARY KEY,
  display_name VARCHAR(100) DEFAULT 'GiftChain User',
  avatar VARCHAR(10) DEFAULT '🎁',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet VARCHAR(42) REFERENCES users(wallet),
  category VARCHAR(50) NOT NULL,
  UNIQUE(wallet, category)
);

CREATE TABLE IF NOT EXISTS browsing_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet VARCHAR(42) REFERENCES users(wallet),
  action VARCHAR(50) NOT NULL, -- 'view', 'click', 'search', 'hover', 'wishlist'
  gift_id VARCHAR(100),
  search_query TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet VARCHAR(42) REFERENCES users(wallet),
  type VARCHAR(20) NOT NULL, -- 'mint', 'purchase', 'redeem', 'transfer'
  tx_hash VARCHAR(66) NOT NULL,
  token_id INTEGER NOT NULL,
  amount_wei NUMERIC,
  gas_fee_wei NUMERIC,
  counterparty VARCHAR(42),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS receipts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_wallet VARCHAR(42) REFERENCES users(wallet),
  type VARCHAR(20) NOT NULL,
  tx_hash VARCHAR(66) NOT NULL,
  token_id INTEGER NOT NULL,
  gift_title VARCHAR(200),
  amount VARCHAR(50),
  fee VARCHAR(50),
  counterparty VARCHAR(42),
  ipfs_cid VARCHAR(100),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'confirmed',
  metadata JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS ai_recommendations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet VARCHAR(42) REFERENCES users(wallet),
  gift_id VARCHAR(100) NOT NULL,
  score FLOAT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_clusters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cluster_id INTEGER NOT NULL,
  cluster_name VARCHAR(100),
  wallet VARCHAR(42) REFERENCES users(wallet),
  assigned_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fraud_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  severity VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high', 'critical'
  type VARCHAR(100) NOT NULL,
  description TEXT,
  wallet VARCHAR(42),
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'reviewed', 'dismissed'
  recommended_action TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS platform_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_name VARCHAR(100) NOT NULL,
  metric_value NUMERIC NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_browsing_wallet ON browsing_history(wallet);
CREATE INDEX IF NOT EXISTS idx_receipts_wallet ON receipts(user_wallet);
CREATE INDEX IF NOT EXISTS idx_fraud_status ON fraud_alerts(status);
CREATE INDEX IF NOT EXISTS idx_recommendations_wallet ON ai_recommendations(wallet);
