import mongoose from 'mongoose';

const submissionSchema = new mongoose.Schema(
  {
    formId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Form',
      required: [true, 'Submission must be linked to a form'],
      index: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, 'Submission data cannot be empty'],
    },
    ipAddress: {
      type: String,
      default: 'Unknown',
    },
    userAgent: {
      type: String,
      default: 'Unknown',
    },
    isSpam: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Submission = mongoose.model('Submission', submissionSchema);

export default Submission;