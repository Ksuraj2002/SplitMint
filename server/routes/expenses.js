import express from 'express';
import Group from '../models/Group.js';
import Expense from '../models/Expense.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

function roundMoney(n) {
  return Math.round(n * 100) / 100;
}

router.get('/', async (req, res) => {
  try {
    const { groupId, participantId, search, minAmount, maxAmount, fromDate, toDate } = req.query;
    const groups = await Group.find({ owner: req.user._id }).select('_id');
    const groupIds = groups.map((g) => g._id);
    const filter = { group: { $in: groupIds } };
    if (groupId) filter.group = groupId;
    if (participantId) {
      filter.$or = [
        { payer: participantId },
        { 'splits.participant': participantId },
      ];
    }
    if (search?.trim()) {
      filter.description = { $regex: search.trim(), $options: 'i' };
    }
    if (minAmount != null) filter.amount = { ...filter.amount, $gte: Number(minAmount) };
    if (maxAmount != null) filter.amount = { ...filter.amount, $lte: Number(maxAmount) };
    if (fromDate) filter.date = { ...filter.date, $gte: new Date(fromDate) };
    if (toDate) filter.date = { ...filter.date, $lte: new Date(toDate) };

    const expenses = await Expense.find(filter)
      .populate('payer')
      .populate('group')
      .populate('splits.participant')
      .sort({ date: -1, createdAt: -1 });
    res.json(expenses);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { amount, description, date, payer, group: groupId, splitMode, participantIds, customAmounts, percentages } = req.body;
    const group = await Group.findOne({ _id: groupId, owner: req.user._id }).populate('participants');
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (!amount || amount <= 0 || !payer || !groupId) {
      return res.status(400).json({ message: 'Amount, payer and group required' });
    }
    const participants = participantIds?.length
      ? group.participants.filter((p) => participantIds.includes(p._id.toString()))
      : group.participants;
    if (!participants.length) return res.status(400).json({ message: 'At least one participant required' });

    const total = Number(amount);
    let splits = [];
    const mode = splitMode || 'equal';

    if (mode === 'equal') {
      const share = roundMoney(total / participants.length);
      let remainder = roundMoney(total - share * participants.length);
      splits = participants.map((p, i) => ({
        participant: p._id,
        amount: share + (i === 0 ? remainder : 0),
        shareType: 'equal',
      }));
    } else if (mode === 'custom' && Array.isArray(customAmounts) && customAmounts.length === participants.length) {
      const sum = customAmounts.reduce((a, b) => a + Number(b), 0);
      if (Math.abs(sum - total) > 0.02) return res.status(400).json({ message: 'Custom amounts must sum to expense total' });
      splits = participants.map((p, i) => ({
        participant: p._id,
        amount: roundMoney(Number(customAmounts[i])),
        shareType: 'custom',
      }));
    } else if (mode === 'percentage' && Array.isArray(percentages) && percentages.length === participants.length) {
      const sum = percentages.reduce((a, b) => a + Number(b), 0);
      if (Math.abs(sum - 100) > 0.02) return res.status(400).json({ message: 'Percentages must sum to 100' });
      splits = participants.map((p, i) => ({
        participant: p._id,
        amount: roundMoney((total * Number(percentages[i])) / 100),
        shareType: 'percentage',
      }));
      let diff = roundMoney(total - splits.reduce((a, s) => a + s.amount, 0));
      if (diff !== 0) splits[0].amount = roundMoney(splits[0].amount + diff);
    } else {
      const share = roundMoney(total / participants.length);
      splits = participants.map((p) => ({ participant: p._id, amount: share, shareType: 'equal' }));
    }

    const expense = await Expense.create({
      amount: total,
      description: description || '',
      date: date ? new Date(date) : new Date(),
      payer,
      group: groupId,
      splits,
    });
    const populated = await Expense.findById(expense._id)
      .populate('payer')
      .populate('group')
      .populate('splits.participant');
    res.status(201).json(populated);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const groups = await Group.find({ owner: req.user._id }).select('_id');
    const groupIds = groups.map((g) => g._id);
    let expense = await Expense.findOne({ _id: req.params.id, group: { $in: groupIds } });
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    const { amount, description, date, payer, splitMode, participantIds, customAmounts, percentages } = req.body;
    const group = await Group.findById(expense.group).populate('participants');
    const participants = participantIds?.length
      ? group.participants.filter((p) => participantIds.includes(p._id.toString()))
      : group.participants;
    const total = amount != null ? Number(amount) : expense.amount;
    let splits = expense.splits;

    if (amount != null || splitMode || participantIds) {
      const mode = splitMode || 'equal';
      if (mode === 'equal' && participants.length) {
        const share = roundMoney(total / participants.length);
        let remainder = roundMoney(total - share * participants.length);
        splits = participants.map((p, i) => ({
          participant: p._id,
          amount: share + (i === 0 ? remainder : 0),
          shareType: 'equal',
        }));
      } else if (mode === 'custom' && customAmounts?.length === participants.length) {
        splits = participants.map((p, i) => ({
          participant: p._id,
          amount: roundMoney(Number(customAmounts[i])),
          shareType: 'custom',
        }));
      } else if (mode === 'percentage' && percentages?.length === participants.length) {
        splits = participants.map((p, i) => ({
          participant: p._id,
          amount: roundMoney((total * Number(percentages[i])) / 100),
          shareType: 'percentage',
        }));
        let diff = roundMoney(total - splits.reduce((a, s) => a + s.amount, 0));
        if (diff !== 0) splits[0].amount = roundMoney(splits[0].amount + diff);
      }
    }

    expense.amount = total;
    if (description != null) expense.description = description;
    if (date != null) expense.date = new Date(date);
    if (payer != null) expense.payer = payer;
    expense.splits = splits;
    await expense.save();
    const populated = await Expense.findById(expense._id)
      .populate('payer')
      .populate('group')
      .populate('splits.participant');
    res.json(populated);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const groups = await Group.find({ owner: req.user._id }).select('_id');
    const groupIds = groups.map((g) => g._id);
    const expense = await Expense.findOneAndDelete({ _id: req.params.id, group: { $in: groupIds } });
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    res.json({ message: 'Expense deleted' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

export default router;
