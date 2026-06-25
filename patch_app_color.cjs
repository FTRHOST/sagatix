const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
code = code.replace(
    'let bgColor = "bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-600";',
    'let bgColor = (currentUser?.role === "superadmin" || booking?.userId === currentUser?.id) ? "bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-600" : "bg-slate-300 border-slate-400"; // different color for non-buyers'
);
fs.writeFileSync('src/App.tsx', code);
