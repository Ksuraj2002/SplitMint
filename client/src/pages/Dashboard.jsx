import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import styles from './Dashboard.module.css';

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [sumRes, groupsRes] = await Promise.all([
          api.get('/balance/summary'),
          api.get('/groups'),
        ]);
        setSummary(sumRes.data);
        setGroups(groupsRes.data);
      } catch (_) {
        setSummary({ totalSpent: 0, totalOwedToUser: 0, totalOwedByUser: 0 });
        setGroups([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className={styles.loading}>Loading...</div>;

  return (
    <div className={styles.dashboard}>
      <h1 className={styles.pageTitle}>Dashboard</h1>
      <div className={styles.cards}>
        <div className={styles.card}>
          <span className={styles.cardLabel}>Total spent</span>
          <span className={styles.cardValue}>₹{summary?.totalSpent?.toFixed(2) ?? '0.00'}</span>
        </div>
        <div className={styles.cardGreen}>
          <span className={styles.cardLabel}>Owed to you</span>
          <span className={styles.cardValue}>₹{summary?.totalOwedToUser?.toFixed(2) ?? '0.00'}</span>
        </div>
        <div className={styles.cardRed}>
          <span className={styles.cardLabel}>You owe</span>
          <span className={styles.cardValue}>₹{summary?.totalOwedByUser?.toFixed(2) ?? '0.00'}</span>
        </div>
      </div>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Your groups</h2>
        {groups.length === 0 ? (
          <p className={styles.empty}>No groups yet. <Link to="/groups">Create one</Link></p>
        ) : (
          <ul className={styles.groupList}>
            {groups.map((g) => (
              <li key={g._id}>
                <Link to={`/groups/${g._id}`} className={styles.groupLink}>
                  <span className={styles.groupName}>{g.name}</span>
                  <span className={styles.groupMeta}>
                    {g.participants?.length ?? 0} participant(s)
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
