import React, { useState, useRef, useEffect } from 'react';
import { Plus, ZoomIn, ZoomOut, Calendar, Heart, GraduationCap, Briefcase, Baby, Star, X, Camera, ChevronLeft, ChevronRight, Images, BookOpen, Settings, ChevronDown } from 'lucide-react';
// Optional AI import (safe to remove)
// import { classifyPhotos } from './ai/PhotoClassifier';
import { fetchEvents as fetchEventsFromDb, createEvent as createEventInDb, updateEvent as updateEventInDb, deleteEvent as deleteEventInDb } from './api/events';
import { fetchPhotosForEvent, addPhotoRow } from './api/photos';
import { uploadToBucket } from './api/storage';

// [Then all your EventFull component code...]

const DEFAULT_BACKGROUNDS = [
  {
    id: 'bg-mountains',
    name: 'Calm Mountains',
    url: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1600&auto=format&fit=crop'
  },
  {
    id: 'bg-sky',
    name: 'Soft Sky',
    url: 'https://images.unsplash.com/photo-1496307042754-b4aa456c4a2d?q=80&w=1600&auto=format&fit=crop'
  },
  {
    id: 'bg-abstract',
    name: 'Gentle Abstract',
    url: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1600&auto=format&fit=crop'
  }
];

function BackgroundModal({ current, onSelect, onClear, onClose }) {
  const [uploadPreview, setUploadPreview] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file (JPG, PNG, WebP)');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File too large. Please select an image under 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Check dimensions
        const { width, height } = img;
        const aspectRatio = width / height;
        
        let guidance = '';
        if (width < 1200 || height < 800) {
          guidance = `Image is ${width}×${height}. For best results, use at least 1920×1080.`;
        } else if (aspectRatio < 1.5 || aspectRatio > 2.5) {
          guidance = `Aspect ratio is ${aspectRatio.toFixed(1)}:1. Landscape images (1.5:1 to 2.5:1) work best.`;
        }

        setUploadPreview({
          url: e.target.result,
          width,
          height,
          guidance
        });
        setUploadError('');
      };
      img.onerror = () => {
        setUploadError('Unable to load image. Please try another file.');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  const applyUpload = () => {
    if (uploadPreview) {
      onSelect(uploadPreview.url);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-xl font-bold text-gray-900">Choose Background</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {DEFAULT_BACKGROUNDS.map(bg => (
              <button key={bg.id} type="button" onClick={() => onSelect(bg.url)} className={`border rounded overflow-hidden text-left ${current===bg.url? 'ring-2 ring-blue-500' : ''}`}>
                <div className="w-full h-32 bg-gray-100 overflow-hidden">
                  <img src={bg.url} alt={bg.name} className="w-full h-full object-cover" />
                </div>
                <div className="px-3 py-2 text-sm text-gray-800">{bg.name}</div>
              </button>
            ))}
          </div>

          {/* Upload Section */}
          <div className="mt-6 border-t pt-4">
            <h4 className="text-lg font-semibold text-gray-900 mb-3">Upload Your Own</h4>
            
            {/* Upload Guidelines */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <div className="text-sm text-blue-800">
                <div className="font-medium mb-2">📋 Upload Guidelines:</div>
                <ul className="space-y-1 text-xs">
                  <li>• <strong>Format:</strong> JPG, PNG, or WebP</li>
                  <li>• <strong>Size:</strong> Under 10MB</li>
                  <li>• <strong>Dimensions:</strong> At least 1920×1080 (16:9 ratio works best)</li>
                  <li>• <strong>Style:</strong> Subtle, not too busy - it will be dimmed in the app</li>
                </ul>
              </div>
            </div>

            {/* Upload Area */}
            <div className="space-y-3">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition-colors"
              >
                {uploadPreview ? (
                  <div className="space-y-3">
                    <div className="relative inline-block">
                      <img 
                        src={uploadPreview.url} 
                        alt="Preview" 
                        className="max-h-48 max-w-full rounded shadow-sm"
                      />
                    </div>
                    <div className="text-sm text-gray-600">
                      {uploadPreview.width} × {uploadPreview.height}
                    </div>
                    {uploadPreview.guidance && (
                      <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                        💡 {uploadPreview.guidance}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="text-gray-400 mb-2">
                      <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-600">Click to upload an image</p>
                    <p className="text-xs text-gray-400 mt-1">or drag and drop</p>
                  </div>
                )}
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleUpload}
                className="hidden"
              />

              {uploadError && (
                <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                  ❌ {uploadError}
                </div>
              )}

              {uploadPreview && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={applyUpload}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Use This Background
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUploadPreview(null);
                      setUploadError('');
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Choose Different
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4 mt-6 border-t">
            <button
              type="button"
              onClick={onClear}
              className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
            >
              No Background
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsModal({ currentBackground, onSelectBackground, onClearBackground, onClose }) {
  const [activeTab, setActiveTab] = useState('background');
  // Background upload (settings)
  const [bgUploadPreview, setBgUploadPreview] = useState(null);
  const [bgUploadError, setBgUploadError] = useState('');
  const bgFileInputRef = useRef(null);
  const [customCategories, setCustomCategories] = useState(() => {
    try { 
      const saved = localStorage.getItem('eventfull:customCategories');
      return saved ? JSON.parse(saved) : {}; 
    } catch { 
      return {}; 
    }
  });
  const [editingCategory, setEditingCategory] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryKey, setNewCategoryKey] = useState('');

  // Save custom categories to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('eventfull:customCategories', JSON.stringify(customCategories));
    } catch {}
  }, [customCategories]);

  // Get all categories (default + custom)
  const getAllCategories = () => {
    const merged = { ...categoryConfig };
    Object.entries(customCategories).forEach(([key, custom]) => {
      merged[key] = {
        ...categoryConfig[custom.baseCategory] || categoryConfig.milestone,
        label: custom.label
      };
    });
    return merged;
  };

  const allCategories = getAllCategories();
  const totalCategories = Object.keys(allCategories).length;
  const canAddMore = totalCategories < 10;

  // Background upload handlers (compact, mirrors BackgroundModal validation)
  const handleBgUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setBgUploadError('Please select an image file (JPG, PNG, WebP)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setBgUploadError('File too large. Please select an image under 10MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const { width, height } = img;
        const aspectRatio = width / height;
        let guidance = '';
        if (width < 1200 || height < 800) {
          guidance = `Image is ${width}×${height}. Use at least 1920×1080 for best results.`;
        } else if (aspectRatio < 1.5 || aspectRatio > 2.5) {
          guidance = `Aspect ratio is ${aspectRatio.toFixed(1)}:1. Landscape works best (≈16:9).`;
        }
        setBgUploadPreview({ url: ev.target.result, width, height, guidance });
        setBgUploadError('');
      };
      img.onerror = () => setBgUploadError('Unable to load image. Please try another file.');
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const applyBgUpload = () => {
    if (bgUploadPreview) {
      onSelectBackground(bgUploadPreview.url);
      setBgUploadPreview(null);
      if (bgFileInputRef.current) bgFileInputRef.current.value = '';
    }
  };

  const saveCustomCategory = (key, label, baseCategory = 'milestone') => {
    setCustomCategories(prev => ({
      ...prev,
      [key]: { label, baseCategory }
    }));
  };

  const deleteCustomCategory = (key) => {
    setCustomCategories(prev => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
  };

  const startEditing = (key, currentLabel) => {
    setEditingCategory(key);
    setNewCategoryName(currentLabel);
  };

  const saveEdit = () => {
    if (editingCategory && newCategoryName.trim()) {
      saveCustomCategory(editingCategory, newCategoryName.trim());
      setEditingCategory(null);
      setNewCategoryName('');
    }
  };

  const addNewCategory = () => {
    if (newCategoryKey.trim() && newCategoryName.trim() && canAddMore) {
      const key = newCategoryKey.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      if (key && !allCategories[key]) {
        saveCustomCategory(key, newCategoryName.trim());
        setNewCategoryKey('');
        setNewCategoryName('');
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-xl font-bold text-gray-900">Settings</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              type="button"
              onClick={() => setActiveTab('background')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'background'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Background
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('categories')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'categories'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Category Labels
            </button>
          </nav>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Background Tab */}
          {activeTab === 'background' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Choose Background</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {DEFAULT_BACKGROUNDS.map(bg => (
                    <button 
                      key={bg.id} 
                      type="button" 
                      onClick={() => onSelectBackground(bg.url)} 
                      className={`border rounded overflow-hidden text-left transition-all ${
                        currentBackground === bg.url ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="w-full h-24 bg-gray-100 overflow-hidden">
                        <img src={bg.url} alt={bg.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="px-2 py-1 text-xs text-gray-800">{bg.name}</div>
                    </button>
                  ))}
                </div>
                
                {/* Upload Your Own (compact) */}
                <div className="mt-4 border-t pt-4">
                  <h5 className="font-medium text-gray-900 mb-2">Upload Your Own</h5>
                  <div 
                    onClick={() => bgFileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 transition-colors"
                  >
                    {bgUploadPreview ? (
                      <div className="space-y-2">
                        <img src={bgUploadPreview.url} alt="Preview" className="max-h-32 mx-auto rounded shadow-sm" />
                        <div className="text-xs text-gray-600">{bgUploadPreview.width} × {bgUploadPreview.height}</div>
                        {bgUploadPreview.guidance && (
                          <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">{bgUploadPreview.guidance}</div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="text-gray-400 mb-1">
                          <svg className="w-10 h-10 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                        </div>
                        <p className="text-sm text-gray-600">Click to upload an image</p>
                        <p className="text-xs text-gray-400 mt-1">JPG, PNG, or WebP • up to 10MB</p>
                      </div>
                    )}
                  </div>
                  <input
                    ref={bgFileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleBgUpload}
                    className="hidden"
                  />
                  {bgUploadError && (
                    <div className="text-xs text-red-600 bg-red-50 p-2 rounded mt-2">{bgUploadError}</div>
                  )}
                  {bgUploadPreview && (
                    <div className="flex gap-2 mt-2">
                      <button type="button" onClick={applyBgUpload} className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">Use This Background</button>
                      <button 
                        type="button"
                        onClick={() => { setBgUploadPreview(null); setBgUploadError(''); if (bgFileInputRef.current) bgFileInputRef.current.value=''; }}
                        className="px-3 py-1.5 border border-gray-300 rounded text-sm hover:bg-gray-50"
                      >Choose Different</button>
                    </div>
                  )}
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => onClearBackground()}
                    className="px-3 py-1.5 border border-red-300 text-red-600 rounded text-sm hover:bg-red-50 transition-colors"
                  >
                    No Background
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Category Labels Tab */}
          {activeTab === 'categories' && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-lg font-semibold text-gray-900">Event Categories</h4>
                  <span className="text-sm text-gray-500">{totalCategories}/10 categories</span>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Manage your event categories. You can rename existing categories and add up to 10 total categories.
                </p>
                
                {/* Existing Categories */}
                <div className="space-y-2 mb-4">
                  {Object.entries(allCategories).map(([key, config]) => {
                    const IconComponent = config.icon;
                    const isDefault = Object.keys(categoryConfig).includes(key);
                    const isEditing = editingCategory === key;
                    
                    return (
                      <div key={key} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-full ${config.color} flex items-center justify-center flex-shrink-0`}>
                            <IconComponent className="w-3 h-3 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            {isEditing ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={newCategoryName}
                                  onChange={(e) => setNewCategoryName(e.target.value)}
                                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                                  placeholder="Category name"
                                />
                                <button
                                  type="button"
                                  onClick={saveEdit}
                                  className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingCategory(null);
                                    setNewCategoryName('');
                                  }}
                                  className="px-2 py-1 border border-gray-300 rounded text-xs hover:bg-gray-50"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium text-gray-900 truncate">{config.label}</div>
                                  <div className="text-xs text-gray-500">Category: {key}</div>
                                </div>
                                <div className="flex gap-1 flex-shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => startEditing(key, config.label)}
                                    className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                                  >
                                    Rename
                                  </button>
                                  {!isDefault && (
                                    <button
                                      type="button"
                                      onClick={() => deleteCustomCategory(key)}
                                      className="px-2 py-1 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50"
                                    >
                                      Delete
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Add New Category */}
                {canAddMore && (
                  <div className="border border-dashed border-gray-300 rounded-lg p-3">
                    <h5 className="font-medium text-gray-900 mb-2">Add New Category</h5>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Category Key</label>
                        <input
                          type="text"
                          value={newCategoryKey}
                          onChange={(e) => setNewCategoryKey(e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="e.g., travel, hobby, achievement"
                        />
                        <p className="text-xs text-gray-500 mt-1">Use lowercase letters and numbers only</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Category Name</label>
                        <input
                          type="text"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="e.g., Travel, Hobby, Achievement"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={addNewCategory}
                        disabled={!newCategoryKey.trim() || !newCategoryName.trim()}
                        className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Add Category
                      </button>
                    </div>
                  </div>
                )}

                {!canAddMore && (
                  <div className="text-sm text-gray-500 bg-gray-50 p-2 rounded">
                    You've reached the maximum of 10 categories. Delete a custom category to add a new one.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Close Button */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close Settings
          </button>
        </div>
      </div>
    </div>
  );
}

// Sample life events data (kept for reference)
// eslint-disable-next-line no-unused-vars
const sampleEvents = [
  {
    id: 1,
    title: "Born",
    description: "The beginning of my journey",
    date: new Date("1990-03-15"),
    category: "milestone",
    importance: 10,
    image: null,
    images: [],
    journals: []
  },
  {
    id: 2,
    title: "First Day of School",
    description: "Started kindergarten at Sunny Elementary",
    date: new Date("1995-09-05"),
    category: "education",
    importance: 7,
    image: null,
    images: [],
    journals: []
  },
  {
    id: 3,
    title: "10th Birthday",
    description: "Double digits! Had a amazing party with friends",
    date: new Date("2000-03-15"),
    category: "birthday",
    importance: 6,
    image: null,
    images: [],
    journals: []
  },
  {
    id: 4,
    title: "Got Driver's License",
    description: "Freedom! Passed on the first try",
    date: new Date("2006-08-20"),
    category: "milestone",
    importance: 8,
    image: null,
    images: [],
    journals: []
  },
  {
    id: 5,
    title: "High School Graduation",
    description: "Graduated valedictorian from Central High",
    date: new Date("2008-06-15"),
    category: "education",
    importance: 9,
    image: null,
    images: [],
    journals: []
  },
  {
    id: 6,
    title: "Started College",
    description: "Began Computer Science at State University",
    date: new Date("2008-08-25"),
    category: "education",
    importance: 8,
    image: null,
    images: [],
    journals: []
  },
  {
    id: 7,
    title: "21st Birthday",
    description: "Legal! Celebrated with family and friends",
    date: new Date("2011-03-15"),
    category: "birthday",
    importance: 7,
    image: null,
    images: [],
    journals: []
  },
  {
    id: 8,
    title: "College Graduation",
    description: "Bachelor's in Computer Science, Summa Cum Laude",
    date: new Date("2012-05-20"),
    category: "education",
    importance: 9,
    image: null,
    images: [],
    journals: []
  },
  {
    id: 9,
    title: "First Job",
    description: "Software Engineer at TechCorp",
    date: new Date("2012-07-01"),
    category: "career",
    importance: 8,
    image: null,
    images: [],
    journals: []
  },
  {
    id: 10,
    title: "Met My Partner",
    description: "Met the love of my life at a coffee shop",
    date: new Date("2014-11-12"),
    category: "relationship",
    importance: 10,
    image: null,
    images: [],
    journals: []
  },
  {
    id: 11,
    title: "Got Engaged",
    description: "Said yes to the perfect proposal!",
    date: new Date("2017-02-14"),
    category: "relationship",
    importance: 10,
    image: null,
    images: [],
    journals: []
  },
  {
    id: 12,
    title: "Wedding Day",
    description: "The most magical day of our lives",
    date: new Date("2018-06-23"),
    category: "relationship",
    importance: 10,
    image: null,
    images: [],
    journals: []
  },
  {
    id: 13,
    title: "30th Birthday",
    description: "Three decades of amazing memories",
    date: new Date("2020-03-15"),
    category: "birthday",
    importance: 8,
    image: null,
    images: [],
    journals: []
  },
  {
    id: 14,
    title: "Started My Own Business",
    description: "Launched EventFull - my dream project",
    date: new Date("2021-04-01"),
    category: "career",
    importance: 9,
    image: null,
    images: [],
    journals: []
  },
  {
    id: 15,
    title: "First Child Born",
    description: "Welcome to the world, little one!",
    date: new Date("2022-09-08"),
    category: "family",
    importance: 10,
    image: null,
    images: [],
    journals: []
  }
];

// Category configurations
const categoryConfig = {
  milestone: { color: 'bg-red-500', icon: Star, label: 'Milestone' },
  education: { color: 'bg-blue-500', icon: GraduationCap, label: 'Education' },
  career: { color: 'bg-green-500', icon: Briefcase, label: 'Career' },
  relationship: { color: 'bg-pink-500', icon: Heart, label: 'Relationship' },
  birthday: { color: 'bg-purple-500', icon: Calendar, label: 'Birthday' },
  family: { color: 'bg-orange-500', icon: Baby, label: 'Family' }
};

function EventGallery({ event, startIndex = 0, onClose }) {
  const [index, setIndex] = useState(startIndex);
  if (!event) return null;
  const gallery = [
    ...(event.image ? [{ id: 'main', url: event.image, name: event.title || 'Image', tags: [event.category] }] : []),
    ...(event.images || [])
  ];
  const goPrev = () => setIndex((i) => (i - 1 + gallery.length) % gallery.length);
  const goNext = () => setIndex((i) => (i + 1) % gallery.length);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">{event.title} — Photos</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 flex items-center gap-4">
          <button onClick={goPrev} className="p-2 rounded hover:bg-gray-100"><ChevronLeft className="w-5 h-5" /></button>
          <div className="flex-1">
            <div className="w-full h-[420px] bg-gray-100 rounded flex items-center justify-center overflow-hidden">
              {gallery[index]?.url && (
                <img src={gallery[index].url} alt={gallery[index].name || 'Photo'} className="max-h-full max-w-full object-contain" />
              )}
            </div>
            <div className="mt-2 text-center text-sm text-gray-600">
              {gallery[index]?.name || 'Photo'}
            </div>
          </div>
          <button onClick={goNext} className="p-2 rounded hover:bg-gray-100"><ChevronRight className="w-5 h-5" /></button>
        </div>
      </div>
    </div>
  );
}

function AllPhotosModal({ events, selectedCategories, onClose, onToggleCategory, onSelectAll, allCategories }) {
  // Session-local uploads added in the Photos modal
  const [uploadedPhotos] = useState([]); // {id, url, name, category}
  const contentRef = useRef(null);
  const [showBackToTop, setShowBackToTop] = useState(false);

  const basePhotos = events.flatMap((e) => {
    const photos = [];
    if (e.image) photos.push({ id: `${e.id}-main`, url: e.image, name: e.title || 'Image', eventId: e.id, category: e.category });
    (e.images || []).forEach((img) => photos.push({ ...img, eventId: e.id, category: e.category }));
    return photos;
  });
  const allPhotos = [...basePhotos, ...uploadedPhotos].filter(p => selectedCategories.has(p.category));

  const [selectedIdx, setSelectedIdx] = useState(0);
  // Keep selected index in range as photos/filters change
  useEffect(() => {
    if (allPhotos.length === 0) {
      setSelectedIdx(0);
    } else if (selectedIdx < 0 || selectedIdx >= allPhotos.length) {
      setSelectedIdx(0);
    }
  }, [allPhotos.length, selectedIdx]);
  const selectPrev = () => setSelectedIdx((i) => (i - 1 + allPhotos.length) % allPhotos.length);
  const selectNext = () => setSelectedIdx((i) => (i + 1) % allPhotos.length);

  const [lightboxIdx, setLightboxIdx] = useState(null);
  const openLightbox = (absoluteIdx) => setLightboxIdx(absoluteIdx);
  const closeLightbox = () => setLightboxIdx(null);
  const lbPrev = () => setLightboxIdx((i) => (i - 1 + allPhotos.length) % allPhotos.length);
  const lbNext = () => setLightboxIdx((i) => (i + 1) % allPhotos.length);

  // Event Photos modal does not include Manage Photos/AI

  // Track scroll to toggle back-to-top button
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const onScroll = () => setShowBackToTop(el.scrollTop > 300);
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToTop = () => {
    const el = contentRef.current;
    if (el) el.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Removed AI actions (run/apply/undo) from Event Photos modal

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-screen-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <Images className="w-5 h-5 text-gray-700" />
            <h3 className="text-lg font-semibold text-gray-900">Event Photos</h3>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div ref={contentRef} className="flex-1 overflow-y-auto p-4 relative">
          <div className="flex flex-wrap gap-2 mb-4 items-start">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onSelectAll}
                className="px-3 py-1 rounded-full border border-gray-300 bg-white text-sm text-gray-700 hover:bg-gray-50"
                title="Select all categories"
              >
                Select All
              </button>
                {Object.entries(allCategories).map(([key, config]) => {
                const active = selectedCategories.has(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onToggleCategory(key)}
                    className={`px-3 py-1 rounded-full border text-sm ${active ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50 opacity-70'}`}
                  >
                    {config.label}
                  </button>
                );
              })}
            </div>
              <div className="ml-auto flex items-center gap-2" />
          </div>

          {/* Manage Photos was removed from this modal */}

          {allPhotos.length === 0 ? (
            <div className="text-sm text-gray-600">No photos for the selected filters.</div>
          ) : (
            <div>
              {/* Viewer */}
              <div className="mb-4">
                <div className="w-full h-72 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
                  {allPhotos[selectedIdx]?.url && (
                    <img src={allPhotos[selectedIdx].url} alt={allPhotos[selectedIdx].name} className="max-h-full max-w-full object-contain" />
                  )}
                </div>
                <div className="flex items-center justify-between mt-2 text-sm">
                  <button type="button" onClick={selectPrev} className="px-3 py-1.5 border rounded">Previous</button>
                  <div className="text-gray-600 truncate mx-2 flex-1 text-center" title={allPhotos[selectedIdx]?.name}>{allPhotos[selectedIdx]?.name || 'Photo'}</div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => openLightbox(selectedIdx)} className="px-3 py-1.5 border rounded">Fullscreen</button>
                    <button type="button" onClick={selectNext} className="px-3 py-1.5 border rounded">Next</button>
            </div>
                </div>
              </div>

              {/* Thumbnail grid */}
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {allPhotos.map((p, i) => (
              <button
                    key={p.id}
                type="button"
                    onClick={() => setSelectedIdx(i)}
                    className={`bg-gray-100 rounded overflow-hidden cursor-pointer border ${i===selectedIdx ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-200'}`}
                    title={p.name}
                  >
                    <img src={p.url} alt={p.name} className="w-full h-32 object-cover" />
                    <div className="p-2 text-[11px] text-gray-700 text-left">
                        <div className="font-medium truncate" title={p.name}>{p.name}</div>
                      <div className="text-gray-500">{allCategories[p.category]?.label || p.category}</div>
                      </div>
                  </button>
                ))}
                    </div>
              </div>
          )}

          {showBackToTop && (
              <button
                type="button"
              onClick={scrollToTop}
              className="absolute bottom-4 right-4 px-3 py-2 rounded-full shadow bg-white border text-gray-700 text-sm hover:bg-gray-50"
              title="Back to top"
            >
              ↑ Top
              </button>
          )}
        </div>
      </div>

      {lightboxIdx !== null && allPhotos[lightboxIdx] && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
          <button onClick={closeLightbox} className="absolute top-4 right-4 text-white hover:text-gray-200">
            <X className="w-6 h-6" />
          </button>
          <button onClick={lbPrev} className="absolute left-4 text-white hover:text-gray-200 p-2"><ChevronLeft className="w-8 h-8" /></button>
          <div className="max-w-5xl w-full">
            <div className="w-full h-[70vh] bg-black flex items-center justify-center">
              <img src={allPhotos[lightboxIdx].url} alt={allPhotos[lightboxIdx].name} className="max-h-full max-w-full object-contain" />
            </div>
            <div className="mt-3 text-center text-white text-sm">
              {allPhotos[lightboxIdx].name}
            </div>
          </div>
          <button onClick={lbNext} className="absolute right-4 text-white hover:text-gray-200 p-2"><ChevronRight className="w-8 h-8" /></button>
        </div>
      )}
    </div>
  );
}

// New standalone Manage Photos modal (upload/view/delete)
function ManagePhotosModal({ events, onClose }) {
  const [uploaded, setUploaded] = useState([]); // {id,url,name}
  const inputRef = useRef(null);
  const contentRef = useRef(null);

  const handleFiles = (files) => {
    const arr = Array.from(files || []);
    const readers = arr.map((file) => new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve({ id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`, url: r.result, name: file.name, file });
      r.readAsDataURL(file);
    }));
    Promise.all(readers).then((items) => setUploaded((prev) => [...prev, ...items]));
  };

  const onDrop = (e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); };
  const onDragOver = (e) => e.preventDefault();
  const removeOne = (id) => setUploaded((prev) => prev.filter(p => p.id !== id));
  const clearAll = () => setUploaded([]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-screen-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <Images className="w-5 h-5 text-gray-700" />
            <h3 className="text-lg font-semibold text-gray-900">Manage Photos</h3>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><X className="w-5 h-5" /></button>
        </div>
        <div ref={contentRef} className="flex-1 overflow-y-auto p-4">
          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400"
          >
            <div className="text-gray-600">Drag & drop photos here, or click to select</div>
            <div className="text-xs text-gray-400 mt-1">JPG, PNG, WebP. Many files supported.</div>
            <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
          </div>

          {uploaded.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-700">Uploaded this session: {uploaded.length}</div>
                <button type="button" onClick={clearAll} className="text-xs px-2 py-1 border rounded">Clear All</button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {uploaded.map((p) => (
                  <div key={p.id} className="relative group">
                    <img src={p.url} alt={p.name} className="w-full h-28 object-cover rounded" />
                    <div className="absolute inset-x-0 bottom-0 bg-black/50 text-white text-[11px] px-1 py-0.5 truncate">{p.name}</div>
                    <div className="absolute top-1 right-1 hidden group-hover:flex gap-1">
                      <button type="button" onClick={() => removeOne(p.id)} className="text-[10px] px-1.5 py-0.5 bg-white/90 border rounded">Remove</button>
                      {/* Minimal save-to-DB action: saves under the first event if available */}
                      {events[0] && (
                        <button
                          type="button"
                          className="text-[10px] px-1.5 py-0.5 bg-blue-600 text-white rounded"
                          onClick={async () => {
                            try {
                              const { publicUrl } = await uploadToBucket(events[0].id, p.file);
                              await addPhotoRow({ eventId: events[0].id, name: p.name, url: publicUrl });
                            } catch (e) {
                              console.error('Upload/save failed', e);
                            }
                          }}
                        >
                          Save
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="p-3 border-t bg-gray-50 text-right">
          <button type="button" onClick={onClose} className="px-3 py-2 border rounded">Close</button>
        </div>
      </div>
    </div>
  );
}

function AllJournalsModal({ events, selectedCategories, onClose, onToggleCategory, onSelectAll, allCategories }) {
  const allJournalsRaw = events.flatMap((e) => {
    const entries = (e.journals || []).map((j) => ({ ...j, eventId: e.id, eventTitle: e.title, eventDate: e.date, category: e.category }));
    return entries;
  }).filter(j => selectedCategories.has(j.category));

  const [sortBy, setSortBy] = useState('createdAt'); // 'createdAt' | 'eventDate' | 'title'
  const [sortDir, setSortDir] = useState('desc'); // 'asc' | 'desc'
  const [viewer, setViewer] = useState(null); // full entry object
  const [viewerIndex, setViewerIndex] = useState(-1); // index within sorted list
  const [search, setSearch] = useState('');

  const filtered = allJournalsRaw.filter((j) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (j.title || '').toLowerCase().includes(q) ||
      (j.content || '').toLowerCase().includes(q) ||
      (j.eventTitle || '').toLowerCase().includes(q)
    );
  });

  const sortedJournals = [...filtered].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    if (sortBy === 'title') {
      return a.title.localeCompare(b.title) * dir;
    }
    if (sortBy === 'eventDate') {
      return (new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()) * dir;
    }
    // createdAt default
    return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;
  });

  const toggleSort = (key) => {
    if (sortBy === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortDir('asc');
    }
  };

  const SortHeader = ({ label, field }) => (
    <button type="button" onClick={() => toggleSort(field)} className="flex items-center gap-1">
      <span>{label}</span>
      <span className="text-xs opacity-70">{sortBy === field ? (sortDir === 'asc' ? '▲' : '▼') : ''}</span>
    </button>
  );

  // When opening viewer, compute index within current sorted list
  const openViewer = (entry) => {
    const idx = sortedJournals.findIndex((j) => j.id === entry.id);
    setViewerIndex(idx);
    setViewer(entry);
  };

  // Keyboard navigation while viewer is open
  React.useEffect(() => {
    if (viewerIndex < 0) return;
    const handleKey = (e) => {
      if (!sortedJournals.length) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = (viewerIndex + 1) % sortedJournals.length;
        setViewerIndex(next);
        setViewer(sortedJournals[next]);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = (viewerIndex - 1 + sortedJournals.length) % sortedJournals.length;
        setViewerIndex(prev);
        setViewer(sortedJournals[prev]);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [viewerIndex, sortedJournals]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-screen-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-gray-700" />
            <h3 className="text-lg font-semibold text-gray-900">Your Journal</h3>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <button
              type="button"
              onClick={onSelectAll}
              className="px-3 py-1 rounded-full border border-gray-300 bg-white text-sm text-gray-700 hover:bg-gray-50"
              title="Select all categories"
            >
              Select All
            </button>
            {Object.entries(allCategories).map(([key, config]) => {
              const active = selectedCategories.has(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onToggleCategory(key)}
                  className={`px-3 py-1 rounded-full border text-sm ${active ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50 opacity-70'}`}
                >
                  {config.label}
                </button>
              );
            })}
            <div className="ml-auto flex items-center gap-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="px-3 py-2 border rounded text-sm w-64"
                placeholder="Search title, content, or event..."
              />
            </div>
          </div>

          {sortedJournals.length === 0 ? (
            <div className="text-sm text-gray-600">No journal entries for the selected filters.</div>
          ) : (
            <div className="overflow-auto border rounded">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-700">
                  <tr>
                    <th className="text-left font-semibold px-3 py-2 w-48"><SortHeader label="Title" field="title" /></th>
                    <th className="text-left font-semibold px-3 py-2 w-48">Event</th>
                    <th className="text-left font-semibold px-3 py-2 w-36"><SortHeader label="Event Date" field="eventDate" /></th>
                    <th className="text-left font-semibold px-3 py-2 w-40"><SortHeader label="Entry Date" field="createdAt" /></th>
                    <th className="text-left font-semibold px-3 py-2 w-28">Category</th>
                    <th className="text-left font-semibold px-3 py-2">Excerpt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sortedJournals.map((j) => (
                    <tr key={j.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openViewer(j)}>
                      <td className="px-3 py-2 font-medium text-gray-900 truncate" title={j.title || 'Journal Entry'}>
                        {j.title || 'Journal Entry'}
                      </td>
                      <td className="px-3 py-2 text-gray-800 truncate" title={j.eventTitle}>{j.eventTitle}</td>
                      <td className="px-3 py-2 text-gray-600">{new Date(j.eventDate).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' })}</td>
                      <td className="px-3 py-2 text-gray-600">{new Date(j.createdAt).toLocaleString()}</td>
                      <td className="px-3 py-2 text-gray-700">{allCategories[j.category]?.label || j.category}</td>
                      <td className="px-3 py-2 text-gray-700">
                        <span className="line-clamp-2" style={{display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden'}}>
                          {j.content}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {viewer && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <div className="text-xs text-gray-500">{allCategories[viewer.category]?.label || viewer.category}</div>
                <h4 className="text-lg font-semibold text-gray-900">{viewer.title || 'Journal Entry'}</h4>
                <div className="text-xs text-gray-600 mt-1">
                  <span className="mr-4"><strong>Event:</strong> {viewer.eventTitle} — {new Date(viewer.eventDate).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })}</span>
                  <span><strong>Entry:</strong> {new Date(viewer.createdAt).toLocaleString()}</span>
                </div>
              </div>
              <button onClick={() => { setViewer(null); setViewerIndex(-1); }} className="text-gray-500 hover:text-gray-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4">
              <div className="text-sm text-gray-800 whitespace-pre-wrap leading-6" style={{maxHeight:'70vh', overflow:'auto'}}>
                {viewer.content}
              </div>
              <div className="flex justify-between items-center mt-3 text-xs text-gray-500">
                <span>Use Up/Down arrow keys to browse</span>
                <span>{viewerIndex + 1} / {sortedJournals.length}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Add/Edit Event Form Component
function EventForm({ mode, initialEvent, onClose, onSave, onDelete, onOpenGallery, allCategories }) {
  const isEdit = mode === 'edit';
  const [formData, setFormData] = useState({
    title: initialEvent?.title || '',
    description: initialEvent?.description || '',
    date: initialEvent ? new Date(initialEvent.date).toISOString().slice(0, 10) : '',
    category: initialEvent?.category || 'milestone',
    importance: initialEvent?.importance ?? 5,
    image: initialEvent?.image || null,
    images: initialEvent?.images || [],
    journals: initialEvent?.journals || []
  });
  const [imagePreview, setImagePreview] = useState(initialEvent?.image || null);
  const fileInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  // Journal local draft
  const [journalDraft, setJournalDraft] = useState({ title: '', content: '' });
  const [editingJournalId, setEditingJournalId] = useState(null);

  const addJournal = () => {
    const hasDraft = journalDraft.content.trim().length > 0 || journalDraft.title.trim().length > 0;
    const newId = `${Date.now()}-journal`;
    const entry = hasDraft
      ? {
          id: newId,
          title: journalDraft.title.trim() || 'Journal Entry',
          content: journalDraft.content.trim(),
          createdAt: new Date().toISOString()
        }
      : {
          id: newId,
          title: 'Journal Entry',
          content: '',
          createdAt: new Date().toISOString()
        };

    setFormData((prev) => ({ ...prev, journals: [...(prev.journals || []), entry] }));
    setJournalDraft({ title: '', content: '' });
    // Open the newly added entry in edit mode if it was empty draft
    setEditingJournalId(newId);
  };

  const updateJournal = (id, updates) => {
    setFormData((prev) => ({
      ...prev,
      journals: (prev.journals || []).map(j => j.id === id ? { ...j, ...updates } : j)
    }));
  };

  const removeJournal = (id) => {
    setFormData((prev) => ({
      ...prev,
      journals: (prev.journals || []).filter(j => j.id !== id)
    }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
        setFormData({ ...formData, image: e.target.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGalleryUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const readers = files.map((file) => new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (ev) => resolve({ id: `${Date.now()}-${file.name}`, url: ev.target.result, name: file.name });
      reader.readAsDataURL(file);
    }));
    Promise.all(readers).then((items) => {
      setFormData((prev) => ({ ...prev, images: [...(prev.images || []), ...items] }));
    });
  };

  const renameGalleryItem = (id, name) => {
    setFormData((prev) => ({
      ...prev,
      images: (prev.images || []).map((img) => (img.id === id ? { ...img, name } : img))
    }));
  };

  const removeGalleryItem = (id) => {
    setFormData((prev) => ({
      ...prev,
      images: (prev.images || []).filter((img) => img.id !== id)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.title && formData.date) {
      const normalized = {
        id: isEdit ? initialEvent.id : Date.now(),
        ...formData,
        date: new Date(formData.date),
        importance: parseInt(formData.importance),
        images: formData.images || [],
        journals: formData.journals || []
      };
      onSave(normalized);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">{isEdit ? 'Edit Event' : 'Add New Event'}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Event title"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {Object.entries(allCategories).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="3"
                placeholder="Tell us about this event..."
              />
            </div>

            {/* Main photo (kept exactly as before behavior-wise) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Photo</label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition-colors"
              >
                {imagePreview ? (
                  <div className="relative">
                    <img src={imagePreview} alt="Preview" className="max-h-32 mx-auto rounded" />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setImagePreview(null);
                        setFormData({ ...formData, image: null });
                      }}
                      className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div>
                    <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Click to upload a photo</p>
                    <p className="text-xs text-gray-400 mt-1">JPG, PNG up to 10MB</p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>

            {/* Additional photos */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">Additional Photos</label>
                <button type="button" onClick={() => galleryInputRef.current?.click()} className="text-sm text-blue-600 hover:underline">Add Photos</button>
              </div>
              <input ref={galleryInputRef} type="file" accept="image/*" multiple onChange={handleGalleryUpload} className="hidden" />
              {(formData.images || []).length === 0 ? (
                <p className="text-xs text-gray-500">No additional photos yet.</p>
              ) : (
                <ul className="space-y-2">
                  {(formData.images || []).map((img, idx) => (
                    <li key={img.id} className="flex items-center gap-2 p-2 border rounded">
                      <img src={img.url} alt={img.name || `Photo ${idx+1}`} className="w-12 h-12 object-cover rounded cursor-pointer" onClick={() => onOpenGallery?.(formData, idx + (formData.image ? 1 : 0))} />
                      <input
                        type="text"
                        value={img.name || ''}
                        onChange={(e) => renameGalleryItem(img.id, e.target.value)}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                        placeholder="Photo name"
                      />
                      <button type="button" onClick={() => removeGalleryItem(img.id)} className="text-xs text-red-600 hover:underline">Remove</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Journals */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Journal Entries</label>
              </div>
              <div className="space-y-2 mb-3">
                <input
                  type="text"
                  value={journalDraft.title}
                  onChange={(e) => setJournalDraft({ ...journalDraft, title: e.target.value })}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  placeholder="Title (optional)"
                />
                <textarea
                  value={journalDraft.content}
                  onChange={(e) => setJournalDraft({ ...journalDraft, content: e.target.value })}
                  className="w-full px-2 py-2 border border-gray-300 rounded text-sm"
                  rows="3"
                  placeholder="Write a note about this event... (or click Add Entry to start)"
                />
                <button type="button" onClick={addJournal} className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">Add Entry</button>
              </div>

              {(formData.journals || []).length === 0 ? (
                <p className="text-xs text-gray-500">No journal entries yet.</p>
              ) : (
                <ul className="space-y-2">
                  {(formData.journals || []).map((j) => (
                    <li key={j.id} className="border rounded p-2">
                      {editingJournalId === j.id ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={j.title}
                            onChange={(e) => updateJournal(j.id, { title: e.target.value })}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                          <textarea
                            value={j.content}
                            onChange={(e) => updateJournal(j.id, { content: e.target.value })}
                            className="w-full px-2 py-2 border border-gray-300 rounded text-sm"
                            rows="3"
                          />
                          <div className="flex gap-2">
                            <button type="button" onClick={() => setEditingJournalId(null)} className="text-sm px-3 py-1 border rounded">Done</button>
                            <button type="button" onClick={() => removeJournal(j.id)} className="text-sm px-3 py-1 border rounded text-red-600">Delete</button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex justify-between items-center">
                            <div className="font-medium text-gray-900 truncate" title={j.title || 'Journal Entry'}>{j.title || 'Journal Entry'}</div>
                            <div className="text-xs text-gray-500">{new Date(j.createdAt).toLocaleString()}</div>
                          </div>
                          <div className="text-sm text-gray-700 whitespace-pre-wrap" style={{maxHeight:'4.5rem', overflow:'auto'}}>{j.content}</div>
                          <div className="flex gap-2 mt-2">
                            <button type="button" onClick={() => setEditingJournalId(j.id)} className="text-sm px-3 py-1 border rounded">Edit</button>
                            <button type="button" onClick={() => removeJournal(j.id)} className="text-sm px-3 py-1 border rounded text-red-600">Delete</button>
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              {isEdit && (
                <button
                  type="button"
                  onClick={() => { onDelete?.(initialEvent); onClose(); }}
                  className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Delete
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {isEdit ? 'Save Changes' : 'Add Event'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function EventFull() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const timelineRef = useRef(null);
  
  // Load custom categories from localStorage
  const [customCategories] = useState(() => {
    try { 
      const saved = localStorage.getItem('eventfull:customCategories');
      return saved ? JSON.parse(saved) : {}; 
    } catch { 
      return {}; 
    }
  });

  // Get all categories (default + custom)
  const getAllCategories = () => {
    const merged = { ...categoryConfig };
    Object.entries(customCategories).forEach(([key, custom]) => {
      merged[key] = {
        ...categoryConfig[custom.baseCategory] || categoryConfig.milestone,
        label: custom.label
      };
    });
    return merged;
  };

  const allCategories = getAllCategories();
  const allCategoryKeys = Object.keys(allCategories);
  const [selectedCategories, setSelectedCategories] = useState(new Set(allCategoryKeys));
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [photosMenuOpen, setPhotosMenuOpen] = useState(false);
  const [showManagePhotos, setShowManagePhotos] = useState(false);
  const [showAllJournals, setShowAllJournals] = useState(false);
  const [galleryForEvent, setGalleryForEvent] = useState(null);
  const [galleryStartIndex, setGalleryStartIndex] = useState(0);
  const [showBackgroundPicker, setShowBackgroundPicker] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [backgroundUrl, setBackgroundUrl] = useState(() => {
    try { return localStorage.getItem('eventfull:bg') || ''; } catch { return ''; }
  });

  // Load events from Supabase on mount
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const rows = await fetchEventsFromDb();
        // Map DB rows to existing shape used in UI
        let mapped = (rows || []).map((r) => ({
          id: r.id,
          title: r.title,
          description: r.description || '',
          date: new Date(r.date),
          category: r.category || 'milestone',
          image: r.image_url || null,
          images: [],
          importance: 6,
          journals: []
        }));
        // Load photos per event and attach to images
        mapped = await Promise.all(mapped.map(async (ev) => {
          try {
            const photos = await fetchPhotosForEvent(ev.id);
            const images = (photos || []).map(p => ({ id: p.id, url: p.url, name: p.name }));
            return { ...ev, images };
          } catch {
            return ev;
          }
        }));
        setEvents(mapped);
        setLoading(false);
      } catch (e) {
        console.error('Failed to load events', e);
        setError(e.message);
        setLoading(false);
        // Fallback to sample data if Supabase fails
        setEvents([
          {
            id: 'fallback-1',
            title: 'Welcome to EventFull',
            description: 'Your timeline will appear here once events are added.',
            date: new Date(),
            category: 'milestone',
            image: null,
            images: [],
            importance: 8,
            journals: []
          }
        ]);
      }
    })();
  }, []);

  useEffect(() => {
    try {
      if (backgroundUrl) localStorage.setItem('eventfull:bg', backgroundUrl); else localStorage.removeItem('eventfull:bg');
    } catch {}
  }, [backgroundUrl]);

  // Sort events by date
  const sortedEvents = [...events].sort((a, b) => a.date.getTime() - b.date.getTime());
  const filteredEvents = sortedEvents.filter(e => selectedCategories.has(e.category));

  // Show loading/error states
  if (loading) {
    return (
      <div className="w-full h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-gray-600">Loading your timeline...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-red-600 mb-2">Failed to load events</div>
          <div className="text-sm text-gray-600 mb-4">{error}</div>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Define functions before using them in empty state

  // If no events, show timeline with empty state but allow adding events
  if (sortedEvents.length === 0) {
    return (
      <div className="w-full h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col overflow-hidden relative">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200 px-6 py-4 relative z-10">
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center gap-2">
                <img src="/logo-eventfull.svg" alt="EventFull" className="w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12" />
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold"><span className="text-blue-600">Event</span><span className="text-purple-600">Full</span></h1>
              </div>
              <p className="text-gray-600 mt-1">Your Life's Timeline</p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Photos dropdown */}
              <div className="relative">
                <button
                  onClick={() => setPhotosMenuOpen((v) => !v)}
                  className="border border-gray-300 text-gray-700 px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-50"
                  title="Photos"
                >
                  <Images className="w-4 h-4" />
                  Photos
                  <ChevronDown className="w-4 h-4" />
                </button>
                {photosMenuOpen && (
                  <div className="absolute right-0 mt-1 w-44 bg-white border rounded-md shadow-lg z-10">
                    <button
                      type="button"
                      onClick={() => { setShowAllPhotos(true); setPhotosMenuOpen(false); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                    >
                      Event Photos
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowManagePhotos(true); setPhotosMenuOpen(false); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                    >
                      Manage Photos
                    </button>
                  </div>
                )}
              </div>
              <button 
                onClick={() => setShowAllJournals(true)}
                className="border border-gray-300 text-gray-700 px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-50"
                title="View all journals"
              >
                <BookOpen className="w-4 h-4" />
                Journals
              </button>
              <div className="bg-gray-100 rounded-lg p-1 flex gap-1">
                <button 
                  onClick={handleZoomOut}
                  className="p-2 hover:bg-white rounded transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button 
                  onClick={handleZoomIn}
                  className="p-2 hover:bg-white rounded transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>
              
              <button 
                onClick={() => setShowSettings(true)}
                className="border border-gray-300 text-gray-700 px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-50 transition-colors"
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
              
              <button 
                onClick={() => setShowAddForm(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Event
              </button>
            </div>
          </div>
        </div>

        {/* Empty Timeline */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">📅</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Start Your Timeline</h2>
            <p className="text-gray-600 mb-6">Add your first life event to begin building your personal timeline.</p>
            <button 
              onClick={() => setShowAddForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 mx-auto transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Your First Event
            </button>
          </div>
        </div>

        {/* Category Legend */}
        <div className="bg-white border-t border-gray-200 px-6 py-4">
          <div className="flex flex-wrap gap-4 justify-center">
            <button
              type="button"
              onClick={selectAllCategories}
              className="px-3 py-1 rounded-full border border-gray-300 bg-white text-sm text-gray-700 hover:bg-gray-50"
              title="Select all categories"
            >
              Select All
            </button>
            <div className="ml-auto hidden" />
            {Object.entries(allCategories).map(([key, config]) => {
              const isActive = selectedCategories.has(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleCategory(key)}
                  aria-pressed={isActive}
                  className={`flex items-center gap-2 px-3 py-1 rounded-full border transition-colors ${
                    isActive ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50 opacity-60'
                  }`}
                  title={isActive ? `Hide ${config.label}` : `Show ${config.label}`}
                >
                  <span className={`w-3 h-3 rounded-full ${config.color} inline-flex items-center justify-center`}>
                    <config.icon className="w-2 h-2 text-white" />
                  </span>
                  <span className="text-sm text-gray-700">{config.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Stats Summary */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3">
          <div className="flex justify-center gap-8 text-sm">
            <span><strong>0</strong> Shown</span>
            <span><strong>0</strong> Total</span>
            <span><strong>0</strong> Years Covered</span>
            <span><strong>0</strong> Current Age</span>
            <span><strong>0</strong> Major Milestones</span>
          </div>
        </div>

        {/* Add Event Form */}
        {showAddForm && (
          <EventForm 
            mode="add"
            onClose={() => setShowAddForm(false)}
            onSave={addEvent}
            onOpenGallery={(formDataLike, idx) => openEventGallery(formDataLike, idx)}
            allCategories={allCategories}
          />
        )}

        {/* Other modals */}
        {showAllPhotos && (
          <AllPhotosModal
            events={events}
            selectedCategories={selectedCategories}
            onToggleCategory={toggleCategory}
            onSelectAll={selectAllCategories}
            onClose={() => setShowAllPhotos(false)}
            allCategories={allCategories}
          />
        )}

        {showManagePhotos && (
          <ManagePhotosModal
            events={events}
            onClose={() => setShowManagePhotos(false)}
          />
        )}

        {showAllJournals && (
          <AllJournalsModal
            events={events}
            selectedCategories={selectedCategories}
            onToggleCategory={toggleCategory}
            onSelectAll={selectAllCategories}
            onClose={() => setShowAllJournals(false)}
            allCategories={allCategories}
          />
        )}

        {showSettings && (
          <SettingsModal
            currentBackground={backgroundUrl}
            onSelectBackground={(url) => setBackgroundUrl(url)}
            onClearBackground={() => setBackgroundUrl('')}
            onClose={() => setShowSettings(false)}
          />
        )}
      </div>
    );
  }

  // Calculate timeline span (with safety checks)
  const firstEvent = sortedEvents[0];
  const lastEvent = sortedEvents[sortedEvents.length - 1];
  const startYear = firstEvent?.date?.getFullYear() || new Date().getFullYear();
  const endYear = lastEvent?.date?.getFullYear() || new Date().getFullYear();
  const totalYears = endYear - startYear + 1;

  const toggleCategory = (key) => {
    setSelectedCategories(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const selectAllCategories = () => {
    setSelectedCategories(new Set(allCategoryKeys));
  };

  // Calculate event position on timeline
  const getEventPosition = (event) => {
    const eventYear = event.date.getFullYear();
    const eventMonth = event.date.getMonth();
    const yearProgress = (eventYear - startYear + eventMonth / 12) / totalYears;
    const timelineWidth = Math.max(1400, totalYears * 120 * zoom) - 400; // Account for padding
    return 200 + (yearProgress * timelineWidth); // Return pixel position instead of percentage
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.5, 5));
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.5, 0.3));

  const getCategoryIcon = (category) => {
    const config = allCategories[category] || allCategories.milestone;
    const IconComponent = config.icon;
    return <IconComponent className="w-3 h-3" />;
  };

  const getCategoryColor = (category) => {
    return allCategories[category]?.color || allCategories.milestone.color;
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getAgeAtEvent = (eventDate) => {
    const birthDate = sortedEvents[0].date;
    const age = eventDate.getFullYear() - birthDate.getFullYear();
    const monthDiff = eventDate.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && eventDate.getDate() < birthDate.getDate())) {
      return age - 1;
    }
    return age;
  };

  const addEvent = async (newEvent) => {
    try {
      const saved = await createEventInDb({
        title: newEvent.title,
        description: newEvent.description,
        date: newEvent.date.toISOString().slice(0,10),
        category: newEvent.category,
        image_url: newEvent.image || null,
      });
      const mapped = {
        id: saved.id,
        title: saved.title,
        description: saved.description || '',
        date: new Date(saved.date),
        category: saved.category,
        image: saved.image_url || null,
        images: [],
        importance: newEvent.importance ?? 6,
        journals: []
      };
      setEvents((prev) => [...prev, mapped]);
    } catch (e) {
      console.error('Failed to create event', e);
    }
  };

  const saveEditedEvent = async (updatedEvent) => {
    try {
      const saved = await updateEventInDb(updatedEvent.id, {
        title: updatedEvent.title,
        description: updatedEvent.description,
        date: updatedEvent.date.toISOString().slice(0,10),
        category: updatedEvent.category,
        image_url: updatedEvent.image || null,
      });
      const mapped = { ...updatedEvent, image: saved.image_url || updatedEvent.image };
      setEvents((prev) => prev.map(e => (e.id === updatedEvent.id ? mapped : e)));
    } catch (e) {
      console.error('Failed to update event', e);
    }
  };

  const deleteEvent = async (eventToDelete) => {
    try {
      await deleteEventInDb(eventToDelete.id);
      setEvents((prev) => prev.filter(e => e.id !== eventToDelete.id));
    } catch (e) {
      console.error('Failed to delete event', e);
    }
  };

  const openEventGallery = (formDataLike, startIndex) => {
    // When invoked from form during edit, prefer the current editingEvent merged with recent formData-like
    const source = editingEvent ? { ...editingEvent, ...formDataLike } : formDataLike;
    setGalleryForEvent(source);
    setGalleryStartIndex(startIndex || 0);
  };

  return (
    <div className="w-full h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col overflow-hidden relative">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200 px-6 py-4 relative z-10">
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2">
              <img src="/logo-eventfull.svg" alt="EventFull" className="w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12" />
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold"><span className="text-blue-600">Event</span><span className="text-purple-600">Full</span></h1>
            </div>
            <p className="text-gray-600 mt-1">Your Life's Timeline</p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Photos dropdown */}
            <div className="relative">
            <button 
                onClick={() => setPhotosMenuOpen((v) => !v)}
              className="border border-gray-300 text-gray-700 px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-50"
                title="Photos"
            >
              <Images className="w-4 h-4" />
              Photos
                <ChevronDown className="w-4 h-4" />
            </button>
              {photosMenuOpen && (
                <div className="absolute right-0 mt-1 w-44 bg-white border rounded-md shadow-lg z-10">
                  <button
                    type="button"
                    onClick={() => { setShowAllPhotos(true); setPhotosMenuOpen(false); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    Event Photos
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowManagePhotos(true); setPhotosMenuOpen(false); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    Manage Photos
                  </button>
                </div>
              )}
            </div>
            <button 
              onClick={() => setShowAllJournals(true)}
              className="border border-gray-300 text-gray-700 px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-50"
              title="View all journals"
            >
              <BookOpen className="w-4 h-4" />
              Journals
            </button>
            <div className="bg-gray-100 rounded-lg p-1 flex gap-1">
              <button 
                onClick={handleZoomOut}
                className="p-2 hover:bg-white rounded transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button 
                onClick={handleZoomIn}
                className="p-2 hover:bg-white rounded transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
            
            <button 
              onClick={() => setShowSettings(true)}
              className="border border-gray-300 text-gray-700 px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-50 transition-colors"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            
            <button 
              onClick={() => setShowAddForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Event
            </button>
          </div>
        </div>
      </div>

      {/* Main content wrapper lifted above background layer */}
      <div className="relative z-0 flex-1 overflow-hidden">
        {/* Background layer (applies only to content area) */}
        {backgroundUrl && (
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `url(${backgroundUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'saturate(0.8) brightness(0.75)',
              opacity: 0.3
            }}
          />
        )}
        {/* Timeline Container */}
        <div 
          ref={timelineRef}
          className="h-full overflow-x-auto overflow-y-auto p-6"
          style={{ scrollBehavior: 'smooth' }}
        >
          {/* Timeline Content */}
          <div 
            className="relative flex items-center"
            style={{ 
              width: `${Math.max(1400, totalYears * 120 * zoom)}px`,
              height: '800px',
              paddingTop: '200px',
              paddingBottom: '300px',
              paddingLeft: '200px',
              paddingRight: '200px'
            }}
          >
            {/* Main Timeline Line */}
            <div 
              className="absolute top-1/2 transform -translate-y-1/2 h-1 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full shadow-sm" 
              style={{
                left: '200px',
                right: '200px'
              }}
            />

            {/* Year Markers */}
            {Array.from({ length: totalYears + 1 }, (_, i) => {
              const year = startYear + i;
              const position = (i / totalYears) * 100;
              const timelineWidth = Math.max(1400, totalYears * 120 * zoom) - 400; // Account for padding
              const markerPositionPx = 200 + (position / 100) * timelineWidth; // Offset by left padding
              
              // Scale year label size with zoom (base 12px at zoom=1)
              const basePx = 12;
              const minPx = 10;
              const maxPx = 24;
              const yearFontSizePx = Math.max(minPx, Math.min(maxPx, Math.round(basePx * zoom)));
              
              return (
                <div
                  key={year}
                  className="absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2"
                  style={{ left: `${markerPositionPx}px` }}
                >
                  <div className="w-px h-12 bg-gray-300" />
                  <div className="text-gray-500 mt-2 whitespace-nowrap font-medium"
                       style={{ fontSize: `${yearFontSizePx}px` }}>
                    {year}
                  </div>
                </div>
              );
            })}

            {/* Events */}
            {filteredEvents.map((event, index) => {
              const position = getEventPosition(event);
              const isAbove = index % 2 === 0;
              const age = getAgeAtEvent(event.date);
              
              // Smart positioning to prevent cards from going off-screen
              const getCardPosition = () => {
                const cardWidth = 320; // Card width in pixels
                const cardHeight = event.image ? 320 : 240; // Estimated card height
                const timelineCenter = 50; // Timeline is at 50% of container height
                const containerPadding = 15; // Padding from edges
                
                // Check horizontal positioning - prevent cards from going off left/right edges
                const timelineWidth = Math.max(1400, totalYears * 120 * zoom);
                const cardHalfWidth = cardWidth / 2;
                
                let horizontalAdjustment = '';
                if (position - cardHalfWidth < 250) {
                  horizontalAdjustment = 'left-0 transform-none translate-x-0';
                } else if (position + cardHalfWidth > timelineWidth - 250) {
                  horizontalAdjustment = 'right-0 transform-none translate-x-0';
                } else {
                  horizontalAdjustment = 'transform -translate-x-1/2';
                }
                
                if (isAbove && (timelineCenter - cardHeight/2 - 10) < containerPadding) {
                  return { 
                    position: 'bottom-8', 
                    connectionClass: 'top-full h-12',
                    horizontalClass: horizontalAdjustment
                  };
                }
                
                if (!isAbove && (timelineCenter + cardHeight/2 + 10) > (100 - containerPadding)) {
                  return { 
                    position: 'top-8', 
                    connectionClass: 'bottom-full h-12',
                    horizontalClass: horizontalAdjustment
                  };
                }
                
                return {
                  position: isAbove ? 'bottom-8' : 'top-8',
                  connectionClass: isAbove ? 'top-full h-12' : 'bottom-full h-12',
                  horizontalClass: horizontalAdjustment
                };
              };
              
              const cardPosition = getCardPosition();
              
              return (
                <div
                  key={event.id}
                  className="absolute group cursor-pointer"
                  style={{ 
                    left: `${position}px`,
                    top: '50%',
                    transform: 'translate(-50%, -50%)'
                  }}
                  onClick={() => { setSelectedEvent(event); setEditingEvent(event); }}
                >
                  {/* Connection Line */}
                  <div 
                    className={`absolute w-px bg-gray-300 transform -translate-x-1/2 ${cardPosition.connectionClass}`}
                  />
                  
                  {/* Event Dot */}
                  <div 
                    className={`w-5 h-5 rounded-full ${getCategoryColor(event.category)} border-3 border-white shadow-lg relative z-10 flex items-center justify-center text-white transform hover:scale-110 transition-transform`}
                    style={{
                      transform: `scale(${Math.max(0.8, event.importance / 10)}) ${selectedEvent?.id === event.id ? 'scale(1.3)' : ''}`
                    }}
                  >
                    {event.image ? <Camera className="w-3 h-3" /> : getCategoryIcon(event.category)}
                  </div>
                  
                  {/* Event Card */}
                  <div 
                    className={`absolute w-80 ${cardPosition.horizontalClass} ${cardPosition.position} ${selectedEvent?.id === event.id ? 'z-50' : 'z-30'}`}
                    style={{
                      maxHeight: '350px',
                      overflowY: 'auto'
                    }}
                  >
                    <div className={`bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden transition-all duration-200 ${
                      selectedEvent?.id === event.id 
                        ? 'ring-2 ring-blue-400 shadow-xl transform scale-105' 
                        : 'group-hover:shadow-xl group-hover:transform group-hover:scale-102'
                    }`}>
                      {/* Event Image */}
                      {event.image && (
                        <div className="w-full h-32 bg-gray-100 overflow-hidden cursor-pointer" title="View photos" onClick={(e) => { e.stopPropagation(); setGalleryForEvent(event); setGalleryStartIndex(0); }}>
                          <img 
                            src={event.image} 
                            alt={event.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs text-white ${getCategoryColor(event.category)}`}>
                            {getCategoryIcon(event.category)}
                            <span>{allCategories[event.category]?.label || 'Event'}</span>
                          </div>
                          <span className="text-xs text-gray-500 font-medium">Age {age}</span>
                        </div>
                        
                        <h3 className="font-bold text-gray-900 mb-1">{event.title}</h3>
                        <p className="text-sm text-gray-600 mb-2">{formatDate(event.date)}</p>
                        
                        {event.description && (
                          <p className="text-sm text-gray-700 leading-relaxed mb-3">{event.description}</p>
                        )}
                        
                        {/* Importance indicator */}
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-500">Importance:</span>
                          <div className="flex gap-1">
                            {Array.from({ length: 5 }, (_, i) => (
                              <div 
                                key={i} 
                                className={`w-2 h-2 rounded-full ${
                                  i < event.importance / 2 ? 'bg-yellow-400' : 'bg-gray-200'
                                }`} 
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Category Legend */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="flex flex-wrap gap-4 justify-center">
          <button
            type="button"
            onClick={selectAllCategories}
            className="px-3 py-1 rounded-full border border-gray-300 bg-white text-sm text-gray-700 hover:bg-gray-50"
            title="Select all categories"
          >
            Select All
          </button>
          <div className="ml-auto hidden" />
          {Object.entries(allCategories).map(([key, config]) => {
            const isActive = selectedCategories.has(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleCategory(key)}
                aria-pressed={isActive}
                className={`flex items-center gap-2 px-3 py-1 rounded-full border transition-colors ${
                  isActive ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50 opacity-60'
                }`}
                title={isActive ? `Hide ${config.label}` : `Show ${config.label}`}
              >
                <span className={`w-3 h-3 rounded-full ${config.color} inline-flex items-center justify-center`}>
                  <config.icon className="w-2 h-2 text-white" />
                </span>
                <span className="text-sm text-gray-700">{config.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Stats Summary */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3">
        <div className="flex justify-center gap-8 text-sm">
          <span><strong>{filteredEvents.length}</strong> Shown</span>
          <span><strong>{events.length}</strong> Total</span>
          <span><strong>{totalYears}</strong> Years Covered</span>
          <span><strong>{getAgeAtEvent(new Date())}</strong> Current Age</span>
          <span><strong>{events.filter(e => e.importance >= 8).length}</strong> Major Milestones</span>
        </div>
      </div>

      {/* Add/Edit Event Form */}
      {showAddForm && (
        <EventForm 
          mode="add"
          onClose={() => setShowAddForm(false)}
          onSave={addEvent}
          onOpenGallery={(formDataLike, idx) => openEventGallery(formDataLike, idx)}
          allCategories={allCategories}
        />
      )}
      {editingEvent && (
        <EventForm
          mode="edit"
          initialEvent={editingEvent}
          onClose={() => { setEditingEvent(null); setSelectedEvent(null); }}
          onSave={saveEditedEvent}
          onDelete={deleteEvent}
          onOpenGallery={(formDataLike, idx) => openEventGallery(formDataLike, idx)}
          allCategories={allCategories}
        />
      )}

      {/* Per-Event Gallery */}
      {galleryForEvent && (
        <EventGallery
          event={galleryForEvent}
          startIndex={galleryStartIndex}
          onClose={() => { setGalleryForEvent(null); setGalleryStartIndex(0); }}
        />
      )}

      {/* All Photos Modal */}
      {showAllPhotos && (
        <AllPhotosModal
          events={events}
          selectedCategories={selectedCategories}
          onToggleCategory={toggleCategory}
          onSelectAll={selectAllCategories}
          onClose={() => setShowAllPhotos(false)}
          allCategories={allCategories}
        />
      )}

  {/* Manage Photos Modal */}
  {showManagePhotos && (
    <ManagePhotosModal
      events={events}
      onClose={() => setShowManagePhotos(false)}
        />
      )}

      {/* All Journals Modal */}
      {showAllJournals && (
        <AllJournalsModal
          events={events}
          selectedCategories={selectedCategories}
          onToggleCategory={toggleCategory}
          onSelectAll={selectAllCategories}
          onClose={() => setShowAllJournals(false)}
          allCategories={allCategories}
        />
      )}

      {/* Background Picker */}
      {showBackgroundPicker && (
        <BackgroundModal
          current={backgroundUrl}
          onSelect={(url) => setBackgroundUrl(url)}
          onClear={() => setBackgroundUrl('')}
          onClose={() => setShowBackgroundPicker(false)}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          currentBackground={backgroundUrl}
          onSelectBackground={(url) => setBackgroundUrl(url)}
          onClearBackground={() => setBackgroundUrl('')}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

export default EventFull;