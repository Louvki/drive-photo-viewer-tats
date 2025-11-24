import { createError } from 'h3';
import { findNodeBySlugs, getDriveTree } from '../../lib/driveTree';
import type { DriveFolderNode } from '../../types/drive';

export const extractSlugs = (param?: string | string[]): string[] => {
  if (!param) {
    return [];
  }

  if (Array.isArray(param)) {
    return param.filter(Boolean);
  }

  return param.split('/').filter(Boolean);
};

export const getFolderPayload = async (slugs: string[]): Promise<DriveFolderNode> => {
  const tree = await getDriveTree();
  const node = findNodeBySlugs(tree, slugs);

  if (!node) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Folder not found',
    });
  }

  return node;
};

