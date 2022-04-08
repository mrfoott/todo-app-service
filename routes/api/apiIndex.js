const { response } = require('express');
const express = require('express');
const router = express.Router();
const sha256 = require('js-sha256');


// mongodb init
const { MongoClient, ObjectId } = require('mongodb');
const url = 'mongodb+srv://dongian:dongian@todo-react.xwfyr.mongodb.net/todoreact?retryWrites=true&w=majority'
let client;
MongoClient.connect(url, 
    {useUnifiedTopology: true}, (err, cli) => {client = cli; console.log('client connected')});

// authen
router.get('/authen', (req, res) => {
    console.log('authen is: ' + req.session.authen);
    if (!req.session.authen)
        return res.status(200).json({token: ''});
    return res.status(200).json({token: req.session.authen});
});

// register
router.post('/register', (req, res) => {
    const {name, username, password} = req.body;
    
    const user = client.db('todoreact').collection('user');
    user.findOne({username: username})
    .then(result => {
        if (result)
            return res.status(500).json({error: true, message: 'Username is occupied'});
        
        
        user.insertOne({name, username, password: sha256(password)}, (err, result) => {
            if (err)
                return res.status(500).json({error: true, message: err.message});
            const tasks = client.db('todoreact').collection('tasks');
            tasks.insertOne({usernameId: result.insertedId, name: name}, (err, result) => {
                return res.status(200).json({error: false, message: 'success'});
            });
        })
    })
})

// login
router.post('/login', (req, res) => {
    const {username, password} = req.body;

    const user = client.db('todoreact').collection('user');
    user.findOne({username: username, password: sha256(password)})
    .then(result => {
        if (!result)
            return res.status(500).json({error: true, message: 'failed'});
        
        req.session.authen = result._id;
        return res.status(200).json({error: false, message: 'success', token: req.session.authen});
    })
    
})

// get task list
router.get('/get-task', (req, res) => {
    const token = req.query.token;

    const tasks = client.db('todoreact').collection('tasks');
    tasks.findOne({usernameId: new ObjectId(token)})
    .then(result => {
        const taskList = result.taskList;
        const username = result.name;
        return res.status(200).json({taskList: JSON.stringify(taskList), userName: username});
    })
})

// add task
router.post('/add-task', (req, res) => {
    const token = req.query.token;
    const task = req.body.task;
    const tasks = client.db('todoreact').collection('tasks');

    tasks.updateOne(
        {usernameId: new ObjectId(token)}, 
        {$push: {"taskList": task}}
        )
    .then(result => {
        res.status(200).json({error: false});
    })
    .catch(error => {
        res.status(500).json({error: true, message: error.message});
    })
})

//delete task
router.delete('/delete-task', (req, res) => {
    const {token, taskname} = req.query;

    const tasks = client.db('todoreact').collection('tasks');
    tasks.updateOne(
        {usernameId: new ObjectId(token)},
        {$pull: {taskList: {
            taskName: taskname
        }}}
    )
    .then(result => {
        res.status(200).json({error: false});
    })
    .catch(error => {
        res.status(500).json({error: true});
    })
})

// edit task
router.put('/edit-task', (req, res) => {
    const {token, taskname} = req.query;
    const {taskName, taskDescription, alarm, priority} = req.body;
    const tasks = client.db('todoreact').collection('tasks');
    tasks.updateOne(
        {usernameId: new ObjectId(token), 'taskList.taskName': taskname},
        {$set: {
            'taskList.$.taskName': taskName,
            'taskList.$.taskDescription': taskDescription,
            'taskList.$.alarm': alarm,
            'taskList.$.priority': priority
    }})
    .then(result => {
        res.status(200).json({error: false});
    })
    .catch(error => {
        res.status(500).json({error: true});
    })
})

module.exports = router;



// password mongod: hxlzKSbFzXxMF45j
// username: todoreact

// url: mongodb+srv://<username>:<password>@cluster0.uzsxi.mongodb.net/myFirstDatabase?retryWrites=true&w=majority

// mongodb+srv://dongian:dongian@todo-react.xwfyr.mongodb.net/myFirstDatabase?retryWrites=true&w=majority