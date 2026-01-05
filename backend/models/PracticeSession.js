const mongoose = require('mongoose');

const PracticeSessionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        required: true,
        enum: ['topic', 'grammar', 'interview', 'listening']
    },
    topic: {
        type: String,
        required: true
    },
    score: {
        type: Number,
        required: true
    },
    duration: {
        type: Number, // in seconds
        default: 0
    },
    details: {
        type: Object, // Flexible field for specific feedback, errors, transcript etc.
        default: {}
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('PracticeSession', PracticeSessionSchema);
