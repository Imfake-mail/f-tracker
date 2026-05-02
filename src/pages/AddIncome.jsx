import { useState, useRef, useEffect } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ChevronLeft } from 'lucide-react';

export function AddIncome() {
  const navigate = useNavigate();
  const { addTransaction } = useFinanceStore();
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const amountRef = useRef(null);

  useEffect(() => {
    if (amountRef.current) amountRef.current.focus();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || isNaN(amount) || Number(amount) <= 0) return;

    setIsSubmitting(true);
    await addTransaction({
      amount: Number(amount),
      type: 'income',
      category_id: null,
      date,
      note: note || 'Income',
      is_recurring: false
    });
    setIsSubmitting(false);
    navigate('/');
  };

  return (
    <div className="page-container">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
          <ChevronLeft size={24} />
        </button>
        <h2 style={{ margin: 0 }}>Add Income</h2>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ padding: '12px 16px' }}>
          <div className="amount-input-container">
            <span style={{ color: 'var(--success)' }}>₹</span>
            <input
              ref={amountRef}
              type="number"
              inputMode="decimal"
              step="0.01"
              className="amount-input"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              style={{ color: 'var(--success)' }}
              required
            />
          </div>
        </div>

        <div className="card">
          <div className="input-group">
            <label className="input-label">Date Received</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label">Note (optional)</label>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Salary, Freelance" />
          </div>
        </div>

        <button type="submit" className="btn" disabled={isSubmitting || !amount} style={{ marginTop: 4, background: 'var(--success)', color: '#000', fontWeight: 600 }}>
          {isSubmitting ? 'Saving...' : 'Save Income'}
        </button>
      </form>
    </div>
  );
}
