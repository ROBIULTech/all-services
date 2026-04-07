import React, { useState, useEffect } from 'react';
import { cn } from '../lib/utils';

interface ServiceControlsProps {
    serviceId: number;
    updateProduct: (id: number, updates: any) => Promise<void>;
    products: any[];
}

const ServiceControls: React.FC<ServiceControlsProps> = ({ serviceId, updateProduct, products }) => {
    const product = products.find(p => p.id === serviceId);
    if (!product) return null;

    // Local state for inputs to prevent focus loss
    const [localPrice, setLocalPrice] = useState(product.price);
    const [localOptions, setLocalOptions] = useState(product.options || []);

    useEffect(() => {
        setLocalPrice(product.price);
        setLocalOptions(product.options || []);
    }, [product.price, product.options]);

    const handlePriceChange = (newPrice: number) => {
        setLocalPrice(newPrice);
        // Debounce or only update on blur if necessary, but for now, 
        // let's try to update without triggering a full re-render of the parent if possible.
        // Since we can't easily change parent behavior, let's ensure the local state is the source of truth.
        updateProduct(serviceId, { price: newPrice });
    };

    const handleOptionPriceChange = (idx: number, newPrice: number) => {
        const newOptions = [...localOptions];
        newOptions[idx] = { ...newOptions[idx], price: newPrice };
        setLocalOptions(newOptions);
        updateProduct(serviceId, { options: newOptions });
    };

    return (
      <div className="space-y-6 pt-6 border-t border-slate-100">
        <div className="flex flex-col bg-slate-50 p-4 rounded-xl border border-slate-200 gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className={cn(
                  "w-12 h-6 rounded-full transition-all relative cursor-pointer",
                  product.isActive ? "bg-emerald-500" : "bg-slate-300"
                )} 
                onClick={() => updateProduct(serviceId, { isActive: !product.isActive })}
              >
                <div className={cn(
                  "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm",
                  product.isActive ? "left-7" : "left-1"
                )} />
              </div>
              <span className="text-sm font-bold text-slate-700">
                {product.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {product.options ? (
              localOptions.map((opt: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between gap-4 bg-white p-3 rounded-lg border border-slate-200">
                  <span className="text-xs font-bold text-slate-600">{opt.name}</span>
                  <div className="relative w-24">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">৳</span>
                    <input 
                      type="text"
                      inputMode="numeric"
                      defaultValue={opt.price}
                      onBlur={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        handleOptionPriceChange(idx, Number(val));
                      }}
                      className="w-full pl-6 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-between gap-4 bg-white p-3 rounded-lg border border-slate-200">
                <span className="text-xs font-bold text-slate-600">মূল্য</span>
                <div className="relative w-24">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">৳</span>
                  <input 
                    type="text"
                    inputMode="numeric"
                    defaultValue={localPrice}
                    onBlur={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      handlePriceChange(Number(val));
                    }}
                    className="w-full pl-6 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-600">Default Order Template (Placeholder Data)</label>
            <textarea 
              defaultValue={product.defaultData || ''}
              onBlur={(e) => updateProduct(serviceId, { defaultData: e.target.value })}
              placeholder="Enter default template text for this service..."
              className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm min-h-[150px] focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>
        </div>
      </div>
    );
  };

export default ServiceControls;
