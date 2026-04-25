const fs = require('fs');

const raw = fs.readFileSync('home.json', 'utf8');
const json = JSON.parse(raw);

const sections = [];

try {
  const tabs = json.data.contents.singleColumnBrowseResultsRenderer.tabs;
  const tab = tabs.find(t => t.tabRenderer.tabIdentifier === 'FEmusic_home') || tabs[0];
  const contents = tab.tabRenderer.content.sectionListRenderer.contents;

  for (const content of contents) {
    const carousel = content.musicCarouselShelfRenderer;
    if (!carousel) continue;

    let title = "Section";
    try {
      title = carousel.header.musicCarouselShelfBasicHeaderRenderer.title.runs.map(r => r.text).join("");
    } catch(e) {}

    const items = [];
    for (const item of (carousel.contents || [])) {
      const renderer = item.musicTwoRowItemRenderer;
      if (!renderer) continue;

      let id = "";
      // check thumbnailOverlay
      const pt = renderer.thumbnailOverlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint;
      if (pt) {
        id = pt.watchEndpoint?.videoId || pt.watchPlaylistEndpoint?.playlistId || "";
      }
      if (!id && renderer.navigationEndpoint?.watchEndpoint?.videoId) {
        id = renderer.navigationEndpoint.watchEndpoint.videoId;
      }
      if (!id && renderer.navigationEndpoint?.browseEndpoint?.browseId) {
        id = renderer.navigationEndpoint.browseEndpoint.browseId;
      }

      let textTitle = "";
      try { textTitle = renderer.title.runs.map(r => r.text).join(""); } catch(e) {}

      let textArtist = "";
      try { textArtist = renderer.subtitle.runs.map(r => r.text).join(""); } catch(e) {}

      let thumb = "";
      try { thumb = renderer.thumbnailRenderer.musicThumbnailRenderer.thumbnail.thumbnails.slice(-1)[0].url; } catch(e) {}

      if (id) {
        items.push({ id, title: textTitle, artist: textArtist, thumbnail: thumb });
      }
    }

    if (items.length > 0) {
      sections.push({ title, items: items.slice(0, 10), count: items.length });
    }
  }

} catch(e) {
  console.log("Error:", e.message);
}

console.log(JSON.stringify(sections.slice(0, 3), null, 2));
