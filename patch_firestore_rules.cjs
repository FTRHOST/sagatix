const fs = require('fs');
let code = fs.readFileSync('firestore.rules', 'utf8');
code = code.replace(
    'allow read: if isSignedIn() && (resource.data.userId == request.auth.uid || isAdmin());',
    'allow read: if isSignedIn(); // allow all users to read tickets to prevent duplicate seats'
);
fs.writeFileSync('firestore.rules', code);
