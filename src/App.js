import React, { useState, useRef, useEffect } from 'react';
import { Plus, ZoomIn, ZoomOut, Calendar, Heart, GraduationCap, Briefcase, Baby, Star, X, Camera, ChevronLeft, ChevronRight, Images, BookOpen, Settings, ChevronDown, LogOut, Sparkles } from 'lucide-react';
import { fetchEvents, createEvent, updateEvent, deleteEvent, fetchTimelines, createTimeline, updateTimeline, deleteTimeline, shareTimeline, fetchSharedTimelines, fetchUserSettings, updateUserSettings, fetchPhotos, uploadPhotoFile, updatePhoto, deletePhoto, tagPhotoToEvent, untagPhotoFromEvent, getPhotosForEvent, migrateLegacyPhotosToStorage, ALLOWED_PHOTO_TYPES } from './api/events';
import { testConnection } from './utils/testSupabaseConnection';
import { useAuth } from './contexts/AuthContext';
import AuthModal from './components/AuthModal';
import PhotoSortReview from './components/PhotoSortReview';
import { classifyPhotos } from './ai/PhotoClassifier';

// [Then all your EventFull component code...]

const DEFAULT_BACKGROUNDS = [
  {
    id: 'bg-mountains',
    name: 'Calm Mountains',
    url: '/backgrounds/calm-mountains.jpg'
  },
  {
    id: 'bg-sky',
    name: 'Soft Sky',
    url: '/backgrounds/soft-sky.jpg'
  },
  {
    id: 'bg-abstract',
    name: 'Gentle Abstract',
    url: '/backgrounds/gentle-abstract.jpg'
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

function SettingsModal({ currentBackground, onSelectBackground, onClearBackground, onClose, customCategories, onUpdateCategories }) {
  const [activeTab, setActiveTab] = useState('background');
  // Background upload (settings)
  const [bgUploadPreview, setBgUploadPreview] = useState(null);
  const [bgUploadError, setBgUploadError] = useState('');
  const bgFileInputRef = useRef(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryKey, setNewCategoryKey] = useState('');

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
    onUpdateCategories({
      ...customCategories,
      [key]: { label, baseCategory }
    });
  };

  const deleteCustomCategory = (key) => {
    const updated = { ...customCategories };
    delete updated[key];
    onUpdateCategories(updated);
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
  family: { color: 'bg-orange-500', icon: Baby, label: 'Family' },
  untagged: { color: 'bg-gray-500', icon: Images, label: 'Untagged' }
};

function ImmersivePhotoViewer({
  photos,
  index,
  onIndexChange,
  onClose,
  title,
  primaryPhotoId = null
}) {
  const gallery = photos || [];
  const safeIndex = gallery.length === 0 ? 0 : Math.min(Math.max(0, index), gallery.length - 1);
  const current = gallery[safeIndex];

  const goPrev = () => {
    if (gallery.length === 0) return;
    onIndexChange((safeIndex - 1 + gallery.length) % gallery.length);
  };
  const goNext = () => {
    if (gallery.length === 0) return;
    onIndexChange((safeIndex + 1) % gallery.length);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeIndex, gallery.length]);

  if (gallery.length === 0) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: 'rgba(71, 85, 105, 0.72)' }}>
        <div className="bg-white/95 rounded-xl shadow-xl px-8 py-6 text-center">
          <p className="text-slate-600 mb-4">No photos to show</p>
          <button type="button" onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col"
      style={{ background: 'linear-gradient(160deg, rgba(100,116,139,0.88), rgba(71,85,105,0.92))' }}
      onClick={onClose}
    >
      <div
        className="flex items-center justify-between px-4 sm:px-6 py-3 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-w-0">
          <h3 className="text-base sm:text-lg font-semibold truncate drop-shadow">{title || 'Photos'}</h3>
          <p className="text-sm text-white/80">
            {safeIndex + 1} of {gallery.length}
            {current?.name ? ` · ${current.name}` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="ml-3 p-2 rounded-full bg-white/15 hover:bg-white/25 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 flex items-center min-h-0 px-2 sm:px-4 pb-2" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={goPrev}
          className="shrink-0 p-3 sm:p-4 rounded-full bg-white/20 hover:bg-white/35 text-white transition-colors"
          aria-label="Previous photo"
        >
          <ChevronLeft className="w-7 h-7 sm:w-8 sm:h-8" />
        </button>

        <div className="flex-1 flex items-center justify-center px-2 sm:px-4 min-w-0">
          <img
            src={current.url}
            alt={current.name || 'Photo'}
            className="max-h-[70vh] sm:max-h-[75vh] max-w-full object-contain rounded-lg shadow-2xl bg-white/10"
          />
        </div>

        <button
          type="button"
          onClick={goNext}
          className="shrink-0 p-3 sm:p-4 rounded-full bg-white/20 hover:bg-white/35 text-white transition-colors"
          aria-label="Next photo"
        >
          <ChevronRight className="w-7 h-7 sm:w-8 sm:h-8" />
        </button>
      </div>

      <div
        className="px-4 pb-4 pt-2 overflow-x-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex gap-2 justify-center min-w-min mx-auto">
          {gallery.map((photo, i) => {
            const isCover = primaryPhotoId && String(photo.id) === String(primaryPhotoId);
            const active = i === safeIndex;
            return (
              <button
                key={photo.id || i}
                type="button"
                onClick={() => onIndexChange(i)}
                className={`relative shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-all ${
                  active ? 'border-white shadow-lg scale-105' : 'border-white/30 opacity-80 hover:opacity-100'
                }`}
              >
                <img src={photo.url} alt="" className="w-full h-full object-cover" />
                {isCover && (
                  <span className="absolute top-0.5 left-0.5 bg-amber-400 text-slate-900 rounded px-0.5">
                    <Star className="w-3 h-3 fill-current" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function EventGallery({ event, startIndex = 0, onClose }) {
  const [index, setIndex] = useState(startIndex);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPhotos = async () => {
      if (!event?.id) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const tagged = await getPhotosForEvent(event.id);
        const byUrl = new Set(tagged.map((p) => p.url).filter(Boolean));
        // Legacy cover only if not already in library
        if (event.image && !byUrl.has(event.image) && !event.primary_photo_id) {
          setPhotos([
            { id: 'main', url: event.image, name: event.title || 'Cover', category: event.category },
            ...tagged
          ]);
        } else {
          setPhotos(tagged);
        }
      } catch (err) {
        console.error('Error loading event photos:', err);
        setPhotos([]);
      } finally {
        setLoading(false);
      }
    };
    loadPhotos();
  }, [event?.id, event?.image, event?.title, event?.category, event?.primary_photo_id]);

  useEffect(() => {
    setIndex(Math.min(startIndex, Math.max(0, photos.length - 1)));
  }, [photos.length, startIndex]);

  if (!event) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center" style={{ background: 'rgba(71, 85, 105, 0.72)' }}>
        <div className="bg-white/95 rounded-xl shadow-xl px-8 py-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2" />
          <div className="text-sm text-slate-600">Loading photos...</div>
        </div>
      </div>
    );
  }

  return (
    <ImmersivePhotoViewer
      photos={photos}
      index={index}
      onIndexChange={setIndex}
      onClose={onClose}
      title={event.title}
      primaryPhotoId={event.primary_photo_id}
    />
  );
}

function PhotoLibraryModal({
  allCategories,
  selectedCategories,
  onToggleCategory,
  onSelectAll,
  onClose,
  onPhotosUpdated,
  onEventsUpdated,
  events = [],
  timelineId = null,
  initialMode = 'browse',
  selectMode = false,
  excludeIds = [],
  onSelectPhoto = null
}) {
  const [mode, setMode] = useState(selectMode ? 'browse' : initialMode);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(null);
  const [sortSelectMode, setSortSelectMode] = useState(false);
  const [sortSelectedIds, setSortSelectedIds] = useState(() => new Set());
  const [sorting, setSorting] = useState(false);
  const [sortReview, setSortReview] = useState(null);
  const inputRef = useRef(null);
  const contentRef = useRef(null);

  const loadPhotos = async () => {
    try {
      setLoading(true);
      const allPhotos = await fetchPhotos();
      setPhotos(allPhotos);
    } catch (err) {
      console.error('Error loading photos:', err);
      alert(`Failed to load photos: ${err.message || 'Please try again'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPhotos();
  }, []);

  const filteredPhotos = photos.filter((p) => {
    if (excludeIds.includes(p.id) || excludeIds.includes(String(p.id))) return false;
    if (selectMode) return true;
    return selectedCategories.has(p.category || 'untagged');
  });

  const handleFiles = async (files) => {
    const arr = Array.from(files || []);
    if (arr.length === 0) return;
    setUploading(true);
    try {
      const results = await Promise.all(
        arr.map(async (file) => {
          try {
            if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
              return { success: false, name: file.name };
            }
            const saved = await uploadPhotoFile(file, { name: file.name, category: 'untagged' });
            return { success: true, photo: saved };
          } catch (err) {
            console.error(`Failed to save photo ${file.name}:`, err);
            return { success: false, name: file.name };
          }
        })
      );
      const successful = results.filter((r) => r.success).map((r) => r.photo);
      const failed = results.filter((r) => !r.success);
      if (successful.length > 0) {
        setPhotos((prev) => [...successful, ...prev]);
        if (onPhotosUpdated) onPhotosUpdated();
      }
      if (failed.length > 0) {
        alert(`Failed to upload ${failed.length} photo(s): ${failed.map((f) => f.name).join(', ')}`);
      }
    } catch (err) {
      alert(`Failed to upload photos: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const removeOne = async (id) => {
    try {
      await deletePhoto(id);
      setPhotos((prev) => prev.filter((p) => p.id !== id));
      if (onPhotosUpdated) onPhotosUpdated();
    } catch (err) {
      alert('Failed to delete photo. Please try again.');
    }
  };

  const clearAll = async () => {
    if (!window.confirm('Delete all photos from your library? This cannot be undone.')) return;
    try {
      await Promise.all(photos.map((p) => deletePhoto(p.id)));
      setPhotos([]);
      if (onPhotosUpdated) onPhotosUpdated();
    } catch (err) {
      alert('Failed to delete some photos. Please try again.');
    }
  };

  const updatePhotoCategory = async (photoId, category) => {
    try {
      const updated = await updatePhoto(photoId, { category });
      setPhotos((prev) => prev.map((p) => (p.id === photoId ? updated : p)));
      if (onPhotosUpdated) onPhotosUpdated();
    } catch (err) {
      alert('Failed to update photo category.');
    }
  };

  const toggleSortSelect = (photoId) => {
    const id = String(photoId);
    setSortSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const runAiSort = async () => {
    const candidates = sortSelectMode && sortSelectedIds.size > 0
      ? filteredPhotos.filter((p) => sortSelectedIds.has(String(p.id)))
      : filteredPhotos;

    if (candidates.length === 0) {
      alert('No photos to sort. Upload or show some photos first.');
      return;
    }

    const sortable = candidates.filter((p) => p.url && /^https?:\/\//i.test(p.url));
    if (sortable.length === 0) {
      alert('These photos need public web URLs for AI sorting. Re-upload them if needed.');
      return;
    }

    if (!window.confirm(`Sort ${sortable.length} photo(s) with AI? You can review before anything is applied.`)) {
      return;
    }

    setSorting(true);
    try {
      const suggestions = await classifyPhotos(sortable, events || []);
      setSortReview({ photos: sortable, suggestions });
      setSortSelectMode(false);
      setSortSelectedIds(new Set());
    } catch (err) {
      console.error('AI sort failed:', err);
      alert(err.message || 'AI sort failed. Check that the sort-photos function is deployed and ANTHROPIC_API_KEY is set.');
    } finally {
      setSorting(false);
    }
  };

  const categoryKeys = Object.keys(allCategories);
  const allSelected = categoryKeys.every((key) => selectedCategories.has(key));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(71, 85, 105, 0.55)' }}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-screen-2xl max-h-[92vh] overflow-hidden flex flex-col border border-slate-200">
        <div className="flex items-center justify-between gap-3 p-4 border-b border-slate-200">
          <div className="flex items-center gap-3 min-w-0">
            <Images className="w-5 h-5 text-slate-700 shrink-0" />
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-slate-900">
                {selectMode ? 'Add from Photo Library' : 'Photo Library'}
              </h3>
              <p className="text-xs text-slate-500 truncate">
                {selectMode
                  ? 'Click a photo to add it to this event'
                  : sortSelectMode
                    ? 'Click photos to select, then run Sort with AI'
                    : 'Browse and manage all your pictures'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!selectMode && (
              <>
                <button
                  type="button"
                  disabled={sorting || loading || filteredPhotos.length === 0}
                  onClick={runAiSort}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-slate-800 text-white hover:bg-slate-900 disabled:opacity-50"
                  title="Group photos into events with Claude"
                >
                  <Sparkles className="w-4 h-4" />
                  {sorting ? 'Sorting…' : 'Sort with AI'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSortSelectMode((v) => !v);
                    setSortSelectedIds(new Set());
                  }}
                  className={`px-3 py-1.5 text-sm rounded-lg border ${
                    sortSelectMode
                      ? 'border-slate-800 bg-slate-100 text-slate-900'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {sortSelectMode ? 'Cancel select' : 'Select for AI'}
                </button>
                <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm">
                  <button
                    type="button"
                    onClick={() => setMode('browse')}
                    className={`px-3 py-1.5 ${mode === 'browse' ? 'bg-slate-800 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
                  >
                    Browse
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('manage')}
                    className={`px-3 py-1.5 ${mode === 'manage' ? 'bg-slate-800 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
                  >
                    Manage
                  </button>
                </div>
              </>
            )}
            <button type="button" onClick={onClose} className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div ref={contentRef} className="flex-1 overflow-y-auto p-4">
          {mode === 'manage' && !selectMode && (
            <div
              onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => inputRef.current?.click()}
              className="mb-4 border-2 border-dashed border-slate-300 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-slate-50 transition-colors"
            >
              <Camera className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <div className="text-slate-700 font-medium">Drag & drop photos here, or click to select</div>
              <div className="text-xs text-slate-400 mt-1">JPEG, PNG, WebP</div>
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </div>
          )}

          {uploading && (
            <div className="mb-4 text-center py-3 text-sm text-slate-600">Uploading photos...</div>
          )}

          {sorting && (
            <div className="mb-4 text-center py-3 text-sm text-slate-600 flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-700" />
              Claude is grouping your photos…
            </div>
          )}

          {sortSelectMode && !selectMode && (
            <div className="mb-3 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              {sortSelectedIds.size > 0
                ? `${sortSelectedIds.size} selected — click Sort with AI when ready`
                : 'Click photos to select them, or leave none selected to sort everything currently shown'}
            </div>
          )}

          {!selectMode && (
            <div className="flex flex-wrap gap-2 mb-4 items-center">
              <button
                type="button"
                onClick={onSelectAll}
                className="px-3 py-1 rounded-full border border-slate-300 bg-white text-sm text-slate-700 hover:bg-slate-50"
              >
                {allSelected ? 'Select None' : 'Select All'}
              </button>
              {Object.entries(allCategories).map(([key, config]) => {
                const active = selectedCategories.has(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onToggleCategory(key)}
                    className={`px-3 py-1 rounded-full border text-sm ${
                      active ? 'border-slate-300 bg-white text-slate-800' : 'border-slate-200 bg-slate-50 text-slate-500 opacity-70'
                    }`}
                  >
                    {config.label}
                  </button>
                );
              })}
              {mode === 'manage' && photos.length > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="ml-auto text-xs px-2 py-1 border border-red-200 text-red-700 rounded hover:bg-red-50"
                >
                  Clear all
                </button>
              )}
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2" />
              <div className="text-sm text-slate-600">Loading photos...</div>
            </div>
          ) : filteredPhotos.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              {selectMode
                ? 'No more photos available. Upload some in Manage mode from Photo Library.'
                : 'No photos for the selected filters.'}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {filteredPhotos.map((p, i) => {
                const isSortSelected = sortSelectMode && sortSelectedIds.has(String(p.id));
                return (
                <div
                  key={p.id}
                  className={`group relative rounded-lg overflow-hidden border bg-slate-50 shadow-sm ${
                    isSortSelected ? 'border-slate-800 ring-2 ring-slate-800/30' : 'border-slate-200'
                  }`}
                >
                  <button
                    type="button"
                    className="w-full aspect-square block"
                    onClick={() => {
                      if (selectMode && onSelectPhoto) {
                        onSelectPhoto(p);
                        return;
                      }
                      if (sortSelectMode) {
                        toggleSortSelect(p.id);
                        return;
                      }
                      setViewerIndex(i);
                    }}
                    title={
                      selectMode
                        ? 'Add to event'
                        : sortSelectMode
                          ? 'Toggle for AI sort'
                          : p.name
                    }
                  >
                    <img src={p.url} alt={p.name} className="w-full h-full object-cover" />
                  </button>
                  <div className="px-2 py-1.5 bg-white border-t border-slate-100">
                    <div className="text-[11px] text-slate-700 truncate font-medium" title={p.name}>{p.name}</div>
                    <div className="text-[10px] text-slate-500 truncate">
                      {allCategories[p.category || 'untagged']?.label || p.category || 'Untagged'}
                    </div>
                  </div>
                  {mode === 'manage' && !selectMode && (
                    <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <select
                        value={p.category || 'untagged'}
                        onChange={(e) => updatePhotoCategory(p.id, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="text-[10px] px-1 py-0.5 rounded bg-white/95 border shadow"
                      >
                        {Object.entries(allCategories).map(([key, config]) => (
                          <option key={key} value={key}>{config.label}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeOne(p.id); }}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-white/95 border shadow hover:bg-red-50 text-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              );
              })}
            </div>
          )}
        </div>

        <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-sm text-slate-600">
          <span>{filteredPhotos.length} photo{filteredPhotos.length === 1 ? '' : 's'}</span>
          <button type="button" onClick={onClose} className="px-3 py-2 border rounded-lg bg-white hover:bg-slate-50">
            Close
          </button>
        </div>
      </div>

      {viewerIndex !== null && (
        <ImmersivePhotoViewer
          photos={filteredPhotos}
          index={viewerIndex}
          onIndexChange={setViewerIndex}
          onClose={() => setViewerIndex(null)}
          title="Photo Library"
        />
      )}

      {sortReview && (
        <PhotoSortReview
          photos={sortReview.photos}
          events={events}
          suggestions={sortReview.suggestions}
          timelineId={timelineId}
          allCategories={allCategories}
          onClose={() => {
            setSortReview(null);
            loadPhotos();
          }}
          onApplied={() => {
            loadPhotos();
            if (onPhotosUpdated) onPhotosUpdated();
            if (onEventsUpdated) onEventsUpdated();
          }}
        />
      )}
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
    primary_photo_id: initialEvent?.primary_photo_id || null,
    images: initialEvent?.images || [],
    journals: initialEvent?.journals || [],
    recordings: initialEvent?.recordings || []
  });
  const [imagePreview, setImagePreview] = useState(initialEvent?.image || null);
  const [taggedPhotos, setTaggedPhotos] = useState([]);
  const [availablePhotos, setAvailablePhotos] = useState([]);
  const [showPhotoSelector, setShowPhotoSelector] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const fileInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  // Load tagged photos when editing
  useEffect(() => {
    const loadTaggedPhotos = async () => {
      if (isEdit && initialEvent?.id) {
        try {
          const photos = await getPhotosForEvent(initialEvent.id);
          setTaggedPhotos(photos);
          // If event has a primary image, ensure it's set in formData
          if (initialEvent.image && !formData.image) {
            setFormData(prev => ({ ...prev, image: initialEvent.image }));
            setImagePreview(initialEvent.image);
          }
        } catch (err) {
          console.error('Error loading tagged photos:', err);
        }
      }
    };
    loadTaggedPhotos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, initialEvent?.id]); // formData.image and initialEvent.image intentionally excluded to prevent infinite loops

  // Load available photos for selection
  // fetchPhotos() with no category returns ALL photos (including untagged)
  // This ensures all photos uploaded from Manage Photos are available for selection
  useEffect(() => {
    const loadAvailablePhotos = async () => {
      try {
        // Fetch all photos (no category filter) - includes untagged photos
        const photos = await fetchPhotos();
        setAvailablePhotos(photos);
      } catch (err) {
        console.error('Error loading available photos:', err);
      }
    };
    if (showPhotoSelector) {
      loadAvailablePhotos();
    }
  }, [showPhotoSelector]);

  // Journal local draft
  const [journalDraft, setJournalDraft] = useState({ title: '', content: '', attachments: [] });
  // eslint-disable-next-line no-unused-vars
  const [_editingJournalId, setEditingJournalId] = useState(null);
  const journalFileRef = useRef(null);

  // Voice recording state
  const [recordings, setRecordings] = useState(initialEvent?.recordings || []);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordingTitle, setRecordingTitle] = useState('');
  const recordingFileRef = useRef(null);

  // Voice recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const newRecording = {
          id: `recording-${Date.now()}`,
          title: recordingTitle || `Recording ${recordings.length + 1}`,
          url,
          blob,
          duration: 0, // Could calculate actual duration
          createdAt: new Date()
        };
        setRecordings(prev => [...prev, newRecording]);
        setRecordingTitle('');
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  const deleteRecording = (id) => {
    const recording = recordings.find(r => r.id === id);
    if (recording) {
      URL.revokeObjectURL(recording.url);
    }
    setRecordings(prev => prev.filter(r => r.id !== id));
  };

  // Journal file handling
  const handleJournalFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    const newAttachments = files.map(file => ({
      id: `file-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: file.name,
      size: file.size,
      type: file.type,
      file: file
    }));
    setJournalDraft(prev => ({ ...prev, attachments: [...prev.attachments, ...newAttachments] }));
  };

  const removeJournalAttachment = (id) => {
    setJournalDraft(prev => ({ ...prev, attachments: prev.attachments.filter(a => a.id !== id) }));
  };

  // Recording file handling
  const handleRecordingFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    const newRecordings = files.map(file => ({
      id: `file-recording-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title: file.name,
      url: URL.createObjectURL(file),
      blob: file,
      duration: 0,
      createdAt: new Date(),
      isFile: true
    }));
    setRecordings(prev => [...prev, ...newRecordings]);
  };

  // eslint-disable-next-line no-unused-vars
  const _updateJournal = (id, changes) => {
    setFormData(prev => ({
      ...prev,
      journals: (prev.journals || []).map(j => j.id === id ? { ...j, ...changes } : j)
    }));
  };

  // eslint-disable-next-line no-unused-vars
  const _removeJournal = (id) => {
    setFormData(prev => ({
      ...prev,
      journals: (prev.journals || []).filter(j => j.id !== id)
    }));
  };

  const addJournal = () => {
    const hasDraft = journalDraft.content.trim().length > 0 || journalDraft.title.trim().length > 0 || journalDraft.attachments.length > 0;
    const newId = `${Date.now()}-journal`;
    const entry = hasDraft
      ? {
          id: newId,
          title: journalDraft.title.trim() || 'Journal Entry',
          content: journalDraft.content.trim(),
          attachments: journalDraft.attachments,
          createdAt: new Date().toISOString()
        }
      : {
          id: newId,
          title: 'Journal Entry',
          content: '',
          attachments: [],
          createdAt: new Date().toISOString()
        };

    setFormData((prev) => ({ ...prev, journals: [...(prev.journals || []), entry] }));
    setJournalDraft({ title: '', content: '', attachments: [] });
    // Open the newly added entry in edit mode if it was empty draft
    setEditingJournalId(newId);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      alert('Only JPEG, PNG, and WebP images are supported.');
      return;
    }
    setIsUploadingPhotos(true);
    try {
      const saved = await uploadPhotoFile(file, {
        name: file.name,
        category: formData.category
      });
      setTaggedPhotos(prev => (prev.find(p => p.id === saved.id) ? prev : [...prev, saved]));
      setFormData(prev => ({
        ...prev,
        image: saved.url,
        primary_photo_id: saved.id
      }));
      setImagePreview(saved.url);
    } catch (err) {
      console.error('Error uploading main photo:', err);
      alert(err.userMessage || err.message || 'Failed to upload photo.');
    } finally {
      setIsUploadingPhotos(false);
      e.target.value = '';
    }
  };

  const handleGalleryUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setIsUploadingPhotos(true);
    try {
      const savedPhotos = [];
      for (const file of files) {
        if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
          console.warn(`Skipping unsupported file type: ${file.name}`);
          continue;
        }
        const saved = await uploadPhotoFile(file, {
          name: file.name,
          category: formData.category
        });
        savedPhotos.push(saved);
      }
      if (savedPhotos.length === 0) {
        alert('No supported photos uploaded. Use JPEG, PNG, or WebP.');
        return;
      }
      setTaggedPhotos(prev => {
        const existing = new Set(prev.map(p => p.id));
        return [...prev, ...savedPhotos.filter(p => !existing.has(p.id))];
      });
      // If no cover yet, use the first new upload
      setFormData(prev => {
        if (prev.primary_photo_id || prev.image) return prev;
        return {
          ...prev,
          image: savedPhotos[0].url,
          primary_photo_id: savedPhotos[0].id
        };
      });
      setImagePreview(prev => prev || savedPhotos[0].url);
    } catch (err) {
      console.error('Error uploading photos:', err);
      alert(err.userMessage || err.message || 'Failed to upload photos. Please try again.');
    } finally {
      setIsUploadingPhotos(false);
      e.target.value = '';
    }
  };

  const handleSelectPhoto = (photoOrId) => {
    const photo =
      typeof photoOrId === 'object' && photoOrId?.id
        ? photoOrId
        : availablePhotos.find((p) => p.id === photoOrId);
    if (!photo) return;
    if (!taggedPhotos.find((p) => String(p.id) === String(photo.id))) {
      setTaggedPhotos((prev) => [...prev, photo]);
    }
    setShowPhotoSelector(false);
  };

  const handleUntagPhoto = (photoId) => {
    setTaggedPhotos(prev => prev.filter(p => p.id !== photoId));
    setFormData(prev => {
      if (String(prev.primary_photo_id) !== String(photoId)) return prev;
      return { ...prev, primary_photo_id: null, image: null };
    });
    setImagePreview(prev => {
      const removed = taggedPhotos.find(p => p.id === photoId);
      return removed && prev === removed.url ? null : prev;
    });
  };

  // eslint-disable-next-line no-unused-vars
  const _renameGalleryItem = (id, name) => {
    setFormData((prev) => ({
      ...prev,
      images: (prev.images || []).map((img) => (img.id === id ? { ...img, name } : img))
    }));
  };

  // removeGalleryItem is now handled by handleUntagPhoto

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveError(null);
    
    if (formData.title && formData.date) {
      setIsSaving(true);
      try {
        // Parse date in local time to avoid timezone issues
        // formData.date is in YYYY-MM-DD format, parse it as local date (not UTC)
        const dateParts = formData.date.split('-');
        const localDate = new Date(
          parseInt(dateParts[0]), // year
          parseInt(dateParts[1]) - 1, // month (0-indexed)
          parseInt(dateParts[2]) // day
        );
        
        const normalized = {
          ...(isEdit ? { id: initialEvent.id } : {}), // Only include ID if editing
          ...formData,
          date: localDate,
          importance: parseInt(formData.importance),
          images: [], // Keep for backward compatibility but use tagging
          journals: formData.journals || [],
          recordings: recordings || []
        };
        
        // Save event first (this will create/update the event and return the ID)
        const savedEvent = await onSave(normalized);
        const eventId = savedEvent?.id || (isEdit ? initialEvent.id : null);
        
        // Then tag photos to the event and ensure cover is linked
        if (eventId) {
          try {
            // Ensure primary photo is in the tagged set
            let photosToTag = [...taggedPhotos];
            if (
              formData.primary_photo_id &&
              !photosToTag.find(p => String(p.id) === String(formData.primary_photo_id))
            ) {
              // Primary should already be in taggedPhotos after Storage upload; ignore if missing
            }

            const currentTagged = isEdit ? await getPhotosForEvent(eventId) : [];
            const currentTaggedIds = new Set(currentTagged.map(p => p.id));
            const newTaggedIds = new Set(photosToTag.map(p => p.id));
            
            for (const photo of photosToTag) {
              if (!currentTaggedIds.has(photo.id)) {
                await tagPhotoToEvent(photo.id, eventId);
                await updatePhoto(photo.id, { category: formData.category });
              }
            }
            
            for (const photo of currentTagged) {
              if (!newTaggedIds.has(photo.id)) {
                await untagPhotoFromEvent(photo.id, eventId);
              }
            }

            // Persist primary pointer + short image URL (never base64)
            if (formData.primary_photo_id || formData.image) {
              const primaryUrl = photosToTag.find(p => String(p.id) === String(formData.primary_photo_id))?.url
                || formData.image;
              await updateEvent(eventId, {
                primary_photo_id: formData.primary_photo_id || null,
                image_url: primaryUrl && !String(primaryUrl).startsWith('data:') ? primaryUrl : null
              });
            }
          } catch (err) {
            console.error('Error tagging photos:', err);
          }
        }
        
        onClose();
      } catch (err) {
        console.error('Error saving event:', err);
        const errorMessage = err?.userMessage || err?.message || err?.details || err?.hint || 'Failed to save event. Please try again.';
        setSaveError(errorMessage);
      } finally {
        setIsSaving(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">{isEdit ? 'Edit Event' : 'Add New Event'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-6">
            {/* Basic Event Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
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
            </div>

            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="3"
                placeholder="Tell us about this event..."
              />
            </div>

            {/* Three Content Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Photos Section */}
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <Camera className="w-5 h-5" />
                    Photos
                  </h3>
                  <span className="text-sm text-gray-500">{taggedPhotos.length} photos</span>
                </div>

                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      className="px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                    >
                      Upload
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPhotoSelector(true)}
                      className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    >
                      Add from library
                    </button>
                    <input
                      ref={galleryInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      onChange={handleGalleryUpload}
                      className="hidden"
                    />
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                  </div>
                  {isUploadingPhotos && (
                    <p className="text-xs text-gray-500">Uploading photo...</p>
                  )}

                  {taggedPhotos.length === 0 ? (
                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      className="w-full h-28 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-500 hover:border-blue-400 hover:bg-white transition-colors"
                    >
                      <Camera className="w-7 h-7 mb-1 text-gray-400" />
                      <span className="text-sm">Add photos for this event</span>
                    </button>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {taggedPhotos.map((photo) => {
                        const isCover = formData.primary_photo_id
                          ? String(formData.primary_photo_id) === String(photo.id)
                          : formData.image === photo.url;
                        return (
                          <div
                            key={photo.id}
                            className={`relative group rounded-lg overflow-hidden border bg-white ${
                              isCover ? 'ring-2 ring-amber-400 border-amber-300' : 'border-slate-200'
                            }`}
                          >
                            <img src={photo.url} alt={photo.name} className="w-full h-24 object-cover" />
                            {isCover && (
                              <span className="absolute top-1 left-1 inline-flex items-center gap-0.5 bg-amber-400 text-slate-900 text-[10px] font-semibold px-1.5 py-0.5 rounded">
                                <Star className="w-3 h-3 fill-current" />
                                Cover
                              </span>
                            )}
                            <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/35 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                              {!isCover && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFormData((prev) => ({
                                      ...prev,
                                      image: photo.url,
                                      primary_photo_id: photo.id
                                    }));
                                    setImagePreview(photo.url);
                                  }}
                                  className="text-[10px] px-2 py-1 bg-white text-slate-800 rounded shadow hover:bg-amber-50"
                                  title="Set as cover"
                                >
                                  Set cover
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleUntagPhoto(photo.id)}
                                className="text-[10px] px-2 py-1 bg-red-500 text-white rounded shadow hover:bg-red-600"
                                title="Remove from event"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {imagePreview && taggedPhotos.length > 0 && (
                    <p className="text-xs text-slate-500">
                      Cover photo appears on the timeline card.
                    </p>
                  )}

                  {showPhotoSelector && (
                    <PhotoLibraryModal
                      allCategories={allCategories}
                      selectedCategories={new Set(Object.keys(allCategories))}
                      onToggleCategory={() => {}}
                      onSelectAll={() => {}}
                      onClose={() => setShowPhotoSelector(false)}
                      selectMode
                      excludeIds={taggedPhotos.map((p) => p.id)}
                      onSelectPhoto={(photo) => {
                        handleSelectPhoto(photo);
                        setFormData((prev) => {
                          if (prev.primary_photo_id || prev.image) return prev;
                          return {
                            ...prev,
                            image: photo.url,
                            primary_photo_id: photo.id
                          };
                        });
                        setImagePreview((prev) => prev || photo.url);
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Journals Section */}
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    Journals
                  </h3>
                  <span className="text-sm text-gray-500">{(formData.journals || []).length} entries</span>
                </div>

                <div className="space-y-4">
                  {/* Add Journal Entry */}
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={journalDraft.title}
                      onChange={(e) => setJournalDraft({ ...journalDraft, title: e.target.value })}
                      placeholder="Journal entry title..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <textarea
                      value={journalDraft.content}
                      onChange={(e) => setJournalDraft({ ...journalDraft, content: e.target.value })}
                      placeholder="Write your thoughts..."
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    
                    {/* File Attachments */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-700">Attachments</label>
                        <button 
                          type="button" 
                          onClick={() => journalFileRef.current?.click()} 
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Add Files
                        </button>
                      </div>
                      <input 
                        ref={journalFileRef} 
                        type="file" 
                        multiple 
                        onChange={handleJournalFileUpload} 
                        className="hidden" 
                      />
                      
                      {journalDraft.attachments.length > 0 && (
                        <div className="space-y-1">
                          {journalDraft.attachments.map((attachment) => (
                            <div key={attachment.id} className="flex items-center justify-between bg-white p-2 rounded border text-xs">
                              <div className="flex-1 truncate">
                                <span className="font-medium">{attachment.name}</span>
                                <span className="text-gray-500 ml-2">({Math.round(attachment.size / 1024)}KB)</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeJournalAttachment(attachment.id)}
                                className="text-red-500 hover:text-red-700 ml-2"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <button
                      type="button"
                      onClick={addJournal}
                      className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                    >
                      Add Journal Entry
                    </button>
                  </div>

                  {/* Journal Entries List */}
                  {(formData.journals || []).length > 0 && (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {(formData.journals || []).map((journal) => (
                        <div key={journal.id} className="bg-white p-3 rounded border">
                          <div className="font-medium text-sm text-gray-800">{journal.title}</div>
                          <div className="text-xs text-gray-500 mt-1">{journal.content.substring(0, 50)}...</div>
                          {journal.attachments && journal.attachments.length > 0 && (
                            <div className="mt-2">
                              <div className="text-xs text-gray-600 mb-1">Attachments ({journal.attachments.length}):</div>
                              <div className="space-y-1">
                                {journal.attachments.map((attachment) => (
                                  <div key={attachment.id} className="text-xs text-blue-600 truncate">
                                    📎 {attachment.name}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Voice Recordings Section */}
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                    Voice Notes
                  </h3>
                  <span className="text-sm text-gray-500">{recordings.length} recordings</span>
                </div>

                <div className="space-y-4">
                  {/* Recording Controls */}
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={recordingTitle}
                      onChange={(e) => setRecordingTitle(e.target.value)}
                      placeholder="Recording title (optional)..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    
                    {!isRecording ? (
                      <button
                        type="button"
                        onClick={startRecording}
                        className="w-full px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm flex items-center justify-center gap-2"
                      >
                        <div className="w-3 h-3 bg-white rounded-full"></div>
                        Start Recording
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm flex items-center justify-center gap-2"
                      >
                        <div className="w-3 h-3 bg-white rounded-full"></div>
                        Stop Recording
                      </button>
                    )}
                    
                    {/* File Upload for Recordings */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-700">Or Upload Files</label>
                        <button 
                          type="button" 
                          onClick={() => recordingFileRef.current?.click()} 
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Add Files
                        </button>
                      </div>
                      <input 
                        ref={recordingFileRef} 
                        type="file" 
                        multiple 
                        onChange={handleRecordingFileUpload} 
                        className="hidden" 
                      />
                    </div>
                  </div>

                  {/* Recordings List */}
                  {recordings.length > 0 && (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {recordings.map((recording) => (
                        <div key={recording.id} className="bg-white p-3 rounded border">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-medium text-sm text-gray-800">{recording.title}</div>
                              {recording.isFile ? (
                                <div className="text-xs text-gray-500 mt-1">
                                  📁 Uploaded file
                                </div>
                              ) : (
                                <audio controls className="w-full mt-2">
                                  <source src={recording.url} type="audio/webm" />
                                </audio>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => deleteRecording(recording.id)}
                              className="ml-2 text-red-500 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Error Message */}
            {saveError && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm font-medium">Error: {saveError}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-6 border-t">
              {isEdit && (
                <button
                  type="button"
                  onClick={() => { onDelete(initialEvent); onClose(); }}
                  className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Delete Event
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : (isEdit ? 'Update Event' : 'Create Event')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Timeline Management Modal
function TimelineModal({ timelines, currentTimelineId, onClose, onSelectTimeline, onCreateTimeline, onDeleteTimeline, onRenameTimeline, onShareTimeline, sharedUsers }) {
  const [newTimelineName, setNewTimelineName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [sharingTimelineId, setSharingTimelineId] = useState(null);
  const [shareEmail, setShareEmail] = useState('');

  const handleCreate = () => {
    if (newTimelineName.trim()) {
      onCreateTimeline(newTimelineName.trim());
      setNewTimelineName('');
    }
  };

  const startEdit = (timeline) => {
    setEditingId(timeline.id);
    setEditingName(timeline.name);
  };

  const saveEdit = () => {
    if (editingName.trim() && editingId) {
      onRenameTimeline(editingId, editingName.trim());
      setEditingId(null);
      setEditingName('');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleShare = () => {
    if (shareEmail.trim() && sharingTimelineId) {
      onShareTimeline(sharingTimelineId, shareEmail.trim());
      setShareEmail('');
      setSharingTimelineId(null);
    }
  };

  const openShareDialog = (timelineId) => {
    setSharingTimelineId(timelineId);
    setShareEmail('');
  };

  const closeShareDialog = () => {
    setSharingTimelineId(null);
    setShareEmail('');
  };

  const getSharedUsersForTimeline = (timelineId) => {
    return sharedUsers[timelineId] || [];
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Manage Timelines</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Create New Timeline */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Create New Timeline</h3>
            <div className="flex gap-3">
              <input
                type="text"
                value={newTimelineName}
                onChange={(e) => setNewTimelineName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
                placeholder="Timeline name..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create
              </button>
            </div>
          </div>

          {/* Timelines List */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Your Timelines</h3>
            {timelines.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>No timelines yet. Create your first timeline above.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {timelines.map((timeline) => (
                  <div
                    key={timeline.id}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      timeline.id === currentTimelineId
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        {editingId === timeline.id ? (
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') saveEdit();
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            className="w-full px-2 py-1 border border-blue-500 rounded text-sm"
                            autoFocus
                          />
                        ) : (
                          <h4 className="font-semibold text-gray-900 mb-1">{timeline.name}</h4>
                        )}
                        <div className="text-xs text-gray-500">
                          {timeline.eventCount || 0} events
                        </div>
                        {getSharedUsersForTimeline(timeline.id).length > 0 && (
                          <div className="text-xs text-green-600 mt-1">
                            👥 Shared with {getSharedUsersForTimeline(timeline.id).length} user{getSharedUsersForTimeline(timeline.id).length !== 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                      {timeline.id === currentTimelineId && (
                        <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded">Active</span>
                      )}
                    </div>
                    
                    {/* Share Dialog */}
                    {sharingTimelineId === timeline.id && (
                      <div className="mb-3 p-3 bg-gray-50 rounded border">
                        <div className="text-sm font-medium text-gray-700 mb-2">Share Timeline</div>
                        <div className="flex gap-2">
                          <input
                            type="email"
                            value={shareEmail}
                            onChange={(e) => setShareEmail(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleShare()}
                            placeholder="Enter email address..."
                            className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm"
                          />
                          <button
                            onClick={handleShare}
                            className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                          >
                            Share
                          </button>
                          <button
                            onClick={closeShareDialog}
                            className="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                        </div>
                        {getSharedUsersForTimeline(timeline.id).length > 0 && (
                          <div className="mt-2">
                            <div className="text-xs text-gray-600 mb-1">Shared with:</div>
                            <div className="flex flex-wrap gap-1">
                              {getSharedUsersForTimeline(timeline.id).map((user, idx) => (
                                <span key={idx} className="text-xs bg-white px-2 py-0.5 rounded border">
                                  {user}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="flex gap-2 mt-3">
                      {editingId === timeline.id ? (
                        <>
                          <button
                            onClick={saveEdit}
                            className="flex-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="flex-1 px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => onSelectTimeline(timeline.id)}
                            className="flex-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                          >
                            {timeline.id === currentTimelineId ? 'Active' : 'Select'}
                          </button>
                          <button
                            onClick={() => openShareDialog(timeline.id)}
                            className="px-3 py-1.5 border border-green-300 text-green-700 text-sm rounded hover:bg-green-50"
                            title="Share Timeline"
                          >
                            📤
                          </button>
                          <button
                            onClick={() => startEdit(timeline)}
                            className="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50"
                            title="Rename"
                          >
                            ✏️
                          </button>
                          {timelines.length > 1 && (
                            <button
                              onClick={() => onDeleteTimeline(timeline.id)}
                              className="px-3 py-1.5 border border-red-300 text-red-700 text-sm rounded hover:bg-red-50"
                              title="Delete"
                            >
                              🗑️
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function EventFull() {
  const { user, loading: authLoading, signOut } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const timelineRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Timelines management
  const [timelines, setTimelines] = useState([{ id: 'default', name: 'My Timeline', event_count: 0 }]);
  const [currentTimelineId, setCurrentTimelineId] = useState('default');
  const [events, setEvents] = useState([]);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  
  // Shared users for timelines
  const [sharedUsers, setSharedUsers] = useState({});
  
  // Custom categories and settings
  const [customCategories, setCustomCategories] = useState({});

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
  const [showPhotoLibrary, setShowPhotoLibrary] = useState(false);
  const [photoLibraryMode, setPhotoLibraryMode] = useState('browse');
  const [photosMenuOpen, setPhotosMenuOpen] = useState(false);
  const [eventsVersion, setEventsVersion] = useState(0);
  const [showAllJournals, setShowAllJournals] = useState(false);
  const [galleryForEvent, setGalleryForEvent] = useState(null);
  const [galleryStartIndex, setGalleryStartIndex] = useState(0);
  const [showBackgroundPicker, setShowBackgroundPicker] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [backgroundUrl, setBackgroundUrl] = useState('');

  // Load initial data from Supabase (only if authenticated)
  useEffect(() => {
    if (!user && !authLoading) {
      // User not authenticated - show auth modal
      setShowAuthModal(true);
      setLoading(false);
      return;
    }

    if (!user) {
      // Still loading auth state
      return;
    }

    const loadInitialData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load timelines
        const loadedTimelines = await fetchTimelines();
        if (loadedTimelines.length === 0) {
          // Create default timeline if none exist
          const defaultTimeline = {
            id: 'default',
            name: 'My Timeline',
            event_count: 0
          };
          try {
            await createTimeline(defaultTimeline);
            setTimelines([defaultTimeline]);
          } catch (err) {
            console.error('Error creating default timeline:', err);
            setTimelines([defaultTimeline]);
          }
        } else {
          setTimelines(loadedTimelines);
          // Set current timeline ID from localStorage (fallback) or first timeline
          const savedTimelineId = localStorage.getItem('eventfull:currentTimelineId') || loadedTimelines[0].id;
          setCurrentTimelineId(savedTimelineId);
        }

        // Load user settings (custom categories, background)
        const settings = await fetchUserSettings();
        if (settings) {
          setCustomCategories(settings.custom_categories || {});
          setBackgroundUrl(settings.background_url || '');
        }

        // Load shared timelines
        const shared = await fetchSharedTimelines();
        const sharedMap = {};
        shared.forEach(share => {
          if (!sharedMap[share.timeline_id]) {
            sharedMap[share.timeline_id] = [];
          }
          sharedMap[share.timeline_id].push(share.shared_with_email);
        });
        setSharedUsers(sharedMap);

      } catch (err) {
        console.error('Error loading initial data:', err);
        const errorMessage = err.message || 'Failed to load data';
        if (errorMessage.includes('must be signed in') || errorMessage.includes('Authentication error')) {
          setError('Please sign in to access your timeline.');
          setShowAuthModal(true);
        } else if (errorMessage.includes('Supabase is not configured')) {
          setError('Database connection error. Please check your configuration.');
        } else if (errorMessage.includes('Missing Supabase')) {
          setError('Database configuration missing. Please contact support.');
        } else {
          setError('Failed to load data. Please refresh the page.');
        }
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
    
    // Test Supabase connection on mount (both dev and production for debugging)
    if (user) {
      testConnection().then(results => {
        if (!results.connected) {
          console.warn('⚠️ Supabase connection test failed:', results.errors);
          console.warn('💡 Run window.debugSupabase() in console for detailed diagnostics');
        }
      });
    }
  }, [user, authLoading]);

  // Close auth modal automatically when user successfully logs in
  useEffect(() => {
    if (user && showAuthModal) {
      setShowAuthModal(false);
    }
  }, [user, showAuthModal]);

  // Load events when timeline changes (only if authenticated)
  useEffect(() => {
    if (!user) return;
    
    const loadEvents = async () => {
      if (!currentTimelineId) return;
      
      try {
        // Move legacy base64 images into Storage (no-op once already migrated)
        try {
          await migrateLegacyPhotosToStorage();
        } catch (migErr) {
          console.warn('Photo storage migration skipped/failed:', migErr);
        }

        const loadedEvents = await fetchEvents(currentTimelineId);
        
        const eventsWithPhotos = await Promise.all(
          loadedEvents.map(async (event) => {
            try {
              const photos = await getPhotosForEvent(event.id);
              const primaryFromLibrary = event.primary_photo_id
                ? photos.find(p => String(p.id) === String(event.primary_photo_id))
                : null;
              const primaryImage =
                primaryFromLibrary?.url ||
                event.image ||
                event.image_url ||
                photos[0]?.url ||
                null;
              return { 
                ...event, 
                taggedPhotos: photos,
                image: primaryImage,
                primary_photo_id: event.primary_photo_id || primaryFromLibrary?.id || null
              };
            } catch (err) {
              console.error(`Error loading photos for event ${event.id}:`, err);
              return { 
                ...event, 
                taggedPhotos: [],
                image: event.image || event.image_url || null
              };
            }
          })
        );
        
        setEvents(eventsWithPhotos);
      } catch (err) {
        console.error('Error loading events:', err);
        if (err.message?.includes('must be signed in') || err.message?.includes('Authentication error')) {
          setShowAuthModal(true);
        }
        setEvents([]);
      }
    };

    if (!loading) {
      loadEvents();
    }
  }, [currentTimelineId, loading, user, eventsVersion]);

  // Save background to Supabase
  useEffect(() => {
    const saveBackground = async () => {
      try {
        await updateUserSettings({ background_url: backgroundUrl || null });
      } catch (err) {
        console.error('Error saving background:', err);
      }
    };

    if (!loading && backgroundUrl !== undefined) {
      saveBackground();
    }
  }, [backgroundUrl, loading]);

  // Save custom categories to Supabase
  useEffect(() => {
    const saveCategories = async () => {
      try {
        await updateUserSettings({ custom_categories: customCategories });
      } catch (err) {
        console.error('Error saving categories:', err);
      }
    };

    if (!loading && Object.keys(customCategories).length >= 0) {
      saveCategories();
    }
  }, [customCategories, loading]);


  // Timeline management functions
  const handleCreateTimeline = async (name) => {
    const newTimeline = {
      id: `timeline-${Date.now()}`,
      name,
      event_count: 0
    };
    try {
      await createTimeline(newTimeline);
      setTimelines(prev => [...prev, newTimeline]);
      setCurrentTimelineId(newTimeline.id);
      setEvents([]);
      localStorage.setItem('eventfull:currentTimelineId', newTimeline.id);
    } catch (err) {
      console.error('Error creating timeline:', err);
      alert('Failed to create timeline. Please try again.');
    }
  };

  const handleSelectTimeline = async (timelineId) => {
    setCurrentTimelineId(timelineId);
    localStorage.setItem('eventfull:currentTimelineId', timelineId);
    
    // Load events for the selected timeline
    try {
      const loadedEvents = await fetchEvents(timelineId);
      setEvents(loadedEvents.length > 0 ? loadedEvents : []);
    } catch (err) {
      console.error('Error loading events:', err);
      setEvents([]);
    }
    
    // Reset selected event and close any open modals
    setSelectedEvent(null);
    setShowAddForm(false);
    setEditingEvent(null);
  };

  const handleDeleteTimeline = async (timelineId) => {
    if (window.confirm('Are you sure you want to delete this timeline? All events will be lost.')) {
      try {
        await deleteTimeline(timelineId);
        setTimelines(prev => {
          const filtered = prev.filter(t => t.id !== timelineId);
          // If we deleted the current timeline, switch to the first one
          if (timelineId === currentTimelineId && filtered.length > 0) {
            const newTimelineId = filtered[0].id;
            setCurrentTimelineId(newTimelineId);
            localStorage.setItem('eventfull:currentTimelineId', newTimelineId);
            fetchEvents(newTimelineId).then(loadedEvents => {
              setEvents(loadedEvents.length > 0 ? loadedEvents : []);
            });
          } else if (filtered.length === 0) {
            // If no timelines left, create default
            setEvents([]);
          }
          return filtered;
        });
      } catch (err) {
        console.error('Error deleting timeline:', err);
        alert('Failed to delete timeline. Please try again.');
      }
    }
  };

  const handleRenameTimeline = async (timelineId, newName) => {
    try {
      await updateTimeline(timelineId, { name: newName });
      setTimelines(prev => prev.map(t => 
        t.id === timelineId ? { ...t, name: newName } : t
      ));
    } catch (err) {
      console.error('Error renaming timeline:', err);
      alert('Failed to rename timeline. Please try again.');
    }
  };

  const handleShareTimeline = async (timelineId, userEmail) => {
    try {
      await shareTimeline(timelineId, userEmail);
      setSharedUsers(prev => {
        const timelineShares = prev[timelineId] || [];
        // Avoid duplicates
        if (!timelineShares.includes(userEmail.toLowerCase())) {
          return {
            ...prev,
            [timelineId]: [...timelineShares, userEmail.toLowerCase()]
          };
        }
        return prev;
      });
    } catch (err) {
      console.error('Error sharing timeline:', err);
      alert('Failed to share timeline. Please try again.');
    }
  };

  // Sort events by date
  const sortedEvents = [...events].sort((a, b) => a.date.getTime() - b.date.getTime());
  const filteredEvents = sortedEvents.filter(e => selectedCategories.has(e.category));

  // Define functions before using them in empty state
  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.5, 5));
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.5, 0.3));

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
    // Toggle: if all are selected, deselect all; otherwise select all
    const allSelected = allCategoryKeys.every(key => selectedCategories.has(key));
    if (allSelected) {
      setSelectedCategories(new Set()); // Deselect all
    } else {
      setSelectedCategories(new Set(allCategoryKeys)); // Select all
    }
  };

  const addEvent = async (newEvent) => {
    try {
      const primaryUrl = newEvent.image && !String(newEvent.image).startsWith('data:')
        ? newEvent.image
        : null;
      const eventToSave = {
        ...newEvent,
        timeline_id: currentTimelineId,
        primary_photo_id: newEvent.primary_photo_id || null,
        image: primaryUrl,
        image_url: primaryUrl
      };
      const createdEvent = await createEvent(eventToSave);
      setEvents([...events, createdEvent]);
      // Update timeline event count
      await updateTimeline(currentTimelineId, { event_count: events.length + 1 });
      setTimelines(prev => prev.map(t => 
        t.id === currentTimelineId ? { ...t, event_count: (t.event_count || 0) + 1 } : t
      ));
      return createdEvent;
    } catch (err) {
      console.error('Error adding event:', err);
      alert('Failed to add event. Please try again.');
      throw err;
    }
  };

  // Show loading state for auth
  if (authLoading) {
    return (
      <div className="w-full h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show auth modal if not authenticated
  if (!user) {
    return (
      <div className="w-full h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <AuthModal onClose={() => setShowAuthModal(false)} />
      </div>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <div className="w-full h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your timeline...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="w-full h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center bg-white p-6 rounded-lg shadow-lg max-w-md">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

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
              <p className="text-gray-600 mt-1">
                {timelines.find(t => t.id === currentTimelineId)?.name || 'Your Timeline'}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Timelines button */}
              <button 
                onClick={() => setShowTimelineModal(true)}
                className="border border-gray-300 text-gray-700 px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-50"
                title="Manage Timelines"
              >
                <Calendar className="w-4 h-4" />
                Timelines
              </button>
              
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
                  <div className="absolute right-0 mt-1 w-48 bg-white border rounded-md shadow-lg z-10">
                    <button
                      type="button"
                      onClick={() => { setPhotoLibraryMode('browse'); setShowPhotoLibrary(true); setPhotosMenuOpen(false); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                    >
                      Photo Library
                    </button>
                    <button
                      type="button"
                      onClick={() => { setPhotoLibraryMode('manage'); setShowPhotoLibrary(true); setPhotosMenuOpen(false); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                    >
                      Manage uploads
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
                New Event
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
        {showPhotoLibrary && (
          <PhotoLibraryModal
            selectedCategories={selectedCategories}
            onToggleCategory={toggleCategory}
            onSelectAll={selectAllCategories}
            onClose={() => setShowPhotoLibrary(false)}
            allCategories={allCategories}
            initialMode={photoLibraryMode}
            events={events}
            timelineId={currentTimelineId}
            onPhotosUpdated={() => {}}
            onEventsUpdated={() => setEventsVersion((v) => v + 1)}
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
            customCategories={customCategories}
            onUpdateCategories={setCustomCategories}
          />
        )}

        {showTimelineModal && (
          <TimelineModal
            timelines={timelines}
            currentTimelineId={currentTimelineId}
            onClose={() => setShowTimelineModal(false)}
            onSelectTimeline={handleSelectTimeline}
            onCreateTimeline={handleCreateTimeline}
            onDeleteTimeline={handleDeleteTimeline}
            onRenameTimeline={handleRenameTimeline}
            onShareTimeline={handleShareTimeline}
            sharedUsers={sharedUsers}
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

  // Calculate event position on timeline
  const getEventPosition = (event) => {
    const eventYear = event.date.getFullYear();
    const eventMonth = event.date.getMonth();
    const yearProgress = (eventYear - startYear + eventMonth / 12) / totalYears;
    const timelineWidth = Math.max(1400, totalYears * 120 * zoom) - 400; // Account for padding
    return 200 + (yearProgress * timelineWidth); // Return pixel position instead of percentage
  };

  // Collision-aware card placement: prefer alternating sides, then stack into lanes
  const getEventCardLayouts = () => {
    const cardWidth = 320 * zoom;
    // Below needs extra clearance so cards don't cover year labels under the line
    const cardGapAbove = 48 * zoom;
    const cardGapBelow = 88 * zoom;
    const horizontalPad = 12 * zoom;
    const laneStride = 316 * zoom; // room for a photo card + gap between stacked rows

    const occupied = { above: [], below: [] };
    const byId = {};

    const overlaps = (left, right, lane, side) =>
      occupied[side].some(
        (o) =>
          o.lane === lane &&
          left < o.right + horizontalPad &&
          right > o.left - horizontalPad
      );

    const firstFreeLane = (side, left, right) => {
      let lane = 0;
      while (lane < 8 && overlaps(left, right, lane, side)) lane += 1;
      return lane;
    };

    // Place chronologically left-to-right so nearby dates resolve first
    const ordered = filteredEvents
      .map((event, index) => ({ event, index, x: getEventPosition(event) }))
      .sort((a, b) => a.x - b.x || a.index - b.index);

    let maxLaneAbove = 0;
    let maxLaneBelow = 0;

    ordered.forEach(({ event, index, x }, orderIdx) => {
      const half = cardWidth / 2;
      const left = x - half;
      const right = x + half;
      const preferredSide = orderIdx % 2 === 0 ? 'above' : 'below';
      const otherSide = preferredSide === 'above' ? 'below' : 'above';

      const preferredLane = firstFreeLane(preferredSide, left, right);
      const otherLane = firstFreeLane(otherSide, left, right);

      // Prefer closer-to-timeline side; keep alternating when lanes are equal
      const usePreferred = preferredLane <= otherLane;
      const side = usePreferred ? preferredSide : otherSide;
      const lane = usePreferred ? preferredLane : otherLane;
      const baseGap = side === 'above' ? cardGapAbove : cardGapBelow;
      const offset = baseGap + lane * laneStride;

      occupied[side].push({ left, right, lane });
      if (side === 'above') maxLaneAbove = Math.max(maxLaneAbove, lane);
      else maxLaneBelow = Math.max(maxLaneBelow, lane);

      byId[event.id] = {
        isAbove: side === 'above',
        lane,
        offset,
        cardWidth
      };
    });

    const tallestAbove = cardGapAbove + maxLaneAbove * laneStride + laneStride;
    const tallestBelow = cardGapBelow + maxLaneBelow * laneStride + laneStride;

    return {
      byId,
      contentHeight: Math.max(800, tallestAbove + tallestBelow + 160)
    };
  };

  const eventCardLayout = getEventCardLayouts();

  const getCategoryIcon = (category, size = 3) => {
    const config = allCategories[category] || allCategories.milestone;
    const IconComponent = config.icon;
    return <IconComponent style={{ width: `${size}px`, height: `${size}px` }} />;
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

  const saveEditedEvent = async (updatedEvent) => {
    try {
      const primaryUrl = updatedEvent.image && !String(updatedEvent.image).startsWith('data:')
        ? updatedEvent.image
        : null;
      const savedEvent = await updateEvent(updatedEvent.id, {
        title: updatedEvent.title,
        description: updatedEvent.description,
        date: updatedEvent.date instanceof Date ? updatedEvent.date : new Date(updatedEvent.date),
        category: updatedEvent.category,
        importance: updatedEvent.importance,
        primary_photo_id: updatedEvent.primary_photo_id || null,
        image_url: primaryUrl,
        images: updatedEvent.images || [],
        journals: updatedEvent.journals || [],
        recordings: updatedEvent.recordings || []
      });
      setEvents(events.map(e => (e.id === updatedEvent.id ? { ...e, ...savedEvent, taggedPhotos: e.taggedPhotos } : e)));
      return savedEvent;
    } catch (err) {
      console.error('Error updating event:', err);
      throw err;
    }
  };

  const handleDeleteEvent = async (eventToDelete) => {
    try {
      await deleteEvent(eventToDelete.id);
      setEvents(events.filter(e => e.id !== eventToDelete.id));
      // Update timeline event count
      await updateTimeline(currentTimelineId, { event_count: events.length - 1 });
      setTimelines(prev => prev.map(t => 
        t.id === currentTimelineId ? { ...t, event_count: Math.max(0, (t.event_count || 0) - 1) } : t
      ));
    } catch (err) {
      console.error('Error deleting event:', err);
      alert('Failed to delete event. Please try again.');
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
            <p className="text-gray-600 mt-1">
              {timelines.find(t => t.id === currentTimelineId)?.name || 'Your Timeline'}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Timelines button */}
            <button 
              onClick={() => setShowTimelineModal(true)}
              className="border border-gray-300 text-gray-700 px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-50"
              title="Manage Timelines"
            >
              <Calendar className="w-4 h-4" />
              Timelines
            </button>
            
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
                <div className="absolute right-0 mt-1 w-48 bg-white border rounded-md shadow-lg z-10">
                  <button
                    type="button"
                    onClick={() => { setPhotoLibraryMode('browse'); setShowPhotoLibrary(true); setPhotosMenuOpen(false); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    Photo Library
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPhotoLibraryMode('manage'); setShowPhotoLibrary(true); setPhotosMenuOpen(false); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    Manage uploads
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
            
            {!user && (
              <button 
                onClick={() => setShowAuthModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                title="Sign In"
              >
                Sign In
              </button>
            )}
            
            <button 
              onClick={() => setShowAddForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Event
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
              height: `${eventCardLayout.contentHeight}px`,
              paddingTop: '100px',
              paddingBottom: '150px',
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
            {filteredEvents.map((event) => {
              const position = getEventPosition(event);
              const layout = eventCardLayout.byId[event.id] || {
                isAbove: true,
                offset: 48 * zoom,
                cardWidth: 320 * zoom
              };
              const isAbove = layout.isAbove;
              const age = getAgeAtEvent(event.date);
              const cardGap = layout.offset;
              const cardWidth = layout.cardWidth;
              const timelineWidth = Math.max(1400, totalYears * 120 * zoom);
              const cardHalfWidth = cardWidth / 2;

              let horizontalClass = 'left-1/2 -translate-x-1/2';
              if (position - cardHalfWidth < 250) {
                horizontalClass = 'left-0';
              } else if (position + cardHalfWidth > timelineWidth - 250) {
                horizontalClass = 'right-0';
              }

              const cardOffsetStyle = isAbove
                ? { bottom: `${cardGap}px` }
                : { top: `${cardGap}px` };
              const connectionStyle = isAbove
                ? { bottom: '100%', height: `${cardGap}px` }
                : { top: '100%', height: `${cardGap}px` };
              
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
                    className="absolute left-1/2 w-px bg-gray-300 -translate-x-1/2"
                    style={connectionStyle}
                  />
                  
                  {/* Event Dot */}
                  <div 
                    className={`rounded-full ${getCategoryColor(event.category)} border-3 border-white shadow-lg relative z-10 flex items-center justify-center text-white transform hover:scale-110 transition-transform`}
                    style={{
                      width: `${5 * zoom}px`,
                      height: `${5 * zoom}px`,
                      transform: `scale(${Math.max(0.8, event.importance / 10)}) ${selectedEvent?.id === event.id ? 'scale(1.3)' : ''}`
                    }}
                  >
                    {(event.image || (event.taggedPhotos && event.taggedPhotos.length > 0)) ? <Camera style={{ width: `${3 * zoom}px`, height: `${3 * zoom}px` }} /> : getCategoryIcon(event.category, 3 * zoom)}
                  </div>
                  
                  {/* Event Card */}
                  <div 
                    className={`absolute ${horizontalClass} ${selectedEvent?.id === event.id ? 'z-50' : 'z-30'}`}
                    style={{
                      ...cardOffsetStyle,
                      width: `${320 * zoom}px`,
                      maxHeight: `${380 * zoom}px`,
                      overflowY: 'auto',
                      fontSize: `${zoom}em`
                    }}
                  >
                    <div className={`bg-white rounded-lg shadow-lg border-2 border-gray-300 overflow-hidden transition-all duration-200 ${
                      selectedEvent?.id === event.id 
                        ? 'ring-2 ring-blue-400 shadow-xl transform scale-105' 
                        : 'group-hover:shadow-xl group-hover:transform group-hover:scale-102'
                    }`}>
                      {/* Event Image - Show primary image (event.image) or first tagged photo */}
                      {(() => {
                        const eventPhotos = event.taggedPhotos || [];
                        const displayImage = event.image || (eventPhotos.length > 0 ? eventPhotos[0].url : null);
                        // Count linked library photos; include legacy cover only if not already tagged
                        const urls = new Set(eventPhotos.map((p) => p.url).filter(Boolean));
                        const photoCount =
                          eventPhotos.length +
                          (event.image && !urls.has(event.image) && !event.primary_photo_id ? 1 : 0);
                        
                        if (displayImage) {
                          return (
                            <div 
                              className="w-full bg-gray-100 overflow-hidden cursor-pointer relative" 
                              title={photoCount > 0 ? `View ${photoCount} photo(s)` : 'View photos'} 
                              onClick={(e) => { e.stopPropagation(); setGalleryForEvent(event); setGalleryStartIndex(0); }}
                              style={{ height: `${128 * zoom}px` }}
                            >
                              <img 
                                src={displayImage} 
                                alt={event.title}
                                className="w-full h-full object-cover"
                              />
                              {photoCount > 0 && (
                                <div className="absolute top-2 right-2 bg-slate-800/70 text-white text-xs px-2 py-1 rounded-md flex items-center gap-1 shadow">
                                  <Camera style={{ width: '12px', height: '12px' }} />
                                  <span>{photoCount}</span>
                                </div>
                              )}
                            </div>
                          );
                        }
                        return null;
                      })()}
                      
                      <div style={{ padding: `${16 * zoom}px` }}>
                        <div className="flex justify-between items-start gap-2 mb-1">
                          <h3 
                            className="font-bold text-gray-900 min-w-0 flex-1"
                            style={{ fontSize: `${16 * zoom}px` }}
                          >
                            {event.title}
                          </h3>
                          <span 
                            className="text-gray-500 font-medium shrink-0 whitespace-nowrap"
                            style={{ fontSize: `${12 * zoom}px` }}
                          >
                            Age {age}
                          </span>
                        </div>
                        
                        <p 
                          className="text-gray-600 mb-2"
                          style={{ fontSize: `${14 * zoom}px` }}
                        >
                          {formatDate(event.date)}
                        </p>
                        
                        {event.description && (
                          <p 
                            className="text-gray-700 leading-relaxed mb-3"
                            style={{ fontSize: `${14 * zoom}px` }}
                          >
                            {event.description}
                          </p>
                        )}
                        
                        {/* Importance + category tags (up to 4) */}
                        <div className="flex justify-between items-end gap-2">
                          <div className="flex items-center gap-1 shrink-0">
                            <span 
                              className="text-gray-500"
                              style={{ fontSize: `${12 * zoom}px` }}
                            >
                              Importance:
                            </span>
                            <div className="flex gap-1">
                              {Array.from({ length: 5 }, (_, i) => (
                                <div 
                                  key={i} 
                                  className={`rounded-full ${
                                    i < event.importance / 2 ? 'bg-yellow-400' : 'bg-gray-200'
                                  }`}
                                  style={{
                                    width: `${8 * zoom}px`,
                                    height: `${8 * zoom}px`
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                          <div 
                            className="flex flex-wrap justify-end gap-1"
                            style={{ maxWidth: `${180 * zoom}px` }}
                          >
                            {(Array.isArray(event.categories) && event.categories.length > 0
                              ? event.categories
                              : [event.category]
                            ).filter(Boolean).slice(0, 4).map((cat) => (
                              <div 
                                key={cat}
                                className={`inline-flex items-center gap-1 rounded-full text-white ${getCategoryColor(cat)}`}
                                style={{ 
                                  padding: `${4 * zoom}px ${8 * zoom}px`,
                                  fontSize: `${12 * zoom}px`
                                }}
                              >
                                {getCategoryIcon(cat, 12 * zoom)}
                                <span>{allCategories[cat]?.label || 'Event'}</span>
                              </div>
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
            title={allCategoryKeys.every(key => selectedCategories.has(key)) ? "Deselect all categories" : "Select all categories"}
          >
            {allCategoryKeys.every(key => selectedCategories.has(key)) ? "Select None" : "Select All"}
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
          onDelete={handleDeleteEvent}
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

      {/* Photo Library */}
      {showPhotoLibrary && (
        <PhotoLibraryModal
          selectedCategories={selectedCategories}
          onToggleCategory={toggleCategory}
          onSelectAll={selectAllCategories}
          onClose={() => setShowPhotoLibrary(false)}
          allCategories={allCategories}
          initialMode={photoLibraryMode}
          events={events}
          timelineId={currentTimelineId}
          onPhotosUpdated={() => {}}
          onEventsUpdated={() => setEventsVersion((v) => v + 1)}
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
          customCategories={customCategories}
          onUpdateCategories={setCustomCategories}
        />
      )}

      {/* Timeline Management Modal */}
      {showTimelineModal && (
        <TimelineModal
          timelines={timelines}
          currentTimelineId={currentTimelineId}
          onClose={() => setShowTimelineModal(false)}
          onSelectTimeline={handleSelectTimeline}
          onCreateTimeline={handleCreateTimeline}
          onDeleteTimeline={handleDeleteTimeline}
          onRenameTimeline={handleRenameTimeline}
          onShareTimeline={handleShareTimeline}
          sharedUsers={sharedUsers}
        />
      )}

      {/* Auth Modal */}
      {/* Bottom Navigation Bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm shadow-sm border-t border-gray-200 px-6 py-3 z-10">
        <div className="flex justify-between items-center">
          <div>
            {user && (
              <button 
                onClick={signOut}
                className="border border-gray-300 text-gray-700 px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-50 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            )}
          </div>
        </div>
      </div>

      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}
    </div>
  );
}

export default EventFull;