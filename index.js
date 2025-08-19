import express from 'express';
const PORT = process.env.PORT;


// initialize express
const app = express();

// respond to a get request
app.get('/', (req, res) => {
  res.send('Hello World is this working !');
});
//respond to another get
app.get('/about', (req, res) => {
  res.send('About Page');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Add the ability to restart the server everytime we make a change
// This is how you do it
// Use the watch flag. - go into package.json and add:
// "start": "node index.js",
// "dev": "node --watch index.js"


// lets create a simple app route

let posts = [
  { id: 1, title: 'Post 1', content: 'Content for post 1' },
  { id: 2, title: 'Post 2', content: 'Content for post 2' },
  { id: 3, title: 'Post 3', content: 'Content for post 3' }
];

app.get('/api/posts', (req, res) => {
  res.json(posts);
});

// reference the env file without installing a 3rd party package.
// set the const variable to process.env.PORT
// Explicitly reference this in the package.json
// to start the server always use NPM RUN DEV.

// lets create a routes folder
// create a folder in the project

