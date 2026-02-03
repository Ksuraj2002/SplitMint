import mongoose from 'mongoose';

const splitSchema = new mongoose.Schema({
  participant: { type: mongoose.Schema.Types.ObjectId, ref: 'Participant', required: true },
  amount: { type: Number, required: true },
  shareType: { type: String, enum: ['equal', 'custom', 'percentage'], default: 'equal' },
});

const expenseSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  description: { type: String, default: '' },
  date: { type: Date, default: Date.now },
  payer: { type: mongoose.Schema.Types.ObjectId, ref: 'Participant', required: true },
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  splits: [splitSchema],
}, { timestamps: true });

export default mongoose.model('Expense', expenseSchema);
