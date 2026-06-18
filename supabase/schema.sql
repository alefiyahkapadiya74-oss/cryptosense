-- ==========================================
-- 1. USER PROFILES
-- ==========================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  username TEXT UNIQUE,
  avatar_url TEXT,
  full_name TEXT,
  
  CONSTRAINT username_length CHECK (char_length(username) >= 3)
);

-- Automatic Profile Creation Trigger on Auth Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url, full_name)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', SUBSTRING(new.email FROM '([^@]+)')),
    COALESCE(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- RLS for Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

-- ==========================================
-- 2. WATCHLISTS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.watchlists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  coin_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  UNIQUE(user_id, coin_id)
);

-- RLS for Watchlists
ALTER TABLE public.watchlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own watchlist" 
  ON public.watchlists FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can modify own watchlist" 
  ON public.watchlists FOR ALL 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

-- ==========================================
-- 3. PORTFOLIO HOLDINGS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.portfolio_holdings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  coin_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  buy_price_avg NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  UNIQUE(user_id, coin_id)
);

-- RLS for Portfolio Holdings
ALTER TABLE public.portfolio_holdings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own holdings" 
  ON public.portfolio_holdings FOR SELECT 
  USING (auth.uid() = user_id);

-- ==========================================
-- 4. TRANSACTIONS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  coin_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  price NUMERIC NOT NULL CHECK (price >= 0),
  transaction_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  notes TEXT
);

-- RLS for Transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions" 
  ON public.transactions FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" 
  ON public.transactions FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions" 
  ON public.transactions FOR DELETE 
  USING (auth.uid() = user_id);

-- ==========================================
-- 5. TRANSACTION HOLDING AUTOMATION TRIGGER
-- ==========================================
-- Automatically updates portfolio_holdings whenever a transaction is logged
CREATE OR REPLACE FUNCTION public.update_portfolio_from_transaction()
RETURNS TRIGGER AS $$
DECLARE
  current_amount NUMERIC := 0;
  current_avg NUMERIC := 0;
  new_amount NUMERIC := 0;
  new_avg NUMERIC := 0;
BEGIN
  -- Get existing holding
  SELECT amount, buy_price_avg INTO current_amount, current_avg
  FROM public.portfolio_holdings
  WHERE user_id = NEW.user_id AND coin_id = NEW.coin_id;

  IF FOUND IS NOT TRUE THEN
    current_amount := 0;
    current_avg := 0;
  END IF;

  IF NEW.type = 'buy' THEN
    new_amount := current_amount + NEW.amount;
    -- Recalculate average buy price
    IF new_amount > 0 THEN
      new_avg := ((current_amount * current_avg) + (NEW.amount * NEW.price)) / new_amount;
    ELSE
      new_avg := 0;
    END IF;
    
    INSERT INTO public.portfolio_holdings (user_id, coin_id, symbol, name, amount, buy_price_avg, updated_at)
    VALUES (NEW.user_id, NEW.coin_id, NEW.symbol, NEW.name, new_amount, new_avg, now())
    ON CONFLICT (user_id, coin_id) 
    DO UPDATE SET 
      amount = new_amount,
      buy_price_avg = new_avg,
      updated_at = now();
      
  ELSIF NEW.type = 'sell' THEN
    IF current_amount < NEW.amount THEN
      RAISE EXCEPTION 'Insufficient holdings to execute this sell transaction.';
    END IF;
    
    new_amount := current_amount - NEW.amount;
    
    IF new_amount = 0 THEN
      DELETE FROM public.portfolio_holdings
      WHERE user_id = NEW.user_id AND coin_id = NEW.coin_id;
    ELSE
      UPDATE public.portfolio_holdings
      SET 
        amount = new_amount,
        updated_at = now()
      WHERE user_id = NEW.user_id AND coin_id = NEW.coin_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_transaction_inserted
  AFTER INSERT ON public.transactions
  FOR EACH ROW EXECUTE PROCEDURE public.update_portfolio_from_transaction();
