import { defineEventHandler } from 'h3';
import { getFolderPayload } from '../../utils/folderPayload';

export default defineEventHandler(async () => {
  return getFolderPayload([]);
});

