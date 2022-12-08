const express = require('express');
const router = express.Router();
const session = require('express-session');
const bodyparser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
const crypto = require('crypto');
const cors = require('cors');

router.use(cors({
    origin: '*'
  }));

router.use(session({
    key: 'ppap',
    secret: 'bimil',
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: 3600 * 8000
    }
}));

var db = require('../model/db');
const { use } = require('browser-sync');
const { setMaxListeners } = require('events');
const { isBuffer } = require('util');
// const { isObject } = require('angular');
require('../model/itemmodel');
require('../model/usermodel');
require('../model/imagemodel');
require('../model/beaconmodel');
require('../model/attendancemodel');
var ItemModel = db.model('Item');
var UserModel = db.model('User');
var ImageModel = db.model('Image');
var BeaconModel = db.model('Beacon');
var AttendanceModel = db.model('Attendance');

const _9hrs = 9 * 60 * 60 * 1000;

var storageImg = multer.diskStorage({
    destination: function(req, file, cb){
        const reg = /[\{\}\[\]\/?.,;:|\)*~`!^\-_+<>@\#$%&\\\=\(\'\"]/gi;
        const path = `public/upload-images/${req.session.usernumber}/${req.body.title.replace(reg, "")}/`;
        fs.mkdir(path, {recursive: true}, function(err){
            if(err)
                console.err('err' + err);
            else
                cb(null, path);
        });
    },
    filename: function(req, file, cb){
        cb(null, file.originalname);
    }
});

var storageImgPFP = multer.diskStorage({
    destination: function(req, file, cb){
        const path = `public/upload-images/${req.body.register_usernumber}/`;
        fs.mkdir(path, {recursive: true}, function(err){
            if(err)
                console.err('err' + err);
            else
                cb(null, path);
        });
    },
    filename: function(req, file, cb){
        cb(null, 'pfp');
    }
});

var upload = multer({
    storage: storageImg
});

var uploadpfp = multer({
    storage: storageImgPFP
});

router.use(bodyparser.urlencoded({extended: false}));

router.get('/', function (req, res, next){
    var data = {
        is_logined: req.session.is_logined, 
        logined_usernumber: req.session.usernumber, 
        logined_name : req.session.name,
        logined_phone : req.session.phone,
        is_admin: req.session.admin,
        logined_dep: req.session.department,
        item: "",
        user: "",
        beacon: ""
    };
    

    var bm = BeaconModel.find({});
    bm.exec(function(err, bdoc){
        if(bdoc != null)
            data['beacon'] = bdoc;
        
        var im = ItemModel.find({});
        im.exec(function (err, doc){
            if(err) console.error('err', err);

            if(doc != null){
                data['item'] = doc;

                if(req.session.admin){
                    UserModel.find({}, function(err, doc){
                        if(err) console.error('err', err);
                        if(doc != null){
                            data['user'] = doc;
                            res.render('index', data);
                        }
                    });
                }else{
                    res.render('index', data);
                }
            }
        });
    });
    
});

router.get('/getattend/:user_id/:item_oid/:beacon_oid', function(req, res, next){
    var user_id = req.params.user_id;

    var reqQuery = {
        user_id: user_id,
        item_oid: req.params.item_oid,
        beacon_oid: req.params.beacon_oid
    };

    console.log("getattend", reqQuery);

    AttendanceModel.find(reqQuery, function(err, doc){
        if(err) console.error('err', err);
        if(doc){
            console.log("있음");
            console.log(doc);
            res.json(doc);
        }else{
            console.log("no");
        }
    });
});

router.post('/app/getbeaconlist', function(req, res, next){
    var user_id = req.body.user_id;
 
    BeaconModel.find({item_oid: {$ne:null}, student: user_id}, function(err, doc){
        if(err) console.error('err', err);
        if(doc) {
            res.json(doc);
        }
        else    res.json(false);
    })
});

router.post('/app/attend', function(req, res, next){
    var user_id = req.body.user_id;
    var beacon_uuid = req.body.beacon_uuid.toUpperCase().trim();
    var beacon_major = req.body.beacon_major;
    var beacon_minor = req.body.beacon_minor;
    var attend_type = req.body.attend_type;

    var reqQuery = {
        uuid: beacon_uuid,
        major: beacon_major,
        minor: beacon_minor
    };

    console.log(reqQuery);

    BeaconModel.findOne(reqQuery, function(err, doc){
        console.log("beacon findone");
        if(err) console.error('err', err);
        if(doc){
            console.log("beacon found");
            var beacon_oid = doc._id.toString();
            var item_oid = doc.item_oid;

            var isClass = false;
            var isLate = false;
            var isRun = false;

            var now = new Date();
            now.setTime(now.getTime()+_9hrs);

            var t_begin_tol;
            var t_end_tol = new Date();
            var t_begin_crit = new Date();
            var t_end_crit = new Date();
            var t_end_crit_tol = new Date();

            // console.log(now);
            // console.log(now.getTime());
            // console.log("요일", now.getDay());
            // console.log("시간 분 초 ", now.getHours(), now.getMinutes(), now.getSeconds());

            var dayList = ['일', '월', '화', '수', '목', '금', '토'];
            doc.schedule.forEach(elem => {
                if(isClass) return false;

                t_begin_tol = new Date(now.getFullYear(), now.getMonth(), now.getDate()-now.getDay()+dayList.indexOf(elem[0]), 9+9, -15 + 90*(elem[1]-1));
                // t_begin_tol = new Date(now.getFullYear(), now.getMonth(), now.getDate()-now.getDay()+dayList.indexOf(elem[0]), 9+9, -15 + 90*(elem[1]-1) + 140);
                // t_end_tol.setTime(t_begin_tol.getTime()+ 750*60*1000);
                t_end_tol.setTime(t_begin_tol.getTime()+ 75*60*1000);

                // console.log("t begin tol", t_begin_tol);
                // console.log("now", now);
                // console.log("t end tol", t_end_tol);
                if(t_begin_tol.getTime() < now.getTime() && now.getTime() < t_end_tol.getTime()){
                    isClass = true;

                    t_begin_crit.setTime(t_begin_tol.getTime());
                    t_end_crit.setTime(t_begin_crit.getTime()+20*60*1000);
                    t_end_crit_tol.setTime(t_end_tol.getTime());

                    if(t_end_crit.getTime() < now.getTime() )
                        isLate = true;

                    if(now.getTime() < t_end_crit_tol.getTime())
                        isRun = true;

                    console.log("!!!!t beg crit", t_begin_crit);
                    console.log("!!!!t end crit", t_end_crit);

                    return false;
                }
            });
            console.log("isclass", isClass);
            console.log("islate", isLate);
            console.log("isrun", isRun);

            if(attend_type==1 && isClass){
                var Attendance = new AttendanceModel({
                    user_id: user_id,
                    item_oid: item_oid,
                    beacon_oid: beacon_oid,
                    rfid_oid: null,
                    attend_date: now.getTime(),
                    attend_type: (isLate)?200:2
                });

                Attendance.save(function (err, doc){
                    if(err) console.err('err', err);
                    if(doc) {
                        console.log("attend saved");
                        ItemModel.findOne({_id: item_oid}, function(err, doc){
                            if(err) console.error('err', err);
                            if(doc){
                                console.log(doc.title);
                                console.log("출석체크완료");
                                res.send(doc.title);
                            }else   console.log("cannot find item");
                        });
                    }
                    else{
                        console.log("출석체크실패");
                        res.send(false);
                    }   
                });
            }else if(attend_type==2){
                // console.log("attend_type is 2");

                // console.log("##begin tol", t_begin_tol);
                // console.log("##begin_crit", t_begin_crit);
                // console.log('##end_crit', t_end_crit);
                // console.log('##now', now);
                // console.log("##end_tol", t_end_tol);
                // console.log("##end crit tol", t_end_crit_tol);

                var reqQuery = {
                    user_id: user_id,
                    item_oid: item_oid,
                    beacon_oid: beacon_oid,
                    // attend_date: {$gte: t_begin_crit.getTime(), $lte: t_end_tol.getTime()},
                    attend_type: 2
                };
                var updateQuery = {
                    checkout_date: now.getTime(), 
                    attend_type: (isRun)?300:3
                };

                // console.log(reqQuery);
                AttendanceModel.update(reqQuery, {$set: updateQuery}, function(err, doc){
                    if(err) console.error('err', err);
                    if(doc) {
                        // console.log(doc);

                        ItemModel.findOne({_id: item_oid}, function(err, doc){
                            if(err) console.error('err', err);
                            if(doc){
                                // console.log(doc.title);
                                console.log("퇴실완료");
                                res.send(doc.title);
                            }
                        });
                    } else {
                        console.log("퇴실실패");
                        res.send(false);
                    }   
                });
            }else if(!isClass){
                console.log("무효 " + attend_type);
                res.send("ignore");
            }
        }else{
            console.log("없는 비콘");
            res.send(false);
        }
    });
});

router.get('/rfid', function(req, res, next){
    res.render('ECOSmartIDReaderWebServiceTest');
    // res.json('{}');
});

router.post('/mod', function(req, res, next){
    var Oid = require('mongodb').ObjectId;
    var item_obj_id = new Oid(req.body.oid);
    // var user_obj_id = new Oid(req.body.uid);
    var userno = req.body.uid;
    var is_del = req.body.type;

    var delUser = {
        $pull: {student: userno}
    }
    var addUser = {
        $addToSet: {student: userno}
    }
    var opt = (is_del=="true")?delUser:addUser;

    console.log(opt);

    ItemModel.update(
        {_id: item_obj_id}, 
        opt,
        // {upsert: true},
        function(err, doc){
            if(err){
                console.error('err', err);
                
            }
            if(doc) {
                console.log("Item model update");
                BeaconModel.update(
                    {item_oid: item_obj_id},
                    opt,
                    // {upsert: true},
                    function(err, doc){
                        if(err) console.error('err', err);
                        if(doc) {
                            console.log(doc);
                            res.send(true);
                        }
                    }
                );
            } else    res.send(false);
    });
});

router.get('/like/:id/:fav', function(req, res, next){
    var Oid = require('mongodb').ObjectId;
    var item_obj_id = new Oid(req.params.id);
    var is_fav = req.params.fav;
    var usr = req.session.usernumber;

    var y_fav = {
        $inc: {like_count: -1},
        $pull: {like_users: usr}
    }
    var n_fav = {
        $inc: {like_count: 1},
        $addToSet: {like_users: usr}
    }
    var fav_opt = (is_fav=="true")?y_fav:n_fav;

    ItemModel.update(
        {_id: item_obj_id}, 
        fav_opt,
        function(err, doc){
            if(err){
                console.error('err', err);
                
            }
            if(doc) res.send(true);
            else    res.send(false);
    });
});

router.get('/getitem', function(req, res, next){
    var Oid = require('mongodb').ObjectId;

    ItemModel.find({}, 
        function(err, doc){
            if(err){
                console.error('err', err);
                
            }
            res.send(doc);
    });
});

router.get('/getbeacon', function(req, res, next){
    BeaconModel.find({}, function(err, doc){
        if(err){
            console.error('err', err);
        }

        res.send(doc);
    });
});

router.get('/getuser', function(req, res, next){
    UserModel.find({}, function(err, doc){
        if(err) console.error('err', err);

        res.send(doc);
    })
});

router.get('/read/:id', function(req, res, next){
    var Oid = require('mongodb').ObjectId;
    var item_obj_id = new Oid(req.params.id);

    ItemModel.update(
        {_id: item_obj_id}, 
        {$inc: {hit: 1}},
        function(err, doc){
        if(err) console.error('err', err);
    });

    ItemModel.findOne({_id: item_obj_id}, function(err, doc){
        if(err) console.error('err', err);

        res.json(doc);
    });
});

router.get('/buy/:id', function(req, res, next){
    var Oid = require('mongodb').ObjectId;
    var item_obj_id = new Oid(req.params.id);

    var usr = req.session.username;
    var hp = req.session.phone;

    var reqItem = {
        buyer: {'name': usr, 'phone': hp}
    }

    ItemModel.update(
        {_id: item_obj_id}, 
        {$set: reqItem}, 
        {upsert: true},
        function(err, doc){
            if(err) console.error('err', err);
            if(doc) res.send(true);
            else    res.send(false);
        }
    );
});

router.post('/buy', function(req, res, next){

    var confirm = JSON.parse(req.body.confirm);
    var query_req = {_id: req.body.oid};
    var query_update = {};

    if(confirm){
        query_update['status'] = false;
    } else {
        query_update['buyer'] = {};
    }

    ItemModel.update(
        query_req, 
        {$set: query_update}, 
        // {upsert: true},
        function(err, doc){
            if(err) console.error('err', err);
            if(doc) res.send(true);
            else    res.send(false);
        }
    );
});

router.get('/delete/:id', function(req, res, next){
    var Oid = require('mongodb').ObjectId;
    var item_obj_id = new Oid(req.params.id);

    ItemModel.remove({_id: item_obj_id}, function(err, doc){
        if(err){
            console.error('err', err);
            
        }
        if(doc) res.send(true);
        else    res.send(false);
    });
});

router.post('/grant', function(req, res, next){
    var uid = req.body.uid;
    var op = req.body.type;
    var query_req = {_id: uid};


    var query_update = {admin: op};


    UserModel.update(query_req, {$set: query_update}, function(err, doc){
        if(err) console.error('err', err);
        if(doc) res.send(true);
        else    res.send(false);
    })
});

router.post('/delete', function(req, res, next){
    var type = req.body.type;
    var oid = req.body.oid;

    if(type=='user'){
        UserModel.remove({_id: oid}, function(err, doc){
            if(err)
                console.error("err", err);
            if(doc) res.send(true);
            else    res.send(false);
        });
    }
    if(type=='item'){
        ItemModel.findOne({_id: oid}, function(err,doc){
            if(err) console.error('err', err);
            if(doc){
                console.log(doc.beacon);
                if(doc.beacon){

                    BeaconModel.update({_id: doc.beacon.oid}, {$set: {item_oid:null, location: "", schedule: [], student: []}}, function(err, doc){
                        if(err) console.error('err', err);
                        if(doc) {
                            console.log(doc);
                            console.log("delete item info from beacon data");
                            ItemModel.remove({_id: oid}, function(err, doc){
                                if(err) console.error('err', err);
                                if(doc) res.send(true);
                                else    res.send(false);
                            });
                        }
                        else    console.log("couldnt remove item info from beacon data");
                    });
                }else{
                    ItemModel.remove({_id: oid}, function(err, doc){
                        if(err)
                            console.error('err', err);
                        if(doc) res.send(true);
                        else    res.send(false);
                    });
                }
            }
        });
    }
});

router.post('/delbeacon', function(req, res, next){
    var oid = req.body.oid;

    BeaconModel.remove({_id: oid}, function(err, doc){
        if(err)
            console.error('err', err);
        if(doc) res.send(true);
        else    res.send(false);
    });
});

router.post('/write', upload.any(), function (req, res, next) {
    var beacon = {
        oid: req.body.beaconID,
        uuid: req.body.beaconUUID,
        major: req.body.beaconMajor,
        minor: req.body.beaconMinor
    };
    var openingData = req.body.opening.split('.');
    var semester = {
        year : openingData[0],
        semester : parseInt(openingData[1]/6)
    };

    var Item = new ItemModel({
        title: req.body.title,
        content: req.body.content,
        manager: req.session.name,
        managerno: req.session.usernumber,
        phone : req.session.phone,
        location: req.body.location,
        days: req.body.days.split(','),
        rfid: req.body.rfid,
        beacon: beacon,
        opening: req.body.opening,
        semester: semester,
        status: req.body.status,
        tag: JSON.parse(req.body.tag),
        image: req.files,
    });

    Item.save(function (err, doc) {
        if(err) {
            console.error('err', err);
            
        }
        if(doc) {
            var reqQuery = {
                item_oid: doc._id,
                location: req.body.location,
                schedule: req.body.days.split(',')
            }
            BeaconModel.update(
                {_id: beacon.oid},
                {$set: reqQuery},
                function(err, doc){
                    if(err) console.error('err', err);
                    if(doc) res.send(true);
                }
            );
        }
        else    res.send(false);
        
    });

});

router.post('/update', upload.any(), function(req, res, next){
    var beacon = {
        oid: req.body.beaconID,
        uuid: req.body.beaconUUID,
        major: req.body.beaconMajor,
        minor: req.body.beaconMinor
    };

    console.log(beacon);

    var openingData = req.body.opening.split('.');

    console.log(openingData);

    var semester = {
        year : openingData[0],
        semester : parseInt(openingData[1]/6)
    };

    console.log(semester);

    var reqItem = {
        title: req.body.title,
        content: req.body.content,
        location: req.body.location,
        days: req.body.days.split(','),
        rfid: req.body.rfid,
        beacon: beacon,
        opening: req.body.opening,
        semester: semester,
        status: req.body.status,
        tag: JSON.parse(req.body.tag),
        image: req.files,
    };

    console.log(reqItem);

    ItemModel.update(
        {_id: req.body._id}, 
        {$set: reqItem}, 
        // {upsert: true},
        function(err, doc){
            if(err) console.error('err', err);
            if(doc) {
                console.log("found item");
                var reqQuery = {
                    item_oid: req.body._id,
                    location: req.body.location,
                    schedule: req.body.days.split(',')
                }
                console.log(reqQuery);
                BeaconModel.update(
                    {_id: beacon.oid},
                    {$set: reqQuery},
                    function(err, doc){
                        if(err) console.error('err', err);
                        if(doc){
                            console.log("update done");
                            res.send(true);
                        } 
                    }
                );
            }
            else    res.send(false);
        }
    );
});

router.post('/review', function(req, res, next){
    var Oid = require('mongodb').ObjectId;
    var item_obj_id = new Oid(req.body._id);

    var content = req.body.review_content;
    var rate = req.body.review_rate;
    var query_update = {
        review: { 'content': content, 'rate': rate }
    }

    ItemModel.update(
        {_id: item_obj_id},
        {$set: query_update},
        {upsert: true},
        function(err, doc){
            if(err) console.error('err', err);
            if(doc) res.send(true);
            else    res.send(false);

        }
    );
});

router.post('/register', uploadpfp.single('register_pfp'), function (req, res, next) {
    var hash_pw = crypto.createHash("sha512").update(req.body.register_password).digest("hex");
    // var usr = req.body.register_usernumber.toLowerCase();
    

    // DB model create & save.
    var User = new UserModel({
        usernumber: req.body.register_usernumber,
        password: hash_pw,
        name: req.body.register_name,
        phone: req.body.register_phone,
        department: req.body.register_department,
        rfid: req.body.register_rfid,
        pfp: req.file,
        admin: false
    });

    UserModel.findOne({}, function(err, doc){
        if(err)
            console.error('err', err);
        
        if(!doc)
            User.admin = true;

        UserModel.findOne({usernumber: req.body.usernumber}, function(err, doc){
            if(err)
                console.error('err', err);
    
            if(!doc) {
                User.save(function (err, res) {
                    if(err)
                        console.error('err', err);
                });
                res.send(true)
            } else {
                res.send(false);
            }
        });
    });        
});

router.post('/addbeacon', function (req, res, next) {

    var Beacon = new BeaconModel({
        uuid: req.body.uuid,
        major: req.body.major,
        minor: req.body.minor
    });
    
    Beacon.save(function (err, doc) {
        if(err) {
            console.error('err', err);
            
        }
        if(doc) res.send(true);
        else    res.send(false);
        
    });
    
});

router.post('/login', function(req, res, next) {
    var hash_pw;
    var usr;

    var reqQuery = {
        
    };

    if(req.body.login_password && req.body.login_usernumber){
        hash_pw = crypto.createHash("sha512").update(req.body.login_password).digest("hex");
        usr = req.body.login_usernumber;

        reqQuery['usernumber'] = usr;
        reqQuery['password'] = hash_pw;
    }else if(req.body.rfid){
        reqQuery['rfid'] = req.body.rfid;
    }

    console.log("Login reqQuery ", reqQuery);

    UserModel.findOne(reqQuery, function(err, doc){
        if(err) console.error('err', err);

        if(doc) {
            req.session.is_logined = true;
            req.session.usernumber = doc.usernumber;
            req.session.name = doc.name;
            req.session.phone = doc.phone;
            req.session.admin = doc.admin;
            req.session.department = doc.department;
            req.session.rfid = doc.rfid;

            req.session.save(function(){
                res.send(true);
            });
        } else {
            res.send(false);
        }
    });
});

router.get('/logout', function(req, res, next){
    req.session.destroy();
    res.clearCookie("ppap");

    res.redirect('/');
});

module.exports = router;