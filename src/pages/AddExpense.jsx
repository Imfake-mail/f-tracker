import { useState, useEffect, useRef, useMemo } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Plus, X, ChevronLeft } from 'lucide-react';

export function AddExpense() {
  const navigate = useNavigate();
  const { categories, transactions, addTransaction, categoryGroups, addCategory } = useFinanceStore();

  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatGroupId, setNewCatGroupId] = useState('');
  const [newCatIsFood, setNewCatIsFood] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const amountRef = useRef(null);

  // Top 5 frequent categories
  const frequentCategories = useMemo(() => {
    const counts = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
      if (t.category_id) counts[t.category_id] = (counts[t.category_id] || 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted.slice(0, 5).map(([id]) => categories.find(c => c.id === id)).filter(Boolean);
  }, [transactions, categories]);

  // All categories for fallback
  const allCategories = useMemo(() => {
    return categories.map(c => {
      const group = categoryGroups.find(g => g.id === c.group_id);
      return { ...c, groupName: group?.name || '' };
    });
  }, [categories, categoryGroups]);

  useEffect(() => {
    if (amountRef.current) amountRef.current.focus();
    if (categories.length > 0 && !categoryId) {
      // Default to last used category or first food category
      const lastExpense = transactions.find(t => t.type === 'expense' && t.category_id);
      if (lastExpense) {
        setCategoryId(lastExpense.category_id);
      } else {
        const foodCat = categories.find(c => c.is_food_category);
        setCategoryId(foodCat ? foodCat.id : categories[0].id);
      }
    }
  }, [categories, categoryId, transactions]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || isNaN(amount) || Number(amount) <= 0 || !categoryId) return;

    setIsSubmitting(true);
    await addTransaction({
      amount: Number(amount),
      type: 'expense',
      category_id: categoryId,
      date,
      note,
      is_recurring: false
    });
    setIsSubmitting(false);
    navigate(-1);
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCatName || !newCatGroupId) return;
    setIsAddingCategory(true);
    await addCategory({
      name: newCatName,
      group_id: newCatGroupId,
      is_food_category: newCatIsFood,
      is_default: false
    });
    setIsAddingCategory(false);
    setShowNewCategory(false);
    setNewCatName('');
    setNewCatIsFood(false);
  };

  const groupedCategories = categoryGroups.map(group => ({
    ...group,
    categories: categories.filter(c => c.group_id === group.id)
  }));

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
          <ChevronLeft size={24} />
        </button>
        <h2 style={{ margin: 0, flex: 1 }}>Add Expense</h2>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Amount */}
        <div className="card" style={{ padding: '12px 16px' }}>
          <div className="amount-input-container">
            <span>₹</span>
            <input
              ref={amountRef}
              type="number"
              inputMode="decimal"
              step="0.01"
              className="amount-input"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              required
            />
          </div>
        </div>

        {/* Category Selection */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <label className="input-label" style={{ margin: 0 }}>Category</label>
            <button
              type="button"
              onClick={() => setShowNewCategory(!showNewCategory)}
              style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit' }}
            >
              {showNewCategory ? <X size={14} /> : <Plus size={14} />}
              {showNewCategory ? 'Cancel' : 'New'}
            </button>
          </div>

          {showNewCategory ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input type="text" placeholder="Category Name" value={newCatName} onChange={e => setNewCatName(e.target.value)} />
              <select value={newCatGroupId} onChange={e => setNewCatGroupId(e.target.value)}>
                <option value="" disabled>Select Group</option>
                {categoryGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                <input type="checkbox" checked={newCatIsFood} onChange={e => setNewCatIsFood(e.target.checked)} />
                Food category
              </label>
              <button type="button" className="btn btn-primary" onClick={handleCreateCategory} disabled={isAddingCategory || !newCatName || !newCatGroupId}>
                {isAddingCategory ? 'Adding...' : 'Save Category'}
              </button>
            </div>
          ) : (
            <>
              {/* Frequent chips */}
              <div className="chip-grid" style={{ marginBottom: frequentCategories.length > 0 ? 10 : 0 }}>
                {(frequentCategories.length > 0 ? frequentCategories : categories.slice(0, 5)).map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    className={`chip ${categoryId === cat.id ? 'active' : ''}`}
                    onClick={() => setCategoryId(cat.id)}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* Full dropdown */}
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
                <option value="" disabled>All categories</option>
                {groupedCategories.map(group => (
                  <optgroup key={group.id} label={group.name}>
                    {group.categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}{cat.is_food_category ? ' 🍔' : ''}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </>
          )}
        </div>

        {/* Date & Note */}
        <div className="card">
          <div className="input-group">
            <label className="input-label">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label">Note (optional)</label>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="What was this for?" />
          </div>
        </div>

        {/* Submit */}
        <button type="submit" className="btn btn-primary" disabled={isSubmitting || !amount || !categoryId} style={{ marginTop: 4 }}>
          {isSubmitting ? 'Saving...' : 'Save Expense'}
        </button>
      </form>
    </div>
  );
}
