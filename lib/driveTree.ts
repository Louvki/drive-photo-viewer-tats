import { google, drive_v3 } from 'googleapis';
import type { Breadcrumb, DriveFolderNode, DriveImage } from '../types/drive';

const DRIVE_FOLDER_MIME = 'application/vnd.google-apps.folder';
const DRIVE_SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];
const DEFAULT_CACHE_TTL = 1000 * 60 * 10; // 10 minutes

interface DriveCredentials {
  email: string;
  key: string;
  rootId: string;
}

interface BuildContext {
  drive: drive_v3.Drive;
  id: string;
  parentSegments: string[];
  ancestors: Breadcrumb[];
  isRoot?: boolean;
}

let cachedTree: DriveFolderNode | null = null;
let cachedAt = 0;

export const hasDriveConfig = (): boolean => {
  return Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY &&
    process.env.GOOGLE_DRIVE_ROOT_ID,
  );
};

const getCredentials = (): DriveCredentials | null => {
  if (!hasDriveConfig()) {
    return null;
  }

  return {
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL as string,
    key: (process.env.GOOGLE_SERVICE_ACCOUNT_KEY as string).replace(/\\n/g, '\n'),
    rootId: process.env.GOOGLE_DRIVE_ROOT_ID as string,
  };
};

const createDriveClient = (): drive_v3.Drive => {
  const creds = getCredentials();

  if (!creds) {
    throw new Error('Google Drive credentials are missing. Please set the required env vars.');
  }

  const auth = new google.auth.JWT({
    email: creds.email,
    key: creds.key,
    scopes: DRIVE_SCOPES,
  });

  return google.drive({ version: 'v3', auth });
};

const makeSlug = (rawName: string | undefined, id: string): string => {
  const name = rawName?.trim() || 'untitled';
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const safeBase = base || 'folder';
  return `${safeBase}-${id.slice(0, 6)}`;
};

const previewUrlFor = (id: string): string => {
  return `https://drive.google.com/thumbnail?id=${id}&sz=w2000-h2000`;
};

const fullSizeUrlFor = (id: string): string => {
  return `https://lh3.googleusercontent.com/d/${id}`;
};

const mapImage = (file: drive_v3.Schema$File): DriveImage => {
  const id = file.id ?? '';
  return {
    id,
    name: file.name ?? 'Untitled image',
    mimeType: file.mimeType ?? 'image/*',
    previewUrl: file.thumbnailLink ?? previewUrlFor(id),
    fullSizeUrl: fullSizeUrlFor(id),
    width: file.imageMediaMetadata?.width ?? null,
    height: file.imageMediaMetadata?.height ?? null,
  };
};

const listFolderContents = async (drive: drive_v3.Drive, folderId: string): Promise<drive_v3.Schema$File[]> => {
  const files: drive_v3.Schema$File[] = [];
  let pageToken: string | undefined;

  do {
    const { data } = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      pageSize: 1000,
      pageToken,
      orderBy: 'name',
      fields:
        'nextPageToken, files(id, name, mimeType, description, thumbnailLink, imageMediaMetadata(width,height))',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    if (data.files) {
      files.push(...data.files);
    }

    pageToken = data.nextPageToken ?? undefined;
  } while (pageToken);

  return files;
};

const buildNode = async ({ drive, id, parentSegments, ancestors, isRoot = false }: BuildContext): Promise<DriveFolderNode> => {
  const { data } = await drive.files.get({
    fileId: id,
    fields: 'id, name, description',
    supportsAllDrives: true,
  });

  if (!data.id) {
    throw new Error(`Failed to load folder metadata for id ${id}`);
  }

  const slug = isRoot ? '' : makeSlug(data.name, data.id);
  const pathSegments = isRoot ? [] : [...parentSegments, slug];
  const route = pathSegments.length ? `/${pathSegments.join('/')}` : '/';
  const breadcrumbs = isRoot
    ? [
      {
        label: data.name ?? 'Home',
        route: '/',
      },
    ]
    : [...ancestors, { label: data.name ?? 'Untitled folder', route }];

  const files = await listFolderContents(drive, data.id);
  const folders = files.filter((file) => file.mimeType === DRIVE_FOLDER_MIME);
  const images = files.filter((file) => (file.mimeType ?? '').startsWith('image/')).map(mapImage);

  const children = await Promise.all(
    folders.map((folder) =>
      buildNode({
        drive,
        id: folder.id as string,
        parentSegments: pathSegments,
        ancestors: breadcrumbs,
      }),
    ),
  );

  children.sort((a, b) => a.name.localeCompare(b.name));
  images.sort((a, b) => a.name.localeCompare(b.name));

  return {
    id: data.id,
    name: data.name ?? 'Untitled folder',
    description: data.description,
    slug,
    route,
    pathSegments,
    breadcrumbs,
    children,
    images,
  };
};

export const getDriveTree = async ({ force }: { force?: boolean } = {}): Promise<DriveFolderNode> => {
  const now = Date.now();
  const ttl = Number(process.env.DRIVE_CACHE_TTL ?? DEFAULT_CACHE_TTL);

  if (!force && cachedTree && now - cachedAt < ttl) {
    return cachedTree;
  }

  const creds = getCredentials();

  if (!creds) {
    throw new Error(
      'Google Drive credentials are missing. Set GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_KEY, and GOOGLE_DRIVE_ROOT_ID.',
    );
  }

  const drive = createDriveClient();
  const tree = await buildNode({
    drive,
    id: creds.rootId,
    parentSegments: [],
    ancestors: [],
    isRoot: true,
  });

  cachedTree = tree;
  cachedAt = now;

  return tree;
};

export const findNodeBySlugs = (tree: DriveFolderNode, slugs: string[]): DriveFolderNode | null => {
  if (!slugs.length) {
    return tree;
  }

  const [head, ...rest] = slugs;
  const match = tree.children.find((child) => child.slug === head);

  if (!match) {
    return null;
  }

  return rest.length ? findNodeBySlugs(match, rest) : match;
};

export const flattenRoutes = (node: DriveFolderNode): string[] => {
  return [node.route, ...node.children.flatMap((child) => flattenRoutes(child))];
};

export const collectDriveRoutes = async (): Promise<string[]> => {
  if (!hasDriveConfig()) {
    return ['/'];
  }

  try {
    const tree = await getDriveTree({ force: true });
    const routes = Array.from(new Set(flattenRoutes(tree)));
    return routes.includes('/') ? routes : ['/', ...routes];
  } catch (error) {
    console.warn('Failed to collect Drive routes:', error);
    return ['/'];
  }
};

