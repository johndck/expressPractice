import express from 'express';
const router = express.Router();
import fetch from 'node-fetch';


// respond to a get request
router.get('/', (req, res) => {
  res.send('Hello World is this working !');
});
//respond to another get
router.get('/about', (req, res) => {
  res.send('About Page');
});

// respond to another get request
router.get('/another', (req, res) => {
  res.send(`<h1>Yes you are getting the routes now!</h1>`);
});

let posts = [
  { id: 1, title: 'Post 1', content: 'Content for post 1' },
  { id: 2, title: 'Post 2', content: 'Content for post 2' },
  { id: 3, title: 'Post 3', content: 'Content for post 3' }
];

router.get('/api/posts', (req, res) => {
  res.json(posts);
});

// lets create a test add new user request to Supabase

router.post ('/api/signup', async (req,res) =>{

try{
// extract email and password sent through
//destruction the req.body
const { email, password } = req.body;

if (!email || !password) {
  return res.status(400).json({ error: 'Email and password are required' });
}

// build the user object
 const newUser = {
    email: email,
    password: password
  };

// set the Supabase endpoint and creds

const SUPABASE_URL=process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY=process.env.SUPABASE_SERVICE_ROLE_KEY;

// Check that we have a service role key

if(!SUPABASE_SERVICE_ROLE_KEY){
  return res.status(500).json({ error: 'Internal Server Error' });
}
}

catch (error){
    console.error(`Error creating user`, error);
    res.status(500).json({ error: 'Internal Server Error' });
}


});





export default router;