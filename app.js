require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
const port = process.env.PORT || 3000;

const app = express();
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

const uri = process.env.DB;
mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('Failed to connect to MongoDB:', err));

// Mongoose Schema for Questions and Answers
const qaSchema = new mongoose.Schema({
    question: String,
    answers: [{ type: String }]
});
 
const QAColl = mongoose.model("QAColl", qaSchema);

// Route to display list of questions (homepage)
app.get("/", async function (req, res) {
    const page = req.query.page?parseInt(req.query.page):1;
    const perpage = 10;
    const skip = (page - 1)*perpage;
    const questions = await QAColl.find().skip(skip).limit(perpage);
    const totalRecord = await QAColl.countDocuments();
    const totalPages = Math.ceil(totalRecord/perpage)
    res.render("questions", { questions: questions,totalPages,currentPage:page });
});

// Route to display individual question page
app.get("/questions/:id", async function (req, res) {
    const questionId = req.params.id;
    const question = await QAColl.findById(questionId);
 const limitedAnswers = question.answers.slice(0,6);
    res.render("answers", { question: question,answers:limitedAnswers });
});


// Route to render form for posting new question
app.get("/ask", function (req, res) {
    res.render("ask");
});

// Route to handle posting new question
app.post("/ask", async function (req, res) {
    const newQuestion = new QAColl({
        question: req.body.question,
        answers: []
    });
    await newQuestion.save();
    res.redirect("/"); // Redirect to the home page
});

// Route to handle posting new answer to a question
app.post("/questions/:id/answer", async function (req, res) {
    const questionId = req.params.id;
    const answer = req.body.answer;
    await QAColl.findByIdAndUpdate(questionId, { $push: { answers: answer } });
    res.redirect("/questions/" + questionId);
    
});

app.listen(port, function () {
    console.log(`Server started on port ${port}`);
});
