# Fish Aquarium - Preact App

An interactive fish aquarium built with Preact and PIXI.js. Features animated fish that respond to different moods, floating bubbles, and an immersive underwater environment.

## Features

- **Interactive Fish**: Animated fish with different behaviors based on mood
- **Mood Control**: Switch between Work, Pause, and Lunch modes to change fish behavior
- **Bubbles Animation**: Floating bubbles for added atmosphere
- **Responsive Design**: Works on desktop and mobile devices
- **Pan & Zoom**: Click and drag to explore the aquarium, scroll to zoom
- **Performance Optimized**: Uses PIXI.js for smooth 60fps animation

## Controls

- **Mouse/Touch**: Drag to pan around the aquarium
- **Mouse Wheel**: Zoom in and out
- **Mood Buttons**: Click Work/Pause/Lunch to change fish behavior
- **B Key**: Toggle bubbles on/off

## Fish Behavior by Mood

- **Work Mode**: Normal swimming speed and behavior
- **Pause Mode**: Slow, relaxed movement
- **Lunch Mode**: Fast, energetic swimming

## Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open your browser to `http://localhost:3000`

## Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Technologies Used

- **Preact**: Fast, lightweight React alternative
- **PIXI.js**: 2D WebGL renderer for smooth animations
- **Pixi-Viewport**: Pan and zoom functionality
- **Vite**: Fast build tool and dev server

## Project Structure

```
src/
├── classes/
│   ├── Aquarium.js      # Main aquarium manager
│   ├── Fish.js          # Fish entities and logic
│   └── Bubble.js        # Bubble effects
├── components/
│   ├── AquariumContainer.jsx  # Preact wrapper for PIXI
│   └── TimerOverlay.jsx       # UI controls
├── App.jsx              # Root component
├── main.jsx            # Entry point
└── styles.css          # Global styles
```

## Performance Notes

- Fish count automatically adjusts based on screen size
- Uses PIXI ParticleContainer for efficient bubble rendering
- Optimized for both desktop and mobile devices
- Target: 60fps on modern devices

## License

MIT