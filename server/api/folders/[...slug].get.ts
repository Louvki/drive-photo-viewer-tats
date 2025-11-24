import { defineEventHandler } from 'h3';
import { extractSlugs, getFolderPayload } from '../../utils/folderPayload';

export default defineEventHandler(async (event) => {
  const slugs = extractSlugs(event.context.params?.slug as string | string[] | undefined);
  return getFolderPayload(slugs);
});

