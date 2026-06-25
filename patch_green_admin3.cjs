const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// I also need to fix: "yang bisa mengatur semua role hanya superadmin"
// the dropdown is visible for non-superadmin! "biasa" and "admin". But the user asked:
// "saya minta untuk menghapus dropdownnya dan yang bisa mengatur semua role hanya superadmin"

code = code.replace(
    /\{currentUser\.role === 'superadmin' \? \([\s\S]*?\) : \([\s\S]*?<select[\s\S]*?<\/select>\s*\)\}/m,
    `{currentUser.role === 'superadmin' ? (
                    <span className="text-[9.5px] font-extrabold bg-surface text-on-surface border border-outline rounded px-1.5 py-0.5 outline-hidden text-center cursor-default">
                      👑 SUPERADMIN
                    </span>
                  ) : currentUser.role === 'admin' ? (
                    <span className="text-[9.5px] font-extrabold bg-surface text-on-surface border border-outline rounded px-1.5 py-0.5 outline-hidden text-center cursor-default">
                      🔑 ADMIN
                    </span>
                  ) : (
                    <span className="text-[9.5px] font-extrabold bg-surface text-on-surface border border-outline rounded px-1.5 py-0.5 outline-hidden text-center cursor-default">
                      👤 BIASA
                    </span>
                  )}`
);
fs.writeFileSync('src/App.tsx', code);
