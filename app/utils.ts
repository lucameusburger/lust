import { DraggableImage } from './types'; // Assuming types.ts is in the same directory

export const MAX_VISUAL_DIM = 256;

export const calculateVisualDimensions = (intrinsicWidth: number, intrinsicHeight: number) => {
  const aspectRatio = intrinsicWidth / intrinsicHeight;
  let visualWidth = intrinsicWidth;
  let visualHeight = intrinsicHeight;

  if (visualWidth > MAX_VISUAL_DIM) {
    visualWidth = MAX_VISUAL_DIM;
    visualHeight = visualWidth / aspectRatio;
  }
  if (visualHeight > MAX_VISUAL_DIM) {
    visualHeight = MAX_VISUAL_DIM;
    visualWidth = visualHeight * aspectRatio;
  }
  if (visualWidth > MAX_VISUAL_DIM) { // Final check for width
    visualWidth = MAX_VISUAL_DIM;
    visualHeight = visualWidth / aspectRatio;
  }
  return { width: Math.round(visualWidth), height: Math.round(visualHeight) };
};

export const getAnimationClass = (animationState: 'none' | 'bounce' | 'spin') => {
  if (animationState === 'bounce') return 'animate-bounce';
  if (animationState === 'spin') return 'animate-spin';
  return '';
};

export const imageWrapperClasses = (image: DraggableImage, isDragging: boolean, isHoveringOpaque: boolean) => {
  let cursorClass = 'cursor-default';
  if (isDragging) {
    cursorClass = 'cursor-grabbing';
  } else if (isHoveringOpaque) {
    cursorClass = 'cursor-grab';
  }
  // Ensure getAnimationClass is available here or pass its result if it remains in page.tsx
  // For now, assuming getAnimationClass is also moved to utils or image.currentAnimation is directly used
  return `image-wrapper-class absolute drop-shadow-lg drop-shadow-black/50 ${getAnimationClass(image.currentAnimation)} ${isDragging ? 'opacity-70' : 'hover:scale-105'} ${cursorClass} transition-transform duration-100 ease-in-out flex justify-center items-center`;
};

export const getTransformClasses = (mirroredX: boolean, mirroredY: boolean): string => {
  const scaleClasses = [];
  if (mirroredX) scaleClasses.push('scale-x-[-1]');
  if (mirroredY) scaleClasses.push('scale-y-[-1]');
  return scaleClasses.join(' ');
}; 