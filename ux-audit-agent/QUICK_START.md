# Quick Start Guide - Run Locally in Cursor

## Step 1: Navigate to Project Directory

Open terminal in Cursor and navigate to the project:

```bash
cd ux-audit-agent
```

## Step 2: Install Dependencies (if not already done)

```bash
npm install
```

## Step 3: Set Up Environment Variables

Create a `.env.local` file in the `ux-audit-agent` folder:

1. **Get Anthropic API Key:**
   - Go to https://console.anthropic.com/
   - Sign up or log in
   - Create an API key
   - Copy the key (starts with `sk-ant-...`)

2. **Create `.env.local` file:**
   - In Cursor, create a new file: `.env.local`
   - Add this line:
   ```
   ANTHROPIC_API_KEY=your_api_key_here
   ```
   - Replace `your_api_key_here` with your actual API key

## Step 4: Run Development Server

```bash
npm run dev
```

## Step 5: Open in Browser

The app will be available at:
```
http://localhost:3000
```

## Testing the Application

1. Open http://localhost:3000 in your browser
2. Enter a website URL (e.g., `example.com` or `https://example.com`)
3. Click "Audit Website"
4. Wait 20-40 seconds for the analysis
5. Review the findings!

## Troubleshooting

### Port Already in Use
If port 3000 is busy:
```bash
npm run dev -- -p 3001
```

### API Key Error
- Make sure `.env.local` exists in `ux-audit-agent` folder
- Check the API key is correct (no extra spaces)
- Restart the dev server after adding the key

### Puppeteer Issues
- Puppeteer downloads Chromium automatically on first run
- This may take a few minutes
- Ensure you have internet connection

### Build Errors
```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
npm run dev
```

## Available Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Next Steps

- Test with different websites
- Review the code in `app/` directory
- Check API route in `app/api/audit/route.ts`
- Customize the UI in `app/page.tsx`











