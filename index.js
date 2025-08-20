import express from 'express';
const PORT = process.env.PORT;
import router from './routes/routes.js';


// initialize express
const app = express();

// Add a body parser
app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: false })); // For parsing application/x-www-form-urlencoded


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
