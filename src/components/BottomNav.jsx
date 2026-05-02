import { NavLink } from 'react-router-dom';
import { Home, Plus, BarChart3, Settings, List } from 'lucide-react';
import './BottomNav.css';

export function BottomNav() {
  return (
    <nav className="bottom-nav">
      <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <Home size={20} strokeWidth={isActive => isActive ? 2.5 : 1.5} />
        <span>Home</span>
      </NavLink>
      <NavLink to="/transactions" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <List size={20} />
        <span>History</span>
      </NavLink>
      <NavLink to="/add" className={({ isActive }) => `nav-item add-btn ${isActive ? 'active' : ''}`}>
        <div className="add-icon-wrapper">
          <Plus size={24} strokeWidth={2.5} />
        </div>
        <span>Add</span>
      </NavLink>
      <NavLink to="/analytics" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <BarChart3 size={20} />
        <span>Insights</span>
      </NavLink>
      <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <Settings size={20} />
        <span>Settings</span>
      </NavLink>
    </nav>
  );
}
