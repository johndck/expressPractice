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

// Check if an unverified TOTP factor already exists - if it does delete it and create a new one
// implement this later

const { data, error } = await supabase.auth.mfa.listFactors();
console.log('List of MFA factors:', {data,error});
if (error) {
      console.error('Failed to list MFA factors:', error);
      return res.status(500).json({ error: `Failed to list MFA factors: ${error.message}` });
    }

    if (!data) {
      console.error('No data returned from listFactors:', data);
      return res.status(500).json({ error: 'Invalid response from MFA factors' });
    }

// Check for an unverified TOTP factor in data.all
    const unverifiedTotpFactor = data.all.find(factor => 
      factor.factor_type === 'totp' && factor.status === 'unverified'
    );
    console.log('Unverified TOTP factor:', unverifiedTotpFactor);


if (unverifiedTotpFactor) {
  const { error: deleteError } = await supabase.auth.mfa.unenroll({ factorId: unverifiedTotpFactor.id });
  if (deleteError) {
    console.error('Failed to delete unverified TOTP factor:', deleteError);
    return res.status(500).json({ error: `Failed to delete unverified TOTP factor: ${deleteError.message}` });
  }
  console.log('Deleted unverified TOTP factor:', unverifiedTotpFactor.id);

}

// Now enroll a new TOTP factor


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
  console.error('Error setting up MFA:', err.message, err.stack);
  res.status(500).json({ error: 'Failed to set up MFA', details: err.message }); 
}

});






// Here is the route to get the challenge ID which is required for the verify route
// I will call this via a useEffect in my front end react app

router.post('/api/mfa/challenge', async(req,res)=>{

const accessToken = req.headers['authorization']?.split(' ')[1];
const refreshToken = req.headers['refresh-token'];
if (!accessToken) {
  return res.status(401).json({ error: 'Access token is required' });
}

const { factorId } = req.body;
if (!factorId) {
      return res.status(400).json({ error: 'factorId is required' });
    }

try{

const { error: sessionError } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
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

router.post('/api/mfa/verify', async (req, res) => {
  const refreshToken = req.headers['refresh-token'];
  const accessToken = req.headers['authorization']?.split(' ')[1];
  if (!accessToken) {
    return res.status(401).json({ error: 'Access token is required' });
  }

  const { factorId, challengeId, code } = req.body;
  if (!factorId || !code || !challengeId) {
    return res.status(400).json({ error: 'factorId and code are required' });
  }

  try {
    // Set the session with the access token
    const { error: sessionError } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
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

    
    // Destructure user_id from the factor data (if present)
    const userId = data.user.id;
    if (!userId) {
      return res.status(500).json({ error: 'user_id not found in MFA factor data' });
    }
    
    console.log('Your User ID from the verify factor data is:', userId);



  
    // Fetch the user's profile from users_profiles table
const { data: profile, error: profileError } = await supabase
  .from('users_profiles')
  .select('*')
  .eq('id', userId)
  .single();

if (profileError) {
  console.error('Supabase error fetching profile:', profileError);
  return res.status(500).json({ error: 'Failed to fetch user profile', details: profileError.message });
}

if (!profile) {
  console.error('No profile found for userId:', userId);
  return res.status(404).json({ error: 'User profile not found' });
}

// If you reach here, profile was found
console.log('Fetched user profile:', profile);
  
    

    // Return success response with factor and profile
    res.status(200).json({
      message: 'MFA verified successfully & profile found',
      factor: data,   
      profile: profile
    });
  } catch (err) {
    console.error('Something has gone wrong with the mfa verify:', err);
    res.status(500).json({ error: 'Internal server error during MFA verify' });
  }
});

// Create my route to log out the user

router.post('/api/logout', async (req, res) => {


try {
  const refreshToken = req.headers['refresh-token'];
  const accessToken = req.headers['authorization']?.split(' ')[1];
  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token is required' });
  }

const { error } = await supabase.auth.signOut({ accessToken,refreshToken });
  if (error) {
    console.warn('Supabase session revocation failed (token likely invalid/expired):', error.message);
    return res.status(200).json({ message: 'Logout confirmed. Local cleanup required.'});
  }

  res.status(200).json({ message: 'User logged out successfully' });
  console.log('User logged out successfully');

}
catch(err) {
  console.error('Error during logout:', err);
  res.status(500).json({ error: 'Internal server error during logout' });
}




});


// Login with Google route

const GOOGLE_CLIENT_ID=process.env.GOOGLE_CLIENT_ID;
const GOOGLE_REDIRECT_URI=process.env.GOOGLE_REDIRECT;
const GOOGLE_CLIENT_SECRET=process.env.GOOGLE_CLIENT_SECRET;


router.get('/api/login/google', async (req, res) => {
   try {
    const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';

    const options = {
      redirect_uri: GOOGLE_REDIRECT_URI,
      client_id: GOOGLE_CLIENT_ID,
      access_type: 'offline', // Request a refresh token
      response_type: 'code', // Crucial: We want an authorization code
      prompt: 'consent', // Force consent screen
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
      ].join(' '),
    };

    const qs = new URLSearchParams(options).toString();

    // Redirect the user to Google's consent screen
    return res.json({ url: `${rootUrl}?${qs}` });

  } catch (error) {
    // ⚠️ This catch block primarily handles unexpected server issues 
    // (e.g., if res.redirect failed for some internal reason).
    console.error('Error initiating Google OAuth flow:', error);
    
    // Redirect the user back to the application's login/error page
    // (assuming your React app runs on a different port, e.g., 5173 or 3001)
    res.redirect('http://localhost:5173/login?error=auth_init_failed');
  }
});


// my callback route for OAuth
router.get('/api/auth/callback', async (req, res) => {

const rawCode = req.query.code;
  const code = Array.isArray(rawCode) ? rawCode[0] : rawCode;
//const state = req.query.state;

 if (!code) {
        console.error('Callback Error: Authorization code not found in request.');
        // Handle the case where the user denied access or an error occurred
        return res.status(400).send('Authorization code missing. User may have denied access.');
    }

try{
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                redirect_uri: GOOGLE_REDIRECT_URI,
                grant_type: 'authorization_code',
            }),
        });

    const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok) {
            console.error('Token Exchange Failed:', tokenResponse.status, tokenData);
            return res.status(tokenResponse.status).json({ error: tokenData });
        }

        console.log('Token Exchange Successful! access_token present:', !!tokenData.access_token);


         const idToken = tokenData.id_token;
        if (!idToken) {
          console.error('No id_token in tokenData:', tokenData);
          return res.status(500).json({ error: 'id_token missing from token response' });
        }

//now login to Supabase using the access token from Google
// Use the access token to sign in with Supabase
const { data, error } = await supabase.auth.signInWithIdToken({
  provider: 'google',
  id_token: idToken,
});

if (error) {
  console.error('Supabase signInWithIdToken error:', error);
  return res.status(400).json({ error: error.message });
}
/*
console.log('Supabase signInWithIdToken success:', data);

// Return success response with Supabase session info
return res.status(200).json({ message: 'Supabase login successful', session: data.session, user: data.user });
*/
}
catch(error){
  console.error('Error in OAuth callback processing:', error);
  return res.status(500).send('Internal Server Error during OAuth callback processing.');
}


 
});




export default router;
