# FACEIT Team Compare

A modern web application for analyzing CS2 teams on FACEIT, featuring team statistics, roster analysis, and detailed map performance tracking.

## Features

- 🔍 **Team Search & Analysis** - Search and analyze FACEIT CS2 teams
- 📊 **Detailed Statistics** - View comprehensive team and player statistics
- 🗺️ **Map Performance Dashboard** - Analyze win rates and match history across all CS2 maps
- 📈 **Visual Dashboard** - Clean, modern UI with interactive charts and detailed stats
- 🔑 **FACEIT API Integration** - Real-time data from official FACEIT API
- 🎯 **Season Filtering** - Filter match data by FACEIT season (S52-S55)
- 🔗 **Match Room Links** - Direct links to FACEIT match rooms for detailed analysis

## Live Demo

Visit the live application: **[https://faceit-compare.netlify.app](https://faceit-compare.netlify.app)**

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
   - **Team Overview**: View detailed roster stats and team performance metrics
   - **Map Stats Dashboard**: Analyze per-map performance with match history
   - **Season Filter**: Filter matches by FACEIT season

## Future Enhancements

This project is actively being developed. Planned improvements include:

### Code Quality & Architecture
- 🏗️ **Refactor to React Best Practices**
  - Extract reusable components
  - Implement proper component composition
  - Add PropTypes or TypeScript for type safety
  - Separate business logic from presentation

- ⚡ **Performance Optimization**
  - Minimize redundant API calls
  - Implement proper caching strategies
  - Add request debouncing for searches
  - Optimize re-renders with React.memo and useMemo

- 🔧 **API Improvements**
  - Batch API requests where possible
  - Implement request queue management
  - Add retry logic for failed requests
  - Better error handling and user feedback

### Feature Enhancements
- 📊 **Veto Statistics**
  - Research methods to obtain accurate pick/ban data from FACEIT API
  - Implement veto pattern analysis
  - Add historical veto trends

- 🎯 **Advanced Analytics**
  - Head-to-head team comparison mode
  - Player performance trends over time
  - Advanced filtering options (date ranges, tournament types)
  - Export data to CSV/JSON

- 🎨 **UI/UX Improvements**
  - Dark/light theme toggle
  - Customizable dashboard layouts
  - Mobile-responsive design improvements
  - Accessibility enhancements

### Technical Debt
- 📝 Add comprehensive test coverage (unit, integration, e2e)
- 🔐 Implement backend API proxy for secure API key management
- 📚 Add JSDoc documentation
- 🚀 Optimize bundle size and code splitting

## Deployment

The application is deployed on **Netlify** with automatic deployments from the main branch. It can also be deployed to GitHub Pages using the included GitHub Actions workflow.

### Deploy to Netlify
1. Fork/clone this repository
2. Connect to Netlify
3. Build command: `npm run build`
4. Publish directory: `dist`

### Deploy to GitHub Pages
1. Enable GitHub Pages in repository settings
2. Select "GitHub Actions" as the source
3. Push to main branch to trigger automatic deployment

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

⚠️ **Important:** The API key is entered client-side and stored in browser memory only. It is never sent to any server except FACEIT's official API.

For production deployments on Netlify, the application uses a serverless function to proxy requests and keep API keys secure. For local development, Vite's dev server proxy is used.

## Contributing

This is an open source project and contributions are welcome! Here's how you can help:

1. **Report Bugs** - Open an issue describing the bug and how to reproduce it
2. **Suggest Features** - Share ideas for new features or improvements
3. **Submit Pull Requests** - Fork the repo, make your changes, and submit a PR
4. **Improve Documentation** - Help make the docs clearer and more comprehensive

See the [Future Enhancements](#future-enhancements) section for areas where contributions would be especially valuable.

## License

This project is open source and available under the MIT License.

## Acknowledgments

- Data provided by [FACEIT](https://www.faceit.com)
- Icons and design inspired by modern esports analytics platforms

## Support the Project

If you find this tool useful, consider supporting its development:
- ☕ [Buy me a coffee](https://paypal.me/jtm258)
- 🎮 [Send a CS2 skin](https://steamcommunity.com/tradeoffer/new/?partner=112689034&token=1634oYnV)

## Questions or Issues?

For bugs, feature requests, or questions, please [open an issue on GitHub](https://github.com/jtmelhorn/FACEIT-Compare/issues).
