const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: Number, required: true, default: 0 },
});

const Counter = mongoose.model('Counter', counterSchema);

async function nextSequence(key) {
  try {
    const counter = await Counter.findOneAndUpdate({ key }, { $inc: { value: 1 } }, { upsert: true, new: true });
    return counter.value;
  } catch (err) {
    if (err.code === 11000) {
      const counter = await Counter.findOneAndUpdate({ key }, { $inc: { value: 1 } }, { upsert: true, new: true });
      return counter.value;
    }
    throw err;
  }
}

module.exports = { Counter, nextSequence };
