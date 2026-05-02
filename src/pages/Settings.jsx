import { useState, useRef, useEffect } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { Download, Upload, Trash2, Tag, Plus, AlertTriangle, LogOut } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function Settings() {
  const navigate = useNavigate();
  const { transactions, categories, categoryGroups, userSettings, updateUserSettings, wipeUserData, importBackup } = useFinanceStore();

  const [monthlyBudget, setMonthlyBudget] = useState('');
  const [dailyFoodBudget, setDailyFoodBudget] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [wipeConfirmText, setWipeConfirmText] = useState('');
  const [showWipeConfirm, setShowWipeConfirm] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (userSettings) {
      setMonthlyBudget(userSettings.monthly_budget || '');
      setDailyFoodBudget(userSettings.base_daily_food_budget || '');
    }
  }, [userSettings]);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    await updateUserSettings({
      monthly_budget: Number(monthlyBudget),
      base_daily_food_budget: Number(dailyFoodBudget)
    });
    setIsSaving(false);
    alert('Settings saved!');
  };

  const handleExportCSV = () => {
    if (transactions.length === 0) { alert("No data to export"); return; }
    const headers = ['Date', 'Amount', 'Category', 'Group', 'Note', 'Type'];
    const rows = transactions.map(t => {
      const cat = categories.find(c => c.id === t.category_id);
      const group = cat ? categoryGroups.find(g => g.id === cat.group_id) : null;
      return [
        format(parseISO(t.date), 'yyyy-MM-dd'),
        t.amount,
        cat ? `"${cat.name}"` : '',
        group ? `"${group.name}"` : '',
        t.note ? `"${t.note.replace(/"/g, '""')}"` : '',
        t.type === 'income' ? 'Income' : 'Expense'
      ].join(',');
    });
    const blob = new Blob([headers.join(',') + '\n' + rows.join('\n')], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `finance_export_${format(new Date(), 'yyyyMMdd')}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify({ transactions, categories, categoryGroups, userSettings }, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `finance_backup_${format(new Date(), 'yyyyMMdd')}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleImportJSON = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        setIsImporting(true);
        const data = JSON.parse(event.target.result);
        if (!data.transactions || !data.categoryGroups || !data.categories) throw new Error('Invalid backup format');
        const success = await importBackup(data);
        alert(success ? 'Backup restored!' : 'Failed to restore backup.');
      } catch {
        alert('Error parsing backup file.');
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleWipeData = async () => {
    if (wipeConfirmText !== 'DELETE') { alert('Type DELETE to confirm.'); return; }
    const success = await wipeUserData();
    alert(success ? 'All data wiped.' : 'Failed to wipe data.');
    if (success) { setShowWipeConfirm(false); setWipeConfirmText(''); }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); };

  return (
    <div className="page-container">
      <h2 style={{ marginBottom: 16 }}>Settings</h2>

      {/* Budget Configuration */}
      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Budgets</h3>
        <div className="input-group">
          <label className="input-label">Monthly Budget</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', padding: '0 14px', border: '1px solid var(--border-subtle)' }}>
            <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>₹</span>
            <input type="number" value={monthlyBudget} onChange={(e) => setMonthlyBudget(e.target.value)} placeholder="0" style={{ border: 'none', background: 'transparent', padding: '12px 0' }} />
          </div>
        </div>
        <div className="input-group">
          <label className="input-label">Daily Food Budget</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', padding: '0 14px', border: '1px solid var(--border-subtle)' }}>
            <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>₹</span>
            <input type="number" value={dailyFoodBudget} onChange={(e) => setDailyFoodBudget(e.target.value)} placeholder="250" style={{ border: 'none', background: 'transparent', padding: '12px 0' }} />
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleSaveSettings} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Budgets'}
        </button>
      </div>

      {/* Income */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0 }}>Income</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>Add salary or other sources</p>
          </div>
          <button className="chip active" onClick={() => navigate('/add-income')}>
            <Plus size={14} /> Add
          </button>
        </div>
      </div>

      {/* Backup */}
      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Backup & Export</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button className="btn btn-primary" onClick={handleExportJSON} style={{ padding: 12 }}>
            <Download size={18} /> Export Backup (JSON)
          </button>
          <button className="btn" onClick={() => fileInputRef.current?.click()} disabled={isImporting} style={{ padding: 12 }}>
            <Upload size={18} /> {isImporting ? 'Importing...' : 'Restore Backup'}
          </button>
          <input type="file" accept=".json" ref={fileInputRef} onChange={handleImportJSON} style={{ display: 'none' }} />
          <button className="btn-ghost" onClick={handleExportCSV} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8125rem', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 8 }}>
            <Download size={14} /> Export CSV for Excel
          </button>
        </div>
      </div>

      {/* Categories */}
      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Categories</h3>
        {categoryGroups.map(group => {
          const groupCats = categories.filter(c => c.group_id === group.id);
          return (
            <div key={group.id} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <Tag size={12} color="var(--accent)" />
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{group.name}</span>
                {!group.affects_budget && <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)', background: 'var(--bg-input)', padding: '2px 6px', borderRadius: 4 }}>no budget</span>}
              </div>
              <div className="chip-grid">
                {groupCats.map(cat => (
                  <span key={cat.id} className="chip" style={{ cursor: 'default', fontSize: '0.75rem', padding: '5px 10px' }}>
                    {cat.name}{cat.is_food_category ? ' 🍔' : ''}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Danger Zone */}
      <div className="card" style={{ borderColor: 'rgba(248,113,113,0.15)' }}>
        <h3 style={{ marginBottom: 8, color: 'var(--danger)' }}>Danger Zone</h3>
        {!showWipeConfirm ? (
          <button className="btn" onClick={() => setShowWipeConfirm(true)} style={{ background: 'var(--danger-dim)', color: 'var(--danger)', border: '1px solid rgba(248,113,113,0.2)', padding: 12 }}>
            <Trash2 size={16} /> Wipe All Data
          </button>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--danger)', marginBottom: 8, fontSize: '0.8125rem', fontWeight: 600 }}>
              <AlertTriangle size={16} /> This cannot be undone!
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 10 }}>
              Type <strong style={{ color: 'var(--danger)' }}>DELETE</strong> to confirm.
            </p>
            <input
              type="text" value={wipeConfirmText} onChange={(e) => setWipeConfirmText(e.target.value)}
              placeholder="DELETE" style={{ marginBottom: 10, borderColor: wipeConfirmText === 'DELETE' ? 'var(--danger)' : undefined }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" onClick={() => { setShowWipeConfirm(false); setWipeConfirmText(''); }} style={{ flex: 1, padding: 10 }}>Cancel</button>
              <button className="btn" onClick={handleWipeData} disabled={wipeConfirmText !== 'DELETE'} style={{ flex: 1, padding: 10, background: 'var(--danger)', color: '#fff' }}>Confirm</button>
            </div>
          </div>
        )}
      </div>

      {/* Logout */}
      <button className="btn" onClick={handleLogout} style={{ marginTop: 4, padding: 12, marginBottom: 20 }}>
        <LogOut size={16} /> Sign Out
      </button>
    </div>
  );
}
