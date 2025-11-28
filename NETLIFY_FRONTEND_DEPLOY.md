# Deploy Frontend to Netlify - Quick Guide

## Step 1: Get Your Railway Backend URL

1. Go to your Railway dashboard
2. Click on your service
3. Go to Settings → Networking
4. Copy your domain (e.g., `https://your-app.up.railway.app`)

## Step 2: Update Frontend API URL

Open `js/app.js` and find the API_URL line, change it to:

```javascript
const API_URL = 'https://your-app.up.railway.app';  // Replace with your Railway URL
```

## Step 3: Deploy to Netlify

### Method 1: Netlify Dashboard (EASIEST - No CLI)

1. **Go to**: https://app.netlify.com
2. **Sign up** with GitHub (no credit card needed!)
3. **Click "Add new site"** → "Import an existing project"
4. **Choose GitHub** and authorize
5. **Select your repository**: `ANASSBOUGRAINE212/Network-Intrusion-Detection-and-Classification-System`
6. **Configure**:
   - Branch: `main`
   - Build command: (leave empty)
   - Publish directory: `.` (root)
7. **Click "Deploy site"**
8. **Done!** Your site is live at: `https://random-name.netlify.app`

### Method 2: Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod

# Follow prompts:
# - Create & configure a new site: Yes
# - Publish directory: . (just press Enter)
```

## Step 4: Update CORS on Backend

Once you have your Netlify URL, update backend CORS:

In `backend/config.py`, change:
```python
CORS_ORIGINS = [
    'https://your-site.netlify.app',  # Your Netlify URL
    'http://localhost:*'  # For local development
]
```

Push changes:
```bash
git add backend/config.py
git commit -m "Update CORS for Netlify"
git push
```

Railway will auto-redeploy!

## Step 5: Test Everything

1. Visit your Netlify site: `https://your-site.netlify.app`
2. Try the prediction feature
3. Check if it connects to your Railway backend

## Summary:

```
Frontend (Netlify):  https://your-site.netlify.app
Backend (Railway):   https://your-app.up.railway.app
```

Both are FREE and no credit card needed! 🎉

## Troubleshooting:

### CORS Error?
Update `backend/config.py` with your Netlify URL and push to GitHub

### API Not Responding?
- Check Railway logs
- Verify Railway URL is correct in `js/app.js`
- Make sure Railway deployment succeeded

### Netlify Build Failed?
- Netlify should just serve static files
- No build needed for HTML/CSS/JS

## Auto-Deploy:

Both platforms auto-deploy when you push to GitHub:
- Push to `main` → Railway redeploys backend
- Push to `main` → Netlify redeploys frontend

Perfect for continuous deployment! 🚀
