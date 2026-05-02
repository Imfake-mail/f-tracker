import { useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { format, parseISO } from 'date-fns';
import { Edit2, Trash2, TrendingDown, TrendingUp, X, Check } from 'lucide-react';

export function Transactions() {
  const { transactions, categories, categoryGroups, deleteTransaction, editTransaction } = useFinanceStore();
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const handleDelete = async (id) => {
    if (window.confirm("Delete this transaction?")) {
      await deleteTransaction(id);
    }
  };

  const handleEditClick = (t) => {
    setEditingId(t.id);
    setEditFormData({
      amount: t.amount,
      category_id: t.category_id || '',
      date: t.date,
      note: t.note || '',
      type: t.type
    });
  };

  const handleCancelEdit = () => setEditingId(null);

  const handleSaveEdit = async () => {
    if (!editFormData.amount || Number(editFormData.amount) <= 0) return;
    if (editFormData.type === 'expense' && !editFormData.category_id) return;

    setIsSaving(true);
    await editTransaction(editingId, {
      amount: Number(editFormData.amount),
      category_id: editFormData.type === 'income' ? null : editFormData.category_id,
      date: editFormData.date,
      note: editFormData.note,
      type: editFormData.type
    });
    setIsSaving(false);
    setEditingId(null);
  };

  const getCategoryAndGroup = (categoryId) => {
    if (!categoryId) return { cat: null, group: null };
    const cat = categories.find(c => c.id === categoryId);
    const group = cat ? categoryGroups.find(g => g.id === cat.group_id) : null;
    return { cat, group };
  };

  const groupedCategories = categoryGroups.map(group => ({
    ...group,
    categories: categories.filter(c => c.group_id === group.id)
  }));

  return (
    <div className="page-container">
      <h2 style={{ marginBottom: 16 }}>History</h2>

      {transactions.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 16px' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No transactions yet.</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 4 }}>Add an expense or income to get started.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: '4px 16px' }}>
          {transactions.map((t) => {
            const { cat, group } = getCategoryAndGroup(t.category_id);
            const isIncome = t.type === 'income';

            if (editingId === t.id) {
              return (
                <div key={t.id} style={{ padding: '14px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <select value={editFormData.type} onChange={(e) => setEditFormData({...editFormData, type: e.target.value})} style={{ flex: 1 }}>
                        <option value="expense">Expense</option>
                        <option value="income">Income</option>
                      </select>
                      <input type="date" value={editFormData.date} onChange={(e) => setEditFormData({...editFormData, date: e.target.value})} style={{ flex: 1 }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', padding: '8px 12px' }}>
                      <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>₹</span>
                      <input type="number" step="0.01" inputMode="decimal" value={editFormData.amount} onChange={(e) => setEditFormData({...editFormData, amount: e.target.value})} placeholder="0" style={{ border: 'none', background: 'transparent', padding: 0, fontSize: '1rem', fontWeight: 600 }} />
                    </div>
                    {editFormData.type === 'expense' && (
                      <select value={editFormData.category_id} onChange={(e) => setEditFormData({...editFormData, category_id: e.target.value})}>
                        <option value="" disabled>Select Category</option>
                        {groupedCategories.map(g => (
                          <optgroup key={g.id} label={g.name}>
                            {g.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </optgroup>
                        ))}
                      </select>
                    )}
                    <input type="text" value={editFormData.note} onChange={(e) => setEditFormData({...editFormData, note: e.target.value})} placeholder="Note (optional)" />
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button onClick={handleCancelEdit} className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontFamily: 'inherit', fontSize: '0.8125rem' }}>
                        <X size={14} /> Cancel
                      </button>
                      <button onClick={handleSaveEdit} disabled={isSaving} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', padding: '8px 16px', borderRadius: 'var(--radius-sm)', fontWeight: 600, fontFamily: 'inherit', fontSize: '0.8125rem' }}>
                        <Check size={14} /> {isSaving ? '...' : 'Save'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div className="tx-row" key={t.id}>
                <div className="tx-icon" style={{ background: isIncome ? 'var(--success-dim)' : 'var(--danger-dim)' }}>
                  {isIncome ? <TrendingUp size={16} color="var(--success)" /> : <TrendingDown size={16} color="var(--danger)" />}
                </div>
                <div className="tx-details">
                  <div className="tx-name">{isIncome ? (t.note || 'Income') : (cat?.name || 'Expense')}</div>
                  <div className="tx-meta">{format(parseISO(t.date), 'dd MMM yyyy')}{group ? ` · ${group.name}` : ''}{t.note && !isIncome ? ` · ${t.note}` : ''}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="tx-amount" style={{ color: isIncome ? 'var(--success)' : 'var(--text-primary)' }}>
                    {isIncome ? '+' : '-'}₹{Number(t.amount).toFixed(0)}
                  </span>
                  <button onClick={() => handleEditClick(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => handleDelete(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
