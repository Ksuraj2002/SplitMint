import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import styles from './ExpenseModal.module.css';

const SPLIT_MODES = ['equal', 'custom', 'percentage'];

export default function ExpenseModal({ groupId, group, expense, onClose, onSaved }) {
  const isEdit = !!expense;
  const participants = group?.participants || [];
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [payer, setPayer] = useState('');
  const [splitMode, setSplitMode] = useState('equal');
  const [selectedParticipantIds, setSelectedParticipantIds] = useState([]);
  const [customAmounts, setCustomAmounts] = useState({});
  const [percentages, setPercentages] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (expense) {
      setAmount(String(expense.amount ?? ''));
      setDescription(expense.description ?? '');
      setDate(expense.date ? new Date(expense.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
      setPayer(expense.payer?._id ?? '');
      setSelectedParticipantIds(expense.splits?.map((s) => s.participant?._id).filter(Boolean) ?? participants.map((p) => p._id));
      if (expense.splits?.length) {
        const cust = {};
        const pct = {};
        expense.splits.forEach((s) => {
          const id = s.participant?._id;
          if (id) {
            cust[id] = String(s.amount ?? '');
            pct[id] = expense.amount ? String(((s.amount / expense.amount) * 100).toFixed(1)) : '';
          }
        });
        setCustomAmounts(cust);
        setPercentages(pct);
      }
    } else {
      setSelectedParticipantIds(participants.map((p) => p._id));
      setPayer(participants[0]?._id ?? '');
    }
  }, [expense, participants]);

  const toggleParticipant = (id) => {
    setSelectedParticipantIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const totalCustom = Object.values(customAmounts).reduce((a, b) => a + (Number(b) || 0), 0);
  const totalPct = Object.values(percentages).reduce((a, b) => a + (Number(b) || 0), 0);
  const amt = Number(amount) || 0;
  const selectedCount = selectedParticipantIds.length;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!amount || Number(amount) <= 0) {
      setError('Enter a valid amount');
      return;
    }
    if (!payer) {
      setError('Select who paid');
      return;
    }
    if (selectedParticipantIds.length === 0) {
      setError('Select at least one participant to split with');
      return;
    }
    if (splitMode === 'custom' && Math.abs(totalCustom - amt) > 0.02) {
      setError('Custom amounts must sum to expense total');
      return;
    }
    if (splitMode === 'percentage' && Math.abs(totalPct - 100) > 0.02) {
      setError('Percentages must sum to 100');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        amount: amt,
        description: description.trim(),
        date,
        payer,
        group: groupId,
        splitMode,
        participantIds: selectedParticipantIds,
      };
      if (splitMode === 'custom') {
        payload.customAmounts = selectedParticipantIds.map((id) => customAmounts[id] ?? 0);
      }
      if (splitMode === 'percentage') {
        payload.percentages = selectedParticipantIds.map((id) => percentages[id] ?? 0);
      }
      if (isEdit) {
        await api.put(`/expenses/${expense._id}`, payload);
      } else {
        await api.post('/expenses', payload);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>{isEdit ? 'Edit expense' : 'Add expense'}</h2>
          <button type="button" onClick={onClose} className={styles.close}>×</button>
        </div>
        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}
          <label className={styles.label}>Amount (₹)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={styles.input}
            required
          />
          <label className={styles.label}>Description</label>
          <input
            type="text"
            placeholder="What was it for?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={styles.input}
          />
          <label className={styles.label}>Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={styles.input} />
          <label className={styles.label}>Paid by</label>
          <select value={payer} onChange={(e) => setPayer(e.target.value)} className={styles.select} required>
            {participants.map((p) => (
              <option key={p._id} value={p._id}>{p.name}</option>
            ))}
          </select>
          <label className={styles.label}>Split mode</label>
          <select value={splitMode} onChange={(e) => setSplitMode(e.target.value)} className={styles.select}>
            {SPLIT_MODES.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <label className={styles.label}>Split between</label>
          <div className={styles.participantCheckboxes}>
            {participants.map((p) => (
              <label key={p._id} className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={selectedParticipantIds.includes(p._id)}
                  onChange={() => toggleParticipant(p._id)}
                />
                {p.name}
              </label>
            ))}
          </div>
          {splitMode === 'custom' && selectedParticipantIds.length > 0 && (
            <>
              <label className={styles.label}>Amount per person (must sum to ₹{amt.toFixed(2)})</label>
              {selectedParticipantIds.map((id) => {
                const p = participants.find((x) => x._id === id);
                if (!p) return null;
                return (
                  <div key={id} className={styles.customRow}>
                    <span>{p.name}</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={customAmounts[id] ?? ''}
                      onChange={(e) => setCustomAmounts((prev) => ({ ...prev, [id]: e.target.value }))}
                      className={styles.inputSmall}
                    />
                  </div>
                );
              })}
              <p className={styles.hint}>Sum: ₹{totalCustom.toFixed(2)}</p>
            </>
          )}
          {splitMode === 'percentage' && selectedParticipantIds.length > 0 && (
            <>
              <label className={styles.label}>Percentage per person (must sum to 100)</label>
              {selectedParticipantIds.map((id) => {
                const p = participants.find((x) => x._id === id);
                if (!p) return null;
                return (
                  <div key={id} className={styles.customRow}>
                    <span>{p.name}</span>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={percentages[id] ?? ''}
                      onChange={(e) => setPercentages((prev) => ({ ...prev, [id]: e.target.value }))}
                      className={styles.inputSmall}
                    />
                    %
                  </div>
                );
              })}
              <p className={styles.hint}>Total: {totalPct.toFixed(1)}%</p>
            </>
          )}
          <div className={styles.actions}>
            <button type="submit" disabled={loading} className={styles.btnPrimary}>
              {loading ? 'Saving...' : isEdit ? 'Update' : 'Add expense'}
            </button>
            <button type="button" onClick={onClose} className={styles.btnSecondary}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
