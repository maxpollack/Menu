# Diet Menu Analyzer

An AI-powered mobile-optimized web application that analyzes restaurant menu photos based on your dietary preferences. Upload a menu, specify your dietary needs, and get instant recommendations with items highlighted in green (good for you) and red (avoid).

## Features

- **Mobile-First Design**: Optimized for smartphones and tablets
- **AI Vision Analysis**: Powered by Claude's vision capabilities
- **Dietary Preferences**: Support for vegetarian, vegan, gluten-free, keto, and more
- **Smart Recommendations**: Get top 3 personalized menu suggestions
- **Color-Coded Results**: Green for suitable items, red for items to avoid
- **Camera Integration**: Take photos directly from your phone
- **Instant Analysis**: Fast menu processing and recommendations

## Tech Stack

- **Frontend**: React.js with responsive CSS
- **Backend**: Node.js + Express
- **AI**: Anthropic Claude 3.5 Sonnet (Vision API)
- **Deployment**: Heroku-ready

## Prerequisites

- Node.js 18.x or higher
- npm 9.x or higher
- Anthropic API key ([Get one here](https://console.anthropic.com/))
- Heroku account (for deployment)

## Local Development Setup

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd Menu
```

### 2. Install dependencies

```bash
# Install root dependencies
npm install

# Install client dependencies
cd client
npm install
cd ..
```

### 3. Set up environment variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` and add your Anthropic API key:

```
ANTHROPIC_API_KEY=your_actual_api_key_here
NODE_ENV=development
PORT=5000
```

### 4. Run the application

**Option 1: Run both frontend and backend separately**

Terminal 1 (Backend):
```bash
npm run server
```

Terminal 2 (Frontend):
```bash
npm run client
```

The app will be available at `http://localhost:3000`

**Option 2: Build and run in production mode**

```bash
npm run build
npm start
```

The app will be available at `http://localhost:5000`

## Heroku Deployment

### Quick Deploy

1. **Install Heroku CLI**
   ```bash
   # macOS
   brew tap heroku/brew && brew install heroku

   # Or download from https://devcenter.heroku.com/articles/heroku-cli
   ```

2. **Login to Heroku**
   ```bash
   heroku login
   ```

3. **Create a new Heroku app**
   ```bash
   heroku create your-app-name
   ```

4. **Set environment variables**
   ```bash
   heroku config:set ANTHROPIC_API_KEY=your_actual_api_key_here
   heroku config:set NODE_ENV=production
   ```

5. **Deploy**
   ```bash
   git push heroku main
   ```

   Or if you're on a different branch:
   ```bash
   git push heroku claude/diet-menu-app-011CUUE4L29S26CH8QDxua33:main
   ```

6. **Open your app**
   ```bash
   heroku open
   ```

### Heroku Configuration Files

The repository includes:

- **Procfile**: Tells Heroku how to run the app
- **package.json**: Contains `heroku-postbuild` script for automatic build
- **engines**: Specifies Node.js and npm versions

### Troubleshooting Heroku Deployment

**Check logs:**
```bash
heroku logs --tail
```

**Restart the app:**
```bash
heroku restart
```

**Verify environment variables:**
```bash
heroku config
```

## How to Use

1. **Enter Dietary Preferences**
   - Type or select from common preferences (Vegetarian, Vegan, Gluten-free, etc.)
   - Be specific (e.g., "Vegetarian, no dairy, low sodium")

2. **Upload Menu Photo**
   - Click "Choose File" and select a menu photo
   - Or use your phone's camera to take a picture

3. **Analyze**
   - Click "Analyze Menu" button
   - Wait for AI processing (usually 5-10 seconds)

4. **Review Results**
   - **Top Recommendations**: Best items for your diet
   - **Good Choices**: Items highlighted in green
   - **Items to Avoid**: Items highlighted in red

5. **Try Another Menu**
   - Click "Analyze Another Menu" to start over

## API Endpoints

### POST /api/analyze-menu

Analyzes a menu image based on dietary preferences.

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body:
  - `menu`: Image file (JPEG, PNG, etc.)
  - `dietaryPreferences`: String describing dietary needs

**Response:**
```json
{
  "success": true,
  "analysis": {
    "suitableItems": [...],
    "unsuitableItems": [...],
    "recommendations": [...]
  },
  "originalImage": "data:image/jpeg;base64,..."
}
```

### GET /api/health

Health check endpoint.

## Project Structure

```
Menu/
├── client/                 # React frontend
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── App.js         # Main component
│   │   ├── App.css        # Styles
│   │   ├── index.js       # Entry point
│   │   └── index.css
│   └── package.json
├── server/
│   └── index.js           # Express server + API
├── .env.example           # Environment variables template
├── .gitignore
├── package.json           # Root package.json
├── Procfile              # Heroku configuration
└── README.md
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key | Yes |
| `NODE_ENV` | Environment (development/production) | No |
| `PORT` | Server port (default: 5000) | No |

## Security Notes

- Never commit your `.env` file
- Keep your Anthropic API key secure
- Use environment variables for all sensitive data
- The app includes a 10MB file size limit for uploads

## Browser Support

- Chrome (recommended)
- Safari
- Firefox
- Edge
- Mobile browsers (iOS Safari, Chrome Mobile)

## License

MIT

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review Heroku logs: `heroku logs --tail`
3. Ensure your Anthropic API key is valid

## Credits

Powered by [Anthropic Claude](https://www.anthropic.com/) Vision AI
