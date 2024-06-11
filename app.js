require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
const port = process.env.PORT || 3000;
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const app = express();



app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

//session
app.use(session(
    {
      secret:"iamthesecret",
      resave:false,
      saveUninitialized:false
    }
  ));
  //passport
  app.use(passport.initialize());
  app.use(passport.session());



const uri = process.env.DB;
mongoose.connect(uri)
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('Failed to connect to MongoDB:', err));

// Mongoose Schema for Questions and Answers
const UserSchema = new mongoose.Schema({
    username: String,
    password: String,
  });
  //passport-mongoose-local
UserSchema.plugin(passportLocalMongoose);

//model
const User = mongoose.model("User", UserSchema);
const qaSchema = new mongoose.Schema({
    question: String,
    answers: [{ type: String }]
});
 
const QAColl = mongoose.model("QAColl", qaSchema);

//create strategy using passport from mongoose
passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//for login and all
app.get("/register",async (req,res)=>{
    res.render('register');
   
})
app.get('/login',async(req,res)=>{
    res.render("login");
})

app.get('/logout', function(req, res, next){
    req.logout(function(err) {
      if (err) { return next(err); }
      res.redirect('/login');
    });
  });

// Route to display list of questions (homepage)
app.get("/", async function (req, res) {
    if(req.isAuthenticated()){
        const page = req.query.page?parseInt(req.query.page):1;
    const perpage = 10;
    const skip = (page - 1)*perpage;
    const questions = await QAColl.find().skip(skip).limit(perpage);
    const totalRecord = await QAColl.countDocuments();
    const totalPages = Math.ceil(totalRecord/perpage)
    res.render("questions", { questions: questions,totalPages,currentPage:page });
      }
      else{
        res.redirect("/login");
      }
    
});

// Route to display individual question page
app.get("/questions/:id", async function (req, res) {
    if(req.isAuthenticated()){
        const questionId = req.params.id;
    const question = await QAColl.findById(questionId);
 const limitedAnswers = question.answers.slice(0,6);
    res.render("answers", { question: question,answers:limitedAnswers });
      }
      else{
        res.redirect("/login");
      }
   
});


// Route to render form for posting new question
app.get("/ask", function (req, res) {
    if(req.isAuthenticated()){
        res.render("ask");
      }
      else{
        res.redirect("/login");
      }
   
});

// Route to handle posting new question
app.post("/ask", async function (req, res) {
    if(req.isAuthenticated()){
        const newQuestion = new QAColl({
            question: req.body.question,
            answers: []
        });
        await newQuestion.save();
        res.redirect("/"); // Redirect to the home page
      }
      else{
        res.redirect("/login");
      }
   
});

// Route to handle posting new answer to a question
app.post("/questions/:id/answer", async function (req, res) {
    if(req.isAuthenticated()){
        const questionId = req.params.id;
        const answer = req.body.answer;
        await QAColl.findByIdAndUpdate(questionId, { $push: { answers: answer } });
        res.redirect("/questions/" + questionId);
      }
      else{
        res.redirect("/login");
      }
 
    
});
app.post("/register", async (req, res) => {
    try{
      await User.register({username:req.body.username},req.body.password);
      passport.authenticate("local")(req,res,()=>{
        res.redirect("/");
      })
    }
    catch(err){
      console.log(err);
      res.redirect("/register");
    }
  
    
  
  });
  app.post("/login", async (req, res) => {
  
   const user = new User({
    username:req.body.username,
    password:req.body.password
  
   });
   req.logIn(user,(err)=>{
    if(err){
      console.log(err);
      res.redirect("/login");
    }
    else{
    passport.authenticate('local')(req,res,()=>{
      res.redirect("/");
    })
    }
   })
  
  });
  

app.listen(port, function () {
    console.log(`Server started on port ${port}`);
});
