import fs from 'fs';

let content = fs.readFileSync('src/components/UserPanel.tsx', 'utf-8');

// Replace orderFile usage around line 570
content = content.replace(
  /fileURL: orderFile,/,
  'fileURLs: orderFiles,'
);

// Replace disabled check around line 2961
content = content.replace(
  /disabled={isPlacingOrder \|\| userProfile\.balance < currentPrice \|\| !orderData \|\| \(selectedProduct\.requiresFileUpload && !orderFile\)}/,
  'disabled={isPlacingOrder || userProfile.balance < currentPrice || !orderData || (selectedProduct.requiresFileUpload && orderFiles.length === 0)}'
);

// Replace the upload block around line 2886
const oldUploadBlock = `                      <div className="flex items-center justify-center w-full">
                        <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-slate-700 border-dashed rounded-2xl cursor-pointer bg-slate-800/50 hover:bg-slate-800 transition-all">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            {orderFile ? (
                              <div className="flex items-center gap-2 text-emerald-400">
                                <CheckCircle className="w-6 h-6" />
                                <span className="text-sm font-bold">File Selected</span>
                              </div>
                            ) : (
                              <>
                                <Plus className="w-6 h-6 text-slate-500 mb-2" />
                                <p className="text-xs text-slate-500">Click to upload document</p>
                              </>
                            )}
                          </div>
                          <input 
                            type="file" 
                            className="hidden" 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                // Check file size (e.g., limit to 5MB)
                                if (file.size > 5 * 1024 * 1024) {
                                  alert('File is too large. Please upload a file smaller than 5MB.');
                                  return;
                                }
                                // Check file type (e.g., allow images, PDFs, and ZIP files)
                                if (!['image/jpeg', 'image/png', 'application/pdf', 'application/zip', 'application/x-zip-compressed'].includes(file.type)) {
                                  alert('Invalid file type. Please upload an image, PDF, or ZIP file. Word files are not allowed directly.');
                                  return;
                                }
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setOrderFile(reader.result as string);
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                      </div>`;

const newUploadBlock = `                      <div className="flex flex-wrap items-center justify-start w-full gap-4">
                        {orderFiles.length === 0 ? (
                          <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-slate-700 border-dashed rounded-2xl cursor-pointer bg-slate-800/50 hover:bg-slate-800 transition-all">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <Plus className="w-6 h-6 text-slate-500 mb-2" />
                              <p className="text-xs text-slate-500">Click to upload document</p>
                            </div>
                            <input 
                              type="file" 
                              className="hidden" 
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  if (file.size > 5 * 1024 * 1024) {
                                    alert('File is too large. Please upload a file smaller than 5MB.');
                                    return;
                                  }
                                  if (!['image/jpeg', 'image/png', 'application/pdf', 'application/zip', 'application/x-zip-compressed'].includes(file.type)) {
                                    alert('Invalid file type. Please upload an image, PDF, or ZIP file. Word files are not allowed directly.');
                                    return;
                                  }
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setOrderFiles([reader.result as string]);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                        ) : (
                          <div className="flex flex-wrap items-center gap-4 w-full">
                            {orderFiles.map((file, index) => (
                              <div key={index} className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-emerald-500/30 bg-slate-800 flex flex-col items-center justify-center group">
                                {file.startsWith('data:image/') ? (
                                  <img src={file} className="w-full h-full object-cover" alt="upload preview" />
                                ) : (
                                  <>
                                    <CheckCircle className="w-8 h-8 text-emerald-400 mb-1" />
                                    <span className="text-[10px] font-bold text-slate-300 break-words px-1 cursor-pointer" onClick={() => window.open(file, '_blank')}>Document {index + 1}</span>
                                  </>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => { e.preventDefault(); setOrderFiles(orderFiles.filter((_, i) => i !== index)); }}
                                  className="absolute top-1 right-1 bg-red-500/80 hover:bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all z-10"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                            <label className="flex flex-col items-center justify-center w-24 h-24 border-none rounded-2xl cursor-pointer bg-[#3b82f6] hover:bg-[#2563eb] transition-all shadow-lg shadow-blue-500/20 active:scale-95">
                              <Plus className="w-8 h-8 text-white stroke-[3]" />
                              <input 
                                type="file" 
                                className="hidden" 
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    if (file.size > 5 * 1024 * 1024) {
                                      alert('File is too large. Please upload a file smaller than 5MB.');
                                      return;
                                    }
                                    if (!['image/jpeg', 'image/png', 'application/pdf', 'application/zip', 'application/x-zip-compressed'].includes(file.type)) {
                                      alert('Invalid file type. Please upload an image, PDF, or ZIP file. Word files are not allowed directly.');
                                      return;
                                    }
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      setOrderFiles([...orderFiles, reader.result as string]);
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                            </label>
                          </div>
                        )}
                      </div>`;

content = content.replace(oldUploadBlock, newUploadBlock);

if (!content.includes('Trash2')) {
  // We need to add Trash2 to lucide-react imports if it's missing, let's just make sure it's exported.
}

fs.writeFileSync('src/components/UserPanel.tsx', content);
