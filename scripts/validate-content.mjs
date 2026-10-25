/** Build/engineering CLI only; root override is explicit trusted test configuration, never an env value. */
import { createContentAdapter } from '../src/lib/content/index.ts';
import { ContentValidationError } from '../src/lib/content/validate.ts';

try {
  const args = process.argv.slice(2);
  let repositoryRoot;
  if (args.length) {
    if (args.length !== 2 || args[0] !== '--repo-root' || !args[1]) throw new ContentValidationError('', 'cli.arguments');
    repositoryRoot = args[1];
  }
  const snapshot = await createContentAdapter({ repositoryRoot }).loadSnapshot();
  console.log(`Published snapshot valid: ${snapshot.posts.length} posts, ${snapshot.projects.length} projects, ${snapshot.media.length} media; vi/en.`);
} catch (error) {
  console.error(error instanceof ContentValidationError ? error.message : 'Snapshot validation failed: / (loader.unexpected)');
  process.exitCode = 1;
}
