const fs = require('fs');
const path = 'src/components/AdminPanel.tsx';
let content = fs.readFileSync(path, 'utf8');

// I will try to replace the code I already partially changed (lines 3569-3583).
// I know the current content starts with:
// '                                     const dateVal = u.createdAt.toDate ? u.createdAt.toDate() : new Date(u.createdAt);'
// No, I already changed lines 3566-3568.
// The file should now contain the new createdDate/approvedDate declarations in the IF block I already successfully applied.

// Let me find the block starting with `const dateVal` and ending with `})()}`
// Actually, I can just replace the whole `(() => { ... })()` block.

const start = `                                   {(() => {`;
const end = `                                   })()}`;

const startIndex = content.indexOf(start);
const endIndex = content.indexOf(end, startIndex) + end.length;

if (startIndex !== -1 && endIndex !== -1) {
    const replacement = `                                   {(() => {
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
                                   })()}`;
    
    content = content.substring(0, startIndex) + replacement + content.substring(endIndex);
    fs.writeFileSync(path, content);
    console.log('Successfully updated');
} else {
    console.log('Block not found');
}
