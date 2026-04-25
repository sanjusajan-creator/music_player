const fs = require('fs');
const raw = fs.readFileSync('home.json', 'utf16le');
const json = JSON.parse(raw);

const tabs = json.data.contents.singleColumnBrowseResultsRenderer.tabs;
const homeTab = tabs.find(t => t.tabRenderer?.tabIdentifier === 'FEmusic_home') || tabs[0];
const sections = homeTab?.tabRenderer?.content?.sectionListRenderer?.contents || [];

for (const section of sections) {
  const carousel = section.musicCarouselShelfRenderer;
  if (!carousel || !carousel.contents) continue;

  for (const item of carousel.contents) {
    const renderer = item.musicTwoRowItemRenderer;
    if (!renderer) continue;
    
    // Dump play navigation endpoint
    const playEndpoint = renderer.thumbnailOverlay?.musicItemThumbnailOverlayRenderer
      ?.content?.musicPlayButtonRenderer?.playNavigationEndpoint;
    
    if (playEndpoint) {
      console.log(JSON.stringify(playEndpoint));
      // Just print 5 and exit
      if (Math.random() < 0.1) process.exit(0);
    }
  }
}
