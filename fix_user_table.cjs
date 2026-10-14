
const fs = require("fs");
const adminPath = "src/components/AdminPanel.tsx";
let content = fs.readFileSync(adminPath, "utf8");

const oldCode = `                                <td className="px-6 py-4">
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

const newCode = `                                <td className="px-6 py-4">
                                  {(() => {
                                    if (!u.createdAt) {
                                      return <span className="text-xs text-slate-400">N/A</span>;
                                    }
                                    const dateVal = u.createdAt.toDate ? u.createdAt.toDate() : new Date(u.createdAt);
                                    const apprDateVal = u.approvedAt ? (u.approvedAt.toDate ? u.approvedAt.toDate() : new Date(u.approvedAt)) : null;
                                    const daysInBengali = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
                                    const dayNameBn = daysInBengali[dateVal.getDay()];
                                    const dateStr = dateVal.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                                    const timeStr = dateVal.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                                    
                                    const apprDateStr = apprDateVal ? apprDateVal.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null;
                                    const apprTimeStr = apprDateVal ? apprDateVal.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : null;
                                    
                                    return (
                                      <div className="text-xs space-y-1">
                                        <div>
                                            <div className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md inline-block mb-0.5">
                                            {dayNameBn}
                                            </div>
                                            <p className="font-medium text-slate-700">{dateStr}</p>
                                            <p className="text-[10px] text-slate-400 font-mono">{timeStr}</p>
                                        </div>
                                        {apprDateVal && (
                                            <div className="pt-1 border-t border-slate-100">
                                                <p className="text-[10px] font-bold text-emerald-700">App: {apprDateStr}</p>
                                                <p className="text-[10px] text-slate-400 font-mono">{apprTimeStr}</p>
                                            </div>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </td>`;

content = content.replace(oldCode, newCode);
fs.writeFileSync(adminPath, content);
console.log("Updated AdminPanel.tsx User Approvals table cell");
