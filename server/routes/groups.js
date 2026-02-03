import express from 'express';
import Group from '../models/Group.js';
import Participant from '../models/Participant.js';
import Expense from '../models/Expense.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

router.get('/', async (req, res) => {
  try {
    const groups = await Group.find({ owner: req.user._id })
      .populate('participants')
      .sort({ updatedAt: -1 });
    res.json(groups);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'Group name required' });
    const group = await Group.create({ name: name.trim(), owner: req.user._id });
    res.status(201).json(group);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const group = await Group.findOne({ _id: req.params.id, owner: req.user._id })
      .populate('participants');
    if (!group) return res.status(404).json({ message: 'Group not found' });
    res.json(group);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const group = await Group.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { $set: req.body },
      { new: true }
    ).populate('participants');
    if (!group) return res.status(404).json({ message: 'Group not found' });
    res.json(group);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const group = await Group.findOne({ _id: req.params.id, owner: req.user._id });
    if (!group) return res.status(404).json({ message: 'Group not found' });
    await Participant.deleteMany({ group: group._id });
    await Expense.deleteMany({ group: group._id });
    await Group.findByIdAndDelete(group._id);
    res.json({ message: 'Group deleted' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Participants (max 3 + primary = 4 total participants per group)
router.post('/:id/participants', async (req, res) => {
  try {
    const group = await Group.findOne({ _id: req.params.id, owner: req.user._id });
    if (!group) return res.status(404).json({ message: 'Group not found' });
    const count = await Participant.countDocuments({ group: group._id });
    if (count >= 4) return res.status(400).json({ message: 'Max 4 participants per group (3 + you)' });
    const { name, color } = req.body;
    const participant = await Participant.create({
      name: name?.trim() || 'Participant',
      color: color || '#6366f1',
      group: group._id,
    });
    await Group.findByIdAndUpdate(group._id, { $push: { participants: participant._id } });
    res.status(201).json(participant);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.put('/:groupId/participants/:participantId', async (req, res) => {
  try {
    const group = await Group.findOne({ _id: req.params.groupId, owner: req.user._id });
    if (!group) return res.status(404).json({ message: 'Group not found' });
    const participant = await Participant.findOneAndUpdate(
      { _id: req.params.participantId, group: group._id },
      { $set: req.body },
      { new: true }
    );
    if (!participant) return res.status(404).json({ message: 'Participant not found' });
    res.json(participant);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.delete('/:groupId/participants/:participantId', async (req, res) => {
  try {
    const group = await Group.findOne({ _id: req.params.groupId, owner: req.user._id });
    if (!group) return res.status(404).json({ message: 'Group not found' });
    const participant = await Participant.findOne({ _id: req.params.participantId, group: group._id });
    if (!participant) return res.status(404).json({ message: 'Participant not found' });
    await Expense.updateMany(
      { group: group._id },
      { $pull: { splits: { participant: participant._id } } }
    );
    await Expense.deleteMany({ payer: participant._id });
    await Expense.deleteMany({ group: group._id, 'splits.0': { $exists: false } });
    await Group.findByIdAndUpdate(group._id, { $pull: { participants: participant._id } });
    await Participant.findByIdAndDelete(participant._id);
    res.json({ message: 'Participant removed' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

export default router;
