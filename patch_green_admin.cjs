const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Change:
// else if (isBooked) {
//   bgColor = "bg-red-500 text-white border-red-600 cursor-not-allowed";
// to:
// else if (isBooked) {
//   if (currentUser?.role === 'superadmin' && booking.userId === currentUser?.id) {
//      bgColor = "bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-600";
//   } else {
//      bgColor = "bg-red-500 text-white border-red-600 cursor-not-allowed";
//   }

code = code.replace(
    'bgColor = "bg-red-500 text-white border-red-600 cursor-not-allowed";',
    `bgColor = (currentUser?.role === 'superadmin' && booking?.userId === currentUser?.id) ? "bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-600" : "bg-red-500 text-white border-red-600 cursor-not-allowed";`
);
fs.writeFileSync('src/App.tsx', code);
