import express from 'express';
import Group from '../models/Group.js';
import Expense from '../models/Expense.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

// Net balance per participant in a group: positive = owed to them, negative = they owe
function computeBalances(expenses) {
  const balances = {};
  for (const exp of expenses) {
    const payerId = exp.payer?._id?.toString() || exp.payer?.toString();
    if (!payerId) continue;
    balances[payerId] = (balances[payerId] || 0) + exp.amount;
    for (const s of exp.splits || []) {
      const pid = s.participant?._id?.toString() || s.participant?.toString();
      if (!pid) continue;
      balances[pid] = (balances[pid] || 0) - (s.amount || 0);
    }
  }
  return balances;
}

// Minimal settlement: who pays whom (debtors pay creditors)
function minimalSettlements(balances, participantMap) {
  const debts = [];
  const credits = [];
  for (const [pid, net] of Object.entries(balances)) {
    const rounded = Math.round(net * 100) / 100;
    if (rounded > 0) credits.push({ id: pid, amount: rounded, name: participantMap[pid]?.name || pid });
    if (rounded < 0) debts.push({ id: pid, amount: -rounded, name: participantMap[pid]?.name || pid });
  }
  const suggestions = [];
  let i = 0,
    j = 0;
  while (i < debts.length && j < credits.length) {
    const d = debts[i];
    const c = credits[j];
    const pay = Math.min(d.amount, c.amount);
    if (pay > 0.01) {
      suggestions.push({ from: d.name, to: c.name, amount: Math.round(pay * 100) / 100 });
    }
    debts[i].amount -= pay;
    credits[j].amount -= pay;
    if (debts[i].amount < 0.01) i++;
    if (credits[j].amount < 0.01) j++;
  }
  return suggestions;
}

router.get('/group/:groupId', async (req, res) => {
  try {
    const group = await Group.findOne({ _id: req.params.groupId, owner: req.user._id }).populate('participants');
    if (!group) return res.status(404).json({ message: 'Group not found' });
    const expenses = await Expense.find({ group: group._id })
      .populate('payer')
      .populate('splits.participant');
    const balances = computeBalances(expenses);
    const participantMap = {};
    group.participants.forEach((p) => {
      participantMap[p._id.toString()] = p;
    });
    const totals = { totalSpent: expenses.reduce((a, e) => a + e.amount, 0), byParticipant: {} };
    expenses.forEach((e) => {
      const pid = e.payer?._id?.toString();
      if (pid) totals.byParticipant[pid] = (totals.byParticipant[pid] || 0) + e.amount;
    });
    const settlements = minimalSettlements(balances, participantMap);
    res.json({
      balances: Object.entries(balances).map(([id, net]) => ({
        participantId: id,
        name: participantMap[id]?.name || id,
        netBalance: Math.round(net * 100) / 100,
      })),
      settlements,
      totalSpent: Math.round(totals.totalSpent * 100) / 100,
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get('/summary', async (req, res) => {
  try {
    const groups = await Group.find({ owner: req.user._id }).populate('participants');
    const groupIds = groups.map((g) => g._id);
    const expenses = await Expense.find({ group: { $in: groupIds } })
      .populate('payer')
      .populate('splits.participant');
    const allParticipantIds = new Set();
    groups.forEach((g) => g.participants.forEach((p) => allParticipantIds.add(p._id.toString())));
    const balances = computeBalances(expenses);
    const totalSpent = expenses.reduce((a, e) => a + e.amount, 0);
    let totalOwedToUser = 0;
    let totalOwedByUser = 0;
    for (const [_, net] of Object.entries(balances)) {
      if (net > 0) totalOwedToUser += net;
      if (net < 0) totalOwedByUser += -net;
    }
    res.json({
      totalSpent: Math.round(totalSpent * 100) / 100,
      totalOwedToUser: Math.round(totalOwedToUser * 100) / 100,
      totalOwedByUser: Math.round(totalOwedByUser * 100) / 100,
      balances: Object.entries(balances).map(([id, net]) => ({
        participantId: id,
        netBalance: Math.round(net * 100) / 100,
      })),
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

export default router;
