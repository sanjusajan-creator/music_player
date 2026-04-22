# Vibecraft Music Player

A premium, high-fidelity music experience powered by YouTube and Genkit AI.

## Getting Started

To use the full search capabilities, you'll need a YouTube Data API v3 key.

### How to get a YouTube API Key:

1.  Go to the [Google Cloud Console](https://console.cloud.google.com/).
2.  Create a new project (or select an existing one).
3.  In the search bar, type **"YouTube Data API v3"** and click on the result.
4.  Click **Enable**.
5.  Go to the **Credentials** tab on the left sidebar.
6.  Click **+ CREATE CREDENTIALS** at the top and select **API key**.
7.  Copy your new API key.
8.  Create or open your `.env` file in the root of this project.
9.  Add the key: `NEXT_PUBLIC_YOUTUBE_API_KEY=your_key_here`

### Local Development

1.  Add your API key to `.env`.
2.  Run `npm run dev` to start the development server.
3.  Open [http://localhost:9002](http://localhost:9002) in your browser.

## Features

- **Ad-Aware Playback:** Uses Gemini AI to detect when a YouTube ad is playing and masks it with a premium loading UI.
- **High Fidelity UI:** Built with ShadCN, Tailwind CSS, and Framer Motion for a smooth, app-like feel.
- **Instant Search:** Debounced search across the YouTube Music category.
