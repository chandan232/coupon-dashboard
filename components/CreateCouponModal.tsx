'use client';

import { useState } from 'react';

interface CreateCouponModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateCouponModal({ isOpen, onClose, onSuccess }: CreateCouponModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    label: '',
    description: '',
    discountType: 'PERCENTAGE',
    discountValue: '',
    discountCap: '',
    minimumOrderValue: '',
    maxUsageCount: '',
    maxUsagePerUser: '',
    internalDescription: '',
    activationTime: new Date().toISOString().slice(0, 16),
    expiryTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        minimumOrderValue: formData.minimumOrderValue ? Number(formData.minimumOrderValue) : null,
        maxUsageCount: formData.maxUsageCount ? Number(formData.maxUsageCount) : null,
        maxUsagePerUser: formData.maxUsagePerUser ? Number(formData.maxUsagePerUser) : null,
        internalDescription: formData.internalDescription || null,
        activationTime: new Date(formData.activationTime).toISOString(),
        expiryTime: new Date(formData.expiryTime).toISOString(),
        isActive: true,
        isTest: false,
      };

      const res = await fetch('/api/offers/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || 'Failed to create coupon');

      onSuccess();
      onClose();
      setFormData({
        code: '',
        label: '',
        description: '',
        discountType: 'PERCENTAGE',
        discountValue: '',
        discountCap: '',
        minimumOrderValue: '',
        maxUsageCount: '',
        maxUsagePerUser: '',
        internalDescription: '',
        activationTime: new Date().toISOString().slice(0, 16),
        expiryTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create coupon');
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
          Create New Coupon
        </h2>

        {error && (
          <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-300 rounded-xl text-red-700 text-sm font-bold shadow-sm">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
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
                placeholder="SAVE500"
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
                placeholder="SAVE 500"
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
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FLAT">Flat (₹)</option>
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

          {/* Row 3: Min Order, Max Count, Max Per User */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-900 mb-1">Min Order (₹)</label>
              <input
                type="number"
                name="minimumOrderValue"
                value={formData.minimumOrderValue}
                onChange={handleChange}
                placeholder="5000"
                className="w-full px-3 py-2 bg-white border-2 border-purple-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 transition-all font-bold shadow-sm hover:border-purple-400 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-900 mb-1">Max Count</label>
              <input
                type="number"
                name="maxUsageCount"
                value={formData.maxUsageCount}
                onChange={handleChange}
                placeholder="1000"
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
                placeholder="5"
                className="w-full px-3 py-2 bg-white border-2 border-purple-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 transition-all font-bold shadow-sm hover:border-purple-400 text-sm"
              />
            </div>
          </div>

          {/* Row 4: Dates */}
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

          {/* Row 5: Internal Description */}
          <div>
            <label className="block text-xs font-bold text-gray-900 mb-1">Internal Description</label>
            <textarea
              name="internalDescription"
              value={formData.internalDescription}
              onChange={handleChange}
              placeholder="e.g., PO Above 5000"
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
              disabled={loading}
              className="flex-1 px-4 py-3.5 bg-gradient-to-r from-purple-600 via-purple-500 to-purple-600 hover:from-purple-700 hover:via-purple-600 hover:to-purple-700 rounded-xl text-white font-black shadow-lg hover:shadow-2xl transition-all disabled:opacity-50 transform hover:scale-105 text-lg tracking-wide"
            >
              {loading ? '⏳ Creating...' : '✨ Create Coupon'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
