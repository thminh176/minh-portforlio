# Published content media

This directory holds local raster assets referenced by `content/published/dtm.v1.json`.
Each candidate snapshot and every referenced image must be committed together; the build
validates exact path case, file type, dimensions, references, and meaningful alt text.
Keep media under `/media/content/` paths in the snapshot. Do not use remote CMS URLs,
add unpublished assets as a fallback, or remove an image while any published record
still references it. An empty directory is valid when the snapshot media list is empty.
