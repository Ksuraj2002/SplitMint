import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import styles from './Groups.module.css';

export default function Groups() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [error, setError] = useState('');

  const fetchGroups = async () => {
    try {
      const { data } = await api.get('/groups');
      setGroups(data);
    } catch (_) {
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    if (!newName.trim()) return;
    try {
      await api.post('/groups', { name: newName.trim() });
      setNewName('');
      setShowCreate(false);
      fetchGroups();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError('');
    if (!editingId || !editName.trim()) return;
    try {
      await api.put(`/groups/${editingId}`, { name: editName.trim() });
      setEditingId(null);
      setEditName('');
      fetchGroups();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this group and all its expenses?')) return;
    try {
      await api.delete(`/groups/${id}`);
      fetchGroups();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete');
    }
  };

  if (loading) return <div className={styles.loading}>Loading...</div>;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Groups</h1>
        <button type="button" onClick={() => setShowCreate(true)} className={styles.btnPrimary}>
          New group
        </button>
      </div>
      {error && <div className={styles.error}>{error}</div>}
      {showCreate && (
        <form onSubmit={handleCreate} className={styles.form}>
          <input
            type="text"
            placeholder="Group name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className={styles.input}
            autoFocus
          />
          <div className={styles.formActions}>
            <button type="submit" className={styles.btnPrimary}>Create</button>
            <button type="button" onClick={() => { setShowCreate(false); setNewName(''); }} className={styles.btnSecondary}>
              Cancel
            </button>
          </div>
        </form>
      )}
      <ul className={styles.list}>
        {groups.length === 0 && !showCreate ? (
          <li className={styles.empty}>No groups yet. Create one above.</li>
        ) : (
          groups.map((g) => (
            <li key={g._id} className={styles.item}>
              {editingId === g._id ? (
                <form onSubmit={handleUpdate} className={styles.editForm}>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className={styles.input}
                    autoFocus
                  />
                  <button type="submit" className={styles.btnSmall}>Save</button>
                  <button type="button" onClick={() => { setEditingId(null); setEditName(''); }} className={styles.btnSmall}>Cancel</button>
                </form>
              ) : (
                <>
                  <Link to={`/groups/${g._id}`} className={styles.link}>
                    <span className={styles.name}>{g.name}</span>
                    <span className={styles.meta}>{g.participants?.length ?? 0} participants</span>
                  </Link>
                  <div className={styles.actions}>
                    <button type="button" onClick={() => { setEditingId(g._id); setEditName(g.name); }} className={styles.btnIcon} title="Edit name">
                      Edit
                    </button>
                    <button type="button" onClick={() => handleDelete(g._id)} className={styles.btnDanger} title="Delete group">
                      Delete
                    </button>
                  </div>
                </>
              )}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
