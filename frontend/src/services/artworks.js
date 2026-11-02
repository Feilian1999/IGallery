// Published artworks for the home page.
export const fetchArtworks = async () => {
  const response = await fetch("/api/artworks");
  if (!response.ok) throw new Error(`artworks request failed: ${response.status}`);
  return (await response.json()).artworks;
};
