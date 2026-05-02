import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export const useFinanceStore = create((set, get) => ({
  user: null,
  loading: true,
  transactions: [],
  categories: [],
  categoryGroups: [],
  userSettings: null,

  setUser: (user) => set({ user }),
  
  initialize: async () => {
    set({ loading: true });
    
    // Check active session
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      set({ user: session.user });
      await get().fetchData();
    }
    
    // Listen for auth changes
    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        set({ user: session.user });
        await get().fetchData();
      } else {
        set({ user: null, transactions: [], categories: [], categoryGroups: [], userSettings: null });
      }
    });

    set({ loading: false });
  },

  fetchData: async () => {
    const { user } = get();
    if (!user) return;

    try {
      const [groupsRes, categoriesRes, transactionsRes, settingsRes] = await Promise.all([
        supabase.from('category_groups').select('*').order('created_at', { ascending: true }),
        supabase.from('categories').select('*').order('name', { ascending: true }),
        supabase.from('transactions').select('*').order('date', { ascending: false }),
        supabase.from('user_settings').select('*').eq('user_id', user.id).single()
      ]);

      set({
        categoryGroups: groupsRes.data || [],
        categories: categoriesRes.data || [],
        transactions: transactionsRes.data || [],
        userSettings: settingsRes.data || null,
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  },

  addTransaction: async (transaction) => {
    const { user, transactions } = get();
    if (!user) return;

    const { data, error } = await supabase
      .from('transactions')
      .insert([{ ...transaction, user_id: user.id }])
      .select()
      .single();

    if (!error && data) {
      set({ transactions: [data, ...transactions] });
    }
  },

  deleteTransaction: async (id) => {
    const { transactions } = get();
    
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    
    if (!error) {
      set({ transactions: transactions.filter(t => t.id !== id) });
    }
  },
  
  addCategory: async (category) => {
    const { user, categories } = get();
    if (!user) return;

    const { data, error } = await supabase
      .from('categories')
      .insert([{ ...category, user_id: user.id }])
      .select()
      .single();

    if (!error && data) {
      set({ categories: [...categories, data] });
    }
  },
  editTransaction: async (id, updates) => {
    const { transactions } = get();
    
    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
      
    if (!error && data) {
      set({ 
        transactions: transactions.map(t => t.id === id ? data : t)
          .sort((a, b) => new Date(b.date) - new Date(a.date))
      });
    }
  },

  updateUserSettings: async (settingsData) => {
    const { user, userSettings } = get();
    if (!user) return;

    let error, data;

    if (userSettings) {
      // Update existing
      const res = await supabase
        .from('user_settings')
        .update({ ...settingsData, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .select()
        .single();
      error = res.error;
      data = res.data;
    } else {
      // Insert new
      const res = await supabase
        .from('user_settings')
        .insert([{ ...settingsData, user_id: user.id }])
        .select()
        .single();
      error = res.error;
      data = res.data;
    }

    if (!error && data) {
      set({ userSettings: data });
    }
  },

  wipeUserData: async () => {
    const { user } = get();
    if (!user) return false;

    try {
      await Promise.all([
        supabase.from('transactions').delete().eq('user_id', user.id),
        supabase.from('categories').delete().eq('user_id', user.id),
        supabase.from('category_groups').delete().eq('user_id', user.id),
        supabase.from('user_settings').delete().eq('user_id', user.id),
      ]);
      set({ transactions: [], categories: [], categoryGroups: [], userSettings: null });
      return true;
    } catch (error) {
      console.error('Error wiping data:', error);
      return false;
    }
  },

  importBackup: async (backupData) => {
    const { user } = get();
    if (!user) return false;
    
    try {
      const wiped = await get().wipeUserData();
      if (!wiped) throw new Error("Could not wipe existing data for restore");

      const sanitize = (items) => items ? items.map(item => ({ ...item, user_id: user.id })) : [];
      
      const newSettings = backupData.userSettings ? { ...backupData.userSettings, user_id: user.id } : null;
      const newGroups = sanitize(backupData.categoryGroups);
      const newCategories = sanitize(backupData.categories);
      const newTransactions = sanitize(backupData.transactions);

      if (newSettings) await supabase.from('user_settings').insert([newSettings]);
      if (newGroups.length) await supabase.from('category_groups').insert(newGroups);
      if (newCategories.length) await supabase.from('categories').insert(newCategories);
      if (newTransactions.length) await supabase.from('transactions').insert(newTransactions);

      await get().fetchData();
      return true;
    } catch (error) {
      console.error('Error importing backup:', error);
      return false;
    }
  },
}));
