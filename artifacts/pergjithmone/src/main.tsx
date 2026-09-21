import { createRoot } from 'react-dom/client';

import App from './App';

import './index.css';
import { ensureEditorFonts } from './lib/editorFonts';

// Start album webfonts immediately so Konva/PageThumb never paint Great Vibes
// (etc.) with a fallback on first builder load.
void ensureEditorFonts();

createRoot(document.getElementById('root')!).render(<App />);
