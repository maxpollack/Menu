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
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
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

    const { dietaryPreferences } = req.body;

    if (!dietaryPreferences) {
      return res.status(400).json({ error: 'No dietary preferences provided' });
    }

    // Convert image buffer to base64
    const base64Image = req.file.buffer.toString('base64');
    const mediaType = req.file.mimetype;

    // Create prompt for Claude
    const prompt = `Analyze this restaurant menu image based on the following dietary preferences: ${dietaryPreferences}

Please provide:
1. A list of menu items that MATCH the dietary preferences (things the person WOULD like to eat) - mark these as "suitable"
2. A list of menu items that DO NOT MATCH the preferences (things to avoid) - mark these as "unsuitable"
3. Your top 3 recommendations from the suitable items with brief explanations

Format your response as JSON with this structure:
{
  "suitableItems": [
    {"name": "item name", "reason": "why it's suitable", "location": "approximate location on menu"}
  ],
  "unsuitableItems": [
    {"name": "item name", "reason": "why it's unsuitable", "location": "approximate location on menu"}
  ],
  "recommendations": [
    {"name": "item name", "reason": "why recommended"}
  ]
}`;

    // Call Claude API with vision
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2048,
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
