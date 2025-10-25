const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');
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

    // Get image dimensions first
    const tempImage = await loadImage(req.file.buffer);
    const imageWidth = tempImage.width;
    const imageHeight = tempImage.height;

    // Create prompt for Claude
    const prompt = `Analyze this restaurant menu image (${imageWidth}x${imageHeight} pixels) based on the following dietary preferences: ${dietaryPreferences}

Please provide:
1. A brief text summary (2-3 sentences) of the overall menu compatibility
2. For each menu item you can identify, rate how compatible it is (1-5 stars):
   - 5 stars: Perfect match, highly recommended
   - 4 stars: Good match, recommended with minor considerations
   - 3 stars: Moderate match, acceptable but not ideal
   - 2 stars: Poor match, conflicts with some preferences
   - 1 star: Very poor match, should avoid

3. For each item, estimate a bounding box where the item name appears on the menu:
   - Provide coordinates as percentages of image dimensions (0-100)
   - Format: {"x": left edge %, "y": top edge %, "width": box width %, "height": box height %}
   - Be as accurate as possible to highlight the item text
   - Example: {"x": 10, "y": 25, "width": 30, "height": 3} means item is 10% from left, 25% from top, 30% wide, 3% tall

4. Classify items as:
   - "suitable" (4-5 stars)
   - "neutral" (3 stars)
   - "unsuitable" (1-2 stars)

Format your response as JSON with this structure:
{
  "summary": "Brief 2-3 sentence analysis of the menu compatibility",
  "overallCompatibility": 3.5,
  "suitableItems": [
    {"name": "item name", "rating": 5, "reason": "why it's suitable", "location": "text description", "bbox": {"x": 10, "y": 25, "width": 30, "height": 3}}
  ],
  "neutralItems": [
    {"name": "item name", "rating": 3, "reason": "why it's neutral", "location": "text description", "bbox": {"x": 10, "y": 45, "width": 30, "height": 3}}
  ],
  "unsuitableItems": [
    {"name": "item name", "rating": 1, "reason": "why it's unsuitable", "location": "text description", "bbox": {"x": 10, "y": 65, "width": 30, "height": 3}}
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

    // Create highlighted image
    const canvas = createCanvas(imageWidth, imageHeight);
    const ctx = canvas.getContext('2d');

    // Draw original image
    ctx.drawImage(tempImage, 0, 0);

    // Draw highlights for each item
    const drawHighlights = (items, color, alpha = 0.3) => {
      items.forEach(item => {
        if (item.bbox) {
          const x = (item.bbox.x / 100) * imageWidth;
          const y = (item.bbox.y / 100) * imageHeight;
          const width = (item.bbox.width / 100) * imageWidth;
          const height = (item.bbox.height / 100) * imageHeight;

          // Draw semi-transparent fill
          ctx.fillStyle = color.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
          ctx.fillRect(x, y, width, height);

          // Draw solid border
          ctx.strokeStyle = color;
          ctx.lineWidth = 3;
          ctx.strokeRect(x, y, width, height);
        }
      });
    };

    // Draw highlights with colors
    drawHighlights(analysis.suitableItems || [], 'rgb(16, 185, 129)', 0.25);    // Green
    drawHighlights(analysis.neutralItems || [], 'rgb(245, 158, 11)', 0.25);     // Yellow
    drawHighlights(analysis.unsuitableItems || [], 'rgb(239, 68, 68)', 0.25);   // Red

    // Convert canvas to base64
    const highlightedImage = canvas.toDataURL('image/jpeg', 0.92);

    res.json({
      success: true,
      analysis: analysis,
      originalImage: `data:${mediaType};base64,${base64Image}`,
      highlightedImage: highlightedImage
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
