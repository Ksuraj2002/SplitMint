import mongoose from 'mongoose';

const participantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  color: { type: String, default: '#6366f1' },
  avatar: { type: String, default: '' },
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
}, { timestamps: true });

export default mongoose.model('Participant', participantSchema);
