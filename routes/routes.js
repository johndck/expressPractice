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


// Here is the route for login - this will need to be refactored closely with the signup route
// Using the supabase client 

router.post('/api/login', async(req,res)=>{

try{

const { email, password } = req.body;
if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
const {data: supabaseData,error} = await supabase.auth.signInWithPassword({
  email,
  password
});

if (error) {
      // Handle different error codes with switch statement
      const errorStatus = error.status || 401; // Default to 401 if status not provided
      
      switch (errorStatus) {
        case 400:
          // Bad Request: Invalid credentials, missing fields, or validation errors
          if (error.message?.toLowerCase().includes('invalid') || 
              error.message?.toLowerCase().includes('credential')) {
            return res.status(400).json({ 
              error: 'Invalid credentials',
              message: 'The email or password you entered is incorrect'
            });
          }
          if (error.message?.toLowerCase().includes('email') && 
              (error.message?.toLowerCase().includes('format') || 
               error.message?.toLowerCase().includes('invalid') ||
               error.message?.toLowerCase().includes('malformed'))) {
            return res.status(400).json({ 
              error: 'Validation error',
              message: 'The email address format is invalid'
            });
          }
          if (error.message?.toLowerCase().includes('required') || 
              error.message?.toLowerCase().includes('missing')) {
            return res.status(400).json({ 
              error: 'Missing fields',
              message: 'Email and password are required'
            });
          }
          // Generic 400 error
          return res.status(400).json({ 
            error: 'Bad Request',
            message: error.message || 'Invalid request'
          });

        case 401:
          // Unauthorized: Usually rare for sign-in, but can happen with misconfigured client
          return res.status(401).json({ 
            error: 'Unauthorized',
            message: error.message || 'Authentication failed. Please check your credentials or API configuration.'
          });

        case 422:
          // Unprocessable Entity: Password too short or email rejected by specific rule
          if (error.message?.toLowerCase().includes('password') && 
              (error.message?.toLowerCase().includes('short') || 
               error.message?.toLowerCase().includes('length') ||
               error.message?.toLowerCase().includes('minimum'))) {
            return res.status(422).json({ 
              error: 'Password validation failed',
              message: 'Password does not meet the minimum requirements'
            });
          }
          if (error.message?.toLowerCase().includes('email')) {
            return res.status(422).json({ 
              error: 'Email validation failed',
              message: 'Email address does not meet the required criteria'
            });
          }
          // Generic 422 error
          return res.status(422).json({ 
            error: 'Unprocessable Entity',
            message: error.message || 'The request could not be processed'
          });

        case 429:
          // Too Many Requests: Rate limit exceeded
          return res.status(429).json({ 
            error: 'Too Many Requests',
            message: 'Rate limit exceeded. Please wait before attempting to sign in again.'
          });

        default:
          // Fallback for other error codes
          return res.status(errorStatus).json({ 
            error: 'Authentication error',
            message: error.message || 'An error occurred during sign in'
          });
      }
    }

console.log('Login successful, received data:', supabaseData);

// set the session with the access token

const user = supabaseData.user;
const sessionData = supabaseData.session;

// Check the MFA factors


const FACTOR_STATUS = {
  VERIFIED: 'verified',
  UNVERIFIED: 'unverified',
};
// According to Supabase docs, the correct values for factor_type are 'totp' and 'sms'
const FACTOR_TYPE = {
  TOTP: 'totp', PHONE: 'phone',
};
const MFA_STATE = {
  HAS_VERIFIED_TOTP: 'has_verified_totp', // At least one verified TOTP factor
  ONLY_UNVERIFIED: 'only_unverified', // Only unverified factors (TOTP or phone)
  NO_FACTORS: 'no_factors', // No MFA factors enrolled
};

// Initialize variables for later use
let mfaStatus = MFA_STATE.NO_FACTORS;
let factorId = null;



const { data, factorsError } = await supabase.auth.mfa.listFactors();

if (factorsError) {
  console.error('MFA check failed:', factorsError);
  return res.status(500).json({ error: 'Failed to check MFA status' });
}

console.log('MFA factors retrieved:', data);

// Refactored logic to handle three states: VERIFIED, UNVERIFIED, and NO_FACTORS for TOTP factors
  const allFactors = data?.all || [];
  const totpFactors = allFactors.filter(
    factor => factor.factor_type === FACTOR_TYPE.TOTP
  );

  // We declare verifiedTotp and unverifiedTotp with 'let' at the top of the block,
  // instead of with 'const' inside the else branch, so we can assign their values conditionally
  // and reference them afterward in the if...else if statements.
  // Using 'const' would limit their scope to the else block, making them inaccessible later,
  // so we need 'let' here.
  let verifiedTotp, unverifiedTotp;
  if (totpFactors.length === 0) {
    mfaStatus = MFA_STATE.NO_FACTORS;
    factorId = null;
  } else {
    verifiedTotp = totpFactors.find(factor => factor.status === FACTOR_STATUS.VERIFIED);
    unverifiedTotp = totpFactors.find(factor => factor.status === FACTOR_STATUS.UNVERIFIED);
  }
  
  if (verifiedTotp) {
      mfaStatus = MFA_STATE.HAS_VERIFIED_TOTP;
      factorId = verifiedTotp.id;
    } else if (unverifiedTotp) {
      mfaStatus = MFA_STATE.ONLY_UNVERIFIED;
      factorId = unverifiedTotp.id;
    }
      
console.log('MFA status:', mfaStatus);
const { access_token, refresh_token, expires_in } = sessionData;

// Handle MFA status
if (mfaStatus === MFA_STATE.HAS_VERIFIED_TOTP) {
  // Verified: Complete login with cookies


  res.cookie('my-access-token', access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: expires_in * 1000,
    path: '/',
  });

  res.cookie('my-refresh-token', refresh_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });

  res.status(200).json({
    mfaStatus,
    factorId,
    userId: user.id,
  });

 
} else if (mfaStatus === MFA_STATE.ONLY_UNVERIFIED) {

  res.cookie('my-access-token', access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: expires_in * 1000,
    path: '/',
  });

  res.cookie('my-refresh-token', refresh_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });

  // Unverified: Do not complete login
  res.status(200).json({
    mfaStatus,
    factorId,
    userId: user.id,
  });
} else if (mfaStatus === MFA_STATE.NO_FACTORS) {

  res.cookie('my-access-token', access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: expires_in * 1000,
    path: '/',
  });

  res.cookie('my-refresh-token', refresh_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });

  res.status(200).json({
    mfaStatus,
    factorId: null,
    userId: user.id,
  });
}
 else {
  console.error('Unexpected MFA status:', mfaStatus);
  return res.status(500).json({ error: 'Unexpected MFA status' });
}

} 


catch(err){
  console.error('Login error:', err);
  res.status(500).json({ error: 'Internal server error during login' });

}});

router.post('/api/mfa/enrol', async(req,res)=>{


const accessToken = req.cookies['my-access-token'];
const refreshToken = req.cookies['my-refresh-token'];
if (!accessToken) {
  return res.status(401).json({ error: 'Access token is required' });
}
if (!refreshToken) {
  return res.status(401).json({ error: 'Refresh token is required' });
}


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
// This could probably be removed.

router.post('/api/mfa/challenge', async(req,res)=>{

const accessToken = req.cookies['my-access-token'];
const refreshToken = req.cookies['my-refresh-token'];
if (!accessToken) {
  return res.status(401).json({ error: 'Access token is required' });
}
if (!refreshToken) {
  return res.status(401).json({ error: 'Refresh token is required' });
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
 

  const accessToken = req.cookies['my-access-token'];
  if (!accessToken) {
    return res.status(401).json({ error: 'Access token is required (missing from cookie)' });
  }

// Extract refresh token from httpOnly cookie (if needed for session)
  const refreshToken = req.cookies['my-refresh-token'];


  const { factorId, code } = req.body;
  if (!factorId || !code) {
    return res.status(400).json({ error: 'factorId and code are required' });
  }


  try {
    // Get the challenge ID

    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError) {
      return res.status(400).json({ error: challengeError.message });
    }

    const challengeId = challengeData.id; 

    console.log('MFA Challenge ID obtained:', challengeId);


    // Call Supabase MFA verify API
    const { data: verifyData, error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId,
      code
    });
    if (verifyError) {
      return res.status(400).json({ error: verifyError.message });
    }

    
    
    // Destructure user_id from the factor data (if present)
   const userId = verifyData?.user?.id;
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
      factor: verifyData,
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
         console.log('ID Token present:', idToken);

        if (!idToken) {
  console.error('No id_token in tokenData:', tokenData);
  return res.status(500).json({ error: 'id_token missing from token response' });
}

const { data, error: authError } = await supabase.auth.signInWithIdToken({
  provider: 'google',
  token: idToken,
});

if (authError) {
  console.error('Supabase signInWithIdToken error:', error);
  return res.status(400).json({ error: error.message, details: error });
}

// test fetching the user profile from supabase
const userId = data.user.id;

const { data: profile, error: profileError } = await supabase
  .from('users_profiles')
  .select('*')
  .eq('id', userId)
  .single();


if (profileError) {
  console.error('Error fetching user profile:', error);
  return res.status(400).json({ error: error.message, details: error });
}

console.log('User profile:', profile);

// success — return session/user (for testing only)
return res.status(200).json({ message: 'Supabase login successful', session: data.session, user: data.user });

      
    
}
catch(error){
  console.error('Error in OAuth callback processing:', error);
  return res.status(500).send('Internal Server Error during OAuth callback processing.');
}


 
});




export default router;
