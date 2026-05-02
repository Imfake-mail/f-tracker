import { useMemo } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { startOfMonth, endOfMonth, isWithinInterval, format, parseISO } from 'date-fns';
import { LogOut, TrendingUp, TrendingDown, Utensils, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

export function Dashboard() {
  const { transactions, categoryGroups, categories, userSettings } = useFinanceStore();
  const navigate = useNavigate();

  const currentMonth = useMemo(() => {
    const now = new Date();
    return { start: startOfMonth(now), end: endOfMonth(now) };
  }, [transactions]);

  const stats = useMemo(() => {
    const now = new Date();

    // Overall Balance (All Time)
    const totalIncomeAll = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
    const totalExpensesAll = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
    const balance = totalIncomeAll - totalExpensesAll;

    // Current Month
    const currentMonthTx = transactions.filter(t =>
      isWithinInterval(parseISO(t.date), currentMonth)
    );
    const monthIncome = currentMonthTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
    const monthExpenses = currentMonthTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

    // Monthly Budget (affects_budget only)
    const monthlyBudget = userSettings?.monthly_budget ? Number(userSettings.monthly_budget) : 0;
    let budgetUsed = 0;
    currentMonthTx.filter(t => t.type === 'expense').forEach(t => {
      const cat = categories.find(c => c.id === t.category_id);
      if (cat) {
        const group = categoryGroups.find(g => g.id === cat.group_id);
        if (group && group.affects_budget) budgetUsed += Number(t.amount);
      }
    });

    // Food Budget
    const foodCategoryIds = categories.filter(c => c.is_food_category).map(c => c.id);
    const foodTxMonth = currentMonthTx.filter(t => t.type === 'expense' && foodCategoryIds.includes(t.category_id));
    const totalFoodSpent = foodTxMonth.reduce((s, t) => s + Number(t.amount), 0);

    const baseDailyFood = userSettings?.base_daily_food_budget ? Number(userSettings.base_daily_food_budget) : 0;
    const daysInMonth = endOfMonth(now).getDate();
    const currentDay = now.getDate();
    let remainingDays = daysInMonth - currentDay + 1;
    if (remainingDays <= 0) remainingDays = 1;

    const monthlyFoodBudget = baseDailyFood * daysInMonth;
    const remainingFoodBudget = monthlyFoodBudget - totalFoodSpent;
    const todaysAllowed = remainingFoodBudget / remainingDays;

    const todaysFoodSpent = foodTxMonth
      .filter(t => {
        const d = parseISO(t.date);
        return d.getDate() === currentDay && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((s, t) => s + Number(t.amount), 0);

    // Today's total spending
    const todayTotal = currentMonthTx
      .filter(t => {
        if (t.type !== 'expense') return false;
        const d = parseISO(t.date);
        return d.getDate() === currentDay && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((s, t) => s + Number(t.amount), 0);

    // Recent 5 transactions
    const recent = transactions.slice(0, 5);

    return {
      balance, monthIncome, monthExpenses,
      monthlyBudget, budgetUsed,
      monthlyFoodBudget, remainingFoodBudget, todaysAllowed, todaysFoodSpent,
      todayTotal, recent
    };
  }, [transactions, currentMonth, categories, categoryGroups, userSettings]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const fmt = (n) => {
    const abs = Math.abs(n);
    if (abs >= 100000) return (n / 100000).toFixed(1) + 'L';
    if (abs >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toFixed(0);
  };

  const budgetPct = stats.monthlyBudget > 0
    ? Math.min(100, (stats.budgetUsed / stats.monthlyBudget) * 100)
    : 0;

  const foodOverBudget = stats.todaysFoodSpent > stats.todaysAllowed && stats.todaysAllowed > 0;

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>{format(new Date(), 'EEEE, dd MMM')}</p>
          <h1 style={{ margin: 0 }}>₹{fmt(stats.balance)}</h1>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Total Balance</p>
        </div>
        <button onClick={handleLogout} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: 10, color: 'var(--text-muted)', cursor: 'pointer' }}>
          <LogOut size={18} />
        </button>
      </div>

      {/* Month Summary Row */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
        <div className="card" style={{ flex: 1, marginBottom: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--success-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={16} color="var(--success)" />
          </div>
          <div>
            <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', margin: 0 }}>Income</p>
            <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>₹{fmt(stats.monthIncome)}</p>
          </div>
        </div>
        <div className="card" style={{ flex: 1, marginBottom: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--danger-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingDown size={16} color="var(--danger)" />
          </div>
          <div>
            <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', margin: 0 }}>Expenses</p>
            <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>₹{fmt(stats.monthExpenses)}</p>
          </div>
        </div>
      </div>

      {/* Monthly Budget */}
      {stats.monthlyBudget > 0 && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Monthly Budget</span>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: stats.budgetUsed > stats.monthlyBudget ? 'var(--danger)' : 'var(--success)' }}>
              ₹{fmt(stats.monthlyBudget - stats.budgetUsed)} left
            </span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{
              width: `${budgetPct}%`,
              background: budgetPct > 90 ? 'var(--danger)' : budgetPct > 70 ? 'var(--warning)' : 'var(--accent)'
            }} />
          </div>
          <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: 4 }}>₹{fmt(stats.budgetUsed)} of ₹{fmt(stats.monthlyBudget)} used</p>
        </div>
      )}

      {/* Daily Food Budget */}
      {stats.monthlyFoodBudget > 0 && (
        <div className="card" style={{ borderColor: foodOverBudget ? 'rgba(248,113,113,0.3)' : 'var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Utensils size={16} color="var(--accent)" />
            <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Daily Food Budget</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1, background: 'var(--bg-input)', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
              <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', margin: 0 }}>Today's Limit</p>
              <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent)', margin: '2px 0 0' }}>₹{stats.todaysAllowed.toFixed(0)}</p>
            </div>
            <div style={{ flex: 1, background: 'var(--bg-input)', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>
              <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', margin: 0 }}>Spent Today</p>
              <p style={{ fontSize: '1.25rem', fontWeight: 700, color: foodOverBudget ? 'var(--danger)' : 'var(--success)', margin: '2px 0 0' }}>₹{stats.todaysFoodSpent.toFixed(0)}</p>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, padding: '8px 0 0', borderTop: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Month remaining</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: stats.remainingFoodBudget < 0 ? 'var(--danger)' : 'var(--text-secondary)' }}>
              ₹{stats.remainingFoodBudget.toFixed(0)} / ₹{stats.monthlyFoodBudget.toFixed(0)}
            </span>
          </div>
        </div>
      )}

      {/* Today's Spending */}
      <div className="card">
        <div className="stat-row" style={{ border: 'none', padding: 0 }}>
          <span className="stat-label">Today's Spending</span>
          <span className="stat-value" style={{ color: stats.todayTotal > 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
            ₹{stats.todayTotal.toFixed(0)}
          </span>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="card" style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <h3 style={{ margin: 0, fontSize: '0.875rem' }}>Recent</h3>
          <button onClick={() => navigate('/transactions')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2, fontSize: '0.75rem', fontFamily: 'inherit' }}>
            View all <ChevronRight size={14} />
          </button>
        </div>
        {stats.recent.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>No transactions yet</p>
        ) : (
          stats.recent.map(t => {
            const isIncome = t.type === 'income';
            const cat = categories.find(c => c.id === t.category_id);
            return (
              <div className="tx-row" key={t.id}>
                <div className="tx-icon" style={{ background: isIncome ? 'var(--success-dim)' : 'var(--danger-dim)' }}>
                  {isIncome ? <TrendingUp size={16} color="var(--success)" /> : <TrendingDown size={16} color="var(--danger)" />}
                </div>
                <div className="tx-details">
                  <div className="tx-name">{isIncome ? (t.note || 'Income') : (cat?.name || 'Expense')}</div>
                  <div className="tx-meta">{format(parseISO(t.date), 'dd MMM')}{t.note && !isIncome ? ` · ${t.note}` : ''}</div>
                </div>
                <div className="tx-amount" style={{ color: isIncome ? 'var(--success)' : 'var(--text-primary)' }}>
                  {isIncome ? '+' : '-'}₹{Number(t.amount).toFixed(0)}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
