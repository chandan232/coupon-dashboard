# GitHub & Vercel Deployment Guide

Your Coupon Dashboard application is ready for deployment! Follow these steps to push to GitHub and deploy on Vercel.

## Step 1: Create GitHub Repository

### Option A: Using GitHub Web Interface (Recommended)
1. Go to https://github.com/new
2. Create a new repository named `coupon-dashboard`
3. Set it as **Public** or **Private** (your choice)
4. **Do NOT** initialize with README, .gitignore, or license (we already have these)
5. Click "Create repository"
6. Copy the repository URL (HTTPS or SSH format)

### Option B: Using GitHub CLI (if installed)
```bash
gh repo create coupon-dashboard --public --source=. --remote=origin --push
```

## Step 2: Add GitHub Remote and Push Code

After creating the repository, you'll see instructions. Follow this pattern:

```bash
# Navigate to your project directory
cd /Users/chandanprajapati/Downloads/coupon-dashboard

# Add the remote (replace USERNAME/coupon-dashboard with your actual repo URL)
git remote add origin https://github.com/USERNAME/coupon-dashboard.git

# Rename branch if needed (GitHub uses 'main' by default)
git branch -M main

# Push your code to GitHub
git push -u origin main
```

**Replace `USERNAME` with your GitHub username in the URL above.**

## Step 3: Deploy to Vercel

### Option A: Using Vercel Web Interface (Easiest)

1. Go to https://vercel.com and sign in (create account if needed)
2. Click "Add New" → "Project"
3. Click "Import Git Repository"
4. Paste your GitHub repository URL and click "Continue"
5. Vercel will detect Next.js automatically
6. Under "Environment Variables", add:
   ```
   DATABASE_URL = postgres://postgres:Badho_1301@db.badho.in:5432/badho-app
   DATABASE_SSL = true
   ```
7. Click "Deploy"
8. Wait for build to complete (usually 2-3 minutes)
9. Your app will be live at `https://coupon-dashboard-xxxxx.vercel.app`

### Option B: Using Vercel CLI (if installed)

```bash
# Install Vercel CLI globally
npm install -g vercel

# Deploy from project directory
cd /Users/chandanprajapati/Downloads/coupon-dashboard
vercel --prod

# Follow the prompts to link to your Vercel account and project
```

## Step 4: Configure Production Environment Variables

After initial deployment:

1. Go to your Vercel project dashboard
2. Click "Settings" → "Environment Variables"
3. Add the variables:
   - **DATABASE_URL**: `postgres://postgres:Badho_1301@db.badho.in:5432/badho-app`
   - **DATABASE_SSL**: `true`
4. Click "Save"
5. Trigger a redeployment to apply changes

## Monitoring & Testing

After deployment:

1. Visit your Vercel deployment URL
2. Check the "Coupon" section to verify data loads correctly
3. Test the Voucher features (create, filter, toggle)
4. Monitor logs via Vercel dashboard if issues occur

## Git Workflow for Future Updates

After the initial deployment, use this workflow for updates:

```bash
# Make changes to your code
git add .
git commit -m "Your commit message"

# Push to GitHub
git push origin main

# Vercel automatically redeploys when you push to main!
```

## Troubleshooting

### "Build fails with database connection error"
- Verify DATABASE_URL in Vercel environment variables
- Check that your database is accessible from Vercel's servers
- Ensure DATABASE_SSL is set to `true` if required

### "No data showing on the dashboard"
- Check that test records exist in your database
- Verify the coupons and vouchers have `isTest = FALSE`

### "Deploy button not appearing"
- Make sure your GitHub repository is public or connected properly to Vercel
- Try re-importing the repository in Vercel

## Database Credentials

Your database is configured as:
- **Host**: db.badho.in
- **Port**: 5432
- **Database**: badho-app
- **User**: postgres
- **Connection String**: Already in `.env.local`

⚠️ **Important**: These credentials are in `.env.local` which is added to `.gitignore`. GitHub only has your code, not your credentials.

## Support

If you encounter issues:
1. Check Vercel deployment logs (Dashboard → Deployments → Click on failed deployment)
2. Verify DATABASE_URL is correct
3. Ensure PostgreSQL database is running and accessible
4. Check that the coupon-dashboard code builds locally with `npm run build`
