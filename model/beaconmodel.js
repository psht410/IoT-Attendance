var mongoose = require('mongoose');

var BeaconSchema = new mongoose.Schema({
    item_oid: String,
    uuid: {
        type: String,
        uppercase: true
    },
    major: String,
    minor: {
        type: String,
        unique: true
    },
    location: {
        type: String,
        default: ""
    },
    schedule: {
        type: [String],
        default: ""
    },
    student: {
        type: [String],
        default: ""
    }
});

var Beacon = mongoose.model('Beacon', BeaconSchema);

module.exports = Beacon;