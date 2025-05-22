"use client";

import * as ContextMenu from '@radix-ui/react-context-menu';

import { ApiImageData, ContextMenuTriggerState, DraggableImage, ImportedImageItem } from './types';
import { MouseEvent, useEffect, useRef, useState } from "react";
import {
  calculateVisualDimensions,
  getTransformClasses,
  imageWrapperClasses
} from './utils';

import AppContextMenu from './components/AppContextMenu';
import Image from "next/image";

export default function Home() {
  const [images, setImages] = useState<DraggableImage[]>([]);
  const [availableImages, setAvailableImages] = useState<ApiImageData[]>([]);
  const [draggingImageId, setDraggingImageId] = useState<number | null>(null);
  const [imageDragLocalOffset, setImageDragLocalOffset] = useState({ x: 0, y: 0 });
  const [mouseMovedSinceImageDragStart, setMouseMovedSinceImageDragStart] = useState(false);
  const [contextMenuTriggerInfo, setContextMenuTriggerInfo] = useState<ContextMenuTriggerState | null>(null);
  const [isShiftDown, setIsShiftDown] = useState(false);
  const [isMetaDown, setIsMetaDown] = useState(false);

  const imageRefs = useRef<Record<number, HTMLImageElement | null>>({});
  const [hoveredImageId, setHoveredImageId] = useState<number | null>(null);
  const [isOverOpaquePixel, setIsOverOpaquePixel] = useState<boolean>(false);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const response = await fetch('/api/images');
        if (!response.ok) {
          throw new Error(`Failed to fetch images: ${response.statusText}`);
        }
        const data: ApiImageData[] = await response.json();
        setAvailableImages(data);
      } catch (error) {
        console.error("Error fetching available images:", error);
      }
    };
    fetchImages();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftDown(true);
      if (e.metaKey || e.key === 'Meta') setIsMetaDown(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftDown(false);
      if (e.key === 'Meta') setIsMetaDown(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const checkPixelTransparency = (e: MouseEvent<HTMLDivElement>, imageId: number): boolean => {
    const currentImage = images.find(img => img.id === imageId);
    const imageElement = imageRefs.current[imageId];
    if (!currentImage || !imageElement || !currentImage.src.toLowerCase().endsWith('.png') || !imageElement.complete || imageElement.naturalWidth === 0) {
      if (currentImage && availableImages.some(ai => ai.src === currentImage.src)) return true;
      return true;
    }
    const wrapperDiv = e.currentTarget;
    const wrapperRect = wrapperDiv.getBoundingClientRect();
    const xInWrapper = e.clientX - wrapperRect.left;
    const yInWrapper = e.clientY - wrapperRect.top;
    const { width: iw, height: ih } = currentImage;
    const { visualWidth: vw, visualHeight: vh } = currentImage;
    const imgAspectRatio = iw / ih;
    const wrapperAspectRatio = vw / vh;
    let renderedImageWidth, renderedImageHeight, offsetX = 0, offsetY = 0;
    if (imgAspectRatio > wrapperAspectRatio) {
      renderedImageWidth = vw;
      renderedImageHeight = vw / imgAspectRatio;
      offsetY = (vh - renderedImageHeight) / 2;
    } else {
      renderedImageHeight = vh;
      renderedImageWidth = vh * imgAspectRatio;
      offsetX = (vw - renderedImageWidth) / 2;
    }
    const xInRenderedVisual = xInWrapper - offsetX;
    const yInRenderedVisual = yInWrapper - offsetY;
    if (xInRenderedVisual < 0 || xInRenderedVisual >= renderedImageWidth || yInRenderedVisual < 0 || yInRenderedVisual >= renderedImageHeight) return false;
    const intrinsicX = Math.floor((xInRenderedVisual / renderedImageWidth) * iw);
    const intrinsicY = Math.floor((yInRenderedVisual / renderedImageHeight) * ih);
    if (intrinsicX < 0 || intrinsicX >= iw || intrinsicY < 0 || intrinsicY >= ih) return false;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return true;
    canvas.width = iw;
    canvas.height = ih;
    try {
      ctx.drawImage(imageElement, 0, 0, iw, ih);
      const pixelData = ctx.getImageData(intrinsicX, intrinsicY, 1, 1).data;
      return pixelData[3] >= 10;
    } catch (error) {
      console.error("Error reading pixel data:", error);
      return true;
    }
  };

  const handleGrabHandleMouseDown = (e: MouseEvent<HTMLDivElement>, id: number) => {
    if (!checkPixelTransparency(e, id)) return;
    e.stopPropagation();
    setContextMenuTriggerInfo(null);
    setMouseMovedSinceImageDragStart(false);
    const grabHandleElement = e.currentTarget;
    const rect = grabHandleElement.getBoundingClientRect();
    const clickedImage = images.find(img => img.id === id);
    if (!clickedImage) return;
    setDraggingImageId(id);
    setImageDragLocalOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    e.preventDefault();
  };

  const handleImageDoubleClick = (e: MouseEvent<HTMLDivElement>, originalImage: DraggableImage) => {
    const visualDims = calculateVisualDimensions(originalImage.width, originalImage.height);
    const newImage: DraggableImage = {
      ...originalImage,
      id: Date.now(),
      visualWidth: visualDims.width,
      visualHeight: visualDims.height,
      currentLeft: `${parseInt(originalImage.currentLeft || "0") + 20}px`,
      currentTop: `${parseInt(originalImage.currentTop || "0") + 20}px`,
      zIndex: 50,
      currentAnimation: 'none',
      currentRotation: originalImage.currentRotation,
      mirroredX: originalImage.mirroredX,
      mirroredY: originalImage.mirroredY,
    };
    setImages(prevImages => [...prevImages, newImage].sort((a, b) => a.zIndex - b.zIndex));
    setContextMenuTriggerInfo(null);
  };

  const handleImageContextMenuTrigger = (e: MouseEvent<HTMLDivElement>, imageId: number) => {
    setContextMenuTriggerInfo({ imageId, triggerX: e.clientX, triggerY: e.clientY });
  };

  const handleViewportContextMenuTrigger = (e: MouseEvent<HTMLDivElement>) => {
    setContextMenuTriggerInfo({ imageId: null, triggerX: e.clientX, triggerY: e.clientY });
  };

  const handleDeleteImage = (imageIdToDelete: number) => {
    setImages(prevImages => prevImages.filter(img => img.id !== imageIdToDelete));
  };

  const handleChangeAnimation = (imageId: number, animation: 'none' | 'bounce' | 'spin') => {
    setImages(prevImages =>
      prevImages.map(img =>
        img.id === imageId ? { ...img, currentAnimation: animation } : img
      )
    );
  };

  const handleViewportMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (!target.closest('.image-wrapper-class') && !target.closest('.radix-context-menu-content-class')) {
      // This condition is to avoid interfering with Radix menu internal clicks or image clicks.
      // No specific action needed here if Radix handles its own closing.
    }
  };

  const handleViewportMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (draggingImageId !== null) {
      if (!mouseMovedSinceImageDragStart) setMouseMovedSinceImageDragStart(true);
      const newImageLeft = e.clientX + window.scrollX - imageDragLocalOffset.x;
      const newImageTop = e.clientY + window.scrollY - imageDragLocalOffset.y;
      setImages(prevImages =>
        prevImages.map(img =>
          img.id === draggingImageId
            ? { ...img, currentLeft: `${newImageLeft}px`, currentTop: `${newImageTop}px` }
            : img
        )
      );
    }
  };

  const handleViewportMouseUpOrLeave = () => {
    if (draggingImageId !== null) {
      // Optional: Re-sort if z-index was temporarily changed for dragging (not current approach)
      // setImages(prevImages => [...prevImages].sort((a,b) => a.zIndex - b.zIndex));
      setDraggingImageId(null);
    }
  };

  const handleExportPositions = () => {
    const exportData = images.map(img => ({
      id: img.id,
      src: img.src,
      alt: img.alt,
      intrinsicWidth: img.width,
      intrinsicHeight: img.height,
      visualWidth: img.visualWidth,
      visualHeight: img.visualHeight,
      currentTop: img.currentTop,
      currentLeft: img.currentLeft,
      currentAnimation: img.currentAnimation,
      zIndex: img.zIndex,
      currentRotation: img.currentRotation,
      mirroredX: img.mirroredX,
      mirroredY: img.mirroredY,
    }));
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = 'image_positions.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
  };

  const handleImportPositions = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const importedData = JSON.parse(event.target?.result as string);
          if (!Array.isArray(importedData)) throw new Error("JSON not an array");
          const newImages: DraggableImage[] = importedData.map((item: ImportedImageItem, index: number) => {
            const visualDims = calculateVisualDimensions(item.intrinsicWidth || 256, item.intrinsicHeight || 256);
            return {
              id: item.id || Date.now() + index,
              src: item.src || '',
              alt: item.alt || 'imported image',
              width: item.intrinsicWidth || 256,
              height: item.intrinsicHeight || 256,
              visualWidth: item.visualWidth || visualDims.width,
              visualHeight: item.visualHeight || visualDims.height,
              currentTop: item.currentTop || '0px',
              currentLeft: item.currentLeft || '0px',
              currentAnimation: item.currentAnimation || 'none',
              zIndex: item.zIndex || 50,
              currentRotation: item.currentRotation || 0,
              mirroredX: item.mirroredX || false,
              mirroredY: item.mirroredY || false,
            };
          }).filter(img => img.src);
          setImages(newImages.sort((a, b) => a.zIndex - b.zIndex));
          setContextMenuTriggerInfo(null);
        } catch (error) {
          console.error("Error importing JSON:", error);
          alert("Failed to import JSON.");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleChangeRotationInContextMenu = (imageId: number, rotation: number) => {
    setImages(prevImages =>
      prevImages.map(img =>
        img.id === imageId ? { ...img, currentRotation: rotation } : img
      )
    );
  };

  const handleToggleMirrorInContextMenu = (imageId: number, axis: 'X' | 'Y') => {
    setImages(prevImages =>
      prevImages.map(img => {
        if (img.id === imageId) {
          if (axis === 'X') return { ...img, mirroredX: !img.mirroredX };
          if (axis === 'Y') return { ...img, mirroredY: !img.mirroredY };
        }
        return img;
      })
    );
  };

  const handleBringToFront = (imageId: number) => {
    setImages(prevImages => {
      const maxZ = prevImages.reduce((max, img) => img.id === imageId ? max : Math.max(max, img.zIndex), -Infinity);
      const newZ = prevImages.length > 1 ? maxZ + 1 : 0;
      return prevImages.map(img =>
        img.id === imageId ? { ...img, zIndex: newZ } : img
      ).sort((a, b) => a.zIndex - b.zIndex);
    });
  };

  const handleSendToBack = (imageId: number) => {
    setImages(prevImages => {
      const minZ = prevImages.reduce((min, img) => img.id === imageId ? min : Math.min(min, img.zIndex), Infinity);
      const newZ = prevImages.length > 1 ? minZ - 1 : 0;
      return prevImages.map(img =>
        img.id === imageId ? { ...img, zIndex: newZ } : img
      ).sort((a, b) => a.zIndex - b.zIndex);
    });
  };

  const handleBringForward = (imageId: number) => {
    setImages(prevImages => {
      const sorted = [...prevImages].sort((a, b) => a.zIndex - b.zIndex);
      const currentIndex = sorted.findIndex(img => img.id === imageId);
      if (currentIndex < sorted.length - 1 && currentIndex !== -1) {
        const currentZ = sorted[currentIndex].zIndex;
        const nextZ = sorted[currentIndex + 1].zIndex;
        if (currentZ === nextZ) { // If same z-index, just increment target
          sorted[currentIndex].zIndex = nextZ + 0.1; // Temporary to allow sort
        } else {
          sorted[currentIndex].zIndex = nextZ;
          sorted[currentIndex + 1].zIndex = currentZ;
        }
      }
      return sorted.map((img, idx) => ({ ...img, zIndex: idx })) // Re-index all based on new sort order
        .sort((a, b) => a.zIndex - b.zIndex);
    });
  };

  const handleSendBackward = (imageId: number) => {
    setImages(prevImages => {
      const sorted = [...prevImages].sort((a, b) => a.zIndex - b.zIndex);
      const currentIndex = sorted.findIndex(img => img.id === imageId);
      if (currentIndex > 0 && currentIndex !== -1) {
        const currentZ = sorted[currentIndex].zIndex;
        const prevZ = sorted[currentIndex - 1].zIndex;
        if (currentZ === prevZ) { // If same z-index, just decrement target
          sorted[currentIndex].zIndex = prevZ - 0.1; // Temporary to allow sort
        } else {
          sorted[currentIndex].zIndex = prevZ;
          sorted[currentIndex - 1].zIndex = currentZ;
        }
      }
      return sorted.map((img, idx) => ({ ...img, zIndex: idx })) // Re-index all
        .sort((a, b) => a.zIndex - b.zIndex);
    });
  };

  const handleAddNewImageFromAvailable = (selectedImage: ApiImageData, x: number, y: number) => {
    const visualDims = calculateVisualDimensions(selectedImage.width, selectedImage.height);
    const maxZ = images.reduce((max, img) => Math.max(max, img.zIndex), -1);
    const newImage: DraggableImage = {
      id: Date.now(),
      src: selectedImage.src,
      alt: selectedImage.alt,
      width: selectedImage.width,
      height: selectedImage.height,
      visualWidth: visualDims.width,
      visualHeight: visualDims.height,
      currentTop: `${y + window.scrollY}px`,
      currentLeft: `${x + window.scrollX}px`,
      currentAnimation: 'none',
      zIndex: maxZ + 1,
      currentRotation: 0,
      mirroredX: false,
      mirroredY: false,
    };
    setImages(prevImages => [...prevImages, newImage].sort((a, b) => a.zIndex - b.zIndex));
  };

  const handleImageMouseMoveForCursor = (e: MouseEvent<HTMLDivElement>, imageId: number) => {
    if (draggingImageId === null) {
      const isOpaque = checkPixelTransparency(e, imageId);
      setIsOverOpaquePixel(isOpaque);
    }
  };

  const handleImageMouseLeaveForCursor = () => {
    if (draggingImageId === null) {
      setHoveredImageId(null);
      setIsOverOpaquePixel(false);
    }
  };

  const showHelp = isShiftDown || isMetaDown;

  const appContextMenuProps = {
    contextMenuTriggerInfo,
    availableImages,
    images,
    handleAddNewImageFromAvailable,
    handleDeleteImage,
    setImages,
    handleChangeAnimation,
    handleChangeRotationInContextMenu,
    handleToggleMirrorInContextMenu,
    handleBringToFront,
    handleSendToBack,
    handleBringForward,
    handleSendBackward,
  };

  return (
    <>
      <ContextMenu.Root>
        <ContextMenu.Trigger asChild>
          <div
            className="min-h-[400vh] relative bg-black select-none cursor-default overflow-auto"
            onMouseDown={handleViewportMouseDown}
            onMouseMove={handleViewportMouseMove}
            onMouseUp={handleViewportMouseUpOrLeave}
            onMouseLeave={handleViewportMouseUpOrLeave}
            onContextMenuCapture={(e: MouseEvent<HTMLDivElement>) => {
              if ((e.target as HTMLElement).classList.contains('min-h-[400vh]')) {
                handleViewportContextMenuTrigger(e);
              }
            }}
            tabIndex={-1}
          >
            {images.map((image) => {
              const transformStyle = {
                transform: `rotate(${image.currentRotation}deg) ${getTransformClasses(image.mirroredX, image.mirroredY)}`,
              };

              return (
                <ContextMenu.Root key={image.id + "-menu-root"}>
                  <ContextMenu.Trigger asChild>
                    <div
                      key={image.id}
                      className={imageWrapperClasses(image, draggingImageId === image.id, hoveredImageId === image.id && isOverOpaquePixel)}
                      style={{
                        top: image.currentTop,
                        left: image.currentLeft,
                        zIndex: image.zIndex,
                        width: `${image.visualWidth}px`,
                        height: `${image.visualHeight}px`,
                        ...transformStyle,
                      }}
                      onMouseDown={(e) => handleGrabHandleMouseDown(e, image.id)}
                      onDoubleClick={(e) => handleImageDoubleClick(e, image)}
                      onContextMenuCapture={(e) => handleImageContextMenuTrigger(e, image.id)}
                      onMouseEnter={() => setHoveredImageId(image.id)}
                      onMouseMove={(e) => handleImageMouseMoveForCursor(e, image.id)}
                      onMouseLeave={handleImageMouseLeaveForCursor}
                    >
                      <Image
                        src={image.src}
                        alt={image.alt}
                        width={image.width}
                        height={image.height}
                        className="pointer-events-none"
                        style={{ objectFit: 'contain', width: '100%', height: '100%' }}
                        draggable={false}
                        priority={image.id <= 3}
                        ref={(el: HTMLImageElement | null) => { imageRefs.current[image.id] = el; }}
                      />
                    </div>
                  </ContextMenu.Trigger>
                  {contextMenuTriggerInfo?.imageId === image.id && (
                    <AppContextMenu {...appContextMenuProps} />
                  )}
                </ContextMenu.Root>
              );
            })}

            {contextMenuTriggerInfo?.imageId === null && (
              <AppContextMenu {...appContextMenuProps} />
            )}
          </div>
        </ContextMenu.Trigger>
      </ContextMenu.Root>

      {showHelp && (
        <div className="fixed bottom-4 left-4 bg-gray-800 bg-opacity-80 text-white p-4 rounded-lg shadow-xl z-[200]">
          <h4 className="font-bold text-lg mb-2">Controls:</h4>
          <ul className="list-disc list-inside text-sm">
            <li><span className="font-semibold">Drag Image:</span> Move Image</li>
            <li><span className="font-semibold">Double-Click Image:</span> Duplicate</li>
            <li><span className="font-semibold">Right-Click Image/Viewport:</span> Options Menu</li>
            <li><span className="font-semibold">Shift/Meta:</span> Show this help</li>
          </ul>
          <button
            onClick={handleExportPositions}
            className="mt-3 mr-2 px-3 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-md shadow-md"
          >
            Export Positions (JSON)
          </button>
          <button
            onClick={handleImportPositions}
            className="mt-3 px-3 py-1.5 text-sm bg-green-500 hover:bg-green-600 text-white rounded-md shadow-md"
          >
            Import Positions (JSON)
          </button>
        </div>
      )}
    </>
  );
}
