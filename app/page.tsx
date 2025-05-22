"use client";

import * as ContextMenu from '@radix-ui/react-context-menu';

import { ApiImageData, ContextMenuTriggerState, DraggableImage, DraggableItem, DraggableText, ImportedImageItem, ImportedItem, ImportedTextItem } from './types';
import { MouseEvent, useEffect, useRef, useState } from "react";
import {
  calculateVisualDimensions,
  getTransformClasses,
  imageWrapperClasses
} from './utils';

import AppContextMenu from './components/AppContextMenu';
import Image from "next/image";

const LOCAL_STORAGE_LAYOUT_KEY = 'lust_layout';
const MAX_HISTORY_STEPS = 50;

export default function Home() {
  const [items, _setItems] = useState<DraggableItem[]>([]);
  const [availableImages, setAvailableImages] = useState<ApiImageData[]>([]);
  const [draggingItemId, setDraggingItemId] = useState<number | null>(null);
  const [itemDragLocalOffset, setItemDragLocalOffset] = useState({ x: 0, y: 0 });
  const [mouseMovedSinceItemDragStart, setMouseMovedSinceItemDragStart] = useState(false);
  const [contextMenuTriggerInfo, setContextMenuTriggerInfo] = useState<ContextMenuTriggerState | null>(null);
  const [isShiftDown, setIsShiftDown] = useState(false);
  const [isMetaDown, setIsMetaDown] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);

  const [historyStack, setHistoryStack] = useState<DraggableItem[][]>([[]]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(0);

  const itemRefs = useRef<Record<number, HTMLElement | null>>({});
  const imageElementRefs = useRef<Record<number, HTMLImageElement | null>>({});
  const textInputRef = useRef<HTMLTextAreaElement | null>(null);

  const [hoveredItemId, setHoveredItemId] = useState<number | null>(null);
  const [isOverOpaquePixel, setIsOverOpaquePixel] = useState<boolean>(false);

  const setItems = (updater: React.SetStateAction<DraggableItem[]>, options: { recordHistory?: boolean } = { recordHistory: true }) => {
    _setItems(prevItems => {
      const newItems = typeof updater === 'function' ? (updater as (prevState: DraggableItem[]) => DraggableItem[])(prevItems) : updater;
      if (options.recordHistory) {
        const newHistory = historyStack.slice(0, currentHistoryIndex + 1);
        const updatedHistory = [...newHistory, newItems];
        setHistoryStack(updatedHistory.length > MAX_HISTORY_STEPS ? updatedHistory.slice(-MAX_HISTORY_STEPS) : updatedHistory);
        setCurrentHistoryIndex(updatedHistory.length > MAX_HISTORY_STEPS ? MAX_HISTORY_STEPS - 1 : updatedHistory.length - 1);
      }
      return newItems.sort((a, b) => a.zIndex - b.zIndex);
    });
  };

  const saveLayoutToLocalStorage = (itemsToSave: DraggableItem[]) => {
    try {
      const jsonString = JSON.stringify(itemsToSave);
      localStorage.setItem(LOCAL_STORAGE_LAYOUT_KEY, jsonString);
      console.log("Layout saved to LocalStorage");
    } catch (error) {
      console.error("Failed to save layout to LocalStorage:", error);
    }
  };

  const loadLayoutFromLocalStorage = () => {
    try {
      const jsonString = localStorage.getItem(LOCAL_STORAGE_LAYOUT_KEY);
      if (jsonString) {
        const importedData: ImportedItem[] = JSON.parse(jsonString);
        if (!Array.isArray(importedData)) {
          console.warn("LocalStorage layout data is not an array");
          return false;
        }
        const newItems: DraggableItem[] = importedData.map((item: ImportedItem, index: number) => {
          const baseProps = {
            id: item.id || Date.now() + index,
            currentTop: item.currentTop || '0px',
            currentLeft: item.currentLeft || '0px',
            zIndex: item.zIndex || 0,
          };
          if (item.type === 'text') {
            const textItem = item as ImportedTextItem;
            return {
              ...baseProps,
              type: 'text',
              content: textItem.content || 'New Text',
              fontSize: textItem.fontSize || 16,
              color: textItem.color || '#FFFFFF',
              currentRotation: textItem.currentRotation || 0,
            } as DraggableText;
          } else {
            const imgItem = item as ImportedImageItem;
            const visualDims = calculateVisualDimensions(imgItem.intrinsicWidth || 256, imgItem.intrinsicHeight || 256);
            return {
              ...baseProps,
              type: 'image',
              src: imgItem.src || '',
              alt: imgItem.alt || 'imported image',
              width: imgItem.intrinsicWidth || 256,
              height: imgItem.intrinsicHeight || 256,
              visualWidth: imgItem.visualWidth || visualDims.width,
              visualHeight: imgItem.visualHeight || visualDims.height,
              currentAnimation: imgItem.currentAnimation || 'none',
              currentRotation: imgItem.currentRotation || 0,
              mirroredX: imgItem.mirroredX || false,
              mirroredY: imgItem.mirroredY || false,
            } as DraggableImage;
          }
        }).filter(it => (it.type === 'image' && it.src) || it.type === 'text');

        setItems(newItems, { recordHistory: false });
        setHistoryStack([newItems]);
        setCurrentHistoryIndex(0);
        console.log("Layout loaded from LocalStorage");
        return true;
      }
    } catch (error) {
      console.error("Failed to load layout from LocalStorage:", error);
    }
    setHistoryStack([[]]);
    setCurrentHistoryIndex(0);
    return false;
  };

  const loadDefaultLayout = async (): Promise<boolean> => {
    try {
      const response = await fetch('/default_layout.json');
      if (!response.ok) {
        console.warn(`Failed to fetch default_layout.json: ${response.statusText}`);
        return false;
      }
      const importedData: ImportedItem[] = await response.json();
      if (!Array.isArray(importedData)) {
        console.warn("Default layout data is not an array");
        return false;
      }
      const newItems: DraggableItem[] = importedData.map((item: ImportedItem, index: number) => {
        const baseProps = {
          id: item.id || Date.now() + index,
          currentTop: item.currentTop || '0px',
          currentLeft: item.currentLeft || '0px',
          zIndex: item.zIndex || 0,
        };
        if (item.type === 'text') {
          const textItem = item as ImportedTextItem;
          return {
            ...baseProps,
            type: 'text',
            content: textItem.content || 'New Text',
            fontSize: textItem.fontSize || 16,
            color: textItem.color || '#FFFFFF',
            currentRotation: textItem.currentRotation || 0,
          } as DraggableText;
        } else {
          const imgItem = item as ImportedImageItem;
          const visualDims = calculateVisualDimensions(imgItem.intrinsicWidth || 256, imgItem.intrinsicHeight || 256);
          return {
            ...baseProps,
            type: 'image',
            src: imgItem.src || '',
            alt: imgItem.alt || 'imported image',
            width: imgItem.intrinsicWidth || 256,
            height: imgItem.intrinsicHeight || 256,
            visualWidth: imgItem.visualWidth || visualDims.width,
            visualHeight: imgItem.visualHeight || visualDims.height,
            currentAnimation: imgItem.currentAnimation || 'none',
            currentRotation: imgItem.currentRotation || 0,
            mirroredX: imgItem.mirroredX || false,
            mirroredY: imgItem.mirroredY || false,
          } as DraggableImage;
        }
      }).filter(it => (it.type === 'image' && it.src) || it.type === 'text');

      setItems(newItems, { recordHistory: false });
      setHistoryStack([newItems]);
      setCurrentHistoryIndex(0);
      console.log("Default layout loaded from /default_layout.json");
      return true;
    } catch (error) {
      console.error("Failed to load default layout from /default_layout.json:", error);
      return false;
    }
  };

  useEffect(() => {
    setIsLoading(true);
    const fetchInitialData = async () => {
      try {
        const response = await fetch('/api/images');
        if (!response.ok) throw new Error(`Failed to fetch images: ${response.statusText}`);
        const data: ApiImageData[] = await response.json();
        setAvailableImages(data);

        const loadedFromLocalStorage = loadLayoutFromLocalStorage();
        if (!loadedFromLocalStorage) {
          const loadedFromDefault = await loadDefaultLayout();
          if (!loadedFromDefault) {
            setItems([], { recordHistory: true }); // Start with empty if both fail
            setHistoryStack([[]]);
            setCurrentHistoryIndex(0);
          }
        }
      } catch (error) {
        console.error("Error fetching available images or loading initial layout:", error);
        setItems([], { recordHistory: true }); // Start with empty on error
        setHistoryStack([[]]);
        setCurrentHistoryIndex(0);
      }
      setIsLoading(false);
    };
    fetchInitialData();
  }, []);

  const handleUndo = () => {
    if (currentHistoryIndex > 0) {
      const newIndex = currentHistoryIndex - 1;
      setCurrentHistoryIndex(newIndex);
      _setItems(historyStack[newIndex]);
      console.log("Undo performed, new history index:", newIndex);
    }
  };

  const handleRedo = () => {
    if (currentHistoryIndex < historyStack.length - 1) {
      const newIndex = currentHistoryIndex + 1;
      setCurrentHistoryIndex(newIndex);
      _setItems(historyStack[newIndex]);
      console.log("Redo performed, new history index:", newIndex);
    }
  };

  useEffect(() => {
    if (editingItemId !== null && textInputRef.current) {
      textInputRef.current.focus();
      textInputRef.current.select();
    }
  }, [editingItemId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftDown(true);

      const targetElement = e.target as HTMLElement;
      if (editingItemId !== null && targetElement.tagName === 'TEXTAREA') {
        if (e.key === 'Escape') {
          setEditingItemId(null);
          targetElement.blur();
        }
        if ((e.metaKey || e.ctrlKey) && e.key === 's') {
          e.preventDefault();
          saveLayoutToLocalStorage(items);
        }
        return;
      }

      if (targetElement.tagName === 'INPUT' || targetElement.tagName === 'TEXTAREA') {
        if (e.key === 'Escape') targetElement.blur();
        return;
      }

      if (e.metaKey || e.ctrlKey) {
        if (e.key === 's') {
          e.preventDefault();
          saveLayoutToLocalStorage(items);
        }
        if (e.key === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            handleRedo();
          } else {
            handleUndo();
          }
        }
        if (e.key === 'y' && !e.shiftKey && e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          handleRedo();
        }
      }
      if (e.metaKey) setIsMetaDown(true);
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
  }, [items, historyStack, currentHistoryIndex, editingItemId]);

  const checkPixelTransparency = (e: MouseEvent<HTMLDivElement>, itemId: number): boolean => {
    const currentItem = items.find(it => it.id === itemId);
    if (!currentItem || currentItem.type !== 'image') return true;
    const imageElement = imageElementRefs.current[itemId];
    const currentImage = currentItem as DraggableImage;

    if (!imageElement || !currentImage.src.toLowerCase().endsWith('.png') || !imageElement.complete || imageElement.naturalWidth === 0) {
      if (availableImages.some(ai => ai.src === currentImage.src)) return true;
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

  const handleGrabHandleMouseDown = (e: MouseEvent<HTMLDivElement>, id: number, itemType: 'image' | 'text') => {
    if (editingItemId === id && itemType === 'text') return;
    if (itemType === 'image' && !checkPixelTransparency(e, id)) return;
    e.stopPropagation();
    setContextMenuTriggerInfo(null);
    setMouseMovedSinceItemDragStart(false);
    const grabHandleElement = e.currentTarget;
    const rect = grabHandleElement.getBoundingClientRect();
    const clickedItem = items.find(it => it.id === id);
    if (!clickedItem) return;
    setDraggingItemId(id);
    setItemDragLocalOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    e.preventDefault();
  };

  const handleItemDoubleClick = (e: MouseEvent<HTMLDivElement>, originalItem: DraggableItem) => {
    setItems(prevItems => {
      const maxZ = prevItems.reduce((max, item) => Math.max(max, item.zIndex), -1);
      let newItem: DraggableItem;
      if (originalItem.type === 'image') {
        const visualDims = calculateVisualDimensions(originalItem.width, originalItem.height);
        newItem = {
          ...originalItem,
          id: Date.now(),
          visualWidth: visualDims.width,
          visualHeight: visualDims.height,
          currentLeft: `${parseInt(originalItem.currentLeft || "0") + 20}px`,
          currentTop: `${parseInt(originalItem.currentTop || "0") + 20}px`,
          zIndex: maxZ + 1,
        };
      } else {
        newItem = {
          ...originalItem,
          id: Date.now(),
          currentLeft: `${parseInt(originalItem.currentLeft || "0") + 20}px`,
          currentTop: `${parseInt(originalItem.currentTop || "0") + 20}px`,
          zIndex: maxZ + 1,
        };
      }
      return [...prevItems, newItem];
    });
    setContextMenuTriggerInfo(null);
  };

  const handleItemContextMenuTrigger = (e: MouseEvent<HTMLDivElement>, itemId: number, itemType: 'image' | 'text') => {
    console.log("handleItemContextMenuTrigger", { itemId, itemType, x: e.clientX, y: e.clientY });
    setContextMenuTriggerInfo({ itemId, itemType, triggerX: e.clientX, triggerY: e.clientY });
  };

  const handleViewportContextMenuTrigger = (e: MouseEvent<HTMLDivElement>) => {
    console.log("handleViewportContextMenuTrigger", { x: e.clientX, y: e.clientY });
    setContextMenuTriggerInfo({ itemId: null, triggerX: e.clientX, triggerY: e.clientY });
  };

  const handleDeleteItem = (itemIdToDelete: number) => {
    setItems(prevItems => prevItems.filter(it => it.id !== itemIdToDelete));
  };

  const handleChangeAnimation = (imageId: number, animation: 'none' | 'bounce' | 'spin') => {
    setItems(prevItems =>
      prevItems.map(item =>
        item.id === imageId && item.type === 'image' ? { ...item, currentAnimation: animation } : item
      )
    );
  };

  const handleViewportMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (editingItemId !== null && target.tagName !== 'TEXTAREA' && !itemRefs.current[editingItemId]?.contains(target)) {
      setEditingItemId(null);
    }
    if (!target.closest('.item-wrapper-class') && !target.closest('.radix-context-menu-content-class')) {
    }
  };

  const handleViewportMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (draggingItemId !== null) {
      if (!mouseMovedSinceItemDragStart) setMouseMovedSinceItemDragStart(true);
      const newItemLeft = e.clientX + window.scrollX - itemDragLocalOffset.x;
      const newItemTop = e.clientY + window.scrollY - itemDragLocalOffset.y;
      _setItems(prevItems =>
        prevItems.map(item =>
          item.id === draggingItemId
            ? { ...item, currentLeft: `${newItemLeft}px`, currentTop: `${newItemTop}px` }
            : item
        )
      );
    }
  };

  const handleViewportMouseUpOrLeave = () => {
    if (draggingItemId !== null) {
      if (mouseMovedSinceItemDragStart) {
        setItems(currentItems => [...currentItems], { recordHistory: true });
      }
      setDraggingItemId(null);
    }
  };

  const handleExportPositions = () => {
    const jsonString = JSON.stringify(items, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = 'lust_layout.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
  };

  const handleImportPositions = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (ev) => {
      const file = (ev.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const importedData: ImportedItem[] = JSON.parse(event.target?.result as string);
          if (!Array.isArray(importedData)) throw new Error("JSON not an array");

          const newItems: DraggableItem[] = importedData.map((itemData: ImportedItem, index: number) => {
            const baseProps = {
              id: itemData.id || Date.now() + index,
              currentTop: itemData.currentTop || '0px',
              currentLeft: itemData.currentLeft || '0px',
              zIndex: itemData.zIndex || 0,
            };
            if (itemData.type === 'text') {
              const textItem = itemData as ImportedTextItem;
              return {
                ...baseProps,
                type: 'text',
                content: textItem.content || 'New Text',
                fontSize: textItem.fontSize || 16,
                color: textItem.color || '#FFFFFF',
                currentRotation: textItem.currentRotation || 0,
              } as DraggableText;
            } else {
              const imgItem = itemData as ImportedImageItem;
              const visualDims = calculateVisualDimensions(imgItem.intrinsicWidth || 256, imgItem.intrinsicHeight || 256);
              return {
                ...baseProps,
                type: 'image',
                src: imgItem.src || '',
                alt: imgItem.alt || 'imported image',
                width: imgItem.intrinsicWidth || 256,
                height: imgItem.intrinsicHeight || 256,
                visualWidth: imgItem.visualWidth || visualDims.width,
                visualHeight: imgItem.visualHeight || visualDims.height,
                currentAnimation: imgItem.currentAnimation || 'none',
                currentRotation: imgItem.currentRotation || 0,
                mirroredX: imgItem.mirroredX || false,
                mirroredY: imgItem.mirroredY || false,
              } as DraggableImage;
            }
          }).filter(it => (it.type === 'image' && it.src) || it.type === 'text');

          setItems(newItems, { recordHistory: false });
          setHistoryStack([newItems]);
          setCurrentHistoryIndex(0);
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

  const handleChangeRotationInContextMenu = (itemId: number, rotation: number) => {
    setItems(prevItems =>
      prevItems.map(item =>
        item.id === itemId && item.type === 'image' ? { ...item, currentRotation: rotation } : item
      )
    );
  };

  const handleToggleMirrorInContextMenu = (itemId: number, axis: 'X' | 'Y') => {
    setItems(prevItems =>
      prevItems.map(item => {
        if (item.id === itemId && item.type === 'image') {
          if (axis === 'X') return { ...item, mirroredX: !item.mirroredX };
          if (axis === 'Y') return { ...item, mirroredY: !item.mirroredY };
        }
        return item;
      })
    );
  };

  const handleBringToFront = (itemId: number) => {
    setItems(prevItems => {
      const maxZ = prevItems.reduce((max, it) => it.id === itemId ? max : Math.max(max, it.zIndex), -Infinity);
      const newZ = prevItems.length > 1 ? maxZ + 1 : 0;
      return prevItems.map(it =>
        it.id === itemId ? { ...it, zIndex: newZ } : it
      );
    });
  };

  const handleSendToBack = (itemId: number) => {
    setItems(prevItems => {
      const minZ = prevItems.reduce((min, it) => it.id === itemId ? min : Math.min(min, it.zIndex), Infinity);
      const newZ = prevItems.length > 1 ? minZ - 1 : 0;
      return prevItems.map(it =>
        it.id === itemId ? { ...it, zIndex: newZ } : it
      );
    });
  };

  const handleBringForward = (itemId: number) => {
    setItems(prevItems => {
      const sorted = [...prevItems].sort((a, b) => a.zIndex - b.zIndex);
      const currentIndex = sorted.findIndex(it => it.id === itemId);
      if (currentIndex < sorted.length - 1 && currentIndex !== -1) {
        const currentZ = sorted[currentIndex].zIndex;
        const nextZ = sorted[currentIndex + 1].zIndex;
        if (currentZ === nextZ) {
          sorted[currentIndex].zIndex = nextZ + 0.1;
        } else {
          sorted[currentIndex].zIndex = nextZ;
          sorted[currentIndex + 1].zIndex = currentZ;
        }
        return sorted.map((it, idx) => ({ ...it, zIndex: idx }));
      }
      return prevItems;
    });
  };

  const handleSendBackward = (itemId: number) => {
    setItems(prevItems => {
      const sorted = [...prevItems].sort((a, b) => a.zIndex - b.zIndex);
      const currentIndex = sorted.findIndex(it => it.id === itemId);
      if (currentIndex > 0 && currentIndex !== -1) {
        const currentZ = sorted[currentIndex].zIndex;
        const prevZ = sorted[currentIndex - 1].zIndex;
        if (currentZ === prevZ) {
          sorted[currentIndex].zIndex = prevZ - 0.1;
        } else {
          sorted[currentIndex].zIndex = prevZ;
          sorted[currentIndex - 1].zIndex = currentZ;
        }
        return sorted.map((it, idx) => ({ ...it, zIndex: idx }));
      }
      return prevItems;
    });
  };

  const handleAddNewImageFromAvailable = (selectedImage: ApiImageData, x: number, y: number) => {
    setItems(prevItems => {
      const maxZ = prevItems.reduce((max, item) => Math.max(max, item.zIndex), -1);
      const visualDims = calculateVisualDimensions(selectedImage.width, selectedImage.height);
      const newImage: DraggableImage = {
        id: Date.now(),
        type: 'image',
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
      return [...prevItems, newImage];
    });
  };

  const handleAddNewTextElement = (x: number, y: number, content: string = "New Text", fontSize: number = 16, color: string = "#FFFFFF") => {
    setItems(prevItems => {
      const maxZ = prevItems.reduce((max, item) => Math.max(max, item.zIndex), -1);
      const newText: DraggableText = {
        id: Date.now(),
        type: 'text',
        content,
        fontSize,
        color,
        currentTop: `${y + window.scrollY}px`,
        currentLeft: `${x + window.scrollX}px`,
        zIndex: maxZ + 1,
        currentRotation: 0,
      };
      return [...prevItems, newText];
    });
  };

  const handleItemMouseMoveForCursor = (e: MouseEvent<HTMLDivElement>, itemId: number, itemType: 'image' | 'text') => {
    if (draggingItemId === null) {
      setHoveredItemId(itemId);
      if (itemType === 'image') {
        const isOpaque = checkPixelTransparency(e, itemId);
        setIsOverOpaquePixel(isOpaque);
      } else {
        setIsOverOpaquePixel(true);
      }
    }
  };

  const handleItemMouseLeaveForCursor = () => {
    if (draggingItemId === null) {
      setHoveredItemId(null);
      setIsOverOpaquePixel(false);
    }
  };

  const showHelp = isShiftDown || isMetaDown;

  const handleSetEditingItem = (itemId: number | null) => {
    if (itemId === null && editingItemId !== null) {
    }
    setEditingItemId(itemId);
  };

  const handleUpdateTextItemContent = (itemId: number, newContent: string) => {
    setItems(prevItems => prevItems.map(item =>
      item.id === itemId && item.type === 'text' ? { ...item, content: newContent } : item
    ), { recordHistory: true });
  };

  const handleChangeTextRotationInContextMenu = (itemId: number, rotation: number) => {
    setItems(prevItems =>
      prevItems.map(item =>
        item.id === itemId && item.type === 'text' ? { ...item, currentRotation: rotation } : item
      )
    );
  };

  const appContextMenuProps = {
    contextMenuTriggerInfo,
    availableImages,
    items,
    handleAddNewImageFromAvailable,
    handleAddNewTextElement,
    handleDeleteItem,
    setItems,
    handleChangeAnimation,
    handleChangeRotationInContextMenu,
    handleToggleMirrorInContextMenu,
    handleBringToFront,
    handleSendToBack,
    handleBringForward,
    handleSendBackward,
    handleSetEditingItem,
    handleChangeTextRotationInContextMenu,
  };

  if (isLoading) {
    return <div className="min-h-screen bg-black text-white flex justify-center items-center">Loading...</div>;
  }

  const itemWrapperBaseClass = "item-wrapper-class absolute cursor-grab select-none flex items-center justify-center transition-opacity duration-150 ease-in-out";

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
              const target = e.target as HTMLElement;
              if (target.classList.contains('min-h-[400vh]') || target.classList.contains('bg-black')) {
                handleViewportContextMenuTrigger(e);
              }
            }}
            tabIndex={-1}
          >
            {items.map((item) => {
              if (item.type === 'image') {
                const image = item as DraggableImage;
                const transformStyle = {
                  transform: `rotate(${image.currentRotation}deg) ${getTransformClasses(image.mirroredX, image.mirroredY)}`,
                };
                return (
                  <ContextMenu.Root key={image.id + "-item-menu-root"}>
                    <ContextMenu.Trigger asChild>
                      <div
                        ref={el => { itemRefs.current[image.id] = el; }}
                        key={image.id}
                        className={`${itemWrapperBaseClass} ${imageWrapperClasses(image, draggingItemId === image.id, hoveredItemId === image.id && isOverOpaquePixel)}`}
                        style={{
                          top: image.currentTop,
                          left: image.currentLeft,
                          zIndex: image.zIndex,
                          width: `${image.visualWidth}px`,
                          height: `${image.visualHeight}px`,
                          ...transformStyle,
                          opacity: draggingItemId === image.id ? 0.7 : 1,
                        }}
                        onMouseDown={(e) => handleGrabHandleMouseDown(e, image.id, 'image')}
                        onDoubleClick={(e) => handleItemDoubleClick(e, image)}
                        onContextMenuCapture={(e) => {
                          handleItemContextMenuTrigger(e, image.id, 'image');
                        }}
                        onMouseEnter={() => setHoveredItemId(image.id)}
                        onMouseMove={(e) => handleItemMouseMoveForCursor(e, image.id, 'image')}
                        onMouseLeave={handleItemMouseLeaveForCursor}
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
                          ref={(el: HTMLImageElement | null) => { imageElementRefs.current[image.id] = el; }}
                        />
                      </div>
                    </ContextMenu.Trigger>
                    <AppContextMenu {...appContextMenuProps} currentItem={image} />
                  </ContextMenu.Root>
                );
              } else if (item.type === 'text') {
                const textItem = item as DraggableText;
                if (editingItemId === textItem.id) {
                  return (
                    <div
                      key={textItem.id}
                      style={{ top: textItem.currentTop, left: textItem.currentLeft, zIndex: textItem.zIndex, position: 'absolute' }}
                      className={`${itemWrapperBaseClass}`}
                      ref={el => { itemRefs.current[textItem.id] = el; }}
                    >
                      <textarea
                        ref={textInputRef}
                        value={textItem.content}
                        onChange={(e) => handleUpdateTextItemContent(textItem.id, e.target.value)}
                        onBlur={() => handleSetEditingItem(null)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSetEditingItem(null);
                          }
                          if (e.key === 'Escape') {
                            e.preventDefault();
                            handleSetEditingItem(null);
                          }
                        }}
                        style={{
                          width: '100%',
                          height: '100%',
                          fontSize: `${textItem.fontSize}px`,
                          color: textItem.color,
                          background: 'rgba(255,255,255,0.1)',
                          border: '1px dashed #ccc',
                          resize: 'none',
                          boxSizing: 'border-box',
                          fontFamily: 'var(--font-pt-serif)',
                          lineHeight: '1.2',
                          padding: '0',
                        }}
                      />
                    </div>
                  );
                } else {
                  return (
                    <ContextMenu.Root key={textItem.id + "-item-menu-root"}>
                      <ContextMenu.Trigger asChild>
                        <div
                          ref={el => { itemRefs.current[textItem.id] = el; }}
                          key={textItem.id}
                          className={`${itemWrapperBaseClass} ${draggingItemId === textItem.id ? 'opacity-70' : ''} ${hoveredItemId === textItem.id ? 'ring-2 ring-blue-500' : ''}`}
                          style={{
                            top: textItem.currentTop,
                            left: textItem.currentLeft,
                            zIndex: textItem.zIndex,
                            fontSize: `${textItem.fontSize}px`,
                            color: textItem.color,
                            padding: '5px',
                            width: 'auto',
                            height: 'auto',
                            fontFamily: 'var(--font-pt-serif)',
                            transform: `rotate(${textItem.currentRotation}deg)`,
                          }}
                          onMouseDown={(e) => handleGrabHandleMouseDown(e, textItem.id, 'text')}
                          onDoubleClick={(e) => handleItemDoubleClick(e, textItem)}
                          onContextMenuCapture={(e) => {
                            handleItemContextMenuTrigger(e, textItem.id, 'text');
                          }}
                          onMouseEnter={() => setHoveredItemId(textItem.id)}
                          onMouseMove={(e) => handleItemMouseMoveForCursor(e, textItem.id, 'text')}
                          onMouseLeave={handleItemMouseLeaveForCursor}
                        >
                          {textItem.content.split('\n').map((line, index) => (
                            <span key={index} style={{ display: 'block' }}>{line}</span>
                          ))}
                        </div>
                      </ContextMenu.Trigger>
                      <AppContextMenu {...appContextMenuProps} currentItem={textItem} />
                    </ContextMenu.Root>
                  );
                }
              }
              return null;
            })}

            <AppContextMenu {...appContextMenuProps} />
          </div>
        </ContextMenu.Trigger>
      </ContextMenu.Root>

      {showHelp && (
        <div className="fixed bottom-4 left-4 bg-gray-800 bg-opacity-80 text-white p-4 rounded-lg shadow-xl z-[200]">
          <h4 className="font-bold text-lg mb-2">Controls:</h4>
          <ul className="list-disc list-inside text-sm">
            <li><span className="font-semibold">Cmd/Ctrl+S:</span> Save Layout</li>
            <li><span className="font-semibold">Cmd/Ctrl+Z:</span> Undo</li>
            <li><span className="font-semibold">Cmd/Ctrl+Shift+Z or Cmd/Ctrl+Y:</span> Redo</li>
            <li><span className="font-semibold">Drag Item:</span> Move Item</li>
            <li><span className="font-semibold">Double-Click Item:</span> Duplicate</li>
            <li><span className="font-semibold">Right-Click Item/Viewport:</span> Options Menu</li>
            <li><span className="font-semibold">Shift/Meta:</span> Show this help</li>
          </ul>
          <button
            onClick={handleExportPositions}
            className="mt-3 mr-2 px-3 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-md shadow-md"
          >
            Export Layout (JSON)
          </button>
          <button
            onClick={handleImportPositions}
            className="mt-3 px-3 py-1.5 text-sm bg-green-500 hover:bg-green-600 text-white rounded-md shadow-md"
          >
            Import Layout (JSON)
          </button>
        </div>
      )}
    </>
  );
}
