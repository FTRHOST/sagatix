const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
code = code.replace(
`                                              await deleteDoc(doc(db, 'tickets', booking.id));
                                              triggerNotification(\`Kursi \${seatCode} dibebaskan.\`);`,
`                                              await deleteDoc(doc(db, 'tickets', booking.id));

                                              // Remove from bookedSeats
                                              const targetEvent = events.find(e => e.id === selectedManageSeatsEvent.id);
                                              if (targetEvent) {
                                                await updateDoc(doc(db, 'events', targetEvent.id), {
                                                  bookedSeats: (targetEvent.bookedSeats || []).filter(s => s !== seatCode)
                                                });
                                              }
                                              triggerNotification(\`Kursi \${seatCode} dibebaskan.\`);`
);
fs.writeFileSync('src/App.tsx', code);
