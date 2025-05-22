export interface DraggableImage {
  id: number;
  type: 'image'; // Type discriminator
  src: string;
  alt: string;
  width: number; // intrinsic width
  height: number; // intrinsic height
  visualWidth: number;
  visualHeight: number;
  currentTop: string;
  currentLeft: string;
  currentAnimation: 'none' | 'bounce' | 'spin';
  zIndex: number;
  currentRotation: number;
  mirroredX: boolean;
  mirroredY: boolean;
}

export interface DraggableText {
  id: number;
  type: 'text'; // Type discriminator
  content: string;
  fontSize: number; // e.g., 16 (for 16px)
  color: string; // e.g., '#FF0000' or 'red'
  currentTop: string;
  currentLeft: string;
  zIndex: number;
  // Optional: rotation, mirroring if desired for text later
  // currentRotation?: number;
  // mirroredX?: boolean;
  // mirroredY?: boolean;
}

export type DraggableItem = DraggableImage | DraggableText;

export interface ApiImageData {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export interface ImportedImageItem { // This might need to become ImportedItem
  id?: number;
  type?: 'image'; // Optional for backward compatibility, default to image if not present
  src?: string;
  alt?: string;
  intrinsicWidth?: number;
  intrinsicHeight?: number;
  visualWidth?: number;
  visualHeight?: number;
  currentTop?: string;
  currentLeft?: string;
  currentAnimation?: 'none' | 'bounce' | 'spin';
  zIndex?: number;
  currentRotation?: number;
  mirroredX?: boolean;
  mirroredY?: boolean;
}

export interface ImportedTextItem {
  id?: number;
  type: 'text';
  content?: string;
  fontSize?: number;
  color?: string;
  currentTop?: string;
  currentLeft?: string;
  zIndex?: number;
}

export type ImportedItem = ImportedImageItem | ImportedTextItem;

export interface ContextMenuTriggerState {
  itemId: number | null; // ID of the DraggableItem, or null for viewport
  itemType?: 'image' | 'text'; // Optional: to quickly know type if itemId is not null
  triggerX: number;
  triggerY: number;
} 