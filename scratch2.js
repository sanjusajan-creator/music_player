const fs = require('fs');

const raw = fs.readFileSync('home.json', 'utf8');
const json = JSON.parse(raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw);

function normalizeYTTrack(item) {
  const renderer = item.musicResponsiveListItemRenderer ||
    item.musicCardShelfRenderer ||
    item.musicTwoRowItemRenderer ||
    item;

  let videoId = renderer.videoId || renderer.id;
  if (!videoId && renderer.overlay?.musicItemThumbnailOverlayRenderer) {
    videoId = renderer.overlay.musicItemThumbnailOverlayRenderer
      .content?.musicPlayButtonRenderer
      ?.playNavigationEndpoint?.watchEndpoint?.videoId;
  }
  if (!videoId && renderer.thumbnailOverlay?.musicItemThumbnailOverlayRenderer) {
    const playEndpoint = renderer.thumbnailOverlay.musicItemThumbnailOverlayRenderer
      .content?.musicPlayButtonRenderer?.playNavigationEndpoint;
    videoId = playEndpoint?.watchEndpoint?.videoId || playEndpoint?.watchPlaylistEndpoint?.playlistId;
  }
  if (!videoId && renderer.navigationEndpoint?.watchEndpoint?.videoId) {
    videoId = renderer.navigationEndpoint.watchEndpoint.videoId;
  }
  if (!videoId && renderer.navigationEndpoint?.browseEndpoint?.browseId) {
    videoId = renderer.navigationEndpoint.browseEndpoint.browseId;
  }
  if (!videoId && renderer.onTap?.watchEndpoint?.videoId) {
    videoId = renderer.onTap.watchEndpoint.videoId;
  }

  let title = "Unknown Title";
  try {
    if (renderer.title?.runs) {
      title = renderer.title.runs.map(r => r.text).join("");
    }
  } catch(e) {}

  return { id: videoId, title: title, renderer_type: Object.keys(item)[0] };
}

const tabs = json.data.contents.singleColumnBrowseResultsRenderer.tabs;
const homeTab = tabs.find(t => t.tabRenderer?.tabIdentifier === 'FEmusic_home') || tabs[0];
const sections = homeTab?.tabRenderer?.content?.sectionListRenderer?.contents || [];

const parsedSections = [];

for (const section of sections) {
  const carousel = section.musicCarouselShelfRenderer;
  if (!carousel || !carousel.contents) continue;
  let title = "Trending";
  try {
    title = carousel.header?.musicCarouselShelfBasicHeaderRenderer?.title?.runs?.map(r => r.text).join("") || title;
  } catch(e) {}

  const items = carousel.contents.map(normalizeYTTrack).filter(t => t.id && t.id !== "unknown_id");
  parsedSections.push({ title, items: items.slice(0, 3) });
}

console.log(JSON.stringify(parsedSections, null, 2));
