-- Initial Production Schema for Finance Tracker PWA
-- Run this script ONCE on a fresh Supabase database.

-- 1. Create Tables

CREATE TABLE public.user_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    monthly_budget NUMERIC(12, 2) DEFAULT 0 NOT NULL,
    base_daily_food_budget NUMERIC(12, 2) DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.category_groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    affects_budget BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    group_id UUID REFERENCES public.category_groups(id) ON DELETE CASCADE NOT NULL,
    is_food_category BOOLEAN DEFAULT false NOT NULL,
    is_default BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    type TEXT CHECK (type IN ('income', 'expense')) NOT NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    note TEXT,
    is_recurring BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable Row Level Security (RLS)

ALTER TABLE public.category_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies

-- Category Groups
CREATE POLICY "Users can view own category groups" ON public.category_groups FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own category groups" ON public.category_groups FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own category groups" ON public.category_groups FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own category groups" ON public.category_groups FOR DELETE USING (auth.uid() = user_id);

-- Categories
CREATE POLICY "Users can view own categories" ON public.categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own categories" ON public.categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own categories" ON public.categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own categories" ON public.categories FOR DELETE USING (auth.uid() = user_id);

-- Transactions
CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own transactions" ON public.transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own transactions" ON public.transactions FOR DELETE USING (auth.uid() = user_id);

-- User Settings
CREATE POLICY "Users can view own settings" ON public.user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON public.user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON public.user_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own settings" ON public.user_settings FOR DELETE USING (auth.uid() = user_id);

-- 4. Create Initializer Trigger for New Users

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    needs_id UUID;
    wants_id UUID;
    savings_id UUID;
BEGIN
    -- Initialize Settings
    INSERT INTO public.user_settings (user_id, monthly_budget, base_daily_food_budget) VALUES (new.id, 0, 0);

    -- Initialize Category Groups
    INSERT INTO public.category_groups (user_id, name, affects_budget) VALUES (new.id, 'Needs', true) RETURNING id INTO needs_id;
    INSERT INTO public.category_groups (user_id, name, affects_budget) VALUES (new.id, 'Wants', true) RETURNING id INTO wants_id;
    INSERT INTO public.category_groups (user_id, name, affects_budget) VALUES (new.id, 'Savings', false) RETURNING id INTO savings_id;

    -- Initialize Categories
    INSERT INTO public.categories (user_id, group_id, name, is_food_category, is_default) VALUES
        (new.id, needs_id, 'Food', true, true),
        (new.id, needs_id, 'Rent', false, true),
        (new.id, needs_id, 'Transport', false, true),
        (new.id, wants_id, 'Shopping', false, true),
        (new.id, savings_id, 'Family', false, true),
        (new.id, savings_id, 'Investments', false, true);

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
