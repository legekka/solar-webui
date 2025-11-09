import { useState } from 'react';
import { X } from 'lucide-react';
import { Instance, InstanceConfig } from '@/api/types';

interface EditInstanceModalProps {
  instance: Instance;
  hostId: string;
  onClose: () => void;
  onUpdate: (hostId: string, instanceId: string, config: InstanceConfig) => Promise<void>;
}

export function EditInstanceModal({ instance, hostId, onClose, onUpdate }: EditInstanceModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<InstanceConfig>({
    ...instance.config,
    special: instance.config.special ?? false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.model || !formData.alias) {
      alert('Model and Alias are required');
      return;
    }

    setLoading(true);
    try {
      await onUpdate(hostId, instance.id, formData);
      onClose();
    } catch (error: any) {
      console.error('Failed to update instance:', error);
      alert(`Failed to update instance: ${error.response?.data?.detail || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === 'number'
          ? value === ''
            ? undefined
            : parseFloat(value)
          : type === 'checkbox'
            ? checked
            : value,
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-nord-1 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-nord-3">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-nord-3 sticky top-0 bg-nord-1 z-10">
          <h2 className="text-xl font-bold text-nord-6">Edit Instance: {instance.config.alias}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-nord-2 rounded transition-colors text-nord-4"
          >
            <X size={20} />
          </button>
        </div>

        {/* Info Banner */}
        <div className="p-4 bg-nord-13 bg-opacity-20 border-b border-nord-13">
          <p className="text-sm text-nord-13">
            ⚠️ Instance must be stopped to edit configuration. Changes take effect on next start.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Model */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-nord-4 mb-1">
                Model Path <span className="text-nord-11">*</span>
              </label>
              <input
                type="text"
                name="model"
                value={formData.model}
                onChange={handleChange}
                placeholder="/path/to/model.gguf"
                required
                className="w-full px-3 py-2 bg-nord-2 border border-nord-3 text-nord-6 placeholder-nord-4 placeholder:opacity-60 rounded-md focus:ring-2 focus:ring-nord-10 focus:border-transparent"
              />
            </div>

            {/* Special Flag */}
            <div className="md:col-span-2 flex items-start gap-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="special"
                  name="special"
                  checked={!!formData.special}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-nord-3 bg-nord-1 text-nord-10 focus:ring-nord-10"
                  disabled={instance.status !== 'stopped'}
                />
              </div>
              <div>
                <label htmlFor="special" className="block text-sm font-medium text-nord-4 mb-1">
                  Enable --special flag
                </label>
                <p className="text-xs text-nord-4">
                  When enabled, llama-server will be started with the <code>--special</code> flag for this instance.
                </p>
              </div>
            </div>

            {/* Alias */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-nord-4 mb-1">
                Alias <span className="text-nord-11">*</span>
              </label>
              <input
                type="text"
                name="alias"
                value={formData.alias}
                onChange={handleChange}
                placeholder="model-name:size"
                required
                className="w-full px-3 py-2 bg-nord-2 border border-nord-3 text-nord-6 placeholder-nord-4 placeholder:opacity-60 rounded-md focus:ring-2 focus:ring-nord-10 focus:border-transparent"
              />
            </div>

            {/* Chat Template File */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-nord-4 mb-1">
                Chat Template File (Optional)
              </label>
              <input
                type="text"
                name="chat_template_file"
                value={formData.chat_template_file || ''}
                onChange={handleChange}
                placeholder="/path/to/template.jinja"
                className="w-full px-3 py-2 bg-nord-2 border border-nord-3 text-nord-6 placeholder-nord-4 placeholder:opacity-60 rounded-md focus:ring-2 focus:ring-nord-10 focus:border-transparent"
              />
            </div>

            {/* Threads */}
            <div>
              <label className="block text-sm font-medium text-nord-4 mb-1">
                Threads
              </label>
              <input
                type="number"
                name="threads"
                value={formData.threads}
                onChange={handleChange}
                min="1"
                className="w-full px-3 py-2 bg-nord-2 border border-nord-3 text-nord-6 placeholder-nord-4 placeholder:opacity-60 rounded-md focus:ring-2 focus:ring-nord-10 focus:border-transparent"
              />
            </div>

            {/* GPU Layers */}
            <div>
              <label className="block text-sm font-medium text-nord-4 mb-1">
                GPU Layers
              </label>
              <input
                type="number"
                name="n_gpu_layers"
                value={formData.n_gpu_layers}
                onChange={handleChange}
                min="0"
                className="w-full px-3 py-2 bg-nord-2 border border-nord-3 text-nord-6 placeholder-nord-4 placeholder:opacity-60 rounded-md focus:ring-2 focus:ring-nord-10 focus:border-transparent"
              />
            </div>

            {/* Context Size */}
            <div>
              <label className="block text-sm font-medium text-nord-4 mb-1">
                Context Size
              </label>
              <input
                type="number"
                name="ctx_size"
                value={formData.ctx_size}
                onChange={handleChange}
                min="512"
                step="512"
                className="w-full px-3 py-2 bg-nord-2 border border-nord-3 text-nord-6 placeholder-nord-4 placeholder:opacity-60 rounded-md focus:ring-2 focus:ring-nord-10 focus:border-transparent"
              />
            </div>

            {/* Temperature */}
            <div>
              <label className="block text-sm font-medium text-nord-4 mb-1">
                Temperature
              </label>
              <input
                type="number"
                name="temp"
                value={formData.temp}
                onChange={handleChange}
                min="0"
                max="2"
                step="0.01"
                className="w-full px-3 py-2 bg-nord-2 border border-nord-3 text-nord-6 placeholder-nord-4 placeholder:opacity-60 rounded-md focus:ring-2 focus:ring-nord-10 focus:border-transparent"
              />
            </div>

            {/* Top P */}
            <div>
              <label className="block text-sm font-medium text-nord-4 mb-1">
                Top P
              </label>
              <input
                type="number"
                name="top_p"
                value={formData.top_p}
                onChange={handleChange}
                min="0"
                max="1"
                step="0.01"
                className="w-full px-3 py-2 bg-nord-2 border border-nord-3 text-nord-6 placeholder-nord-4 placeholder:opacity-60 rounded-md focus:ring-2 focus:ring-nord-10 focus:border-transparent"
              />
            </div>

            {/* Top K */}
            <div>
              <label className="block text-sm font-medium text-nord-4 mb-1">
                Top K
              </label>
              <input
                type="number"
                name="top_k"
                value={formData.top_k}
                onChange={handleChange}
                min="0"
                className="w-full px-3 py-2 bg-nord-2 border border-nord-3 text-nord-6 placeholder-nord-4 placeholder:opacity-60 rounded-md focus:ring-2 focus:ring-nord-10 focus:border-transparent"
              />
            </div>

            {/* Min P */}
            <div>
              <label className="block text-sm font-medium text-nord-4 mb-1">
                Min P
              </label>
              <input
                type="number"
                name="min_p"
                value={formData.min_p}
                onChange={handleChange}
                min="0"
                max="1"
                step="0.01"
                className="w-full px-3 py-2 bg-nord-2 border border-nord-3 text-nord-6 placeholder-nord-4 placeholder:opacity-60 rounded-md focus:ring-2 focus:ring-nord-10 focus:border-transparent"
              />
            </div>

            {/* API Key */}
            <div>
              <label className="block text-sm font-medium text-nord-4 mb-1">
                API Key
              </label>
              <input
                type="text"
                name="api_key"
                value={formData.api_key}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-nord-2 border border-nord-3 text-nord-6 placeholder-nord-4 placeholder:opacity-60 rounded-md focus:ring-2 focus:ring-nord-10 focus:border-transparent"
              />
            </div>

            {/* Host */}
            <div>
              <label className="block text-sm font-medium text-nord-4 mb-1">
                Host
              </label>
              <input
                type="text"
                name="host"
                value={formData.host}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-nord-2 border border-nord-3 text-nord-6 placeholder-nord-4 placeholder:opacity-60 rounded-md focus:ring-2 focus:ring-nord-10 focus:border-transparent"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-nord-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-nord-3 text-nord-6 rounded-md hover:bg-nord-2 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-nord-10 text-nord-6 rounded-md hover:bg-nord-9 transition-colors disabled:opacity-50 font-medium"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

