const fs = require('fs');
const path = 'src/components/AdminPanel.tsx';
let content = fs.readFileSync(path, 'utf8');

const target = `                                 <td className="px-6 py-4">
                                   {(() => {
                                     if (!u.createdAt) {
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
                                   })()}
                                 </td>`;

const replacement = `                                 <td className="px-6 py-4">
                                   {(() => {
                                     const createdDate = u.createdAt ? (u.createdAt.toDate ? u.createdAt.toDate() : new Date(u.createdAt)) : null;
                                     const approvedDate = u.approvedAt ? (u.approvedAt.toDate ? u.approvedAt.toDate() : new Date(u.approvedAt)) : null;

                                     if (!createdDate && !approvedDate) {
                                       return <span className="text-xs text-slate-400">N/A</span>;
                                     }

                                     const formatDate = (date: Date) => {
                                       const dateStr = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                                       const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                                       return { dateStr, timeStr };
                                     };

                                     return (
                                       <div className="text-xs space-y-1">
                                         {createdDate && (
                                           <div>
                                             <div className="text-[9px] font-bold text-slate-400 uppercase">Reg:</div>
                                             <p className="font-medium text-slate-700">{formatDate(createdDate).dateStr} {formatDate(createdDate).timeStr}</p>
                                           </div>
                                         )}
                                         {approvedDate && (
                                           <div>
                                             <div className="text-[9px] font-bold text-emerald-600 uppercase">Apprv:</div>
                                             <p className="font-medium text-emerald-700">{formatDate(approvedDate).dateStr} {formatDate(approvedDate).timeStr}</p>
                                           </div>
                                         )}
                                       </div>
                                     );
                                   })()}
                                 </td>`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(path, content);
  console.log('Successfully updated');
} else {
  console.log('Target not found');
}
