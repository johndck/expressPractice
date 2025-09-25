import express from 'express';
const router = express.Router();
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';


const SUPABASE_URL=process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY=process.env.SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);


// respond to a get request
router.get('/', (req, res) => {
  res.send('Your server is up and running!');
});
//respond to another get
router.get('/about', (req, res) => {
  res.send('You have reached the about page');
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
const SUPABASE_SERVICE_ROLE_KEY=process.env.SERVICE_ROLE_KEY;

// Check that we have a service role key

if(!SUPABASE_SERVICE_ROLE_KEY){
  return res.status(500).json({ error: 'Supabase Service Role key is missing' });
}

// Do the fetch to the Supabase URL

const response = await fetch (
`${SUPABASE_URL}/auth/v1/signup`, {
method: 'POST',
headers:{
'Content-Type': 'application/json',
'apikey': SUPABASE_SERVICE_ROLE_KEY,
'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
},
body: JSON.stringify(newUser),
}
);

// Log the full response to see the status and headers
    console.log('Supabase Response Status:', response.status);
    console.log('Supabase Response Headers:', response.headers.get('content-type'));


// Parse the response

const data = await response.json();

if (!response.ok){
    console.error('Supabase Error Data:', data);
return res.status(response.status).json({ error: data.message || 'Failed to create user' });
}

// Return success response

res.status(response.status).json({
      message: 'User created successfully',
      user: data.user,
      session: data.session,
    });


    console.log('New user created:', {
      message: 'User created successfully',
      user: data.user,
      session: data.session,
    });
}



catch (error){
    console.error(`Error creating user`, error);
    res.status(500).json({ error: 'Internal Server Error you code is working' });
}


});


// Here is the route for login
// Using the supabase client 

router.post('/api/login', async(req,res)=>{

try{

const { email, password } = req.body;

if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
const {data,error} = await supabase.auth.signInWithPassword({
  email,
  password
});

if (error) {
      return res.status(401).json({ error: error.message });
    }

    res.status(200).json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user: data.user,
    });

    console.log(`User logged in:`, {
      email: data.user.email,
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token
    });

}
catch(err){

  console.error('Login error:', err);
  res.status(500).json({ error: 'Internal server error during login' });

}

}


);

// Add in a line of code to validate the authenticity if the JWT
// Run through this tonight - Tuesday & post updated code to check 


// Here is the route to check if MFA is enabled for a user

router.post('/api/mfa/check', async (req, res) => {

// make sure there is a valid access token, otherwise return an error
const accessToken = req.headers['authorization']?.split(' ')[1];
if (!accessToken) {
  return res.status(401).json({ error: 'Access token is required' });
}

try {

// Get the user object from Supabase using the access token
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    if (userError || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    console.log('Your User authenticated is:', user);

// Check for enrolled MFA factors
    const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
    if (factorsError) {
      return res.status(500).json({ error: `Failed to fetch MFA factors: ${factorsError.message}` });
    }

    console.log('MFA factors for user:', user.id, factors);
    res.status(200).json({ factors });
 
}
catch(err){

  console.error('Something has gone wrong with the mfa check:', err);
  res.status(500).json({ error: 'Internal server error during MFA check' });  

}
});

// Here is the route to enrol the user into MFA
// add in later the check to see if the user already has MFA enabled


router.post('/api/mfa/enrol', async(req,res)=>{


const accessToken = req.headers['authorization']?.split(' ')[1];
const refreshToken = req.headers['refresh-token']; // Extract custom header
if (!accessToken) {
  return res.status(401).json({ error: 'Access token is required' });
}

const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
if (userError || !user) {
  return res.status(401).json({ error: 'Invalid or expired token' });
}
console.log('Your User authenticated is working:', user);


  try{

  const { error: sessionError } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    if (sessionError) {
      console.error('Failed to set session:', sessionError);
      return res.status(500).json({ error: `Failed to set session: ${sessionError.message}` });
    }


  const { data: enrollData, error: enrollError } = await supabase.auth.mfa.enroll({factorType: 'totp'});
      if (enrollError) {
      return res.status(500).json({ error: `Failed to enroll MFA: ${enrollError.message}` });
      }
  const qrCodeSvg = enrollData?.totp?.qr_code;
  const factorId = enrollData?.id;
  const sharedSecret = enrollData?.totp?.secret;
  
  res.status(200).json({ qrCodeSvg, factorId, sharedSecret });
  }
  catch(err){
  console.error('Something has gone wrong with setting up the MFA:', err);
  res.status(500).json({ error: 'We ran into a problem with setting up MFA' });  
}

});

// Here is the route to get the challenge ID which is required for the verify route
// I will call this via a useEffect in my front end react app

router.post('/api/mfa/challenge', async(req,res)=>{

const accessToken = req.headers['authorization']?.split(' ')[1];
if (!accessToken) {
  return res.status(401).json({ error: 'Access token is required' });
}

const { factorId } = req.body;
if (!factorId) {
      return res.status(400).json({ error: 'factorId is required' });
    }

try{

const { error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken});
    if (sessionError) {
      return res.status(401).json({ error: 'Invalid or expired access token' });
    }

    // Call Supabase MFA challenge API
    const { data, error } = await supabase.auth.mfa.challenge({ factorId });
    if (error) {
      return res.status(400).json({ error: error.message });
    }
  
// Return challengeId and expires_at
    res.status(200).json({
      challengeId: data.id,
      expires_at: data.expires_at
    });
  }
catch(err){

  console.error('Something has gone wrong with the mfa challenge:', err);
  res.status(500).json({ error: 'Internal server error during MFA challenge' });

}});



// Here is the route to verify the MFA token entered by the user

router.post('/api/mfa/verify', async(req,res)=>{

const accessToken = req.headers['authorization']?.split(' ')[1];
if (!accessToken) {
  return res.status(401).json({ error: 'Access token is required' });
}

const {factorId,challengeId, code} = req.body;
if (!factorId || !code || !challengeId) {
      return res.status(400).json({ error: 'factorId and code are required' });
    }

try{
    // Set the session with the access token
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: '' // Not needed for verify
    });
    if (sessionError) {
      return res.status(401).json({ error: 'Invalid or expired access token' });
    }

    // Call Supabase MFA verify API
    const { data, error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId,
      code
    });
    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Return success response
    res.status(200).json({
      message: 'MFA verified successfully',
      factor: data
    });
  }
catch(err){

  console.error('Something has gone wrong with the mfa verify:', err);
  res.status(500).json({ error: 'Internal server error during MFA verify' });  


}});




export default router;
