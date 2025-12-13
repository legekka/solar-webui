import { useState } from 'react';
import { X, Cpu, Brain, Tags, Binary } from 'lucide-react';
import { 
  InstanceConfig, 
  BackendType, 
  LlamaCppConfig, 
  HuggingFaceCausalConfig, 
  HuggingFaceClassificationConfig,
  HuggingFaceEmbeddingConfig,
  getBackendLabel 
} from '@/api/types';

interface AddInstanceModalProps {
  hostId: string;
  hostName: string;
  onClose: () => void;
  onCreate: (hostId: string, config: InstanceConfig) => Promise<void>;
}

type BackendOption = {
  value: BackendType;
  label: string;
  icon: typeof Cpu;
  description: string;
};

const BACKEND_OPTIONS: BackendOption[] = [
  { 
    value: 'llamacpp', 
    label: 'llama.cpp', 
    icon: Cpu,
    description: 'GGUF models with llama-server'
  },
  { 
    value: 'huggingface_causal', 
    label: 'HuggingFace Causal LM', 
    icon: Brain,
    description: 'Text generation models'
  },
  { 
    value: 'huggingface_classification', 
    label: 'HuggingFace Classifier', 
    icon: Tags,
    description: 'Sequence classification models'
  },
  { 
    value: 'huggingface_embedding', 
    label: 'HuggingFace Embedding', 
    icon: Binary,
    description: 'Embedding models (last hidden state)'
  },
];

const DEVICE_OPTIONS = ['auto', 'cuda', 'mps', 'cpu'];
const DTYPE_OPTIONS = ['auto', 'float16', 'bfloat16', 'float32'];

// Default values for each backend type
const getDefaultConfig = (backendType: BackendType): Partial<InstanceConfig> => {
  const base = {
    host: '0.0.0.0',
    api_key: 'aiops',
  };

  switch (backendType) {
    case 'llamacpp':
      return {
        ...base,
        backend_type: 'llamacpp',
        model: '',
        alias: '',
        threads: 1,
        n_gpu_layers: 999,
        temp: 1,
        top_p: 1,
        top_k: 0,
        min_p: 0,
        ctx_size: 131072,
        chat_template_file: '',
        special: false,
      } as Partial<LlamaCppConfig>;
    case 'huggingface_causal':
      return {
        ...base,
        backend_type: 'huggingface_causal',
        model_id: '',
        alias: '',
        device: 'auto',
        dtype: 'auto',
        max_length: 4096,
        trust_remote_code: false,
        use_flash_attention: false,
      } as Partial<HuggingFaceCausalConfig>;
    case 'huggingface_classification':
      return {
        ...base,
        backend_type: 'huggingface_classification',
        model_id: '',
        alias: '',
        device: 'auto',
        dtype: 'auto',
        max_length: 512,
        labels: [],
        trust_remote_code: false,
      } as Partial<HuggingFaceClassificationConfig>;
    case 'huggingface_embedding':
      return {
        ...base,
        backend_type: 'huggingface_embedding',
        model_id: '',
        alias: '',
        device: 'auto',
        dtype: 'auto',
        max_length: 512,
        normalize_embeddings: true,
        trust_remote_code: false,
      } as Partial<HuggingFaceEmbeddingConfig>;
    default:
      return base;
  }
};

export function AddInstanceModal({ hostId, hostName, onClose, onCreate }: AddInstanceModalProps) {
  const [loading, setLoading] = useState(false);
  const [backendType, setBackendType] = useState<BackendType>('llamacpp');
  const [formData, setFormData] = useState<Partial<InstanceConfig>>(getDefaultConfig('llamacpp'));
  const [labelsInput, setLabelsInput] = useState('');

  const handleBackendChange = (newBackend: BackendType) => {
    setBackendType(newBackend);
    setFormData(getDefaultConfig(newBackend));
    setLabelsInput('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields based on backend type
    if (backendType === 'llamacpp') {
      const config = formData as Partial<LlamaCppConfig>;
      if (!config.model || !config.alias) {
        alert('Model Path and Alias are required');
        return;
      }
    } else {
      const config = formData as Partial<HuggingFaceCausalConfig | HuggingFaceClassificationConfig>;
      if (!config.model_id || !config.alias) {
        alert('Model ID and Alias are required');
        return;
      }
    }

    // Parse labels for classification models
    let finalConfig = { ...formData };
    if (backendType === 'huggingface_classification' && labelsInput.trim()) {
      (finalConfig as Partial<HuggingFaceClassificationConfig>).labels = 
        labelsInput.split(',').map(l => l.trim()).filter(l => l);
    }

    setLoading(true);
    try {
      await onCreate(hostId, finalConfig as InstanceConfig);
      onClose();
    } catch (error: any) {
      console.error('Failed to create instance:', error);
      alert(`Failed to create instance: ${error.response?.data?.detail || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
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
          <h2 className="text-xl font-bold text-nord-6">Add Instance to {hostName}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-nord-2 rounded transition-colors text-nord-4"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Backend Type Selection */}
          <div>
            <label className="block text-sm font-medium text-nord-4 mb-3">
              Backend Type
            </label>
            <div className="grid grid-cols-3 gap-3">
              {BACKEND_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isSelected = backendType === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleBackendChange(option.value)}
                    className={`p-3 rounded-lg border-2 transition-all text-left ${
                      isSelected
                        ? 'border-nord-10 bg-nord-10 bg-opacity-10'
                        : 'border-nord-3 hover:border-nord-4 bg-nord-2'
                    }`}
                  >
                    <Icon 
                      size={24} 
                      className={isSelected ? 'text-nord-10' : 'text-nord-4'} 
                    />
                    <div className={`mt-2 text-sm font-medium ${isSelected ? 'text-nord-10' : 'text-nord-6'}`}>
                      {option.label}
                    </div>
                    <div className="text-xs text-nord-4 mt-1">
                      {option.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-nord-3 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Common Fields */}
              {backendType === 'llamacpp' ? (
                /* llama.cpp specific fields */
                <>
                  {/* Model Path */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-nord-4 mb-1">
                      Model Path <span className="text-nord-11">*</span>
                    </label>
                    <input
                      type="text"
                      name="model"
                      value={(formData as Partial<LlamaCppConfig>).model || ''}
                      onChange={handleChange}
                      placeholder="/path/to/model.gguf"
                      required
                      className="w-full px-3 py-2 bg-nord-2 border border-nord-3 text-nord-6 placeholder-nord-4 placeholder:opacity-60 rounded-md focus:ring-2 focus:ring-nord-10 focus:border-transparent"
                    />
                  </div>

                  {/* Alias */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-nord-4 mb-1">
                      Alias <span className="text-nord-11">*</span>
                    </label>
                    <input
                      type="text"
                      name="alias"
                      value={formData.alias || ''}
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
                      value={(formData as Partial<LlamaCppConfig>).chat_template_file || ''}
                      onChange={handleChange}
                      placeholder="/path/to/template.jinja"
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
                        checked={!!(formData as Partial<LlamaCppConfig>).special}
                        onChange={handleChange}
                        className="h-4 w-4 rounded border-nord-3 bg-nord-1 text-nord-10 focus:ring-nord-10"
                      />
                    </div>
                    <div>
                      <label htmlFor="special" className="block text-sm font-medium text-nord-4 mb-1">
                        Enable --special flag
                      </label>
                      <p className="text-xs text-nord-4">
                        When enabled, llama-server will be started with the <code>--special</code> flag.
                      </p>
                    </div>
                  </div>

                  {/* Threads */}
                  <div>
                    <label className="block text-sm font-medium text-nord-4 mb-1">
                      Threads
                    </label>
                    <input
                      type="number"
                      name="threads"
                      value={(formData as Partial<LlamaCppConfig>).threads}
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
                      value={(formData as Partial<LlamaCppConfig>).n_gpu_layers}
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
                      value={(formData as Partial<LlamaCppConfig>).ctx_size}
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
                      value={(formData as Partial<LlamaCppConfig>).temp}
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
                      value={(formData as Partial<LlamaCppConfig>).top_p}
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
                      value={(formData as Partial<LlamaCppConfig>).top_k}
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
                      value={(formData as Partial<LlamaCppConfig>).min_p}
                      onChange={handleChange}
                      min="0"
                      max="1"
                      step="0.01"
                      className="w-full px-3 py-2 bg-nord-2 border border-nord-3 text-nord-6 placeholder-nord-4 placeholder:opacity-60 rounded-md focus:ring-2 focus:ring-nord-10 focus:border-transparent"
                    />
                  </div>
                </>
              ) : (
                /* HuggingFace specific fields */
                <>
                  {/* Model ID */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-nord-4 mb-1">
                      Model ID <span className="text-nord-11">*</span>
                    </label>
                    <input
                      type="text"
                      name="model_id"
                      value={(formData as Partial<HuggingFaceCausalConfig>).model_id || ''}
                      onChange={handleChange}
                      placeholder="microsoft/deberta-v3-base or /local/path"
                      required
                      className="w-full px-3 py-2 bg-nord-2 border border-nord-3 text-nord-6 placeholder-nord-4 placeholder:opacity-60 rounded-md focus:ring-2 focus:ring-nord-10 focus:border-transparent"
                    />
                    <p className="text-xs text-nord-4 mt-1">
                      HuggingFace model ID or local path
                    </p>
                  </div>

                  {/* Alias */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-nord-4 mb-1">
                      Alias <span className="text-nord-11">*</span>
                    </label>
                    <input
                      type="text"
                      name="alias"
                      value={formData.alias || ''}
                      onChange={handleChange}
                      placeholder="classifier:deberta"
                      required
                      className="w-full px-3 py-2 bg-nord-2 border border-nord-3 text-nord-6 placeholder-nord-4 placeholder:opacity-60 rounded-md focus:ring-2 focus:ring-nord-10 focus:border-transparent"
                    />
                  </div>

                  {/* Device */}
                  <div>
                    <label className="block text-sm font-medium text-nord-4 mb-1">
                      Device
                    </label>
                    <select
                      name="device"
                      value={(formData as Partial<HuggingFaceCausalConfig>).device || 'auto'}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-nord-2 border border-nord-3 text-nord-6 rounded-md focus:ring-2 focus:ring-nord-10 focus:border-transparent"
                    >
                      {DEVICE_OPTIONS.map((d) => (
                        <option key={d} value={d}>
                          {d === 'auto' ? 'auto (detect)' : d}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Dtype */}
                  <div>
                    <label className="block text-sm font-medium text-nord-4 mb-1">
                      Data Type
                    </label>
                    <select
                      name="dtype"
                      value={(formData as Partial<HuggingFaceCausalConfig>).dtype || 'auto'}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-nord-2 border border-nord-3 text-nord-6 rounded-md focus:ring-2 focus:ring-nord-10 focus:border-transparent"
                    >
                      {DTYPE_OPTIONS.map((d) => (
                        <option key={d} value={d}>
                          {d === 'auto' ? 'auto (detect)' : d}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Max Length */}
                  <div>
                    <label className="block text-sm font-medium text-nord-4 mb-1">
                      Max Length
                    </label>
                    <input
                      type="number"
                      name="max_length"
                      value={(formData as Partial<HuggingFaceCausalConfig>).max_length}
                      onChange={handleChange}
                      min="1"
                      className="w-full px-3 py-2 bg-nord-2 border border-nord-3 text-nord-6 placeholder-nord-4 placeholder:opacity-60 rounded-md focus:ring-2 focus:ring-nord-10 focus:border-transparent"
                    />
                  </div>

                  {/* Classification-specific: Labels */}
                  {backendType === 'huggingface_classification' && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-nord-4 mb-1">
                        Labels (Optional)
                      </label>
                      <input
                        type="text"
                        value={labelsInput}
                        onChange={(e) => setLabelsInput(e.target.value)}
                        placeholder="positive, negative, neutral"
                        className="w-full px-3 py-2 bg-nord-2 border border-nord-3 text-nord-6 placeholder-nord-4 placeholder:opacity-60 rounded-md focus:ring-2 focus:ring-nord-10 focus:border-transparent"
                      />
                      <p className="text-xs text-nord-4 mt-1">
                        Comma-separated list of label names. Leave empty to use model defaults.
                      </p>
                    </div>
                  )}

                  {/* Embedding-specific: Normalize Embeddings */}
                  {backendType === 'huggingface_embedding' && (
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="normalize_embeddings"
                        name="normalize_embeddings"
                        checked={!!(formData as Partial<HuggingFaceEmbeddingConfig>).normalize_embeddings}
                        onChange={handleChange}
                        className="h-4 w-4 mt-0.5 rounded border-nord-3 bg-nord-1 text-nord-10 focus:ring-nord-10"
                      />
                      <div>
                        <label htmlFor="normalize_embeddings" className="block text-sm font-medium text-nord-4">
                          Normalize Embeddings
                        </label>
                        <p className="text-xs text-nord-4">
                          L2 normalize output embedding vectors
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Trust Remote Code */}
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="trust_remote_code"
                      name="trust_remote_code"
                      checked={!!(formData as Partial<HuggingFaceCausalConfig>).trust_remote_code}
                      onChange={handleChange}
                      className="h-4 w-4 mt-0.5 rounded border-nord-3 bg-nord-1 text-nord-10 focus:ring-nord-10"
                    />
                    <div>
                      <label htmlFor="trust_remote_code" className="block text-sm font-medium text-nord-4">
                        Trust Remote Code
                      </label>
                      <p className="text-xs text-nord-4">
                        Allow running custom model code from HuggingFace
                      </p>
                    </div>
                  </div>

                  {/* Causal-specific: Flash Attention */}
                  {backendType === 'huggingface_causal' && (
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="use_flash_attention"
                        name="use_flash_attention"
                        checked={!!(formData as Partial<HuggingFaceCausalConfig>).use_flash_attention}
                        onChange={handleChange}
                        className="h-4 w-4 mt-0.5 rounded border-nord-3 bg-nord-1 text-nord-10 focus:ring-nord-10"
                      />
                      <div>
                        <label htmlFor="use_flash_attention" className="block text-sm font-medium text-nord-4">
                          Use Flash Attention 2
                        </label>
                        <p className="text-xs text-nord-4">
                          Enable Flash Attention for faster inference (requires compatible GPU)
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}

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
              {loading ? 'Creating...' : `Create ${getBackendLabel(backendType)} Instance`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
