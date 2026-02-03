import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './Layout.module.css';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <NavLink to="/dashboard" className={styles.logo}>
          SplitMint
        </NavLink>
        <nav className={styles.nav}>
          <NavLink to="/dashboard" className={({ isActive }) => (isActive ? styles.active : '')}>
            Dashboard
          </NavLink>
          <NavLink to="/groups" className={({ isActive }) => (isActive ? styles.active : '')}>
            Groups
          </NavLink>
        </nav>
        <div className={styles.user}>
          <span className={styles.email}>{user?.email}</span>
          <button type="button" onClick={handleLogout} className={styles.logout}>
            Log out
          </button>
        </div>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
