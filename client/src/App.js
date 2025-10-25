import React, { useState } from 'react';
import './App.css';

function App() {
  const [dietaryPreferences, setDietaryPreferences] = useState('');
  const [menuImage, setMenuImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Common dietary preference suggestions
  const preferenceSuggestions = [
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
    if (dietaryPreferences.includes(preference)) {
      // Remove if already selected
      setDietaryPreferences(
        dietaryPreferences
          .split(',')
          .map(p => p.trim())
          .filter(p => p !== preference)
          .join(', ')
      );
    } else {
      // Add preference
      const current = dietaryPreferences.trim();
      setDietaryPreferences(
        current ? `${current}, ${preference}` : preference
      );
    }
  };

  const analyzeMenu = async () => {
    if (!menuImage) {
      setError('Please upload a menu image');
      return;
    }

    if (!dietaryPreferences.trim()) {
      setError('Please enter your dietary preferences');
      return;
    }

    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const formData = new FormData();
      formData.append('menu', menuImage);
      formData.append('dietaryPreferences', dietaryPreferences);

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
    setDietaryPreferences('');
    setMenuImage(null);
    setImagePreview(null);
    setAnalysis(null);
    setError(null);
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
              <label htmlFor="dietary-prefs">
                Your Dietary Preferences
              </label>
              <textarea
                id="dietary-prefs"
                placeholder="e.g., Vegetarian, gluten-free, no dairy..."
                value={dietaryPreferences}
                onChange={(e) => setDietaryPreferences(e.target.value)}
                rows="3"
              />

              <div className="preference-chips">
                {preferenceSuggestions.map((pref) => (
                  <button
                    key={pref}
                    type="button"
                    className={`chip ${dietaryPreferences.includes(pref) ? 'active' : ''}`}
                    onClick={() => handlePreferenceClick(pref)}
                  >
                    {pref}
                  </button>
                ))}
              </div>
            </div>

            {/* Image Upload Section */}
            <div className="form-group">
              <label htmlFor="menu-upload">
                Upload Menu Photo
              </label>
              <input
                id="menu-upload"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                capture="environment"
              />

              {imagePreview && (
                <div className="image-preview">
                  <img src={imagePreview} alt="Menu preview" />
                </div>
              )}
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <button
              className="analyze-button"
              onClick={analyzeMenu}
              disabled={loading || !menuImage || !dietaryPreferences.trim()}
            >
              {loading ? 'Analyzing...' : 'Analyze Menu'}
            </button>
          </div>
        ) : (
          <div className="results-section">
            {/* Display uploaded image */}
            {imagePreview && (
              <div className="uploaded-menu">
                <h3>Your Menu</h3>
                <img src={imagePreview} alt="Uploaded menu" />
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
                      <h3>{item.name}</h3>
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
                      <h3>{item.name}</h3>
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
