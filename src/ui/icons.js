export function icon(name) {
  const paths = {
    play: '<path d="M8 5v14l11-7z"/>',
    pause: '<path d="M6 5h4v14H6zM14 5h4v14h-4z"/>',
    next: '<path d="m5 5 10 7-10 7zM17 5h2v14h-2z"/>',
    previous: '<path d="m19 5-10 7 10 7zM5 5h2v14H5z"/>',
    restart:
      '<path fill="none" stroke="currentColor" stroke-width="2" d="M5 9a8 8 0 1 1-1 7M5 3v6h6"/>',
  };
  return (
    '<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor">' +
    paths[name] +
    "</svg>"
  );
}
