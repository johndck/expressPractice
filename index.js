import express from 'express';
const PORT = process.env.PORT;
import router from './routes/routes.js';
import cors from 'cors';


// initialize express
const app = express();

// enable CORS from the REACT app's origin

app.use(cors({
  origin: 'http://localhost:5173', methods: ['GET', 'POST', 'PUT', 'DELETE'], allowedHeaders: ['Content-Type', 'Authorization', 'refresh-token']
}));




// Add a body parser
app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded


// Routes
app.use('/',router);



app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Add the ability to restart the server everytime we make a change
// This is how you do it
// Use the watch flag. - go into package.json and add:
// "start": "node index.js",
// "dev": "node --watch index.js"


// lets create a simple app route
// reference the env file without installing a 3rd party package.
// set the const variable to process.env.PORT
// Explicitly reference this in the package.json
// to start the server always use NPM RUN DEV.

// lets create a routes folder
// create a folder in the project

// Lets move the routes to a separate folder
/*
Holder some code to remind me of the post code basics

router.post('/api/add-post', (req, res) => {

const newPost = {
  id: posts.length + 1,
  title: req.body.title,
  content: req.body.content
};

if (!newPost.title || !newPost.content) {
  return res.status(400).json({ error: 'Title and content are required' });
};

posts.push(newPost);
res.status(201).json(newPost);
});




*/
