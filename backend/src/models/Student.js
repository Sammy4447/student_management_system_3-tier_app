import mongoose from 'mongoose';

export const COURSES = ['BCA', 'BIT', 'BBA', 'BSc CSIT', 'BBM'];
export const GENDERS = ['Male', 'Female', 'Other'];
export const MAX_SEMESTER = 8;

const studentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [80, 'Name must be at most 80 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      unique: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email'],
    },
    phone: {
      type: String,
      required: [true, 'Phone is required'],
      trim: true,
      match: [/^[0-9+\-\s()]{7,20}$/, 'Please provide a valid phone number'],
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
      maxlength: [200, 'Address must be at most 200 characters'],
    },
    dateOfBirth: {
      type: Date,
      required: [true, 'Date of birth is required'],
      validate: {
        validator: (value) => value < new Date(),
        message: 'Date of birth must be in the past',
      },
    },
    gender: {
      type: String,
      required: [true, 'Gender is required'],
      enum: { values: GENDERS, message: '{VALUE} is not a supported gender' },
    },
    course: {
      type: String,
      required: [true, 'Course is required'],
      enum: { values: COURSES, message: '{VALUE} is not a supported course' },
    },
    semester: {
      type: Number,
      required: [true, 'Semester is required'],
      min: [1, 'Semester must be between 1 and 8'],
      max: [MAX_SEMESTER, 'Semester must be between 1 and 8'],
    },
    rollNumber: {
      type: String,
      required: [true, 'Roll number is required'],
      trim: true,
      uppercase: true,
      unique: true,
      maxlength: [20, 'Roll number must be at most 20 characters'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

studentSchema.virtual('age').get(function () {
  if (!this.dateOfBirth) return null;
  const diff = Date.now() - this.dateOfBirth.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
});

// Backs the search-by-name/email/roll query.
studentSchema.index({ name: 'text', email: 'text', rollNumber: 'text' });
studentSchema.index({ course: 1, semester: 1 });

export const Student = mongoose.model('Student', studentSchema);
