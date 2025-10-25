import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [selectedPreferences, setSelectedPreferences] = useState([]);
  const [menuImage, setMenuImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);
  const [customPreferences, setCustomPreferences] = useState([]);
  const [newPreference, setNewPreference] = useState('');
  const [likedItems, setLikedItems] = useState([]);
  const [dislikedItems, setDislikedItems] = useState([]);
  const [expandedSections, setExpandedSections] = useState({
    menuSections: false,
    recommendations: false,
    suitable: false,
    neutral: false,
    unsuitable: false
  });

  // Common dietary preference suggestions
  const defaultPreferenceSuggestions = [
    'Vegetarian',
    'Vegan',
    'Gluten-free',
    'Dairy-free',
    'Keto',
    'Low-carb',
    'Halal',
    'Kosher',
    'Nut-free',
    'Shellfish-free'
  ];

  // Load all saved data from localStorage on mount
  useEffect(() => {
    const savedPreferences = localStorage.getItem('selectedPreferences');
    const savedCustomPreferences = localStorage.getItem('customPreferences');
    const savedLikedItems = localStorage.getItem('likedItems');
    const savedDislikedItems = localStorage.getItem('dislikedItems');

    if (savedPreferences) {
      setSelectedPreferences(JSON.parse(savedPreferences));
    }
    if (savedCustomPreferences) {
      setCustomPreferences(JSON.parse(savedCustomPreferences));
    }
    if (savedLikedItems) {
      setLikedItems(JSON.parse(savedLikedItems));
    }
    if (savedDislikedItems) {
      setDislikedItems(JSON.parse(savedDislikedItems));
    }
  }, []);

  // Save selected preferences to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('selectedPreferences', JSON.stringify(selectedPreferences));
  }, [selectedPreferences]);

  // Save custom preferences to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('customPreferences', JSON.stringify(customPreferences));
  }, [customPreferences]);

  // Save liked items to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('likedItems', JSON.stringify(likedItems));
  }, [likedItems]);

  // Save disliked items to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('dislikedItems', JSON.stringify(dislikedItems));
  }, [dislikedItems]);

  // Combine default and custom preferences
  const preferenceSuggestions = [...defaultPreferenceSuggestions, ...customPreferences];

  // Resize image if it exceeds 5MB
  const resizeImage = (file, maxSizeMB = 5) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Calculate initial scale based on file size
          const fileSizeMB = file.size / (1024 * 1024);
          let scale = 1;

          // Aggressively scale down for large images
          if (fileSizeMB > 15) {
            scale = 0.5;
          } else if (fileSizeMB > 10) {
            scale = 0.6;
          } else if (fileSizeMB > 7) {
            scale = 0.7;
          } else {
            scale = 0.85;
          }

          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          // Set canvas size with initial scale
          canvas.width = Math.floor(img.width * scale);
          canvas.height = Math.floor(img.height * scale);

          // Draw scaled image
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          // Try different quality levels until we get under maxSizeMB
          const tryCompress = (quality) => {
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(new Error('Failed to create blob'));
                  return;
                }

                const sizeMB = blob.size / (1024 * 1024);

                // If we're under the limit or quality is too low, use this version
                if (sizeMB <= maxSizeMB || quality <= 0.1) {
                  const resizedFile = new File([blob], file.name, {
                    type: 'image/jpeg',
                    lastModified: Date.now()
                  });
                  resolve(resizedFile);
                } else {
                  // Try lower quality
                  tryCompress(quality - 0.1);
                }
              },
              'image/jpeg',
              quality
            );
          };

          // Start with quality 0.85 for good balance
          tryCompress(0.85);
        };

        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target.result;
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const maxSizeMB = 5;
        const fileSizeMB = file.size / (1024 * 1024);

        let processedFile = file;

        // Resize if over 5MB
        if (fileSizeMB > maxSizeMB) {
          setStatusMessage(`Resizing image (${fileSizeMB.toFixed(1)}MB → ${maxSizeMB}MB)...`);
          processedFile = await resizeImage(file, maxSizeMB);
          const newSizeMB = processedFile.size / (1024 * 1024);
          console.log(`Image resized from ${fileSizeMB.toFixed(1)}MB to ${newSizeMB.toFixed(1)}MB`);
          setStatusMessage(`Image resized to ${newSizeMB.toFixed(1)}MB`);
          setTimeout(() => setStatusMessage(null), 3000);
        }

        setMenuImage(processedFile);
        setError(null);

        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result);
        };
        reader.readAsDataURL(processedFile);
      } catch (err) {
        setError('Failed to process image. Please try another image.');
        setStatusMessage(null);
        console.error('Image processing error:', err);
      }
    }
  };

  const handlePreferenceClick = (preference) => {
    if (selectedPreferences.includes(preference)) {
      // Remove if already selected
      setSelectedPreferences(selectedPreferences.filter(p => p !== preference));
    } else {
      // Add preference
      setSelectedPreferences([...selectedPreferences, preference]);
    }
  };

  const analyzeMenu = async () => {
    if (!menuImage) {
      setError('Please upload a menu image');
      return;
    }

    if (selectedPreferences.length === 0) {
      setError('Please select at least one dietary preference');
      return;
    }

    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const formData = new FormData();
      formData.append('menu', menuImage);
      formData.append('dietaryPreferences', selectedPreferences.join(', '));

      // Include learned preferences if they exist
      if (likedItems.length > 0) {
        formData.append('likedItems', likedItems.join(', '));
      }
      if (dislikedItems.length > 0) {
        formData.append('dislikedItems', dislikedItems.join(', '));
      }

      const apiUrl = process.env.NODE_ENV === 'production'
        ? '/api/analyze-menu'
        : 'http://localhost:5000/api/analyze-menu';

      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to analyze menu');
      }

      const data = await response.json();
      setAnalysis(data.analysis);
    } catch (err) {
      setError(err.message || 'Failed to analyze menu. Please try again.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    // Keep dietary preferences and learned preferences saved
    setMenuImage(null);
    setImagePreview(null);
    setAnalysis(null);
    setError(null);
  };

  const clearPreferences = () => {
    setSelectedPreferences([]);
    localStorage.removeItem('selectedPreferences');
  };

  const clearLearnedPreferences = () => {
    setLikedItems([]);
    setDislikedItems([]);
    localStorage.removeItem('likedItems');
    localStorage.removeItem('dislikedItems');
  };

  const addCustomPreference = () => {
    const trimmed = newPreference.trim();
    if (trimmed && !preferenceSuggestions.includes(trimmed)) {
      setCustomPreferences([...customPreferences, trimmed]);
      setNewPreference('');
      // Also add to selected preferences
      setSelectedPreferences([...selectedPreferences, trimmed]);
    }
  };

  const removeCustomPreference = (pref) => {
    setCustomPreferences(customPreferences.filter(p => p !== pref));
    // Also remove from selected preferences
    setSelectedPreferences(selectedPreferences.filter(p => p !== pref));
  };

  const handleThumbsUp = (itemName) => {
    // Remove from disliked if it's there
    setDislikedItems(dislikedItems.filter(item => item !== itemName));

    // Toggle in liked
    if (likedItems.includes(itemName)) {
      setLikedItems(likedItems.filter(item => item !== itemName));
    } else {
      setLikedItems([...likedItems, itemName]);
    }
  };

  const handleThumbsDown = (itemName) => {
    // Remove from liked if it's there
    setLikedItems(likedItems.filter(item => item !== itemName));

    // Toggle in disliked
    if (dislikedItems.includes(itemName)) {
      setDislikedItems(dislikedItems.filter(item => item !== itemName));
    } else {
      setDislikedItems([...dislikedItems, itemName]);
    }
  };

  const toggleSection = (sectionName) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }));
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} className={`star ${i <= rating ? 'filled' : ''}`}>
          ★
        </span>
      );
    }
    return <div className="star-rating">{stars}</div>;
  };

  const renderMenuImage = () => {
    if (!imagePreview) return null;

    return (
      <div className="menu-image-container">
        <h3>Your Menu</h3>
        <div className="menu-wrapper">
          <img src={imagePreview} alt="Menu" className="menu-image" />
        </div>
      </div>
    );
  };

  return (
    <div className="App">
      <main className="app-main">
        {!analysis ? (
          <div className="input-section">
            {/* Dietary Preferences Section */}
            <div className="form-group">
              <div className="label-with-clear">
                <label>
                  Your Dietary Preferences
                </label>
                {selectedPreferences.length > 0 && (
                  <button
                    type="button"
                    className="clear-prefs-button"
                    onClick={clearPreferences}
                    title="Clear saved preferences"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="preference-chips">
                {preferenceSuggestions.map((pref) => {
                  const isCustom = customPreferences.includes(pref);
                  return (
                    <button
                      key={pref}
                      type="button"
                      className={`chip ${selectedPreferences.includes(pref) ? 'active' : ''} ${isCustom ? 'custom' : ''}`}
                      onClick={() => handlePreferenceClick(pref)}
                    >
                      {pref}
                      {isCustom && (
                        <span
                          className="remove-chip"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeCustomPreference(pref);
                          }}
                        >
                          ×
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="add-custom-pref">
                <input
                  type="text"
                  placeholder="Add custom preference..."
                  value={newPreference}
                  onChange={(e) => setNewPreference(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addCustomPreference()}
                />
                <button
                  type="button"
                  onClick={addCustomPreference}
                  disabled={!newPreference.trim()}
                >
                  Add
                </button>
              </div>
            </div>

            {/* Learned Preferences Section */}
            {(likedItems.length > 0 || dislikedItems.length > 0) && (
              <div className="form-group">
                <div className="label-with-clear">
                  <label>
                    Learned Preferences ({likedItems.length} liked, {dislikedItems.length} disliked)
                  </label>
                  <button
                    type="button"
                    className="clear-prefs-button"
                    onClick={clearLearnedPreferences}
                    title="Clear learned preferences"
                  >
                    Clear
                  </button>
                </div>
                <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.5rem' }}>
                  Your thumbs up/down feedback helps personalize future recommendations
                </p>
              </div>
            )}

            {/* Image Upload Section */}
            <div className="form-group">
              <label htmlFor="menu-upload">
                Upload Menu Photo
              </label>
              <div className="file-upload-wrapper">
                <label htmlFor="menu-upload" className="file-upload-button">
                  {menuImage ? '📷 Change Photo' : '📷 Choose Photo or Take Picture'}
                </label>
                <input
                  id="menu-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{ display: 'none' }}
                />
              </div>

              {imagePreview && (
                <div className="image-preview">
                  <img src={imagePreview} alt="Menu preview" />
                </div>
              )}
            </div>

            {/* Status message */}
            {!menuImage && selectedPreferences.length > 0 && (
              <div className="status-message">
                📸 Upload a menu photo to continue
              </div>
            )}
            {menuImage && selectedPreferences.length === 0 && (
              <div className="status-message">
                ✅ Photo uploaded! Now select your dietary preferences
              </div>
            )}
            {menuImage && selectedPreferences.length > 0 && !error && (
              <div className="status-message success">
                ✅ Ready to analyze! ({selectedPreferences.length} preference{selectedPreferences.length !== 1 ? 's' : ''} selected)
              </div>
            )}

            {statusMessage && (
              <div className="status-message">
                {statusMessage}
              </div>
            )}

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <button
              className="analyze-button"
              onClick={analyzeMenu}
              disabled={loading || !menuImage || selectedPreferences.length === 0}
            >
              {loading ? 'Analyzing...' : 'Analyze Menu'}
            </button>
          </div>
        ) : (
          <div className="results-section">
            {/* Overall Compatibility Score */}
            {analysis.overallCompatibility && (
              <div className="overall-compatibility">
                <h2>Overall Menu Compatibility</h2>
                <div className="compatibility-score">
                  {renderStars(Math.round(analysis.overallCompatibility))}
                  <span className="score-text">{analysis.overallCompatibility.toFixed(1)} / 5.0</span>
                </div>
                {analysis.summary && (
                  <p className="analysis-summary">{analysis.summary}</p>
                )}
              </div>
            )}

            {/* Display menu image */}
            {renderMenuImage()}

            {/* Menu Sections Highlight */}
            {analysis.menuSections && analysis.menuSections.length > 0 && (
              <div className="menu-sections collapsible-section">
                <h2 className="section-title-collapsible" onClick={() => toggleSection('menuSections')}>
                  <span className="collapse-icon">{expandedSections.menuSections ? '▼' : '▶'}</span>
                  Menu Sections Analysis
                </h2>
                {expandedSections.menuSections && (
                  <div className="section-content">
                    {analysis.menuSections.map((section, index) => (
                      <div key={index} className="section-card">
                        <div className="section-header">
                          <h3>{section.section}</h3>
                          {renderStars(section.compatibility)}
                        </div>
                        <p>{section.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Recommendations */}
            {analysis.recommendations && analysis.recommendations.length > 0 && (
              <div className="recommendations collapsible-section">
                <h2 className="section-title-collapsible" onClick={() => toggleSection('recommendations')}>
                  <span className="collapse-icon">{expandedSections.recommendations ? '▼' : '▶'}</span>
                  Top Recommendations
                </h2>
                {expandedSections.recommendations && (
                  <div className="section-content">
                    {analysis.recommendations.map((rec, index) => (
                      <div key={index} className="recommendation-card">
                        <div className="rec-number">{index + 1}</div>
                        <div className="rec-content">
                          <h3>{rec.name}</h3>
                          {rec.rating && renderStars(rec.rating)}
                          <p>{rec.reason}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Suitable Items */}
            {analysis.suitableItems && analysis.suitableItems.length > 0 && (
              <div className="items-section suitable collapsible-section">
                <h2 className="section-title-collapsible" onClick={() => toggleSection('suitable')}>
                  <span className="collapse-icon">{expandedSections.suitable ? '▼' : '▶'}</span>
                  Good Choices for You
                </h2>
                {expandedSections.suitable && (
                  <div className="section-content">
                    {analysis.suitableItems.map((item, index) => (
                  <div key={index} className="item-card green">
                    <div className="item-indicator">✓</div>
                    <div className="item-content">
                      <div className="item-header">
                        <h3>{item.name}</h3>
                        {item.rating && renderStars(item.rating)}
                      </div>
                      <p>{item.reason}</p>
                      {item.location && (
                        <span className="item-location">{item.location}</span>
                      )}
                      <div className="feedback-buttons">
                        <button
                          className={`thumb-button ${likedItems.includes(item.name) ? 'active' : ''}`}
                          onClick={() => handleThumbsUp(item.name)}
                          title="I like this"
                        >
                          👍
                        </button>
                        <button
                          className={`thumb-button ${dislikedItems.includes(item.name) ? 'active' : ''}`}
                          onClick={() => handleThumbsDown(item.name)}
                          title="I don't like this"
                        >
                          👎
                        </button>
                      </div>
                    </div>
                  </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Neutral Items */}
            {analysis.neutralItems && analysis.neutralItems.length > 0 && (
              <div className="items-section neutral collapsible-section">
                <h2 className="section-title-collapsible" onClick={() => toggleSection('neutral')}>
                  <span className="collapse-icon">{expandedSections.neutral ? '▼' : '▶'}</span>
                  Acceptable Options
                </h2>
                {expandedSections.neutral && (
                  <div className="section-content">
                    {analysis.neutralItems.map((item, index) => (
                  <div key={index} className="item-card yellow">
                    <div className="item-indicator">~</div>
                    <div className="item-content">
                      <div className="item-header">
                        <h3>{item.name}</h3>
                        {item.rating && renderStars(item.rating)}
                      </div>
                      <p>{item.reason}</p>
                      {item.location && (
                        <span className="item-location">{item.location}</span>
                      )}
                      <div className="feedback-buttons">
                        <button
                          className={`thumb-button ${likedItems.includes(item.name) ? 'active' : ''}`}
                          onClick={() => handleThumbsUp(item.name)}
                          title="I like this"
                        >
                          👍
                        </button>
                        <button
                          className={`thumb-button ${dislikedItems.includes(item.name) ? 'active' : ''}`}
                          onClick={() => handleThumbsDown(item.name)}
                          title="I don't like this"
                        >
                          👎
                        </button>
                      </div>
                    </div>
                  </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Unsuitable Items */}
            {analysis.unsuitableItems && analysis.unsuitableItems.length > 0 && (
              <div className="items-section unsuitable collapsible-section">
                <h2 className="section-title-collapsible" onClick={() => toggleSection('unsuitable')}>
                  <span className="collapse-icon">{expandedSections.unsuitable ? '▼' : '▶'}</span>
                  Items to Avoid
                </h2>
                {expandedSections.unsuitable && (
                  <div className="section-content">
                    {analysis.unsuitableItems.map((item, index) => (
                  <div key={index} className="item-card red">
                    <div className="item-indicator">✗</div>
                    <div className="item-content">
                      <div className="item-header">
                        <h3>{item.name}</h3>
                        {item.rating && renderStars(item.rating)}
                      </div>
                      <p>{item.reason}</p>
                      {item.location && (
                        <span className="item-location">{item.location}</span>
                      )}
                      <div className="feedback-buttons">
                        <button
                          className={`thumb-button ${likedItems.includes(item.name) ? 'active' : ''}`}
                          onClick={() => handleThumbsUp(item.name)}
                          title="I like this"
                        >
                          👍
                        </button>
                        <button
                          className={`thumb-button ${dislikedItems.includes(item.name) ? 'active' : ''}`}
                          onClick={() => handleThumbsDown(item.name)}
                          title="I don't like this"
                        >
                          👎
                        </button>
                      </div>
                    </div>
                  </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Raw response fallback */}
            {analysis.rawResponse && (!analysis.suitableItems || analysis.suitableItems.length === 0) && (
              <div className="raw-response">
                <h2>Analysis</h2>
                <pre>{analysis.rawResponse}</pre>
              </div>
            )}

            <button className="reset-button" onClick={reset}>
              Analyze Another Menu
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
