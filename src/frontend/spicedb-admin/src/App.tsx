import { Routes, Route, NavLink } from 'react-router-dom';
import { Database, Users, Shield, FileCode, Zap, AppWindow, Building2 } from 'lucide-react';
import RelationshipsPage from './pages/RelationshipsPage';
import PermissionCheckerPage from './pages/PermissionCheckerPage';
import SchemaPage from './pages/SchemaPage';
import UsersPage from './pages/UsersPage';
import ApplicationsPage from './pages/ApplicationsPage';
import OrganizationsPage from './pages/OrganizationsPage';
import './App.css';

function App() {
  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="logo">
          <Zap className="logo-icon" />
          <span>SpiceDB Admin</span>
        </div>
        
        <nav className="nav">
          <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end>
            <Users size={18} />
            <span>Users & Permissions</span>
          </NavLink>
          
          <NavLink to="/organizations" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Building2 size={18} />
            <span>Organizations</span>
          </NavLink>
          
          <NavLink to="/applications" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <AppWindow size={18} />
            <span>Application Access</span>
          </NavLink>
          
          <NavLink to="/permissions" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Shield size={18} />
            <span>Permission Checker</span>
          </NavLink>
          
          <NavLink to="/relationships" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Database size={18} />
            <span>Raw Relationships</span>
          </NavLink>
          
          <NavLink to="/schema" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <FileCode size={18} />
            <span>Schema</span>
          </NavLink>
        </nav>
        
        <div className="sidebar-footer">
          <div className="status-indicator">
            <span className="status-dot"></span>
            <span>Connected to SpiceDB</span>
          </div>
        </div>
      </aside>
      
      <main className="main-content">
        <Routes>
          <Route path="/" element={<UsersPage />} />
          <Route path="/organizations" element={<OrganizationsPage />} />
          <Route path="/applications" element={<ApplicationsPage />} />
          <Route path="/permissions" element={<PermissionCheckerPage />} />
          <Route path="/relationships" element={<RelationshipsPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/schema" element={<SchemaPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
