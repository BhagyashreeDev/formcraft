import mongoose from 'mongoose';

const formSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a form name'],
      trim: true,
      maxlength: [100, 'Form name cannot exceed 100 characters'],
    },
    notificationEmail: {
      type: String,
      required: [true, 'Please provide an email to receive submissions'],
      trim: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address',
      ],
    },
    customRedirect: {
      type: String,
      trim: true,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Form = mongoose.model('Form', formSchema);

export default Form;