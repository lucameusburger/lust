export interface DraggableImage {
  id: number;
  src: string;
  alt: string;
  width: number; // Intrinsic width
  height: number; // Intrinsic height
  visualWidth: number; // Calculated visual width within 256x256 box
  visualHeight: number; // Calculated visual height within 256x256 box
  currentTop: string;
  currentLeft: string;
  currentAnimation: 'none' | 'bounce' | 'spin';
  zIndex: number;
  currentRotation: number;
  mirroredX: boolean;
  mirroredY: boolean;
}

export interface ApiImageData {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export interface ImportedImageItem {
  id?: number;
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

export interface ContextMenuTriggerState {
  imageId: number | null;
  triggerX: number;
  triggerY: number;
} 