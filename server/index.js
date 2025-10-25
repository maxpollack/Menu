const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const sharp = require('sharp');
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

    // Resize image if needed to stay under Claude API's 5MB limit
    // Target 4.8MB to have a safety margin (Claude limit is 5MB exactly)
    let imageBuffer = req.file.buffer;
    const MAX_SIZE = 4.8 * 1024 * 1024; // 4.8MB target (safety margin)
    const CLAUDE_LIMIT = 5 * 1024 * 1024; // 5MB hard limit
    let wasResized = false;

    console.log(`[Image Processing] Original image size: ${(imageBuffer.length / 1024 / 1024).toFixed(2)}MB (${imageBuffer.length} bytes)`);

    if (imageBuffer.length > MAX_SIZE) {
      console.log(`[Image Processing] Image exceeds 5MB limit, starting compression...`);
      wasResized = true;

      try {
        // Get image metadata
        const metadata = await sharp(req.file.buffer).metadata();
        console.log(`[Image Processing] Original dimensions: ${metadata.width}x${metadata.height}, format: ${metadata.format}`);

        // Start with aggressive compression - combine quality and dimension reduction
        let compressed = false;
        let finalQuality = 80;
        let finalScale = 1.0;

        // Try progressively smaller sizes until we get under 4.8MB
        const attempts = [
          { scale: 1.0, quality: 75 },
          { scale: 1.0, quality: 65 },
          { scale: 1.0, quality: 55 },
          { scale: 0.9, quality: 65 },
          { scale: 0.8, quality: 65 },
          { scale: 0.7, quality: 65 },
          { scale: 0.6, quality: 60 },
          { scale: 0.5, quality: 55 },
          { scale: 0.4, quality: 50 },
          { scale: 0.3, quality: 45 },
        ];

        for (const attempt of attempts) {
          const newWidth = Math.round(metadata.width * attempt.scale);
          const newHeight = Math.round(metadata.height * attempt.scale);

          console.log(`[Image Processing] Trying scale=${(attempt.scale * 100).toFixed(0)}%, quality=${attempt.quality}, dimensions=${newWidth}x${newHeight}`);

          const testBuffer = await sharp(req.file.buffer)
            .resize(newWidth, newHeight, {
              fit: 'inside',
              withoutEnlargement: true
            })
            .jpeg({ quality: attempt.quality, mozjpeg: true })
            .toBuffer();

          const sizeMB = testBuffer.length / 1024 / 1024;
          console.log(`[Image Processing] Result: ${sizeMB.toFixed(2)}MB`);

          if (testBuffer.length <= MAX_SIZE) {
            imageBuffer = testBuffer;
            finalQuality = attempt.quality;
            finalScale = attempt.scale;
            compressed = true;
            console.log(`[Image Processing] ✓ Successfully compressed to ${sizeMB.toFixed(2)}MB`);
            break;
          }
        }

        if (!compressed) {
          // Last resort: very aggressive compression
          console.log(`[Image Processing] Standard attempts failed, using maximum compression...`);
          imageBuffer = await sharp(req.file.buffer)
            .resize(Math.round(metadata.width * 0.25), Math.round(metadata.height * 0.25), {
              fit: 'inside'
            })
            .jpeg({ quality: 35, mozjpeg: true })
            .toBuffer();

          const finalSizeMB = imageBuffer.length / 1024 / 1024;
          console.log(`[Image Processing] Maximum compression result: ${finalSizeMB.toFixed(2)}MB (${imageBuffer.length} bytes)`);

          if (imageBuffer.length > MAX_SIZE) {
            throw new Error(`Unable to compress image below 4.8MB even with maximum compression. Final size: ${finalSizeMB.toFixed(2)}MB`);
          }
        }

        console.log(`[Image Processing] Final image: ${(imageBuffer.length / 1024 / 1024).toFixed(2)}MB (${imageBuffer.length} bytes)`);

        // CRITICAL: Final safety check before sending to Claude
        if (imageBuffer.length > CLAUDE_LIMIT) {
          throw new Error(`CRITICAL: Image is still ${(imageBuffer.length / 1024 / 1024).toFixed(2)}MB after compression, exceeds Claude's 5MB limit!`);
        }

      } catch (error) {
        console.error(`[Image Processing] Error during compression:`, error);
        throw error;
      }
    } else {
      console.log(`[Image Processing] Image is under 4.8MB, no resizing needed`);
    }

    // Convert image buffer to base64
    const base64Image = imageBuffer.toString('base64');
    const mediaType = wasResized ? 'image/jpeg' : req.file.mimetype;

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

    // CRITICAL: Log final image details before sending to Claude
    console.log(`[Claude API] Sending image to Claude API:`);
    console.log(`[Claude API]   - Size: ${(imageBuffer.length / 1024 / 1024).toFixed(2)}MB (${imageBuffer.length} bytes)`);
    console.log(`[Claude API]   - Media type: ${mediaType}`);
    console.log(`[Claude API]   - Was resized: ${wasResized}`);
    console.log(`[Claude API]   - Base64 length: ${base64Image.length} characters`);

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
