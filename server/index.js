const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Serve static files from React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
}

// API Routes
app.post('/api/analyze-menu', upload.single('menu'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No menu image provided' });
    }

    const { dietaryPreferences, likedItems, dislikedItems } = req.body;

    if (!dietaryPreferences) {
      return res.status(400).json({ error: 'No dietary preferences provided' });
    }

    // Convert image buffer to base64
    const base64Image = req.file.buffer.toString('base64');
    const mediaType = req.file.mimetype;

    // Build learned preferences context
    let learnedContext = '';
    if (likedItems || dislikedItems) {
      learnedContext = '\n\nIMPORTANT - User has provided feedback on previous menu items:';
      if (likedItems) {
        learnedContext += `\n- LIKED (thumbs up): ${likedItems}`;
      }
      if (dislikedItems) {
        learnedContext += `\n- DISLIKED (thumbs down): ${dislikedItems}`;
      }
      learnedContext += '\nUse this feedback to better understand their taste preferences and make more personalized recommendations.';
    }

    // Create prompt for Claude
    const prompt = `Analyze this restaurant menu image based on the following dietary preferences: ${dietaryPreferences}${learnedContext}

Please provide:
1. A brief text summary (2-3 sentences) of the overall menu compatibility
2. For each menu item you can identify, rate how compatible it is (1-5 stars):
   - 5 stars: Perfect match, highly recommended
   - 4 stars: Good match, recommended with minor considerations
   - 3 stars: Moderate match, acceptable but not ideal
   - 2 stars: Poor match, conflicts with some preferences
   - 1 star: Very poor match, should avoid

3. Classify items as:
   - "suitable" (4-5 stars)
   - "neutral" (3 stars)
   - "unsuitable" (1-2 stars)

Format your response as JSON with this structure:
{
  "summary": "Brief 2-3 sentence analysis of the menu compatibility",
  "overallCompatibility": 3.5,
  "suitableItems": [
    {"name": "item name", "rating": 5, "reason": "why it's suitable", "location": "text description"}
  ],
  "neutralItems": [
    {"name": "item name", "rating": 3, "reason": "why it's neutral", "location": "text description"}
  ],
  "unsuitableItems": [
    {"name": "item name", "rating": 1, "reason": "why it's unsuitable", "location": "text description"}
  ],
  "recommendations": [
    {"name": "item name", "rating": 5, "reason": "why recommended"}
  ],
  "menuSections": [
    {"section": "Appetizers", "compatibility": 4, "description": "Most options are suitable"}
  ]
}`;

    // Call Claude API with vision
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
    });

    // Parse the response
    const responseText = message.content[0].text;

    // Try to extract JSON from the response
    let analysis;
    try {
      // Look for JSON in the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        // If no JSON found, create a structured response from the text
        analysis = {
          suitableItems: [],
          unsuitableItems: [],
          recommendations: [],
          rawResponse: responseText
        };
      }
    } catch (parseError) {
      // If parsing fails, return the raw response
      analysis = {
        suitableItems: [],
        unsuitableItems: [],
        recommendations: [],
        rawResponse: responseText
      };
    }

    res.json({
      success: true,
      analysis: analysis,
      originalImage: `data:${mediaType};base64,${base64Image}`
    });

  } catch (error) {
    console.error('Error analyzing menu:', error);
    res.status(500).json({
      error: 'Failed to analyze menu',
      message: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Serve React app for all other routes in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
