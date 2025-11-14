# EventFull - Your Life's Timeline

EventFull is a timeline application that helps you organize and visualize important events in your life. Create multiple timelines, add events with photos, journals, and voice recordings, and share your timelines with others.

## Features

- 📅 **Multiple Timelines**: Create and manage multiple timelines
- 📸 **Photo Management**: Upload and organize photos, tag them to events
- 📝 **Journals**: Add journal entries to events
- 🎤 **Voice Recordings**: Attach voice recordings to events
- 🎨 **Custom Categories**: Create custom event categories
- 🖼️ **Custom Backgrounds**: Personalize your timeline with custom backgrounds
- 👥 **Timeline Sharing**: Share timelines with other users

## Tech Stack

- **Frontend**: React 19, Tailwind CSS
- **Backend**: Supabase (PostgreSQL)
- **Icons**: Lucide React
- **Deployment**: Netlify

## Getting Started

### Prerequisites

- Node.js 16+ and npm
- Supabase account (for database)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/sternmichaelt/eventfull-app.git
cd eventfull-app
```

2. Install dependencies:
```bash
npm install
```

3. Set up Supabase:
   - See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for detailed instructions
   - Create a `.env` file with your Supabase credentials:
   ```env
   REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
   REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here
   ```

4. Run the database setup:
   - Open Supabase SQL Editor
   - Run the SQL from `supabase-setup.sql`

5. Start the development server:
```bash
npm start
```

The app will open at [http://localhost:3000](http://localhost:3000)

## Project Structure

```
eventfull-app/
├── src/
│   ├── api/           # Supabase API functions
│   ├── lib/            # Supabase client configuration
│   ├── utils/          # Utility functions (connection testing)
│   └── App.js          # Main application component
├── public/             # Static assets
├── supabase-setup.sql # Database schema
└── .env               # Environment variables (not in git)
```

## Available Scripts

### `npm start`
Runs the app in development mode at [http://localhost:3000](http://localhost:3000)

### `npm run build`
Builds the app for production to the `build` folder

### `npm test`
Launches the test runner

## Deployment

### Netlify

1. Connect your GitHub repository to Netlify
2. Set environment variables in Netlify dashboard:
   - `REACT_APP_SUPABASE_URL`
   - `REACT_APP_SUPABASE_ANON_KEY`
3. Deploy!

See [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md) for detailed deployment steps.

## Documentation

- [Supabase Setup Guide](./SUPABASE_SETUP.md) - Complete database setup instructions
- [Production Checklist](./PRODUCTION_CHECKLIST.md) - Production readiness and deployment guide

## Contributing

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
