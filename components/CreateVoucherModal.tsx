'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface BuyerInfo {
  id: string;
  name: string;
  business_name: string;
  phone: string;
}

interface CreateVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateVoucherModal({ isOpen, onClose, onSuccess }: CreateVoucherModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerSearchLoading, setBuyerSearchLoading] = useState(false);
  const [buyerSearchError, setBuyerSearchError] = useState<string | null>(null);
  const [selectedBuyer, setSelectedBuyer] = useState<BuyerInfo | null>(null);
  const [buyerSuggestions, setBuyerSuggestions] = useState<BuyerInfo[]>([]);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Get employee info from localStorage
  const employeeEmail = typeof window !== 'undefined' ? localStorage.getItem('employeeEmail') || '' : '';
  const employeeName = typeof window !== 'undefined' ? localStorage.getItem('employeeName') || '' : '';

  const [formData, setFormData] = useState({
    code: '',
    label: '',
    description: '',
    discountType: 'ABSOLUTE',
    discountValue: '',
    discountCap: '',
    maxUsageCount: '',
    maxUsagePerUser: '',
    internalDescription: '',
    activationTime: new Date().toISOString().slice(0, 16),
    expiryTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    conditionIdWithoutPOContext: '',
    conditionIdWithPOContext: '',
  });

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const searchBuyer = useCallback(async (phone: string) => {
    if (!phone.trim()) {
      setBuyerSuggestions([]);
      setBuyerSearchError(null);
      return;
    }

    setBuyerSearchLoading(true);
    setBuyerSearchError(null);
    try {
      const res = await fetch(`/api/buyers/search?phone=${encodeURIComponent(phone)}`);
      const json = await res.json();
      if (json.error) {
        setBuyerSearchError(json.error);
        setBuyerSuggestions([]);
      } else {
        setBuyerSuggestions(json.data ?? []);
      }
    } catch (err) {
      setBuyerSearchError(err instanceof Error ? err.message : 'Failed to search buyers');
      setBuyerSuggestions([]);
    } finally {
      setBuyerSearchLoading(false);
    }
  }, []);

  const handleBuyerPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const phone = e.target.value;
    setBuyerPhone(phone);

    // Clear previous debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new debounce timer - only search after user stops typing for 300ms
    debounceTimerRef.current = setTimeout(() => {
      searchBuyer(phone);
    }, 300);
  };

  const handleSelectBuyer = (buyer: BuyerInfo) => {
    setSelectedBuyer(buyer);
    setBuyerPhone(buyer.phone);
    setBuyerSuggestions([]);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedBuyer) {
      setError('Please select a buyer');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const discountDetails = {
        type: formData.discountType,
        value: formData.discountValue,
        cap: formData.discountCap || formData.discountValue,
      };

      const metaDetails = {
        desc: formData.description,
        label: formData.label,
      };

      const payload = {
        code: formData.code,
        discountDetails,
        metaDetails,
        maxUsageCount: formData.maxUsageCount ? Number(formData.maxUsageCount) : null,
        maxUsagePerUser: formData.maxUsagePerUser ? Number(formData.maxUsagePerUser) : null,
        internalDescription: formData.internalDescription || null,
        activationTime: new Date(formData.activationTime).toISOString(),
        expiryTime: new Date(formData.expiryTime).toISOString(),
        isActive: true,
        isTest: false,
        type: 'VOUCHER',
        buyerId: selectedBuyer.id,
        conditionIdWithoutPOContext: formData.conditionIdWithoutPOContext ? Number(formData.conditionIdWithoutPOContext) : null,
        conditionIdWithPOContext: formData.conditionIdWithPOContext ? Number(formData.conditionIdWithPOContext) : null,
        createdBy: employeeName, // Add employee name as createdBy
        createdByEmail: employeeEmail, // Add employee email
      };

      console.log('Submitting voucher payload:', payload);
      const res = await fetch('/api/vouchers/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      console.log('Voucher creation response:', res.status, json);
      if (!res.ok || json.error) throw new Error(json.error || 'Failed to create voucher');

      onSuccess();
      onClose();
      // Reset form
      setFormData({
        code: '',
        label: '',
        description: '',
        discountType: 'ABSOLUTE',
        discountValue: '',
        discountCap: '',
        maxUsageCount: '',
        maxUsagePerUser: '',
        internalDescription: '',
        activationTime: new Date().toISOString().slice(0, 16),
        expiryTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
        conditionIdWithoutPOContext: '',
        conditionIdWithPOContext: '',
      });
      setBuyerPhone('');
      setSelectedBuyer(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create voucher';
      console.error('Voucher creation error:', err);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-white via-purple-50 to-white rounded-2xl max-w-2xl w-full max-h-[95vh] overflow-y-auto p-6 shadow-2xl border border-purple-200/50">
        {/* Header */}
        <h2 className="text-3xl font-black bg-gradient-to-r from-purple-900 via-purple-700 to-purple-900 bg-clip-text text-transparent mb-4">
          Create New Voucher
        </h2>

        {error && (
          <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-300 rounded-xl text-red-700 text-sm font-bold shadow-sm">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Buyer Selection */}
          <div className="mb-6 pb-6 border-b-2 border-purple-300">
            <label className="block text-xs font-bold text-gray-900 mb-2">Buyer Phone *</label>
            <div className="relative">
              <input
                type="text"
                value={buyerPhone}
                onChange={handleBuyerPhoneChange}
                placeholder="Enter buyer phone number"
                className="w-full px-3 py-2 bg-white border-2 border-purple-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 transition-all font-bold shadow-sm hover:border-purple-400 text-sm"
              />

              {buyerSearchLoading && (
                <div className="absolute right-3 top-2.5 text-purple-600">
                  <div className="animate-spin">⟳</div>
                </div>
              )}

              {buyerSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-purple-300 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                  {buyerSuggestions.map((buyer) => (
                    <button
                      key={buyer.id}
                      type="button"
                      onClick={() => handleSelectBuyer(buyer)}
                      className="w-full px-4 py-3 text-left hover:bg-purple-100 border-b border-purple-200 last:border-b-0 transition-colors"
                    >
                      <div className="font-bold text-gray-900">{buyer.business_name}</div>
                      <div className="text-xs text-gray-600">{buyer.phone} • {buyer.name}</div>
                    </button>
                  ))}
                </div>
              )}

              {buyerSearchError && (
                <div className="mt-2 text-sm text-red-600 font-semibold">{buyerSearchError}</div>
              )}
            </div>

            {selectedBuyer && (
              <div className="mt-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-gray-900">✓ {selectedBuyer.business_name}</div>
                    <div className="text-xs text-gray-600 mt-1">{selectedBuyer.phone} • {selectedBuyer.name}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBuyer(null);
                      setBuyerPhone('');
                    }}
                    className="text-red-600 hover:text-red-700 font-bold"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Row 1: Code, Label, Description */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-900 mb-1">Code *</label>
              <input
                type="text"
                name="code"
                value={formData.code}
                onChange={handleChange}
                required
                placeholder="VOUCHER500"
                className="w-full px-3 py-2 bg-white border-2 border-purple-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 transition-all font-bold shadow-sm hover:border-purple-400 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-900 mb-1">Label *</label>
              <input
                type="text"
                name="label"
                value={formData.label}
                onChange={handleChange}
                required
                placeholder="Special Gift"
                className="w-full px-3 py-2 bg-white border-2 border-purple-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 transition-all font-bold shadow-sm hover:border-purple-400 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-900 mb-1">Description *</label>
              <input
                type="text"
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                placeholder="get ₹500 OFF"
                className="w-full px-3 py-2 bg-white border-2 border-purple-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 transition-all font-bold shadow-sm hover:border-purple-400 text-sm"
              />
            </div>
          </div>

          {/* Row 2: Type, Value, Cap */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-900 mb-1">Type *</label>
              <select
                name="discountType"
                value={formData.discountType}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-white border-2 border-purple-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 transition-all font-bold shadow-sm hover:border-purple-400 text-sm"
              >
                <option value="ABSOLUTE">Absolute (₹)</option>
                <option value="PERCENTAGE">Percentage (%)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-900 mb-1">Value *</label>
              <input
                type="number"
                name="discountValue"
                value={formData.discountValue}
                onChange={handleChange}
                required
                placeholder="500"
                className="w-full px-3 py-2 bg-white border-2 border-purple-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 transition-all font-bold shadow-sm hover:border-purple-400 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-900 mb-1">Cap</label>
              <input
                type="number"
                name="discountCap"
                value={formData.discountCap}
                onChange={handleChange}
                placeholder="Max discount"
                className="w-full px-3 py-2 bg-white border-2 border-purple-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 transition-all font-bold shadow-sm hover:border-purple-400 text-sm"
              />
            </div>
          </div>

          {/* Row 3: Max Count, Max Per User */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-900 mb-1">Max Count</label>
              <input
                type="number"
                name="maxUsageCount"
                value={formData.maxUsageCount}
                onChange={handleChange}
                placeholder="1"
                className="w-full px-3 py-2 bg-white border-2 border-purple-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 transition-all font-bold shadow-sm hover:border-purple-400 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-900 mb-1">Max Per User</label>
              <input
                type="number"
                name="maxUsagePerUser"
                value={formData.maxUsagePerUser}
                onChange={handleChange}
                placeholder="1"
                className="w-full px-3 py-2 bg-white border-2 border-purple-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 transition-all font-bold shadow-sm hover:border-purple-400 text-sm"
              />
            </div>
          </div>

          {/* Row 4: Condition IDs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-900 mb-1">Condition ID Without PO</label>
              <input
                type="number"
                name="conditionIdWithoutPOContext"
                value={formData.conditionIdWithoutPOContext}
                onChange={handleChange}
                placeholder="e.g., 123"
                className="w-full px-3 py-2 bg-white border-2 border-purple-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 transition-all font-bold shadow-sm hover:border-purple-400 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-900 mb-1">Condition ID With PO</label>
              <input
                type="number"
                name="conditionIdWithPOContext"
                value={formData.conditionIdWithPOContext}
                onChange={handleChange}
                placeholder="e.g., 456"
                className="w-full px-3 py-2 bg-white border-2 border-purple-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 transition-all font-bold shadow-sm hover:border-purple-400 text-sm"
              />
            </div>
          </div>

          {/* Row 5: Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-900 mb-1">Activation Time *</label>
              <input
                type="datetime-local"
                name="activationTime"
                value={formData.activationTime}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 bg-white border-2 border-purple-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 transition-all font-bold shadow-sm hover:border-purple-400 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-900 mb-1">Expiry Time *</label>
              <input
                type="datetime-local"
                name="expiryTime"
                value={formData.expiryTime}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 bg-white border-2 border-purple-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 transition-all font-bold shadow-sm hover:border-purple-400 text-sm"
              />
            </div>
          </div>

          {/* Row 6: Internal Description */}
          <div>
            <label className="block text-xs font-bold text-gray-900 mb-1">Internal Description</label>
            <textarea
              name="internalDescription"
              value={formData.internalDescription}
              onChange={handleChange}
              placeholder="e.g., Birthday Gift Voucher"
              rows={2}
              className="w-full px-4 py-3 bg-white border-2 border-purple-300 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-all font-bold resize-none shadow-sm hover:border-purple-400"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-8 border-t-2 border-purple-300">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3.5 bg-gradient-to-r from-gray-200 to-gray-100 hover:from-gray-300 hover:to-gray-200 border-2 border-gray-300 rounded-xl text-gray-900 font-bold transition-all shadow-md hover:shadow-lg transform hover:scale-105"
            >
              ✕ Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedBuyer}
              className="flex-1 px-4 py-3.5 bg-gradient-to-r from-purple-600 via-purple-500 to-purple-600 hover:from-purple-700 hover:via-purple-600 hover:to-purple-700 rounded-xl text-white font-black shadow-lg hover:shadow-2xl transition-all disabled:opacity-50 transform hover:scale-105 text-lg tracking-wide"
            >
              {loading ? '⏳ Creating...' : '✨ Create Voucher'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
