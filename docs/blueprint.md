# **App Name**: Vibecraft Music

## Core Features:

- YouTube Media Engine: Seamless integration with YouTube Data API v3 for robust search capabilities and YouTube Iframe Player API for high-fidelity audio/video playback, queue management, and automatic metadata normalization.
- Intelligent Ad Interruption Management: An AI-powered tool detects ad-like states using real-time playback anomalies, buffering behavior, and duration shifts, seamlessly transitioning the UI to a 'Preparing your track...' premium loading state with 'Up Next' track previews.
- Dynamic & Immersive Player UI: Features a responsive mini and full player, displaying large artwork with dynamic blurred backgrounds, smooth Framer Motion animations for transitions, and a soft fade-in volume transition for track changes.
- Real-time Lyrics & Information Panel: Fetches and displays synchronized lyrics via a third-party API (with graceful fallback handling) alongside relevant track information, presented in a scrollable and clean panel.
- Optimized Music Discovery & Search: Provides a debounced search input with intelligent suggestions, infinite scrolling for results, and leverages React Query for efficient caching and minimized YouTube API quota usage.
- Personalized Music Library System: Enables users to manage 'Recently Played' tracks, 'Liked Songs,' and custom 'Playlists,' all powered by persistent local storage via Zustand for a consistent experience.
- Progressive Web App (PWA) Features: Delivers a mobile-first responsive design with intuitive bottom navigation and touch gestures, enhanced by the Media Session API for lock screen controls and hardware media button support.

## Style Guidelines:

- Primary Color: A vibrant, deep purple (#8033CC), selected for its energetic yet sophisticated feel, suitable for interactive elements and highlights against a dark backdrop.
- Background Color: A very dark, subtle purplish-charcoal (#1A0A29), providing a modern dark theme foundation that enhances visual depth and promotes content focus.
- Accent Color: A bright and luminous electric blue (#6666FF), used to draw attention to critical calls to action and important status indicators, creating dynamic contrast.
- Font Family: 'Inter' (sans-serif) for all text. Chosen for its clean, modern, and highly legible design, ideal for both headlines and body text in a 'Spotify-like' premium interface.
- Utilize sleek, minimalist line-based icons with subtle gradients, complementing the glassmorphism and dark theme to maintain a high-end visual aesthetic.
- Adopt a 'glassmorphism' aesthetic with frosted transparent layers, dynamic gradient backgrounds, a mobile-first approach with adaptive bottom navigation, and clearly defined player states (mini/full).
- Implement smooth, tasteful animations via Framer Motion for all key interactions, including seamless page transitions, player expansion/collapse, and subtle micro-interactions on hover or click.