import { useState, useMemo } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from 'recharts';
import { startOfMonth, endOfMonth, isWithinInterval, parseISO, format } from 'date-fns';

const COLORS = ['#8b5cf6', '#34d399', '#fbbf24', '#f87171', '#818cf8', '#2dd4bf', '#f472b6'];

export function Analytics() {
  const { transactions, categories, categoryGroups } = useFinanceStore();
  const [dateRange, setDateRange] = useState('month');
  const [selectedGroupId, setSelectedGroupId] = useState('all');

  const filteredData = useMemo(() => {
    let txs = transactions.filter(t => t.type === 'expense');

    if (dateRange === 'month') {
      const start = startOfMonth(new Date());
      const end = endOfMonth(new Date());
      txs = txs.filter(t => isWithinInterval(parseISO(t.date), { start, end }));
    } else if (dateRange === 'year') {
      const now = new Date();
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31);
      txs = txs.filter(t => isWithinInterval(parseISO(t.date), { start, end }));
    }

    if (selectedGroupId !== 'all') {
      const groupCats = categories.filter(c => c.group_id === selectedGroupId).map(c => c.id);
      txs = txs.filter(t => groupCats.includes(t.category_id));
    }

    const categoryTotals = {};
    txs.forEach(t => {
      const cat = categories.find(c => c.id === t.category_id);
      const catName = cat ? cat.name : 'Uncategorized';
      categoryTotals[catName] = (categoryTotals[catName] || 0) + Number(t.amount);
    });

    const chartData = Object.entries(categoryTotals)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);

    const dailyDataObj = {};
    txs.forEach(t => {
      const day = format(parseISO(t.date), dateRange === 'year' ? 'MMM' : 'dd MMM');
      dailyDataObj[day] = (dailyDataObj[day] || 0) + Number(t.amount);
    });

    const trendData = Object.entries(dailyDataObj)
      .map(([date, amount]) => ({ date, amount }))
      .reverse();

    const totalSpent = txs.reduce((s, t) => s + Number(t.amount), 0);
    return { chartData, trendData, totalSpent };
  }, [transactions, categories, dateRange, selectedGroupId]);

  return (
    <div className="page-container">
      <h2 style={{ marginBottom: 16 }}>Insights</h2>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {['month', 'year', 'all'].map(r => (
          <button key={r} className={`chip ${dateRange === r ? 'active' : ''}`} onClick={() => setDateRange(r)}>
            {r === 'month' ? 'Month' : r === 'year' ? 'Year' : 'All'}
          </button>
        ))}
        <select
          value={selectedGroupId}
          onChange={e => setSelectedGroupId(e.target.value)}
          style={{ width: 'auto', padding: '8px 12px', fontSize: '0.8125rem', borderRadius: 'var(--radius-full)' }}
        >
          <option value="all">All Groups</option>
          {categoryGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>

      {/* Total */}
      <div className="card">
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 2px' }}>Total Spent</p>
        <p style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--accent)', margin: 0, letterSpacing: '-0.02em' }}>₹{filteredData.totalSpent.toFixed(0)}</p>
      </div>

      {/* Trend */}
      {filteredData.trendData.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Spending Trend</h3>
          <div style={{ height: 140 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filteredData.trendData}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Tooltip
                  formatter={(value) => `₹${Number(value).toFixed(0)}`}
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: '0.8125rem' }}
                  labelStyle={{ color: 'var(--text-muted)' }}
                  itemStyle={{ color: 'var(--accent)' }}
                />
                <Area type="monotone" dataKey="amount" stroke="var(--accent)" strokeWidth={2} fillOpacity={1} fill="url(#areaGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Category Breakdown */}
      {filteredData.chartData.length > 0 ? (
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>By Category</h3>
          <div style={{ height: Math.max(150, filteredData.chartData.length * 40) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filteredData.chartData} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} width={80} />
                <Tooltip
                  formatter={(value) => `₹${Number(value).toFixed(0)}`}
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: '0.8125rem' }}
                />
                <Bar dataKey="amount" radius={[0, 4, 4, 0]} barSize={16}>
                  {filteredData.chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '32px 16px' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No data for selected filters.</p>
        </div>
      )}
    </div>
  );
}
