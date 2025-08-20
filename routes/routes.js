import express from 'express';
const router = express.Router();


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

// create a posts routes

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




export default router;