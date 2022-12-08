var mongoose = require('mongoose');

var UserSchema = new mongoose.Schema({
    usernumber: {
        type: String,
        unique: true
    },
    password: String,
    name: String,
    department: String,
    phone: String,
    rfid: String,
    admin: Boolean,
    pfp: mongoose.Schema.Types.Mixed,
    regdate: {
        "type": Date,
        "default": Date.now
    }
});

var User = mongoose.model('User', UserSchema);

module.exports = User;