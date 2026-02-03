import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import styles from './GroupDetail.module.css';
import ExpenseModal from '../components/ExpenseModal';

export default function GroupDetail() {
  const { groupId } = useParams();
  const [group, setGroup] = useState(null);
  const [balance, setBalance] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [newParticipantName, setNewParticipantName] = useState('');
  const [search, setSearch] = useState('');
  const [filterParticipant, setFilterParticipant] = useState('');
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');
  const [error, setError] = useState('');

  const fetchGroup = async () => {
    try {
      const { data } = await api.get(`/groups/${groupId}`);
      setGroup(data);
      return data;
    } catch (_) {
      setGroup(null);
      return null;
    }
  };

  const fetchBalance = async () => {
    try {
      const { data } = await api.get(`/balance/group/${groupId}`);
      setBalance(data);
    } catch (_) {
      setBalance(null);
    }
  };

  const fetchExpenses = async () => {
    try {
      const params = new URLSearchParams();
      params.set('groupId', groupId);
      if (search.trim()) params.set('search', search.trim());
      if (filterParticipant) params.set('participantId', filterParticipant);
      if (filterFromDate) params.set('fromDate', filterFromDate);
      if (filterToDate) params.set('toDate', filterToDate);
      const { data } = await api.get(`/expenses?${params.toString()}`);
      setExpenses(data);
    } catch (_) {
      setExpenses([]);
    }
  };

  useEffect(() => {
    if (!groupId) return;
    setLoading(true);
    (async () => {
      try {
        await fetchGroup();
        await fetchBalance();
        await fetchExpenses();
      } finally {
        setLoading(false);
      }
    })();
  }, [groupId]);

  useEffect(() => {
    if (!groupId) return;
    fetchBalance();
    fetchExpenses();
  }, [groupId, group?.participants?.length, search, filterParticipant, filterFromDate, filterToDate]);

  const refreshAll = () => {
    fetchGroup();
    fetchBalance();
    fetchExpenses();
  };

  const handleSaveExpense = () => {
    setShowExpenseModal(false);
    setEditingExpense(null);
    refreshAll();
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await api.delete(`/expenses/${id}`);
      refreshAll();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete');
    }
  };

  const handleAddParticipant = async (e) => {
    e.preventDefault();
    setError('');
    if (!newParticipantName.trim()) return;
    if ((group?.participants?.length ?? 0) >= 4) {
      setError('Max 4 participants per group');
      return;
    }
    try {
      await api.post(`/groups/${groupId}/participants`, { name: newParticipantName.trim() });
      setNewParticipantName('');
      setShowAddParticipant(false);
      refreshAll();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add');
    }
  };

  const handleRemoveParticipant = async (participantId) => {
    if (!window.confirm('Remove this participant? Linked expenses will be updated.')) return;
    try {
      await api.delete(`/groups/${groupId}/participants/${participantId}`);
      refreshAll();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove');
    }
  };

  const handleEditParticipant = async (participantId, name) => {
    try {
      await api.put(`/groups/${groupId}/participants/${participantId}`, { name });
      refreshAll();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update');
    }
  };

  if (loading) return <div className={styles.loading}>Loading...</div>;
  if (!group) return <div className={styles.loading}>Group not found. <Link to="/groups">Back to groups</Link></div>;

  const participants = group.participants || [];

  return (
    <div className={styles.page}>
      <div className={styles.breadcrumb}>
        <Link to="/groups">Groups</Link>
        <span className={styles.breadcrumbSep}>/</span>
        <span>{group.name}</span>
      </div>
      <h1 className={styles.title}>{group.name}</h1>
      {error && <div className={styles.error}>{error}</div>}

      {/* Summary cards */}
      <div className={styles.cards}>
        <div className={styles.card}>
          <span className={styles.cardLabel}>Total spent</span>
          <span className={styles.cardValue}>₹{balance?.totalSpent?.toFixed(2) ?? '0.00'}</span>
        </div>
      </div>

      {/* Balance & settlements */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Balances</h2>
        {balance?.balances?.length ? (
          <>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Participant</th>
                  <th>Net balance</th>
                </tr>
              </thead>
              <tbody>
                {balance.balances.map((b) => (
                  <tr key={b.participantId}>
                    <td>{b.name}</td>
                    <td className={b.netBalance >= 0 ? styles.positive : styles.negative}>
                      {b.netBalance >= 0 ? '+' : ''}₹{b.netBalance?.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {balance.settlements?.length > 0 && (
              <div className={styles.settlements}>
                <h3 className={styles.settlementsTitle}>Settlement suggestions</h3>
                <ul className={styles.settlementsList}>
                  {balance.settlements.map((s, i) => (
                    <li key={i}>{s.from} pays {s.to} ₹{s.amount?.toFixed(2)}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <p className={styles.empty}>No balances yet. Add expenses to see who owes whom.</p>
        )}
      </section>

      {/* Participants */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Participants</h2>
          {participants.length < 4 && (
            <button type="button" onClick={() => setShowAddParticipant(true)} className={styles.btnPrimary}>
              Add participant
            </button>
          )}
        </div>
        {showAddParticipant && (
          <form onSubmit={handleAddParticipant} className={styles.inlineForm}>
            <input
              type="text"
              placeholder="Name"
              value={newParticipantName}
              onChange={(e) => setNewParticipantName(e.target.value)}
              className={styles.input}
              autoFocus
            />
            <button type="submit" className={styles.btnPrimary}>Add</button>
            <button type="button" onClick={() => { setShowAddParticipant(false); setNewParticipantName(''); }} className={styles.btnSecondary}>Cancel</button>
          </form>
        )}
        <ul className={styles.participantList}>
          {participants.length === 0 ? (
            <li className={styles.empty}>No participants. Add up to 4.</li>
          ) : (
            participants.map((p) => (
              <li key={p._id} className={styles.participantItem}>
                <span className={styles.participantDot} style={{ background: p.color || '#6366f1' }} />
                <span className={styles.participantName}>{p.name}</span>
                <button type="button" onClick={() => handleRemoveParticipant(p._id)} className={styles.btnDanger}>Remove</button>
              </li>
            ))
          )}
        </ul>
      </section>

      {/* Expenses */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Expenses</h2>
          <button type="button" onClick={() => { setEditingExpense(null); setShowExpenseModal(true); }} className={styles.btnPrimary}>
            Add expense
          </button>
        </div>

        <div className={styles.filters}>
          <input
            type="text"
            placeholder="Search by description"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.input}
          />
          <select value={filterParticipant} onChange={(e) => setFilterParticipant(e.target.value)} className={styles.select}>
            <option value="">All participants</option>
            {participants.map((p) => (
              <option key={p._id} value={p._id}>{p.name}</option>
            ))}
          </select>
          <input type="date" value={filterFromDate} onChange={(e) => setFilterFromDate(e.target.value)} className={styles.input} placeholder="From" />
          <input type="date" value={filterToDate} onChange={(e) => setFilterToDate(e.target.value)} className={styles.input} placeholder="To" />
        </div>

        <ul className={styles.expenseList}>
          {expenses.length === 0 ? (
            <li className={styles.empty}>No expenses. Add one to get started.</li>
          ) : (
            expenses.map((exp) => (
              <li key={exp._id} className={styles.expenseItem}>
                <div className={styles.expenseMain}>
                  <span className={styles.expenseAmount}>₹{exp.amount?.toFixed(2)}</span>
                  <span className={styles.expenseDesc}>{exp.description || 'No description'}</span>
                  <span className={styles.expenseDate}>{new Date(exp.date).toLocaleDateString()}</span>
                  <span className={styles.expensePayer}>paid by {exp.payer?.name}</span>
                </div>
                <div className={styles.expenseSplits}>
                  {exp.splits?.map((s) => (
                    <span key={s.participant?._id} className={styles.splitBadge}>
                      {s.participant?.name}: ₹{s.amount?.toFixed(2)}
                    </span>
                  ))}
                </div>
                <div className={styles.expenseActions}>
                  <button type="button" onClick={() => { setEditingExpense(exp); setShowExpenseModal(true); }} className={styles.btnIcon}>Edit</button>
                  <button type="button" onClick={() => handleDeleteExpense(exp._id)} className={styles.btnDanger}>Delete</button>
                </div>
              </li>
            ))
          )}
        </ul>
      </section>

      {showExpenseModal && (
        <ExpenseModal
          groupId={groupId}
          group={group}
          expense={editingExpense}
          onClose={() => { setShowExpenseModal(false); setEditingExpense(null); }}
          onSaved={handleSaveExpense}
        />
      )}
    </div>
  );
}
