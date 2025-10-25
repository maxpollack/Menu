import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [selectedPreferences, setSelectedPreferences] = useState([]);
  const [menuImage, setMenuImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [customPreferences, setCustomPreferences] = useState([]);
  const [newPreference, setNewPreference] = useState('');

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

  // Load selected preferences and custom preferences from localStorage on mount
  useEffect(() => {
    const savedPreferences = localStorage.getItem('selectedPreferences');
    const savedCustomPreferences = localStorage.getItem('customPreferences');

    if (savedPreferences) {
      setSelectedPreferences(JSON.parse(savedPreferences));
    }
    if (savedCustomPreferences) {
      setCustomPreferences(JSON.parse(savedCustomPreferences));
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

  // Combine default and custom preferences
  const preferenceSuggestions = [...defaultPreferenceSuggestions, ...customPreferences];

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('Image size must be less than 10MB');
        return;
      }

      setMenuImage(file);
      setError(null);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
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
    // Keep dietary preferences saved
    setMenuImage(null);
    setImagePreview(null);
    setAnalysis(null);
    setError(null);
  };

  const clearPreferences = () => {
    setSelectedPreferences([]);
    localStorage.removeItem('selectedPreferences');
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

  const renderAnnotatedMenu = () => {
    if (!imagePreview || !analysis) return null;

    const allItems = [
      ...(analysis.suitableItems || []).map(item => ({ ...item, color: '#10b981', type: 'suitable' })),
      ...(analysis.neutralItems || []).map(item => ({ ...item, color: '#f59e0b', type: 'neutral' })),
      ...(analysis.unsuitableItems || []).map(item => ({ ...item, color: '#ef4444', type: 'unsuitable' }))
    ];

    return (
      <div className="annotated-menu-container">
        <div className="annotated-menu-wrapper">
          <img src={imagePreview} alt="Menu with highlights" className="menu-base-image" />
          <div className="menu-overlays">
            {allItems.map((item, index) => {
              if (!item.position) return null;

              const { x, y, width, height } = item.position;

              return (
                <div
                  key={index}
                  className={`menu-highlight ${item.type}`}
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    width: `${width}%`,
                    height: `${height}%`
                  }}
                  title={`${item.name} - ${item.rating} stars`}
                />
              );
            })}
          </div>
        </div>
        <div className="highlight-legend">
          <div className="legend-item">
            <span className="legend-color green"></span>
            <span>Good Choices (4-5★)</span>
          </div>
          <div className="legend-item">
            <span className="legend-color yellow"></span>
            <span>Acceptable (3★)</span>
          </div>
          <div className="legend-item">
            <span className="legend-color red"></span>
            <span>Avoid (1-2★)</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="App">
      <header className="app-header">
        <h1>Diet Menu Analyzer</h1>
        <p>AI-powered menu analysis for your dietary needs</p>
      </header>

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

            {/* Display annotated menu with highlights */}
            {renderAnnotatedMenu()}

            {/* Menu Sections Highlight */}
            {analysis.menuSections && analysis.menuSections.length > 0 && (
              <div className="menu-sections">
                <h2>Menu Sections Analysis</h2>
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

            {/* Recommendations */}
            {analysis.recommendations && analysis.recommendations.length > 0 && (
              <div className="recommendations">
                <h2>Top Recommendations</h2>
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

            {/* Suitable Items */}
            {analysis.suitableItems && analysis.suitableItems.length > 0 && (
              <div className="items-section suitable">
                <h2>Good Choices for You</h2>
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
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Neutral Items */}
            {analysis.neutralItems && analysis.neutralItems.length > 0 && (
              <div className="items-section neutral">
                <h2>Acceptable Options</h2>
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
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Unsuitable Items */}
            {analysis.unsuitableItems && analysis.unsuitableItems.length > 0 && (
              <div className="items-section unsuitable">
                <h2>Items to Avoid</h2>
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
                    </div>
                  </div>
                ))}
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

      <footer className="app-footer">
        <p>Powered by Claude AI Vision</p>
      </footer>
    </div>
  );
}

export default App;
