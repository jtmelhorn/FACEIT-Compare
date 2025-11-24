# FACEIT Team Compare

A modern web application for comparing CS2 teams on FACEIT, featuring team statistics, roster analysis, map performance, and veto predictions.

## Features

- 🔍 **Team Search & Comparison** - Search and compare any two FACEIT CS2 teams
- 📊 **Detailed Statistics** - View comprehensive team and player statistics
- 🗺️ **Map Performance Analysis** - Analyze win rates across all CS2 maps
- 🎯 **Veto Prediction** - AI-powered pick/ban predictions for BO3 matches
- 📈 **Visual Dashboard** - Clean, modern UI with interactive charts and comparisons
- 🔑 **FACEIT API Integration** - Real-time data from official FACEIT API

## Demo

Visit the live demo: [https://yourusername.github.io/FACEIT-Compare/](https://yourusername.github.io/FACEIT-Compare/)

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- FACEIT API Key (get one from [FACEIT Developers](https://developers.faceit.com))

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/FACEIT-Compare.git
cd FACEIT-Compare
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

### Using the Application

1. **Get a FACEIT API Key:**
   - Visit [FACEIT Developers](https://developers.faceit.com)
   - Go to App Studio → Create App
   - Copy your API Key

2. **Search for Teams:**
   - Paste your API key in the header
   - Click "Verify" to validate
   - Search for teams by name or tag
   - Select two teams to compare

3. **Explore Data:**
   - **Team Comparison**: View detailed roster stats and recent matches
   - **Veto Prediction**: See predicted map picks and bans
   - **Map Stats**: Analyze performance on individual maps

## Deployment to GitHub Pages

### Option 1: Automatic Deployment (GitHub Actions)

This repository includes a GitHub Actions workflow that automatically deploys to GitHub Pages on every push to the `main` branch.

1. **Enable GitHub Pages:**
   - Go to your repository Settings → Pages
   - Under "Build and deployment", select "GitHub Actions" as the source

2. **Push your code:**
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

3. **Access your site:**
   - Your site will be available at: `https://yourusername.github.io/FACEIT-Compare/`

### Option 2: Manual Deployment

You can also deploy manually using the gh-pages package:

```bash
npm run build
npm run deploy
```

## Configuration

### Vite Config

The `vite.config.js` file is configured for GitHub Pages deployment. Update the `base` property if your repository name is different:

```javascript
export default defineConfig({
  base: '/your-repo-name/',
  // ...
})
```

### Repository Name

If you rename your repository, update:
1. `vite.config.js` - Update the `base` path
2. `README.md` - Update the demo link

## Built With

- [React](https://react.dev/) - UI Framework
- [Vite](https://vitejs.dev/) - Build Tool
- [FACEIT Data API](https://developers.faceit.com/) - Data Source

## Project Structure

```
FACEIT-Compare/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions workflow
├── src/
│   ├── main.jsx                # React entry point
│   └── FACEITTeamCompare.jsx   # Main component
├── index.html                  # HTML entry point
├── package.json                # Dependencies and scripts
├── vite.config.js              # Vite configuration
└── README.md                   # Documentation
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run deploy` - Manual deployment to GitHub Pages

## API Key Security

⚠️ **Important:** The API key is entered client-side and stored in browser memory only. It is never sent to any server except FACEIT's official API. However, for production use, consider implementing a backend proxy to keep your API key secure.

## Demo Mode

The application includes sample data for demonstration purposes. You can explore the interface without an API key using the pre-loaded sample teams.

## License

This project is open source and available under the MIT License.

## Acknowledgments

- Data provided by [FACEIT](https://www.faceit.com)
- Icons and design inspired by modern esports analytics platforms

## Support

For issues, questions, or contributions, please open an issue on GitHub.
