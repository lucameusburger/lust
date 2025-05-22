"use client";

import * as ContextMenu from '@radix-ui/react-context-menu';

import { ApiImageData, ContextMenuTriggerState, DraggableImage, DraggableItem, DraggableText } from '../types'; // Adjusted path and types

import Image from 'next/image';

// Radix UI Style Constants
const RDX_CONTENT_CLASS = "min-w-[220px] bg-gray-800 text-gray-200 p-1 shadow-xl rounded-lg border border-gray-700 focus:outline-none z-[5000]";
const RDX_ITEM_CLASS = "flex items-center px-3 py-2 text-sm rounded-md hover:bg-gray-700 hover:text-white focus:outline-none focus:bg-gray-700 select-none cursor-default data-[disabled]:opacity-50 data-[disabled]:pointer-events-none";
const RDX_SEPARATOR_CLASS = "h-px my-1 bg-gray-700";
const RDX_SUB_TRIGGER_CLASS = RDX_ITEM_CLASS + " justify-between";
const RDX_SUB_CONTENT_CLASS = RDX_CONTENT_CLASS + " ml-1 max-h-[60vh] overflow-y-auto";
const RDX_LABEL_CLASS = "px-3 py-1.5 text-xs font-semibold text-gray-400 select-none";
const RDX_INPUT_CLASS = "w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50";

interface AppContextMenuProps {
    contextMenuTriggerInfo: ContextMenuTriggerState | null;
    currentItem?: DraggableItem; // For item-specific menus, undefined for viewport menu
    availableImages: ApiImageData[];
    // items: DraggableItem[]; // Removed from destructuring, still in props type if needed later
    onCloseAutoFocus?: (event: Event) => void;
    handleAddNewImageFromAvailable: (selectedImage: ApiImageData, x: number, y: number) => void;
    handleAddNewTextElement: (x: number, y: number, content?: string, fontSize?: number, color?: string) => void;
    handleDeleteItem: (itemId: number) => void;
    setItems: React.Dispatch<React.SetStateAction<DraggableItem[]>>;
    handleChangeAnimation: (itemId: number, animation: 'none' | 'bounce' | 'spin') => void;
    handleChangeRotationInContextMenu: (itemId: number, rotation: number) => void;
    handleToggleMirrorInContextMenu: (itemId: number, axis: 'X' | 'Y') => void;
    handleBringToFront: (itemId: number) => void;
    handleSendToBack: (itemId: number) => void;
    handleBringForward: (itemId: number) => void;
    handleSendBackward: (itemId: number) => void;
    handleSetEditingItem?: (itemId: number | null) => void;
}

export default function AppContextMenu({
    contextMenuTriggerInfo, // This is the global trigger state
    currentItem, // This is the specific item this menu instance could be for (or undefined if viewport menu)
    availableImages,
    onCloseAutoFocus = (e) => e.preventDefault(),
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
    handleSetEditingItem
}: AppContextMenuProps) {

    // Determine if this specific AppContextMenu instance should be active and render content.
    let isActive = false;
    if (contextMenuTriggerInfo) {
        if (currentItem) { // This is an item-specific context menu instance
            isActive = contextMenuTriggerInfo.itemId === currentItem.id && contextMenuTriggerInfo.itemType === currentItem.type;
        } else { // This is a viewport context menu instance
            isActive = contextMenuTriggerInfo.itemId === null;
        }
    }

    if (!isActive) {
        return null; // Don't render anything if this instance isn't the active one
    }

    // If active, proceed to render the correct menu content.
    // The triggerX and triggerY for positioning are within contextMenuTriggerInfo.
    const { triggerX, triggerY } = contextMenuTriggerInfo!;

    // Viewport ContextMenu (Add Image or Add Text)
    if (contextMenuTriggerInfo!.itemId === null) { // Viewport menu active
        return (
            <ContextMenu.Portal>
                <ContextMenu.Content className={RDX_CONTENT_CLASS} alignOffset={5} onCloseAutoFocus={onCloseAutoFocus}
                // style={{ top: triggerY, left: triggerX }} // Radix handles positioning based on trigger
                >
                    <ContextMenu.Sub>
                        <ContextMenu.SubTrigger className={RDX_SUB_TRIGGER_CLASS}>
                            Add Image
                            <div className="ml-auto pl-5 text-gray-400">▶</div>
                        </ContextMenu.SubTrigger>
                        <ContextMenu.Portal>
                            <ContextMenu.SubContent className={RDX_SUB_CONTENT_CLASS} sideOffset={2} alignOffset={-5} >
                                {availableImages.length > 0 ? (
                                    availableImages.map(availImg => (
                                        <ContextMenu.Item
                                            key={availImg.src}
                                            className={RDX_ITEM_CLASS + " flex items-center"}
                                            onSelect={() => handleAddNewImageFromAvailable(availImg, triggerX, triggerY)}
                                        >
                                            <Image src={availImg.src} alt={availImg.alt} width={24} height={24} className="mr-2 inline-block object-contain rounded-sm" />
                                            <span className="truncate flex-grow">{availImg.alt}</span>
                                        </ContextMenu.Item>
                                    ))
                                ) : (
                                    <ContextMenu.Item disabled className={RDX_ITEM_CLASS}>No images found</ContextMenu.Item>
                                )}
                            </ContextMenu.SubContent>
                        </ContextMenu.Portal>
                    </ContextMenu.Sub>
                    <ContextMenu.Item
                        className={RDX_ITEM_CLASS}
                        onSelect={() => handleAddNewTextElement(triggerX, triggerY, "New Text", 24, "#FFFFFF")}
                    >
                        Add Text
                    </ContextMenu.Item>
                </ContextMenu.Content>
            </ContextMenu.Portal>
        );
    }

    // Item-Specific ContextMenu - currentItem must exist if itemId was not null and matched.
    if (!currentItem) return null; // Should be redundant due to isActive logic but good safeguard.

    const commonItemOptions = (
        <>
            <ContextMenu.Item className={RDX_ITEM_CLASS} onSelect={() => handleDeleteItem(currentItem.id)}>Delete</ContextMenu.Item>
            <ContextMenu.Separator className={RDX_SEPARATOR_CLASS} />
            <ContextMenu.Label className={RDX_LABEL_CLASS}>Layering</ContextMenu.Label>
            <ContextMenu.Item className={RDX_ITEM_CLASS} onSelect={() => handleBringToFront(currentItem.id)}>Bring to Front</ContextMenu.Item>
            <ContextMenu.Item className={RDX_ITEM_CLASS} onSelect={() => handleSendToBack(currentItem.id)}>Send to Back</ContextMenu.Item>
            <ContextMenu.Item className={RDX_ITEM_CLASS} onSelect={() => handleBringForward(currentItem.id)}>Bring Forward</ContextMenu.Item>
            <ContextMenu.Item className={RDX_ITEM_CLASS} onSelect={() => handleSendBackward(currentItem.id)}>Send Backward</ContextMenu.Item>
        </>
    );

    if (currentItem.type === 'image') {
        const imageItem = currentItem as DraggableImage;
        return (
            <ContextMenu.Portal>
                <ContextMenu.Content className={RDX_CONTENT_CLASS} alignOffset={5} onCloseAutoFocus={onCloseAutoFocus}>
                    {commonItemOptions}
                    <ContextMenu.Separator className={RDX_SEPARATOR_CLASS} />
                    <div className="px-3 py-1.5 text-sm">
                        <label htmlFor={`sizeSlider-${imageItem.id}`} className="block mb-1 text-gray-300">Size: {imageItem.visualWidth}px</label>
                        <input
                            type="range" id={`sizeSlider-${imageItem.id}`}
                            min="10" max="1024"
                            value={imageItem.visualWidth}
                            onChange={(ev) => {
                                const newVisualWidth = parseInt(ev.target.value, 10);
                                setItems(prevItems =>
                                    prevItems.map(it => {
                                        if (it.id === imageItem.id && it.type === 'image') {
                                            const aspectRatio = it.width / it.height;
                                            return { ...it, visualWidth: newVisualWidth, visualHeight: Math.round(newVisualWidth / (aspectRatio || 1)) };
                                        }
                                        return it;
                                    })
                                );
                            }}
                            className={RDX_INPUT_CLASS}
                        />
                    </div>
                    <ContextMenu.Separator className={RDX_SEPARATOR_CLASS} />
                    <ContextMenu.Label className={RDX_LABEL_CLASS}>Animation</ContextMenu.Label>
                    <ContextMenu.Item className={RDX_ITEM_CLASS} onSelect={() => handleChangeAnimation(imageItem.id, 'none')}>None {imageItem.currentAnimation === 'none' && '✓'}</ContextMenu.Item>
                    <ContextMenu.Item className={RDX_ITEM_CLASS} onSelect={() => handleChangeAnimation(imageItem.id, 'bounce')}>Bounce {imageItem.currentAnimation === 'bounce' && '✓'}</ContextMenu.Item>
                    <ContextMenu.Item className={RDX_ITEM_CLASS} onSelect={() => handleChangeAnimation(imageItem.id, 'spin')}>Spin {imageItem.currentAnimation === 'spin' && '✓'}</ContextMenu.Item>
                    <ContextMenu.Separator className={RDX_SEPARATOR_CLASS} />
                    <ContextMenu.Label className={RDX_LABEL_CLASS}>Transform</ContextMenu.Label>
                    <div className="px-3 py-1.5 text-sm">
                        <label htmlFor={`rotationSlider-${imageItem.id}`} className="block mb-1 text-gray-300">Rotate: {imageItem.currentRotation}°</label>
                        <input
                            type="range" id={`rotationSlider-${imageItem.id}`}
                            min="0" max="360"
                            value={imageItem.currentRotation}
                            onChange={(ev) => handleChangeRotationInContextMenu(imageItem.id, parseInt(ev.target.value, 10))}
                            className={RDX_INPUT_CLASS}
                        />
                    </div>
                    <ContextMenu.Item className={RDX_ITEM_CLASS} onSelect={() => handleToggleMirrorInContextMenu(imageItem.id, 'X')}>Mirror X {imageItem.mirroredX ? '(On)' : '(Off)'}</ContextMenu.Item>
                    <ContextMenu.Item className={RDX_ITEM_CLASS} onSelect={() => handleToggleMirrorInContextMenu(imageItem.id, 'Y')}>Mirror Y {imageItem.mirroredY ? '(On)' : '(Off)'}</ContextMenu.Item>
                </ContextMenu.Content>
            </ContextMenu.Portal>
        );
    } else if (currentItem.type === 'text') {
        const textItem = currentItem as DraggableText;
        return (
            <ContextMenu.Portal>
                <ContextMenu.Content className={RDX_CONTENT_CLASS} alignOffset={5} onCloseAutoFocus={onCloseAutoFocus}>
                    {commonItemOptions}
                    <ContextMenu.Separator className={RDX_SEPARATOR_CLASS} />
                    <ContextMenu.Label className={RDX_LABEL_CLASS}>Text Properties</ContextMenu.Label>
                    <ContextMenu.Item
                        className={RDX_ITEM_CLASS}
                        onSelect={() => {
                            if (handleSetEditingItem && contextMenuTriggerInfo && contextMenuTriggerInfo.itemId !== null) {
                                handleSetEditingItem(contextMenuTriggerInfo.itemId);
                            }
                        }}
                    >
                        Edit Text...
                    </ContextMenu.Item>
                    <div className="px-3 py-1.5 text-sm">
                        <label htmlFor={`fontSizeSlider-${textItem.id}`} className="block mb-1 text-gray-300">Font Size: {textItem.fontSize}px</label>
                        <input
                            type="range" id={`fontSizeSlider-${textItem.id}`}
                            min="8" max="128"
                            value={textItem.fontSize}
                            onChange={(ev) => {
                                const newSize = parseInt(ev.target.value, 10);
                                setItems(prevItems =>
                                    prevItems.map(it =>
                                        it.id === textItem.id && it.type === 'text' ? { ...it, fontSize: newSize } : it
                                    )
                                );
                            }}
                            className={RDX_INPUT_CLASS}
                        />
                    </div>
                    <div className="px-3 py-1.5 text-sm">
                        <label htmlFor={`textColorInput-${textItem.id}`} className="block mb-1 text-gray-300">Color:</label>
                        <input
                            type="color" id={`textColorInput-${textItem.id}`}
                            value={textItem.color}
                            onChange={(ev) => {
                                const newColor = ev.target.value;
                                setItems(prevItems =>
                                    prevItems.map(it =>
                                        it.id === textItem.id && it.type === 'text' ? { ...it, color: newColor } : it
                                    )
                                );
                            }}
                            className="w-full h-8 p-0 border-none cursor-pointer rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                </ContextMenu.Content>
            </ContextMenu.Portal>
        );
    }

    return null;
} 