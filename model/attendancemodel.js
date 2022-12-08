var mongoose = require('mongoose');

var AttendanceSchema = new mongoose.Schema({
    user_id: String,
    item_oid : String,
    beacon_oid: {
        type: String,
        default: ""
    },
    rfid_oid: {
        type: String,
        default: ""
    },
    attend_date: {
        type: Date,
        default: ""
    },
    checkout_date: {
        type: Date,
        default: ""
    },
    attend_type: Number
});

var Attendance = mongoose.model('Attendance', AttendanceSchema);

module.exports = Attendance;