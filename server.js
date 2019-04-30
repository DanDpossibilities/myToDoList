var express = require('express');
var app = express();
//var session = require('express-session')
var bcrypt = require("bcrypt")
// const jwt = require("jsonwebtoken")
'use strict';
// var sessionStorage = require('sessionstorage');
    // getItem(key)
    // setItem(key, value)
    // removeItem(key)
    // clear()

// app.use(session({
//     secret: 'superDan',
//     resave: false,
//     saveUninitialized: true,
//     cookie: { maxAge: 60000 }
// }))

app.use(express.static( __dirname + '/public/dist/public' ));

var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/myToDoList');

var GoalSchema = new mongoose.Schema({
    category: {type: String, required: true},
    title: {type: String, required: true},
    description: {type: String},
    completed: {type: Boolean, default: false},
    sub_goals: {type: Array},
    due_date: {type: Date},
    created_at: {type: Date, default: Date.now},
    updated_at: {type: Date, default: Date.now}
})

var PylUserSchema = new mongoose.Schema({
    first_name:  { type: String, required: true, minlength: 3},
    last_name:  { type: String, required: true, minlength: 3},
    password:  { type: String, required: true, minlength: 6},
    email: { type: String, required: true, minlength: 5, unique: true,
        validate: {validator: function(v){
            return /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(v);
        }, message: props => `${props.value} is not a valid email.`},
    },
    goals: [{type: String}]
}, {timestamps: true });

mongoose.model('PylUser', PylUserSchema); 
var PylUser = mongoose.model('PylUser')

mongoose.model('Goal', GoalSchema); 
var Goal = mongoose.model('Goal') 

// var path = require('path');
// app.use(express.static(path.join(__dirname, './static')));

const flash = require('express-flash');
app.use(flash());


var bodyParser = require('body-parser');
app.use(bodyParser.json());
//app.use(bodyParser.urlencoded({extended: true}))  when client sends data from form

function processData(res, err, data) {
    if (err) {
        res.json(err)
    } else {
        console.log(data)
        res.json(data)
    }
}
//&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&& GOAL ROUTES
// GET: Retrieve all Goals
app.get('/goals', function(req, res) {
    Goal.find({}, (err, data) => processData(res, err, data))
})
// GET: Retrieve a Goal by ID
app.get('/goals/:id', function(req, res) {
        Goal.findOne({_id: req.params.id}, (err, data) => processData(res, err, data))
})
// GET: Retrieve a Goal by Category
//7777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777777
// need to get goals by user id
app.get('/goals/category/:category/:user', function(req, res) {
    PylUser.findOne({_id: req.params.user})
    .then(user => {

        var goals = user.goals;
        Goal.find({_id: {$in: goals}, category: req.params.category}, 
            (err, data) => processData(res, err, data))
    })
    .catch(err => {
        return res.status(401).json({
            message: "Errors finding user, please try again."
        });
    })
    // Goal.find({category: req.params.category}, (err, data) => processData(res, err, data))
})
// POST: Create a Goal
app.post('/goals', function(req, res) { 
    Goal.create({category: req.body.new_goal.category,
                title: req.body.new_goal.title,
                due_date: req.body.new_goal.due_date,
                description: req.body.new_goal.description,
                sub_goals: req.body.new_goal.sub_goals,
                completed: req.body.new_goal.completed}, (err, data) =>{ 
                    if (err) {
                        res.json(err)
                    } else { 
                        PylUser.updateOne({_id: req.body.new_goal.user}, 
                            {$push: {goals: data._id}}) // need command for pushing into an array for mongoose
                        .then(updatedUser => {
                            console.log(updatedUser)
                            return res.status(201).json({
                                success: "User updated!",
                                result: updatedUser
                            });
                        })
                        .catch(err => {
                            // if (err.code == 11000) { // duplicate error
                            //     return res.status(500).json({
                            //         message: "Email is already taken!"
                            //     });
                            // } // not needed?
                            return res.status(401).json({
                                message: "Errors in applying goal to user, please try again."
                            });
                        })
                        console.log(data)
                        res.json(data)
                    }
                });
})
// PUT: Update a Goal by ID
app.patch('/goals/:id', function(req, res) {
    console.log(`${req.params.id} params`)
    console.log(req.body.updatedGoal)
    // take out req.body.updatedGoal.user and compare user id to goal id to validate
    // Goal.findOneAndUpdate({_id: req.params.id}, (err, data) => processData(res, err, data))
    Goal.findOneAndUpdate({_id: req.params.id}, {title: req.body.updatedGoal.title,
                                                    category: req.body.updatedGoal.category,
                                                    due_date: req.body.updatedGoal.due_date,
                                                    description: req.body.updatedGoal.description,
                                                    sub_goals: req.body.updatedGoal.sub_goals,
                                                    completed: req.body.updatedGoal.completed}, 
                                                    {new: true, runValidators: true},
                                                    (err, data) => processData(res, err, data))
})

// DELETE: Delete a Goal by ID
app.delete('/goals/:id/', function(req, res) {
    Goal.remove({_id: req.params.id}, (err, data) => processData(res, err, data))
})

//////////////////// REGISTRATION ROUTES

app.get('/', function(req, res) {
    res.render('index')
})

app.post('/new_registration', function (req, res){
    console.log(req.body.new_registration)
    if(req.body.new_registration.password.length <6){
        return res.status(401).json({
            message: "Password must be at least 6 characters long."
        });
    }
    bcrypt.hash(req.body.new_registration.password, 10)
    .then(hashed_password => {
        console.log(hashed_password)
        PylUser.create({
            first_name: req.body.new_registration.first_name,
            last_name: req.body.new_registration.last_name,
            email: req.body.new_registration.email,
            birthday: req.body.new_registration.birthday,
            password: hashed_password,
            goals: req.body.new_registration.goals
        })
        .then(registration => {
            console.log(registration)
            // sessionStorage.setItem(pylUser, registration._id)
            // req.session.pylUser = registration._id
            // console.log(req.session.pylUser)
            return res.status(201).json({
                success: "User created!",
                result: registration
            });
        })
        .catch(err => {
            if (err.code == 11000) { // duplicate error
                return res.status(500).json({
                    message: "Email is already taken!"
                });
            } 
            return res.status(401).json({
                message: "Errors in registration, please try again."
            });
        })
    })
    .catch(err => {
        // Clean this .catch up? not using registration. pass message: instead
        console.log(err)
        for(var key in err.errors){
            req.flash('registration', err.errors[key].message);
        }
        return res.status(401).json({
            error: err
        });
    })
})

app.post("/login", (req, res, next) => {
    let fetchedUser;
    PylUser.findOne({ email: req.body.new_login.email })
        .then(user => {
            if (!user) {
                return res.status(401).json({
                message: "Authentication failed, Please try again."
            });
        }
        fetchedUser = user;
        return bcrypt.compare(req.body.new_login.password, user.password);
    })
        .then(result => {
            if (!result) {
                return res.status(401).json({
                    message: "Authentication failed, Please try again."
                });
            }
            // const token = jwt.sign(
            // { email: fetchedUser.email, userId: fetchedUser._id },
            // "daniel_super_secret_that_should_be_longer__--||",
            // { expiresIn: "1h" }
            // );
            res.status(200).json({
                user: fetchedUser._id,
                //token: token
        });
    })
    .catch(err => {
        return res.status(401).json({
            message: "Authentication failed, Please try again.",
        });
    });
});
////////////////////////////////////////////////////////////////////////////////////////////////////
app.put('/updateUser/:id', function (req, res){
    console.log(req.body.edit_user)
    if(req.body.edit_user.password.length <6){
        return res.status(401).json({
            message: "Password must be at least 6 characters long."
        });
    }
    bcrypt.hash(req.body.edit_user.password, 10)
    .then(hashed_password => {
        console.log(hashed_password)
        PylUser.updateOne({_id: req.params.id}, 
            {first_name: req.body.edit_user.first_name,
            last_name: req.body.edit_user.last_name,
            email: req.body.edit_user.email,
            password: hashed_password,
            goals: req.body.edit_user.goals
        }, {new: true, runValidators: true})
        .then(updatedUser => {
            console.log(updatedUser)
            return res.status(201).json({
                success: "User updated!",
                result: updatedUser
            });
        })
        .catch(err => {
            if (err.code == 11000) { // duplicate error
                return res.status(500).json({
                    message: "Email is already taken!"
                });
            } 
            return res.status(401).json({
                message: "Errors in registration, please try again."
            });
        })
    })
    .catch(err => {
        // Clean this .catch up? not using registration. pass message: instead
        console.log(err)
        for(var key in err.errors){
            req.flash('registration', err.errors[key].message);
        }
        return res.status(401).json({
            error: err
        });
    })
})

/////////////////////////////////////////////////////////////////////////////////////////////////////
app.get('/show/:id', function(req, res) {
    PylUser.find({_id: req.params.id}, function(err, registrations){
        console.log("&&&&&&&&&&&&&&&&&&")
        if(err !== null){
            console.log('Caught error: ' + String(error));
            res.status(401).json({
                error: err
            });
        }
        res.status(201).json({
            message: "Account details!",
            result: registrations
        });
    })
})

// maybe make this a delete route instead of get
app.delete('/registrations/delete/:id', function(req, res) {
    console.log("log something here")
    PylUser.remove({_id: req.params.id}, function(err){
        if(err !== null){
            console.log('Caught error: ' + String(error));
            res.status(401).json({
                error: err
            });
        }else{
            // sessionStorage.clear();
            // req.session.destroy();
            res.status(201).json({
                message: "Account deleted.  Good luck!",
            });
        }
    })
})

app.listen(8000, function() {
    console.log("listening on port 8000");
})
