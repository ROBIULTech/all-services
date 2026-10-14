const fs = require('fs');
const path = 'src/components/AdminPanel.tsx';
let content = fs.readFileSync(path, 'utf8');

const oldCode = `{(() => {
                                     const createdDate = u.createdAt ? (u.createdAt.toDate ? u.createdAt.toDate() : new Date(u.createdAt)) : null;
                                     const approvedDate = u.approvedAt ? (u.approvedAt.toDate ? u.approvedAt.toDate() : new Date(u.approvedAt)) : null;

                                     if (!createdDate && !approvedDate) {
                                       return <span className="text-xs text-slate-400">N/A</span>;
                                     }
                                     const dateVal = u.createdAt.toDate ? u.createdAt.toDate() : new Date(u.createdAt);
                                     const daysInBengali = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
                                     const dayNameBn = daysInBengali[dateVal.getDay()];
                                     const dateStr = dateVal.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                                     const timeStr = dateVal.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

                                     return (
                                       <div className="text-xs">
                                         <div className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md inline-block mb-0.5">
                                           {dayNameBn}
                                         </div>
                                         <p className="font-medium text-slate-700">{dateStr}</p>
                                         <p className="text-[10px] text-slate-400 font-mono">{timeStr}</p>
                                       </div>
                                     );
                                   })()}`;

const newCode = `{(() => {
                                     const createdDate = u.createdAt ? (u.createdAt.toDate ? u.createdAt.toDate() : new Date(u.createdAt)) : null;
                                     const approvedDate = u.approvedAt ? (u.approvedAt.toDate ? u.approvedAt.toDate() : new Date(u.approvedAt)) : null;

                                     if (!createdDate && !approvedDate) {
                                       return <span className="text-xs text-slate-400">N/A</span>;
                                     }

                                     const formatDate = (date) => {
                                       if (!date) return null;
                                       return {
                                          date: date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
                                          time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
                                       };
                                     };

                                     const created = formatDate(createdDate);
                                     const approved = formatDate(approvedDate);

                                     return (
                                       <div className="text-[11px] space-y-1">
                                         {created && (
                                           <div className="text-slate-600">
                                             <span className="font-bold text-slate-400">Reg:</span> {created.date} <span className="text-slate-400 font-mono">{created.time}</span>
                                           </div>
                                         )}
                                         {approved && (
                                           <div className="text-emerald-700">
                                             <span className="font-bold text-emerald-500">Apprv:</span> {approved.date} <span className="text-emerald-400 font-mono">{approved.time}</span>
                                           </div>
                                         )}
                                       </div>
                                     );
                                   })()}`;

if (content.includes(oldCode)) {
  content = content.replace(oldCode, newCode);
  fs.writeFileSync(path, content);
  console.log('Successfully updated.');
} else {
  console.log('Could not find old code block.');
}
