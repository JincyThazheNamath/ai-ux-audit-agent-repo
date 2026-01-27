# AI UX Audit Agent

An intelligent UX audit tool that automatically analyzes websites for accessibility, usability, design consistency, performance, and SEO issues using AI.

## Features

- 🤖 **AI-Powered Analysis**: Uses Claude AI to identify UX issues across multiple categories
- 🔍 **Comprehensive Audits**: Analyzes accessibility, usability, design, performance, and SEO
- 📊 **Prioritized Findings**: Issues categorized by severity (critical, high, medium, low)
- 💡 **Actionable Suggestions**: Each finding includes specific recommendations and code snippets
- 📸 **Visual Screenshots**: Captures website screenshots for context
- ⚡ **Fast Results**: Get comprehensive audits in seconds

## Tech Stack

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Modern styling
- **Puppeteer** - Web scraping and screenshot capture
- **Anthropic Claude API** - AI-powered analysis
- **Vercel** - Deployment platform

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Anthropic API key ([Get one here](https://console.anthropic.com/))

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd ux-audit-agent
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Add your Anthropic API key to `.env.local`:
```
ANTHROPIC_API_KEY=your_api_key_here
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. Enter a website URL in the input field
2. Click "Audit Website" or press Enter
3. Wait for the AI analysis (typically 10-30 seconds)
4. Review the findings organized by severity
5. Use the suggestions and code snippets to fix issues

## Project Structure

```
ux-audit-agent/
├── app/
│   ├── api/
│   │   └── audit/
│   │       └── route.ts      # API endpoint for website analysis
│   ├── page.tsx               # Main dashboard UI
│   ├── layout.tsx             # Root layout
│   └── globals.css            # Global styles
├── public/                     # Static assets
└── package.json               # Dependencies
```

## How It Works

1. **Web Crawling**: Uses Puppeteer to load and analyze the target website
2. **Data Extraction**: Collects HTML structure, images, links, forms, and styling information
3. **AI Analysis**: Sends structured data to Claude AI for intelligent UX analysis
4. **Report Generation**: Formats findings with severity levels, suggestions, and code examples
5. **Visual Display**: Presents results in an intuitive dashboard with screenshots

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Add your `ANTHROPIC_API_KEY` in Vercel's environment variables
4. Deploy!

The app will be live at `https://your-project.vercel.app`

## Limitations

- Single-page analysis (does not crawl entire sites)
- Requires publicly accessible URLs
- AI analysis may vary between runs
- Some findings may require manual verification

## Future Enhancements

- Multi-page crawling
- Historical tracking and comparisons
- Export reports as PDF
- Integration with design tools (Figma)
- Custom audit rule configuration
- Performance metrics (Core Web Vitals)

## License

MIT

## Built For

Lunim Studio - Digital Services Case Study
