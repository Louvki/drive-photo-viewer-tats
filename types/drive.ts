export interface Breadcrumb {
  label: string;
  route: string;
}

export interface DriveImage {
  id: string;
  name: string;
  mimeType: string;
  previewUrl: string;
  fullSizeUrl: string;
  width?: number | null;
  height?: number | null;
}

export interface DriveFolderNode {
  id: string;
  name: string;
  description?: string | null;
  slug: string;
  route: string;
  pathSegments: string[];
  breadcrumbs: Breadcrumb[];
  children: DriveFolderNode[];
  images: DriveImage[];
}

