# WordPress Integration Guide - Sovereign Mirror Simulation

## Overview

This guide explains how to embed the Sovereign Mirror 3D simulation in a WordPress page. Since the simulation runs entirely in the browser, no server access is required.

## Architecture

```
┌─────────────────────────────────────────┐
│         WordPress Page                  │
│  ┌───────────────────────────────────┐  │
│  │ iframe (your-simulation.vercel)   │  │
│  │                                   │  │
│  │   Browser-based Simulation        │  │
│  │   - 15s cycle through profiles    │  │
│  │   - 3D particle visualization     │  │
│  │   - No server required            │  │
│  │                                   │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
        ↑ iframe
        |
┌─────────────────────────────────────────┐
│   Vercel (Free Hosting)                 │
│   - Build: npm run build                │
│   - Deploy: vercel --prod               │
│   - Custom domain optional              │
└─────────────────────────────────────────┘
```

---

## Step 1: Build the Simulation App

### 1.1 Add WordPress-Friendly Title

Update `index.html` with a clear title for the embedded version:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Sovereign Mirror Simulation</title>
    <link rel="icon" type="image/svg+xml" href="/favicon.ico" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### 1.2 Configure Vite for Subfolder Deployment (Optional)

If hosting in a subfolder on Vercel, add to `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/simulation/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})
```

### 1.3 Build the App

```bash
npm run build
```

This creates the `dist/` folder with production-ready files.

---

## Step 2: Deploy to Vercel (Free)

### 2.1 Install Vercel CLI

```bash
npm install -g vercel
```

### 2.2 Deploy

```bash
cd dist
vercel --prod
```

### 2.3 Get Your Deployment URL

After deployment, you'll receive a URL like:
```
https://your-project-xxxxx.vercel.app
```

This URL will be used in the WordPress iframe.

### 2.4 (Optional) Custom Domain

In Vercel dashboard → Domains → Add your domain (e.g., `simulation.yourdomain.com`)

---

## Step 3: Embed in WordPress

### 3.1 Simple iframe Embed (HTML Block)

In your WordPress page, add an HTML block:

```html
<iframe 
  src="https://your-project-xxxxx.vercel.app"
  width="100%" 
  height="900px"
  frameborder="0"
  style="max-width: 1400px; margin: 0 auto; display: block;"
  title="Sovereign Mirror Governance Simulation"
></iframe>
```

### 3.2 Using a Shortcode (Custom HTML)

Add to your WordPress theme's `functions.php`:

```php
// Add to functions.php
function sovereign_mirror_shortcode($atts) {
    $atts = shortcode_atts(array(
        'height' => '900px',
        'width' => '100%',
        'url' => 'https://your-project-xxxxx.vercel.app'
    ), $atts, 'sovereign_mirror');
    
    return '<iframe 
        src="' . esc_url($atts['url']) . '"
        width="' . esc_attr($atts['width']) . '"
        height="' . esc_attr($atts['height']) . '"
        frameborder="0"
        style="max-width: 1400px; margin: 0 auto; display: block;"
        title="Sovereign Mirror Simulation"
        loading="lazy"
    ></iframe>';
}
add_shortcode('sovereign_mirror', 'sovereign_mirror_shortcode');
```

Then use in WordPress editor:
```
[sovereign_mirror height="800px"]
```

### 3.3 Gutenberg Block (Advanced)

Create a custom Gutenberg block:

```javascript
// In your theme's JS file
wp.blocks.registerBlockType('your-theme/sovereign-mirror', {
    title: 'Sovereign Mirror Simulation',
    icon: 'admin-site',
    category: 'embed',
    
    edit: function() {
        return wp.element.createElement('iframe', {
            src: 'https://your-project-xxxxx.vercel.app',
            width: '100%',
            height: '900px',
            frameBorder: '0',
            style: { maxWidth: '1400px', margin: '0 auto', display: 'block' }
        });
    }
});
```

---

## Step 4: Adjust for WordPress Theme

### 4.1 Responsive Styling

The iframe should be responsive. Add this CSS to your WordPress theme:

```css
/* Add to your theme's style.css */
.sovereign-mirror-iframe {
    width: 100%;
    max-width: 1400px;
    height: 900px;
    margin: 0 auto;
    display: block;
    border: none;
}

@media (max-width: 768px) {
    .sovereign-mirror-iframe {
        height: 600px;
    }
}

@media (max-width: 480px) {
    .sovereign-mirror-iframe {
        height: 400px;
    }
}
```

### 4.2 Color Scheme Compatibility

The simulation uses a dark theme (black background, cyan/green accents). If your WordPress theme has a light background, the iframe will still display correctly.

### 4.3 Scrollbar Prevention

The simulation's 3D canvas handles its own scroll behavior. The iframe should not create additional scrollbars:

```css
.sovereign-mirror-iframe {
    overflow: hidden;
}
```

---

## Configuration Options

### Custom Cycle Interval

To change the simulation speed (default 15s), you can modify the stateFileLoader:

```typescript
// In src/mirror/core/stateFileLoader.ts
const simulation = new BrowserSimulationEngine({
    cycleIntervalMs: 10000, // 10 seconds instead of 15
    onStateChange: (state) => { /* ... */ }
});
```

### Profile Selection

The simulation cycles through 8 profiles automatically. To jump to a specific profile:

```typescript
// In your component
STATE_LOADER.jumpToMilestone('profile_fission_001');
```

Available profiles:
- `profile_standard_001` - Standard operational (ACTIVE)
- `profile_standard_002` - Standard sync (SYNCING)
- `profile_fission_001` - High noise fission (ACTIVE)
- `profile_fission_002` - Peak fission (SYNCING)
- `profile_standby_001` - Zero alpha standby (STANDBY)
- `profile_standby_002` - Deep standby (STANDBY)
- `profile_standard_003` - Peak operational (ACTIVE)
- `profile_fission_003` - Sustained fission (ACTIVE)

---

## Troubleshooting

### Problem: Iframe shows blank page

**Solution**: Check that the Vercel deployment URL is correct and the site is not private. In Vercel dashboard, ensure the deployment is set to "Production" and is not password-protected.

### Problem: Simulation not cycling

**Solution**: The simulation auto-starts on page load. Check browser console for errors (F12). Ensure BrowserSimulation.ts is being imported correctly.

### Problem: WordPress strips iframe

**Solution**: WordPress may strip iframe tags in the editor. Use the "HTML" block instead of the visual editor, or add this to your theme's `functions.php`:

```php
// Allow iframe in WordPress
function allow_iframe_tags($content) {
    $content = str_replace('<iframe', '<iframe sandbox="allow-scripts allow-same-origin"', $content);
    return $content;
}
add_filter('the_content', 'allow_iframe_tags');
```

### Problem: CORS errors

**Solution**: Vercel handles CORS automatically. If using a custom domain, ensure you have configured the proper headers in Vercel's `vercel.json`:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "ALLOWALL" }
      ]
    }
  ]
}
```

---

## Performance Considerations

### Lazy Loading

Add `loading="lazy"` to the iframe to improve page load time:

```html
<iframe 
  src="..." 
  loading="lazy"
></iframe>
```

### Mobile Optimization

The simulation adjusts particle count based on profile (800-5000). On mobile, consider reducing the max particles to 2000 for better performance.

To adjust, modify `src/components/three/ResonanceTrajectory.tsx:11`:

```typescript
const INSTANCE_COUNT = 2000; // Reduced from 2000 for mobile
```

---

## Complete Example

### WordPress Page Template

Create a custom page template in your WordPress theme (`page-simulation.php`):

```php
<?php
/**
 * Template Name: Simulation Page
 */

get_header();
?>

<main class="simulation-container" style="background: #000; min-height: 100vh;">
    <div style="max-width: 1400px; margin: 0 auto;">
        <h1 style="color: #00ffff; text-align: center; padding: 20px 0;">
            Sovereign Mirror Simulation
        </h1>
        
        <iframe 
            src="https://your-project-xxxxx.vercel.app"
            class="sovereign-mirror-iframe"
            title="Sovereign Mirror Governance Simulation"
            loading="lazy"
        ></iframe>
        
        <div style="color: #aaa; text-align: center; padding: 20px; font-size: 14px;">
            <p>Simulation cycles through ACTIVE, SYNCING, and STANDBY states every 15 seconds.</p>
            <p>Watch the particles transform as the governance state changes.</p>
        </div>
    </div>
</main>

<style>
.sovereign-mirror-iframe {
    width: 100%;
    height: 900px;
    border: none;
    display: block;
    margin: 0 auto;
}
</style>

<?php get_footer(); ?>
```

---

## Next Steps

1. Build the app: `npm run build`
2. Deploy to Vercel: `cd dist && vercel --prod`
3. Copy the deployment URL
4. Paste into WordPress HTML block
5. Preview and adjust dimensions as needed

The simulation will run automatically, cycling through 8 different profiles every 15 seconds, with no server-side code required.
---

## Session Log - June 2026

### Current Vercel URL
The WordPress iframe is hardcoded to:
```html
<iframe src="https://dist-alpha-topaz-27.vercel.app" width="100%" height="1200px" frameborder="0" title="Sovereign Mirror Governance Simulation"></iframe>
```

### Deploy status
- Vercel CLI installed (`Vercel CLI 54.4.1`) but NOT authenticated
- Token needed to push: `vercel login` or `--token <VERCEL_TOKEN>`
- Latest bundle in `dist/` is `index-BAiprzg4.js` / `index-CWG6l_sD.css` (with mobile overflow fixes, 5-layer rings, P-Gate feedback)

### Recommended redeploy procedure
1. `cd dist`
2. `vercel --prod --yes` (or provide token)
3. Update the iframe `src` to whatever URL Vercel returns (or use the existing `dist-alpha-topaz-27.vercel.app` if it's the same project)

### Alternative: point WordPress iframe directly at Hetzner
The Hetzner production deployment is at `http://178.156.135.222/`. WordPress iframes prefer HTTPS, but if the WP site is HTTP-only, you can use:
```html
<iframe src="http://178.156.135.222/" width="100%" height="1200px" frameborder="0"></iframe>
```

This avoids the Vercel dependency entirely. The bundle is the same one the Vercel deployment would serve.

### WordPress plugin update (kylosarc-wp-api.php)
The WordPress plugin at `~/experiment/map/kylosarc-wp-api.php` exposes the API as WP REST endpoints. With the new feedback endpoints in `server/index.js` (`/api/feedback/*`), the plugin should be updated to proxy these as well. **Not done yet** - pending Vercel redeploy.
