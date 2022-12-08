var mongoose = require('mongoose');

var ItemSchema = new mongoose.Schema({
    title: String,
    content: String,
    manager: String,
    managerno: String,
    phone: String,
    location: String,
    days: [String],
    opening: Date,
    semester: Object,
    student: {
        type: [String],
        default: ""
    },
    rfid: String,
    beacon: Object,
    status: Boolean,
    tag : Object,
    image: [mongoose.Schema.Types.Mixed],
    hit: {
        type: Number,
        default: 0
    },
    like_count: {
        type: Number,
        default: 0
    },
    like_users: {
        type: [String],
        default: ""
    },
    regdate: {
        type: Date,
        default: Date.now
    }
});

var Item = mongoose.model('Item', ItemSchema);

module.exports = Item;