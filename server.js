var express = require('express');
var app = express();
var session = require('express-session')
var bcrypt = require("bcrypt")

app.use(session({
    secret: 'superDan',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 60000 }
}))

app.use(express.static( __dirname + '/public/dist/public' ));

var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/myToDoList');

var GoalSchema = new mongoose.Schema({
    title: {type: String, required: true},
    category: String,
    due_date: {type: Date},
    description: {type: String, default: ''},
    completed: {type: Boolean, default: false},
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
    birthday: {type: Date, required: true},
    goals: [GoalSchema]
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

function handleData(res, err, data) {
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
    Goal.find({}, (err, data) => handleData(res, err, data))
})
// GET: Retrieve a Goal by ID
app.get('/goals/:id', function(req, res) {
        Goal.find({_id: req.params.id}, (err, data) => handleData(res, err, data))
})
// POST: Create a Goal
app.post('/goals', function(req, res) {
    console.log(req)
    console.log("POST DATA", req.body);
    Goal.create({
        title: req.body.title,
        description: req.body.description,
        completed: req.body.completed
        }, (err, data) => handleData(res, err, data))
})
// PUT: Update a Goal by ID
app.put('/goals/:id', function(req, res) {
    Goal.updateOne({_id: req.params.id}, (err, data) => handleData(res, err, data))
})

// DELETE: Delete a Goal by ID
app.delete('/goals/:id/', function(req, res) {
    Goal.remove({_id: req.params.id}, (err, data) => handleData(res, err, data))
})

//////////////////// REGISTRATION ROUTES

app.get('/', function(req, res) {
    res.render('index')
})

app.post('/new_registration', function (req, res){
    if(req.body.password.length <6){
        req.flash('registration', "Password is too short");
        res.redirect('/');
    }
    bcrypt.hash(req.body.password, 10)
    .then(hashed_password => {
        console.log(hashed_password)
        PylUser.create({
            first_name: req.body.first_name,
            last_name: req.body.last_name,
            email: req.body.email,
            birthday: req.body.birthday,
            password: hashed_password
        })
        .then(registration => {
            console.log(registration)
            res.redirect(`/show/${registration._id}`)
        })
        .catch(err => {
            if (err.code == 11000) { // duplicate error
                req.flash("registration", "Email is taken!")
                res.redirect("/")
            } else {
                for(var key in err.errors){
                    req.flash('registration', err.errors[key].message);
                }
                res.redirect('/');
            }
        })
    })
    .catch(err => {
        console.log(err)
    })
})

app.post('/login', function (req, res){
    Registration.findOne({email: req.body.email}, function(err, logins){
        let theOne = logins

        if(err){ 
            console.log("We have an error -----------------------------------!", err);
            for(var key in err.errors){
                req.flash('registration', err.errors[key].message);
            }
            res.redirect('/');
        }
        else {
            bcrypt.compare(req.body.password, theOne.password, (error, result) => {
                console.log(result)
                console.log(theOne)
                if(result == true){
                    req.session.client = theOne._id;
                    res.redirect(`/show/${theOne._id}`);
                }else{
                    req.flash('registration', `Please try again.`);
                    res.redirect('/');
                }
            })
        }
    });
});

app.get('/show/:id', function(req, res) {
    PylUser.find({_id: req.params.id}, function(err, registrations){
        console.log("&&&&&&&&&&&&&&&&&&")
        if(err !== null){
            console.log('Caught error: ' + String(error));
            res.redirect('/');
        }
        res.render('show', {user: registrations});
    })
})

app.get('/registrations/delete/:id', function(req, res) {
    PylUser.remove({_id: req.params.id}, function(err){
        if(err !== null){
            console.log('Caught error: ' + String(error));
            res.redirect('/');
        }else{
            req.session.destroy();
            res.redirect('/');
        }
    })
})

app.listen(8000, function() {
    console.log("listening on port 8000");
})
