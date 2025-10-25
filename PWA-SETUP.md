# Progressive Web App (PWA) Setup

This app is now configured as a Progressive Web App, allowing it to be installed on iOS devices and work like a native app.

## Features

- **Add to Home Screen**: Install the app on your iOS device for quick access
- **Full-Screen Mode**: Runs without browser UI for a native app feel
- **Offline Support**: Basic functionality works even without internet (via Service Worker)
- **App Icons**: Custom icons that appear on your home screen
- **Fast Loading**: Cached resources for improved performance

## Generating App Icons

1. **Open the Icon Generator**:
   - Open `icon-generator.html` in your web browser
   - This file is located in the root of the project

2. **Download All Icons**:
   - Click "Download" for each icon size
   - Save them with the exact filenames shown (icon-16.png, icon-32.png, etc.)

3. **Place Icons**:
   - Move all downloaded icon files to `client/public/` folder
   - The files should be in the same directory as `manifest.json`

4. **Rebuild and Deploy**:
   ```bash
   npm run build
   git add client/public/icon-*.png
   git commit -m "Add PWA icons"
   git push
   ```

## Installing on iOS

Once deployed with icons:

1. **Open in Safari** on your iOS device (must use Safari, not Chrome or other browsers)
2. **Tap the Share button** (square with arrow pointing up)
3. **Scroll down and tap "Add to Home Screen"**
4. **Tap "Add"** in the top right corner

The app will now appear on your home screen with your custom icon!

## How It Works

### manifest.json
Defines app metadata, icons, colors, and display mode

### Service Worker
- Caches static resources for offline access
- Handles network requests intelligently
- Updates automatically when new versions are deployed

### iOS Meta Tags
- `apple-mobile-web-app-capable`: Enables full-screen mode
- `apple-mobile-web-app-status-bar-style`: Sets status bar appearance
- `apple-touch-icon`: Specifies home screen icon

## Customization

### Change App Name
Edit `client/public/manifest.json`:
```json
{
  "short_name": "Your Name",
  "name": "Your Full App Name"
}
```

### Change Theme Color
Edit both:
1. `client/public/manifest.json` - change `theme_color` and `background_color`
2. `client/public/index.html` - change `<meta name="theme-color">`

### Custom Icons
Replace the generated icons with your own designs:
- Keep the same filenames
- Use PNG format
- Match the sizes exactly (16x16, 32x32, etc.)

## Testing

### Test PWA Features
1. Run the app locally: `npm run dev`
2. Open in Chrome DevTools
3. Go to Application tab > Manifest
4. Check for errors and preview icons

### Test on iOS
1. Deploy to your Heroku instance
2. Open in Safari on iPhone/iPad
3. Add to Home Screen
4. Launch the app and verify it runs full-screen

## Troubleshooting

**Icons not showing**:
- Make sure icon files are in `client/public/`
- Check filenames match exactly
- Clear browser cache and try again

**Can't add to home screen**:
- Must use Safari on iOS (not Chrome)
- App must be served over HTTPS (Heroku provides this)

**Service Worker not working**:
- Check browser console for errors
- Service Workers only work over HTTPS
- Try clearing cache and reloading

## Files Added

- `client/public/manifest.json` - Web app manifest
- `client/public/service-worker.js` - Service worker for offline support
- `client/public/index.html` - Updated with PWA meta tags
- `icon-generator.html` - Tool to generate app icons
- `PWA-SETUP.md` - This file

## Next Steps

1. Generate and add icons using `icon-generator.html`
2. Test the app on your iOS device
3. Customize colors and names if desired
4. Deploy to Heroku and install on your home screen!
