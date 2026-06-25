const fs = require('fs');
let code = fs.readFileSync('firestore.rules', 'utf8');

// Revert the dangerous allow read on tickets
code = code.replace(
    'allow read: if isSignedIn(); // allow all users to read tickets to prevent duplicate seats',
    'allow read: if isSignedIn() && (resource.data.userId == request.auth.uid || isAdmin());'
);

// Add bookedSeats to allowed keys for update in events
code = code.replace(
    "['ticketsLeft', 'isSoldOut', 'tiers', 'simulatedRequestsCount', 'registrationOpenTime']",
    "['ticketsLeft', 'isSoldOut', 'tiers', 'simulatedRequestsCount', 'registrationOpenTime', 'bookedSeats']"
);

fs.writeFileSync('firestore.rules', code);
