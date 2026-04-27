import fs from 'fs';

let content = fs.readFileSync('src/components/AdminPanel.tsx', 'utf-8');

const oldUpload = `                <div className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Upload Result File (Optional)</span>
                  <label className="block w-full cursor-pointer group">
                    <input 
                      type="file" 
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <div className={cn(
                      "border-2 border-dashed rounded-2xl p-8 text-center transition-all relative overflow-hidden",
                      resultFile ? "border-emerald-500 bg-emerald-50" : "border-slate-200 group-hover:border-indigo-500 group-hover:bg-indigo-50"
                    )}>
                      {resultFile ? (
                        <div className="flex flex-col items-center gap-2">
                          <CheckCircle className="w-10 h-10 text-emerald-500" />
                          <p className="text-sm font-bold text-emerald-700">File Selected</p>
                          <button 
                            type="button" 
                            onClick={(e) => { 
                              e.preventDefault(); 
                              setResultFile(null); 
                            }} 
                            className="mt-2 text-xs font-bold px-3 py-1.5 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors relative z-20"
                          >
                            Remove File
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <FileUp className="w-10 h-10 text-slate-400 group-hover:text-indigo-500" />
                          <p className="text-sm font-medium text-slate-600">Click to Select File</p>
                          <p className="text-xs text-slate-400">PDF, Image or Document</p>
                        </div>
                      )}
                    </div>
                  </label>
                </div>`;

const newUpload = `                <div className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Upload Result File (Optional)</span>
                  <div className="relative group block w-full cursor-pointer">
                    <input 
                      type="file" 
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
                    />
                    <div className={cn(
                      "border-2 border-dashed rounded-2xl p-8 text-center transition-all relative overflow-hidden",
                      resultFile ? "border-emerald-500 bg-emerald-50" : "border-slate-200 group-hover:border-indigo-500 group-hover:bg-indigo-50"
                    )}>
                      {resultFile ? (
                        <div className="flex flex-col items-center gap-2">
                          <CheckCircle className="w-10 h-10 text-emerald-500" />
                          <p className="text-sm font-bold text-emerald-700">File Selected</p>
                          <button 
                            type="button" 
                            onClick={(e) => { 
                              e.preventDefault(); 
                              setResultFile(null); 
                            }} 
                            className="mt-2 text-xs font-bold px-3 py-1.5 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors relative z-20"
                          >
                            Remove File
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <FileUp className="w-10 h-10 text-slate-400 group-hover:text-indigo-500" />
                          <p className="text-sm font-medium text-slate-600">Click to Select File</p>
                          <p className="text-xs text-slate-400">PDF, Image or Document</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>`;

content = content.replace(oldUpload, newUpload);

fs.writeFileSync('src/components/AdminPanel.tsx', content);
