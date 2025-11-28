# Deploy Flask Backend to Render

This guide walks you through deploying your Cyber Attack Detection API to Render.

## Prerequisites

1. A GitHub account
2. A Render account (sign up at https://render.com)
3. Your code pushed to a GitHub repository

## Step 1: Prepare Your Repository

Make sure your backend folder contains:
- ✅ `app.py` - Your Flask application
- ✅ `config.py` - Configuration (updated for Render)
- ✅ `requirements.txt` - Python dependencies (includes gunicorn)
- ✅ `render.yaml` - Render configuration (optional but recommended)

## Step 2: Push to GitHub

```bash
# If not already initialized
git init
git add .
git commit -m "Prepare for Render deployment"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

## Step 3: Deploy on Render

### Option A: Using render.yaml (Recommended)

1. Go to https://dashboard.render.com
2. Click "New +" → "Blueprint"
3. Connect your GitHub repository
4. Render will automatically detect `render.yaml`
5. Click "Apply" to deploy

### Option B: Manual Setup

1. Go to https://dashboard.render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure the service:

   **Basic Settings:**
   - Name: `cyber-attack-detection-api` (or your choice)
   - Region: Choose closest to your users
   - Branch: `main`
   - Root Directory: `backend`
   - Runtime: `Python 3`

   **Build & Deploy:**
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `gunicorn app:app`

   **Environment:**
   - Python Version: `3.11.0` (or your preferred version)

5. Click "Create Web Service"

## Step 4: Configure Environment Variables (Optional)

In Render Dashboard → Your Service → Environment:

```
DEBUG=False
PORT=10000  # Render sets this automatically
```

## Step 5: Upload Model Files

⚠️ **IMPORTANT**: Your model files are too large for Git (they're in .gitignore).

You have two options:

### Option A: Use Render Disk (Persistent Storage)

1. In Render Dashboard → Your Service → "Disks"
2. Add a disk mounted at `/opt/render/project/src/models`
3. Upload your model files via SFTP or use a setup script

### Option B: Use Cloud Storage (Recommended for large models)

Store models in AWS S3, Google Cloud Storage, or similar:

```python
# Add to app.py startup
import boto3
import os

def download_models_from_s3():
    s3 = boto3.client('s3')
    bucket = 'your-bucket-name'
    
    models = [
        'src/models/deep learning/best_dl_model_wide_and_deep.keras',
        'scaler-features/dl_scaler.pkl',
        # ... other files
    ]
    
    for model_path in models:
        local_path = f'../{model_path}'
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        s3.download_file(bucket, model_path, local_path)

# Call before loading models
if os.environ.get('RENDER'):
    download_models_from_s3()
```

### Option C: Smaller Model or Git LFS

If your models are <500MB, use Git LFS:

```bash
git lfs install
git lfs track "*.keras"
git lfs track "*.pkl"
git add .gitattributes
git add src/models/
git commit -m "Add models with Git LFS"
git push
```

## Step 6: Verify Deployment

Once deployed, Render provides a URL like:
`https://cyber-attack-detection-api.onrender.com`

Test your endpoints:

```bash
# Health check
curl https://your-app.onrender.com/health

# Model info
curl https://your-app.onrender.com/model-info

# Make prediction
curl -X POST https://your-app.onrender.com/predict \
  -H "Content-Type: application/json" \
  -d '{"features": {...}}'
```

## Step 7: Update Frontend

Update your frontend to use the Render URL:

```javascript
// In js/app.js
const API_URL = 'https://your-app.onrender.com';
```

## Troubleshooting

### Build Fails

- Check build logs in Render Dashboard
- Verify `requirements.txt` has all dependencies
- Ensure Python version compatibility

### App Crashes on Start

- Check application logs
- Verify model files are accessible
- Check environment variables

### Slow Cold Starts

- Render free tier spins down after inactivity
- Consider upgrading to paid tier for always-on service
- Or use a cron job to ping your service every 10 minutes

### Model Files Not Found

- Verify file paths in `config.py`
- Check that models are uploaded/downloaded correctly
- Use absolute paths or proper relative paths

## Cost Optimization

**Free Tier:**
- 750 hours/month free
- Spins down after 15 minutes of inactivity
- Good for testing and demos

**Paid Tier ($7+/month):**
- Always-on service
- Better performance
- More memory for large models

## Security Best Practices

1. Set `DEBUG=False` in production
2. Restrict CORS origins in `config.py`:
   ```python
   CORS_ORIGINS = ['https://your-frontend-domain.com']
   ```
3. Add rate limiting (consider using Flask-Limiter)
4. Use environment variables for sensitive data
5. Enable HTTPS (Render provides this automatically)

## Monitoring

- View logs: Render Dashboard → Your Service → Logs
- Set up alerts: Render Dashboard → Your Service → Notifications
- Monitor performance: Check response times and error rates

## Updating Your App

```bash
# Make changes locally
git add .
git commit -m "Update API"
git push

# Render auto-deploys on push to main branch
```

## Need Help?

- Render Docs: https://render.com/docs
- Render Community: https://community.render.com
- Check logs for error messages
