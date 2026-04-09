# Deploy to Render.com

## Step-by-Step Deployment Instructions

### 1. **Create a Render.com Account**
   - Go to https://render.com
   - Sign up with GitHub account

### 2. **Push Your Code to GitHub**
   ```bash
   git add .
   git commit -m "Add render deployment config"
   git push origin main
   ```

### 3. **Create a New Static Site on Render**
   - Go to https://dashboard.render.com
   - Click "New +" → "Static Site"
   - Connect your GitHub account
   - Select your repository: `enqai-south-vision-main`
   - Click "Connect"

### 4. **Configure Build Settings**
   - **Name**: `enviq-ai` (or your preferred name)
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
   - Leave other settings as default

### 5. **Deploy**
   - Click "Create Static Site"
   - Render will automatically build and deploy
   - Your app will be live at: `https://enviq-ai.onrender.com` (or similar)

### 6. **Custom Domain (Optional)**
   - In Render dashboard → Settings
   - Add your custom domain

---

## Environment Variables (if needed)

If your app needs environment variables:

1. In Render dashboard → Environment
2. Add your `.env` variables:
   ```
   VITE_SUPABASE_URL=your_url
   VITE_SUPABASE_PUBLISHABLE_KEY=your_key
   ```

---

## Deployment Details

- **Build Time**: ~1-2 minutes
- **Deployment**: Automatic on each push to main branch
- **Preview URLs**: Generated automatically for pull requests
- **Live URL**: Your static site URL

---

## Troubleshooting

**Build fails?**
- Check build logs in Render dashboard
- Ensure `npm run build` works locally

**Port error?**
- Vite production builds are static files
- No port configuration needed

**Environment variables not working?**
- Rebuild after adding variables
- Ensure variable names match in code

---

## Verify Deployment

Once deployed:
1. Visit your Render URL
2. Should see the ENVIQ AI dashboard
3. Test all tabs and features
4. Check browser console for errors (F12)

---

## Redeploy

To redeploy after code changes:

**Option 1: Automatic (Recommended)**
```bash
git add .
git commit -m "description"
git push origin main
```
Render auto-deploys on push

**Option 2: Manual Redeploy**
- Go to Render dashboard
- Click your site
- Click "Manual Deploy" → "Clear build cache & deploy"
