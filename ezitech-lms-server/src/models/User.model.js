const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ROLES = ['student', 'instructor', 'mentor', 'course_manager', 'admin'];

const educationSchema = new mongoose.Schema({
  school: { type: String, required: true, trim: true, maxlength: 120 },
  degree: { type: String, trim: true, maxlength: 120 },
  field: { type: String, trim: true, maxlength: 120 },
  startYear: { type: Number, min: 1950, max: 2100 },
  endYear: { type: Number, min: 1950, max: 2100 },
  description: { type: String, trim: true, maxlength: 500 },
});

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 8,
      select: false,
    },
    role: {
      type: String,
      enum: ROLES,
      default: 'student',
      required: true,
    },
    permissions: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    mfaEnabled: {
      type: Boolean,
      default: false,
    },
    mfaSecret: {
      type: String,
      select: false,
    },
    mfaRecoveryCodeHashes: {
      type: [String],
      select: false,
      default: undefined,
    },
    mfaLastUsedStep: {
      type: Number,
      select: false,
    },

    failedLoginAttempts: { type: Number, default: 0 },
    lastFailedLoginAt: Date,
    lockUntil: Date,
    invitePending: Boolean,

    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    emailVerificationTokenHash: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },

    avatar: {
      url: { type: String, trim: true },
      publicId: { type: String, trim: true },
    },
    phone: { type: String, trim: true, maxlength: 30 },
    bio: { type: String, trim: true, maxlength: 1000 },
    skills: { type: [String], default: [] },
    education: { type: [educationSchema], default: [] },
    socialLinks: {
      github: { type: String, trim: true, maxlength: 200 },
      linkedin: { type: String, trim: true, maxlength: 200 },
    },

    lastLoginAt: Date,

    roleProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
  },
  { timestamps: true }
);

userSchema.index({ role: 1 });

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toSafeObject = function toSafeObject() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.mfaSecret;
  delete obj.passwordResetTokenHash;
  delete obj.passwordResetExpires;
  delete obj.emailVerificationTokenHash;
  delete obj.emailVerificationExpires;
  delete obj.mfaRecoveryCodeHashes;
  delete obj.mfaLastUsedStep;
  delete obj.failedLoginAttempts;
  delete obj.lastFailedLoginAt;
  delete obj.lockUntil;
  delete obj.invitePending;
  if (obj.avatar) delete obj.avatar.publicId;
  delete obj.__v;
  return obj;
};

const User = mongoose.model('User', userSchema);

module.exports = { User, ROLES };
